#!/usr/bin/env python3
# mintscan — Minebricks no-infinity audit (doctrine instrumentation)
#
# Reads RUNTIME dumps (/mintdump -> kubejs/export/mint/* + /lootdump -> loot/*)
# plus hand-maintained dials, builds the mint graph, and reports:
#
#   pass 1 — fixpoint closure from zero-cost sources: everything bootstrappable
#            "from nothing" (AND over recipe slots, OR within a slot).
#   pass 2 — expanding-cycle detection in log space: loops whose net yield is
#            > 1 per iteration (bamboo-class self-loops, trade loops, chains).
#
# Ground truth = the runtime dump, because KubeJS scripts mutate the graph and
# we need the graph AS MODIFIED for verification. Jar-side extraction
# (mintscan-corpus.py) is only a fixture until a real dump lands; both produce
# the same file shapes so this tool never changes.
#
# Usage:
#   python3 mintscan.py --dump <dir containing mint/ and loot/> \
#                       --root <pack root with GROWTH-DIALS.json> \
#                       --out MINT-REPORT.md

import argparse
import json
import math
import os
from collections import defaultdict

EPS = 1e-4  # flat-loop tolerance on log2 ratio


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ----------------------------------------------------------------------------
# loot parsing (shared by fixture dumps and real lootdump output)
# ----------------------------------------------------------------------------

def _mean_range(v):
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, dict):
        if "min" in v and "max" in v:
            return (float(v["min"]) + float(v["max"])) / 2.0
        if "n" in v and "p" in v:
            return float(v["n"]) * float(v["p"])
    return 1.0


def loot_expected(table):
    """Extract {item: expected_yield} from a loot table JSON. Approximate:
    alternatives are unioned (conditioned alternatives noted), set_count
    taken as its mean."""
    out = {}
    conditioned = set()

    pools = table.get("pools", []) or []
    for pool in pools:
        rolls = _mean_range(pool.get("rolls", 1.0))
        items = {}

        def scan(entries):
            if not isinstance(entries, list):
                return
            for e in entries:
                if not isinstance(e, dict):
                    continue
                t = e.get("type", "")
                if t in ("minecraft:alternatives", "minecraft:group", "minecraft:sequence"):
                    scan(e.get("children", []))
                elif t == "minecraft:item":
                    name = e.get("name")
                    if not name:
                        continue
                    cnt = 1.0
                    for fn in e.get("functions", []) or []:
                        if fn.get("function") in ("minecraft:set_count", "set_count"):
                            cnt = _mean_range(fn.get("count", 1.0))
                    items[name] = items.get(name, 0.0) + cnt
                    for c in e.get("conditions", []) or []:
                        cond = c.get("condition", "")
                        if "killed_by_player" in cond:
                            conditioned.add(name)

        scan(pool.get("entries", []))
        total_w = sum(1.0 for _ in items) or 1.0  # weights rarely used; uniform approx
        for name, cnt in items.items():
            out[name] = out.get(name, 0.0) + rolls * (cnt / total_w)
    return out, conditioned


# ----------------------------------------------------------------------------
# graph construction
# ----------------------------------------------------------------------------

