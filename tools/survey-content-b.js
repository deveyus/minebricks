// Minebricks oregen survey — content part B (sections 8-11 + Appendix A)
module.exports.buildB = function buildB(ctx) {
  const { h1, h2, p, code, tbl, tblTitle, bullets, numItem, PAL } = ctx;
  const out = [];

  // ---------- 8. Comparison ----------
  out.push(h1("8. Lane Comparison and Verdict"));
  out.push(p("Table 1 condenses the four lanes against the six criteria from section 2. Entries marked Verified were confirmed against a primary source during this survey; the two shaded verdict cells summarize the outcome. The comparison intentionally includes Lane C twice: once as its own row set, since a loader mod is a real (if small) dependency, and once folded into Lane A, which is the only lane that needs it."));
  out.push(tblTitle("Table 1: Control lanes against the pack's success criteria"));
  out.push(tbl(
    ["Criterion", "A: Biome-modifier datapack", "B: KubeJS worldgen", "C: Loader-mod shipping", "D: Overhaul mods"],
    [
      ["Added mod weight", "0 (with Paxi: 1 tiny mod)", "0 (but no capability)", "1 tiny mod (Paxi or Open Loader)", "1-2 large mods"],
      ["Determinism for all installs", "Yes, pure data", "N/A on 1.21.1", "Yes, hash-verified sync", "Yes, but mod-defined"],
      ["Git-diffable configuration", "Yes, plain JSON", "N/A", "Yes", "Config only"],
      ["Server-side only", "Yes", "N/A", "Yes (both sides)", "Both sides"],
      ["Performance / atlas risk", "None found", "N/A", "Negligible", "Real; terrain and features"],
      ["Mod-compatibility risk", "Lowest: explicit IDs only", "N/A", "None found", "Tags and biomes change"],
      ["Oregen control depth", "Full: remove and add, per Y band", "None on 1.21.1 (verified)", "Transport only", "Indirect at best"],
      ["Status", "Recommended", "Verified unavailable", "Required helper for A", "Parked"],
    ],
    [24, 22, 18, 18, 18]
  ));
  out.push(p("The verdict follows directly. Lane A with Paxi as the carrier is the only option that satisfies all six criteria simultaneously, and every mechanism it relies on was verified at source, binary or API level during this survey. Lane B is not a fallback but a closed door on this Minecraft version; Lane C is not an alternative but a component; Lane D is a different project. The remaining risk in Lane A is authoring effort, which section 9 sequences into small, individually testable steps."));

  // ---------- 9. Implementation plan ----------
  out.push(h1("9. Recommended Implementation Plan for Minebricks"));
  out.push(p("The plan below turns the verdict into six steps, each independently reversible and each testable on a single client before anything is pushed to friends. Steps 1 and 2 change the pack manifest; steps 3 to 5 build and prove the datapack; step 6 is ordinary pack housekeeping."));
  out.push(numItem(0, "Add the loader mod. Run packwiz modrinth add paxi in the pack folder (or open-loader if the lead prefers its folder layout), then packwiz refresh. Optionally set datapack-folder = \"config/paxi/datapacks\" under [options] in pack.toml so future packwiz-managed datapacks land there by default."));
  out.push(numItem(1, "Create the datapack skeleton inside the repo, for example under datapacks/minebricks-oregen/: a pack.mcmeta with pack_format 48 (the 1.21.1 worldgen-capable format), plus the data/ tree. Committing it inside the pack repo keeps it under the same review discipline as configs."));
  out.push(numItem(2, "Write the removal file from section 4.2, plus a nether twin if wanted, and zip the datapack into config/paxi/datapacks/ in the pack root. Run packwiz refresh so the zip joins the index."));
  out.push(numItem(3, "Verify removals on a throwaway client instance: generate three fresh worlds with different seeds, fly in spectator mode, and confirm the listed ores are absent while stone blobs remain. A targeted check is /place feature minecraft:ore_diamond ~ ~ ~, which should now fail to place a diamond vein on stone."));
  out.push(numItem(4, "Add the first custom ore via the section 4.3 chain, initially targeting a placeholder vanilla block, and re-test: the vein should appear at the designed Y band and nowhere else. Check the log for missing-feature warnings, which are the datapack equivalent of a stack trace."));
  out.push(numItem(5, "Rebuild the packwiz zip (minebricks-packwiz-0.4.0.zip or a bumped version) and push. Friends pick the datapack up on their next installer launch; GitHub Pages serves the new index within its normal 10-minute cache window. The AR3 KubeJS supply pass proceeds on its own track, untouched by any of this."));
  out.push(p("The testing protocol in steps 3 and 4 is deliberately manual and cheap: ore generation has no unit tests, but three spectator flights catch essentially every placement mistake, and the explicit-ID design means a mistake is always a missing or extra JSON entry, never a mysterious interaction. If a removal ever needs to be rolled back for one ore, deleting its array entry and re-syncing is the whole rollback."));

  // ---------- 10. Open design decisions ----------
  out.push(h1("10. Open Design Decisions for the Pack Lead"));
  out.push(p("Research closes here; the following four questions are design choices that only the pack lead can make, listed with the context needed to decide them. None of them blocks the implementation plan from starting, since the removal file's ore list is trivially editable until the roster freezes."));
  out.push(bullets([
    "Ore roster: which of the 30 overworld features in Appendix A survive, and which are removed? The 19-ID example in section 4.2 removes only the metals and gems; blobs, clay and infested stone are opt-in removals.",
    "Custom ore set: how many replacement ores, at which Y bands and frequencies? The vanilla trapezoid distributions in section 3 are a proven tuning vocabulary.",
    "Carrier choice: Paxi (config/paxi/datapacks, plus default-on .minecraft/datapacks loading) or Open Loader (openloader/data)? Both verified; Paxi is the more widely used in modpacks.",
    "Nether handling: keep vanilla nether ore generation, remove it, or replace it in the same pass? The ten nether IDs are listed in Appendix A for whichever way the decision goes.",
  ]));
  out.push(p("Once these four are answered, the datapack content is fully determined and the pack gains an oregen identity that is one git diff away from any future revision. If the lead prefers, the removal file can ship first with the full 30-ID list as a clean-slate baseline, and individual ores can be restored by editing the array in either direction."));

  // ---------- 11. Verification log ----------
  out.push(h1("11. Verification Log and Sources"));
  out.push(p("Every claim below was checked live on 2026-10-25 against the listed primary source. Where a documentation page reflects a newer NeoForge line than the pack's pin, the behavior was additionally cross-confirmed on the 1.21.1 line itself, as noted. The vanilla feature list in Appendix A was extracted programmatically, not typed by hand, from the mcmeta mirror's 1.21.1-data ref."));
  out.push(tblTitle("Table 2: Claims, sources and verification method"));
  out.push(tbl(
    ["Claim", "Primary source", "Method"],
    [
      ["Biome modifier file path and built-in types", "docs.neoforged.net, Biome Modifiers", "Documentation fetch"],
      ["remove_features matches explicit IDs only; empty list removes nothing; REMOVE phase", "NeoForge BiomeModifiers.java (1.21.x)", "Source review"],
      ["neoforge:remove_features works on NeoForge 21.1.x for vanilla ore removal", "Community oregen project on 21.1.219", "Search cross-check"],
      ["KubeJS 7.0 disabled worldgen events, addon planned", "kubejs.com 7.0 major-update page", "Documentation fetch"],
      ["Pinned KubeJS 2101.7.2-build.377 has zero worldgen classes", "Modrinth CDN jar, exact pack pin", "Binary archive scan"],
      ["No KubeJS repo worldgen sources on main / 1.21 / 1.21.1", "KubeJS-Mods/KubeJS repo trees", "Tree scan via jsdelivr"],
      ["No first-party KubeJS worldgen addon shipped", "Modrinth search", "API query"],
      ["Paxi 1.21.1-NeoForge-5.1.3 available; folders documented", "Modrinth API + project page", "API + page fetch"],
      ["Open Loader 21.1.5 for 1.21.1 NeoForge; folders; old bug closed as user error", "Modrinth API + GitHub README + issue 42", "API + source review"],
      ["Global-Datapacks-style mods lack 1.21.1 NeoForge builds", "Modrinth API (two slugs)", "API query"],
      ["packwiz datapack-folder option in [options]", "packwiz.infra.link reference", "Documentation fetch"],
      ["Tectonic 3.0.28-neoforge-21.1 and Terralith 2.6.2 available", "Modrinth API", "API query"],
      ["Vanilla 1.21.1 ore placed-feature IDs (40)", "misode/mcmeta ref 1.21.1-data", "Programmatic extraction"],
    ],
    [42, 33, 25]
  ));
  out.push(p("One transparency note belongs in the record. The NeoForge documentation site serves its latest version by default, and the page fetched during this survey describes a newer line than 21.1.265; the modifier schema it documents has been stable since 1.20, and the 1.21.1-era behavior was independently confirmed by the source review and the 21.1.219 community project listed above. If the pack ever bumps its NeoForge pin substantially, the same three checks take five minutes to repeat."));

  // ---------- Appendix A ----------
  out.push(h1("Appendix A: Vanilla 1.21.1 Ore Placed Features"));
  out.push(p("The tables below list all 40 vanilla ore placed features for Minecraft 1.21.1, extracted programmatically from the misode/mcmeta mirror at ref 1.21.1-data. These are registry IDs: in any biome modifier features array they are written with the minecraft: prefix, for example minecraft:ore_diamond_buried. The overworld table splits naturally into the nineteen metal and gem ores, the nine stone-variant and terrain blob features, and two special cases; the nether table lists all ten of that dimension's features."));
  out.push(tblTitle("Table 3: Overworld ore placed features (30)"));
  out.push(tbl(
    ["Placed feature ID (minecraft:...)", "Generates"],
    [
      ["ore_coal_upper / ore_coal_lower", "Coal, two height bands"],
      ["ore_iron_upper / ore_iron_middle / ore_iron_small", "Iron, three height bands"],
      ["ore_copper", "Copper, triangular band"],
      ["ore_copper_large", "Large copper veins"],
      ["ore_gold", "Gold, base band"],
      ["ore_gold_extra", "Extra gold in badlands"],
      ["ore_gold_lower", "Gold in deepslate layers"],
      ["ore_redstone", "Redstone, upper band"],
      ["ore_redstone_lower", "Redstone, deep band"],
      ["ore_diamond / ore_diamond_medium / ore_diamond_large / ore_diamond_buried", "Diamonds, four variants"],
      ["ore_lapis / ore_lapis_buried", "Lapis, two variants"],
      ["ore_emerald", "Emeralds in mountain biomes"],
      ["ore_dirt / ore_gravel", "Dirt and gravel blobs"],
      ["ore_granite_upper / ore_granite_lower", "Granite blobs"],
      ["ore_diorite_upper / ore_diorite_lower", "Diorite blobs"],
      ["ore_andesite_upper / ore_andesite_lower", "Andesite blobs"],
      ["ore_tuff", "Tuff blobs"],
      ["ore_clay", "Clay patches"],
      ["ore_infested", "Silverfish-infested stone"],
    ],
    [55, 45]
  ));
  out.push(tblTitle("Table 4: Nether ore placed features (10)"));
  out.push(tbl(
    ["Placed feature ID (minecraft:...)", "Generates"],
    [
      ["ore_quartz_nether", "Nether quartz"],
      ["ore_quartz_deltas", "Quartz in basalt deltas"],
      ["ore_gold_nether", "Nether gold ore"],
      ["ore_gold_deltas", "Extra gold in basalt deltas"],
      ["ore_magma", "Magma blocks"],
      ["ore_blackstone", "Blackstone blobs"],
      ["ore_soul_sand", "Soul sand blobs"],
      ["ore_gravel_nether", "Gravel blobs"],
      ["ore_debris_small", "Small ancient debris veins"],
      ["ore_ancient_debris_large", "Large ancient debris veins"],
    ],
    [55, 45]
  ));
  out.push(p("A note on how to read the counts. Vanilla 1.21.1 registers 233 placed features in total; the 40 here are exactly those whose IDs begin with ore_, which makes the boundary of an oregen overhaul objective rather than a matter of opinion. Any pack-made replacement ore joins this registry under the minebricks namespace, keeping the same objective boundary: everything vanilla is in one list, everything pack-made is in the other, and the git diff between them is the entire story."));
  return out;
};
