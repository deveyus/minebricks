# NEXT-UP — the pick menu (staged 2026-10-26 ~02:45 UTC; reshaped after lead steering ~02:46Z)

Everything empty in the pack now has a draft sitting in it. Nothing is decided,
nothing is shipped — every numbered item below is the pack lead's pick. Zero
rush; this file keeps.

**CORE DESIGN GOAL — received 2026-10-26 20:12Z, standing rule (hers, verbatim):**
"We should be aware of and prepared for and removing where possible all forms of
'infinity'." (Why the pack has no solar panels, no passive water wheels.) This is
now the vetting gate for every mod, recipe, and mechanic — "does this mint
something from nothing?"

Vector ledger (doctrine-active, audit queued):
- **Water** — toffel's Finite Water approved: infinite-source creation denied
  outside config-whitelisted biomes (oceans/rivers/beaches default).
- **Wood** — Dynamic Trees approved WITH enforcement: no vanilla tree gen. DT
  vanilla replacement + DT–Terralith compat (both on 1.21.1); post-install
  fresh-chunk census scan for any vanilla trunk = failure signal. Open vectors
  flagged for the audit: bamboo, kelp, nether trees, cave vines.
- **Energy** — no solar/passive-gen, existing doctrine; fuel-burn chains only.
- **Bulk water transport** — verified jar-side: Railcraft Reborn tank cart =
  32 buckets default (config knob 4–512, transfer 32 mB/t); Little Logistics
  Fluid Tank Train Car + Fluid Tank Barge = 10 buckets each (source-verified,
  `CAPACITY = BUCKET_VOLUME * 10`). Doctrine-consistent scaling = convoys
  (more cars/barges, volume bought with steel + train length), config knob held
  in reserve. Railcraft iron tanks for static storage.
- **Audit pending, untouched** — lava dripstone farming, cobble generators,
  villager trade loops. Nothing installed touches them yet.

**Mintscan v1 — SHIPPED 20:36Z+ (doctrine audit instrumented):** the loop-detection
tool she greenlit with one correction: ground truth = **debug outputs**, not jar
parsing, because verification must run against the KubeJS-modified graph.
- `/mintdump` (`minebricks_mintdump.js`) captures the runtime post-KubeJS graph:
  recipes (normalized, tags pre-resolved), item tags, block→loot-table edges →
  `kubejs/export/mint/`. Loot contents ride `/lootdump`. Rides the next debug build.
- `tools/mintscan.py` consumes dumps + `GROWTH-DIALS.json` + `WORLDGEN-SOURCES.json`
  (pack root, hand-maintained) → pass 1 fixpoint closure, pass 2 log-space
  expanding-cycle detection → `MINT-REPORT.md`, every edge citing its recipe id.
- Static fixture (`tools/mintscan-corpus.py`) previewed the audit early: **0 ungated
  mints** in 5943 jar-side recipes; 14 gated growths (all on dials with gates on
  record); 134 flat parity loops; closure 63.2% of observed items. Fixture caveat:
  pre-KubeJS, quarantines fluid-driven recipe types (PM casting) — runtime dump supersedes.
- Verification loop from here: change KubeJS scripts → `/mintdump` → mintscan →
  diff MINT-REPORT. Our own recipes get audited by the same gate.