class Mint:
    def __init__(self):
        self.conv_edges = []      # (src, dst, ratio, prov, gate, cycle_s)
        self.compound = []        # (id, type, slot_items, out, in_total, out_count)
        self.quarantined = []     # rows we could not normalize
        self.items_seen = set()
        self.sources = {}         # item -> provenance string
        self.tag_map = {}

    def add_recipe(self, row):
        rid, rtype = row.get("id", "?"), row.get("type", "?")
        slots = row.get("slots", [])
        out = row.get("out")
        slot_items = []
        ok = True
        for slot in slots:
            alts = []
            for e in slot:
                if "item" in e:
                    alts.append((e["item"], int(e.get("count", 1))))
                else:
                    ok = False
            slot_items.append(alts)
            for it, _c in alts:
                self.items_seen.add(it)
        if out:
            self.items_seen.add(out["item"])
        if not out or not ok:
            self.quarantined.append((rid, rtype, "no-result" if not out else "slot-error"))
            return

        distinct = {it for alts in slot_items for it, _ in alts}
        in_total = sum(c for alts in slot_items for _it, c in alts)
        if len(distinct) == 1 and in_total > 0:
            src = next(iter(distinct))
            self.conv_edges.append((src, out["item"], out["count"] / in_total,
                                    {"kind": "recipe", "id": rid, "type": rtype},
                                    None, None))
        else:
            self.compound.append((rid, rtype, slot_items, out, in_total, out["count"]))

    def add_dial(self, d):
        inp = d.get("input", {})
        outs = d.get("outputs")
        if outs is None:
            o = d.get("output")
            outs = [o] if o else []
        for o in outs:
            if not o or "item" not in o:
                continue
            self.conv_edges.append((inp["item"], o["item"],
                                    float(o.get("count", 1)) / max(1, int(inp.get("count", 1))),
                                    {"kind": "dial", "name": d.get("name", "?")},
                                    d.get("gate", ""),
                                    d.get("cycle_seconds")))
            self.items_seen.add(inp["item"])
            self.items_seen.add(o["item"])


def tarjan(nodes, adj):
    """Iterative Tarjan (frames hold live child iterators — no re-init)."""
    idx = {}
    low = {}
    onstk = set()
    stk = []
    sccs = []
    counter = [0]

    for root in nodes:
        if root in idx:
            continue
        idx[root] = low[root] = counter[0]
        counter[0] += 1
        stk.append(root)
        onstk.add(root)
        call = [[root, iter(adj.get(root, ()))]]
        while call:
            v, it = call[-1]
            advanced = False
            for nbr in it:
                w = nbr[0]  # neighbors are (dst, ratio, prov, gate, cs) tuples
                if w not in idx:
                    idx[w] = low[w] = counter[0]
                    counter[0] += 1
                    stk.append(w)
                    onstk.add(w)
                    call.append([w, iter(adj.get(w, ()))])
                    advanced = True
                    break
                elif w in onstk and idx[w] < low[v]:
                    low[v] = idx[w]
            if advanced:
                continue
            call.pop()
            if low[v] == idx[v]:
                comp = []
                while True:
                    w = stk.pop()
                    onstk.discard(w)
                    comp.append(w)
                    if w == v:
                        break
                sccs.append(comp)
            if call:
                u = call[-1][0]
                if low[v] < low[u]:
                    low[u] = low[v]
    return sccs


