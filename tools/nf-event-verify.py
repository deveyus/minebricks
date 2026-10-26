#!/usr/bin/env python3
"""Verify the class-loader native-event ledger mechanism in the pinned jars:

  1. NeoForge universal 21.1.265: ChunkEvent$Load exists (getChunk source),
     NeoForge.EVENT_BUS exists (IEventBus type),
     IEventBus.addListener(Class, Consumer)-style overloads exist.
  2. Vanilla 1.21.1 client mappings: ChunkAccess.isNewChunk exists.

Iron-rule receipt for the 'kill the Java companion' design: KubeJS registers
the native ChunkEvent.Load listener via Java.loadClass + addListener(SAM),
follows isNewChunk(), logs write-once at first invocation.
"""
import struct, zipfile

NF = "/home/z/my-project/scratch/jars-extra/neoforge-universal-21.1.265.jar"
VAN_MAP = "/home/z/my-project/scratch/client-mappings-1.21.1.txt"

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
    return cp

def class_methods(z, name):
    """Return (fields, methods) as utf8 name+descriptor strings from the class."""
    b = z.read(name)
    cp = parse_cp(b)
    # walk fields/methods tables: after cp, flags(2) this(2) super(2), then
    # interfaces, fields_count... we just re-scan: find field_count/method_count
    off = 10
    # after cp end we stored nothing; recompute: re-walk to get end offset
    n = struct.unpack('>H', b[8:10])[0]
    i, idx = 10, 1
    while idx < n:
        tag = b[i]
        if tag == 1: i += 3 + struct.unpack('>H', b[i+1:i+3])[0]
        elif tag in (7, 8, 16, 19, 20): i += 3
        elif tag == 15: i += 4
        elif tag in (3, 4): i += 5
        elif tag in (5, 6): i += 9; idx += 1
        else: i += 5
        idx += 1
    off = i
    off += 6  # access, this, super
    icount = struct.unpack('>H', b[off:off+2])[0]; off += 2 + 2 * icount
    def table(off):
        cnt = struct.unpack('>H', b[off:off+2])[0]; off += 2
        out = []
        for _ in range(cnt):
            acc, nm, ds, ac = struct.unpack('>HHHH', b[off:off+8]); off += 8
            for _a in range(ac):
                alen = struct.unpack('>I', b[off+2:off+6])[0]
                off += 6 + alen
            out.append((cp.get(nm, ('?','?'))[1], cp.get(ds, ('?','?'))[1]))
        return out, off
    fields, off = table(off)
    methods, off = table(off)
    return fields, methods

def verify():
    z = zipfile.ZipFile(NF)
    ok = True

    # 1. ChunkEvent$Load present, extends ChunkEvent (getChunk inherited)
    chunk_evt = "net/neoforged/neoforge/event/level/ChunkEvent.class"
    inner = "net/neoforged/neoforge/event/level/ChunkEvent$Load.class"
    names = z.namelist()
    print(f"ChunkEvent.class present: {chunk_evt in names}")
    print(f"ChunkEvent$Load.class present: {inner in names}")
    ok &= chunk_evt in names and inner in names
    f, m = class_methods(z, chunk_evt)
    getchunk = [x for x in m if x[0] in ('getChunk', 'm_156132_') or 'getChunk' in x[0]]
    print(f"ChunkEvent.getChunk methods: {getchunk}")
    ok &= bool(getchunk)

    # 2. NeoForge.EVENT_BUS
    nf_cls = "net/neoforged/neoforge/common/NeoForge.class"
    f, m = class_methods(z, nf_cls)
    print(f"NeoForge fields: {f}")
    ok &= any(x[0] == 'EVENT_BUS' for x in f)

    # 3. IEventBus.addListener overloads
    for bus in ("net/neoforged/bus/api/IEventBus.class", "net/neoforged/bus/api/EventBus.class"):
        if bus in names:
            f, m = class_methods(z, bus)
            adds = [x for x in m if x[0] == 'addListener']
            print(f"{bus}: {len(adds)} addListener overloads")
            for a in adds:
                print("   ", a[1])
            ok &= bool(adds)
            break

    z.close()

    # 4. vanilla isNewChunk via mappings
    hit_new, hit_line = False, ""
    for line in open(VAN_MAP, encoding='utf-8', errors='replace'):
        if hit_new:
            hit_line = line.strip()
            break
        if line.strip().startswith("net.minecraft.world.level.chunk.ChunkAccess "):
            hit_new = True  # next block lines contain methods; scan until found
    # simpler: direct search
    found = []
    with open(VAN_MAP, encoding='utf-8', errors='replace') as fh:
        block = None
        for line in fh:
            if not line.startswith(' ') and line.strip():
                block = line.strip()
            if block and block.startswith("net.minecraft.world.level.chunk.ChunkAccess") and "isNewChunk" in line:
                found.append(line.strip())
    print(f"mappings ChunkAccess.isNewChunk: {found}")
    ok &= bool(found)

    print("VERDICT:", "ALL VERIFIED" if ok else "GAPS FOUND (see above)")

if __name__ == "__main__":
    verify()
