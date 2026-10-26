#!/usr/bin/env python3
"""sat-scan2.py — does AR3's satellite/launch chain remember the PLAYER?

Targeted class dump: printable-string census of the satellite/mission/launch
classes, hunting player-identity markers (GameProfile, ownerName, playerName,
username, placedBy...) and the actual NBT save keys each class writes.
"""
import zipfile, re

AR3 = '/home/z/my-project/scratch/jars/adv_rocketry-1.21.1-3.0.beta.jar'

TARGETS = [
    'EntityLaunchStation', 'EntityLaunchStationSatelliteMissions',
    'LaunchStation', 'LaunchStationSatelliteMissions',
    'ProgramSatelliteDeployment', 'ProgramSatelliteRecovery',
    'ProgramMissionStartBase', 'RocketMission', 'MissionManager',
    'SatelliteRecoverMission', 'Satellite', 'SatelliteManager',
    'ItemSatellite', 'ItemSatelliteIdChip', 'ItemLinker',
    'EntitySatelliteAssembler', 'EntitySatelliteMonitor',
    'EntityRocket', 'EntitySpaceStationAssembler',
]
IDENT = [b'GameProfile', b'playerName', b'PlayerName', b'ownerName',
         b'username', b'Username', b'placedBy', b'builtBy', b'launchedBy',
         b'creator', b'Creator', b'placed_by']

with zipfile.ZipFile(AR3) as z:
    names = z.namelist()
    cache = {n: z.read(n) for n in names if n.endswith('.class')}

def strings(data, minlen=4):
    return re.findall(rb'[ -~]{%d,}' % minlen, data)

for short in TARGETS:
    cls = [n for n in cache if n.split('/')[-1].split('.')[0] == short or
           n.split('/')[-1].split('$')[0].split('.')[-1] == short]
    for n in cls:
        data = cache[n]
        idents = [m.decode() for m in IDENT if m in data]
        sstr = strings(data)
        # NBT-key-ish strings: camelCase or snake_case tokens
        keys = sorted({s.decode() for s in sstr if re.fullmatch(
            rb'(get|set|put|has)?[A-Z][A-Za-z0-9_]{2,28}|[a-z][a-z0-9_]{2,28}', s)})
        pl = [k for k in keys if re.search(r'player|owner|profile|author|builder|placer', k, re.I)]
        print(f'--- {n}')
        print(f'    identity markers : {idents if idents else "none"}')
        if pl:
            print(f'    player-ish tokens: {pl[:14]}')
        # dump most informative save-ish keys (limit noise)
        sav = [k for k in keys if re.search(
            r'^(sat|mission|rocket|launch|orbit|dim|target|fuel|stat|deploy|recover|state|data|id|type|prog)', k)]
        print(f'    save-ish tokens  : {sav[:18]}')
