# MDB2-NOTES — Multiblocked2 format dive (jar-verified, 2026-10-27)

Source: `Multiblocked2-1.21-1.21.1-21.1.2-all.jar` (the exact build we ship,
sha512-pinned in the index). Author: lowdragmc, built on LDLib2. Everything
below is read from bytecode strings / class structure, not guessed.

## The one-line answer

She was right: a definition's final form is a text-shaped object tree wrapped
in NBT — uncompressed `CompoundTag` roots (the shipped sample
`data/mbd2/test/fx_golden_definition.nbt` parses as raw, non-gzipped NBT with
a state machine inside: per-state renderer / machineFXs / shape / aabbs /
machineSound / lightLevel). And we mostly don't have to touch that form at
all: **KubeJS can build definitions directly**.

## Two authoring paths

1. **KubeJS registry events (primary, script-only).** The jar ships
   `MBDKubeJSPlugin` (declared in its own `kubejs.plugins.txt`). Verified
   event groups and ids from the bytecode:
   - `MBDRegistryEvents` (group `MBDRegistryEvents`, fired at startup) with
     two events: **`machine`** and **`recipeType`**.
   - `MBDMachineRegistryEventJS` holds a builders map keyed by id →
     `MBDMachineDefinition.Builder` → `.build()` registers into
     `MBDRegistries.MACHINE_DEFINITIONS`. So: `MBDRegistryEvents.machine(id => { … })`
     defines a whole machine in script — same Builder the in-game editor uses.
   - `MBDRecipeSchema` plugs every `MBDRecipeType` into KubeJS's recipe
     system (`RecipeNamespace`/`RecipeSchemaType`/`RecipeTypeFunction`) —
     our machines' recipes are authored in ordinary server scripts and
     become normal recipe functions.
2. **In-game editor (secondary, NBT).** `MachineProject` / `MultiblockMachineProject`
   / `RecipeTypeProject` extend LDLib2's editor `IProject`; projects
   serialize to `CompoundTag` (`serializeProject → CompoundTag`), and
   `CommonProxy.loadNBTFiles` loads definition files from disk at boot.
   The exact definition folder path didn't surface in constant pools — one
   boot check (the `/porprobe` config walk can catch it; extend its regex
   with `mbd2`). Editor exports round-trip: same NBT form, versionable text
   via SNBT if we ever want to hand-edit or diff them.

## Definition model (what a machine IS)

- `MBDMachineDefinition` (+ `Builder`) with `MachineDefinitionType` registry.
- **StateMachine** (`StateMachine` + `MachineState`): named states, each
  carrying renderer, machineFXs, shape/aabbs, machineSound (waiting/working
  variants seen in the sample), light level, rendering radius,
  `isGlobalVisible`. States are what the machine switches between at runtime
  (`MachineStateChangedEvent`).
- Config blocks: `ConfigMachineSettings`, `ConfigMultiblockSettings`,
  `ConfigPartSettings`, `ConfigRecipeLogicSettings`, `RecipeModifier`
  (per-recipe-type speed/energy modifiers), toggles (`ToggleAABB`,
  `ToggleCatalyst`, `ToggleCreativeTab`, `ToggleDirection`, `ToggleParallelValue`,
  `ToggleRenderer`, `ToggleShape`, `ToggleLightValue`, `ToggleMachineSound`…),
  FX config (`MachineFXConfig`, photon blueprints for particles).
- Events are FIRST-CLASS definition members: `config/event/Machine*Event`
  classes exist for the whole lifecycle (see KubeJS surface below) — a
  definition can carry its own behavior, not just the script layer.

## Structure system (the multiblock shape)

- GT-lineage pattern API: `FactoryBlockPattern` / `BlockPattern` /
  `TraceabilityPredicate`, predicates over **blocks, fluids, blockstates,
  tags, partial states** (`Predicates`, `PredicateBlocks/Fluids/States/Tags`).
- `PatternPreview` + `MultiblockInWorldPreviewRenderer` = in-world hologram
  preview of the structure (projection hint for builders — big QoL).
- `PatternSnapshot` / `MultiblockWorldSavedData` = formed-structure state.
- Structure files are vanilla-format `.nbt` under `data/<ns>/structure/`
  (shipped: `empty_multiblock.nbt`, `empty_simple.nbt`).

## Recipes (the Route B backbone, jar-confirmed)

- Every definition can carry its own `MBDRecipeType` (registry `RECIPE_TYPES`,
  serializer `mbd_recipe_serializer`) → **per-controller recipe categories**:
  `MBDEMIPlugin` + `MBDRecipeTypeEmiCategory` (EMI) and `MBDJEIPlugin` +
  `MBDRecipeTypeCategory` (JEI) render each type as its own viewer category.
  That is the "each route shows up by name in EMI/JEI" mechanic, at the jar
  level.
