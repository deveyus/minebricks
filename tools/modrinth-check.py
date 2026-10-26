#!/usr/bin/env python3
"""Minebricks oregen survey: live Modrinth availability check (MC 1.21.1 / NeoForge)."""
import json, urllib.parse, urllib.request

UA = {"User-Agent": "minebricks-oregen-survey/1.0 (pack composition research)"}
SLUGS = ["paxi", "open-loader", "global-packs", "terralith", "tectonic", "kubejs", "jsonthings"]

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

for slug in SLUGS:
    try:
        proj = get(f"https://api.modrinth.com/v2/project/{slug}")
        q = urllib.parse.urlencode({"game_versions": json.dumps(["1.21.1"])})
        vs = get(f"https://api.modrinth.com/v2/project/{slug}/version?{q}")
        vs.sort(key=lambda v: v.get("date_published", ""), reverse=True)
        neo = [v for v in vs if "neoforge" in v.get("loaders", [])]
        line = f"{slug:12s} | {proj['title'][:30]:30s} | 1.21.1 builds: {len(vs):3d} | neoforge: "
        if neo:
            v = neo[0]
            line += f"YES {v['version_number']} ({v['date_published'][:10]})"
        elif vs:
            line += f"NO  | newest-any-loader: {vs[0]['version_number']} loaders={vs[0]['loaders']}"
        else:
            line += "NO  | no 1.21.1 builds at all"
        print(line)
    except Exception as e:
        print(f"{slug:12s} | ERROR: {e}")
