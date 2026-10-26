#!/usr/bin/env python3
"""Worked-example evidence pass: ore-processing recipe census in the processing jars.
Provenance rule: every number comes from the jars on disk. Zero guessed yields."""
import json, os, zipfile

JARS = "/home/z/my-project/scratch/jars"
TARGETS = {
    "railcraft-reborn-1.21.1-1.2.14.jar": ["crusher", "blast_furnace", "coke_oven", "rock_crusher"],
    "productivemetalworks-1.21.1-1.15.1.jar": ["melt", "foundry", "casting", "entity melting"],
    "sgearmetalworks-1.21.1-1.5.0.jar": ["melt", "foundry"],
    "silentgems-1.21.1-neoforge-5.1.3.jar": ["crush", "grind", "ore"],
    "silent-gear-1.21.1-neoforge-4.2.1.1.jar": ["grind", "crush", "salvage"],
}
FOCUS = ("iron", "copper")

def recipe_paths(z, keys):
    out = []
    for n in z.namelist():
        ln = n.lower()
        if "/recipes/" in ln and any(k.replace(" ", "_") in ln or k.replace(" ", "") in ln for k in keys):
            out.append(n)
    return out

def describe(z, path):
    try:
        d = json.loads(z.read(path))
    except Exception as e:
        return f"  {os.path.basename(path)}: PARSE FAIL {e}"
    t = d.get("type", "?")
    ins, outs = [], []
    for key in ("input", "ingredient", "ingredients"):
        v = d.get(key)
        if v is None: continue
        items = v if isinstance(v, list) else [v]
        for it in items:
            if isinstance(it, dict):
                ins.append(it.get("item") or it.get("tag") or str(it.get("fluid")) or "?")
    for key in ("result", "output", "results", "outputs"):
        v = d.get(key)
        if v is None: continue
        items = v if isinstance(v, list) else [v]
        for it in items:
            if isinstance(it, dict):
                ins2 = it.get("item") or it.get("tag") or str(it.get("fluid")) or "?"
                cnt = it.get("count") or it.get("amount") or ""
                outs.append(f"{ins2} x{cnt}" if cnt != "" else str(ins2))
            elif isinstance(it, (str, int, float)):
                outs.append(str(it))
    prob = d.get("probability") or d.get("chance")
    line = f"  [{os.path.basename(path)}] {t}: {ins or '?'} -> {outs or '?'}"
    if prob: line += f" (p={prob})"
    return line

for jar, keys in TARGETS.items():
    full = os.path.join(JARS, jar)
    if not os.path.exists(full):
        print(f"## {jar}: MISSING"); continue
    z = zipfile.ZipFile(full)
    paths = recipe_paths(z, keys)
    print(f"## {jar} — {len(paths)} candidate recipe files")
    hits = [p for p in paths if any(f in p.lower() for f in FOCUS)] or paths
    for p in sorted(hits)[:28]:
        print(describe(z, p))
    print()
