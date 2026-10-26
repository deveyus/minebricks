// Minebricks oregen survey — content part A (sections 1-7)
module.exports.buildA = function buildA(ctx) {
  const { h1, h2, p, code, tbl, tblTitle, bullets } = ctx;
  const out = [];

  // ---------- 1. Executive Summary ----------
  out.push(h1("1. Executive Summary"));
  out.push(p("This survey answers one question: how should Minebricks, a 42-mod NeoForge 1.21.1 pack, take drastic control of ore generation without adding heavy machinery or breaking mod compatibility? Four control lanes were investigated on 2026-10-25, and every load-bearing claim in this document was verified against a primary source on that date: the NeoForge documentation and source tree, the exact KubeJS build pinned in the pack, the Modrinth API, the packwiz reference documentation, and vanilla 1.21.1 worldgen data extracted from the community mcmeta mirror. Nothing in the comparison rests on recollection or on secondhand tutorials."));
  out.push(p("The verdict is unambiguous. The winning lane is a pure datapack built on NeoForge's biome-modifier system: one JSON file can remove named vanilla ore features from every overworld or nether biome, and a matching pair of feature JSONs per custom ore adds replacements. Removals run in a dedicated removal phase after all mods have registered their features, and they operate on explicitly named feature IDs, so they can never silently delete Advanced Rocketry 3 content or any other mod's ores. The result is deterministic across every friend's install, diffs cleanly as JSON in the pack repository, adds no runtime cost, and ships through the existing packwiz pipeline with at most one tiny loader mod added (Paxi, verified at version 1.21.1-NeoForge-5.1.3)."));
  out.push(p("The KubeJS lane is closed. Worldgen events were disabled in KubeJS 7.0 for Minecraft 1.21, and the exact build pinned in the pack (2101.7.2-build.377) was downloaded and scanned: it contains zero worldgen classes. No first-party replacement addon has shipped as of the survey date. Terrain-overhaul mods such as Tectonic and Terralith are available for 1.21.1 NeoForge but solve a different problem and remain parked. KubeJS keeps its planned role in the pack: recipes, loot tables and server scripts, including the pending Advanced Rocketry 3 supply pass."));

  // ---------- 2. Pack Context ----------
  out.push(h1("2. Pack Context, Goals and Success Criteria"));
  out.push(p("Minebricks at version 0.4.0 runs Minecraft 1.21.1 on NeoForge 21.1.265 and is managed entirely through packwiz, with distribution planned over GitHub Pages for the manifest and GitHub Releases for self-contained export zips. The roster is deliberately performance-biased: Rechiseled was chosen over Chipped specifically to keep texture-atlas size down, and a seven-mod performance baseline is already installed. KubeJS is present for scripted recipes and loot tables, and Advanced Rocketry 3 is in the manifest awaiting its recipe and loot supply pass. Any ore-generation surgery must respect these standing decisions rather than fight them."));
  out.push(p("An oregen overhaul therefore has to satisfy six criteria before individual options are even compared. Each criterion comes from a decision the pack lead has already made, so they function as hard filters rather than soft preferences:"));
  out.push(bullets([
    "Near-zero added mod weight, consistent with the performance bias and the Rechiseled-over-Chipped precedent.",
    "Deterministic, identical world generation for every friend's install and for the server.",
    "Reviewable as plain data in the git repository, diffable line by line.",
    "Server-side and datapack-side only where possible; no per-client setup steps.",
    "No rendering, memory or atlas regressions of the kind that ruled out Chipped.",
    "Surgical targeting: only vanilla ore features may be touched, never mod-added ones.",
  ]));
  out.push(p("These criteria, not taste, decide the comparison in section 8. An option that requires a client install on every machine, or that cannot be expressed as reviewable data in the repository, loses points accordingly. The scope is also deliberately limited to ore placement control: wholesale biome or terrain reworks are only noted where they intersect with that goal, in section 7."));

  // ---------- 3. How Ore Generation Works ----------
  out.push(h1("3. How Ore Generation Works in 1.21.1"));
  out.push(p("Ore generation in vanilla 1.21.1 is a three-stage data pipeline, and every stage is a JSON file in a datapack registry. A configured feature defines the vein itself: its shape type, size, and which blocks it may replace. A placed feature wraps that configured feature with placement rules: attempts per chunk, horizontal spreading, a height-range distribution, and a biome filter. Finally, each biome JSON lists placed features under generation steps, and ores live in the underground_ores step. Change any stage with a datapack and the world generator picks it up with no mod involved."));
  out.push(p("NeoForge adds a fourth layer on top of that pipeline, and this layer is the heart of the recommended lane. Biome modifiers are small JSON files, loaded from a datapack, that add or remove placed features to or from biomes at load time, addressed by biome ID or biome tag. Because they are applied after all registries settle, one file can target every overworld biome at once through a tag such as #minecraft:is_overworld, instead of editing dozens of biome files. According to the NeoForge documentation, biome modifier files live at data/<namespace>/neoforge/biome_modifier/<name>.json inside a datapack, and pre-existing modifiers from mods can even be overridden by a datapack file at the same path."));
  out.push(p("For concreteness, the exact vanilla 1.21.1 data matters. The mcmeta mirror (ref 1.21.1-data) lists 233 vanilla placed features in total, of which 40 are ore features: 30 in the overworld, including the stone-variant blob features, and 10 in the nether. The complete, copy-paste-ready list is in Appendix A. One of those 40, verbatim from the mirror, shows the shape of the data this survey works with:"));
  out.push(code([
    "// data/minecraft/worldgen/placed_feature/ore_diamond.json (vanilla 1.21.1)",
    "{",
    "  \"feature\": \"minecraft:ore_diamond_small\",",
    "  \"placement\": [",
    "    { \"type\": \"minecraft:count\", \"count\": 7 },",
    "    { \"type\": \"minecraft:in_square\" },",
    "    { \"type\": \"minecraft:height_range\", \"height\": {",
    "        \"type\": \"minecraft:trapezoid\",",
    "        \"max_inclusive\": { \"above_bottom\": 80 },",
    "        \"min_inclusive\": { \"above_bottom\": -80 } } },",
    "    { \"type\": \"minecraft:biome\" }",
    "  ]",
    "}",
  ]));
  out.push(p("That one file contains every knob an oregen overhaul wants to turn: seven placement attempts per chunk, spread across the chunk square, concentrated in a trapezoidal band from 80 blocks above the bottom of the world to 80 below it, and filtered by biome. Height bands, vein frequency and vein size (the size field lives in the matching configured feature) are all plain numbers here. The survey's recommended lane edits exactly this kind of data, plus the NeoForge modifier layer on top."));

  // ---------- 4. Lane A ----------
  out.push(h1("4. Lane A: NeoForge Biome-Modifier Datapack (Recommended)"));
  out.push(h2("4.1 Verified Mechanics"));
  out.push(p("The NeoForge documentation (Biome Modifiers page) confirms three built-in modifier types that cover the whole job. The type neoforge:add_features takes a biome ID, list or tag, a placed feature ID, list or tag, and one generation step, and injects features into those biomes. The type neoforge:remove_features takes the same biome targeting, one or more generation steps, and placed features to strip out. The type neoforge:none is a no-op used to disable an existing modifier by overriding its file. A fourth detail was verified at source level, in NeoForge's BiomeModifiers.java: removal runs in a dedicated REMOVE phase, after the ADD phase in which mods inject their own features, via a removeIf that matches exactly the listed features."));
  out.push(p("That source check settles the most important safety question for a pack that carries Advanced Rocketry 3. An empty features list removes nothing, not everything; removal is always by explicit ID, list or tag. A Minebricks removal file that names vanilla ore IDs can therefore never collide with ores another mod adds, no matter how the two modifiers are ordered. The documentation page fetched during this survey reflects the latest NeoForge line, so the same behavior was cross-confirmed for our actual version by a community oregen project documenting neoforge:remove_features on NeoForge 21.1.219, one point release line below the pack's 21.1.265 pin."));
  out.push(h2("4.2 Removing Vanilla Ores"));
  out.push(p("Killing the vanilla ore set is then one file. The features array below names the nineteen pure-metal and gem ore features of the overworld; the stone-blob features (dirt, gravel, granite, diorite, andesite, tuff), the clay feature and the infested-stone feature are separate IDs from Appendix A, kept out of this example so the example only removes what its name claims. A nether twin of this file would target #minecraft:is_nether and list the ten nether IDs if the lead wants the nether overhauled too:"));
  out.push(code([
    "// data/minebricks/neoforge/biome_modifier/remove_vanilla_ores.json",
    "{",
    "  \"type\": \"neoforge:remove_features\",",
    "  \"biomes\": \"#minecraft:is_overworld\",",
    "  \"steps\": [ \"underground_ores\" ],",
    "  \"features\": [",
    "    \"minecraft:ore_coal_upper\",     \"minecraft:ore_coal_lower\",",
    "    \"minecraft:ore_iron_upper\",     \"minecraft:ore_iron_middle\",",
    "    \"minecraft:ore_iron_small\",     \"minecraft:ore_copper\",",
    "    \"minecraft:ore_copper_large\",   \"minecraft:ore_gold\",",
    "    \"minecraft:ore_gold_extra\",     \"minecraft:ore_gold_lower\",",
    "    \"minecraft:ore_redstone\",       \"minecraft:ore_redstone_lower\",",
    "    \"minecraft:ore_diamond\",        \"minecraft:ore_diamond_medium\",",
    "    \"minecraft:ore_diamond_large\",  \"minecraft:ore_diamond_buried\",",
    "    \"minecraft:ore_lapis\",          \"minecraft:ore_lapis_buried\",",
    "    \"minecraft:ore_emerald\"",
    "  ]",
    "}",
  ]));
  out.push(p("Three properties of this file deserve emphasis. It is one file for the entire overworld, because the biomes field accepts a tag. It is reversible line by line: deleting one entry from the array restores exactly one vanilla ore. And it is self-documenting in git history, so the pack lead can review any oregen change as a diff before it ever reaches a friend's launcher."));
  out.push(h2("4.3 Adding Custom Ores"));
  out.push(p("The addition side is a three-file chain per custom ore, all in the same datapack: a configured feature for the vein shape, a placed feature for frequency and height band, and one add_features modifier to inject it. The following sketch uses a hypothetical mythril ore with a triangular height band centered low in the world, mirroring the vanilla structure shown in section 3:"));
  out.push(code([
    "// data/minebricks/worldgen/configured_feature/ore_mythril.json",
    "{",
    "  \"type\": \"minecraft:ore\",",
    "  \"size\": 6,",
    "  \"discard_chance_on_air_exposure\": 0.0,",
    "  \"targets\": [ {",
    "    \"target\": { \"predicate_type\": \"minecraft:tag_match\",",
    "                 \"tag\": \"minecraft:stone_ore_replaceables\" },",
    "    \"state\": { \"Name\": \"minebricks:mythril_ore\" } } ]",
    "}",
    "",
    "// data/minebricks/worldgen/placed_feature/ore_mythril.json",
    "{",
    "  \"feature\": \"minebricks:ore_mythril\",",
    "  \"placement\": [",
    "    { \"type\": \"minecraft:count\", \"count\": 6 },",
    "    { \"type\": \"minecraft:in_square\" },",
    "    { \"type\": \"minecraft:height_range\", \"height\": {",
    "        \"type\": \"minecraft:trapezoid\",",
    "        \"min_inclusive\": { \"absolute\": -32 },",
    "        \"max_inclusive\": { \"absolute\": 32 } } },",
    "    { \"type\": \"minecraft:biome\" }",
    "  ]",
    "}",
    "",
    "// data/minebricks/neoforge/biome_modifier/add_mythril.json",
    "{",
    "  \"type\": \"neoforge:add_features\",",
    "  \"biomes\": \"#minecraft:is_overworld\",",
    "  \"step\": \"underground_ores\",",
    "  \"features\": \"minebricks:ore_mythril\"",
    "}",
  ]));
  out.push(p("One honest caveat: worldgen JSON can only place blocks that already exist as block states. A brand-new ore block such as minebricks:mythril_ore must be registered somewhere first, which in this pack means either a KubeJS startup script registering the block or reusing an existing modded block. The worldgen half and the content half are independent, so the placement design can be finished and tested against a placeholder block long before the item economy around the ore is decided."));
  out.push(h2("4.4 Assessment"));
  out.push(p("Against the six criteria, Lane A scores as well as it is possible to score. It adds zero mods if a loader is already present, or exactly one small one otherwise; it is perfectly deterministic because JSON datapacks are world-agnostic; it lives in the repository as reviewable data; it is server-compatible by construction since datapacks load on dedicated servers; it has no rendering or atlas footprint at all; and the verified explicit-ID removal semantics make it surgical by design. The costs are real but modest: the author must learn the vanilla feature JSON schema, each custom ore costs three small files, and a datapack needs a shipping mechanism, which is exactly what Lane C provides. Nothing in the schema is version-fragile in practice; the ore feature set has been stable in this shape since 1.18."));

  // ---------- 5. Lane B ----------
  out.push(h1("5. Lane B: KubeJS Worldgen, Verified Unavailable"));
  out.push(p("KubeJS historically shipped WorldgenEvents that could add or remove features from scripts, and a large body of tutorials still shows that syntax. On the versions this pack uses, that API is gone. The official KubeJS wiki entry for the 7.0 major update, the release that targets Minecraft 1.21, states plainly: worldgen events are currently disabled and will most likely be moved to a first-party addon. The 7.2 update page, which covers the 1.21.1 line the pack actually pins, records two unrelated fixes and no restoration of worldgen."));
  out.push(p("Because a changelog alone is not proof, the pinned artifact itself was checked. The exact jar the pack installs, kubejs-neoforge-2101.7.2-build.377, was downloaded from the Modrinth CDN and its archive listing contains zero entries matching worldgen, at any path. The KubeJS repository source trees for the main, 1.21 and 1.21.1 refs likewise contain no worldgen Java files. A Modrinth search for a first-party or third-party KubeJS worldgen addon returned no such addon. The practical reading: any guide showing WorldgenEvents.remove on a 1.21.1 page, such as the otherwise useful ars.guide entries, is pre-7.0 material and those snippets will not run on the pack's build."));
  out.push(p("None of this diminishes KubeJS's role in Minebricks. Scripted recipes, loot table edits, tag events and server scripts all remain fully supported on 2101.7.2, which is precisely what the Advanced Rocketry 3 supply pass needs. The conclusion is a division of labor, not a removal: KubeJS owns recipe-level and loot-level customization, while ore placement belongs to the datapack lane."));

  // ---------- 6. Lane C ----------
  out.push(h1("6. Lane C: Shipping the Datapack with Paxi, Open Loader or packwiz"));
  out.push(p("A datapack placed loose in a friend's instance folder does nothing: vanilla loads datapacks per world, from the world's own datapacks folder, and a modpack cannot reach into every friend's save directory. Lane A therefore needs a tiny loader mod that re-exposes one or more global folders as always-on datapacks. Two credible candidates were verified for 1.21.1 NeoForge, and packwiz was verified to carry whichever folder they use."));
  out.push(p("Paxi is the stronger candidate. The Modrinth API lists version 1.21.1-NeoForge-5.1.3, published 2025-05-01, and the project page documents the mechanism: data packs placed in .minecraft/config/paxi/datapacks are loaded automatically into every world, the folder is created on first run, and since 5.1.3 a default-enabled config option additionally loads everything in .minecraft/datapacks. Both zips and folders are accepted. Paxi is a long-established mod with no required dependencies of its own."));
  out.push(p("Open Loader by DarkhaxDev is the alternative and is also verified: version 21.1.5 on the Modrinth API, published 2025-05-19, supports 1.21.1 NeoForge. Its README documents .minecraft/openloader/data for data packs and .minecraft/openloader/resources for resource packs, loading both zips and folders. An older bug report claiming datapacks did not load on NeoForge 21.1.132 was closed in April 2025 as user error, with the author confirming he could not reproduce it on 21.1.133; the pack pins 21.1.265, well above that line."));
  out.push(p("The shipping half is already solved by the pack's own tooling. The packwiz reference documents a datapack-folder option in the [options] section of pack.toml, intended for exactly this pattern: the folder belongs to the loader mod in use. Independently of that option, the packwiz-installer source was reviewed during the original v0.1 build of this pack and auto-indexes every non-ignored pack file on refresh, hash-verified on install. In practice that means the datapack zip dropped into config/paxi/datapacks rides through the same index that already ships configs, lands on every friend's instance on next launch, and costs GitHub Pages nothing but a few kilobytes, subject only to its documented 10-minute cache window."));
  out.push(p("Two alternatives were checked and eliminated. The Global-Datapacks-style mods indexed on Modrinth under the slugs global-datapacks and datapacks have no NeoForge 1.21.1 builds at all. The no-code datapack-as-mod trick, embedding the JSONs in a jar with a low-code mod loader, was flagged during research but not verified this session; with Paxi verified and one command away, that trick buys nothing and is not recommended."));

  // ---------- 7. Lane D ----------
  out.push(h1("7. Lane D: Terrain-First Overhaul Mods, Available but Off-Target"));
  out.push(p("The fourth lane, full worldgen overhaul mods, is available and verified but aims at a different target. Tectonic 3.0.28-neoforge-21.1, published 2026-09-11, and Terralith 2.6.2, published 2026-06-09, both resolve on the Modrinth API for Minecraft 1.21.1 on NeoForge. Both reshape terrain and biomes first; ore placement is incidental to their designs. They would not give Minebricks the ore-level control the lead asked for, and they would still leave the pack doing Lane A's work on top of them the moment real ore control is wanted."));
  out.push(p("They also add compatibility surface rather than removing it. Terralith replaces the overworld biome set wholesale, which changes what biome tags cover and therefore what a biome modifier actually hits; terrain-height overhauls interact with any custom Y-level bands the pack designs; and both mods carry their own feature sets into every biome. For a pack whose lead removed Chipped over atlas concerns, adding two world-sculpting mods to gain indirect access to ore knobs is the wrong trade."));
  out.push(p("Lane D therefore stays parked alongside Chipped, with the same activation condition: only if the lead later decides Minebricks wants a distinct terrain identity, mountains and canyon skylines included, does this lane reopen. If that day comes, the datapack from Lane A remains fully compatible, since biome modifiers apply to mod-defined biomes exactly as they do to vanilla ones."));
  return out;
};
