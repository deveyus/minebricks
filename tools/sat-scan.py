#!/usr/bin/env python3
"""sat-scan.py — attribution + launchable-satellite surface scan.

Q at hand (2026-10-25): can we make a launchable GPS Satellite and know
WHICH player launched it? Three surfaces to prove/disprove:

  1. KubeJS  : ItemEvents.rightClicked / PlayerEvents.loggedIn / EntityEvents.spawned
               + persistentData passthrough   (jar: kubejs-neoforge-2101.7.2-build.377.jar)
  2. NeoForge: getPersistentData + "NeoforgeData" save key  (jar: neoforge-universal-21.1.265.jar)
  3. AR3     : rocket entity owner memory, satellite items, lang names, kubejs bridge
               (jar: adv_rocketry-1.21.1-3.0.beta.jar)
"""
import zipfile, json, re, sys

KJS   = '/home/z/my-project/scratch/jars/kubejs-neoforge-2101.7.2-build.377.jar'
NF    = '/home/z/my-project/scratch/jars-extra/neoforge-universal-21.1.265.jar'
AR3   = '/home/z/my-project/scratch/jars/adv_rocketry-1.21.1-3.0.beta.jar'

def scan(jar, marker, path_sub=None, ci=True):
    """Return list of (entry, count) for entries containing marker bytes."""
    pat = re.compile(re.escape(marker), re.I if ci else 0)
    hits = []
    with zipfile.ZipFile(jar) as z:
        for name in z.namelist():
            if path_sub and path_sub.lower() not in name.lower():
                continue
            try:
                data = z.read(name)
            except Exception:
                continue
            n = len(pat.findall(data))
            if n:
                hits.append((name, n))
    return hits

def entries(jar, pred):
    with zipfile.ZipFile(jar) as z:
        return [n for n in z.namelist() if pred(n)]

print('=' * 72)
print('1) KUBEJS — event surfaces (item use / login / entity spawn / persistentData)')
print('=' * 72)
for label, sub in [
    ('ItemRightClicked event class', 'RightClickedKubeEvent'),
    ('ItemEvents class',             'kubejs/item/ItemEvents'),
    ('PlayerEvents class',           'kubejs/player/PlayerEvents'),
    ('EntityEvents class',           'kubejs/entity/EntityEvents'),
    ('LoggedIn event class',         'LoggedIn'),
]:
    names = entries(KJS, lambda n, s=sub: s.lower() in n.lower())
    print(f'  {label:32s}: {len(names)}', names[:6])
# targeted byte checks inside the event-group classes
for cls, want in [
    ('dev/latvian/mods/kubejs/plugin/builtin/event/ItemEvents.class',   [b'rightClicked', b'entityInteracted']),
    ('dev/latvian/mods/kubejs/plugin/builtin/event/PlayerEvents.class', [b'loggedIn', b'respawned']),
    ('dev/latvian/mods/kubejs/plugin/builtin/event/EntityEvents.class', [b'spawned']),
]:
    with zipfile.ZipFile(KJS) as z:
        try:
            data = z.read(cls)
        except KeyError:
            print(f'  !! {cls} not found'); continue
        found = [w.decode() for w in want if w in data]
        print(f'  {cls.split("/")[-1]:28s} markers: {found}')
pd = scan(KJS, b'getPersistentData')
print(f'  getPersistentData refs in KubeJS   : {len(pd)} hits, e.g. {[n for n,_ in pd[:4]]}')

print()
print('=' * 72)
print('2) NEOFORGE — per-player data persistence vehicle')
print('=' * 72)
for m in [b'getPersistentData', b'NeoforgeData']:
    hits = scan(NF, m)
    keys = [n for n, _ in hits if 'Entity' in n or 'Common' in n][:5]
    print(f'  {m.decode():20s}: {len(hits)} hits; entity/common sites e.g. {keys}')

print()
print('=' * 72)
print('3) AR3 — rockets, ownership, satellites, kubejs bridge')
print('=' * 72)
with zipfile.ZipFile(AR3) as z:
    all_names = z.namelist()
# package map
pkgs = {}
for n in all_names:
    if n.endswith('.class'):
        top = '/'.join(n.split('/')[:3])
        pkgs[top] = pkgs.get(top, 0) + 1
print('  top packages (class counts):')
for k, v in sorted(pkgs.items(), key=lambda kv: -kv[1])[:12]:
    print(f'    {k:60s} {v}')

ents = entries(AR3, lambda n: n.endswith('.class') and ('Entity' in n or 'entity' in n))
print(f'  entity-ish classes: {len(ents)}')
for n in ents[:25]:
    print(f'    {n}')

rockets = [n for n in all_names if 'ocket' in n and n.endswith('.class')]
print(f'  rocket-ish classes: {len(rockets)}')
for n in rockets[:25]:
    print(f'    {n}')

print('  -- ownership markers inside rocket/entity classes --')
for n in rockets + [e for e in ents if 'Rocket' in e or 'rocket' in e]:
    with zipfile.ZipFile(AR3) as z:
        data = z.read(n)
    found = [m.decode() for m in [b'owner', b'Owner', b'UUID', b'placedBy', b'launchedBy'] if m in data]
    if found:
        print(f'    {n.split("/")[-1]:55s} {found}')

sats = [n for n in all_names if 'satellite' in n.lower() or 'gps' in n.lower() or 'orbit' in n.lower()]
print(f'  satellite/gps/orbit entries: {len(sats)}', sats[:15])

langs = [n for n in all_names if '/lang/' in n and n.endswith('.json')]
print(f'  lang files: {langs}')
for ln in langs:
    with zipfile.ZipFile(AR3) as z:
        data = json.loads(z.read(ln))
    hits = {k: v for k, v in data.items()
            if re.search(r'satellite|gps|rocket|orbit', k + v, re.I)}
    print(f'  -- {ln}: {len(hits)} matching keys --')
    for k, v in list(hits.items())[:30]:
        print(f'    {k} = {v}')

kj = [n for n in all_names if 'kubejs' in n.lower()]
print(f'  kubejs-bridge entries in AR3: {len(kj)}', kj[:8])
with zipfile.ZipFile(AR3) as z:
    kbytes = sum(1 for n in all_names if n.endswith('.class') and b'kubejs' in z.read(n).lower())
print(f'  classes referencing "kubejs" bytes: {kbytes}')

# launch flow: launch pad blocks / machines
pads = [n for n in all_names if 'launch' in n.lower() or 'pad' in n.lower()]
print(f'  launch/pad entries: {len(pads)}', [p for p in pads[:15]])
