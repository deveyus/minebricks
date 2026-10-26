#!/usr/bin/env python3
"""Measure vanilla ore texture palettes to assess remap feasibility.
Question: are ore specks multi-shade (exact-match remap insufficient)?"""
import zipfile, io, json
from collections import Counter
from PIL import Image

JAR = "/home/z/my-project/scratch/jars-extra/vanilla-1.21.1-client.jar"
P = "assets/minecraft/textures/block/"

ORES_STONE = ["iron_ore", "copper_ore", "gold_ore", "redstone_ore",
              "coal_ore", "lapis_ore", "diamond_ore", "emerald_ore"]
ORES_DEEPSLATE = ["deepslate_iron_ore", "deepslate_diamond_ore"]

zf = zipfile.ZipFile(JAR)

def load(name):
    return Image.open(io.BytesIO(zf.read(P + name + ".png"))).convert("RGBA")

stone = load("stone")
deepslate = load("deepslate")

def stats(img, host):
    """Split colors into host-rock shades (shared with host texture) vs speck shades."""
    px = list(img.getdata())
    host_colors = set(host.getdata())
    cc = Counter(px)
    base = {c: n for c, n in cc.items() if c in host_colors}
    speck = {c: n for c, n in cc.items() if c not in host_colors}
    return cc, base, speck

def hexy(c):
    return "#{:02X}{:02X}{:02X}{}".format(c[0], c[1], c[2],
                                          "" if c[3] == 255 else f"/a{c[3]}")

def lum(c):
    return round(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])

report = {}
for name in ORES_STONE + ORES_DEEPSLATE:
    host = deepslate if name.startswith("deepslate") else stone
    img = load(name)
    cc, base, speck = stats(img, host)
    total = img.width * img.height
    speck_px = sum(speck.values())
    # speck shades sorted by luminance, with pixel counts
    ramp = sorted(((lum(c), hexy(c), n) for c, n in speck.items()))
    # how many shades carry >=5% of speck pixels vs long tail of 1-2px shades
    big = [(l, h, n) for l, h, n in ramp if n >= speck_px * 0.05]
    tiny = [(l, h, n) for l, h, n in ramp if n < speck_px * 0.05]
    report[name] = dict(
        total_px=total, distinct_colors=len(cc),
        base_shades=len(base), base_px=sum(base.values()),
        speck_shades=len(speck), speck_px=speck_px,
        speck_pct=round(100 * speck_px / total, 1),
        speck_lum_range=[ramp[0][0], ramp[-1][0]] if ramp else None,
        main_shades=big, tiny_shades=len(tiny),
        ramp=[(l, h, n) for l, h, n in ramp],
    )
    print(f"\n=== {name} ({img.width}x{img.height}) ===")
    print(f"distinct colors: {len(cc)} | host-rock shades: {len(base)} ({sum(base.values())} px) | speck shades: {len(speck)} ({speck_px} px = {report[name]['speck_pct']}%)")
    print(f"speck luminance range: {ramp[0][0]}..{ramp[-1][0]}" if ramp else "no speck")
    print("full speck ramp (lum, hex, px):")
    for l, h, n in ramp:
        print(f"  {l:>3} {h} {n:>4}px")
    print(f"shades >=5% of speck: {len(big)} | tail shades <5%: {len(tiny)}")

# cross-ore base sharing: do stone-based ores share the exact same host pixels?
irons = set(load("iron_ore").getdata())
golds = set(load("gold_ore").getdata())
shared = len(irons & golds)
print(f"\niron_ore vs gold_ore shared distinct colors: {shared} of {len(irons)}/{len(golds)}")

with open("/home/z/my-project/scratch/ore_palettes.json", "w") as f:
    json.dump(report, f, indent=1)
print("saved scratch/ore_palettes.json")
