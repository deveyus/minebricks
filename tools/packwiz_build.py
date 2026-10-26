#!/usr/bin/env python3
"""Resolve mods + required deps from Modrinth and emit a packwiz manifest.

Outputs:
  scratch/packwiz-build/friend-pack/{pack.toml,index.toml,mods/*.pw.toml}
  scratch/packwiz-build/report.json   (resolution report -> used for PACK_NOTES)
"""
import json, hashlib, os, re, urllib.request, urllib.parse, urllib.error

API = "https://api.modrinth.com/v2"
UA = {"User-Agent": "aide-pack-builder/1.0 (composition assistant for a friend-group pack)"}
BASE = "/home/z/my-project/scratch/packwiz-build"
PACK = os.path.join(BASE, "friend-pack")
MC = "1.21.1"
LOADER = "neoforge"

ROOTS = [
    # core (v0.2 roster, unchanged)
    "sophisticated-backpacks",
    "emi",
    "appleskin",
    "kubejs",
    "multiblocked2",
    "no-chat-reports",
    # her round-3 adds
    "probejs",                 # "huge, so yes please"
    "railcraft-reborn",        # modern Railcraft
    "little-logistics",        # updated: 1.21.1.1-beta.2
    "immersive-aircraft",
    # her round-4 adds
    "rechiseled",              # lane picked: Rechiseled over Chipped (atlas size)
    "toms-storage",            # "likely coming in" — placed, trivially removable
    "advanced-rocketry-3",      # v3.0.beta, recipes/loot via KubeJS after mod selection
    "via-romana",              # "Pax Romana" = fast-travel mod, now Via Romana — confirmed by her
    "framedblocks",            # "for sure"
    # my building picks (general use, light deps)
    "handcrafted",
    "macaws-doors",
    "macaws-windows",
    "macaws-bridges",
    "macaws-roofs",
    "macaws-fences-and-walls",
    # performance baseline (she: "biasing for performance heavily")
    "embeddium",
    "ferrite-core",
    "modernfix",
    "immediatelyfast",
    "entityculling",
    "moreculling",
    "clumps",
    "faun",                    # client privacy, approved-with-questions
]
CANDIDATES = [
    ("Chipped (atlas-heavy breadth king — parked)", "chipped"),
    ("NiftyBlocks", "niftyblocks"),
    ("Othertime", "othertime"),
    ("Sophisticated Storage (overlaps Tom's — probably redundant)", "sophisticated-storage"),
    ("JEI", "jei"),
]

# gigaherz ToolBelt — her CurseForge link, not on Modrinth.
CF_TOOLBELT = {
    "title": "ToolBelt",
    "version": "1.21.1-2.2.10",
    "published": "2026-06-24",
    "filename": "ToolBelt-1.21.1-2.2.10.jar",
    "file_id": 8309722,
    "project_id": 260262,
}

# side metadata for packwiz metafiles (everything else = both)
SIDES = {
    "embeddium": "client",
    "immediatelyfast": "client",
    "entityculling": "client",
    "moreculling": "client",
    "probejs": "client",
    "faun": "client",
}

os.makedirs(os.path.join(PACK, "mods"), exist_ok=True)


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def get_proj(ref):
    try:
        return get(f"{API}/project/{ref}")
    except (urllib.error.HTTPError, urllib.error.URLError):
        return None


def search(q):
    try:
        url = f"{API}/search?query={urllib.parse.quote(q)}&limit=5"
        return [{"slug": h["slug"], "title": h["title"], "id": h["project_id"]}
                for h in get(url).get("hits", [])]
    except Exception:
        return []


def latest_version(pid):
    """Latest build for MC. Returns (version|None, err|None, available_loaders)."""
    url = (f"{API}/project/{pid}/version?"
           + urllib.parse.urlencode({"game_versions": json.dumps([MC])}))
    try:
        vs = get(url)
    except Exception as e:
        return None, f"fetch-error: {e}", None
    vs = [v for v in vs if MC in v.get("game_versions", [])]
    if not vs:
        return None, f"no-{MC}-build", None
    vs.sort(key=lambda v: v.get("date_published", ""), reverse=True)
    exact = [v for v in vs if LOADER in v.get("loaders", [])]
    if exact:
        return exact[0], None, None
    return None, f"no-{LOADER}-build", vs[0].get("loaders", [])