**Tank cart variants — HELD (her call 20:36Z):** revisit only if convoys prove
insufficient. Ladder remains LL 10 / RC 32 / convoy n×32 / RC iron tank (static);
custom entities need a Java companion mod (KubeJS can't register entities on 1.21).

**Barrel status (all seven approved 20:12Z, with conditions):** Farmer's Delight
clean · Spice of Life Onion clean (config blocked on food math — `/fooddump`
tool built, `minebricks_fooddump.js`, rides the next debug build) · toffel's
Finite Water clean · Dynamic Trees + Terralith compat + DT Plus (no-vanilla-gen
census gate) · Apotheosis conditional: spawner offering OFF, stat fixes ON,
massive-tuning pass its own loop (if Apothic-Spawners proves a hard dep, jar
goes in with features config-zeroed — resolved from mods.toml at add time) ·
Cataclysm conditional: prune list = pack lead's marks · Baubley Heart
Canisters clean. Add pass (fetch → sha512 → mods.toml inspect → packwiz add →
verify → push) runs after food-dump math + prune marks.

**Steering received 2026-10-26 02:46Z (supersedes the original menu order):**
1. AR3 recipe pass is BLOCKED by pending mod additions. Open questions: does
   AR3 bring its full complement of old machines (answer, jar-verified: NO —
   flight chain only, zero processing machines; see MACHINE-INVENTORY.md), a
   global machine inventory (now done: MACHINE-INVENTORY.md), and finishing
   the Ore work. Her 5-point plan lands after that — space held, no probing.
2. Full loot pass agreed — debug-script loop: Zee builds, lead runs in-game,
   output files come back, work through them together. Debug build shipped:
   minebricks-debugbuild-lootdump-1.zip (/lootdump; jar-side census already
   done: LOOT-CENSUS.md).
3. GPS gate confirmed: needs in-game probe time; probe outputs will likely be
   debug-script files in the same loop.
4. Prospecting v2 scope clarified: it is the SCANNER layer only (hammer
   down-click scanner + chunk ledger + three-ping triangulation). The ore
   processing lines (per-metal crushed, wash split, slurries, molten chain)
   are a separate pinned-but-undesigned chain under Grand Vision: Ore.
   Remaining on the hammer half: her "good" on dial sheet v2 + the chunk
   ledger (now fully in-script, see below) + build-time reachability probes.

**Chunk ledger ruling (03:06Z, lead-corrected + jar-verified):** the ~100-line
Java companion is DEAD. KubeJS 7.2 build 377 ships the class-loader path
natively: NativeEventWrapper.onEvent(eventClass, fn) routes non-IModBusEvent
classes to NeoForge.EVENT_BUS (addListener(Class, Consumer) verified in bus
8.0.5, the version pinned by neoforge 21.1.265's POM). One correction:
isNewChunk() does NOT exist in vanilla 1.21.1 (0 hits in official mappings).
First-touch/write-once now rides ChunkDataEvent.Save: if the chunk's own data
tag (getData()) lacks our key, append to the ledger AND stamp the marker into
the same compound — marker and chunk NBT hit disk in one write, server thread.
Exactly-once by construction, never-miss unchanged, zero Java. Ledger probe
rides the next debug build.

*Provenance + reconciliation (03:22Z):* the pure-JS direction was first
envisioned by Zee earlier that night (msg 1564044222074724383, "Java owns
nothing", spec amended to C-pure-JS) — but that sketch's write-once guard
called `ev.isNewChunk`, an API that does not exist in 1.21.1, and a later
pinned note slid back to the Java-companion split. Current ruling = the
envisioning stands (NativeEvents binding verified in BuiltinKubeJSPlugin,
persistentData storage, startup-script registration, off-thread queue caveat)
with the guard replaced by the ChunkDataEvent.Save marker. Indexing at load
stays; ledger append is marker-gated, so a persistentData wipe can never
double-log. One design, no flip-flop.
5. None of the original menu items stand as-is — sequencing now flows through
   the machine inventory + ore work + her 5-point plan.

**Staging note:** the `kubejs/` folder is staged but deliberately NOT indexed
(no `packwiz refresh` yet). The moment picks land, refresh + verify ships them
to everyone.

---

## 1. AR3 supply pass — costs are dials
`kubejs/server_scripts/minebricks_ar3_supply_pass.js`

Full recipe draft for the satellite chain (Phase 1), rocket chain (Phase 2),
suit/support (Phase 3). All IDs pulled live from the AR3 jar — nothing guessed.
Every cost is a DIAL (D-1 … D-12) listed at the top of the file with suggested
vanilla-only defaults.

**Pick:** bless the defaults, or turn any dial. Phase 1 is the only
gate-relevant part — Phases 2–3 can wait for a later pass.

## 2. GPS gate — skeleton built to the locked spec
`kubejs/server_scripts/minebricks_gps_gate.js`

Copy is LOCKED (TOWER CLEARED → ORBITAL INSERTION COMPLETE → "Map stream
commencing." — no closer, no failure branch, repeat launches silent, exactly as
ruled). Data model and join hook are written. What it needs next is **in-game
probe time, not decisions**:

- P1 — real rocket entity id (spawned-event filter)
- P2 — program-data read (satellite mission vs asteroid/gas launch)
- P3 — station-position correlation (her rocket from her pad)
- P4 — is the Satellite item assembler output or craftable?
- P5 — persistentData survives a real save/load; marker send-channel check

**Pick:** none needed — just bring P1–P5 to the next time we're in the world
together. (P4 doubles as the supply-pass correctness check.)

## 3. Backpack knobs — two dials
`kubejs/server_scripts/minebricks_backpack_knobs.js`

- **Stack upgrades off:** Route A (KubeJS, script-layer) vs Route B (native
  server config). Both sketched, nothing fires until the pick.
- **Loot spawns:** keep (backpacks in loot chests, mobs wearing them) or kill.

**Pick:** A or B; keep or kill.

## 4. Prospecting v2 — her verdict pending
Scan tools are built (ore palette, chunk-index surface scan, reachability,
tier/range scans — all in `scripts/`). Awaiting the lead's "good" on v2; the
worked example (three pings on a real map) assembles the moment the verdict
lands.

**Pick:** "good" / "change X". Nothing else.

## 5. AR3 planets — later, but recorded
BOP is not in the pack, so planets go vanilla-biome unless we add BOP or write
custom planet jsons.

**Pick (whenever):** BOP in, custom jsons, or vanilla-biome is fine for now.

## 6. Parked candidates — one command each, zero commitment
Run inside `friend-pack/`, then `packwiz refresh`:

- Chipped 4.0.2 (the breadth king — costs atlas size): `packwiz modrinth add chipped athena-ctm resourceful-lib`
- NiftyBlocks 1.35.6: `packwiz modrinth add niftyblocks`
- Othertime 2.1.7.1: `packwiz modrinth add othertime`
- Sophisticated Storage 1.6.9.2199: `packwiz modrinth add sophisticated-storage sophisticated-core puzzles-lib`
- JEI 19.70.0.460: `packwiz modrinth add jei`

## 7. Server build checklist (no pick needed — happens at server time)
- `server.properties`: `enforce-secure-profiles=false` (makes the chat-privacy
  setup actually hold)
- `faun.properties` per friend, per setting (client-side)
- `packwiz refresh` after any pick above
