#!/usr/bin/env python3
# mintscan-corpus — build a STATIC FIXTURE in runtime-dump format from mod jars.
#
# This is a stand-in, not ground truth. Real verification corpus = /mintdump
# (runtime, post-KubeJS). The fixture exists so mintscan's logic can be
# exercised and previewed while nobody has booted the pack; the moment a real
# dump lands, the fixture is retired for verification purposes.
#
# What it does:
#   - extracts recipe JSONs (data/*/recipe[/s]/*.json), item tags, and source
#     loot tables from the jar set
#   - resolves tags and normalizes recipes into mintdump's row shape
#   - writes <out>/mint/{recipes,tags,blockloot}.json + <out>/loot/...
#
# Usage:
#   python3 mintscan-corpus.py --out /path/to/fixture-dir \
#       --root <pack root> --jar-dir <dir of jars> [--jar <path.jar>]...
#       [--vanilla <vanilla client jar>]

import argparse
import glob
import io
import json
import os
import re
import zipfile


def load_json_bytes(b):
    return json.loads(b.decode("utf-8", errors="replace"))


# ----------------------------------------------------------------------------
# ingredient / result normalization
# ----------------------------------------------------------------------------

def parse_spec(spec, tags, out_count):
    """Return list of concrete item ids (OR within a slot) or None if unknown."""
    if spec is None:
        return []
    if isinstance(spec, str):
        if spec.startswith("#"):
            tid = spec[1:]
            return list(tags.get(tid, []))
        return [spec]
    if isinstance(spec, list):
        acc = []
        for s in spec:
            r = parse_spec(s, tags, out_count)
            if r is None:
                return None
            acc.extend(r)
        return acc
    if isinstance(spec, dict):
        if "item" in spec:
            if out_count is not None:
                out_count.append(int(spec.get("count", 1)))
            return [spec["item"]]
        if "id" in spec and isinstance(spec.get("id"), str):
            if out_count is not None:
                out_count.append(int(spec.get("count", 1)))
            return [spec["id"]]
        if "tag" in spec:
            if out_count is not None:
                out_count.append(int(spec.get("count", 1)))
            return list(tags.get(spec["tag"], []))
        t = spec.get("type", "")
        if "compound" in t:
            return parse_spec(spec.get("ingredients", []), tags, out_count)
        if "difference" in t or "intersection" in t or "nbt" in t or "custom" in t:
            base = spec.get("base") or spec.get("ingredients") or spec.get("item")
            r = parse_spec(base, tags, out_count) if base else None
            return r if r is not None else None
    return None


def parse_result(res):
    if isinstance(res, str):
        return {"item": res, "count": 1}
    if isinstance(res, dict):
        rid = res.get("id") or res.get("item")
        if isinstance(rid, str):
            return {"item": rid, "count": int(res.get("count", 1))}
    return None


def slots_from_grid(grid, tags):
    slots = []
    for cell in grid:
        c = []
        spec_items = parse_spec(cell, tags, None) if cell is not None else []
        if spec_items is None:
            slots.append([{"error": "unparsed-spec"}])
            continue
        for it in spec_items:
            c.append({"item": it, "count": 1})
        slots.append(c)
    return slots