resolved = {}   # pid -> record
dep_noise = []  # (slug, reason) — required-dep metadata that can't ride on neoforge
missing = []    # (ref, reason)
queue = list(ROOTS)
seen_refs = set()

while queue:
    ref = queue.pop(0)
    if ref in seen_refs:
        continue
    seen_refs.add(ref)
    proj = get_proj(ref)
    if proj is None:
        missing.append((ref, "not-on-modrinth"))
        continue
    pid = proj["id"]
    if pid in resolved:
        continue
    v, err, alt_loaders = latest_version(pid)
    if v is None:
        if (err == f"no-{LOADER}-build" and alt_loaders
                and all(l in ("fabric", "quilt") for l in alt_loaders)):
            dep_noise.append((proj["slug"], "fabric-only dep marked required on a neoforge build"))
        else:
            missing.append((proj["slug"], err, alt_loaders))
        continue
    files = [f for f in v["files"] if f.get("primary")] or v["files"]
    f = files[0]
    resolved[pid] = {
        "slug": proj["slug"],
        "title": proj["title"],
        "version": v["version_number"],
        "published": v.get("date_published", "")[:10],
        "filename": f["filename"],
        "url": f["url"],
        "sha512": f["hashes"]["sha512"],
        "mod_id": pid,
        "version_id": v["id"],
        "required_deps": [],
    }
    for dep in v.get("dependencies", []):
        if dep.get("dependency_type") == "required" and dep.get("project_id"):
            resolved[pid]["required_deps"].append(dep["project_id"])
            queue.append(dep["project_id"])

# ---- write .pw.toml metafiles
PW = '''name = "{title}"
filename = "{filename}"
side = "{side}"

[download]
url = "{url}"
hash-format = "sha512"
hash = "{sha512}"

[update]
[update.modrinth]
mod-id = "{mod_id}"
version-id = "{version_id}"
'''
for pid, rec in resolved.items():
    rec["side"] = SIDES.get(rec["slug"], "both")
    with open(os.path.join(PACK, "mods", rec["slug"] + ".pw.toml"), "w") as fh:
        fh.write(PW.format(**rec))

# ---- CurseForge-sourced entry: gigaherz ToolBelt (her link)
def fetch_toolbelt():
    fn = CF_TOOLBELT["filename"]
    urls = (
        "https://edge.forgecdn.net/files/8309/722/" + fn,
        "https://www.curseforge.com/api/v1/mods/260262/files/8309722/download",
    )
    last_err = None
    for u in urls:
        try:
            req = urllib.request.Request(u, headers=UA)
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            if len(data) < 10000:
                last_err = "suspiciously small (%d bytes)" % len(data)
                continue
            return data, u
        except Exception as e:
            last_err = str(e)[:80]
    raise SystemExit("toolbelt download failed: " + str(last_err))

tb_data, tb_url = fetch_toolbelt()
cf_rec = dict(CF_TOOLBELT)
cf_rec["url"] = tb_url
cf_rec["sha512"] = hashlib.sha512(tb_data).hexdigest()
cf_rec["size"] = len(tb_data)
with open(os.path.join(PACK, "mods", "toolbelt.pw.toml"), "w") as fh:
    fh.write(
        f'''name = "{cf_rec['title']}"
filename = "{cf_rec['filename']}"
side = "both"

[download]
url = "{cf_rec['url']}"
hash-format = "sha512"
hash = "{cf_rec['sha512']}"

[update]
[update.curseforge]
file-id = {cf_rec['file_id']}
project-id = {cf_rec['project_id']}
''')

# ---- index.toml
entries = []
for name in sorted(os.listdir(os.path.join(PACK, "mods"))):
    with open(os.path.join(PACK, "mods", name), "rb") as fh:
        h = hashlib.sha256(fh.read()).hexdigest()
    entries.append(f'[[files]]\nfile = "mods/{name}"\nhash = "{h}"\nmetafile = true\n')
