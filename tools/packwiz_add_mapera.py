#!/usr/bin/env python3
"""v0.4.1 'map era' adds: Antique Atlas, Xaero's Minimap, Xaero's World Map,
Open Parties and Claims + Xaero's Map Server Utils datapack (constellation gate).
Same iron rules as packwiz_add_verified.py: top-version fetch, download + sha512
verify, manual pw.toml, sorted index.toml insert; then pack.toml bump + index hash.
Also dumps the Server Utils mcfunction files so the gate design uses REAL names."""
import json, hashlib, pathlib, zipfile, io, re, sys, urllib.request, urllib.parse

PACK = pathlib.Path("/home/z/my-project/scratch/packwiz-build/friend-pack")
MODS = PACK / "mods"
DP_DIR = PACK / "config" / "paxi" / "datapacks"
JAR_CACHE = pathlib.Path("/home/z/my-project/scratch/jars-extra")
UA = {"User-Agent": "Minebricks-packwiz-manual/0.6 (discord bot)"}
API = "https://api.modrinth.com/v2"

PINS = {
    "antique-atlas": "8.0.1",       # verified via CurseForge search (file 6849155)
    "xaeros-minimap": None,          # new adds: accept top 1.21.1+neoforge
    "xaeros-world-map": None,
    "open-parties-and-claims": None,
}
CF_FALLBACK = {  # Hunternif lineage AA if the Modrinth slug is wrong/AA4
    "antique-atlas": dict(title="Antique Atlas", filename="Antique Atlas-1.21.1-8.0.1-NeoForge.jar",
                          project_id=227795, file_id=6849155)}
DP_PID = "YJgkgKMm"  # Xaero's Map Server Utils
QV = urllib.parse.quote('["1.21.1"]')
QL = urllib.parse.quote('["neoforge"]')

def api(path):
    req = urllib.request.Request(API + path, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=30))

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read()

results = []

def add_modrinth_mod(slug, pin):
    proj = api(f"/project/{slug}")
    t = proj["title"].lower()
    if slug == "antique-atlas" and (not t.startswith("antique atlas") or "4" in t):
        raise ValueError(f"Modrinth title mismatch: {proj['title']!r}")
    vs = api(f"/project/{slug}/version?game_versions={QV}&loaders={QL}")
    if not vs:
        raise ValueError(f"no 1.21.1+neoforge version on Modrinth")
    vs.sort(key=lambda v: v.get("date_published", ""), reverse=True)
    top = vs[0]
    if pin and top["version_number"] != pin:
        print(f"FAIL {slug}: top {top['version_number']} != pin {pin} — refusing blind add"); sys.exit(1)
    f = top["files"][0]
    data = fetch(f["url"])
    h = hashlib.sha512(data).hexdigest()
    if h != f["hashes"]["sha512"]:
        print(f"FAIL {slug}: downloaded sha512 mismatch"); sys.exit(1)
    (JAR_CACHE / f["filename"]).write_bytes(data)
    meta = (f'name = "{proj["title"]}"\nfilename = "{f["filename"]}"\nside = "both"\n\n'
            f'[download]\nurl = "{f["url"]}"\nhash-format = "sha512"\nhash = "{h}"\n\n'
            f'[update]\n[update.modrinth]\nmod-id = "{proj["id"]}"\nversion-id = "{top["id"]}"\n')
    (MODS / f"{slug}.pw.toml").write_text(meta)
    results.append((f"mods/{slug}.pw.toml",
                    f"{proj['title']} {top['version_number']} ({f['filename']}, {len(data)//1024} KB)"))

def add_cf_mod(slug):
    cf = CF_FALLBACK[slug]
    fid = cf["file_id"]
    url = (f"https://edge.forgecdn.net/files/{fid // 1000}/{fid % 1000:03d}/"
           + urllib.parse.quote(cf["filename"]))
    data = fetch(url)
    if len(data) < 10000:
        print(f"FAIL {slug}: suspiciously small download ({len(data)} B)"); sys.exit(1)
    h = hashlib.sha512(data).hexdigest()
    (JAR_CACHE / cf["filename"]).write_bytes(data)
    meta = (f'name = "{cf["title"]}"\nfilename = "{cf["filename"]}"\nside = "both"\n\n'
            f'[download]\nurl = "{url}"\nhash-format = "sha512"\nhash = "{h}"\n\n'
            f'[update]\n[update.curseforge]\nfile-id = {fid}\nproject-id = {cf["project_id"]}\n')
    (MODS / f"{slug}.pw.toml").write_text(meta)
    results.append((f"mods/{slug}.pw.toml",
                    f"{cf['title']} (curseforge file {fid}, {len(data)//1024} KB)"))