def convert_recipe(ns, name, doc, tags):
    rtype = doc.get("type", "minecraft:crafting_shaped")
    rid = f"{ns}:{name}"
    row = {"id": rid, "type": rtype, "slots": [], "out": None}

    res = parse_result(doc.get("result") or doc.get("output"))
    if res:
        row["out"] = {"item": res["item"], "count": res["count"]}

    if rtype == "minecraft:crafting_shaped":
        pattern = doc.get("pattern", [])
        key = doc.get("key", {})
        grid = []
        for line in pattern:
            for ch in line:
                if ch == " ":
                    grid.append([])
                else:
                    grid.append(key.get(ch, []))
        row["slots"] = slots_from_grid(grid, tags)
        return row

    if rtype == "minecraft:crafting_shapeless":
        grid = doc.get("ingredients", [])
        row["slots"] = slots_from_grid(grid, tags)
        return row

    if rtype in ("minecraft:smelting", "minecraft:blasting", "minecraft:smoking",
                 "minecraft:campfire_cooking", "minecraft:stonecutting"):
        grid = [doc.get("ingredient")]
        row["slots"] = slots_from_grid(grid, tags)
        return row

    if rtype in ("minecraft:smithing_transform", "minecraft:smithing_trim"):
        grid = [doc.get("template"), doc.get("base"), doc.get("addition")]
        row["slots"] = slots_from_grid(grid, tags)
        return row

    # generic sniff for modded types (prov carries the id; runtime dump replaces this)
    grid = []
    for k in ("ingredient", "ingredients", "inputs", "input", "base",
              "addition", "template", "primary_input", "secondary_input"):
        if k in doc and k != "result":
            v = doc[k]
            if isinstance(v, list):
                grid.extend(v)
            else:
                grid.append(v)
    if grid:
        row["slots"] = slots_from_grid(grid, tags)
        return row

    return None  # nothing recognizable -> quarantined


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--root", required=True)
    ap.add_argument("--jar-dir", action="append", default=[])
    ap.add_argument("--jar", action="append", default=[])
    ap.add_argument("--vanilla", default="")
    ap.add_argument("--kubejs-scripts", default="")
    args = ap.parse_args()

    jars = list(args.jar)
    for d in args.jar_dir:
        jars.extend(sorted(glob.glob(os.path.join(d, "*.jar"))))
    if args.vanilla and os.path.exists(args.vanilla):
        jars.append(args.vanilla)

    os.makedirs(os.path.join(args.out, "mint"), exist_ok=True)
    loot_out = os.path.join(args.out, "loot")
    os.makedirs(loot_out, exist_ok=True)

    # --- pass A: raw extraction ------------------------------------------------
    raw_recipes = {}   # (ns, name) -> doc  (deduped, last wins)
    raw_tags = {}      # tag id -> list of files' value-lists + replace flags
    loot_tables = {}   # "ns:path" -> doc

    for j in jars:
        try:
            zf = zipfile.ZipFile(j)
        except Exception as e:
            print(f"skip {j}: {e}")
            continue
        for info in zf.infolist():
            n = info.filename
            if n.startswith("data/") and n.endswith(".json"):
                parts = n.split("/")
                # data/<ns>/recipe[/s]/*.json | data/<ns>/tags/item[s]/*.json | data/<ns>/loot_table[s]/...
                if len(parts) >= 4 and parts[2] in ("recipe", "recipes"):
                    try:
                        # keep subdirs in the id: in-game ids are ns:path incl. folders
                        rid = f"{parts[1]}:{'/'.join(parts[3:])[:-5]}"
                        raw_recipes[(rid, parts[1])] = (rid, load_json_bytes(zf.read(info)))
                    except Exception:
                        pass
                elif len(parts) >= 5 and parts[2] == "tags" and parts[3] in ("item", "items"):
                    try:
                        doc = load_json_bytes(zf.read(info))
                        # nested tags: data/<ns>/tags/item/<sub>/<name>.json ->
                        # "<ns>:<sub>/<name>" (last segment alone flattens wrongly)
                        tid = f"{parts[1]}:{'/'.join(parts[4:])[:-5]}"
                        raw_tags.setdefault(tid, []).append(doc)
                    except Exception:
                        pass
                elif len(parts) >= 4 and parts[2] in ("loot_table", "loot_tables"):
                    tid = f"{parts[1]}:{'/'.join(parts[3:])[:-5]}"
                    keep = (parts[3] == "blocks") or \
                           (parts[3] == "entities" and parts[1] == "minecraft")
                    if keep:
                        try:
                            loot_tables[tid] = load_json_bytes(zf.read(info))
                        except Exception:
                            pass

    # --- tags: union merge (approximation; runtime dump supersedes) -------------
    tags = {}
    for tid, docs in raw_tags.items():
        vals = []
        for d in docs:
            vals.extend(d.get("values", []))
        members = []
        for v in vals:
            if isinstance(v, dict):
                if not v.get("required", True):
                    continue
                v = v.get("id", "")
            if isinstance(v, str):
                members.append(v)  # may be "#tag" — resolved below
        tags[tid] = members
    # resolve nested tag refs (bounded passes, DEDUPED per pass — expansion
    # without dedup goes exponential on diamond DAGs of shared sub-tags)
    for _ in range(8):
        dirty = False
        for tid, members in tags.items():
            if not any(v.startswith("#") for v in members):
                continue
            res = []
            seen = set()
            for v in members:
                if v.startswith("#"):
                    for w in tags.get(v[1:], []):
                        if w not in seen:
                            seen.add(w)
                            res.append(w)
                    dirty = True
                elif v not in seen:
                    seen.add(v)
                    res.append(v)
            tags[tid] = res
        if not dirty:
            break

    # --- sources config -----------------------------------------------------------
    wgs = json.load(open(os.path.join(args.root, "WORLDGEN-SOURCES.json"), encoding="utf-8"))

    source_tables = []
    blockloot = {}
    for blk, tid in wgs.get("blocks", {}).items():
        source_tables.append(tid)
        blockloot[blk] = tid

    # mod-worldgen heuristic: block loot tables named like ores / quarried stone
    for j in jars:
        try:
            zf = zipfile.ZipFile(j)
        except Exception:
            continue
        for info in zf.infolist():
            n = info.filename
            m = re.match(r"data/([^/]+)/loot_tables?/blocks/([^/]+)\.json", n)
            if not m:
                continue
            ns, base = m.group(1), m.group(2)
            if ns == "minecraft":
                continue
            if re.search(r"(^|_)(ore|gem|quarried)(_|$)", base):
                tid = f"{ns}:blocks/{base}"
                try:
                    loot_tables[tid] = load_json_bytes(zf.read(info))
                    source_tables.append(tid)
                    blockloot[f"{ns}:{base}"] = tid
                except Exception:
                    pass

    for tid in wgs.get("loot_tables", []):
        p = tid.replace(":", "/") + ".json"
        for j in jars:
            try:
                zf = zipfile.ZipFile(j)
                loot_tables[tid] = load_json_bytes(zf.read(p))
                break
            except Exception:
                continue

    # --- recipes -> rows -----------------------------------------------------------
    rows = []
    unparseable = {}
    for _k, (rid, doc) in raw_recipes.items():
        ns = rid.split(":", 1)[0]
        name = rid.split(":", 1)[1].rsplit("/", 1)[-1]
        r = convert_recipe(ns, name, doc, tags)
        if r is None:
            t = doc.get("type", "?")
            unparseable[t] = unparseable.get(t, 0) + 1
            continue
        rows.append(r)
    rows.sort(key=lambda r: r["id"])

    # --- write fixture ----------------------------------------------------------------
    kjs = sorted(os.path.basename(p) for p in glob.glob(
        os.path.join(args.kubejs_scripts, "*.js"))) if args.kubejs_scripts else []

    with open(os.path.join(args.out, "mint", "recipes.json"), "w", encoding="utf-8") as f:
        json.dump({
            "generated": "fixture",
            "graphKind": "static-fixture-pre-kubejs",
            "jarCount": len(jars),
            "recipeTypes": {t: 0 for t in sorted({r["type"] for r in rows})},
            "recipes": len(rows),
            "failures": sum(unparseable.values()),
            "unparseableByType": unparseable,
            "kubejsScriptsPresent": kjs,
            "rows": rows,
        }, f, indent=1)
    with open(os.path.join(args.out, "mint", "tags.json"), "w", encoding="utf-8") as f:
        json.dump({
            "generated": "fixture",
            "graphKind": "static-fixture-pre-kubejs",
            "tags": len(tags),
            "memberships": sum(len(v) for v in tags.values()),
            "map": tags,
        }, f, indent=1)
    with open(os.path.join(args.out, "mint", "blockloot.json"), "w", encoding="utf-8") as f:
        json.dump({
            "generated": "fixture",
            "graphKind": "static-fixture-pre-kubejs",
            "blocks": len(blockloot),
            "map": blockloot,
        }, f, indent=1)

    for tid, doc in loot_tables.items():
        p = os.path.join(loot_out, tid.replace(":", "/") + ".json")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(doc, f)

    print(f"fixture written to {args.out}: {len(rows)} recipe rows, {len(tags)} tags, "
          f"{len(loot_tables)} source loot tables, {sum(unparseable.values())} unparseable")
    if unparseable:
        top = sorted(unparseable.items(), key=lambda kv: -kv[1])[:8]
        print("  top unparseable types: " + ", ".join(f"{t}={c}" for t, c in top))
    if kjs:
        print(f"  kubejs scripts present (edges NOT in fixture): {', '.join(kjs)}")


if __name__ == "__main__":
    main()