- `MBDRecipe`/`MBDRecipeBuilder`/`RecipeLogic` runtime; `RecipeCondition`
  family shipped: biome, block, daytime, dimension, light, machine level,
  **machine NBT** (our activeTag-style gating hook), position-Y, raining,
  thunder, redstone signal.
- Capability/IO system: `RecipeCapability` for item, fluid (incl. sized +
  tag fluid ingredients), ForgeEnergy, entity, item-durability (+ Create
  rotation available if Create ever returns). Handlers = traits (below).

## Traits (the machine's hands)

`TraitDefinition` registry; shipped trait types: item slot, fluid tank,
forge energy, recipe handler (capability→recipe bridge), entity handler,
auto-IO family (`AutoIO`, `AutoWorldIO`, `ConnectedIO`, `BulkIO`,
`ToggleAutoIO`), fancy renderer settings per capability, and mod bridges
(AE2 ME interface / pattern provider as traits).

## Blueprints (custom behavior WITHOUT Java)

A node-graph scripting layer (`common/blueprint/`, LDLib2 nodegraphtookit):
- `MachineBlueprintGraph` / `MachineBlueprintInstance` / `MachineEnvironment`,
  bound into definitions via `MachineBlueprintBinding`.
- **Builtin blueprints**: Overclock, RedstoneControl, Upkeep, HeatBuildup,
  ChanceOutput, EnvironmentGate, AutoIOPanel, DebugProbe, PartCountBonus,
  UpgradeSlots, OutputSwap.
- **Node libraries**: event nodes for the full machine lifecycle
  (structure formed/invalid, recipe finish/waiting/working,
  recipe modify before/after, fuel recipe modify, consume-inputs-after,
  drops, placed/removed, tick, neighbor changed, UI/use events, cancel),
  machine action/lookup/redstone/runtime-value nodes, recipe build/content
  nodes, trait capability nodes (energy, item handler), UI item nodes.
  This is where per-machine custom logic lives — no companion mod needed.

## KubeJS event surface (what we can hook from scripts)

- `MBD_MACHINE_EVENTS` (`MBDMachineEvents`): nested JS wrappers for the whole
  lifecycle — StructureFormed, StructureInvalid, StateChanged, RecipeStatusChanged,
  OnRecipeFinish, OnRecipeWaiting, Before/AfterRecipeWorking,
  RecipeModifyBefore/After, FuelRecipeModify, FuelBurningFinish,
  OnConsumeInputsAfterWorking, Drops, Placed, Removed, Tick, UseCatalyst,
  UseItemOn, UseWithoutItem, OpenUI, NeighborChanged, OnLoad,
  CustomKeyframe, CustomDataUpdate. (The staged probe's suite-3 listeners
  already ride five of these.)
- `MBD_RECIPE_TYPE_EVENTS`: RecipeTypeEvent, RecipeUIEvent,
  TransferProxyRecipeEvent.
- `MBDRegistryEvents`: machine + recipeType registration (authoring).
- `CustomRendererRegistryEventJS` (client), `MBDServerEvents`/`MBDClientEvents`.

## Integrations in the jar (activate only if the mod is present)

AE2 (ME traits + blueprint nodes), Ars Nouveau (source traits/conditions),
**Create (kinetic machines + rotation recipe capability)** — moot while
Create is out, recorded for if it ever returns — EMI, JEI, Jade, GeckoLib
(animated machines).

## What this means for the ore chain

- Every tier = one script-authored definition: controller + part predicates
  + traits + its own recipe type (own EMI/JEI category = route identity).
- The four-tier spine (crusher → ball mill → roaster → bath) needs no Java,
  no NBT hand-editing; the blueprint layer covers odd behaviors (e.g.
  chance outputs for the matrix fractions, upkeep/heat for the roaster).
- MBd2 machines CONSUME ore inputs; the ore blocks themselves stay
  KubeJS/world-side — fortune curve lives in each ore's loot function,
  authored at definition time per the fortune ruling.
- Pollution wiring stays with the staged PoR probe (emitter config units per
  controller; custom pollutant types for the Biters analog ride the same
  Pollutants registry the probe dumps).
- Fluid chain (slurry, PLS) is native: sized fluid ingredients + tank traits
  + auto-IO; bulk movement stays Railcraft tank carts per the convoy doctrine.

## Open items (cheap, next boot or next dive)

1. Exact definition folder path (`loadNBTFiles` target) — extend `/porprobe`
   config walk with `mbd2` and it lands on the next probe session.
2. Editor UX in practice (her ground-up call makes scripts primary, but the
   in-game editor + in-world preview may be the fastest way to sketch the
   roaster's shape before committing it to script).
3. `RecipeModifier` semantics (per-type speed/energy math) read in detail
   before dialing the chain's per-stage timing.
