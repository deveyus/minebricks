#!/usr/bin/env python3
"""Scan silent-gear jar for material-tier surface (hammer-material keys for scanner dials).
Raw-bytes marker search restricted to material/api/gear paths — enough to prove the
tier property exists in the compiled surface; full CP parse not needed for existence."""
import zipfile, os, re, collections

JAR = '/home/z/my-project/scratch/jars-extra/silent-gear-1.21.1-neoforge-4.2.1.1.jar'
MARKERS = [b'getTier', b'MaterialTier', b'harvestTier', b'setTier', b'tier()']
# broader interest markers for hammer/part accessors
PART_MARKERS = [b'getMaterial', b'MaterialInstance', b'PartInstance', b'getParts']

def scan(jar):
    hits = collections.defaultdict(list)
    with zipfile.ZipFile(jar) as z:
        for name in z.namelist():
            if not name.endswith('.class'):
                continue
            ln = name.lower()
            if 'material' not in ln and '/api/' not in ln and 'gear/item' not in ln:
                continue
            data = z.read(name)
            for m in MARKERS + PART_MARKERS:
                if m in data:
                    hits[m.decode()].append(name)
    return hits

if __name__ == '__main__':
    print(f'== {os.path.basename(JAR)}')
    hits = scan(JAR)
    for m in [x.decode() for x in MARKERS + PART_MARKERS]:
        lst = hits.get(m, [])
        print(f'{m}: {len(lst)} classes')
        for c in lst[:6]:
            print(f'    {c}')
