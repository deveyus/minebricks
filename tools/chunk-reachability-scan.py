#!/usr/bin/env python3
"""Follow-up for conv-2214Z: vanilla classes are binpatched (absent from universal
jar), so verify the mojmap surface by (1) checking mod jars compiled against mojmap
for real Methodref-level references, (2) dumping KubeJS LevelJS wrapper surface,
(3) finding where NeoForge bridges ChunkEvent Load/Unload."""
import struct, zipfile, glob, os

def parse_cp(b):
    n = struct.unpack('>H', b[8:10])[0]
    i, cp = 10, {}
    idx = 1
    while idx < n:
        tag = b[i]
        if tag == 1:
            ln = struct.unpack('>H', b[i+1:i+3])[0]
            cp[idx] = ('utf8', b[i+3:i+3+ln].decode('utf-8', 'replace'))
            i += 3 + ln
        elif tag in (7, 8, 16, 19, 20):
            cp[idx] = ('ref', struct.unpack('>H', b[i+1:i+3])[0]); i += 3
        elif tag == 15:
            cp[idx] = ('ref', struct.unpack('>H', b[i+2:i+4])[0]); i += 4
        elif tag in (3, 4):
            cp[idx] = ('num',); i += 5
        elif tag in (5, 6):
            cp[idx] = ('num',); i += 9; idx += 1
        elif tag in (9, 10, 11, 17, 18):
            cp[idx] = ('member', struct.unpack('>HH', b[i+1:i+5])); i += 5
        elif tag == 12:
            cp[idx] = ('nat', struct.unpack('>HH', b[i+1:i+5])); i += 5
        else:
            raise ValueError(f'tag {tag}')
        idx += 1
    return cp, i

def resolve(cp, idx, depth=0):
    e = cp.get(idx)
    if e is None: return None
    k = e[0]
    if k == 'utf8': return e[1]
    if k == 'ref': return resolve(cp, e[1], depth+1) if depth < 4 else None
    if k == 'nat':
        ni, di = e[1]
        return (resolve(cp, ni, depth+1), resolve(cp, di, depth+1))
    if k == 'member':
        ci, ni = e[1]
        owner = resolve(cp, ci, depth+1)
        nat = resolve(cp, ni, depth+1)
        if isinstance(owner, str) and isinstance(nat, tuple):
            return (owner, nat)
    return None

def class_refs(b):
    """Return (classname, set of utf8s, set of (owner, (name, desc)) member refs)."""
    cp, end = parse_cp(b)
    name = resolve(cp, struct.unpack('>H', b[end+2:end+4])[0]) or '?'
    utf8s = {e[1] for e in cp.values() if e[0] == 'utf8'}
    members = set()
    for idx, e in cp.items():
        if e[0] == 'member':
            r = resolve(cp, idx)
            if r: members.add(r)
    return name, utf8s, members

CLASS_NEEDLES = [
    'net/minecraft/server/level/ServerChunkCache',
    'net/minecraft/server/level/ChunkSource',
    'net/minecraft/server/level/ChunkHolder',
    'net/minecraft/world/level/chunk/LevelChunk',
    'net/minecraft/world/level/chunk/LevelChunkSection',
    'net/minecraft/world/level/chunk/PalettedContainer',
    'net/minecraft/world/level/chunk/status/ChunkStatus',
]
METHOD_NEEDLES = ['getVisibleChunks', 'getChunkSource', 'getSections', 'getPalette', 'hasChunk']

def dots(s): return s.replace('/', '.')

print('=== 1. vanilla jar obfuscation check ===')
with zipfile.ZipFile('/home/z/my-project/scratch/jars-extra/vanilla-1.21.1-client.jar') as z:
    nm = [n for n in z.namelist() if n.endswith('.class')]
    mc = [n for n in nm if n.startswith('net/minecraft/')]
    print(f'total classes {len(nm)}, net/minecraft classes {len(mc)}, sample: {mc[:3] or nm[:3]}')

print()
print('=== 2. mod-jar sweep: who compiles against the mojmap chunk surface ===')
jars = sorted(glob.glob('/home/z/my-project/scratch/jars/*.jar')) + \
       sorted(glob.glob('/home/z/my-project/scratch/jars-extra/*.jar'))
for jp in jars:
    try:
        with zipfile.ZipFile(jp) as z:
            names = [n for n in z.namelist() if n.endswith('.class')]
            found = {}   # needle -> set of referencing classes
            for n in names:
                b = z.read(n)
                # cheap prefilter: any needle present at all?
                if not any(c.encode() in b for c in CLASS_NEEDLES):
                    continue
                try:
                    cname, utf8s, members = class_refs(b)
                except Exception:
                    continue
                cls_refs = {c for c in CLASS_NEEDLES if c in utf8s}
                if not cls_refs:
                    continue
                for c in cls_refs:
                    # strong evidence: a member ref whose OWNER is this class
                    for owner, (mn, md) in members:
                        if not isinstance(owner, str):
                            continue
                        if owner.replace('.', '/') == c:
                            found.setdefault(dots(c), set()).add(f'{mn}{md}  <-  {dots(cname).split(".")[-1]}')
            if found:
                print(f'-- {os.path.basename(jp)}')
                for c in sorted(found):
                    print(f'   {c}:')
                    for m in sorted(found[c])[:6]:
                        print(f'      {m}')
    except zipfile.BadZipFile:
        pass

print()
print('=== 3. KubeJS level wrapper surface ===')
with zipfile.ZipFile('/home/z/my-project/scratch/jars/kubejs-neoforge-2101.7.2-build.377.jar') as z:
    lvl = sorted(n for n in z.namelist() if n.startswith('dev/latvian/mods/kubejs/level/') and n.endswith('.class'))
    print('level pkg classes:', [p.rsplit('/', 1)[-1] for p in lvl])
    for path in lvl:
        b = z.read(path)
        cp, end = parse_cp(b)
        name = resolve(cp, struct.unpack('>H', b[end+2:end+4])[0]) or '?'
        self_members = set()
        for idx, e in cp.items():
            if e[0] == 'member':
                r = resolve(cp, idx)
                if r and isinstance(r[0], str) and r[0].replace('.', '/') == name and not r[1][0].startswith('<'):
                    self_members.add(r[1])
        if self_members:
            print(f'-- {dots(name)}')
            for mn, md in sorted(self_members):
                print(f'   {mn}{md}')

print()
print('=== 4. NeoForgeEventHandler chunk bridge ===')
with zipfile.ZipFile('/home/z/my-project/scratch/jars-extra/neoforge-universal-21.1.265.jar') as z:
    for path in ('net/neoforged/neoforge/common/NeoForgeEventHandler.class',
                 'net/neoforged/neoforge/capabilities/CapabilityHooks.class'):
        try:
            b = z.read(path)
        except KeyError:
            continue
        cp, end = parse_cp(b)
        print(f'-- {dots(path[:-6])}')
        for idx, e in cp.items():
            if e[0] == 'member':
                r = resolve(cp, idx)
                if r and isinstance(r[0], str):
                    mn = r[1][0] if isinstance(r[1], tuple) else r[1]
                    if mn and 'hunk' in mn.lower() or (r[0] and 'hunk' in r[0].lower()):
                        print(f'   {r[0]} :: {mn}{r[1][1] if isinstance(r[1], tuple) else ""}')
