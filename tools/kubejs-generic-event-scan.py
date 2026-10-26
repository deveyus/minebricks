#!/usr/bin/env python3
"""Does KubeJS 2101.7.2-build.377 have a GENERIC event passthrough (onEvent /
extra / GenericEvent / arbitrary NeoForge event re-fire)? If yes, ChunkEvent.Load
could be hooked from pure JS with zero Java. Also dump every EventGroup's event
ids, to prove the complete named-event surface."""
import struct, zipfile

KUBEJS = '/home/z/my-project/scratch/jars/kubejs-neoforge-2101.7.2-build.377.jar'

def parse_cp(b):
    n = struct.unpack('>H', b[8:10])[0]
    i, cp, idx = 10, {}, 1
    while idx < n:
        tag = b[i]
        if tag == 1:
            ln = struct.unpack('>H', b[i+1:i+3])[0]
            cp[idx] = ('utf8', b[i+3:i+3+ln].decode('utf-8', 'replace')); i += 3 + ln
        elif tag in (7, 8, 16, 19, 20): cp[idx] = ('ref',); i += 3
        elif tag == 15: cp[idx] = ('ref',); i += 4
        elif tag in (3, 4): cp[idx] = ('num',); i += 5
        elif tag in (5, 6): cp[idx] = ('num',); i += 9; idx += 1
        elif tag in (9, 10, 11, 12, 17, 18): cp[idx] = ('mem',); i += 5
        else: raise ValueError(f'tag {tag}')
        idx += 1
    return cp

with zipfile.ZipFile(KUBEJS) as z:
    names = z.namelist()

    print('=== 1. class names hinting at generic/extra events ===')
    for n in sorted(names):
        if n.endswith('.class'):
            base = n.rsplit('/', 1)[-1][:-6].lower()
            if any(s in base for s in ('generic', 'extra', 'onevent', 'customevent', 'nativeevent', 'wrapperevent')):
                print('  ', n)

    print('\n=== 2. utf8 scan: generic-passthrough idioms across all classes ===')
    needles = [b'onEvent', b'GenericEvent', b'addEventListener', b'registerListener',
               b'EventBus', b'IExtensionPoint', b'fireEvent', b'postEvent']
    hits = {}
    for n in names:
        if not n.endswith('.class'): continue
        b = z.read(n)
        for p in needles:
            if p in b:
                hits.setdefault(p.decode(), []).append(n)
    for k, v in sorted(hits.items()):
        short = [x.replace('dev/latvian/mods/kubejs/', 'kjs/').replace('net/neoforged/', 'nf/') for x in v[:10]]
        print(f'  {k}: {len(v)} classes, e.g. {short}')

    print('\n=== 3. all EventGroup subclasses + their event id fields ===')
    groups = [n for n in names if n.startswith('dev/latvian/mods/kubejs/event/')
              and n.endswith('.class') and '$' not in n]
    for g in sorted(groups):
        b = z.read(g)
        cp = parse_cp(b)
        utf8s = [e[1] for e in cp.values() if e[0] == 'utf8']
        # event-group ids look like dotted or snake strings; print string-ish constants
        ids = sorted(set(u for u in utf8s if 3 < len(u) < 40 and u.replace('_', '').isalnum() and '_' in u or ' ' not in u and u.islower() and '_' in u))
        if ids:
            print(f'-- {g.rsplit("/",1)[-1][:-6]}: {ids[:24]}')

    print('\n=== 4. neoforge module: does kubejs-neoforge hook arbitrary bus? ===')
    for n in sorted(names):
        if n.endswith('.class') and ('neoforge' in n.lower() or 'forge' in n.lower()):
            base = n.rsplit('/', 1)[-1][:-6].lower()
            if 'event' in base:
                print('  ', n)
