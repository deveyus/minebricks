#!/usr/bin/env python3
"""Pass 4: PM melting/casting amounts + RC blast-furnace gear smelting + sgear dir maps."""
import json, os, zipfile

JARS = "/home/z/my-project/scratch/jars"

def files(z, sub):
    return [n for n in z.namelist() if n.endswith(".json") and sub in n]

def slim(d):
    return json.dumps(d, indent=None)[:600]

# --- PM: melt iron/copper/gold ore + raw + dust -> fluid amounts
z = zipfile.ZipFile(os.path.join(JARS, "productivemetalworks-1.21.1-1.15.1.jar"))
print("===== PM melting/ores (iron/copper/gold) =====")
for n in sorted(files(z, "melting/ores/")):
    if any(m in n for m in ("iron", "copper", "gold")):
        print(f"--- {n.split('/')[-1]}\n{slim(json.loads(z.read(n)))}")
print("===== PM melting/raw_materials (iron/copper/gold) =====")
for n in sorted(files(z, "melting/raw_materials/")):
    if any(m in n for m in ("iron", "copper", "gold")):
        print(f"--- {n.split('/')[-1]}\n{slim(json.loads(z.read(n)))}")
print("===== PM melting/dusts (iron/copper) =====")
for n in sorted(files(z, "melting/dusts/")):
    if any(m in n for m in ("iron", "copper")):
        print(f"--- {n.split('/')[-1]}\n{slim(json.loads(z.read(n)))}")
print("===== PM casting ingots/nuggets (iron/copper) =====")
for n in sorted(files(z, "casting/")):
    if ("ingots/iron" in n or "ingots/copper" in n or "nuggets/iron" in n or "nuggets/copper" in n) and ("/alltheores/" in n or "/ftbmaterials/" in n or "/misc/" in n or n.count("/") <= 4):
        print(f"--- {n}\n{slim(json.loads(z.read(n)))}")

# --- RC blast furnace: what do iron gear/ore files produce (steel?)
z2 = zipfile.ZipFile(os.path.join(JARS, "railcraft-reborn-1.21.1-1.2.14.jar"))
print("\n===== RC blast_furnace: iron gear + ore entries =====")
for n in sorted(files(z2, "blast_furnace/")):
    b = n.split("/")[-1]
    if any(m in b for m in ("iron", "steel", "copper")):
        print(f"--- {b}\n{slim(json.loads(z2.read(n)))}")

# --- silentgems + silent-gear recipe dir maps
for jar in ("silentgems-1.21.1-neoforge-5.1.3.jar", "silent-gear-1.21.1-neoforge-4.2.1.1.jar", "sgearmetalworks-1.21.1-1.5.0.jar"):
    zz = zipfile.ZipFile(os.path.join(JARS, jar))
    from collections import Counter
    c = Counter()
    for n in zz.namelist():
        if n.endswith(".json") and ("/recipe/" in n or "/recipes/" in n):
            parts = n.split("/")
            i = next(k for k, p in enumerate(parts) if p in ("recipe", "recipes"))
            c[(parts[1], "/".join(parts[i+1:-1]))] += 1
    print(f"\n===== {jar} recipe dirs =====")
    for (ns, sub), cnt in sorted(c.items()):
        if sub:
            print(f"  {ns}/{sub}: {cnt}")
