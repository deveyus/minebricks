#!/usr/bin/env python3
"""sat-scan3.py — does AR3 3.0.beta model launch FAILURES at all?

Question (her, 2026-10-26): can a launch actually fail? Targets:
  1. whole-jar failure vocabulary (explode/crash/abort/malfunction/fuel-out)
  2. EntityRocket: damageable? state machine values? health/hurt surface
  3. LaunchStation/Pad + programs: state enums, abort paths, fuel gates
  4. KubeJS visibility of a failure: entity death event? explosion event?
"""
import zipfile, re

AR3 = '/home/z/my-project/scratch/jars/adv_rocketry-1.21.1-3.0.beta.jar'
KJS = '/home/z/my-project/scratch/jars/kubejs-neoforge-2101.7.2-build.377.jar'

with zipfile.ZipFile(AR3) as z:
    names = z.namelist()
    cache = {n: z.read(n) for n in names if n.endswith('.class')}

print('=' * 72)
print('1) whole-jar failure vocabulary')
print('=' * 72)
for m in [b'explode', b'Explosion', b'crash', b'malfunction', b'abort',
          b'failure', b'notEnoughFuel', b'insufficientFuel', b'needsFuel',
          b'leak']:
    pat = re.compile(re.escape(m), re.I)
    hits = sorted({n for n, d in cache.items() if pat.search(d)})
    if hits:
        print(f'  {m.decode():18s} -> {len(hits)} classes')
        for h in hits[:8]:
            print(f'      {h}')
    else:
        print(f'  {m.decode():18s} -> none')

print()
print('=' * 72)
print('2) EntityRocket — damage/health + state dump')
print('=' * 72)
for m in [b'getHealth', b'setHealth', b'hurt', b'Hurt', b'damage',
          b'Invulnerable', b'invulnerable', b'isAttackable', b'pushable']:
    hits = [n for n in cache if 'EntityRocket' in n and m in cache[n]]
    if hits:
        print(f'  {m.decode():15s} in: {hits}')

def dump_strings(short, keep=None):
    for n, d in cache.items():
        base = n.split('/')[-1].split('$')[0].split('.')[-1]
        if base != short:
            continue
        sstr = [s.decode() for s in re.findall(rb'[ -~]{4,}', d)]
        if keep:
            sstr = [s for s in sstr if re.search(keep, s, re.I)]
        print(f'  --- {n} ({len(sstr)} kept)')
        for s in sorted(set(sstr))[:40]:
            print(f'      {s}')

print()
print('=' * 72)
print('3) state machines & programs (string dumps)')
print('=' * 72)
KEEP = (r'state|fail|crash|explod|abort|land|launch|flight|fly|orbit|'
        r'fuel|height|altitude|speed|veloc|program|progress|status|dead|'
        r'remove|discard|health|hurt|damage|tnt|fire|burn')
for short in ['EntityRocket', 'State', 'LaunchStation', 'LaunchPad',
              'ProgramTestFlight', 'ProgramMissionStartBase',
              'ProgramSatelliteDeployment', 'RocketMission']:
    dump_strings(short, KEEP)

print()
print('=' * 72)
print('4) KubeJS — can we SEE a failure?')
print('=' * 72)
with zipfile.ZipFile(KJS) as z:
    kjsn = z.namelist()
    try:
        ev = z.read('dev/latvian/mods/kubejs/plugin/builtin/event/EntityEvents.class')
        print('  EntityEvents markers:', [w.decode() for w in
              [b'died', b'death', b'removed', b'spawned', b'attacked'] if w in ev])
    except KeyError:
        print('  EntityEvents.class not found')
    expl = [n for n in kjsn if 'Explosion' in n]
    print('  explosion event classes:', expl)
    deathe = [n for n in kjsn if 'eath' in n and 'KubeEvent' in n]
    print('  death-ish event classes:', deathe[:6])
