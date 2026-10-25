# Minebricks — packwiz starter (v0.4.0)

Built 2026-10-25. Every version resolved live from Modrinth/CurseForge at build time;
roster per the pack lead's calls. No Create. Storage, scripting, privacy, multiblock,
transport, building, performance baseline, and rockets are in.

## Pins (pack.toml → [versions])

- Minecraft **1.21.1**
- NeoForge **21.1.265** (newest of the 1.21.1 line at build time — bump freely)

## In the manifest — core roster

| Mod | Version | Side | Source | Note |
|---|---|---|---|---|
| Sophisticated Backpacks | 1.21.1-3.26.15.2227 | both | Modrinth | published day-of-build; pulls Sophisticated Core (required) |
| EMI | 1.1.24+1.21.1+neoforge | both | Modrinth | no deps |
| AppleSkin | 3.0.9+mc1.21 | both | Modrinth | no deps; server install gives accurate saturation/exhaustion sync |
| KubeJS | 2101.7.2-build.377 | both | Modrinth | pulls **Rhino** + **Better Advanced Tooltips** (required) |
| Multiblocked2 | mc1.21.1-21.1.2-neoforge | both | Modrinth | pulls **Kilagraph** (node-graph lib, required) |
| No Chat Reports | NeoForge-1.21.1-v2.9.1 | both | Modrinth | strips chat signatures, kills chat reporting; server install = whole server unreportable |
| ToolBelt | 1.21.1-2.2.10 | both | **CurseForge** | gigaherz's mod (the pack lead's link); no required deps; the one CF-sourced entry |

## In the manifest — this round's adds

| Mod | Version | Side | Note |
|---|---|---|---|
| ProbeJS | 8.0.3 | client | TS definitions for KubeJS; pulls nothing new (KubeJS already in) |
| Railcraft Reborn | 1.2.14 | both | the modern Railcraft; port authorized by CovertJaguar; NeoForge-only from 1.21 on; published day-of-build; zero deps |
| Little Logistics | 1.21.1.1-beta.2 | both | updated as requested — but the 1.21.1 build is a **beta** (2026-07-22) |
| Immersive Aircraft | 1.7.0+1.21.1 | both | zero required deps; description advertises optional Create-style compat (moot, Create is out) |
| Via Romana | 2.2.3+1.21.1-neoforge | both | the fast-travel mod ("Pax Romana", confirmed); pulls **Data Anchor** + **Moonlight Lib** + MidnightLib (required) |
| FramedBlocks | 10.6.3 | both | slopes/corners that look like any block; zero deps |
| faun | 2.0.2+neo | client | account/telemetry privacy — see limitations below |
| Tom's Simple Storage | 1.21-2.4.2 | both | 21M+ downloads, vanilla-style storage network; zero deps |
| Advanced Rocketry 3 | 3.0.beta | both | rockets / space stations / warp; **ships with no recipes or loot tables** — KubeJS supply pass planned after mod selection; zero required deps on the latest build |

## In the manifest — building set (general use, light deps)

Lane picked by the lead's call (one chisel mod, not two — atlas size): **Rechiseled in,
Chipped out.** Rechiseled is the leaner catalog, actively maintained (1.2.6 Sept 2026,
project updated Oct), and its chisel converts placed blocks in-world — no per-variant
crafting. Chipped (the breadth king, thousands of variants) stays parked as a candidate
with an atlas warning.

| Mod | Version | Note |
|---|---|---|
| Rechiseled | 1.2.6-neoforge-mc1.21 | chisel-driven decorative variants + connected textures; pulls **SuperMartijn642's Core Lib + Config Lib** and **Fusion** (connected textures) |
| Handcrafted | 4.0.3 | furniture; pulls **Resourceful Lib** |
| Macaw's Doors | 1.1.5 | zero deps |
| Macaw's Windows | 2.4.2 | zero deps |
| Macaw's Bridges | 3.1.2 | zero deps |
| Macaw's Roofs | 2.3.2 | zero deps |
| Macaw's Fences and Walls | 1.2.1 | zero deps |

## In the manifest — performance baseline (lead-approved as easy wins)

| Mod | Version | Side | Note |
|---|---|---|---|
| Embeddium | 1.0.15+mc1.21.1 | client | renderer; last FOSS-licensed Sodium fork. **Maintenance mode** — last 1.21.1 build Jan 2025, still the standard NeoForge renderer. Don't report its issues to the Sodium tracker |
| FerriteCore | 7.0.3-neoforge | both | memory footprint |
| ModernFix | 5.27.27+mc1.21.1 | both | load-time/memory/bugfix omnibus; updated day-before-build. Body: OptiFine unsupported, recommends Embeddium here |
| ImmediatelyFast | 1.6.15+1.21.1-neoforge | client | immediate-mode rendering batching |
| EntityCulling | 1.11.3 | client | skips rendering entities you can't see |
| MoreCulling | 1.0.10 | client | leaves/blocks culling; pulls **Cloth Config** |
| Clumps | 19.0.0.1 | both | XP orb merging |

