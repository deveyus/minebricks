#!/usr/bin/env python3
"""Regenerate packwiz index.toml deterministically: sha256 of every mods/*.pw.toml,
sorted by path, metafile = true (matches packwiz refresh behavior for this pack layout)."""
import hashlib, pathlib, tomllib, sys

PACK = pathlib.Path("/home/z/my-project/scratch/packwiz-build/friend-pack")
MODS = PACK / "mods"

metas = sorted(MODS.glob("*.pw.toml"))
assert len(metas) == 49, f"expected 49 metafiles, found {len(metas)}"

out = ['hash-format = "sha256"', ""]
for m in metas:
    tomllib.loads(m.read_text())  # parse check
    h = hashlib.sha256(m.read_bytes()).hexdigest()
    out += ["[[files]]", f'file = "mods/{m.name}"', f'hash = "{h}"', "metafile = true", ""]

text = "\n".join(out).rstrip("\n") + "\n"
(PACK / "index.toml").write_text(text)

# pack.toml records the index hash — keep it in lockstep
pk_path = PACK / "pack.toml"
idx_sha = hashlib.sha256((PACK / "index.toml").read_bytes()).hexdigest()
pk_lines = pk_path.read_text().splitlines()
in_index = False
for i, ln in enumerate(pk_lines):
    if ln.strip() == "[index]":
        in_index = True
    elif in_index and ln.startswith("hash = "):
        pk_lines[i] = f'hash = "{idx_sha}"'
        break
    elif in_index and ln.startswith("["):
        in_index = False
pk_path.write_text("\n".join(pk_lines) + "\n")

# self-check
idx = tomllib.loads((PACK / "index.toml").read_text())
entries = {f["file"]: f["hash"] for f in idx["files"]}
assert len(entries) == 49
bad = [rel for rel, want in entries.items()
       if hashlib.sha256((PACK / rel).read_bytes()).hexdigest() != want]
print(f"index rebuilt: {len(entries)} entries | TOML valid | hash mismatches: {bad or 'NONE'}")
if bad: sys.exit(1)
