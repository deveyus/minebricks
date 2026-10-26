#!/usr/bin/env python3
"""Verify chunk-indexing surface for the scanner ledger debate (conv-2214Z).

Questions:
  A) Does KubeJS 2101.7.2-build.377 have ANY chunk-related class/event? (re-confirm)
  B) Can pure JS see *which chunks are loaded*? -> ChunkSource.hasChunk /
     ServerChunkCache.getVisibleChunks / ChunkHolder.getPos / ServerLevel.getChunkSource
     (need PUBLIC access flags on the runtime (NeoForge universal = mojmap) classes)
  C) Palette-read trick viability: LevelChunk.getSections / LevelChunkSection palette
     accessors / PalettedContainer surface
  D) NeoForge ChunkEvent / ChunkDataEvent: classes exist? fire sites (call sites)?
     does ChunkEvent$Load know generation-vs-disk?
  E) ChunkSerializer patched with neoforged hooks? (ledger hook point evidence)
"""
import struct, sys, zipfile

KUBEJS = '/home/z/my-project/scratch/jars/kubejs-neoforge-2101.7.2-build.377.jar'
UNI = '/home/z/my-project/scratch/jars-extra/neoforge-universal-21.1.265.jar'

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
            cp[idx] = ('ref', struct.unpack('>H', b[i+1:i+3])[0])
            i += 3
        elif tag == 15:
            cp[idx] = ('ref', struct.unpack('>H', b[i+2:i+4])[0])
            i += 4
        elif tag in (3, 4):
            cp[idx] = ('num', struct.unpack('>i', b[i+1:i+5])[0])
            i += 5
        elif tag in (5, 6):
            cp[idx] = ('num', struct.unpack('>q', b[i+1:i+9])[0])
            i += 9; idx += 1
        elif tag in (9, 10, 11, 12, 17, 18):
            cp[idx] = ('member', struct.unpack('>HH', b[i+1:i+5]))
            i += 5
        else:
            raise ValueError(f'tag {tag} @ cp{idx}')
        idx += 1
    return cp, i

def resolve(cp, idx, depth=0):
    e = cp.get(idx)
    if e is None: return f'?cp{idx}'
    k, v = e
    if k == 'utf8': return v
    if k == 'ref': return resolve(cp, v, depth+1) if depth < 4 else '?'
    return '?'

FLAGS = [(0x0001,'pub'),(0x0002,'priv'),(0x0004,'prot'),(0x0008,'static'),
         (0x0010,'final'),(0x0100,'native'),(0x0400,'abstract')]

def fstr(f):
    return ','.join(t for m, t in FLAGS if f & m) or '0x%04x' % f

def parse_class(b):
    cp, end = parse_cp(b)
    acc, this_i, super_i = struct.unpack('>HHH', b[end:end+6])
    name = resolve(cp, this_i)
    off = end + 6
    n_if = struct.unpack('>H', b[off:off+2])[0]; off += 2 + 2 * n_if
    def members(off):
        n = struct.unpack('>H', b[off:off+2])[0]; off += 2
        out = []
        for _ in range(n):
            fl, ni, di, na = struct.unpack('>HHHH', b[off:off+8]); off += 8
            out.append((fstr(fl), resolve(cp, ni), resolve(cp, di)))
            for _a in range(na):
                al = struct.unpack('>I', b[off+2:off+6])[0]
                off += 6 + al
        return out, off
    fields, off = members(off)
    methods, off = members(off)
    utf8s = {v for k, v in cp.values() if k == 'utf8'}
    return name, fields, methods, utf8s

def find_class(zf, path):
    try:
        return parse_class(zf.read(path))
    except KeyError:
        return None

def show_methods(cls, names=None):
    _, _, ms, _ = cls
    for fl, nm, ds in ms:
        if names is None or nm in names:
            print(f'    {fl:24s} {nm}{ds}')

