#!/usr/bin/env python3
"""Add the three verified CurseForge metalworks mods to the Minebricks packwiz project.
Preconditions (already verified manually): jars downloaded from CF CDN, mods.toml deps
cross-checked against pack pins. This script writes .pw.toml metafiles with
[update.curseforge] sections and inserts [[files]] entries into index.toml (sorted)."""
import hashlib, pathlib

PACK = pathlib.Path("/home/z/my-project/scratch/packwiz-build/friend-pack")
MODS = PACK / "mods"

# metafile-slug -> (project id, file id, jar filename, display title)
MODS_CF = {
    "productive-metalworks": (1184570, 8558526,
        "productivemetalworks-1.21.1-1.15.1.jar", "Productive Metalworks"),
    "silent-gear-metalworks": (1199188, 7897500,
        "sgearmetalworks-1.21.1-1.5.0.jar", "Silent Gear Metalworks"),
    "kubejs-metalworks-kubejs-addon-for-productive": (1589907, 8329295,
        "productive-metalworks-kubejs-addon-1.0.0.jar",
        "KubeJS Metalworks (KubeJS Addon for Productive Metalworks)"),
}
JAR_CACHE = pathlib.Path("/home/z/my-project/scratch/jars-extra")
UA = "Minebricks-packwiz-manual/0.5 (discord bot)"

results = []
for slug, (proj, fid, jar, title) in MODS_CF.items():
    jar_path = JAR_CACHE / jar
    data = jar_path.read_bytes()
    h = hashlib.sha512(data).hexdigest()
    sid = str(fid)
    url = f"https://mediafilez.forgecdn.net/files/{sid[:4]}/{sid[4:]}/{jar}"
    meta = (
        f'name = "{title}"\n'
        f'filename = "{jar}"\n'
        f'side = "both"\n\n'
        f'[download]\n'
        f'url = "{url}"\n'
        f'hash-format = "sha512"\n'
        f'hash = "{h}"\n\n'
        f'[update]\n'
        f'[update.curseforge]\n'
        f'file-id = {fid}\n'
        f'project-id = {proj}\n'
    )
    (MODS / f"{slug}.pw.toml").write_text(meta)
    results.append((slug, jar, len(data)))
    print(f"META  {slug}.pw.toml  <- {jar} ({len(data)//1024} KB)")

# --- index.toml insertion (sorted by path, same logic as modrinth script) ---
idx_path = PACK / "index.toml"
idx_text = idx_path.read_text()
lines = idx_text.splitlines()
added = 0
for slug, _, _ in results:
    entry_path = f"mods/{slug}.pw.toml"
    if f'file = "{entry_path}"' in idx_text:
        print(f"SKIP index: {entry_path} already listed")
        continue
    meta_hash = hashlib.sha256((MODS / f"{slug}.pw.toml").read_bytes()).hexdigest()
    block = ["", "[[files]]", f'file = "{entry_path}"', f'hash = "{meta_hash}"', "metafile = true"]
    insert_at = len(lines)
    for i, ln in enumerate(lines):
        if ln.startswith('file = "'):
            if ln.split('"')[1] > entry_path:
                insert_at = i
                while insert_at > 0 and lines[insert_at - 1].strip() != "[[files]]":
                    insert_at -= 1
                insert_at -= 1
                break
    lines[insert_at:insert_at] = block
    added += 1
    print(f"INDEX + {entry_path} sha256={meta_hash[:16]}...")

idx_path.write_text("\n".join(lines) + "\n")
print(f"\nindex.toml: +{added} entries")
