# MINT-REPORT

- graph kind: **static-fixture-pre-kubejs** (generated fixture)
- corpus: 5943 recipes (975 quarantined), 925 tags, 222 block-loot edges, 185 source loot tables, 19 growth dials
- observed item universe: 4630; bootstrappable from listed sources: **2927 (63.2%)**

> STATIC FIXTURE — jar-side, pre-KubeJS. Ground truth for doctrine verification is a runtime `/mintdump` pass; KubeJS script edges are invisible here by construction. Numbers below are a preview, not a ruling.

## A. Ungated expansions (doctrine violations)

None found in this corpus.

## B. Gated growths (dial-sourced, gate on record)

1. **minecraft:pumpkin_seeds -> minecraft:pumpkin -> minecraft:pumpkin_seeds** — net ×4.00 per iteration, ~1500s/cycle
   - edge via dial `pumpkin-plot`
   - edge via minecraft:crafting_shapeless `minecraft:pumpkin_seeds`
   - gate: farmland + water + hand harvest
2. **minecraft:potato -> minecraft:potato** — net ×3.50 per iteration, ~1500s/cycle
   - edge via dial `potato-plot`
   - gate: farmland + water + hand harvest
3. **minecraft:carrot -> minecraft:carrot** — net ×3.50 per iteration, ~1500s/cycle
   - edge via dial `carrot-plot`
   - gate: farmland + water + hand harvest
4. **minecraft:sugar_cane -> minecraft:sugar_cane** — net ×3.00 per iteration, ~900s/cycle
   - edge via dial `sugar-cane`
   - gate: hand-break mid-stalk, keep base
5. **minecraft:nether_wart -> minecraft:nether_wart** — net ×3.00 per iteration, ~900s/cycle
   - edge via dial `nether-wart-plot`
   - gate: soul sand + hand harvest
6. **minecraft:cocoa_beans -> minecraft:cocoa_beans** — net ×3.00 per iteration, ~900s/cycle
   - edge via dial `cocoa-pod`
   - gate: jungle-log host + hand harvest
7. **minecraft:bamboo -> minecraft:bamboo** — net ×2.50 per iteration, ~600s/cycle
   - edge via dial `bamboo-shoot-growth`
   - gate: hand/planned harvest; no vanilla auto-breaker in pack
8. **minecraft:sweet_berries -> minecraft:sweet_berries** — net ×2.50 per iteration, ~1200s/cycle
   - edge via dial `sweet-berry-bush`
   - gate: hand harvest, bush persists and regrows
9. **minecraft:kelp -> minecraft:kelp** — net ×2.00 per iteration, ~900s/cycle
   - edge via dial `kelp-column`
   - gate: hand harvest, top replanted; water column required
10. **minecraft:cactus -> minecraft:cactus** — net ×2.00 per iteration, ~900s/cycle
   - edge via dial `cactus-row`
   - gate: hand-break; no observer farm machinery in pack doctrine
11. **minecraft:beetroot_seeds -> minecraft:beetroot_seeds** — net ×2.00 per iteration, ~1500s/cycle
   - edge via dial `beetroot-plot`
   - gate: farmland + water + hand harvest
12. **minecraft:glow_berries -> minecraft:glow_berries** — net ×2.00 per iteration, ~1200s/cycle
   - edge via dial `glow-berries-vine`
   - gate: cave vine, hand harvest
13. **minecraft:chorus_flower -> minecraft:chorus_flower** — net ×2.00 per iteration, ~600s/cycle
   - edge via dial `chorus-flower`
   - gate: end islands only; hand harvest; flower spread bounded by plant age
14. **minecraft:wheat_seeds -> minecraft:wheat_seeds** — net ×1.50 per iteration, ~1500s/cycle
   - edge via dial `wheat-plot`
   - gate: farmland + water + hand harvest; seed return mean ~1.5 (0-3)

## C. Flat loops (parity, no mint)

