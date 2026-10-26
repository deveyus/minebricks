#!/usr/bin/env python3
"""Pass 5: PM casting costs (ingot/nugget/block mB) + foundry fuel + sgear dirs."""
import json, os, zipfile
from collections import Counter

JARS = "/home/z/my-project/scratch/jars"

z = zipfile.ZipFile(os.path.join(JARS, "productivemetalworks-1.21.1-1.15.1.jar"))

# any casting recipe whose result is an iron/copper ingot or nugget
print("===== PM casting recipes producing iron/copper ingots or nuggets =====")
for n in sorted(z.namelist()):
    if n.endswith(".json") and "/casting/" in n:
        try:
            d = json.loads(z.read(n))
        except Exception:
            continue
        res = d.get("result")
        if isinstance(res, dict) and any(m in str(res.get("id", "")) for m in ("iron_ingot", "iron_nugget", "copper_ingot", "copper_nugget", "iron_block", "copper_block")):
            print(f"--- {n}\n{json.dumps(d)[:400]}")

# foundry fuel mechanic
print("\n===== PM foundry fuel / temperature refs =====")
for n in sorted(z.namelist()):
    if n.endswith(".json") and "/recipe" in n and ("fuel" in n.lower() or "heat" in n.lower()):
        print(f"--- {n}\n{json.dumps(json.loads(z.read(n)))[:300]}")

# foundry controller crafting cost
print("\n===== PM foundry controller recipe =====")
for n in sorted(z.namelist()):
    if n.endswith(".json") and n.endswith("foundry_controller.json"):
        print(f"--- {n}\n{json.dumps(json.loads(z.read(n)))[:500]}")

# sgearmetalworks + silentgems dirs
for jar in ("sgearmetalworks-1.21.1-1.5.0.jar", "silentgems-1.21.1-neoforge-5.1.3.jar", "silent-gear-1.21.1-neoforge-4.2.1.1.jar"):
    zz = zipfile.ZipFile(os.path.join(JARS, jar))
    c = Counter()
    for n in zz.namelist():
        if n.endswith(".json") and ("/recipe/" in n or "/recipes/" in n):
            parts = n.split("/")
            i = next(k for k, p in enumerate(parts) if p in ("recipe", "recipes"))
            c[(parts[1], "/".join(parts[i+1:-1]))] += 1
    print(f"\n===== {jar} =====")
    for (ns, sub), cnt in sorted(c.items()):
        if sub:
            print(f"  {ns}/{sub}: {cnt}")

# sgearmetalworks melting samples
zz = zipfile.ZipFile(os.path.join(JARS, "sgearmetalworks-1.21.1-1.5.0.jar"))
print("\n===== sgearmetalworks melting samples =====")
for n in sorted(zz.namelist()):
    if n.endswith(".json") and "/melting/" in n:
        print(f"--- {n.split('/')[-1]}\n{json.dumps(json.loads(zz.read(n)))[:300]}")
        break
for n in sorted(zz.namelist()):
    if n.endswith(".json") and "/alloying/" in n:
        print(f"--- {n.split('/')[-1]}\n{json.dumps(json.loads(zz.read(n)))[:300]}")
        break