def find_expanding_cycles(edges, nodes):
    """Bellman-Ford in log space. Edge weight = -log2(ratio); a cycle with
    negative total weight (product of ratios > 1) is an expanding mint."""
    adj = defaultdict(list)
    for (u, v, ratio, prov, gate, cs) in edges:
        if u in nodes and v in nodes:
            adj[u].append((v, ratio, prov, gate, cs))

    cycles = []

    # self-loops first
    for u in adj:
        for (v, ratio, prov, gate, cs) in adj[u]:
            if v == u and ratio > 1 + EPS:
                cycles.append({
                    "nodes": [u], "product": ratio, "prov": [prov],
                    "gates": [gate] if gate else [], "cycle_seconds": cs,
                })

    # parity pairs: 2-cycles whose product is ~1 — Bellman-Ford only reports
    # negative (expanding) cycles, so flat parity round-trips are enumerated
    # directly for the report's parity section. Decaying pairs (product < 1)
    # are harmless sinks and are not listed.
    edge_map = defaultdict(list)
    for (u, v, ratio, prov, gate, cs) in edges:
        if u in nodes and v in nodes:
            edge_map[(u, v)].append((ratio, prov, gate, cs))
    for (u, v), lst in edge_map.items():
        if u >= v:
            continue
        for (r1, p1, g1, c1) in lst:
            for (r2, p2, g2, c2) in edge_map.get((v, u), []):
                prod = r1 * r2
                if prod > 0 and abs(math.log2(prod)) <= EPS:
                    csecs = [c for c in (c1, c2) if c]
                    cycles.append({
                        "nodes": [u, v], "product": prod,
                        "prov": [p1, p2],
                        "gates": [g for g in (g1, g2) if g],
                        "cycle_seconds": max(csecs) if csecs else None,
                    })

    sccs = [c for c in tarjan(list(adj.keys()), adj) if len(c) >= 2]
    seen = set()
    skipped_big = 0
    for comp in sccs:
        if len(comp) > 400:
            skipped_big += 1
            continue
        cset = set(comp)
        bedges = []
        for u in comp:
            for (v, ratio, prov, gate, cs) in adj.get(u, []):
                if v in cset:
                    bedges.append((u, v, -math.log2(ratio), ratio, prov, gate, cs))
        dist = {n: 0.0 for n in comp}
        pred = {}
        n = len(comp)
        for _ in range(n):
            changed = False
            for (u, v, w, ratio, prov, gate, cs) in bedges:
                if dist[u] + w < dist[v] - EPS:
                    dist[v] = dist[u] + w
                    pred[v] = (u, ratio, prov, gate, cs)
                    changed = True
            if not changed:
                break
        else:
            # still relaxing after n passes -> negative (expanding) cycle exists
            for (u, v, w, ratio, prov, gate, cs) in bedges:
                if dist[u] + w < dist[v] - EPS:
                    # walk back into the cycle
                    x = v
                    for _ in range(n):
                        x = pred[x][0]
                    path = []
                    cur = x
                    while True:
                        path.append(cur)
                        cur = pred[cur][0]
                        if cur == x:
                            break
                    path.reverse()
                    key = frozenset(path)
                    if key in seen:
                        continue
                    seen.add(key)
                    product = 1.0
                    provs = []
                    gates = []
                    csecs = []
                    for a in path:
                        b = pred[a][0]
                        for (vv, ratio, prov, gate, cs) in adj.get(a, []):
                            if vv == b:
                                product *= ratio
                                provs.append(prov)
                                if gate:
                                    gates.append(gate)
                                if cs:
                                    csecs.append(cs)
                                break
                    cycles.append({
                        "nodes": path, "product": product, "prov": provs,
                        "gates": gates, "cycle_seconds": max(csecs) if csecs else None,
                    })
    cycles.sort(key=lambda c: -c["product"])
    return cycles, skipped_big


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dump", required=True, help="dir containing mint/ and loot/")
    ap.add_argument("--root", required=True, help="pack root (GROWTH-DIALS.json, WORLDGEN-SOURCES.json)")
    ap.add_argument("--out", default="MINT-REPORT.md")
    args = ap.parse_args()

    mint_dir = os.path.join(args.dump, "mint")
    loot_dir = os.path.join(args.dump, "loot")

    recipes_doc = load_json(os.path.join(mint_dir, "recipes.json"))
    tags_doc = load_json(os.path.join(mint_dir, "tags.json"))
    blockloot_doc = load_json(os.path.join(mint_dir, "blockloot.json"))
    dials_doc = load_json(os.path.join(args.root, "GROWTH-DIALS.json"))
    wgs_doc = load_json(os.path.join(args.root, "WORLDGEN-SOURCES.json"))

    m = Mint()
    m.tag_map = tags_doc.get("map", {})
    for row in recipes_doc.get("rows", []):
        m.add_recipe(row)
    for d in dials_doc.get("dials", []):
        m.add_dial(d)
    print(f"[mintscan] loaded: {len(recipes_doc.get('rows', []))} rows -> "
          f"{len(m.conv_edges)} conv edges, {len(m.compound)} compound, "
          f"{len(m.items_seen)} items seen", flush=True)

    # --- loot -> sources -----------------------------------------------------
    loot_notes = {"tables": 0, "conditioned": []}
    source_tables = list(wgs_doc.get("loot_tables", []))
    for _b, tid in wgs_doc.get("blocks", {}).items():
        source_tables.append(tid)
    for tid in source_tables:
        p = os.path.join(loot_dir, tid.replace(":", "/") + ".json")
        if not os.path.exists(p):
            continue
        table, cond = loot_expected(load_json(p))
        loot_notes["tables"] += 1
        for it, exp in table.items():
            if exp > 0:
                if it not in m.sources:
                    m.sources[it] = f"loot {tid}"
                m.items_seen.add(it)
        for it in cond:
            loot_notes["conditioned"].append(f"{it} ({tid})")

    for it, prov in wgs_doc.get("explicit_items", {}).items():
        if it not in m.sources:
            m.sources[it] = prov
        m.items_seen.add(it)

    # vanilla entity loot: mobs spawn for free, so their drops are zero-cost
    # sources (player-kill gating noted; breeding loops live in the dial file)
    import glob as _glob
    for p in _glob.glob(os.path.join(loot_dir, "*", "entities", "*.json")):
        tid = "minecraft:entities/" + os.path.basename(p)[:-5]
        table, cond = loot_expected(load_json(p))
        loot_notes["tables"] += 1
        for it, exp in table.items():
            if exp > 0:
                if it not in m.sources:
                    m.sources[it] = f"loot {tid}"
                m.items_seen.add(it)
        for it in cond:
            loot_notes["conditioned"].append(f"{it} ({tid})")

    # --- pass 1: closure ------------------------------------------------------
    closure = set(m.sources)
    applicable = 0
    changed = True
    passes = 0
    import time
    t0 = time.time()
    while changed:
        changed = False
        passes += 1
        for row in recipes_doc.get("rows", []):
            out = row.get("out")
            if not out or out["item"] in closure:
                continue
            ok = True
            non_empty = 0
            for slot in row.get("slots", []):
                if not slot:
                    continue
                non_empty += 1
                if not any(("item" in e) and (e["item"] in closure) for e in slot):
                    ok = False
                    break
            # >=1 non-empty item slot required: fluid-only recipes (item out,
            # no item slots) must not close as free sources
            if ok and non_empty > 0:
                closure.add(out["item"])
                applicable += 1
                changed = True
        if passes % 25 == 0:
            print(f"[mintscan] closure pass {passes}: |closure|={len(closure)} "
                  f"({time.time() - t0:.0f}s)", flush=True)

    # --- pass 2: cycles --------------------------------------------------------
    print(f"[mintscan] closure done: pass {passes}, {len(closure)} items, "
          f"{time.time() - t0:.0f}s", flush=True)

    # --- pass 2: cycles --------------------------------------------------------
    dsts = {v for (_u, v, *_r) in m.conv_edges}
    nodes = {u for (u, *_r) in m.conv_edges if u in dsts}
    print(f"[mintscan] cycle graph: {len(nodes)} nodes with in+out degree", flush=True)
    cycles, skipped_big = find_expanding_cycles(m.conv_edges, nodes)
    print(f"[mintscan] cycle search done: {len(cycles)} cycles", flush=True)

    expanding = [c for c in cycles if abs(math.log2(c["product"])) > EPS]
    flat = [c for c in cycles if abs(math.log2(c["product"])) <= EPS]
    # a dial anywhere in the loop gates the whole loop (the dial is the
    # time/effort bottleneck; recipe edges around it are plumbing)
    gated = [c for c in expanding if any(p["kind"] == "dial" for p in c["prov"])]
    ungated = [c for c in expanding if not any(p["kind"] == "dial" for p in c["prov"])]

    mass_watch = []
    for (rid, rtype, slot_items, out, in_total, out_count) in m.compound:
        if out_count > in_total > 0:
            mass_watch.append((rid, rtype, out, in_total, out_count))

    # --- report -----------------------------------------------------------------
    L = []
    L.append("# MINT-REPORT")
    L.append("")
    L.append(f"- graph kind: **{recipes_doc.get('graphKind', 'unknown')}** "
             f"(generated {recipes_doc.get('generated', '?')})")
    L.append(f"- corpus: {recipes_doc.get('recipes', '?')} recipes "
             f"({len(m.quarantined)} quarantined), "
             f"{tags_doc.get('tags', '?')} tags, "
             f"{blockloot_doc.get('blocks', '?')} block-loot edges, "
             f"{loot_notes['tables']} source loot tables, "
             f"{len(dials_doc.get('dials', []))} growth dials")
    L.append(f"- observed item universe: {len(m.items_seen)}; "
             f"bootstrappable from listed sources: **{len(closure)} "
             f"({100.0 * len(closure) / max(1, len(m.items_seen)):.1f}%)**")
    L.append("")
    if recipes_doc.get("graphKind") != "runtime-post-kubejs":
        L.append("> STATIC FIXTURE — jar-side, pre-KubeJS. Ground truth for doctrine "
                 "verification is a runtime `/mintdump` pass; KubeJS script edges are "
                 "invisible here by construction. Numbers below are a preview, not a ruling.")
        L.append("")

    def prov_str(p):
        if p["kind"] == "dial":
            return f"dial `{p['name']}`"
        return f"{p['type']} `{p['id']}`"

    def cycle_line(c, i):
        path = " -> ".join(c["nodes"] + [c["nodes"][0]])
        lines = [f"{i}. **{path}** — net ×{c['product']:.2f} per iteration"
                 + (f", ~{c['cycle_seconds']}s/cycle" if c.get("cycle_seconds") else "")]
        for p in c["prov"]:
            lines.append(f"   - edge via {prov_str(p)}")
        for g in c["gates"]:
            lines.append(f"   - gate: {g}")
        return "\n".join(lines)

    L.append("## A. Ungated expansions (doctrine violations)")
    L.append("")
    if ungated:
        for i, c in enumerate(ungated, 1):
            L.append(cycle_line(c, i))
    else:
        L.append("None found in this corpus.")
    L.append("")

    L.append("## B. Gated growths (dial-sourced, gate on record)")
    L.append("")
    if gated:
        for i, c in enumerate(gated, 1):
            L.append(cycle_line(c, i))
    else:
        L.append("None.")
    L.append("")

    L.append("## C. Flat loops (parity, no mint)")
    L.append("")
    L.append(f"{len(flat)} flat loops found — compress/decompress and equivalent "
             f"round-trips. Net factor 1.0; no doctrine issue. First 10:")
    for i, c in enumerate(flat[:10], 1):
        L.append(f"{i}. {' -> '.join(c['nodes'] + [c['nodes'][0]])} — ×1.00")
    L.append("")

    L.append("## D. Compound-recipe mass watchlist (multi-input, out > in by count)")
    L.append("")
    if mass_watch:
        for (rid, rtype, out, in_total, out_count) in sorted(mass_watch, key=lambda x: x[4] - x[3], reverse=True)[:25]:
            L.append(f"- `{rid}` ({rtype}): {in_total} in -> {out_count}x {out['item']}")
    else:
        L.append("None flagged by the count heuristic.")
    L.append("")

    unreach = sorted(m.items_seen - closure)
    L.append("## E. Not bootstrappable from listed sources (sample)")
    L.append("")
    L.append(f"{len(unreach)} items in the universe sit outside the closure "
             f"(exotic sinks — end loot, boss drops, non-worldgen structures...). "
             f"First 40: {' '.join(unreach[:40])}")
    L.append("")

    L.append("## F. Sources on record")
    L.append("")
    L.append(f"- {len(m.sources)} items seeded from {loot_notes['tables']} loot tables "
             f"+ {len(wgs_doc.get('explicit_items', {}))} explicit entries")
    if loot_notes["conditioned"]:
        L.append(f"- player-kill-conditioned drops: {len(loot_notes['conditioned'])} "
                 f"(sample: {'; '.join(loot_notes['conditioned'][:8])})")
    L.append("")

    L.append("## G. Dial ledger")
    L.append("")
    L.append("All time-based growth is a dial in `GROWTH-DIALS.json` — reviewable, "
             "turnable, and audited like any other edge.")
    for d in dials_doc.get("dials", []):
        ins = d.get("input", {})
        outs = d.get("outputs") or [d.get("output")]
        outs = ", ".join(f"{o.get('count', 1)}x {o.get('item', '?')}" for o in outs if o)
        L.append(f"- `{d.get('name')}`: {ins.get('count', 1)}x {ins.get('item', '?')} -> {outs} "
                 f"({d.get('cycle_seconds', '?')}s, {d.get('confidence', '?')})")
    L.append("")

    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print(f"wrote {args.out}: {len(expanding)} expanding ({len(ungated)} ungated / "
          f"{len(gated)} gated), {len(flat)} flat, closure {len(closure)}/{len(m.items_seen)}, "
          f"big-SCC skipped {skipped_big}")


if __name__ == "__main__":
    main()
