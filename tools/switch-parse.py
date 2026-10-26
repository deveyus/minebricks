#!/usr/bin/env python3
"""Parse the tableswitch payload in dvq$d$1.getConfiguration (SECTION_STATES).
Reuses class-dump.py's constant-pool parser, then decodes the raw switch table."""
import struct, sys, io, importlib.util

spec = importlib.util.spec_from_file_location("cd", "/home/z/my-project/scripts/class-dump.py")
# class-dump.py runs main() on import? No - it guards with __name__. Parse constants inline instead.

def parse_cp(data):
    r = io.BytesIO(data)
    assert r.read(4) == b"\xca\xfe\xba\xbe"
    r.read(4)
    n = struct.unpack(">H", r.read(2))[0]
    cp = [None] * n
    i = 1
    while i < n:
        tag = r.read(1)[0]
        if tag == 1:
            ln = struct.unpack(">H", r.read(2))[0]; cp[i] = ("Utf8", r.read(ln).decode("utf-8", "replace"))
        elif tag in (3, 4): cp[i] = ("num", struct.unpack(">I", r.read(4))[0])
        elif tag in (5, 6): cp[i] = ("num8", r.read(8)); i += 1
        elif tag == 7: cp[i] = ("Class", struct.unpack(">H", r.read(2))[0])
        elif tag == 8: cp[i] = ("String", struct.unpack(">H", r.read(2))[0])
        elif tag in (9, 10, 11):
            a, b = struct.unpack(">HH", r.read(4)); cp[i] = ("Ref", tag, a, b)
        elif tag == 12:
            a, b = struct.unpack(">HH", r.read(4)); cp[i] = ("NameAndType", a, b)
        elif tag == 15: cp[i] = ("MH", r.read(3))
        elif tag == 16: cp[i] = ("MT", struct.unpack(">H", r.read(2))[0])
        elif tag in (17, 18): cp[i] = ("Dyn", a, b)
        elif tag in (19, 20): cp[i] = ("Mod", r.read(2))
        else: raise Exception(f"tag {tag}")
        i += 1
    return cp

def utf(cp, idx): return cp[idx][1]
def cls(cp, idx): return utf(cp, cp[idx][1])
def nat(cp, idx):
    t = cp[idx]; return f"{utf(cp, t[1])}:{utf(cp, t[2])}"
def ref(cp, idx):
    t = cp[idx]; return f"{cls(cp, t[2])}.{nat(cp, t[3])}"

data = open(sys.argv[1], "rb").read()
cp = parse_cp(data)
r = io.BytesIO(data)
# skip cp
r.seek(0)
r.read(10)
n = struct.unpack(">H", data[8:10])[0]
i = 1
while i < n:
    tag = r.read(1)[0]
    if tag == 1: r.read(struct.unpack(">H", r.read(2))[0])
    elif tag in (3, 4): r.read(4)
    elif tag in (5, 6): r.read(8); i += 1
    elif tag in (7, 8, 19, 20): r.read(2)
    elif tag in (9, 10, 11, 12, 16, 17, 18): r.read(4)
    elif tag == 15: r.read(3)
    i += 1
r.read(6)  # access/this/super
ni = struct.unpack(">H", r.read(2))[0]; r.read(2 * ni)
nf = struct.unpack(">H", r.read(2))[0]
for _ in range(nf):
    r.read(6)
    na = struct.unpack(">H", r.read(2))[0]
    for _ in range(na):
        r.read(2); r.read(struct.unpack(">I", r.read(4))[0])
nm = struct.unpack(">H", r.read(2))[0]
for _ in range(nm):
    acc, namei, desi = struct.unpack(">HHH", r.read(6))
    name, desc = utf(cp, namei), utf(cp, desi)
    na = struct.unpack(">H", r.read(2))[0]
    code = None
    for _ in range(na):
        ani = struct.unpack(">H", r.read(2))[0]
        alen = struct.unpack(">I", r.read(4))[0]
        body = r.read(alen)
        if utf(cp, ani) == "Code": code = body
    if not (name == "a" and "Ljr;I)" in desc) or not code:
        continue
    _, _, clen = struct.unpack(">HHI", code[:8])
    bc = code[8:8 + clen]
    j = 1  # after iload_2
    op = bc[j]
    assert op == 170, f"expected tableswitch, got {op}"
    base = j
    pad = (4 - ((j + 1) % 4)) % 4
    p = j + 1 + pad
    default, low, high = struct.unpack(">iii", bc[p:p+12]); p += 12
    offs = [struct.unpack(">i", bc[p+4*k:p+4*k+4])[0] for k in range(high - low + 1)]
    print(f"tableswitch low={low} high={high}")
    def decode_at(tgt, label):
        out = []
        j2 = tgt
        for _ in range(8):
            op2 = bc[j2]
            if op2 == 178:
                idx = struct.unpack(">H", bc[j2+1:j2+3])[0]
                out.append(f"getstatic {ref(cp, idx)}"); j2 += 3
            elif op2 == 187:
                idx = struct.unpack(">H", bc[j2+1:j2+3])[0]
                out.append(f"new {cls(cp, idx)}"); j2 += 3
            elif op2 == 183:
                idx = struct.unpack(">H", bc[j2+1:j2+3])[0]
                out.append(f"invokespecial {ref(cp, idx)}"); j2 += 3; break
            elif op2 == 184:
                idx = struct.unpack(">H", bc[j2+1:j2+3])[0]
                out.append(f"invokestatic {ref(cp, idx)}"); j2 += 3
            elif op2 == 16:
                out.append(f"bipush {struct.unpack('>b', bc[j2+1:j2+2])[0]}"); j2 += 2
            elif op2 == 17:
                out.append(f"sipush {struct.unpack('>h', bc[j2+1:j2+3])[0]}"); j2 += 3
            elif op2 == 21:
                out.append(f"iload {bc[j2+1]}"); j2 += 2
            elif op2 == 172:
                out.append("ireturn"); break
            elif op2 == 176:
                out.append("areturn"); break
            else:
                out.append(f"op{op2}"); j2 += 1
        print(f"  {label}: " + " | ".join(out))

    for k, off in zip(range(low, high + 1), offs):
        decode_at(base + off, f"bits {k}")
    decode_at(base + default, "default(bits>8)")