V = '/net/minecraft/'
print('=== B/C: runtime (mojmap) surface in NeoForge universal ===')
with zipfile.ZipFile(UNI) as z:
    names = z.namelist()

    # D) event classes exist?
    ev = sorted(n for n in names if 'event/level/Chunk' in n or 'event/level/ChunkData' in n)
    print('\n[D] NeoForge chunk event classes:', ev or 'NONE')

    # ChunkEvent$Load surface
    for c in ('net/neoforged/neoforge/event/level/ChunkEvent$Load',
              'net/neoforged/neoforge/event/level/ChunkDataEvent',
              'net/neoforged/neoforge/event/level/ChunkDataEvent$Load',
              'net/neoforged/neoforge/event/level/ChunkDataEvent$Save'):
        cls = find_class(z, c + '.class')
        if cls:
            print(f'\n[D] {c}:')
            for fl, nm, ds in cls[1]: print(f'    field {fl:16s} {nm}: {ds}')
            for fl, nm, ds in cls[2]: print(f'    {fl:22s} {nm}{ds}')

    # D) call sites: raw utf8 byte prefilter
    print('\n[D] call sites (classes whose constant pool references the event):')
    needles = {
        'ChunkEvent$Load': b'event/level/ChunkEvent$Load',
        'ChunkEvent$Unload': b'event/level/ChunkEvent$Unload',
        'ChunkDataEvent$Load': b'event/level/ChunkDataEvent$Load',
        'ChunkDataEvent$Save': b'event/level/ChunkDataEvent$Save',
    }
    hits = {k: [] for k in needles}
    for n in names:
        if not n.endswith('.class'): continue
        b = z.read(n)
        for k, pat in needles.items():
            if pat in b: hits[k].append(n.replace('/', '.')[:-6])
    for k, v in hits.items():
        print(f'    {k}: {v or "no call sites in universal jar"}')

    # E) ChunkSerializer patched?
    ser = find_class(z, 'net/minecraft/world/level/chunk/storage/ChunkSerializer.class')
    if ser:
        neo_refs = sorted(u for u in ser[3] if 'neoforged' in u.lower() or 'ChunkData' in u)
        print('\n[E] ChunkSerializer neoforged/chunkdata utf8 refs:', neo_refs or 'NONE')

    # B) loaded-chunk reachability
    print('\n[B] ChunkSource.hasChunk:')
    cs = find_class(z, 'net/minecraft/server/level/ChunkSource.class')
    show_methods(cs, {'hasChunk'}) if cs else print('    CLASS NOT FOUND')

    print('[B] ServerChunkCache (selected):')
    scc = find_class(z, 'net/minecraft/server/level/ServerChunkCache.class')
    if scc:
        for fl, nm, ds in scc[1]:
            if nm in ('chunkMap', 'level'): print(f'    field {fl:16s} {nm}: {ds}')
        show_methods(scc, {'hasChunk', 'getVisibleChunks', 'getVisibleChunksCount', 'getChunkForLighting', 'getChunk'})
    else:
        print('    CLASS NOT FOUND')

    print('[B] ChunkHolder.getPos:')
    ch = find_class(z, 'net/minecraft/server/level/ChunkHolder.class')
    if ch:
        for fl, nm, ds in ch[2]:
            if nm in ('getPos', 'getLatest', 'getTickingChunk', 'getChunkIfPresent'):
                print(f'    {fl:22s} {nm}{ds}')
    else:
        print('    CLASS NOT FOUND')

    print('[B] ServerLevel.getChunkSource:')
    sl = find_class(z, 'net/minecraft/server/level/ServerLevel.class')
    if sl:
        for fl, nm, ds in sl[2]:
            if nm in ('getChunkSource', 'getChunkIfLoaded'):
                print(f'    {fl:22s} {nm}{ds}')
    else:
        print('    CLASS NOT FOUND')

    # C) palette-read trick
    print('\n[C] LevelChunk.getSections:')
    lc = find_class(z, 'net/minecraft/world/level/chunk/LevelChunk.class')
    if lc:
        for fl, nm, ds in lc[2]:
            if nm in ('getSections', 'getSectionCount', 'getBlockState'):
                print(f'    {fl:22s} {nm}{ds}')
    print('[C] LevelChunkSection palette accessors:')
    ls = find_class(z, 'net/minecraft/world/level/chunk/LevelChunkSection.class')
    if ls:
        for fl, nm, ds in ls[2]:
            if nm in ('getPalette', 'getStates', 'maybeHas', 'getBlockState', 'getStatesArray', 'count'):
                print(f'    {fl:22s} {nm}{ds}')
    print('[C] PalettedContainer selected methods:')
    pc = find_class(z, 'net/minecraft/world/level/chunk/PalettedContainer.class')
    if pc:
        cand = [nm for _f, nm, _d in pc[2]]
        interesting = [m for m in cand if any(s in m.lower() for s in ('palette', 'count', 'foreach', 'entries', 'maybe'))]
        for _f, nm, ds in pc[2]:
            if nm in interesting: print(f'    {_f:22s} {nm}{ds}')
    print('[C] Palette interface methods:')
    for cand in ('net/minecraft/world/level/chunk/Palette.class',
                 'net/minecraft/world/level/chunk/storage/Palette.class'):
        pl = find_class(z, cand)
        if pl:
            print(f'    ({cand})')
            for fl, nm, ds in pl[2]: print(f'    {fl:22s} {nm}{ds}')
            break

print('\n=== A: KubeJS chunk surface ===')
with zipfile.ZipFile(KUBEJS) as z:
    names = z.namelist()
    chunk_classes = sorted(n for n in names if n.endswith('.class') and 'chunk' in n.lower())
    print('[A] classes with "chunk" in name:', chunk_classes or 'NONE')
    # utf8 'Chunk' scan limited to event + handler packages
    hit = []
    for n in names:
        if not n.endswith('.class'): continue
        if '/event/' not in n and 'EventHandler' not in n and '/level/' not in n: continue
        b = z.read(n)
        if b'Chunk' in b or b'chunk' in b:
            hit.append(n.replace('/', '.')[:-6])
    print('[A] event/handler classes mentioning chunk:', hit or 'NONE')
    # wrapper accessor for the native level
    ml = sorted(n.replace('/', '.')[:-6] for n in names
                if n.endswith('.class') and b'minecraftLevel' in z.read(n))
    print('[A] classes exposing "minecraftLevel" accessor:', ml[:8] or 'NONE')
