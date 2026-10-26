#!/usr/bin/env python3
"""Scan a JVM class file for `ldc <utf8-string>` followed by an int push and a
Builder.define call - used to extract config defaults when class-dump.py dies
on stack-map frames (e.g. Config$Common.<clinit>)."""
import struct, sys

def parse_cp(b):
    n = struct.unpack('>H', b[8:10])[0]
    i, cp = 10, {}
    idx = 1
    while idx < n:
        tag = b[i]
        if tag == 1:  # Utf8
            ln = struct.unpack('>H', b[i+1:i+3])[0]
            cp[idx] = ('utf8', b[i+3:i+3+ln].decode('utf-8', 'replace'))
            i += 3 + ln
        elif tag in (7, 8, 16, 19, 20):  # Class/Str/MethodType/Module/Pkg
            cp[idx] = ('ref', struct.unpack('>H', b[i+1:i+3])[0])
            i += 3
        elif tag == 15:  # MethodHandle: u1 kind + u2 ref
            cp[idx] = ('ref', struct.unpack('>H', b[i+2:i+4])[0])
            i += 4
        elif tag in (3, 4):  # int/float
            cp[idx] = ('num', struct.unpack('>i', b[i+1:i+5])[0])
            i += 5
        elif tag in (5, 6):  # long/double
            cp[idx] = ('num', struct.unpack('>q', b[i+1:i+9])[0])
            i += 9; idx += 1  # takes two slots
        elif tag in (9, 10, 11, 12, 17, 18):  # refs
            cp[idx] = ('member', struct.unpack('>HH', b[i+1:i+5]))
            i += 5
        else:
            raise ValueError(f'tag {tag} @ cp{idx} off {i}')
        idx += 1
    return cp

def resolve(cp, idx, depth=0):
    e = cp.get(idx)
    if e is None: return f'?cp{idx}'
    k, v = e
    if k == 'utf8': return v
    if k == 'num': return v
    if k == 'ref': return resolve(cp, v, depth+1) if depth < 3 else f'ref{v}'
    if k == 'member':
        ci, ni = v
        cls = resolve(cp, ci, depth+1); nm = resolve(cp, ni, depth+1)
        return f'{cls}.{nm}'
    return f'?{k}'

def main(path, target):
    b = open(path, 'rb').read()
    cp = parse_cp(b)
    hits = [i for i, e in cp.items() if e[0] == 'utf8' and e[1] == target]
    if not hits:
        print(f'utf8 "{target}" not found'); return
    sidx = hits[0]
    print(f'utf8 "{target}" = cp#{sidx}')
    # find ldc (0x12 sidx) or ldc_w (0x13 sidx hi lo) in the raw file
    pats = []
    if sidx <= 255: pats.append((bytes([0x12, sidx]), 'ldc'))
    pats.append((bytes([0x13, sidx >> 8, sidx & 0xFF]), 'ldc_w'))
    for pat, name in pats:
        start = 0
        while True:
            p = b.find(pat, start)
            if p < 0: break
            nxt = p + len(pat)
            op = b[nxt]
            # decode the instruction right after the string ldc (the int arg)
            if 0x02 <= op <= 0x08:
                val = op - 0x03  # iconst_m1..iconst_5
                print(f'{name} @0x{p:x}: next=iconst_{val if val>=0 else "m1"} -> default={val}')
            elif op == 0x10:
                print(f'{name} @0x{p:x}: next=bipush -> default={struct.unpack(">b", b[nxt+1:nxt+2])[0]}')
            elif op == 0x11:
                print(f'{name} @0x{p:x}: next=sipush -> default={struct.unpack(">h", b[nxt+1:nxt+3])[0]}')
            elif op == 0x12 or op == 0x13:  # another ldc (e.g. a box/wrapper path)
                print(f'{name} @0x{p:x}: next=ldc cp#{struct.unpack(">H" if op==0x13 else ">B", b[nxt+1:nxt+3 if op==0x13 else nxt+2])[0]}')
            else:
                print(f'{name} @0x{p:x}: next opcode 0x{op:02x}')
            start = p + 1

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
