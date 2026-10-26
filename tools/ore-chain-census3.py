#!/usr/bin/env python3
"""Pass 3: full JSON of the exact ore-chain recipes (iron/copper) in railcraft + PM."""
import json, os, zipfile

JARS = "/home/z/my-project/scratch/jars"

def show(jar, want, limit=40, keys=("input", "ingredient", "result", "output", "results", "outputs", "id", "count", "amount", "probability", "chance", "type", "fluid", "item", "tag")):
    z = zipfile.ZipFile(os.path.join(JARS, jar))
    hits = [n for n in z.namelist() if n.endswith(".json") and "/recipe" in n and any(w in n.lower() for w in want)]
    print(f"===== {jar}: {len(hits)} files matching {want}")
    for n in sorted(hits)[:limit]:
        d = json.loads(z.read(n))
        slim = {k: d[k] for k in d if k in keys}
        print(f"--- {n.split('/')[-1]}")
        print(json.dumps(slim, indent=None)[:420])
    print()

show("railcraft-reborn-1.21.1-1.2.14.jar", ["crusher/"], 90)
show("productivemetalworks-1.21.1-1.15.1.jar", ["melting/ores/"], 40)
show("productivemetalworks-1.21.1-1.15.1.jar", ["casting/ingots/iron", "casting/ingots/copper", "casting/nuggets/iron"], 12)
show("railcraft-reborn-1.21.1-1.2.14.jar", ["blast_furnace/steel", "blast_furnace/iron"], 14)