for slug, pin in PINS.items():
    try:
        add_modrinth_mod(slug, pin)
    except Exception as e:
        if slug in CF_FALLBACK:
            print(f"NOTE {slug}: modrinth path failed ({e}); using curseforge fallback")
            add_cf_mod(slug)
        else:
            raise

# --- datapack: Xaero's Map Server Utils ---
dp = api(f"/project/{DP_PID}")
vs = [v for v in api(f"/project/{DP_PID}/version") if "1.21.1" in v.get("game_versions", [])]
if not vs:
    print("FAIL datapack: no 1.21.1 build"); sys.exit(1)
vs.sort(key=lambda v: v.get("date_published", ""), reverse=True)
top = vs[0]
f = top["files"][0]
data = fetch(f["url"])
h = hashlib.sha512(data).hexdigest()
if h != f["hashes"]["sha512"]:
    print("FAIL datapack: sha512 mismatch"); sys.exit(1)
DP_DIR.mkdir(parents=True, exist_ok=True)
(DP_DIR / f["filename"]).write_bytes(data)
results.append((f"config/paxi/datapacks/{f['filename']}",
                f"{dp['title']} {top['version_number']} ({len(data)//1024} KB)"))

zf = zipfile.ZipFile(io.BytesIO(data))
funcs = sorted(n for n in zf.namelist() if n.endswith(".mcfunction"))
print(f"\nDATAPACK {f['filename']} — {len(funcs)} functions:")
for n in funcs:
    body = zf.read(n).decode(errors="replace").strip()
    print(f"--- {n} ---")
    print(body[:600])
    print()

# --- index.toml: sorted insert (proven logic from packwiz_add_verified.py) ---
idx_path = PACK / "index.toml"
lines = idx_path.read_text().splitlines()
for path, _ in results:
    full = PACK / path
    meta_hash = hashlib.sha256(full.read_bytes()).hexdigest()
    marker = f'file = "{path}"'
    if any(marker in ln for ln in lines):
        print(f"SKIP index: {path} already listed"); continue
    is_meta = path.endswith(".pw.toml")
    block = ["", "[[files]]", marker, f'hash = "{meta_hash}"']
    if is_meta:
        block.append("metafile = true")
    insert_at = len(lines)
    for i, ln in enumerate(lines):
        if ln.startswith('file = "'):
            existing = ln.split('"')[1]
            if existing > path:
                insert_at = i
                while insert_at > 0 and lines[insert_at - 1].strip() != "[[files]]":
                    insert_at -= 1
                insert_at -= 1
                break
    lines[insert_at:insert_at] = block
    print(f"INDEX + {path} sha256={meta_hash[:16]}...")

new_idx = "\n".join(lines) + "\n"
idx_path.write_text(new_idx)

# --- pack.toml: version bump + fresh index hash ---
idx_hash = hashlib.sha256(new_idx.encode()).hexdigest()
pt_path = PACK / "pack.toml"
pt = pt_path.read_text()
pt = re.sub(r'version = "[^"]*"', 'version = "0.4.1"', pt, count=1)
pt = re.sub(r'(\[index\]\nfile = "index\.toml"\nhash-format = "sha256"\nhash = ")[^"]*(")',
            lambda m: m.group(1) + idx_hash + m.group(2), pt)
pt_path.write_text(pt)
print(f"pack.toml -> v0.4.1, index hash {idx_hash[:16]}...")

print("\nDONE. Added this pass:")
for p, d in results:
    print(f"  {p:58} {d}")
mod_count = len(list(MODS.glob("*.pw.toml")))
print(f"\nmods/ metafile count now: {mod_count}")
