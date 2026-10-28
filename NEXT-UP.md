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

**Release pipeline — SHIPPED 21:49Z; TRIMMED 23:34Z by ruling:**
tag `v*` → GitHub Actions → ONE artifact + SHA256SUMS on a Release:
- ~~`minebricks-mr-<ver>.mrpack`~~ — KILLED 23:34Z (launcher-import format; Modrinth
  App has no pre-launch hook, so it existed solely for that launcher).
- ~~`minebricks-cf-<ver>.zip`~~ — KILLED 23:34Z (launcher-import format; 52 MR jars
  embedded because CF manifests can't reference them; CF app has no pre-launch hook).
- `minebricks-packwiz-<ver>.zip` — raw packwiz pack (78 KB): full refreshed
  index (mods + kubejs), installer-functional. The only release artifact.
- Mechanics: packwiz pinned at 170b22d7 (prebuilt binaries confirmed upstream);
  refresh() upgrades the workspace index to FULL in-place — the zip is
  installer-functional by design and CI downloads zero jars (runs in seconds).
  `.packwizignore` keeps tools/, docs, dials, and fixtures out of the output.
  Dry-runs: Actions "Release" dispatch → artifact without release. First release =
  `v0.4.1` (pack.toml version) — its mrpack/CF assets were pruned and body rewritten
  bootstrapper-first.
- Design note 23:15Z (her challenge, answered): the bootstrapper route needs ZERO
  embedded jars — the CF zip (52 embedded MR jars, 98.8 MB) and mrpack (5 embedded
  CF jars, 3.8 MB) exist solely for launchers WITHOUT pre-launch hooks (CurseForge
  app, Modrinth App).
- **RULING 23:34Z (her, verbatim: "Then we kill the releases that do not support
  it; plain and simple."):** mrpack + CF zip are DEAD. Release matrix = raw
  packwiz zip + SHA256SUMS; bootstrapper/Pages = THE route. release.yml rewritten
  (no cf/mr export), v0.4.1 assets pruned, body rewritten bootstrapper-first, the
  "Easy There" note retired with the import formats. Consequence: Prism users
  lose one-click import but gain auto-update; Modrinth App / CF app users have
  no route (accepted by ruling).
- Flag: manifest/pack name still reads "Friend Pack (working title)" — branding
  stamp is one `pack.toml` edit away, pack lead's call.

**Bootstrapper + GitHub Pages — LIVE 22:26Z+ (the agreed auto-update route):**
every push to main deploys the full pack (refreshed index: 75 mods as of v0.4.2
+ kubejs) to
`https://deveyus.github.io/minebricks/pack.toml`. Install once, updates flow on
launch — releases (tag route) are for initial distribution, Pages is the live
channel:
- **Client (Prism/MultiMC):** `packwiz-installer-bootstrap.jar`
  (stable link: `github.com/packwiz/packwiz-installer-bootstrap/releases/latest/download/packwiz-installer-bootstrap.jar`)
  into the instance's **minecraft/ game folder** — CORRECTED 23:55Z against Prism
  source (`MinecraftInstance::gameRoot()`): game root = `<instance>/minecraft/`
  by default (`.minecraft` only if it exists), NOT the instance root. The jar-in-
  instance-root instruction below was WRONG — packwiz-installer installs next to
  the jar, so mods would land where Prism never looks. Correct pre-launch:
  `"$INST_JAVA" -jar "$INST_MC_DIR/packwiz-installer-bootstrap.jar" https://deveyus.github.io/minebricks/pack.toml`.
  No `--multimc-folder` flag needed: it defaults to the PARENT of the pack dir =
  instance root = exactly where mmc-pack.json lives.
- **E2E-verified 2026-10-26 ~23:25Z, PARTIALLY RETRACTED 23:55Z** (first live
  bootstrapper run, Prism-shaped sandbox instance → live Pages): 65/65 entries
  delivered (57 mods + 6 scripts + 2 .keep), "Finished successfully!" — delivery
  + loader rewrite verified mechanically. RETRACTED: the sandbox's layout
  inference ("Prism has no .minecraft folder, mods at instance root") — Prism
  source says game root = `<instance>/minecraft/`; the sandbox was not a real
  import layout. The `--multimc-folder .` requirement was an artifact of placing
  the jar in instance root (wrong place). Real route = Meldworks shape, no flags.
- **Server:** `java -jar packwiz-installer-bootstrap.jar -g -s server https://deveyus.github.io/minebricks/pack.toml`
  — the `-s server` filter works because all 6 client-only mods carry side metadata.
- Still-valid sandbox finding: first-ever run fetches packwiz-installer.jar via
  UNAUTHENTICATED api.github.com (rate-limit shared per IP, 60/hr); 403 there is
  fatal when no cached jar exists, survivable afterward. Offline fallback:
  `--bootstrap-no-update --bootstrap-main-jar packwiz-installer.jar`, or chainload
  via `packwiz-installer-bootstrap.properties` (`packwiz.chainload.jar=<path>`).

**Prism instance zip — SHIPPED 23:55Z (her import-error report + Meldworks pointer):**
"Archive does not contain a recognized modpack type" = Prism's Import-from-zip
only speaks three formats: Modrinth `modrinth.index.json`, CF `manifest.json`,
and Prism's own instance-export pair (`instance.cfg` + `mmc-pack.json`). The raw
packwiz zip speaks none of them — expected behavior, not a packaging bug.
Fix (her Meldworks shape, verified working in daily use): the release now also
ships `minebricks-prism-instance-<tag>.zip` — a synthetic Prism instance export:
- `instance.cfg` — Name + `PreLaunchCommand="$INST_JAVA" -jar
  "$INST_MC_DIR/packwiz-installer-bootstrap.jar" <Pages pack.toml URL>`
- `mmc-pack.json` — net.minecraft 1.21.1 + net.neoforged 21.1.265 components
- `minecraft/packwiz-installer-bootstrap.jar` — the ONLY embedded binary (~100 KB)
Import → launch → packwiz syncs all 57 mods + scripts + config from Pages; loader
versions auto-set via mmc-pack.json. Zero mod bytes packed, no mrpack revival
(the bootstrapper IS the update channel — an mrpack would freeze the pack at
import time). `config/prism/` templates live in-repo, packwiz-ignored;
release.yml assembles the zip per tag (envsubst, same substitution Meldworks uses).
- Deployment = `.github/workflows/pages.yml`: packwiz refresh → stage
  (packwiz-ignored files stay out) → actions/deploy-pages. Concurrency-guarded;
  also hand-triggerable via dispatch.

**Mod dump v0.4.2 — SHIPPED (her call 00:0xZ, msg 1564432106233397329):** "The no
question tier is an easy include. Do it." — 18 mods staged from the Meldworks
diff, packwiz-refreshed, shipped as v0.4.2:
- Tier-1 QoL: Corail Tombstone · Jade · Mouse Tweaks · Toast Control ·
  Controlling + Searchables · spark · Lootr.
- Easy wins: Supplementaries (moonlight stays OURS at 3.7.2 — newer than
  Meldworks' 3.0.6, same lib line) · NuclearCraft Neohaul ("extremely fitting").
- Food suite: Farmer's Delight (PROMOTED from barrel — Cultural Delights
  hard-depends on it, and her "Lets do" blesses the suite FD anchors) ·
  Cultural Delights · [Let's Do] API + Brewery + Farm & Charm + Herbal Brews +
  Meadow + Vinery (Meldworks' exact family set).
- Helms-deep review (her words, parked): **BOMD** + **Relics** — need a
  fine-grained balance pass before any add.
- Moonlight version note: we run 3.7.2 (ours, newer); Meldworks pins 3.0.6.
  Supplementaries 3.6.4 runs on both; no bump needed.
- 6 of the 18 ride CF metadata (Tombstone, Toast Control, do-api, Herbal Brews,
  Meadow, Vinery) — consistent with the 5 CF mods already in the pack.

**Serene Seasons + Spoiled — SEASONS PASS PLAN v0.5.0 (direction blessed 00:39Z;
her amendments folded in):** her question "isn't the worst idea... thoughts?"
answered YES — seasons are what turn the food suite from sticker pack into a
system — with two rulings attached:
- **RULING (her, verbatim): "we've failed if we have untagged crops."** The
  grow-anywhere default is NOT an acceptable fallback. Every crop we ship gets
  an explicit season. Enforcement = instrument, not vibes (below).
- **RULING: "this is another case for a debug script, clearly."** SHIPPED:
  `kubejs/server_scripts/minebricks_cropscan.js` — `/cropscan` (perm 2) walks
  the block registry, detects crops in three tiers (strict = CropBlock
  instance; extended = integer age property; special = class-name hints), maps
  each to seed item, reads its tags, and writes
  `kubejs/export/cropscan/{CROP-SCAN.json, CROP-INDEX.txt, CROP-LOG.txt}`.
  Phase A (pre-SS) = authoring corpus for the season datapack. Phase B
  (post-SS) = the gate: any strict crop with zero `sereneseasons:*` tags lands
  on the UNTAGGED failure list. v0.5.0 does not ship with a non-empty gate.

The pass itself (in ship order):
1. **Crop census first** — `/cropscan` phase A run on the current pack (+ again
   after every food-suite wave) — every detected crop gets a season assignment
   written into our datapack tags. Zero-untagged by construction, verified by
   the phase-B gate.
2. **Biome audit** — Tectonic/Terralith/custom biomes get a seasons-blacklist
   pass (else tropics snow over); vanilla categories handle themselves.
3. **Config dials** — SS crop growth = slow-not-destroy; winter pressures,
   doesn't kill; Spoiled rates keyed to season multipliers (summer rot up,
   winter down — the preservation economy).
4. **Free starting point** — Meldworks runs exactly this pairing (SS + Spoiled,
   both mods + tuned configs in their repo) — we crib their configs as the
   base, then turn our dials.
5. **Ship as its own tag (v0.5.0)** — seasons change worldgen FEEL; one-tag
   revert if the friends hate winter. Gate for shipping: cropscan phase-B
   failure list EMPTY.

**Ancient Warfare 3 × Multiblocked2 — ANALYZED (her ask: "can we work out a way
to make AW NPCs work on MBd2 machines?"):** Verdict: **yes — native capability
interop, no Java bridge, no fake player needed.** Jar-verified (aw_npc 0.3.6 +
aw_worksite 0.2.3 + MBD2 21.1.2):
- AW3's `UnloadInventoryProgram` is a generic capability mover: NPC extracts
  from its own hands (`canExtract`/`extractItem`) and inserts into whatever
  IItemHandler sits at the routing target (`targetPos`/`targetInventory`,
  `insertStackIntoInventory`) — machine-agnostic by construction.
- MBd2 machines expose standard item caps via `ItemSlotCapabilityTrait` on IO
  parts (per-trait filter + auto-io toggles built into the trait definition).
- MBd2 `RecipeLogic` runs GT-style: `findAndHandleRecipe` auto-searches from
  whatever inputs are present — items an NPC drops in START processing, no GUI
  click, no right-click interaction required.
- Closed loop available: AW3 WarehouseInterface auto-push/pulls adjacent caps
  (config: `automatic_warehouse_interface`) — so the static path is
  warehouse ⇄ interface ⇄ MBd2 IO hatch, and NPCs are the walking middle mile
  via routing orders where adjacency fails.
- Open items before declaring victory: (a) our MBd2 multiblock definitions need
  item IO parts with the capability trait — definition-side work in our
  machine JSONs; (b) in-game probe: confirm routing-order UI accepts arbitrary
  (non-AW) block positions as dump targets; (c) decide AW3 in vs its weight —
  it's TWO modules (npcs + worksites) and a big identity add.

**AW3 FOLLOW-UP 00:39Z — her correction: "That handles moving. I want to know
if they can WORK at MBd2 machines as a worksite." Verdict: NO — and this one
is settled, not conditional.** Jar-verified:
- Worksite binding is hard-typed to AW's own block entities:
  `MainFarmingProgram` carries the descriptor `LWorkSites/CropFarm/EntityCropFarm`
  in its constant pool; `UseMillStoneProgram` targets
  `LAOSWorkshopExpansion/MillStone/EntityMillStone`. NPCs discover and service
  sites by concrete BE class (per-type known-sites lists), never by capability
  or interface.
- `WorkSites/Registry` = 7 static BE types (crop farm, fish farm, quarry, tree
  farm, warehouse, warehouse crafter, warehouse interface). No registration
  API surfaced anywhere in either jar.
- License is **All Rights Reserved**, no source link on Modrinth — no addon
  path, no companion worksite, nothing to crib. An "MBd2 machine as worksite"
  would need the author to build it.
- Side discovery: `EntityWorkSiteBase` extends `AgeOfSteam/Core/AbstractMechanicalBlock`
  — this AW3 is built on the Age of Steam mechanical-power core (same author
  family; also explains the millstone expansion hook). Worksites are
  steam/mechanical machines, not just inventory blocks.
- `EntityWarehouseCrafter` autocrafts VANILLA `CraftingRecipe` entries from
  warehouse stock (RecipeManager/asCraftInput in pool) — MBd2 recipes are not
  vanilla crafting recipes, so the crafter cannot drive MBd2 either.
- **The architecture that actually exists:** AW3 owns LABOR (farms, quarry,
  fishing, vanilla-shape autocrafting — all AW blocks, NPC-serviced), MBd2
  owns PROCESSING (capability-fed, RecipeLogic auto-run), and the only native
  seam between the two families is LOGISTICS — which is the part verified
  working. Practical chain: AW quarry works the ore field → warehouse stock →
  NPC routing/ferry (or auto warehouse-interface where adjacency allows) →
  MBd2 IO hatches → auto-processing → AutoIO out → back to warehouse. Nobody
  "works at" the machine; the system works.

**RULING 00:49Z — AW3 DROPPED.** Her call, on the worksite verdict: "Then we
drop AW3." With the worksite seam closed by hard-typed BE classes + ARR license,
the entire integration value would have been logistics-only — not worth two
modules and the Age-of-Steam core dependency. All analysis above stays on
record as the reference: any future labor/companion mod gets the worksite-API
question asked BEFORE evaluation time (typed site registry vs capability-based
site discovery), not after a jar dive.

**Emendatus Enigmatica — LOOK DONE (her call: "absolutely worth a look");
verdict: worth prototyping, gated on a materials audit.** Jar-verified (EE
2.2.0-alpha-3, neoforge 21.1.172+ ⇒ ours 21.1.265 OK, MC 1.21.1 only dep):
- What it is: a material-registrar hub — define materials in config JSONs, it
  registers ore/ingot/dust/gem blocks + items and tags everything under common
  `c:` namespaces; plugin API (`IEmendatusPlugin`) lets other mods hook in.
- The kicker for us: EE 2.x ships its OWN worldgen feature kit — DenseOre,
  DikeOre, GeodeOre, SphereOre + `MultiStrataRuleTest` — all data-driven, so
  its ore placement can be pointed directly at our `minebricks:has_<metal>_fields`
  biome tags. Its Sphere/Dense feature shapes read like field-shaped deposits.
- Two integration modes: (A) EE worldgen scoped to field biomes — EE features
  become the field fill for EE metals; (B) EE worldgen OFF per material — EE
  as pure registry/tag/item-form layer, our features stay the sole placement.
- Bonus fit: tool-material validators in-jar ⇒ Silent Gear material bridge
  potential (we run SG + Silent Gems + sgearmetalworks).
- Risks: alpha-3 (config validation API still churning — but they ship their
  own validators); duplicate-metals overlap with our existing custom metal set
  — the audit decides which side owns each metal. NOT auto-added.
- **GOAL AMENDED 00:39Z (her): "For materials the goal is full unification."**
  Not partial tag-bridging — the whole metal set lives in one registry/tag
  system. And the sequencing changed: she owes the **ore-processing front-to-
  back workup tonight (after dinner)** — the pinned-but-undesigned chain (per-
  metal crushed, wash split, slurries, molten). The EE prototype + the
  materials audit FOLD INTO that workup as its materials layer, they are not a
  parallel track. Ready inputs on record: `scratch/materials_scan.json`,
  `WORLDGEN-SOURCES.json`, ore palette scans, `MACHINE-INVENTORY.md`.

**Barrel status (remaining five approved 20:12Z, with conditions):**
Farmer's Delight PROMOTED to shipped in v0.4.2 (see mod dump above) · Spice of
Life Onion clean (config blocked on food math — `/fooddump`
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

**Staging note:** the `kubejs/` folder is staged and indexed (8 files ride the
index). Every pick lands via `packwiz refresh` + push — that IS the ship
button, it goes to everyone on next launch.

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

---

**Pollution of the Realms × per-recipe pollution — LOOK DONE (her ask: "pollution per
recipe, not just per machine?"); verdict: NATIVE = per-machine only, but PER-RECIPE IS
ACHIEVABLE with zero Java via the MBd2 KubeJS bridge.** Jar-verified (PoR 9.1.13.0
AdPother + ForgeEndertech 12.1.4.0, both native NeoForge 1.21.1 builds, dep chain
PoR→FE≥12.1.4.0, both Edivad89/Endertech, actively maintained):
- How PoR decides who pollutes: emitter DEFINITIONS in a config file (ForgeEmitter:
  type BLOCK/TILE/ENTITY/FUEL, per-entry pollutant+amount, globalRate per pollutant)
  attached to arbitrary block IDs at post-init (EmittersInit.attachToStates). Third-party
  machine compat = hand-written mixins per mod family (Create, Mekanism, AdAstra,
  ProductiveMetalworks, powah, bigcannons…) — NOT a generic API. BUT attachment itself
  is config-driven → we can register emitters for OUR OWN machine blocks with zero code.
- TILE type = polled once per second; `activeTag` = NBT key gating "considered active"
  (0/false = silent); `identityTag` = NBT disambiguation; `relatedBlocks` = "blocks
  considered part of this multiblock". FUEL type (per-fuel-consumption hook) is
  furnace-shaped — MBd2 is not fuel-driven, so TILE+activeTag is our native shape.
- Per-recipe natively: NO. `recipes/` package = PoR's own filter-change recipe only; no
  recipe hooks; no KubeJS/CraftTweaker strings anywhere in the PoR jar.
- THE SEAM: MBD2 ships a native KubeJS event bridge (integration/kubejs/events/
  MBDServerEvents): MACHINE_ON_RECIPE_FINISH, ON/AFTER/BEFORE_RECIPE_WORKING,
  RECIPE_STATUS_CHANGED, MACHINE_ON_CONSUME_INPUTS_AFTER_WORKING, STRUCTURE_FORMED,
  TICK — all with machine context. KubeJS can listen per recipe-finish.
- Two zero-Java architectures:
  (A) EVENT-PULSE — /adpother debug command surface (emitAt/emitFrom/clean/chunkStats
  + amount/quantity args in the command pool) called from KubeJS on
  MACHINE_ON_RECIPE_FINISH with per-recipe amounts. Exact syntax = in-game probe.
  Quieter variant: KJS direct-call of PoR's chunk-pollution write path
  (cropscan-style Java.loadClass probe, signatures TBD).
  (B) DEFINITION-GRANULARITY — per-route MBd2 controllers ("Sulfide Route"/"Oxide
  Route" as distinct controller blocks with partitioned recipe subsets) → each gets
  its own emitter config entry with its own pollutant/amount. Deterministic, no event
  plumbing; cost = more definitions to maintain.
  Hybrid recommended: (B) for route-level identity + (A) for per-recipe seasoning.
- Consequences side fully config-tunable: BlockImpactList (damage/kill/replace actions),
  FluidImpactList, EntityBlackWhiteList, per-biome reload — smog/acid severity is ours.
- Open probes (one in-game session): (1) emitter config file path/format after first
  boot; (2) /adpother command tree + emitAt syntax; (3) emitter entry attaching to an
  MBd2 controller block (TILE + activeTag live test); (4) KJS direct-write probe
  (ChunkPollution/WorldData signatures). Pack cost: +2 mods (PoR + ForgeEndertech).
- STAGED 10-27 (~10:58Z, her green-light): PoR AdPother 1.21.1-9.1.13.0 NF build.1236
  + ForgeEndertech 1.21.1-12.1.4.0 NF build.1161 — the exact builds analyzed — added
  via packwiz, Modrinth CDN + sha512 pinned, index +2 (75→77 mods). Rides Pages;
  bootstrapper delivers on next launch; lands in the next tagged release.
- Probe kit staged: `minebricks_por_probe.js` — `/porprobe` (perm 2) walks config/
  for the emitter format, reflection-dumps Commands/Emissions/WorldData/ChunkPollution/
  Emitter/Pollutants/Emitters (syntax without guessing), + always-on log-only MBd2
  KubeJS listeners (MACHINE_ON_RECIPE_FINISH, BEFORE/AFTER_RECIPE_WORKING,
  RECIPE_STATUS_CHANGED, MACHINE_ON_CONSUME_INPUTS_AFTER_WORKING, STRUCTURE_FORMED)
  writing kubejs/export/por-probe/POR-MBD-EVENTS.log. Covers probes (1)+(2)+(4)
  offline; (3) stays a live test on an MBd2 controller.
- EMI/JEI visibility ruling (her question, answered 10-27): (A) invisible — recipes
  untouched, emission is a side-effect on recipe-finish events; recipe viewers render
  declared I/O only. (B) also NOT auto-shown — emitters live in PoR config keyed to
  controller block IDs, no recipe viewer reads mod configs; what (B) DOES surface is
  route identity (each route controller = its own recipe category, nameable). If
  in-recipe numbers are ever wanted: hybrid display trick — a real exhaust byproduct
  on the recipe (renders in EMI/JEI) + (A) emission derived from that same byproduct
  (one source of truth).
- ADVANCED CHIMNEYS STAGED 10-27 (~11:20Z, her call: "we'll want Advanced Chimneys
  too, if we have PoR"): AdChimneys 1.21.1-11.1.14.0 NF build.1236 (r2rWUhnP/A2wTbGn9),
  dep = ForgeEndertech only (already staged). Same build lineage as PoR build.1236.
  Index 77→78.
- Chimney×PoR seam (jar-verified): AdChimneys has ZERO knowledge of PoR; PoR knows
  chimneys via the shared ForgeEndertech interface `ISmokeContainer` (Chimney/Pipe/
  Duct/Pump/Container all implement it) — PoR's gas entities duck-check isChimney/
  getTopPassableChimneys/getSidePassableChimneys/getPumpedChimneyAirflow/isVentDuct,
  so pollution gas ROUTES THROUGH chimney geometry and pumped airflow. Pump = FE-
  powered extractor (energyStorage + getConnectedHopper + getTopmostChimney) = the
  soot-collection loop. Chimneys go sooty via mixins (visual pollution feedback).
- Chimney source list: config-driven via the same FE UnitConfig framework as PoR's
  emitters (AdChimneys init/Emitters + getConfigFile). Hand-written compat defaults
  for Create/Mekanism/GTCEu/IE/Railcraft/ProductiveMetalworks/vanilla — NO MBd2 entry.
  OPEN: can we add our MBd2 controllers as smoke sources by config unit alone?
- Probe list updated (probe 5): AdChimneys smoke-config file path/format + custom
  unit for `multiblocked2:*` controllers + TILE-emitter × chimney-top interplay
  (does a config emitter on the controller vent via chimney column, and does PoR's
  chunk-pollution accounting follow the chimney or stay at the machine). /porprobe
  extended: config walk now matches adch|chimney, reflection list gained
  ISmokeContainer + AdChimneys Emitters/Emitter.

**ORE TEMPLATE — RECEIVED 2026-10-27 ~12:43Z (msg 1564620620283519167).** Her six-tier
generic ore-processing workup — the EE-unification input this lane was waiting on:
T1 Jaw Crusher (1 raw → 2 crushed) → T1.5 Wash Trommel (barren aggregate → civil
engineering/ballast; generic slurry → sedimentation SAFETY NET: reclaimed saline
water → evaporation → flux salts; heavy mud → sluice → core metals, anti
vein-finding-deadlock) → T3 Ball Mill + Separator (physical matrix fraction →
cleaved secondary: magnetite/quartz) → T4 Rotary Roaster + Scrubber (volatile
off-gas → pollution hazard → wet scrubber → industrial acids) → T5 Pressurized
Autoclave + acid (insoluble anode sludge → Au/Ag/PGM concentrate) → T6 Electrolytic
Bath + chemical fractionation (ultra-pure primary 32x + precious byproducts 32x =
64 TOTAL). Counts explicitly TEMPORARY ("generic template meant to give you an
idea"). Design reads: anode sludge = real electrorefining chemistry; sedimentation
water reclaim = infinity-doctrine-clean; sluice = anti-deadlock pair for the scanner.

**DIAL SHEET D-O — delivered 12:47Z (defaults live unless vetoed by number):**
- **O1 machine sourcing:** roster check (78 mods) has NO IE/Create/Mekanism/GTCEu;
  RC crusher verified ore-blind; AR3 zero processing machines → nearly the whole
  chain is Multiblocked2 build-out (trommel, sluice, evaporation, ball mill,
  separator, roaster, scrubber, autoclave, bath). NC NeoHaul electrolyzer = jar
  check before leaning on it. Phasing: spine first (crusher → ball mill → roaster →
  bath), sedimentation second, scrubber-acids third (waits on probe session). PM
  foundry stays = early 2x dirty lane the chain outclasses.
- **O2 pollution:** hazard lives at T4 only. Hybrid wiring (as ruled 10-27): real
  exhaust byproduct on roaster recipes (renders in EMI/JEI) + Route A emission
  derived from that same byproduct; Route B per-route controllers as categories.
  Scrubber self-enforces — its acids feed T5, skipping it starves leaching;
  unscrubbed roasting accrues native chunk smog.
- **O3 fluids:** slurry + PLS as real fluids (pipes, tank convoys); item fallback
  only if authoring bites.
- **O4 math:** 64x placeholder would be the largest mint in the pack (mintscan flag;
  iron-audit ceiling was Fortune III ≈ 4.4 ingots/ore). Position: full chain nets
  ≈1:1 primary metal — purity + byproducts do the rewarding, multiplication doesn't.
- **O5 sluice:** deterministic weighted yields, NO RNG lotto (gravel lotto flagged
  degenerate in iron audit), slow trickle, "core metals" = unification base set.
- **O6 material backbone:** Emendatus Enigmatica (worldgen disabled) vs hand-rolled
  KubeJS tags — her call; default EE.

**O-DIAL RULINGS — received 2026-10-27 ~12:57Z (msg 1564623984459522153):**
- **O1 (sourcing):** ground-up MBd2 building — no leaning on NC machines (NC stays
  ambient). Her technical pointer: definitions are "a textual final form wrapped up
  as an NBT" → dive ordered + notes demanded → delivered same day as **MDB2-NOTES.md**
  (jar-verified: definitions = uncompressed NBT state-machine trees; KubeJS
  `MBDRegistryEvents.machine/recipeType` = full script-only authoring path;
  per-type EMI/JEI categories confirmed in-jar).
- **O2 (pollution):** FLIPPED — emissions at ALL stages, not T4-only; sulfur-heavy
  ores scale the hazard. Plus custom pollution types wanted for the **"Biters"
  analog** (pollution drives enemy pressure, Factorio-shaped): custom PoR pollutant
  + KubeJS chunk-level read → spawn logic = probe item 7 (Pollutants registry +
  ChunkPollution read path already in the reflection dump).
- **O4 (math):** FLIPPED — mining is slow and infra-heavy, so LARGE outputs are the
  feel-good reward ("more likely to go up than down"). The ≈1:1 position retired;
  audit job = no loops + per-ore consistency only.
- **O6 (backbone):** FLIPPED — likely NO EE; unification done ourselves (KubeJS
  tags first), EE only if authoring pain says otherwise.
- O3 (real fluids) + O5 (deterministic sluice) unobjected → defaults stand.
- **FORTUNE RULING:** constrain it — keep it working, less variable than vanilla;
  per-block loot functions fix the curve at definition time. First sketch: fixed
  small steps, at most +1 at Fortune III.
- **IMMERSIVE ENGINEERING RESTORED 2026-10-27 ~13:05Z:** she flagged IE as one of
  the first adds — verified it never survived the 10-25 roster consolidation into
  the pack tree (first commit 7412c52 carried only immersive-aircraft; every census
  since repeated the gap — the roster list was read as complete). Re-staged IE
  1.21.1-12.4.2-194 (uNRARSH2) via packwiz → index 78→79, rides next launch.
  Immersive Petroleum (same lost pair) = one-word opt-in, not staged.

**TIER-1 TEST MACHINES — STAGED 2026-10-27 ~13:50Z (her go: "get the first couple
of tiers of machines in for a rudimentary test").** Built FROM SOURCE — cloned
Low-Drag-MC/Multiblocked2 (her tip: pull source, skip jar-diving; the repo's own
TestMachineBuilder / MBDSmokeFixtures were the literal templates). Deliverables:
`kubejs/startup_scripts/minebricks_mbd2_t1.js` + `kubejs/assets/minebricks/lang/en_us.json`.
- `minebricks:jaw_crusher` — 3x3x3 iron box, controller center; 1 in-slot +
  1 out-slot; recipe type `minebricks:jaw_crusher`; placeholder raw_iron ×1 →
  ×2 @ 100t.
- `minebricks:wash_trommel` — 3x3x3 iron box; in/out slots + 4B water tank;
  placeholder raw_iron + 100mB water → sand + gravel @ 60t.
- `minebricks:settling_pool` — VARIABLE flat floor, 5x5 up to 17x17 (her
  13:40Z ruling "variable size structures ... for the settling pool? 5x5 to
  say 17x17"); water tank + out-slot; placeholder sand + 250mB water → clay @ 80t.
  NOTE: the first staged version (~13:50Z) had the pool as one aisle × three
  rows = a WALL standing on edge, not a floor — caught during the variable-size
  pass (~13:55Z), fixed in the same edit (floor = one row per aisle), before her
  next launch. Nothing ran with the wall shape.
- Recipes are deliberately VANILLA-ONLY placeholders: startup scripts run before
  mod items register (IE dusts unreachable there); real I/O taxonomy = the DIY
  unification pass. Route B shape intact — one recipe type per controller →
  own EMI/JEI category.
- Registration is MANUAL (build → set blockPatternFactory → MBDRegistries.
  MACHINE_DEFINITIONS.register) because the KubeJS event's afterPosted
  auto-register cannot set blockPatternFactory (source-verified gap).
- First launch = the test: script isolation means a bad definition logs and
  skips instead of crashing. Watch "MBD2 t1: ... registered" lines in the log.
- IP RESTORED ~13:20Z: ImmersivePetroleum-1.21.1-4.5.0-39 (1nu6ZI52). Index 79→80.
- **POOL VARIABLE-SIZE RULING ~13:40Z:** "one of the awesome features of mbd2 is
  that you can make variable size structures. Can you make that happen for the
  settling pool? 5x5 to say 17x17." Implemented same hour, source-verified:
  depth via `aisleRepeatable(2, 8, row)` each side of the controller aisle
  (mod's own PatternRepetitionFixtures idiom) = 5..17 deep; width via required
  5-wide iron core + soft `any()` wings out to 17 across (terrain-tolerant —
  she can build flush into ground). Min footprint enforced by the core;
  controller must sit ≥2 blocks from every edge. Size is FORMATION-ONLY for
  now — bigger pool doesn't yet process faster/more; the scaling hook is
  MBD2 `RecipeModifier` (noted for the dial when the real pool workup lands —
  fits her O4 large-output ruling).
- GHOST FILE INCIDENT (resolved pre-push): 5 stale pre-consolidation metafiles
  (create, create-deco, athena-ctm, chipped, traveler-tool-belt) resurfaced in the
  workspace with original 10-25 mtimes + exec-bit flips on the PoR trio —
  platform-side restore quirk; push script verified one-directional and clean.
  Deleted, modes restored, refresh re-run → index exactly 80. Nothing shipped
  in that state.

**CURSEFORGE-API DETANGLE 2026-10-27 ~17:30Z (her find, her question).** During the
first v0.4.2 launch she spotted "the failure path asks for it twice" on Corail
Tombstone and asked: ride it along directly, or would that violate the author's
wishes? Source-verified against packwiz-installer (main branch): 6 of our 80 mods
rode `metadata:curseforge` — the installer resolves those through
api.curseforge.com with its embedded key; Tombstone file 7951535 returns
downloadUrl NULL (Corail31 disabled external downloads on CF) → "excluded from
the CurseForge API, must be downloaded manually" exception → its CONTINUE button
re-runs the resolve = the literal double-ask she watched. The other 5 resolved
but stayed one API hiccup from the same dialog.
- FIX APPLIED: Tombstone → **Modrinth** (author's own MR page, YT5K34AB);
  9.4.9 is not carried on MR → patch bump to 9.5.6 (neoforge-1.21.1-9.5.6,
  sha512 from MR API). Other 5 (Let's Do API/HerbalBrews/Meadow/Vinery, Toast
  Control) → **direct official CDN URLs pinned** (sha512 computed from the jars
  themselves; same pattern as Antique Atlas/ToolBelt). All five verified
  1.21.1+NeoForge via CF gameVersions (Vinery's "FORGE" filename is their
  naming quirk; the metadata says NeoForge).
- LICENSE RULING (her question, answered): pinning API-returned CDN URLs =
  sanctioned hotlinking, file still served by the author's own CurseForge CDN,
  nothing rehosted; MR switch = the author's own distribution channel; actually
  vendoring jars onto our Pages = real rehosting and for Tombstone would cross
  the author's explicit no-external-downloads setting — NOT done.
- NET: index now has **zero CurseForge-API dependencies** — every one of the 80
  mods resolves to a direct URL or Modrinth metadata. Her next bootstrap run
  installs clean; the installer's manifest retires the old 9.4.9 jar itself.

**DEPENDENCY SWEEP — 8 MISSING LIBS FOUND AND ADDED 2026-10-27 ~18:10Z (her catch).** She
called it: "you didn't use packwiz to get all the deps." Full audit of every jar's own
mod metadata (NeoForge 21.x hybrid `[[dependencies.<owner>]]` syntax, mandatory-only,
JarJar-embedded libs counted as provided) against the pack's provided-modId set found
**11 unsatisfied mandatory deps → 3 self-satisfied by jar-in-jar** (ponder inside Little
Logistics + Productive Metalworks, xaerolib inside both Xaero jars, productivelib inside
Productive Metalworks — verified by extracting the nested jars) and **8 genuinely absent**:
- ADDED (each via its author's own Modrinth channel, sha512 + modId verified per jar):
  ApolloLib 1.2.0 (Tectonic/Lithostitched), Architectury API 13.0.11 (six Let's Do mods),
  LDLib2 2.2.44 (**Multiblocked2's own core lib — the t1 rigs would have crashed on boot
  without it**), Placebo 9.9.4 (Toast Control), TerraBlender 4.1.0.8 (NC NeoHaul),
  UnionLib **12.0.18** (Antique Atlas pins [12.0.18,12.1.0) — newest 13.x would BREAK it;
  version-range discipline enforced per dependent), YUNG's API 5.1.9 (Paxi),
  ZeroCore 2 2.4.9 (NC NeoHaul).
- MOD COUNT: 80 → 88. Index refreshed, hash consistent, pushed (a9f40d7), all 8 live on
  Pages (200). Audit tool upgraded + persisted: scripts/dep_audit_full.py now jar-aware
  (hybrid syntax + jarjar), re-runnable as a standing pre-push gate.
- ROOT CAUSE (honest): the original build was curated by hand; deps were never
  machine-verified end-to-end. Her push made the sweep a permanent step.

**ECONOMY PASS — CURRENCY → TOKENS → EXPONENTIAL CLAIMS (her design, 2026-10-27 ~18:20Z).**
Not iron-priced: a currency layer between production and land. Skeleton as she stated it:
1. **Exchange**: produced items → currency. Every producible is already dial-gated
   (mint doctrine, 0 ungated mints on record) — exchange RATES become the new pricing
   instrument and inherit the same discipline: each conversion edge on record with a gate.
2. **Shop**: currency → curated buy-list. Each purchasable = a conversion edge with its
   own price dial. Candidate ride: an MBD2 trading machine (t1 framework exists) or a
   KubeJS shop surface — implementation open.
3. **Chunk Loading Tokens**: KubeJS-registered item (rides the DIY unification pass).
4. **Exponential claim cost**: tokens pay for claims via the OPAC 0.30+ addon hook
   (IClaimActionListenerAPI — intercept claim attempt, charge, veto or wave through).
   **The curve is the anti-compound brake**: chunk loading → automation → production →
   exchange → more tokens is the biggest compound loop the pack would ever mint; the
   exponential price IS its dial. Fits the doctrine verbatim — growth gated, on record.
- OPEN SEMANTICS (her dials, not mine): (a) token = claim-only, forceload-only, or
  claim+load bundled (OPAC 0.33 gates them independently); (b) curve base and exponent
  (2^n vs e^kN), floor and cap; (c) reset scope — per player / party / dimension; (d)
  refund on unclaim (default lean: no refund, land value stays spent); (e) whether
  parties pool the curve or each member runs their own.
- PROBE ADDITIONS: KubeJS-vs-Java for OPACServerAddonRegisterEventContext registration;
  server API exposure of per-player/per-party claim + forceload counts; safe inventory
  consumption from inside the listener (thread); behavior of loaded chunks on unclaim.
- STATUS: design recorded, nothing built. SS/seasons pass remains v0.5.0 front of queue;
  economy pass sequencing = her call after /cropscan.

**LMC SOURCE DIVE — DYNAMIC RATES CONFIRMED + HOOK MAP (2026-10-28).**
Lightman's Currency pinned candidate: 1.21-2.3.0.6 (NeoForge, Oct 3 2026, Apache-2.0,
5.1M downloads; source branch LC-1.21.1 = the exact shipped build). Dived, not guessed:
- **RATES ARE LIVE-DIALABLE.** All coin values + exchange rates live in
  `config/lightmanscurrency/MasterCoinList.json` (CoreChain ladder + SideChains, each
  edge an `exchangeRate`). Registered as a custom *reloadable*: `/lcconfig reload
  lightmanscurrency:master_coin_list` re-reads + re-syncs to clients, no restart. Also
  editable in-game (config screen, MutableMasterCoinList) and via `/lcconfig edit …
  set/add/replace/remove`. Codebase is reload-aware (CoinEntry javadoc warns values go
  stale on reload). Addons even get ChainDataReloadedEvent.Pre/Post on every reload.
  → Dial discipline fits verbatim: every rate edge on record, versionable, /reload hot.
- **CLAIM/LOAD PURCHASE EXISTS AS A MOD-COMPAT LAYER.** `/lcclaims buy claim|forceload N`
  charges a config price (MoneyValueOption) against the player's wallet+bank and grants
  bonus claims via `IClaimPurchaseHandler`. Shipped handlers: cadmus, flan, ftbchunks —
  **no OPAC**. Default prices: 100 gold coins/claim, 1M netherite/forceload, flat until a
  hard cap (1M claims / 100 forceload). Flat ≠ her exponential curve: our OPAC addon
  implements the handler (SavedData pattern, per LCBonusClaimData) and owns the curve;
  keep LMC's native purchase OFF (`claimingAllowClaimPurchase=false` default) so there's
  one pricing authority — ours.
- **MONEY API SURFACE.** `MoneyAPI.getApi().GetPlayersMoneyHandler(player)` →
  `extractMoney(value, simulate)` (wallet + bank auto-resolve). `RegisterCurrencyType`
  for custom currencies. `TradeEvent.Pre (cancellable)/TradeCost/Post` = free census
  feed for the dials books. Bank accounts + team bank accounts with permission tiers =
  built-in answer to the party-pooling open semantic. Tax Collector block = server-side
  money sink (rate capped by config, default 25%) — borrowable for sinks, off by default.
- **TRUST NOTE (checked, on record):** the Feb 2024 "backdoor" thread (r/feedthebeast)
  accused a hidden author-only command path in an old Fabric build. Current 2.3.0.6
  source shows no hardcoded author UUID: admin = `LCAdminMode` server op list + permission
  level 2. Visible-source Apache-2.0; we ship from source-matched branch.
- **ENDERPAY = the other one she remembered** (kamildanak, dead since 2018, 1.12.2):
  its famous mechanics are **basic income + demurrage** — 1% daily balance tax, banknotes
  lose 1% of face value per day. That's the anti-hoarder, anti-compound lever she liked.
  LMC has NO demurrage; if she wants it, it's an addon mechanic on the bank layer
  (scheduled shave). Borrowable into the economy pass as a second brake dial.
- WIKI NAMESAKE NOTE: RC Reborn renamed World Anchors → **World Spikes**; see murder below.

**WORLD SPIKE MURDER — EXECUTED (her call, 2026-10-28: "murder with the violence").**
RC Reborn 1.2.14 World Spikes = permanent free 3×3 chunk loads (no fuel, no upkeep, no
config gate — verified in source + jar strings). Free loading undercuts token pricing,
so every survival path is removed via `kubejs/server_scripts/minebricks_anchor_murder.js`
(KubeJS recipe removal: world_spike, personal_world_spike, world_spike_minecart +
worldspike_minecart_disassembly). Items stay visible in creative/EMI for admin testing.
Zero worlds booted yet → no existing spikes to clean up; breaking a spike always
releases its chunks (preRemoveSideEffects), so no orphan loads ever. Rollback: one file
or the KILL_SWITCH const. Chunk loading now sells for tokens only.

**LC-FTB-HOOK FIND (her hunch, 2026-10-27 ~19:00Z) — THE OPAC-ADDON ROUTE IS SUPERSEDED.**
CF slug `lc-ftb-chunks` = **"Economy: Currency & Chunks"** (ManOfKott / Malik Aljazzar),
latest lc_ftb_hook-4.4.2, 1.21/1.21.1 NeoForge only, updated Oct 26 2026. Source dived:
github.com/Malik-Aljazzar/lc-ftb-hook (HEAD "Test against OPAC 0.33.0" — our exact OPAC
pin). She was mid-rant about KubeJS bypassing a custom mod when the search found it.
Verdict: **this is the economy pass's claims layer, already built and better-engineered
than what we'd have written.** Our own OPAC addon plan (Task 18 route) is retired.
- **THE COMBO IS THEIR TESTED COMBO.** Backends are swappable via adapters — claim backends
  FTB or **OPAC**, currency backends **Lightman's Currency** or Numismatics. Pin both
  explicitly in `[backends]` (claimBackend=OPAC, currencyBackend=LIGHTMANS_CURRENCY).
  ARCHITECTURE.md: OPAC adapter signatures verified via javap against real jars (our own
  discipline, mirrored); dev matrix ships an `opac-lc` server; OPAC claims are
  player-owned so a "team" = OPAC party, solo = player UUID.
- **HER EXPONENTIAL CURVE IS THE DEFAULT.** `claimPricingMode = EXPONENTIAL`:
  price = base × (1+growth)^increment, increment = floor(owned/20), growth% capped
  [0..1] (max +100%/tier), computed in tenths-of-copper, rounded down. Tier follows
  CURRENT count — unclaim de-tiers instantly, no running-total ratchet. Base price,
  growth %, tier size all dials.
- **OPEN SEMANTICS RESOLVED BY CONSTRUCTION:** (a) tokens split into land = capital
  price at claim + forceload = **recurring upkeep** (per chunk per period, 5-min default;
  mode ALWAYS or member-online); (b) curve = the three dials above; (d) refunds =
  `unclaimRefundRatio` default 0.8 (her no-refund lean → set 0); (e) party pooling =
  pooled by construction (party = team under OPAC). (c) reset scope = per party/player;
  per-dimension counting unverified — check at install.
- **NON-PAYMENT IS A DISMANTLE ORDER, NOT A DEBT SPIRAL:** wars first, then force-loads,
  then protections, until affordable. Self-correcting, no runaway balances.
- **EXTRAS BEYOND HER SKELETON (her call):** War system (default ON, incoming wars
  surcharge exponentially l^n, `warEnabled=false` kills it); **chunk marketplace** +
  expropriation (no server-config off switch found — per-region selling toggles only);
  per-OPAC-protection-field prices in `lc_ftb_hook-protection-prices.toml` (dismantle
  for non-payment); Xaero World Map buyable-chunk highlights (we run both Xaero maps);
  `LcTransactionLog` = transaction history we can mine for the dials books.
- **OPAC WIRING (their words + our Task 18 verification agree):** OpacClaimListener on
  the claim-action API — money moves only in the success callback, unaffordable claims
  undo silently; OpacPartyWatcher diffs party snapshots every 100 ticks; protection via
  auto-managed per-owner sub-configs + config lock, one fail-soft mixin (require=0).
- **LICENSE (her kind of fine print):** proprietary source-available, NOT OSI. §2
  explicitly grants modpack inclusion of the unmodified officially-distributed jar —
  from CF/GitHub Releases distribution, link back, no rehosting. Our direct CF-CDN pin
  (metalworks pattern) + credit in this file complies; not on Modrinth.
- **STAYS OURS:** LMC rate dials (MasterCoinList.json + reload events → dials books);
  spark archetype census to set base prices on record; World Spike murder (correct —
  free loading would undercut metered loading); dial discipline on every new edge.
  Token ITEM concept (pass item 3) is likely replaced by metered forceload — her ruling.
- STATUS: candidate adopted in principle, nothing installed. Sequencing still hers:
  SS/seasons pass v0.5.0 front of queue; economy pass = install LMC + hook, then rate
  JSON + curve dials into the books before first boot.

---

## INSTALL PATH FIX — EDGE CDN ROT (2026-10-28, pack 0.4.3)

Her report: "latest pack definition tries to download our recently added *.pw.toml
from cf/mr. Fix those before it works." Correct — 7 CurseForge-pinned tomls were
404ing on download.

- ROOT CAUSE: CurseForge retired the `edge.forgecdn.net` download host. All 7 pins
  404 there; identical paths alive on `mediafilez.forgecdn.net` (206).
- FIXED (7): toolbelt, toast-control, antique-atlas, do-api, lets-do-vinery,
  lets-do-meadow, lets-do-herbal-brews — host swap only. Every jar re-downloaded
  from mediafilez and sha512 re-verified BYTE-IDENTICAL to the pinned hash
  (same files, new host). Index rebuilt (101 entries, 0 mismatches).
- FULL AUDIT GATE (new standing tools in /scripts): pw_url_audit.py (range-check
  every URL + sha512 verify + index re-hash), pw_edge_host_fix.py (the fixer),
  pw_metadata_check.py (all metadata:modrinth pins resolve by version-id, primary
  file alive, sha512 matches MR API). Verdict: 79 metadata + 9 direct-URL entries
  ALL verified. Zero edge.forgecdn.net references remain in the pack.
- pack.toml 0.4.2 -> 0.4.3. Pushed 7b7623ef48; Pages verified 200 on all 7.

## E:C&C SERVER-GROUP + WARS RULINGS (2026-10-28, from her — config plan for install)

- WARS OFF (her call, source confirms): `warEnabled` ships **true** by default
  (LCFtbHookConfig.java:197). Kill switch: `/lc_ftb_hook config set warEnabled false`
  (runtime command persists) or the server toml. Takes the whole war subsystem with
  it — declarations, l^n incoming surcharge, war-first dismantle priority.
- SERVER GROUP (her "own things on behalf of the world with infinite money"):
  - Funding lever verified in LMC source: `/lcbank give team <team> <money>` (+ take/
    view, player|team|allPlayers|allTeams scopes), op-gated. Seed the "Server" team
    bank account with a fat grant; top up anytime. True infinity not needed — see next.
  - UpkeepGating.java (their javadoc, verbatim): when a category isn't chargeable its
    cost "is treated as zero everywhere... simply frozen until someone relevant comes
    online again" — frozen, NOT dismantled. ForceLoad upkeep DEFAULT mode charges only
    while a team member is online -> an empty Server party's force-loads never bill and
    never get torn down. World-owned spawn forceload = free and safe by construction.
  - Recommendation on record (her veto reserved): `protectionUpkeepMode = LIGHT`
    (team-member-online) — nobody bills while asleep, Server group pays zero even while
    others play; forceLoad stays DEFAULT. Belt-and-suspenders: seed the account anyway.
  - OPAC party edge to test at install: party-with-no-members persistence (keep one
    admin member in "Server" if it collapses empty).

## FORCELOAD UPKEEP — HER "OTHER WAY" RULING (2026-10-28, supersedes the DEFAULT suggestion above)

- HER CALL: "Bill people for the loaded chunks, online or not." -> `forceLoadUpkeepMode = ALWAYS`
  is a built-in enum value, javadoc verbatim: "Charge every period regardless of whether
  anyone is online." My DEFAULT suggestion had exactly the hole she named (offline = free
  factory time). Superseded. Protection mode stays open — same logic says HEAVY (land tax
  while asleep), DEFAULT is the middle road; her ruling pending.
- FINE PRINT VERIFIED IN SOURCE (UpkeepSettlementService / UpkeepService / LightmansCurrencyPort):
  1. Upkeep draws from the TEAM BANK ACCOUNT (`account.withdraw(costCopper, "Upkeep Payment")`),
     never the player wallet — that's WHY offline billing works. Install card for players:
     keep the bank funded; pocket coins don't pay upkeep.
  2. Every upkeep payment LANDS IN THE SERVER SINK ACCOUNT
     (`ServerAccountDeposit.deposit(... teamName + " (upkeep)")`). The drain is a treasury,
     not a void. Server-group funding closed loop: ops view it via `/lc_ftb_hook server_account`
     (op-gated; focuses the account in the op's LC ATM UI for transfers). World-owned chunks
     can be paid from the pool the players feed — no infinity hack needed, just sink -> Server
     team account top-ups via LC's own bank UI.
  3. ONE HARD BOUNDARY: the settlement loop "Pauses while no players are online" (UpkeepService
     comment, hard-coded, no config key). ALWAYS mode bills every period while >= 1 player is
     online (any team, online or not); on a fully EMPTY server billing pauses and loads persist
     until next restart. Residual free window = last-logout -> restart. Mod author's fail-safe;
     accept + note, revisit only if it bites.
  4. Non-payment path: dismantle runs BEFORE the afford check — wars cut first, then
     force-loads ONE CHUNK AT A TIME until affordable, protections last; if still
     unaffordable -> protections locked + managers notified ("upkeep_unpaid_frozen"). No debt,
     no spiral, enforcement happens while the payer sleeps (that's the teeth she wants).
  5. WARS OFF — use the runtime command, not a toml hand-edit: settlement skips all war
     processing only via the toggle path (WarService#setWarSystemEnabled purges war state);
     direct config edit + restart leaves stale war data reporting as queued. Fresh install =
     clean either way, but `/lc_ftb_hook config set warEnabled false` is the sanctioned path.
  6. Defaults for the dial sheet: forceLoadUpkeepPrice = 1,000,000 copper (deliberately absurd
     placeholder — tune DOWN), upkeepPeriodMinutes = 5 (1..10080), both modes DEFAULT.
     ForceUpkeepCommand exists = op can force a settlement pass on demand (testing lever).
- INSTALL SEQUENCE UNCHANGED, config card now reads: warEnabled=false (runtime command),
  forceLoadUpkeepMode=ALWAYS, protectionUpkeepMode=<her ruling>, prices + period = her dials,
  Server party + bank account seeded (or sink-funded), protectionUpkeep LIGHT/HEAVY note.

## PROTECTION RULING + EMPTY-SERVER RECLASSIFICATION (2026-10-28)

- HER RULING: `protectionUpkeepMode = HEAVY` (billed always, for consistency with ALWAYS
  forceload) — priced cheap; loading is where the real money lives. Dial sheet for install
  is now: warEnabled=false (runtime command), forceLoadUpkeepMode=ALWAYS,
  protectionUpkeepMode=HEAVY, protection prices low, forceload price/period + curve = hers.
- RECLASSIFIED: my "acceptable rounding error" framing of the empty-server pause was too
  generous. Timer logic (UpkeepService.tick): on empty ticks `nextUpkeepTick++` — the
  settlement deadline SLIDES FORWARD with real time. Empty-server time is never billed AND
  never made up retroactively (login resumes the pre-existing remainder, not wall-clock).
  Unbounded free window: last logout -> first post-login settlement. Her "oversight/bug"
  read is correct. (Also softens my restart claim: the hook tracks paid force-loads in its
  own saved data and restores them — a restart does not cleanly wipe the window.)
- RESPONSIVENESS RECON (before filing): author states on CF "Please report issues on the
  Github page" — GitHub IS the sanctioned channel. Tracker health: 6 issues ever (2 open,
  4 closed); both open issues (#5 Oct 10 support complaint, #3 Sep 26 enhancement, labeled)
  unanswered 2.5-4+ weeks. Counter-signal: very active development (4.4.2 shipped Oct 26,
  HEAD "Test against OPAC 0.33.0" = our pin), closes things eventually, no Discord found.
  Verdict: file the precise issue; low triage speed expected; we are their tested combo
  (OPAC 0.33.0 + LC 2.3.0.6 + 1.21.1) which gives the report weight.
- ISSUE DRAFTED + DELIVERED TO HER (this chat): title + body with code citations
  (UpkeepService.tick empty-server branch, nextUpkeepTick++ slide), three fix options
  (settle on empty / back-bill elapsed periods on next settlement / config key), offer to
  test builds. Status: awaiting her filing (she owns the GitHub identity).

## SELF-PATCH ASSESSMENT: EMPTY-SERVER PAUSE (2026-10-28, her question: "how hard with a mixin?")

- VERDICT: the patch is trivial — the harness is the cost. One mixin, ~25 lines:
  `@Redirect` on `PlayerList.getPlayerCount()` scoped to `UpkeepService.tick`
  (exactly ONE call site, line 70 — the early-out) -> return 1. Branch never fires:
  settlement runs on schedule while empty, AND the `nextUpkeepTick++` slide dies with it
  (both bugs live in that one branch). Fail-loud on upstream refactor (redirect target
  mismatch = boot crash, not silent unbilled drift) — correct failure mode for a pack.
- DEAD ENDS VERIFIED (why the mixin is the only self-patch route):
  1. RCON / ForceUpkeepCommand: forceNextUpkeep() sets nextUpkeepTick = now, but the
     empty-server early-out runs BEFORE the due-check — forced passes get swallowed on an
     empty server. Every road runs through that branch.
  2. KubeJS: cannot rewrite another mod's bytecode; reflection can't swap method bodies.
  3. Editing their jar: violates §2 (modpack grant = unmodified official jar). Off the table.
  4. Forking the whole mod: 10x maintenance for the same outcome; proprietary license gray.
  The companion-mod mixin is the ecosystem-normal shape — their own mod does exactly this
  to FTB Chunks (9 mixins + BackendMixinPlugin, required=true). Our jar: minebricks-economy-fix,
  their jar stays unmodified + updatable. One mapping subtlety (@At target is vanilla
  PlayerList -> refmap), handled once in the build.
- COSTS: first NeoForge mod project for the pack (ModDevGradle skeleton + mixin config +
  compileOnly: their jar + neoforge; MixinExtras bundled in NeoForge) — one session, mostly
  Gradle cold cache. Recurring tax: rebuild + boot-verify on every hook update (they ship
  fast). e2e boot infra exists (scratch/bootstrap-test).
- SEQUENCING (recommended, pending her call): file the drafted issue FIRST with a PS line —
  "if this isn't on your roadmap, we'll ship a small local mixin bypassing the empty-server
  branch — objection?" — good faith + license-clean + a settleWhileEmpty config key is a
  ~5-line change for him. Silence ~2 weeks -> we build. Harness scaffold can start earlier
  on her word (useful regardless).

## FAKE-PLAYER SHORTCUT — CHEAPEST FIX, ONE TEST GATE (2026-10-28)

- GATE CONFIRMED AGAIN, TWICE: `UpkeepService.tick:70` pauses on `getPlayerCount() <= 0`
  (and slides `nextUpkeepTick++`); **the same check** is `UpkeepGating.isAnyPlayerOnlineOnServer`
  → protection DEFAULT mode freezes while empty too. One login-completed warm body defeats
  BOTH at once. The one thing a fake player can NOT fool: per-team member checks
  (`isAnyTeamMemberOnline`, force-load DEFAULT) — a bot is in nobody's party; our
  ALWAYS/HEAVY rulings bypass those anyway → config + warm body = airtight.
- WHAT COUNTS (trap): only connections that complete login. Create-style in-world
  FakePlayer entities never join the PlayerList (count stays 0); Carpet `/player` is
  Fabric-only. So the fake must be a REAL connection.
- RUNG 1 — protocol bot: mineflayer / MCProtocolLib, ~50 lines, systemd `Restart=always`
  ON the server box (bot-down ⇔ server-down collapses silent divergence) + canary ping to
  #home-channel on drop. TEST GATE: modded NeoForge may reject vanilla-protocol logins at
  handshake — 5-min vanilla-client/bot probe decides. `online-mode=true` → bot needs a
  real MS-account session. Check `server.properties` first.
- RUNG 2 (handshake blocks the bot): real client left logged in on spare hardware — zero
  code, needs a license + a machine.
- RUNG 3: companion mod (Task 23 scope) — the scoped `@Redirect` on `PlayerList.getPlayerCount()`
  scoped to tick IS "fake the count at one call site"; effort only wins if Rung 1's test fails.
- SIDE EFFECTS TO OWN: mob cap +1 + spawn distribution shift; backup mods that skip empty
  servers start running all night; `/list` + one max-players slot; sim-distance circle stays
  loaded wherever parked (park barren — our own freeloader is the one body we can't charge);
  bot auto-creates an empty FTB party that settles for zero (harmless).
- VERDICT: cheapest structural fix tonight, pending the handshake probe. Upstream
  `settleWhileEmpty` ask stays the clean endgame; bot doubles as permanent canary. Not
  either/or with the mixin — companion mod remains the fallback ladder if the probe fails.

## ROUTE DECISION — PR-FIRST, MIXIN SHELVED (2026-10-28, her call)

- HER RULING: fake-player route "more annoying than the mod" → mod route wins; skip the
  probe; go upstream-first: issue + PR that fixes it FOR them (not just for us).
- LICENSE DISCOVERY THAT UNLOCKS IT: LICENSE.md §1 literally says "Want a feature added?
  Open a pull request ... A feature request opened as an issue with no pull request
  attached may simply never get built"; §5 = standard contribution grant (original work,
  perpetual license to holder, contributor keeps copyright). PR is the blessed route.
- SPEC BUILT (download/lc-ftb-hook-settle-while-empty-spec.md), self-contained agent brief:
  repo facts (Malik-Aljazzar/lc-ftb-hook @ acd912b; license links PRs to ManOfKott/lc-ftb-hook
  — confirm tracker on CF page), bug mechanics (tick:70 pause + slide, ALWAYS/HEAVY contract
  violation, force_upkeep swallowed, restart re-arm noted out-of-scope), fix = opt-in
  `settleWhileEmpty` (default false; config key + tick gate flip + javadoc + RuntimeConfigCommand
  Entry — ENTRIES map is hand-built, NOT auto-discovered), do-not-touch list (UpkeepGating
  semantics, no retro-billing, no client payload), headless RCON verification matrix on the
  `ftb-lc` dev env (settlement is log-quiet → assert balances not logs), issue draft skeleton,
  house-style CHANGELOG entry, fallback posture = Task 23 companion mixin stays shelved.
- NEXT: she hands spec to her build agent; PR opens from fork; our mixin only if declined/
  ~2wk silence.

## INSTALL BLOCKER FIX — metadata:modrinth MODE UNSUPPORTED BY INSTALLER (2026-10-27, pack 0.4.4)

Her third report + screenshot: launch line correct (Pages URL), dialog
"Failed file downloads", 9/101 errored, all identical:
`java.lang.Exception: Unsupported download mode metadata:modrinth` (metadata.DownloadMode).

- ROOT CAUSE: packwiz-installer does not implement the `metadata:modrinth`
  download mode — it throws before any resolution. The 10-27 detangle removed
  the CurseForge flavor (that mode IS implemented, embedded CF key) but moved
  Tombstone to Modrinth in metadata mode, and the 10-27 dep sweep added its 8
  deps in the same mode: apollib, architectury, corail-tombstone, ldlib2,
  placebo, terrablender, unionlib, yungsapi, zerocore. Her dialog listed
  exactly those 9.
- AUDIT BLINDSPOT (owned): the rebuilt runtime verify resolved the 9 pins
  through the MR API itself — modeling a smarter installer than the one that
  actually runs. Pins were fine; the MODE was the bug. New standing gate:
  pw_full_audit.py now fails on ANY `mode = "metadata:"` in the pack.
- FIXED (9): every entry converted to a direct pinned CDN URL
  (primary file resolved via MR API, filename + sha512 verified against the
  pin before writing; all 9 matched byte-identical). Index re-hashed for the
  9, pack.toml index pin recomputed, version 0.4.3 -> 0.4.4.
- VERIFICATION: static audit 0 problems; 88 metafiles all direct-URL
  (78 cdn.modrinth.com + 10 mediafilez.forgecdn.net), zero metadata modes.
- Installer note: the dialog's Continue/Ignore routes install 92/101 — LDLib2
  is mandatory (MBD2 t1 rigs crash without it). Relaunch after Pages updates
  instead; the definition now installs 101/101.

## CRASH FIX — AR3's UNDECLARED ARLib DEP (2026-10-27, pack 0.4.5)

Her crash report (19:20 ET, after the 0.4.4 install fix — sync phase now passes,
all 9 previously-errored mods loaded): `adv_rocketry` FATAL at mod construction,
`NoClassDefFoundError: ARLib/network/SimpleNetworkPacket$SimpleNetworkDataReceiver`.

- ROOT CAUSE: the AR3 author re-uploaded "3.0.beta" on 2026-08-19 (OA08w9Vk,
  33.5MB) at 1/3 the size of the 2026-03-29 original (xnWPtaRN, 107MB) and WIPED
  the dependency declarations — jar mods.toml (an unedited example template, no
  ARLib entry) and MR version dependencies (empty). The March original declared
  two required companions: ARLib (IY6pSlUL) + Dynamic Dimensions AR Edition
  (qbUzidyB). Undeclared hard class dep = NoClassDefFoundError instead of a
  "missing mods" error — invisible to the jar-side dep sweep, which audits
  DECLARED mandatory deps only. Blind spot noted; no fix tooling can catch
  undeclared class deps short of a boot test.
- CLASS-REFERENCE PROBE (new tool pattern): extracted every ARLib/* and
  dynamicdimensions/* class reference from AR3's constant pools, checked against
  each candidate lib jar. ARLib 1.0.33 covers 46/47 refs incl. the boot-crash
  class (older builds miss up to 11 — 1.0.33 is the only viable one). DynDims
  0.9.1 covers 2/2. No other undeclared third-party namespaces in AR3.
- ADDED (0.4.5): mods/arlib.pw.toml (arlib-1.0.33, J40YrFd1) +
  mods/dynamic-dimensions-ar-edition.pw.toml (0.9.1+75e1622e-dirty, WJizUdAu) —
  both direct-URL pinned, sha512 verified against MR API before writing. Index
  +2 (90 metafiles), pack.toml re-pinned, 0.4.4 -> 0.4.5. Static audit 0 problems.
- RESIDUAL LANDMINE (known, accepted for now): ARLib/gui/ModularScreen$ToolTip
  exists in NO published ARLib build (ModularScreen ships with zero inner
  classes in 1.0.33). Lazy classload — only fires if an AR3 modular GUI
  constructs a ToolTip. AR3 currently ships no recipes (supply pass deferred),
  so those GUIs are mostly unreachable. Revisit at supply-pass time or if the
  author publishes an ARLib with the class.
- ROSTER OPTION (pack lead's call, not made): shelve AR3 until its packaging is
  fixed = delete 3 metafiles (advanced-rocketry-3, arlib,
  dynamic-dimensions-ar-edition) + refresh + bump.
- Paxi note: pack ships no Paxi datapacks — her "Paxi bitched" is likely
  downstream noise of the failed load; re-check after 0.4.5 boots.
- INSTALL BLOCKER #2 (fixed, 0.4.6): Dynamic Dimensions AR Edition 0.9.1
  DECLARES badpackets (required, [0.8,)) in neoforge.mods.toml — was missing
  from the pack -> NeoForge missing-dependency screen on launch. Lesson: the
  0.4.5 dep sweep audited what the NEW jars need from the pack only via class
  probe (undeclared wires), not their DECLARED deps. Both sides must be
  checked for every jar added to the pack from now on (scope script:
  scripts/pw_depscope_045.py).
- ADDED (0.4.6): mods/badpackets.pw.toml — badpackets-neo-0.8.2.jar
  (MR ftdbN0KK, version RNyYl9M3), only two neoforge+1.21.1
  builds exist (0.8.1, 0.8.2); 0.8.2 satisfies [0.8,). Direct-URL pinned,
  sha512 verified vs API before writing; jar self-check: its own deps =
  minecraft only. Index 91 metafiles, pack.toml re-pinned, 0.4.5 -> 0.4.6.
  Static audit 0 problems.
- SCRIPT BLOCKER (fixed, 0.4.7): startup script failed with Rhino
  "redeclaration of var IO." -> 0/1 startup scripts loaded -> MBD2 t1
  machines + recipe types never registered. Root cause: MBD2's blueprint
  type-handle bootstrap (com.lowdragmc.mbd2.common.blueprint.MBDTypeHandles)
  injects named top-level bindings into every KubeJS scope, including
  literal 'IO' -> com.lowdragmc.mbd2.api.capability.recipe.IO. Our
  `const IO` collided. Fix: renamed to MBD_IO (explicit loadClass kept —
  the injected binding is a nodegraph TypeHandle, not the raw enum).
- RESERVED WORDS in pack KubeJS scopes (MBDTypeHandles + builtin plugin
  bindings; audit tool: scripts/pw_reserved_name_audit.py): IO, MACHINE,
  RECIPE, TRAIT, CONTENT, CONTENT_MODIFIER, MACHINE_STATE, MACHINE_EVENT,
  MACHINE_DEFINITION, MULTIBLOCK_MACHINE, MULTIBLOCK_STATE,
  MULTI_CONTROLLER, MULTI_PART, PART_MACHINE, RECIPE_TYPE, RECIPE_LOGIC,
  RECIPE_STATUS, RECIPE_CAPABILITY, BLOCK_HIT_RESULT, INTERACTION_HAND,
  INTERACTION_RESULT, ITEM_INTERACTION_RESULT, MAIN_HAND, ALL, BOTH, PASS,
  IDLE, BlockEvents, ItemEvents, StartupEvents, ServerEvents, ClientEvents,
  plus BuiltinKubeJSPlugin names. Never use as top-level const/let/var/
  function names in kubejs scripts. NOTE: audit heuristic over-captures
  (flagged Blocks/Items which provably do NOT collide at runtime — Rhino
  reports the FIRST collision in file order; ours was IO at line 38, after
  clean const Blocks/Items at 22/23). Runtime behavior is authoritative.
- Non-crash lesson: KubeJS script errors are NOT fatal — the file is
  skipped and the game loads without its content. A "benign" boot with
  missing machines = check the KubeJS log lines first.
- CORRECTION to the reserved-words note above: the "Rhino reports the FIRST
  collision in file order" inference was WRONG — retracted. Observed boots:
  error surfaced IO (line 38) while MBDRegistries (line 35) sat above it
  clean, then after the IO fix the error moved to MBDRegistries. Rhino
  surfaces only ONE redeclaration per boot, not in file order; several may
  be queued. Blocks/Items collision status: unknown/irrelevant now.
- INJECTION MECHANISM (ground truth from pinned jars): LDLib2's
  LDLibKubeJSPlugin reflectively binds every static field carrying the
  @KJSBindings annotation (com.lowdragmc.lowdraglib2.integration.kjs.
  KJSBindings; value = binding name). Annotated holders in mbd2: IO,
  ContentModifier, MBDRegistries, CapabilityIO, MachineState,
  ConfigBlockProperties (+ gui/editor helpers). MBD2's plugin additionally
  binds RL + Shapes statically and every recipe type by registry name.
  Plus MBDTypeHandles blueprint names (CAPS set above) and event groups.
  Complete set is partly dynamic — do NOT fight it by renaming.
- SYSTEMIC FIX (0.4.8): startup script body wrapped in an IIFE — function-
  scoped consts only shadow outer bindings (legal), so no top-level
  declaration can ever collide again. Server scripts keep top-level names
  but all are pack-prefixed (POR_*, MARKER_*, por*, writeText, fireTheMoment,
  KILL_SWITCH, UNLOCK_KEY, STATION_KEY) — outside every injected family.
  House rule going forward: new pack scripts either IIFE-wrap or prefix.
- OVERLOAD BLOCKER (fixed, 0.4.9): first successful script run (0.4.8) died
  at MBDRecipeBuilder.inputItems — Rhino: "The choice of Java method ...
  matching JavaScript argument types (Item,number) is ambiguous". Root cause
  (empirically established with scripts/RhinoOverloadHarness1-3.java against
  the pack's own rhino.jar + stub signatures mirrored from the real class):
  KubeJS's Rhino fork reports ANY call into a Java overload family containing
  >= 2 VARARGS members as ambiguous, regardless of argument types — even
  exact single-arg matches. MBDRecipeBuilder: inputItems = 3 varargs + 8
  fixed, outputItems = 1 varargs + 4 fixed, inputFluids = 3 varargs (all!).
  Also: getClass() is hidden by the fork (reflection via instances blocked),
  Supplier-arrow args don't disambiguate. Single-varargs families resolve.
- FIX PATTERN (house pattern for MBD2 recipes from KubeJS): skip the sugar
  overloads; call the generic input(cap, values...) / output(cap, values...)
  — each a single-varargs family — with the content objects the sugar would
  have built: ItemRecipeCapability.CAP + SizedIngredient.of(ItemLike, int),
  FluidRecipeCapability.CAP + SizedFluidIngredient.of(FluidStack). Factories
  verified against MBDRecipeBuilder's own constant-pool methodrefs (its
  inputItems(Item,int) impl literally calls SizedIngredient.of(ItemLike,int)
  then input(...)). Harness-proven end-to-end before shipping.
- 0.4.9 milestone note: 0.4.8's log showed 1/1 startup scripts + all 3
  multiblocks registered — IIFE fix confirmed; recipes were the next layer.
- SPREAD PARSE BLOCKER (fixed, 0.4.10): the Rhino fork cannot parse array
  spread `[...x]` — EvaluatorException syntax error at parse time, whole
  file dropped, boot continues (same silent-content-loss genus as the
  redeclarations). Both pack dump tools (fooddump line 145, lootdump line
  91) shipped broken since v0.4.1 (2026-10-26) and never executed one
  line. The "Loaded 7/9 KubeJS server scripts with 2 errors" line has been
  in every boot log since — missed while chasing the startup fires. Owning
  it plainly: parse errors are deterministic; these were fixable on day
  one, the reading was the failure.
- TOOLCHAIN GAP + GATE (0.4.10): node --check uses V8, which ACCEPTS
  spread — it could never catch an engine-specific parse failure. New
  authoritative gate: scripts/RhinoParseGate.java + jarcache/rhino.jar —
  parses every kubejs/**/*.js with the pack's OWN Rhino fork via the same
  compileString chain a real boot uses. Validation protocol: the gate must
  REPRODUCE a known failure (exact file + line) before any clean verdict
  is trusted. It reproduced fooddump#145 / lootdump#91 exactly, then went
  10/10 clean post-fix (startup script included).
- HOUSE RULE (extends the 0.4.8 rule): after ANY script edit, run
  RhinoParseGate over ALL kubejs scripts (not just the edited file) before
  rehash/ship. node --check stays as a cheap typo guard, never the
  authority.
- RHINO SYNTAX SURFACE (what we know parses): template literals, arrows,
  ?? (nco), ** — all parsed fine before the spread lines. Array/object
  spread, and JS `Set` iteration via spread, do NOT. Fix pattern: plain
  arrays, forEach + push, concat, indexOf-dedupe accumulators.
- CONFIG LANE (proposed, 0.4.10 — awaiting her first file list):
  packwiz ships non-mod files (config/, kubejs/, resources) as plain
  index entries — same refresh/rehash/bump/verify pipeline as scripts, no
  new tooling. Per-file decision needed: ENFORCED (shipped; every update
  overwrites player edits — right for defaults we own) vs IGNORED
  (.packwizignore; player domain — controls, graphics, in-game tweaks).
  Hygiene: generate shipped configs from a clean boot of the pack, not a
  used instance (no machine cruft, no config-version migration surprises).
  Pack-owned tunables (token prices, machine rates) -> small JSON the
  scripts read at boot via JsonIO — retune without code edits, ships
  through the same lane. Her loop: she sends file contents, Zee stages
  into config/, ships verified.

## 0.4.11 — config lane v1 (shipped 2026-10-28)

- WHAT SHIPPED: 1,362 config files staged from her instance (all mod
  defaults — she confirmed zero hand edits), index 104 -> 1,466 entries,
  every file sha256-verified on copy. 21 personal files NEVER staged and
  guarded in .packwizignore: config/xaero/ (14 map/HUD profiles),
  embeddium-options.json, xaerohud.txt, emi.css, spark/tmp*,
  NoChatReports/README.md, fml.toml. Her rule of thumb held: defaults get
  enforced, anything tweakable in-game is player domain.
- HOW IT WAS RULED: mtime archaeology — install burst (1,139 files, one
  timestamp) vs two later boot waves (244) vs hand-edit signatures (0
  found; boot batches stamp whole dirs in the same minute). Ruling was
  hers, one line, zero vetoes. Tooling: scripts/pw_config_inventory.py
  (inventory/manifest/segments) + scripts/au_rulings.py (verdicts) +
  scripts/pw_bulk_stage_configs.py (copy, index rebuild, bump).
- NOTABLE PINS: nuclearcraftneohaul.ncpf.json (275KB — full NC material
  profile, material system now pack-wide); *-server.toml family (server
  settings pinned for the SMP — consistent experience).
- CI FIX (pages.yml): the deploy rsync copied ./ into pages/ INSIDE
  itself; with 104 files the race never fired, at 1,466 entries rsync
  caught its own in-flight temps (code 24, bash -e fatal, run 38 failed).
  Fixed with --exclude 'pages'. Run 39 green. packwiz refresh in CI
  reproduced the hand-built index BYTE-IDENTICALLY (539f0262...) — the
  canonical tool cross-validated the rebuild.
- DRIFT DETECTOR (now live): from here on, run pw_config_inventory
  against any instance with --index pointing at the pack index — any
  file whose hash differs from shipped flags MODIFIED. Her copy is the
  definition of correct; tuning sessions will flag exactly the files
  she changed, and those small diffs are the whole staging loop.
- TUNING MOUNTAIN (next): configs now flow through the same
  rehash/bump/audit/push/verify lane as scripts. Small cycles: tweak
  in-game -> manifest flags MODIFIED -> stage those files -> ship.
  Pack-owned tunables (token prices, machine rates) -> JsonIO JSON so
  scripts can be retuned without code edits. Dump runs (/fooddump,
  /lootdump, /mintdump — first fully working as of 0.4.10) are the
  inputs to that work.
