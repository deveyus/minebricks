// ===========================================================================
// Minebricks MBD2 — T3/T4 chain machines (ball mill, separator, roaster)
// Spec: Fina 2026-10-28 ~22:03Z ("Build the end to end for Chalcopyrite...
// also the machines needed to get to T4"). Same source-verified authoring
// path as minebricks_mbd2_t1.js (TestMachineBuilder pattern, manual
// registration via MBDRegistries because the KubeJS event's auto-register
// cannot set blockPatternFactory).
//
// DELIBERATE DIFFERENCE FROM T1: zero builtin recipes. The T1 placeholders
// were vanilla-only because KubeJS items don't exist at MBD2's construct-
// phase registration (FMLConstructModEvent -> enqueueWork, source-verified in
// mbd2-analysis CommonProxy). The chain's real content is DATA-PACK JSON —
// kubejs/data/minebricks/recipe/<machine>/*.json — loaded at recipe-manager
// time when every item exists. MBD2 registers one vanilla serializer per
// recipe type under the type's own id (CommonProxy line 199-200), so
// "type": "minebricks:<machine>" JSON just works. All counts/durations are
// TEMPORARY pending the roster matrix ruling.
//
// ROASTER EMISSION: wired in minebricks_roaster_emissions.js (server side,
// MACHINE_ON_RECIPE_FINISH -> PoR WorldData.tryChangePollutionLevelBy, her
// "define the emitter from wherever we want; for now the controller
// suffices"). Hatches are the eventual shape — not this pass.
//
// House rules: IIFE scope isolation; function-body-top declarations only;
// console.info mirrors; no array spread; ES3-safe.
// ===========================================================================

;
(() => {

  const RL = (id) => Java.loadClass('net.minecraft.resources.ResourceLocation').parse(id);
  const Blocks = Java.loadClass('net.minecraft.world.level.block.Blocks');
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
  const MBD_IO = Java.loadClass('com.lowdragmc.mbd2.api.capability.recipe.IO');
  const ItemSlotTraitDef = Java.loadClass('com.lowdragmc.mbd2.common.trait.item.ItemSlotCapabilityTraitDefinition');

  const CONTROLLER_ANY = Predicates.controller(Predicates.any());
  const IRON_CASING = Predicates.blocks(Blocks.IRON_BLOCK);

  const BOX_333 = FactoryBlockPattern.start()
    .aisle('SSS', 'SSS', 'SSS')
    .aisle('SSS', 'SCS', 'SSS')
    .aisle('SSS', 'SSS', 'SSS')
    .where('C', CONTROLLER_ANY)
    .where('S', IRON_CASING)
    .build();

  function itemSlot(name, io) {
    const t = new ItemSlotTraitDef();
    t.setName(name);
    t.setSlotSize(1);
    t.setRecipeHandlerIO(io);
    return t;
  }

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
    console.info('MBD2 t4: registered multiblock ' + id);
    return def;
  }

  // Recipe types only — content rides the datapack JSONs.
  MBDRegistryEvents.recipeType((event) => {
    event.createRecipeType(RL('minebricks:ball_mill'));
    event.createRecipeType(RL('minebricks:separator'));
    event.createRecipeType(RL('minebricks:roaster'));
    console.info('MBD2 t4: 3 recipe types registered (ball_mill/separator/roaster)');
  });

  MBDRegistryEvents.machine((event) => {
    // T3 — ball mill: fine grind. In slot -> out slot.
    registerMultiblock('minebricks:ball_mill', BOX_333, [
      itemSlot('item_input', MBD_IO.IN),
      itemSlot('item_output', MBD_IO.OUT),
    ], 'minebricks:ball_mill');

    // T3 — separator: cleaves the milled matrix into concentrate + secondary.
    registerMultiblock('minebricks:separator', BOX_333, [
      itemSlot('item_input', MBD_IO.IN),
      itemSlot('item_output', MBD_IO.OUT),
      itemSlot('item_output2', MBD_IO.OUT),
    ], 'minebricks:separator');

    // T4 — rotary roaster: calcines the concentrate; pollution is the
    // exhaust (emission wired at the controller in the server script).
    registerMultiblock('minebricks:roaster', BOX_333, [
      itemSlot('item_input', MBD_IO.IN),
      itemSlot('item_output', MBD_IO.OUT),
    ], 'minebricks:roaster');

    console.info('MBD2 t4: 3 multiblocks registered (ball_mill / separator / roaster)');
  });

})()
