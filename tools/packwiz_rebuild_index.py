#!/usr/bin/env python3
"""Rebuild index.toml cleanly from mods/*.pw.toml (repairs the dangling [[files]]
left by the manual index surgery), then refresh pack.toml's index hash.
Format matches packwiz_build.py exactly: blocks joined with a single blank line."""
import hashlib, pathlib, re

PACK = pathlib.Path("/home/z/my-project/scratch/packwiz-build/friend-pack")
MODS = PACK / "mods"

entries = []
for name in sorted(os.listdir(MODS)) if (os := __import__("os")) else []:
    h = hashlib.sha256((MODS / name).read_bytes()).hexdigest()
    entries.append(f'[[files]]\nfile = "mods/{name}"\nhash = "{h}"\nmetafile = true\n')

body = 'hash-format = "sha256"\n\n' + "\n".join(entries)
(PACK / "index.toml").write_text(body)
idx_hash = hashlib.sha256(body.encode()).hexdigest()

pt_path = PACK / "pack.toml"
pt = pt_path.read_text()
pt = re.sub(r'(\[index\]\nfile = "index\.toml"\nhash-format = "sha256"\nhash = ")[^"]*(")',
            lambda m: m.group(1) + idx_hash + m.group(2), pt)
pt_path.write_text(pt)

print(f"index rebuilt: {len(entries)} entries, sha256 {idx_hash[:16]}...")
print(f"pack.toml index hash refreshed")
