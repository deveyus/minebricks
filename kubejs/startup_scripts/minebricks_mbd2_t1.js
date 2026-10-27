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
const IO = Java.loadClass('com.lowdragmc.mbd2.api.capability.recipe.IO');
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

// Settling pool: 3x3x1 open floor, controller center — a pool is not a box.
const POOL_FLOOR = FactoryBlockPattern.start()
    .aisle('SSS', 'SCS', 'SSS')
    .where('C', CONTROLLER_ANY)
    .where('S', IRON_CASING)
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
        itemSlot('item_input', IO.IN),
        itemSlot('item_output', IO.OUT),
    ], 'minebricks:jaw_crusher');

    // T1.5 — wash trommel: 3x3x3 box (real wet-classification shape later).
    // In slot + out slot + water tank.
    registerMultiblock('minebricks:wash_trommel', BOX_333, [
        itemSlot('item_input', IO.IN),
        itemSlot('item_output', IO.OUT),
        fluidTank('wash_water'),
    ], 'minebricks:wash_trommel');

    // T2 — settling pool: flat floor, not a box. Water tank + out slot.
    registerMultiblock('minebricks:settling_pool', POOL_FLOOR, [
        fluidTank('pool_water'),
        itemSlot('item_output', IO.OUT),
    ], 'minebricks:settling_pool');

    console.info('MBD2 t1: 3 multiblocks registered (jaw_crusher / wash_trommel / settling_pool)');
});
