# WORKED-EXAMPLE — one ore, end to end: IRON (staged 2026-10-26 ~04:30Z)

Her direction (msg 1564129685028208682): "We need to do a worked prospective example of a
given ore's processing I think right? One that includes the intended gameplay and any
perversions or circumventions that are actually better paths."

This doc is that example, worked for iron. Every number below is read out of the pack's
own jars (provenance lines at the bottom) — nothing guessed, nothing remembered. The
structure here is the template: once the lead blesses or edits it, the other metals get
stamped through the same shape.

---

## 1. The intended loop (as designed)

**Find it.** The detection stack (locked 2026-10-25/26): biome tag `minebricks:has_iron_fields`
names which fields carry the metal; the lithostitched composite vein sits in its Y-band;
sprout flora grows directly over vein centers (non-dropping, so no fake-marker farming);
the Silent Gear prospector hammer (`prospector_hammer_targets` tag) is the free scanner
item; the KubeJS right-click scanner adds natural=true precision; the chunk ledger
(ChunkDataEvent.Save marker design, ruled 03:06Z) remembers what you have already seen.

**Mine it.** Vanilla rules decide what drops:
- normal pick: raw iron x1 (Fortune scales the raw count, Fortune III averages ~2.2)
- Silk Touch: the ore block itself

**Smelt it — the Productive Metalworks foundry is the doubling engine:**

| input              | molten iron out | ingots (90 mB each) |
|--------------------|-----------------|---------------------|
| iron ORE block     | 270 mB          | **3.0x**            |
| raw iron           | 180 mB          | **2.0x**            |
| iron dust          | 90 mB           | 1.0x                |
| (vanilla furnace)  | —               | 1.0x (baseline)     |

Casting: ingot 90 mB, nugget 10 mB, block 810 mB. Minimum temperature for ores: 1000
(heating coils required — liquid coil = 6 copper + 1 bucket + 3 fire brick). MBD2 is
empty framework today (demo pedestal only) — it contributes nothing until built out.
Advanced Rocketry 3 is flight-chain only (zero processing machines, jar-verified).

**The mining fork the numbers create (before any pervertsions):**
- Fortune III mining beats everything: ~2.2 raw avg → ~396 mB ≈ 4.4 ingots per ore
- Silk Touch mining: flat 3.0x — beats raw-2x, loses only to high Fortune
- bare-hand normal mining: 2.0x

## 2. Perversion audit — the paths that actually win

**PERV1 — golem farm → chestplates → Railcraft blast furnace = STEEL AT FULL PARITY.**
The `railcraft:blasting` recipes convert iron gear to steel ingots at exactly the gear's
iron cost: chestplate (8 iron) → 8 steel, boots 4→4, leggings 7→7, helmet 5→5,
axe/pickaxe 3→3, sword/hoe/door/crowbar 2→2, shovel 1→1, trapdoor/horse armor 4→4.
Iron ingot → 1 steel, iron block → steel block. Consequence: an iron golem farm (or any
iron income that never touches a pickaxe) converts to steel at 1:1 with zero mining,
zero prospecting, zero foundry. The intended chain — find the field, scan it, mine it,
foundry it — is strictly DOMINATED for steel supply by a farm plus a crafting table.
This is the single biggest hole in the intended loop. It is a dial (D-W1 below).

**PERV2 — Silk Touch is an ore-melting buff.** The PM recipe eats the ORE BLOCK (tag
`c:ores/iron`) for 270 mB — 3 ingots — vs 180 for the raw item normal mining drops.
Silk-Touch mining the vein is +50% over honest mining. Whether that is a feature
(silk = the "refined miner's path") or a bug is a dial (D-W2).

**PERV3 — the Railcraft crusher does NOT process ores.** Common instinct says "crusher
= ore doubling." Jar truth: 87 crusher recipes, none for iron/copper/gold ore or raw
items (only raw iron/gold STORAGE BLOCKS → 9 raw, plus ingots→dusts and building
blocks). The crusher is an aux-materials machine (blaze rod, bone, cobble→gravel). If
the pack wants a crusher ore lane, it has to be authored (D-W3).

