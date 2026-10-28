// ===========================================================================
// Minebricks MBD2 — tier-1 test machines (rudimentary pipeline test)
// Spec: Fina 2026-10-27 ("generic 3x3x3 buildings for testing structures,
// except the settling pools as they're fundamentally different").
//
// What this is: THREE multiblock controllers (jaw crusher, wash trommel,
// settling pool) as generic test boxes — iron-block casings, EMPTY renderers
// (art pass comes later), each bound to its own recipe type (Route B shape:
// per-controller EMI/JEI categories) with VANILLA-ONLY builtin placeholder
// recipes. Vanilla-only is deliberate: mod items (IE dusts, our future
// intermediates) are not registered yet when startup scripts run, and the
// real I/O taxonomy waits for the DIY unification pass. These recipes prove
// the pipeline (structure forms -> slots/tanks feed -> recipe runs), nothing more.
//
// Source-verified against Low-Drag-MC/Multiblocked2 (TestMachineBuilder /
// MBDSmokeFixtures patterns): manual registration via MBDRegistries because
// the KubeJS event's auto-register path cannot set blockPatternFactory.
// ===========================================================================

// SCOPE ISOLATION (0.4.8): the entire body lives in an IIFE. MBD2/LDLib2
// inject a large, partly dynamic set of top-level bindings into every KubeJS
// scope (@KJSBindings-annotated classes: IO, MBDRegistries, MachineState,
// ConfigBlockProperties, ContentModifier, CapabilityIO...; static plugin
// binds: RL, Shapes, recipe-type names; plus MBDTypeHandles blueprint names).
// A top-level `const` that collides with ANY of them gets the whole file
// killed by Rhino ("redeclaration of var X"), and Rhino surfaces only ONE
// such collision per boot (observed: IO, then MBDRegistries, in ascending
// boots — not file order). Function-scoped declarations merely SHADOW outer
// bindings, which is legal — so the IIFE ends the whack-a-mole for good.
(() => {

const RL = (id) => Java.loadClass('net.minecraft.resources.ResourceLocation').parse(id);

const Blocks = Java.loadClass('net.minecraft.world.level.block.Blocks');
const Items = Java.loadClass('net.minecraft.world.item.Items');
const Fluids = Java.loadClass('net.minecraft.world.level.material.Fluids');
const FluidStack = Java.loadClass('net.neoforged.neoforge.fluids.FluidStack');
const IRenderer = Java.loadClass('com.lowdragmc.lowdraglib2.client.renderer.IRenderer');

const StateMachine = Java.loadClass('com.lowdragmc.mbd2.common.machine.definition.config.StateMachine');
const MachineState = Java.loadClass('com.lowdragmc.mbd2.common.machine.definition.config.MachineState');
const ConfigBlockProperties = Java.loadClass('com.lowdragmc.mbd2.common.machine.definition.config.ConfigBlockProperties');
const ConfigItemProperties = Java.loadClass('com.lowdragmc.mbd2.common.machine.definition.config.ConfigItemProperties');
const ConfigMachineSettings = Java.loadClass('com.lowdragmc.mbd2.common.machine.definition.config.ConfigMachineSettings');
const ConfigRecipeLogicSettings = Java.loadClass('com.lowdragmc.mbd2.common.machine.definition.config.ConfigRecipeLogicSettings');
const MultiblockMachineDefinition = Java.loadClass('com.lowdragmc.mbd2.common.machine.definition.MultiblockMachineDefinition');
const MBDRegistries = Java.loadClass('com.lowdragmc.mbd2.api.registry.MBDRegistries');
const FactoryBlockPattern = Java.loadClass('com.lowdragmc.mbd2.api.pattern.FactoryBlockPattern');
const Predicates = Java.loadClass('com.lowdragmc.mbd2.api.pattern.Predicates');
// Named MBD_IO, NOT IO: MBD2's blueprint type-handle bootstrap injects a
// top-level `IO` binding into every KubeJS scope (MBDTypeHandles -> 'IO' ->
// com.lowdragmc.mbd2.api.capability.recipe.IO). `const IO` collides with it
// and Rhino kills the whole file with "redeclaration of var IO".
const MBD_IO = Java.loadClass('com.lowdragmc.mbd2.api.capability.recipe.IO');
const ItemSlotTraitDef = Java.loadClass('com.lowdragmc.mbd2.common.trait.item.ItemSlotCapabilityTraitDefinition');
const FluidTankTraitDef = Java.loadClass('com.lowdragmc.mbd2.common.trait.fluid.FluidTankCapabilityTraitDefinition');

// --- shared predicates -----------------------------------------------------
const CONTROLLER_ANY = Predicates.controller(Predicates.any());
const IRON_CASING = Predicates.blocks(Blocks.IRON_BLOCK);

// 3x3x3 iron box, controller in the geometric center (aisle = Z layer,
// string = Y row, char = X cell — convention per MBDSmokeFixtures).
const BOX_333 = FactoryBlockPattern.start()
    .aisle('SSS', 'SSS', 'SSS')
    .aisle('SSS', 'SCS', 'SSS')
    .aisle('SSS', 'SSS', 'SSS')
    .where('C', CONTROLLER_ANY)
    .where('S', IRON_CASING)
    .build();

// Settling pool: VARIABLE flat floor, 5x5 up to 17x17 (Fina 2026-10-27:
// "variable size structures ... for the settling pool? 5x5 to say 17x17").
// Convention recap: aisle = Z layer, string = Y row, char = X cell — so a
// floor is ONE row per aisle, MANY aisles (the old one-aisle/three-rows
// attempt was actually a wall standing on edge — fixed here).
//   depth: aisleRepeatable 2..8 layers each side of the controller layer
//          -> 5..17 deep (same idiom as PatternRepetitionFixtures' walls,
//          source-verified against the repo's own repetition tests).
//   width: a REQUIRED 5-wide iron core (minimum enforced) flanked by soft
//          wings 'o' = any (grow with iron up to 17 across; air/terrain
//          tolerated so building flush into ground doesn't block formation).
// Controller must sit >=2 layers and >=2 core cells from every edge.
const POOL_ROW   = 'ooooooSSSSSoooooo';  // 17 cells: 6 soft + 5 required + 6 soft
const POOL_ROW_C = 'ooooooSSCSSoooooo';  // controller in the core center

const POOL_VARIABLE = FactoryBlockPattern.start()
    .aisleRepeatable(2, 8, POOL_ROW)    // depth behind: 2..8 layers
    .aisle(POOL_ROW_C)                  // controller layer
    .aisleRepeatable(2, 8, POOL_ROW)    // depth in front: 2..8 layers
    .where('C', CONTROLLER_ANY)
    .where('S', IRON_CASING)
    .where('o', Predicates.any())       // soft growth wing
    .build();

// --- trait helpers ----------------------------------------------------------
// Item-slot traits need unique names (persisted-storage prefix collisions,
// per TestMachineBuilder's naming rule). Fluid tanks ride defaults (BOTH).
function itemSlot(name, io) {
    const t = new ItemSlotTraitDef();
    t.setName(name);
    t.setSlotSize(1);
    t.setRecipeHandlerIO(io);
    return t;
}

function fluidTank(name) {
    const t = new FluidTankTraitDef();
    t.setName(name);
    t.setTankSize(1);
    t.setCapacity(4000);
    return t;
}

// --- definition builder -----------------------------------------------------
// Mirrors TestMachineBuilder.register()'s multiblock branch, plus the
// blockPatternFactory that only exists post-build (hence manual registration).
function registerMultiblock(id, pattern, traits, recipeTypeId) {
    const settings = ConfigMachineSettings.builder().build();
    for (const t of traits) settings.addTraitDefinition(t);

    const def = MultiblockMachineDefinition.builder()
        .id(RL(id))
        .rootState(StateMachine.createMultiblockDefault(
            () => MachineState.baseBuilder(), () => IRenderer.EMPTY))
        .blockProperties(ConfigBlockProperties.builder().build())
        .itemProperties(ConfigItemProperties.builder().build())
        .machineSettings(() => settings)
        .recipeLogicSettings(ConfigRecipeLogicSettings.builder()
            .recipeType(RL(recipeTypeId))
            .build())
        .build();

    def.blockPatternFactory((controller) => pattern);
    MBDRegistries.MACHINE_DEFINITIONS.register(RL(id), def);
    console.info('MBD2 t1: registered multiblock ' + id);
    return def;
}

// --- builtin recipe helper --------------------------------------------------
// Builtin recipes bind to the type at registration (TestRecipeTypeBuilder
// pattern): type.recipeBuilder(id) -> fill -> getBuiltinRecipes().put(...).
function builtinRecipe(type, path, fill) {
    const id = RL('minebricks:' + path);
    const b = type.recipeBuilder(id);
    fill(b);
    type.getBuiltinRecipes().put(id, b.buildRawRecipe());
}

// --- recipe types + placeholder recipes -------------------------------------
MBDRegistryEvents.recipeType((event) => {
    const crusher = event.createRecipeType(RL('minebricks:jaw_crusher'));
    // PLACEHOLDER: doubling stand-in — real "crushed ore" intermediate is a
    // DIY-unification decision. Vanilla-only because of startup registry timing.
    builtinRecipe(crusher, 'jaw_crusher/raw_iron', (b) => b
        .inputItems(Items.RAW_IRON, 1)
        .outputItems(Items.RAW_IRON, 2)
        .duration(100));

    const trommel = event.createRecipeType(RL('minebricks:wash_trommel'));
    // PLACEHOLDER: wet classification stand-in — feed + water in, aggregate out.
    builtinRecipe(trommel, 'wash_trommel/wash_raw_iron', (b) => b
        .inputItems(Items.RAW_IRON, 1)
        .inputFluids(new FluidStack(Fluids.WATER, 100))
        .outputItems(Items.SAND, 1)
        .outputItems(Items.GRAVEL, 1)
        .duration(60));

    const pool = event.createRecipeType(RL('minebricks:settling_pool'));
    // PLACEHOLDER: settling stand-in — fines settle out of suspension.
    builtinRecipe(pool, 'settling_pool/settle', (b) => b
        .inputItems(Items.SAND, 1)
        .inputFluids(new FluidStack(Fluids.WATER, 250))
        .outputItems(Items.CLAY, 1)
        .duration(80));

    console.info('MBD2 t1: 3 recipe types registered (crusher/trommel/pool)');
});

// --- machines ---------------------------------------------------------------
MBDRegistryEvents.machine((event) => {
    // T1 — jaw crusher: 3x3x3 box. In slot -> out slot.
    registerMultiblock('minebricks:jaw_crusher', BOX_333, [
        itemSlot('item_input', MBD_IO.IN),
        itemSlot('item_output', MBD_IO.OUT),
    ], 'minebricks:jaw_crusher');

    // T1.5 — wash trommel: 3x3x3 box (real wet-classification shape later).
    // In slot + out slot + water tank.
    registerMultiblock('minebricks:wash_trommel', BOX_333, [
        itemSlot('item_input', MBD_IO.IN),
        itemSlot('item_output', MBD_IO.OUT),
        fluidTank('wash_water'),
    ], 'minebricks:wash_trommel');

    // T2 — settling pool: VARIABLE floor 5x5..17x17 (pools scale; everything
    // else stays a generic 3x3x3 test box for now). Water tank + out slot.
    registerMultiblock('minebricks:settling_pool', POOL_VARIABLE, [
        fluidTank('pool_water'),
        itemSlot('item_output', MBD_IO.OUT),
    ], 'minebricks:settling_pool');

    console.info('MBD2 t1: 3 multiblocks registered (jaw_crusher / wash_trommel / settling_pool)');
});

})();
