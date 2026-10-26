#!/usr/bin/env python3
"""Download all pinned mod jars from Minebricks packwiz metafiles into scratch/jars/."""
import re, os, sys, hashlib, urllib.request, concurrent.futures as cf

MODS_DIR = "/home/z/my-project/scratch/packwiz-build/friend-pack/mods"
OUT_DIR = "/home/z/my-project/scratch/jars"
os.makedirs(OUT_DIR, exist_ok=True)

# parse every .pw.toml
entries = []
for fn in sorted(os.listdir(MODS_DIR)):
    if not fn.endswith(".pw.toml"):
        continue
    text = open(os.path.join(MODS_DIR, fn), encoding="utf-8").read()
    name = re.search(r'^name\s*=\s*"(.*)"', text, re.M)
    fname = re.search(r'^filename\s*=\s*"(.*)"', text, re.M)
    url = re.search(r'^url\s*=\s*"(.*)"', text, re.M)
    hfmt = re.search(r'^hash-format\s*=\s*"(.*)"', text, re.M)
    hsh = re.search(r'^hash\s*=\s*"(.*)"', text, re.M)
    entries.append({
        "meta": fn, "name": name.group(1) if name else fn,
        "filename": fname.group(1) if fname else None,
        "url": url.group(1) if url else None,
        "hash_format": hfmt.group(1) if hfmt else None,
        "hash": hsh.group(1) if hsh else None,
    })

print(f"parsed {len(entries)} mod metafiles")

def fetch(e):
    if not e["url"] or not e["filename"]:
        return f"SKIP  {e['name']} (no url/filename)"
    dest = os.path.join(OUT_DIR, e["filename"])
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        ok = "cached"
    else:
        try:
            req = urllib.request.Request(e["url"], headers={"User-Agent": "minebricks-scan/0.1"})
            with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
                f.write(r.read())
            ok = "downloaded"
        except Exception as ex:
            return f"FAIL  {e['name']}: {ex}"
    # verify hash
    v = ""
    if e["hash_format"] in ("sha512", "sha256", "sha1", "md5"):
        h = hashlib.new(e["hash_format"])
        with open(dest, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
        v = "OK" if h.hexdigest() == e["hash"] else "HASH-MISMATCH"
    return f"{ok:10s} {v:14s} {e['filename']}"

with cf.ThreadPoolExecutor(max_workers=8) as ex:
    for line in ex.map(fetch, entries):
        print(line)

total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
print(f"\n{len(os.listdir(OUT_DIR))} jars, {total/1e6:.1f} MB total")