**PERV4 — the gravel lotto.** Crusher: 1 gravel → 1 sand + 0.1% gold nugget + 0.005%
diamond. A cobble→gravel loop is an AFK trickle of free gold/diamonds — negligible
rate, but it exists and it prints diamonds from dirt-tier input.

**PERV5 — loot chests are free metal, and Railcraft feeds the loop directly.** Railcraft
globally injects its own loot table into mineshaft, simple-dungeon, stronghold and
village-armorer chests (`railcraft:dungeon_loot_modifier`, jar-verified): iron crowbars,
spike mauls, overalls, minecarts — and a crowbar blasts into 2 steel ingots
(`blasting_iron_crowbar.json`). So chests hand out gear that converts to steel without
mining ever happening. Vanilla chest iron comes on top; the loot-dump pass (debug build
#1, already in her hands) will quantify the whole channel.

**Not perversions, for the record:** piglin bartering yields no iron; villager trades
move iron the wrong way; zombies' iron drops are noise next to a golem farm.

## 3. Dial sheet D-W (veto by number; suggested defaults in brackets)

- **D-W1 gear-blasting parity** — keep 1:1 [default: lossy, 0.5x — chestplate → 4
  steel] / keep 1:1 / restrict blasting to ingots+blocks only. This one decides whether
  mining ever matters for steel.
- **D-W2 silk-ore melt** — legal as-is [default] / block ore-block melting (raw+dust
  only) / lower ore to 180 mB. If blocked, Fortune stays the only mining incentive.
- **D-W3 crusher ore lane** — none [default: add later if wanted] / author crusher
  ore→dust+x recipes in KubeJS (e.g. 1 ore → 2 dust, dust melts 90 → 2x path).
- **D-W4 golem farms** — embrace [default: embrace — it's a friends' pack, farms are
  fun] / accept but lossy via D-W1 / make steel require foundry-melted iron only
  (recipe gate). D-W1 and D-W4 overlap; D-W1 is the cheaper lever.

## 4. What this example proves about the system

One metal worked end-to-end turns three open calls into fill-ins: the ROSTER call
becomes "which metals get a worked row," Y-bands become columns in section 1, and the
processing-route call (Railcraft / PM / MBD2) is now answered by evidence — PM foundry
is the doubling engine, Railcraft is the steel + aux layer, MBD2 is a shell until
authored. The prospecting half of the example goes live with the ledger probe on debug
build #2; the loot half quantifies with build #1's files.

## 5. Provenance (jar, path, recipe id)

- PM melt ores/raw/dust: `productivemetalworks-1.21.1-1.15.1.jar`
  `data/productivemetalworks/recipe/melting/ores/iron.json` (270 mB, min_temp 1000),
  `melting/raw_materials/iron.json` (180), `melting/dusts/iron.json` (90); copper/gold same shape.
- PM casting: `casting/ingots/iron.json` (90 mB → minecraft:iron_ingot),
  `casting/nuggets/iron.json` (10), `casting/storage_blocks/iron.json` (810).
- PM coils: `crafting/liquid_heating_coil.json` (CCC/CBC/XXX = 6 copper, bucket, 3 fire brick).
- RC blasting parity: `railcraft-reborn-1.21.1-1.2.14.jar`
  `data/railcraft/recipe/blast_furnace/blasting_iron_*.json` (chestplate 8, boots 4,
  leggings 7, helmet 5, axe/pick 3, sword/hoe/door/crowbar 2, shovel 1, trapdoor 4,
  horse armor 4, ingot 1, steel_block from iron block) — all `type: railcraft:blasting`,
  slag equals steel count.
- RC crusher: `data/railcraft/recipe/crusher/` — 87 files, no vanilla ore/raw item
  entries; `crushing_gravel.json` (0.1% gold nugget, 0.005% diamond);
  `crushing_raw_iron_block.json` (block → 9 raw only).
- Fortune raw-drop average: vanilla enchant formula (levels 1–4, Fortune III avg ≈ 2.2).
  Override check done: the only global loot modifiers in the pack are Railcraft chest
  injections, Silent Gear fine-silk spider drops, and Sophisticated Backpacks — no
  ore-drop or Fortune overrides exist.