index_body = 'hash-format = "sha256"\n\n' + "\n".join(entries)
with open(os.path.join(PACK, "index.toml"), "w") as fh:
    fh.write(index_body)
index_hash = hashlib.sha256(index_body.encode()).hexdigest()


# ---- NeoForge pin
def neoforge_pin():
    for url in ("https://neoforged.net/api/maven/promotions/",
                "https://neoforged.net/api/maven/versions/releases/net/neoforged/neoforge"):
        try:
            d = get(url)
        except Exception:
            continue
        if isinstance(d, dict):
            promos = d.get("promos") or {}
            pin = promos.get(f"{MC}-recommended") or promos.get(f"{MC}-latest")
            if pin:
                return pin, "promotions"
            vers = [v for v in d.get("versions", []) if v.startswith("21.1.")]
            if vers:
                return max(vers, key=lambda s: int(s.split(".")[2])), "versions"
    try:
        req = urllib.request.Request(
            "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml",
            headers=UA)
        xml = urllib.request.urlopen(req, timeout=30).read().decode()
        vs = re.findall(r"<version>(21\.1\.\d+)</version>", xml)
        if vs:
            return max(vs, key=lambda s: int(s.split(".")[2])), "maven-metadata"
    except Exception:
        pass
    return None, "unavailable"


pin, pin_src = neoforge_pin()
if not pin:
    pin, pin_src = "21.1.209", "fallback-known-good"

pack_body = f'''name = "Friend Pack (working title)"
author = "Fina"
version = "0.4.0"
pack-format = "packwiz:1.1.0"

[index]
file = "index.toml"
hash-format = "sha256"
hash = "{index_hash}"

[versions]
minecraft = "{MC}"
neoforge = "{pin}"
'''
with open(os.path.join(PACK, "pack.toml"), "w") as fh:
    fh.write(pack_body)

# ---- candidates availability check
cand_report = []
for label, slug in CANDIDATES:
    proj = get_proj(slug)
    if proj is None:
        cand_report.append({"label": label, "where": "curseforge-only",
                            "search_hits": search(label.replace(":", ""))[:3]})
        continue
    v, err, alt = latest_version(proj["id"])
    cand_report.append({
        "label": label, "where": "modrinth", "slug": proj["slug"],
        "version": v["version_number"] if v else None,
        "published": v.get("date_published", "")[:10] if v else None,
        "err": err, "alt_loaders": alt,
    })

report = {
    "mc": MC, "loader": LOADER,
    "neoforge_pin": pin, "pin_source": pin_src,
    "resolved": list(resolved.values()),
    "curseforge": cf_rec,
    "dep_noise": [list(m) for m in dep_noise],
    "missing": [list(m) for m in missing],
    "candidates": cand_report,
}

# ---- roster assertions
have = set(os.listdir(os.path.join(PACK, "mods")))
for req in ("appleskin.pw.toml", "probejs.pw.toml", "railcraft-reborn.pw.toml",
            "via-romana.pw.toml", "toolbelt.pw.toml", "framedblocks.pw.toml",
            "faun.pw.toml", "embeddium.pw.toml", "modernfix.pw.toml",
            "little-logistics.pw.toml", "immersive-aircraft.pw.toml",
            "rechiseled.pw.toml", "toms-storage.pw.toml",
            "advanced-rocketry-3.pw.toml"):
    assert req in have, "MISSING FROM BUILD: " + req
assert "traveler-tool-belt.pw.toml" not in have, "traveler-tool-belt must be gone"
assert "chipped.pw.toml" not in have and "athena-ctm.pw.toml" not in have, "chipped lane must be out"
assert "create.pw.toml" not in have and "create-deco.pw.toml" not in have
print("TOOLBELT sha512 ok, jar bytes:", cf_rec["size"])
print("ENTRY COUNT:", len(have))
with open(os.path.join(BASE, "report.json"), "w") as fh:
    json.dump(report, fh, indent=2)
print(json.dumps(report, indent=2))
