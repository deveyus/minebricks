#!/usr/bin/env python3
"""List fields + methods (name + descriptor) of a .class file.
Reuses the constant-pool logic from class-dump.py. Usage:
  python3 class-methods.py <file.class> [name-filter-regex]
"""
import struct, sys, io, re

def main(path, filt):
    data = open(path, "rb").read()
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
        elif tag in (3, 4): cp[i] = ("num", r.read(4))
        elif tag in (5, 6): cp[i] = ("num8", r.read(8)); i += 1
        elif tag == 7: cp[i] = ("Class", struct.unpack(">H", r.read(2))[0])
        elif tag == 8: cp[i] = ("String", struct.unpack(">H", r.read(2))[0])
        elif tag in (9, 10, 11):
            a, b = struct.unpack(">HH", r.read(4)); cp[i] = ("Ref", a, b)
        elif tag == 12:
            a, b = struct.unpack(">HH", r.read(4)); cp[i] = ("NameAndType", a, b)
        elif tag == 15: cp[i] = ("MH", r.read(3))
        elif tag == 16: cp[i] = ("MT", r.read(2))
        elif tag in (17, 18):
            a, b = struct.unpack(">HH", r.read(4)); cp[i] = ("Dyn", a, b)
        elif tag in (19, 20): cp[i] = ("Mod", r.read(2))
        else: raise Exception(f"tag {tag}")
        i += 1
    def utf(idx): return cp[idx][1]
    r.read(6)  # access, this, super
    ni = struct.unpack(">H", r.read(2))[0]; r.read(2 * ni)
    nf = struct.unpack(">H", r.read(2))[0]
    print("== fields ==")
    for _ in range(nf):
        acc, namei, desi = struct.unpack(">HHH", r.read(6))
        na = struct.unpack(">H", r.read(2))[0]
        for _ in range(na):
            r.read(2)
            r.read(struct.unpack(">I", r.read(4))[0])
        line = f"{utf(namei)} : {utf(desi)}"
        if not filt or re.search(filt, line): print(line)
    nm = struct.unpack(">H", r.read(2))[0]
    print("== methods ==")
    for _ in range(nm):
        acc, namei, desi = struct.unpack(">HHH", r.read(6))
        na = struct.unpack(">H", r.read(2))[0]
        code = None
        for _ in range(na):
            ani = struct.unpack(">H", r.read(2))[0]
            alen = struct.unpack(">I", r.read(4))[0]
            body = r.read(alen)
            if utf(ani) == "Code": code = body
        line = f"{utf(namei)}{utf(desi)}"
        if not filt or re.search(filt, line):
            print(line + (f"  [{len(code)}b code]" if code else ""))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
