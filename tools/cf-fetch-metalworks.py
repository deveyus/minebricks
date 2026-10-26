#!/usr/bin/env python3
"""Fetch + verify the three CurseForge metalworks mods for Minebricks (1.21.1 / NeoForge).
Iron rule: download from CF CDN, sha512 them, and dump mods.toml (modId, deps, ranges)
BEFORE any packwiz metafile is written. No blind adds."""
import hashlib, pathlib, sys, urllib.request, zipfile

JAR_CACHE = pathlib.Path("/home/z/my-project/scratch/jars-extra")
UA = {"User-Agent": "Minebricks-packwiz-manual/0.5 (discord bot)"}

# slug -> (curseforge project id, file id, filename)
FILES = {
    "productive-metalworks":  (1184570, 8558526, "productivemetalworks-1.21.1-1.15.1.jar"),
    "silent-gear-metalworks": (1218821, 7897500, "sgearmetalworks-1.21.1-1.5.0.jar"),
    "kubejs-metalworks":      (None,    8329295, "productive-metalworks-kubejs-addon-1.0.0.jar"),
}

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read()

def cfcdn(file_id, name):
    sid = str(file_id)
    return f"https://mediafilez.forgecdn.net/files/{sid[:4]}/{sid[4:]}/{name}"

for slug, (proj, fid, name) in FILES.items():
    out = JAR_CACHE / name
    if out.exists() and out.stat().st_size > 0:
        data = out.read_bytes()
        print(f"CACHED {name} ({len(data)//1024} KB)")
    else:
        url = cfcdn(fid, name)
        try:
            data = fetch(url)
        except Exception as e:
            print(f"FAIL {slug}: {url} -> {e}")
            sys.exit(1)
        out.write_bytes(data)
        print(f"OK     {slug:24} {name} ({len(data)//1024} KB) sha512={hashlib.sha512(data).hexdigest()[:16]}...")

    # --- inspect jar metadata ---
    z = zipfile.ZipFile(out)
    toml_names = [n for n in z.namelist() if n.endswith("mods.toml") or n.endswith(".mods.toml")]
    print(f"       metafiles: {toml_names}")
    for t in toml_names:
        txt = z.read(t).decode("utf-8", "replace")
        keep = [ln for ln in txt.splitlines()
                if any(k in ln.lower() for k in ("modid", "displayname", "mandatory", "versionrange", "ordering", "side", "loaderversion", "neoforge", "minecraft"))]
        print(f"       --- {t} ---")
        for ln in keep[:40]:
            s = ln.strip()
            if s and not s.startswith("#"):
                print("       " + s)
