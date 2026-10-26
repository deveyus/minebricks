# tools/ — Zee's project tooling, lives IN the repo so it survives workspace wipes

Rescued 2026-10-26 per Fina's directive ("make a tools folder after you clone, so that
your tooling gets saved this time"). Excluded from the packwiz index via `/.packwizignore`
at the pack root (`tools/`, `*.md`, `*.zip`, `*.sh`, `.git/` stay in git, out of the pack).

## Map
- **packwiz chain**: `packwiz_build.py`, `packwiz_verify.py`, `packwiz_rebuild_index.py`,
  `rebuild_index.py` (deterministic index regen), `packwiz_add_mapera.py`,
  `packwiz_add_verified.py`, `packwiz_fix_serverutils.py`
- **jar sourcing**: `fetch-pack-jars.py`, `fetch-extra-jars.py`, `cf-fetch-metalworks.py`,
  `cf_add_metalworks.py`, `modrinth-check.py`
- **inventory / materials**: `machine-inventory.py` (58-jar machine census),
  `scan-materials.py`, `build-master-materials.py` (master materials workbook)
- **ore work**: `ore-chain-census.py` (+2–5 iterations), `ore-palette-scan.py`,
  `gen-oregen-survey.js` + `survey-content-a/b/cover.js` (oregen survey builder)
- **Silent Gear**: `sg-range-scan.py`, `sg-tier-scan.py`
- **KubeJS layer**: `kubejs-generic-event-scan.py`, `native-event-wrapper-dump.py`,
  `nf-event-verify.py`
- **class/bytecode forensics**: `class-dump.py`, `class-methods.py`, `switch-parse.py`
- **chunking debates**: `chunk-index-surface-scan.py`, `chunk-reachability-scan.py`
- **AR3 satellite chain**: `sat-scan.py` (+2, 3)
- **debug builds**: `debugbuild_lootdump.py` (lootdump zips)
- **no-infinity doctrine (mintscan)**: `mintscan.py` (closure + expanding-cycle
  audit over runtime dumps -> MINT-REPORT.md), `mintscan-corpus.py` (static
  fixture builder from jars — stand-in until a real /mintdump pass). Inputs:
  `kubejs/export/mint/*` (from minebricks_mintdump.js), `kubejs/export/loot/*`
  (from /lootdump), `GROWTH-DIALS.json` + `WORLDGEN-SOURCES.json` (pack root,
  hand-maintained dials/sources).
