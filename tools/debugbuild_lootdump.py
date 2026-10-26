#!/usr/bin/env python3
"""Debug build for the loot-pass loop: manifest zip with ONLY the lootdump
debug script active (the three draft scripts stay unindexed in friend-pack).

Output: download/minebricks-debugbuild-lootdump-1.zip
Contents: pack.toml, index.toml, mods/*.pw.toml (57), kubejs/server_scripts/
minebricks_lootdump.js, PACK_NOTES.md, DEBUG-NOTES.md
"""
import hashlib, json, os, pathlib, re, shutil, zipfile

SRC = pathlib.Path("/home/z/my-project/scratch/packwiz-build/friend-pack")
BLD = pathlib.Path("/home/z/my-project/scratch/packwiz-build/debugbuild")
OUT = pathlib.Path("/home/z/my-project/download/minebricks-debugbuild-lootdump-1.zip")

if BLD.exists():
    shutil.rmtree(BLD)
BLD.mkdir(parents=True)

# --- stage files -------------------------------------------------------------
(BLD / "mods").mkdir()
for t in sorted((SRC / "mods").glob("*.pw.toml")):
    shutil.copy2(t, BLD / "mods" / t.name)
shutil.copy2(SRC / "pack.toml", BLD / "pack.toml")
shutil.copy2(SRC / "PACK_NOTES.md", BLD / "PACK_NOTES.md")
kd = BLD / "kubejs" / "server_scripts"
kd.mkdir(parents=True)
shutil.copy2(SRC / "kubejs/server_scripts/minebricks_lootdump.js", kd / "minebricks_lootdump.js")

# --- index -------------------------------------------------------------------
entries = []
for name in sorted(os.listdir(BLD / "mods")):
    h = hashlib.sha256((BLD / "mods" / name).read_bytes()).hexdigest()
    entries.append(f'[[files]]\nfile = "mods/{name}"\nhash = "{h}"\nmetafile = true\n')

extra = [
    ("kubejs/server_scripts/minebricks_lootdump.js", False),
    ("PACK_NOTES.md", False),
]
for rel, meta in extra:
    h = hashlib.sha256((BLD / rel).read_bytes()).hexdigest()
    e = f'[[files]]\nfile = "{rel}"\nhash = "{h}"'
    if meta:
        e += "\nmetafile = true"
    entries.append(e + "\n")

body = 'hash-format = "sha256"\n\n' + "\n".join(entries)
(BLD / "index.toml").write_text(body)
idx_hash = hashlib.sha256(body.encode()).hexdigest()

pt = (BLD / "pack.toml").read_text()
pt = re.sub(r'version = "[^"]*"', 'version = "0.4.1-debug.1"', pt, count=1)
pt = re.sub(r'(\[index\]\nfile = "index\.toml"\nhash-format = "sha256"\nhash = ")[^"]*(")',
            lambda m: m.group(1) + idx_hash + m.group(2), pt, count=1)
(BLD / "pack.toml").write_text(pt)

# --- debug notes -------------------------------------------------------------
notes = """# DEBUG BUILD — loot dump only (0.4.1-debug.1)

This is NOT a content release. It exists for one job: the loot-pass loop.

What's inside beyond the 0.4.1 mod manifest:
- kubejs/server_scripts/minebricks_lootdump.js — the debug tool
  (the AR3 / GPS / backpack draft scripts are deliberately NOT in this build)

## The loop (pack lead side)
1. Unzip over (or into) the server pack folder — or `packwiz install` this
   manifest fresh; either way the lootdump script is the only KubeJS file.
2. Launch server (or single-player world with cheats) — needs KubeJS.
3. In-game, as an op:  /lootdump
4. Collect `kubejs/export/loot/` (DUMP-INDEX.txt, DUMP-LOG.txt, and the
   per-table JSONs under loot/<namespace>/...).
5. Send those files back. First run is also the API probe — DUMP-LOG.txt
   records exactly which paths worked, so even a partial dump is useful.

Nothing in this build changes gameplay: the script only writes files when the
command is run.
"""
(BLD / "DEBUG-NOTES.md").write_text(notes)
h = hashlib.sha256(notes.encode()).hexdigest()
body2 = body + f'[[files]]\nfile = "DEBUG-NOTES.md"\nhash = "{h}"\n'
(BLD / "index.toml").write_text(body2)
idx_hash2 = hashlib.sha256(body2.encode()).hexdigest()
pt = (BLD / "pack.toml").read_text()
pt = re.sub(r'(\[index\]\nfile = "index\.toml"\nhash-format = "sha256"\nhash = ")[^"]*(")',
            lambda m: m.group(1) + idx_hash2 + m.group(2), pt, count=1)
(BLD / "pack.toml").write_text(pt)

# --- self-verify -------------------------------------------------------------
import tomllib
idx = tomllib.loads(body2)
errs = []
for e in idx["files"]:
    f = BLD / e["file"]
    if not f.exists():
        errs.append(f"missing {e['file']}")
    elif hashlib.sha256(f.read_bytes()).hexdigest() != e["hash"]:
        errs.append(f"hash mismatch {e['file']}")
pack = tomllib.loads((BLD / "pack.toml").read_text())
if pack["index"]["hash"] != idx_hash2:
    errs.append("pack.toml index hash mismatch")
n_mods = sum(1 for e in idx["files"] if e["file"].startswith("mods/"))
n_scripts = sum(1 for e in idx["files"] if "kubejs" in e["file"])
print(f"verify: {len(idx['files'])} entries ({n_mods} mods, {n_scripts} kubejs script) errors={errs}")

# --- zip ---------------------------------------------------------------------
OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for e in idx["files"]:
        z.write(BLD / e["file"], e["file"])
print(f"zip: {OUT} ({OUT.stat().st_size} bytes)")