Side is set in each metafile — a server install automatically skips the client-marked ones.

## faun — limitations (from its own page)

- **Client-only.** Project flags say `server: unsupported` — it does nothing on the
  server; every friend installs it on their own client if they want it.
- **Default behavior only lifts account chat restrictions.** The rest (telemetry off,
  etc.) needs each user to edit its `faun.properties` — one `true/false` per setting:
  `chat allowed`, `telemetry enabled`, plus dev knobs (`servers allowed`,
  `profanity filter enabled`).
- **Cannot bypass server bans** (its own words), and it doesn't touch message signing —
  that's No Chat Reports' lane. They stack cleanly: NCR strips signatures server-side,
  faun is per-account local privilege + telemetry.
- MPL-2.0, ~11k downloads, works 1.16.4 → latest snapshots.

## What they reference (read from descriptions/bodies — standing rule)

- **ProbeJS** — generates TS definitions; converts `require()` to `Java.loadClass()` for
  the tsgo toolchain; in-game GUI shows dump progress; description explicitly advertises
  agent/LLM support so external models can write valid KubeJS directly.
- **Via Romana** — fast travel by building roads between sign-linked nodes. Required
  libs: Data Anchor, Moonlight Lib, MidnightLib. Its NeoForge build's metadata also
  marks **Fabric API** required — author metadata noise (fabric-only lib, project flags
  say optional); skipped, documented here.
- **Rechiseled** — its description exposes two addons, both moot here: **Rechiseled:
  Create** (Mechanical Chisel + 100+ Create variants — Create is out) and an **AE2
  chiseling-pattern addon** (AE2 not in pack).
- **Tom's Simple Storage** — zero required deps. Description notes a Fabric-only
  requirement (Indium + Sodium — moot on NeoForge/Embeddium) and a Create integration
  addon (Create Contraption Terminals — moot, Create out).
- **Advanced Rocketry 3** — body states plainly: **no recipes or loot tables included**
  (the KubeJS supply pass covers both). Default planet definitions use **Biomes O'
  Plenty** biomes when present, vanilla otherwise — BOP is not in the pack, so planets
  will be vanilla-biome unless we add BOP or write custom planet jsons later.
- **Handcrafted** — Resourceful Lib.
- **MoreCulling** — Cloth Config.
- **Immersive Aircraft** — optional Create-style compat (Create is out; recording for
  the graph).
- **Multiblocked2** — compat matrix unchanged: GTCEu energy, Botania mana, Mekanism
  heat/gas/slurry/pigment/infusion, PneumaticCraft pressure/heat, Embers, Nature's Aura.
- **EMI** — runtime JEI bridge still available (JEI hides itself; recipes shared).
- **ModernFix** — body name-drops Embeddium as the renderer to pair with on Forge/NeoForge.

## Configs to make (known knobs)

