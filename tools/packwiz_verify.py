#!/usr/bin/env python3
"""Structural verification of the friend-pack manifest (v0.4.1)."""
import hashlib, os, tomllib, sys

PACK = "/home/z/my-project/scratch/packwiz-build/friend-pack"
ok = True


def check(cond, msg):
    global ok
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        ok = False


pack = tomllib.load(open(os.path.join(PACK, "pack.toml"), "rb"))
check(pack["version"] == "0.4.1", "pack.toml version 0.4.1")
check(pack["versions"]["minecraft"] == "1.21.1", "MC 1.21.1")
check(pack["versions"]["neoforge"].startswith("21.1."), "neoforge pin 21.1.x (" + pack["versions"]["neoforge"] + ")")

idx_path = os.path.join(PACK, "index.toml")
idx_bytes = open(idx_path, "rb").read()
idx = tomllib.loads(idx_bytes.decode())
check(hashlib.sha256(idx_bytes).hexdigest() == pack["index"]["hash"], "index hash matches pack.toml")
check(idx["hash-format"] == "sha256", "index hash-format sha256")

entries = idx["files"]
check(len(entries) == 57, f"57 entries (got {len(entries)})")

pw_slugs = set()
for e in entries:
    rel = e["file"]
    p = os.path.join(PACK, rel)
    if not os.path.exists(p):
        check(False, "file exists: " + rel)
        continue
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    if h != e["hash"]:
        check(False, "sha256: " + rel)
    if not e.get("metafile"):
        check(False, "metafile flag: " + rel)
    m = tomllib.load(open(p, "rb"))
    slug = os.path.basename(rel).replace(".pw.toml", "")
    pw_slugs.add(slug)
    if m.get("download", {}).get("hash-format") != "sha512" or len(m["download"]["hash"]) != 128:
        check(False, "sha512 metafile: " + rel)
    if not m["download"]["url"].startswith("https://"):
        check(False, "https url: " + rel)
    if m.get("side") not in ("both", "client"):
        check(False, "side: " + rel)

check("toolbelt" in pw_slugs and "traveler-tool-belt" not in pw_slugs, "toolbelt in, traveler out")
check("rechiseled" in pw_slugs and "chipped" not in pw_slugs and "athena-ctm" not in pw_slugs,
      "Rechiseled lane in, Chipped lane out")
check("toms-storage" in pw_slugs and "advanced-rocketry-3" in pw_slugs, "Tom's + AR3 in")
tb = tomllib.load(open(os.path.join(PACK, "mods/toolbelt.pw.toml"), "rb"))
check("curseforge" in tb.get("update", {}), "toolbelt [update.curseforge] present")
check(tb["update"]["curseforge"]["file-id"] == 8309722, "toolbelt file-id 8309722")
check("create" not in pw_slugs and "create-deco" not in pw_slugs, "no create / create-deco")
for cf in ("productive-metalworks", "silent-gear-metalworks",
           "kubejs-metalworks-kubejs-addon-for-productive"):
    mcf = tomllib.load(open(os.path.join(PACK, "mods", cf + ".pw.toml"), "rb"))
    check("curseforge" in mcf.get("update", {}), f"[update.curseforge]: {cf}")
check("productive-metalworks" in pw_slugs and "silent-gear-metalworks" in pw_slugs
      and "kubejs-metalworks-kubejs-addon-for-productive" in pw_slugs,
      "roster: metalworks trio")
for mapmod in ("antique-atlas", "xaeros-minimap", "xaeros-world-map",
               "open-parties-and-claims", "xaeros-map-server-utils"):
    check(mapmod in pw_slugs, "roster: map era " + mapmod)
client = sorted(s for s in pw_slugs if tomllib.load(open(os.path.join(PACK, "mods", s + ".pw.toml"), "rb")).get("side") == "client")
print("client-side:", client)
for need in ("appleskin", "probejs", "railcraft-reborn", "via-romana", "framedblocks",
             "faun", "embeddium", "modernfix", "little-logistics", "immersive-aircraft",
             "no-chat-reports", "sophisticated-backpacks", "emi", "kubejs", "multiblocked2",
             "rechiseled", "toms-storage", "advanced-rocketry-3", "handcrafted"):
    check(need in pw_slugs, "roster: " + need)

print("ALL PASS" if ok else "FAILURES PRESENT")
sys.exit(0 if ok else 1)
