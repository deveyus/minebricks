#!/usr/bin/env python3
"""Pass 2: recipe-dir structure per processing jar + full JSON samples of ore-relevant types."""
import json, os, zipfile
from collections import Counter

JARS = "/home/z/my-project/scratch/jars"
JARLIST = ["railcraft-reborn-1.21.1-1.2.14.jar",
           "productivemetalworks-1.21.1-1.15.1.jar",
           "sgearmetalworks-1.21.1-1.5.0.jar",
           "silentgems-1.21.1-neoforge-5.1.3.jar"]

def dirs_of(z):
    c = Counter()
    for n in z.namelist():
        if n.endswith(".json") and ("/recipe/" in n or "/recipes/" in n):
            parts = n.split("/")
            i = next(k for k, p in enumerate(parts) if p in ("recipe", "recipes"))
            sub = "/".join(parts[i+1:-1])
            c[(parts[1], sub)] += 1
    return c

for jar in JARLIST:
    z = zipfile.ZipFile(os.path.join(JARS, jar))
    print(f"===== {jar} =====")
    for (ns, sub), n in sorted(dirs_of(z).items()):
        if sub:  # skip root-level file count noise? keep all
            print(f"  {ns}/{sub}: {n}")
    print()

# now dump samples: railcraft crusher + PM melting for iron/copper
def dump_matching(jar, want_dirs, want_names, limit=14):
    z = zipfile.ZipFile(os.path.join(JARS, jar))
    hits = []
    for n in z.namelist():
        ln = n.lower()
        if n.endswith(".json") and "/recipe" in ln and any(w in ln for w in want_names):
            hits.append(n)
    print(f"----- {jar} sample dump ({len(hits)} hits) -----")
    for n in sorted(hits)[:limit]:
        try:
            d = json.loads(z.read(n))
            print(f"--- {n.split('/')[-1]} ({n})")
            print(json.dumps(d)[:500])
        except Exception as e:
            print(n, "ERR", e)
    print()

dump_matching("railcraft-reborn-1.21.1-1.2.14.jar", ["crusher"], ["crusher"], 10)
dump_matching("productivemetalworks-1.21.1-1.15.1.jar", ["melting"], ["melt"], 10)