1. **Sophisticated Backpacks — disable stack upgrades** (lead's call, pending route):
   (a) the mod's server-side config upgrade settings, or (b) deterministic KubeJS:
   remove the Stack Upgrade item's recipes and hide it. Exact keys get pinned once the
   route is chosen.
2. **server.properties: `enforce-secure-profiles=false`** — makes the chat-privacy
   setup actually hold; modded clients connect without signing chats.
3. **faun** — `faun.properties`, per friend, per setting (see limitations above).
4. **Sophisticated Backpacks loot spawns** — backpacks/upgrades generate into loot
   chests and mobs can spawn wearing them; open decision, keep or kill.
5. **AppleSkin** — nothing to configure; keep on both sides.
6. **Advanced Rocketry 3 recipe/loot pass** — after mod selection: `kubejs/server_scripts`
   supplying AR3's recipes (+ loot tables if wanted). Deferred by the lead until the
   roster freezes; recorded so it doesn't get lost.

## Candidates — one command each (run inside the pack folder, then `packwiz refresh`)

- **Chipped 4.0.2** (parked — the atlas-heavy breadth king; if a variant family is
  missing from Rechiseled, this rides back in and pays the atlas cost):
  `packwiz modrinth add chipped athena-ctm resourceful-lib`
- **NiftyBlocks 1.35.6**: `packwiz modrinth add niftyblocks`
- **Othertime 2.1.7.1** (ARR — fine in a pack, not to loot assets from): `packwiz modrinth add othertime`
- **Sophisticated Storage 1.6.9.2199** (probably redundant now that Tom's is in — only
  if the furniture-look storage lane is wanted): `packwiz modrinth add sophisticated-storage sophisticated-core puzzles-lib`
- **JEI 19.70.0.460** (only if someone insists on the EMI↔JEI bridge): `packwiz modrinth add jei`

Checked and dead-ended: **PaxRomana on Modrinth** is a beta-1.7.3-era mod (the modern
fast-travel mod went in as Via Romana), **Create: Extended Storage**, **mbd2thread**
(1.20.1-only), **Simple Chat Encryption**, **FreedomChat** — no 1.21.1 builds.

## The CurseForge entry

ToolBelt is the only manifest item not on Modrinth. Its `toolbelt.pw.toml` carries
`[update.curseforge]` (project 260262, file 8309722) plus the hashed CDN URL — installers
treat it identically. `packwiz curseforge add` works with no API key setup (built-in
key), and `packwiz update` handles CF metafiles the same as Modrinth ones.

## Distribution plan — GitHub + Pages (the lead's architecture)

1. **Repo**: this folder goes to GitHub. Public repo (Pages serves private repos only
   on paid plans).
2. **Pages**: repo served statically → `https://<org>.github.io/<repo>/pack.toml`
   becomes the canonical manifest URL.
3. **Friends on the installer route**: bootstrap points at the Pages URL —
   `java -jar packwiz-installer-bootstrap.jar <pages-url>/pack.toml`. Manifest, index,
   and configs come from Pages; mod jars stream straight from the Modrinth/CurseForge
   CDNs (Pages carries zero mod weight).
4. **Launcher-route friends**: `packwiz curseforge export` → self-contained zip attached
   to a GitHub Release.
5. **Zero-touch config**: configs committed to the repo → `packwiz refresh` → every
   friend's installer syncs them on next launch. Bootstrapping + config for all users
   from one source of truth — exactly the stated plan.

Caveat: GitHub Pages caches ~10 minutes (`Cache-Control: 600`) — after a push, allow up
to 10 minutes before expecting installs to see the new index.

## Friend install routes

**A. Launcher import (easiest for a friend group):**
`packwiz curseforge export` → `.zip` that Prism / CurseForge launcher imports directly.
Non-CurseForge mods are downloaded at export time and embedded into the zip's overrides
(verified in the export source) — output is self-contained.

**B. Git + bootstrapper (the git-friendly way):**
host this folder in a repo, friends drop the
[packwiz-installer bootstrap](https://github.com/packwiz/packwiz-installer) into their
instance and point it at the raw pack.toml URL. It syncs everything the index lists,
hash-verified. Works for servers too.

## Configs generally

Drop any config into `config/` (or `kubejs/`) and run `packwiz refresh` — non-mod files
are auto-indexed with sha256 and synced to friends from wherever the pack is hosted.
Use a `.packwizignore` file to exclude strays.

## Updating

`packwiz update --all` (or per-mod) → `packwiz refresh` → commit. Bump `version` in
pack.toml so friends' installers notice. `packwiz update --all --check-only` previews.

## Getting the CLI

packwiz stopped shipping GitHub releases — build from source:
`git clone https://github.com/packwiz/packwiz && cd packwiz && go build` (needs Go).
The installer side has ready releases at the packwiz-installer repo.

## Open calls (pack lead)

AR3 recipe/loot pass (after mod selection) · backpack loot-spawn keep/kill ·
AR3 planets: BOP or custom planet jsons, later.

Resolved: Via Romana identity (confirmed) · Rechiseled-vs-Chipped lane (Rechiseled) ·
performance baseline (approved) · Tom's Simple Storage (in) · **Pack name (Minebricks)**.

## Renames

`name`, `author`, `version` in pack.toml are yours. Leave `pack-format` alone.

## Metalworks trio (added 2026-10-25)

- **Productive Metalworks** 1.21.1-1.15.1 (CF 1184570, file 8558526) — foundry multiblock,
  smelting + casting. Required dep `productivelib [1.21.1-0.2.0, 1.21.1-0.3.0)` is satisfied
  via Jar-in-Jar (verified `META-INF/jarjar/metadata.json`: productivelib-0.2.0 nested, plus
  flywheel 1.0.4-30 and ponder 1.0.81). `productivebees` dep is optional — not added.
- **Silent Gear Metalworks** 1.21.1-1.5.0 (CF 1199188, file 7897500) — metal gear parts must
  be cast in the foundry; crafting-grid meltable use disabled. Deps verified: PM ≥1.8.0 ✓,
  silentgear ≥4.0.25 (pack has 4.2.1.1) ✓, silentgems ≥5.0.3 (pack has 5.1.3) ✓.
- **KubeJS Metalworks** 1.0.0 (CF 1589907, file 8329295, by NullSc4pe) — script helpers for
  melting/casting/alloying. kubejs ≥2101.7 (pack has 2101.7.2-b377) ✓.

All three are CurseForge-only: metafiles carry `[update.curseforge]` sections, jars fetched
from mediafilez.forgecdn.net and sha512-pinned locally. Index 49→52 entries, pack.toml index
hash recomputed, `packwiz_verify.py` ALL PASS.

Design consequences (pack lead): molten fluids + temperatures for custom ores via KubeJS
Metalworks = makeOre emit growth, **deferred**. Standing requirement: statistical
ore-availability check per metal before shipping (avoid TFC-style scarcity traps).
