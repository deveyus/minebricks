#!/usr/bin/env python3
"""Add live-verified 1.21.1-NeoForge mods to the Minebricks packwiz project.
Manual metafile path (packwiz CLI unavailable: releases discontinued, JRE-only box).
Iron rule: top Modrinth 1.21.1+neoforge version must EQUAL the verified pin or we stop."""
import json, hashlib, pathlib, urllib.request, sys

PACK = pathlib.Path("/home/z/my-project/scratch/packwiz-build/friend-pack")
MODS = PACK / "mods"
JAR_CACHE = pathlib.Path("/home/z/my-project/scratch/jars-extra")
UA = {"User-Agent": "Minebricks-packwiz-manual/0.5 (discord bot)"}

PINS = {
    "terralith":     "2.6.2",
    "tectonic":      "3.0.28-neoforge-21.1",
    "lithostitched": "1.8.1-neoforge-21.1",
    "paxi":          "1.21.1-NeoForge-5.1.3",
    "silent-lib":    "10.6.0",
    "silent-gear":   "4.2.1.1",
    "silents-gems":  "5.1.3",
}
QV = urllib.parse.quote('["1.21.1"]')
QL = urllib.parse.quote('["neoforge"]')

def api(path):
    req = urllib.request.Request("https://api.modrinth.com/v2" + path, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=30))

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()

results = []
for slug, pin in PINS.items():
    proj = api(f"/project/{slug}")
    versions = api(f"/project/{slug}/version?game_versions={QV}&loaders={QL}")
    if not versions:
        print(f"FAIL {slug}: no 1.21.1+neoforge versions"); sys.exit(1)
    top = versions[0]
    if top["version_number"] != pin:
        print(f"FAIL {slug}: Modrinth top {top['version_number']} != verified pin {pin} — refusing blind add"); sys.exit(1)
    f = top["files"][0]
    data = fetch(f["url"])
    h = hashlib.sha512(data).hexdigest()
    if h != f["hashes"]["sha512"]:
        print(f"FAIL {slug}: downloaded jar sha512 mismatch"); sys.exit(1)
    (JAR_CACHE / f["filename"]).write_bytes(data)
    meta = (
        f'name = "{proj["title"]}"\n'
        f'filename = "{f["filename"]}"\n'
        f'side = "both"\n\n'
        f'[download]\n'
        f'url = "{f["url"]}"\n'
        f'hash-format = "sha512"\n'
        f'hash = "{h}"\n\n'
        f'[update]\n'
        f'[update.modrinth]\n'
        f'mod-id = "{proj["id"]}"\n'
        f'version-id = "{top["id"]}"\n'
    )
    (MODS / f"{slug}.pw.toml").write_text(meta)
    results.append((slug, proj["title"], top["version_number"], f["filename"], len(data)))
    print(f"OK   {slug:15} {top['version_number']:25} {f['filename']} ({len(data)//1024} KB)")

# --- index.toml: insert [[files]] entries in sorted path order ---
idx_path = PACK / "index.toml"
idx_text = idx_path.read_text()
lines = idx_text.splitlines()
for slug, *_ in results:
    entry_path = f"mods/{slug}.pw.toml"
    meta_hash = hashlib.sha256((MODS / f"{slug}.pw.toml").read_bytes()).hexdigest()
    if f"file = \"{entry_path}\"" in idx_text:
        print(f"SKIP index: {entry_path} already listed"); continue
    block = ["", f"[[files]]", f"file = \"{entry_path}\"", f"hash = \"{meta_hash}\"", "metafile = true"]
    # find sorted insertion point: before the [[files]] HEADER of the first entry with a larger path
    insert_at = len(lines)
    for i, ln in enumerate(lines):
        if ln.startswith("file = \""):
            existing = ln.split('"')[1]
            if existing > entry_path:
                insert_at = i
                # walk back to include the preceding [[files]] header line
                while insert_at > 0 and lines[insert_at - 1].strip() != "[[files]]":
                    insert_at -= 1
                insert_at -= 1
                break
    # back up over a preceding blank line separation
    lines[insert_at:insert_at] = block
    print(f"INDEX + {entry_path} sha256={meta_hash[:16]}...")

idx_path.write_text("\n".join(lines) + "\n")
print("\nindex.toml updated; entries now:", idx_text.count("[[files]]") + len(results))
