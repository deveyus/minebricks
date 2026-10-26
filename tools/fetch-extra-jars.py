#!/usr/bin/env python3
"""Fetch vanilla 1.21.1 client jar + latest Terralith/Tectonic for 1.21.1 NeoForge."""
import json, os, urllib.request

OUT = "/home/z/my-project/scratch/jars-extra"
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "minebricks-scan/0.1"}

def get(url, dest=None):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r:
        data = r.read()
    if dest:
        with open(dest, "wb") as f:
            f.write(data)
    return data

# --- vanilla client jar ---
man = json.loads(get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"))
v = next(x for x in man["versions"] if x["id"] == "1.21.1")
vmeta = json.loads(get(v["url"]))
curl = vmeta["downloads"]["client"]["url"]
print("vanilla 1.21.1 client:", curl)
get(curl, os.path.join(OUT, "vanilla-1.21.1-client.jar"))
print("vanilla jar saved,", os.path.getsize(os.path.join(OUT, "vanilla-1.21.1-client.jar")) // 1_000_000, "MB")

# --- terralith / tectonic via Modrinth API ---
for slug in ("terralith", "tectonic"):
    q = urllib.request.quote(f'game_versions=["1.21.1"]&loaders=["neoforge"]')
    url = f"https://api.modrinth.com/v2/project/{slug}/version?{q}"
    vs = json.loads(get(url))
    if not vs:
        print(f"{slug}: NO 1.21.1 neoforge build")
        continue
    latest = vs[0]
    f = latest["files"][0]
    print(f"{slug}: {latest['version_number']}  ({latest['date_published'][:10]})  deps={[d['project_id'] for d in latest['dependencies']]}")
    get(f["url"], os.path.join(OUT, f["filename"]))
    print("   saved", f["filename"], os.path.getsize(os.path.join(OUT, f["filename"])) // 1_000_000, "MB")
    # stash metadata for the report
    with open(os.path.join(OUT, f"{slug}.meta.json"), "w") as fh:
        json.dump({"slug": slug, "version": latest["version_number"], "date": latest["date_published"],
                   "modrinth_id": latest["project_id"], "version_id": latest["id"],
                   "url": f["url"], "filename": f["filename"],
                   "dependencies": latest["dependencies"],
                   "game_versions": latest["game_versions"], "loaders": latest["loaders"]}, fh, indent=1)
print("done")