134 flat loops found — compress/decompress and equivalent round-trips. Net factor 1.0; no doctrine issue. First 10:
1. framedblocks:framed_flat_double_slope_panel_corner -> framedblocks:framed_flat_inv_double_slope_panel_corner -> framedblocks:framed_flat_double_slope_panel_corner — ×1.00
2. framedblocks:framed_flat_double_slope_slab_corner -> framedblocks:framed_flat_inv_double_slope_slab_corner -> framedblocks:framed_flat_double_slope_slab_corner — ×1.00
3. framedblocks:framed_double_slope_panel -> framedblocks:framed_inv_double_slope_panel -> framedblocks:framed_double_slope_panel — ×1.00
4. framedblocks:framed_double_slope_slab -> framedblocks:framed_inv_double_slope_slab -> framedblocks:framed_double_slope_slab — ×1.00
5. framedblocks:framed_corner_pillar -> framedblocks:framed_pillar -> framedblocks:framed_corner_pillar — ×1.00
6. framedblocks:framed_fence -> framedblocks:framed_post -> framedblocks:framed_fence — ×1.00
7. framedblocks:framed_half_pillar -> framedblocks:framed_slab_corner -> framedblocks:framed_half_pillar — ×1.00
8. framedblocks:framed_pillar_socket -> framedblocks:framed_split_pillar_socket -> framedblocks:framed_pillar_socket — ×1.00
9. mcwbridges:acacia_log_bridge_middle -> mcwbridges:acacia_log_bridge_stair -> mcwbridges:acacia_log_bridge_middle — ×1.00
10. mcwbridges:acacia_rope_bridge_stair -> mcwbridges:rope_acacia_bridge -> mcwbridges:acacia_rope_bridge_stair — ×1.00

## D. Compound-recipe mass watchlist (multi-input, out > in by count)

