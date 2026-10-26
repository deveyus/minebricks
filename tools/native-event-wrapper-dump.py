#!/usr/bin/env python3
"""Dump KubeJS NativeEventWrapper (the generic native-event passthrough candidate):
its script-facing surface, which event bus it registers on, and what bindings/
classes reference it."""
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
        elif tag in (7, 8, 16, 19, 20): cp[idx] = ('ref', struct.unpack('>H', b[i+1:i+3])[0]); i += 3
        elif tag == 15: cp[idx] = ('ref', struct.unpack('>H', b[i+2:i+4])[0]); i += 4
        elif tag in (3, 4): cp[idx] = ('num', struct.unpack('>i', b[i+1:i+5])[0]); i += 5
        elif tag in (5, 6): cp[idx] = ('num', struct.unpack('>q', b[i+1:i+9])[0]); i += 9; idx += 1
        elif tag == 12: cp[idx] = ('nat', struct.unpack('>HH', b[i+1:i+5])); i += 5
        elif tag in (9, 10, 11, 17, 18): cp[idx] = ('member', struct.unpack('>HH', b[i+1:i+5])); i += 5
        else: raise ValueError(f'tag {tag}')
        idx += 1
    return cp

def resolve(cp, idx, depth=0):
    e = cp.get(idx)
    if e is None: return '?'
    k, v = e
    if k == 'utf8': return v
    if k in ('ref',): return resolve(cp, v, depth+1) if depth < 5 else '?'
    if k == 'nat':
        ni, di = v
        return f'{resolve(cp, ni, depth+1)}{resolve(cp, di, depth+1)}'
    if k == 'member':
        ci, ni = v
        return f'{resolve(cp, ci, depth+1)}::{resolve(cp, ni, depth+1)}'
    return '?'

def members_of(path):
    b = z.read(path)
    cp, end = parse_cp(b), None
    cp, i = cp, parse_cp_end(b)
    acc, this_i, super_i = struct.unpack('>HHH', b[i:i+6])
    name = resolve(cp, this_i)
    off = i + 6
    n_if = struct.unpack('>H', b[off:off+2])[0]; off += 2 + 2*n_if
    out = {'name': name, 'fields': [], 'methods': [], 'refs': set(), 'utf8s': set()}
    def members(off, kind):
        n = struct.unpack('>H', b[off:off+2])[0]; off += 2
        res = []
        for _ in range(n):
            fl, ni, di, na = struct.unpack('>HHHH', b[off:off+8]); off += 8
            res.append((fl, resolve(cp, ni), resolve(cp, di)))
            for _a in range(na):
                al = struct.unpack('>I', b[off+2:off+6])[0]; off += 6 + al
        return res, off
    out['fields'], off = members(off, 'f')
    out['methods'], off = members(off, 'm')
    out['refs'] = {resolve(cp, idx) for idx, e in cp.items() if e[0] == 'member'}
    out['utf8s'] = {e[1] for e in cp.values() if e[0] == 'utf8'}
    return out

def parse_cp_end(b):
    n = struct.unpack('>H', b[8:10])[0]
    i, idx = 10, 1
    while idx < n:
        tag = b[i]
        if tag == 1: i += 3 + struct.unpack('>H', b[i+1:i+3])[0]
        elif tag in (7, 8, 16, 19, 20): i += 3
        elif tag == 15: i += 4
        elif tag in (3, 4): i += 5
        elif tag in (5, 6): i += 9; idx += 1
        elif tag in (9, 10, 11, 12, 17, 18): i += 5
        else: raise ValueError('tag')
        idx += 1
    return i

with zipfile.ZipFile(KUBEJS) as z:
    W = 'dev/latvian/mods/kubejs/plugin/builtin/wrapper/'
    for sub in ('NativeEventWrapper.class', 'NativeEventWrapper$Listeners.class', 'NativeEventWrapper$Listeners$Key.class'):
        try:
            m = members_of(W + sub)
        except KeyError:
            print(sub, 'NOT FOUND'); continue
        print(f'=== {sub} (extends {m["name"]}) ===')
        print('  fields:')
        for fl, nm, ds in m['fields']: print(f'    {nm}: {ds}')
        print('  methods:')
        for fl, nm, ds in m['methods']: print(f'    {nm}{ds}')
        print('  member refs:')
        for r in sorted(m['refs']):
            if isinstance(r, str): print(f'    {r}')

    print('\n=== who references NativeEventWrapper ===')
    for n in z.namelist():
        if n.endswith('.class') and b'NativeEventWrapper' in z.read(n):
            print('  ', n)

    print('\n=== script-facing binding names (utf8 "NativeEvents"/"onEvent" in bindings pkg) ===')
    for n in z.namelist():
        if not n.endswith('.class'): continue
        if '/bindings/' in n or 'PluginJS' in n or 'wrapper/' in n:
            b = z.read(n)
            cp = parse_cp(b)
            utf8s = {e[1] for e in cp.values() if e[0] == 'utf8'}
            if 'NativeEvents' in utf8s or 'onEvent' in utf8s or 'nativeEvent' in utf8s:
                keep = sorted(u for u in utf8s if u in ('NativeEvents', 'onEvent', 'nativeEvent', 'offEvent', 'NativeEventWrapper') or 'Event' in u and len(u) < 30)
                print(f'  {n}: {keep[:12]}')
