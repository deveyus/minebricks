// ===========================================================================
// Minebricks — roaster emissions (the "emitter from wherever" hook)
// Spec: Fina 2026-10-28 ~22:03Z: "The roaster needs only to emit pollution
// properly, we don't need a special scrubber of our own" + "We can simply
// define the emitter for PoR from wherever we want; eventually we'll want
// hatches that allow that out, for now, the controller suffices."
//
// HOW: on the roaster's MACHINE_ON_RECIPE_FINISH, push a pollution delta at
// the controller's own position into PoR's chunk pollution table via
// WorldData.tryChangePollutionLevelBy(ServerLevel, BlockPos, BlockState, int)
// — public static, jar-verified against the pack's PoR jar
// (por-analysis/x_por, com.endertech.minecraft.mods.adpother.pollution).
// No scrubber machine; the exhaust IS the cost, exactly as ruled. The
// wet-scrubber leg of the old T4 template is CUT (her 21:51Z ruling).
//
// RUNTIME-VERIFY FLAG (the one unknown): whether tryChangePollutionLevelBy
// needs the block state to carry a configured EmissionSources entry, or
// applies the raw delta regardless. The first real emission logs the chunk's
// pollution state before/after — if the delta no-ops for unconfigured
// states, the fallback is a user-config emitter under config/adpother/
// Emitters/ (the probe session's queued chimney-attribution question owns
// that comparison; not this pass).
//
// AMOUNT: ROASTER_EMISSION_PER_RECIPE is TEMPORARY (her dial, like the 64x
// placeholder counts). Sulfur-heavy scaling (O2 ruling) rides the roster
// matrix — per-recipe amounts become a recipe-data field then.
//
// House rules: IIFE scope isolation; function-body-top declarations; no
// array spread; ES3-safe; every failure path lands in console.info — an
// emission failure must never crash the machine's recipe loop.
// ===========================================================================

;
(function () {

  var ROASTER_ID = 'minebricks:roaster'
  var ROASTER_EMISSION_PER_RECIPE = 20 // TEMPORARY dial — hers to turn
  var WorldDataC = null
  var EMIT_LOGGED = false

  function emitFor(machine) {
    var level = null
    var pos = null
    var state = null
    var before = ''
    var after = null

    level = machine.getLevel()
    if (level === null || level.isClientSide()) return
    pos = machine.getPos()
    try {
      if (WorldDataC === null) {
        WorldDataC = Java.loadClass('com.endertech.minecraft.mods.adpother.pollution.WorldData')
      }
      try {
        before = String(WorldDataC.getChunkPollution(level, pos))
      } catch (eRead) {
        before = 'unreadable: ' + eRead
      }
      state = level.getBlockState(pos)
      WorldDataC.tryChangePollutionLevelBy(level, pos, state, ROASTER_EMISSION_PER_RECIPE)
      if (!EMIT_LOGGED) {
        EMIT_LOGGED = true
        try {
          after = String(WorldDataC.getChunkPollution(level, pos))
        } catch (eRead2) {
          after = 'unreadable: ' + eRead2
        }
        console.info('[roaster-emissions] first emission: amount=' + ROASTER_EMISSION_PER_RECIPE
          + ' before=[' + before + '] after=[' + after + ']')
      }
    } catch (eEmit) {
      console.info('[roaster-emissions] emission failed (recipe continues): ' + eEmit)
    }
  }

  MBDMachineEvents.onRecipeFinish(ROASTER_ID, function (event) {
    var machine = null
    try {
      machine = event.event.machine
      if (machine) emitFor(machine)
    } catch (eHandler) {
      console.info('[roaster-emissions] handler error: ' + eHandler)
    }
  })

  console.info('[roaster-emissions] wired: minebricks:roaster onRecipeFinish -> PoR chunk pollution (amount ' + ROASTER_EMISSION_PER_RECIPE + ', TEMPORARY)')

})()