- `railcraft:abandoned_track` (minecraft:crafting_shaped): 7 in -> 32x railcraft:abandoned_track
- `railcraft:electric_track` (minecraft:crafting_shaped): 7 in -> 32x railcraft:electric_track
- `railcraft:high_speed_track` (minecraft:crafting_shaped): 7 in -> 32x railcraft:high_speed_track
- `railcraft:reinforced_track` (minecraft:crafting_shaped): 7 in -> 32x railcraft:reinforced_track
- `railcraft:strap_iron_track` (minecraft:crafting_shaped): 7 in -> 32x railcraft:strap_iron_track
- `railcraft:high_speed_electric_track` (minecraft:crafting_shaped): 9 in -> 32x railcraft:high_speed_electric_track
- `framedblocks:framed_corner_strip_from_framed_floor_board` (minecraft:crafting_shapeless): 2 in -> 16x framedblocks:framed_corner_strip
- `framedblocks:framed_corner_strip_from_framed_wall_board` (minecraft:crafting_shapeless): 2 in -> 16x framedblocks:framed_corner_strip
- `framedblocks:framed_fancy_rail` (minecraft:crafting_shaped): 7 in -> 16x framedblocks:framed_fancy_rail
- `minecraft:rail` (minecraft:crafting_shaped): 7 in -> 16x minecraft:rail
- `framedblocks:phantom_paste_from_phantom_membrane` (minecraft:crafting_shaped): 9 in -> 16x framedblocks:phantom_paste
- `handcrafted:black_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:black_cushion
- `handcrafted:blue_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:blue_cushion
- `handcrafted:brown_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:brown_cushion
- `handcrafted:cyan_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:cyan_cushion
- `handcrafted:gray_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:gray_cushion
- `handcrafted:green_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:green_cushion
- `handcrafted:light_blue_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:light_blue_cushion
- `handcrafted:light_gray_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:light_gray_cushion
- `handcrafted:lime_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:lime_cushion
- `handcrafted:magenta_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:magenta_cushion
- `handcrafted:orange_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:orange_cushion
- `handcrafted:pink_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:pink_cushion
- `handcrafted:purple_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:purple_cushion
- `handcrafted:red_cushion` (minecraft:crafting_shaped): 9 in -> 16x handcrafted:red_cushion

## E. Not bootstrappable from listed sources (sample)

1703 items in the universe sit outside the closure (exotic sinks — end loot, boss drops, non-worldgen structures...). First 40: chipped:alchemy_bench chipped:botanist_workbench chipped:carpenters_table chipped:glassblower chipped:loom_table chipped:mason_table chipped:tinkering_table create:bar_of_chocolate create:crushed_raw_aluminum create:crushed_raw_copper create:crushed_raw_gold create:crushed_raw_iron create:crushed_raw_lead create:crushed_raw_nickel create:crushed_raw_osmium create:crushed_raw_platinum create:crushed_raw_silver create:crushed_raw_tin create:crushed_raw_uranium create:crushed_raw_zinc create_ironworks:crushed_raw_tin framedblocks:framed_one_way_window framedblocks:framed_target geore:aluminum_block geore:aluminum_shard geore:ancient_debris_block geore:ancient_debris_shard geore:coal_block geore:coal_shard geore:copper_block geore:copper_shard geore:diamond_block geore:diamond_shard geore:emerald_block geore:emerald_shard geore:gold_block geore:gold_shard geore:iron_block geore:iron_shard geore:lapis_block

## F. Sources on record

- 176 items seeded from 185 loot tables + 0 explicit entries

## G. Dial ledger

All time-based growth is a dial in `GROWTH-DIALS.json` — reviewable, turnable, and audited like any other edge.
- `bamboo-shoot-growth`: 1x minecraft:bamboo -> 2.5x minecraft:bamboo (600s, rough)
- `sugar-cane`: 1x minecraft:sugar_cane -> 3.0x minecraft:sugar_cane (900s, rough)
- `kelp-column`: 1x minecraft:kelp -> 2.0x minecraft:kelp (900s, rough)
- `cactus-row`: 1x minecraft:cactus -> 2.0x minecraft:cactus (900s, rough)
- `wheat-plot`: 1x minecraft:wheat_seeds -> 1.0x minecraft:wheat, 1.5x minecraft:wheat_seeds (1500s, rough)
- `potato-plot`: 1x minecraft:potato -> 3.5x minecraft:potato (1500s, rough)
- `carrot-plot`: 1x minecraft:carrot -> 3.5x minecraft:carrot (1500s, rough)
- `beetroot-plot`: 1x minecraft:beetroot_seeds -> 1.0x minecraft:beetroot, 2.0x minecraft:beetroot_seeds (1500s, rough)
- `melon-plot`: 1x minecraft:melon_seeds -> 1.0x minecraft:melon (1500s, rough)
- `pumpkin-plot`: 1x minecraft:pumpkin_seeds -> 1.0x minecraft:pumpkin (1500s, rough)
- `sweet-berry-bush`: 1x minecraft:sweet_berries -> 2.5x minecraft:sweet_berries (1200s, rough)
- `glow-berries-vine`: 1x minecraft:glow_berries -> 2.0x minecraft:glow_berries (1200s, rough)
- `nether-wart-plot`: 1x minecraft:nether_wart -> 3.0x minecraft:nether_wart (900s, rough)
- `cocoa-pod`: 1x minecraft:cocoa_beans -> 3.0x minecraft:cocoa_beans (900s, rough)
- `chorus-flower`: 1x minecraft:chorus_flower -> 2.0x minecraft:chorus_flower, 3.0x minecraft:popped_chorus_fruit (600s, rough)
- `crimson-huge-fungus`: 1x minecraft:crimson_fungus -> 2.5x minecraft:crimson_stem (1200s, rough)
- `warped-huge-fungus`: 1x minecraft:warped_fungus -> 2.5x minecraft:warped_stem (1200s, rough)
- `oak-tree`: 1x minecraft:oak_sapling -> 4.0x minecraft:oak_log (2400s, post-DT placeholder)
- `birch-tree`: 1x minecraft:birch_sapling -> 4.0x minecraft:birch_log (2400s, post-DT placeholder)
