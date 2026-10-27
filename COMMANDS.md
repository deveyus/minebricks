# MINEBRICKS — MASTER COMMAND LIST (ops card)

Every command that ships in the pack, what it produces, and what to hand back.
Master copy lives in the repo (rides Pages with every push); this file is the
source of truth — new commands get added HERE first.

All are KubeJS server commands, registered `perm 2` (op-level):
- single-player: Enable Cheats on the world (or Open to LAN with Cheats) — one time
- server: `/op <you>` — one time

Each writes ONLY under `<instance>/kubejs/export/` — read-only on the world,
touches no recipes, no tags, no growth, no loot. Run the command in chat, then
grab the named folder and send it to Zee (zip is fine).

## THE CORE FOUR — all live on the update channel

- `/fooddump` - full food + nutrition corpus: every edible item with nutrition,
  saturation, eat-time, effects (component probe, not guesses)
  → deliver `kubejs/export/food/` (FOOD-DUMP.json, FOOD-INDEX.txt, FOOD-LOG.txt)
  - Run when: any food mod lands or leaves, or the ledger baseline needs a refresh.

- `/mintdump` - the industry snapshot: every registered recipe (normalized),
  every item tag with its members, block → loot-table edges
  → deliver `kubejs/export/mint/` (recipes.json, tags.json, blockloot.json, MINT-LOG.txt)
  - Run when: any mod is added, removed, or version-bumped. This is the diff
    baseline for all unification work (ore processing included).

- `/lootdump` - every loot table, one JSON per table plus a summary index
  → deliver `kubejs/export/loot/` (DUMP-INDEX.txt, per-namespace JSONs, DUMP-LOG.txt)
  - Run when: loot-affecting changes (Lootr, Tombstone, new mobs/structures).
    If the API probe fails, DUMP-LOG.txt alone is the deliverable.

- `/cropscan` - crop census + Serene Seasons gate: walks the whole block
  registry (strict CropBlock / age-property / class-name tiers), maps every
  crop to its seed, cross-references `sereneseasons:*` tags
  → deliver `kubejs/export/cropscan/` (CROP-SCAN.json, CROP-INDEX.txt, CROP-LOG.txt)
  - Run when: (A) NOW — authoring corpus for the v0.5.0 season-tag datapack;
    (B) after SS lands — the UNTAGGED list in CROP-LOG.txt must be EMPTY or
    v0.5.0 does not ship. Policy: "we've failed if we have untagged crops."

## PROBE KIT — one PoR session (v0.4.3 work)

- `/porprobe` - PoR probe kit (one session): walks `config/` for the
  emitter-config format, reflection-dumps PoR's Commands/Emissions/ChunkPollution/
  WorldData classes (syntax without guessing), and logs live MBd2 recipe events
  → deliver `kubejs/export/por-probe/` (POR-LOG.txt, POR-PROBE.json,
  POR-MBD-EVENTS.log — the last one AFTER running a recipe on any MBd2 machine)
  - Run when: the one PoR probe session. Pair it with the in-game steps in
    NEXT-UP.md (emitter attach test on an MBd2 controller + `/adpother` usage).

## CADENCE (when to run what)

| Trigger                              | Commands                          |
|--------------------------------------|-----------------------------------|
| Any mod add / remove / bump          | `/mintdump` + `/lootdump`         |
| Food mods touched                    | + `/fooddump`                     |
| Seasons pass work (v0.5.0)           | `/cropscan` — A before, B after   |
| PoR probe session (once, v0.4.3 work)| `/porprobe` (+ `/adpother` usage) |
| Fresh install / brand-new world      | all four once, send all folders   |

## NOT COMMANDS (staged KubeJS drafts — nothing to run yet)

- `minebricks_backpack_knobs.js` — Sophisticated Backpacks dials (staged; route A/B pending)
- `minebricks_ar3_supply_pass.js` — AR3 uncraftables recipe pass (DRAFT; cost dials pending)
- `minebricks_gps_gate.js` — GPS gate, Shape B skeleton (spec locked; not shipped)

## VANILLA OPS (one-time, not ours)

- `/reload` re-runs KubeJS server scripts after manual edits — fine for script
  and config tweaks; any mod add/remove always wants a full restart instead.
- Everything else command-shaped in the pack belongs to mods (spark, Jade, etc.)
  — if a probe needs one of those, it gets documented here with the same
  command → deliverable format.

## FOOTNOTE

`/cropscan` and `/porprobe` joined after the v0.4.2 tag, so they ride the update
channel (Pages) but not the v0.4.2 release zip — they land in the next tagged
release. The other three shipped with v0.4.2. Same for the staged mods (10-27):
PoR + ForgeEndertech + Advanced Chimneys — bootstrapper delivers on next launch.
