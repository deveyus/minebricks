#!/usr/bin/env python3
"""Scan Minebricks mod jars for the ore/material master list.

Extracts per jar:
  1. worldgen ore features (configured_feature type minecraft:ore / scattered_ore)
     + their placed_feature stats (count, height range, rarity)
  2. neoforge biome_modifier jsons that add/remove features
  3. c: (common convention) item tag memberships for material tags
  4. all item ids + en_us display names, filtered to material keywords

Output: /home/z/my-project/scratch/materials_scan.json
"""
import json, os, re, sys, zipfile
from collections import defaultdict

JAR_DIRS = ["/home/z/my-project/scratch/jars", "/home/z/my-project/scratch/jars-extra"]

ORE_TYPES = {"minecraft:ore", "minecraft:scattered_ore"}

MATERIAL_RE = re.compile(
    r"(?<!\w)(?:ore|raw[_ ]|dust|powder|ingot|gem|crystal|nugget|plate|gear|rod"
    r"|chunk|cluster|shard|fragment|purified|dirty|dense|compound|pebble)", re.I)
# display-name junk to keep out of the material sheet
BLOCKLIST_RE = re.compile(
    r"(blaze rod|breeze rod|powder snow|blaze powder|gunpowder|sugar|bone"
    r"|bricks? item|wand|paint|brush|guide|manual|blueprint|disc|music)"
    , re.I)

def lang_of(zf, ns):
    try:
        data = json.loads(zf.read(f"assets/{ns}/lang/en_us.json").decode("utf-8", "replace"))
        return data
    except KeyError:
        return {}

