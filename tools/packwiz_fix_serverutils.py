#!/usr/bin/env python3
"""Fix Server Utils placement: it's a universal mod jar (neoforge.mods.toml + fabric.mod.json
+ embedded data/), not a plain datapack. Move mods/ <- config/paxi/datapacks/, rewrite as
metafile pw.toml with Modrinth version-id, repair index.toml + pack.toml hash."""
import hashlib, json, pathlib, urllib.request

PACK = pathlib.Path("/home/z/my-project/scratch/packwiz-build/friend-pack")
MODS = PACK / "mods"
DP = PACK / "config" / "paxi" / "datapacks"
JAR_NAME = "xaeros-map-server-utils-1.1.0.jar"
UA = {"User-Agent": "Minebricks-packwiz-manual/0.6 (discord bot)"}

jar_dp = DP / JAR_NAME
data = jar_dp.read_bytes()
sha512 = hashlib.sha512(data).hexdigest()

# Modrinth version-id for the update block
req = urllib.request.Request("https://api.modrinth.com/v2/project/YJgkgKMm/version", headers=UA)
vs = json.load(urllib.request.urlopen(req, timeout=30))
ver = next(v for v in vs if any(f["filename"] == JAR_NAME for f in v["files"]))
url = next(f["url"] for f in ver["files"] if f["filename"] == JAR_NAME)

meta = (
    'name = "Xaero\'s Map Server Utils"\n'
    f'filename = "{JAR_NAME}"\n'
    'side = "both"\n\n'
    '[download]\n'
    f'url = "{url}"\n'
    'hash-format = "sha512"\n'
    f'hash = "{sha512}"\n\n'
    '[update]\n'
    '[update.modrinth]\n'
    f'mod-id = "{ver["project_id"]}"\n'
    f'version-id = "{ver["id"]}"\n'
)

# stash a cache copy, move file out of datapacks
JAR_CACHE = pathlib.Path("/home/z/my-project/scratch/jars-extra")
(JAR_CACHE / JAR_NAME).write_bytes(data)
jar_dp.unlink()
DP.rmdir()                      # now empty
try:
    (PACK / "config" / "paxi").rmdir()
    (PACK / "config").rmdir()
except OSError:
    pass
(MODS / "xaeros-map-server-utils.pw.toml").write_text(meta)
print(f"moved to mods/, sha512 {sha512[:16]}..., version-id {ver['id']}")

# --- index.toml: drop the datapack entry, add the metafile entry (sorted) ---
idx_path = PACK / "index.toml"
lines = idx_path.read_text().splitlines()
drop = f'file = "config/paxi/datapacks/{JAR_NAME}"'
out, i, removed = [], 0, False
while i < len(lines):
    if lines[i].strip().startswith(drop):
        # back over [[files]] header + leading blank, skip through 'hash' (and possible metafile)
        j = i + 1
        while j < len(lines) and lines[j].strip() not in ("[[files]]",) and not lines[j].startswith("file = "):
            j += 1
        if out and out[-1] == "":
            out.pop()
        i = j
        removed = True
        continue
    out.append(lines[i])
    i += 1
assert removed, "datapack index entry not found"
lines = out

entry_path = "mods/xaeros-map-server-utils.pw.toml"
meta_hash = hashlib.sha256((MODS / "xaeros-map-server-utils.pw.toml").read_bytes()).hexdigest()
insert_at = len(lines)
for i, ln in enumerate(lines):
    if ln.startswith('file = "'):
        existing = ln.split('"')[1]
        if existing > entry_path:
            insert_at = i
            while insert_at > 0 and lines[insert_at - 1].strip() != "[[files]]":
                insert_at -= 1
            insert_at -= 1
            break
block = ["", "[[files]]", f'file = "{entry_path}"', f'hash = "{meta_hash}"', "metafile = true"]
lines[insert_at:insert_at] = block

new_idx = "\n".join(lines) + "\n"
idx_path.write_text(new_idx)
print(f"index: datapack entry removed, +{entry_path} sha256={meta_hash[:16]}...")

# --- pack.toml hash refresh ---
idx_hash = hashlib.sha256(new_idx.encode()).hexdigest()
pt_path = PACK / "pack.toml"
pt = pt_path.read_text()
import re
pt = re.sub(r'(\[index\]\nfile = "index\.toml"\nhash-format = "sha256"\nhash = ")[^"]*(")',
            lambda m: m.group(1) + idx_hash + m.group(2), pt)
pt_path.write_text(pt)
print(f"pack.toml index hash -> {idx_hash[:16]}...")

n_meta = len(list(MODS.glob("*.pw.toml")))
print(f"mods/ metafile count now: {n_meta}")
leftover = list((PACK / "config").rglob("*")) if (PACK / "config").exists() else []
print("config/ leftovers:", leftover if leftover else "none (removed)")