def scan_jar(path):
    modid_guess = os.path.basename(path)
    res = {"jar": modid_guess, "ores": [], "biome_mods": [], "c_tags": [],
           "items": [], "raw_item_count": 0}
    try:
        zf = zipfile.ZipFile(path)
    except Exception as e:
        res["error"] = str(e)
        return res
    names = zf.namelist()
    langs = {}          # ns -> lang dict
    items = defaultdict(set)   # ns -> {item ids}
    ore_cfg = []        # (ns, id, json)
    placed = {}         # "ns:id" -> (id, json)
    bmods = []          # (ns, id, json)

    for n in names:
        if n.endswith("/"):
            continue
        # item ids
        m = re.match(r"assets/([^/]+)/items/([^/]+)\.json$", n)
        if m:
            items[m.group(1)].add(m.group(2))
            continue
        m = re.match(r"assets/([^/]+)/models/item/([^/]+)\.json$", n)
        if m:
            items[m.group(1)].add(m.group(2))
            continue
        # lang
        m = re.match(r"assets/([^/]+)/lang/en_us\.json$", n)
        if m:
            langs[m.group(1)] = lang_of(zf, m.group(1))
            continue
        # worldgen
        m = re.match(r"data/([^/]+)/worldgen/configured_feature/([^/]+)\.json$", n)
        if m:
            try:
                j = json.loads(zf.read(n).decode("utf-8", "replace"))
            except Exception:
                continue
            if j.get("type") in ORE_TYPES:
                ore_cfg.append((m.group(1), m.group(2), j))
            continue
        m = re.match(r"data/([^/]+)/worldgen/placed_feature/([^/]+)\.json$", n)
        if m:
            try:
                placed[f"{m.group(1)}:{m.group(2)}"] = json.loads(zf.read(n).decode("utf-8", "replace"))
            except Exception:
                pass
            continue
        # biome modifiers
        m = re.match(r"data/([^/]+)/(?:neoforge/)?biome_modifier/([^/]+)\.json$", n)
        if m:
            try:
                bmods.append((m.group(1), m.group(2), json.loads(zf.read(n).decode("utf-8", "replace"))))
            except Exception:
                pass
            continue
        # c: tags (both item/ and items/ variants)
        m = re.match(r"data/c/tags/(?:item|items)/([^/]+)(?:/([^/]+))?\.json$", n)
        if m:
            try:
                j = json.loads(zf.read(n).decode("utf-8", "replace"))
            except Exception:
                continue
            tag = m.group(2) if m.group(2) else m.group(1)
            key = ("c:" + (f"{m.group(1)}/{m.group(2)}" if m.group(2) else m.group(1)))
            res["c_tags"].append({"tag": key, "values": j.get("values", []),
                                  "replace": j.get("replace", False)})
            continue

    # ---- ore features + placed stats ----
    for ns, fid, j in ore_cfg:
        cfg = j.get("config", {})
        states = []
        if "state" in cfg and "Name" in cfg.get("state", {}):
            states.append(cfg["state"]["Name"])
        for st in cfg.get("states", []):
            if "Name" in st:
                states.append(st["Name"])
        targets = []
        for t in cfg.get("targets", []):
            pred = t.get("target", {})
            ptype = pred.get("predicate_type", "?")
            if ptype.endswith("tag_match"):
                targets.append("#" + str(pred.get("tag")))
            elif ptype.endswith("block_match"):
                targets.append(str(pred.get("block")))
            elif ptype.endswith("random_block_match"):
                targets.append(f"{pred.get('block')}({pred.get('probability')})")
            else:
                targets.append(json.dumps(pred))
        placed_info = None
        # find placed feature(s) referencing "ns:fid"
        for pid, pj in placed.items():
            if pj.get("feature") == f"{ns}:{fid}":
                count = None
                height = None
                for pm in pj.get("placement", []):
                    if isinstance(pm, dict) and "count" in pm:
                        count = pm.get("count")
                    if isinstance(pm, dict) and pm.get("type") == "minecraft:height_range":
                        hp = pm.get("height", {})
                        def bnd(x):
                            if not isinstance(x, dict):
                                return str(x)
                            inner = x.get(x.get("type", ""), x) if "type" in x else x
                            t = x.get("type", inner.get("type") if isinstance(inner, dict) else "")
                            v = x.get("value") or x.get("offset")
                            if t == "minecraft:absolute":
                                return str(v if v is not None else x)
                            if t in ("minecraft:above_bottom", "minecraft:below_top"):
                                return f"{t.split(':')[1]}+{v}"
                            if t == "minecraft:uniform":
                                return f"uniform {bnd(x.get('min_inclusive'))}..{bnd(x.get('max_inclusive'))}"
                            return json.dumps(x)
                        height = f"{bnd(hp.get('min_inclusive'))} .. {bnd(hp.get('max_inclusive'))}"
                placed_info = {"placed_id": pid, "count": count, "height": height}
                break
        res["ores"].append({
            "mod_ns": ns, "feature_id": f"{ns}:{fid}",
            "ore_blocks": states, "replaces": targets,
            "size": cfg.get("size"), "discard_on_air": cfg.get("discard_chance_on_air_exposure"),
            "placed": placed_info,
        })

    # ---- biome modifiers ----
    for ns, bid, j in bmods:
        res["biome_mods"].append({"mod_ns": ns, "id": f"{ns}:{bid}",
                                  "type": j.get("type"), "json": j})

    # ---- items -> materials ----
    for ns, ids in items.items():
        lang = langs.get(ns, {})
        for iid in sorted(ids):
            name = None
            for pref in ("item", "block"):
                k = f"{pref}.{ns}.{iid}"
                if k in lang:
                    name = lang[k]
                    break
            if name is None:
                # some mods use bare keys or entity/item keys with different ns casing
                for k, v in lang.items():
                    if k.endswith("." + iid) and k.startswith(("item.", "block.")):
                        name = v
                        break
            hay = f"{iid} {name or ''}"
            if MATERIAL_RE.search(hay) and not BLOCKLIST_RE.search(name or ""):
                res["items"].append({"ns": ns, "id": f"{ns}:{iid}", "name": name})
    res["raw_item_count"] = sum(len(v) for v in items.values())
    return res

def main():
    out = {}
    for d in JAR_DIRS:
        for fn in sorted(os.listdir(d)):
            if not fn.endswith((".jar", ".zip")):
                continue
            path = os.path.join(d, fn)
            print("scanning", fn, flush=True)
            out[fn] = scan_jar(path)
    with open("/home/z/my-project/scratch/materials_scan.json", "w") as f:
        json.dump(out, f, indent=1)
    # quick console digest
    for fn, r in out.items():
        ores = len(r.get("ores", []))
        mats = len(r.get("items", []))
        bmods = len(r.get("biome_mods", []))
        ctags = len(r.get("c_tags", []))
        if ores or mats or bmods:
            print(f"{fn:55s} ore_feats={ores:3d} material_items={mats:4d} biome_mods={bmods:2d} c_tags={ctags:3d}")

if __name__ == "__main__":
    main()
