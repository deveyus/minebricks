// ===========================================================================
// Minebricks — RF cull round 1 (her rulings, 2026-10-29): recipe removals.
//
// HER CALLS, verbatim effect:
//   REMOVE: NC solar panels (basic/advanced/elite/du) — passive, mints FE
//           from sunlight; NC cobblestone generators (3 tiers) — passive
//           cobble mint vector; IE thermoelectric generator — passive.
//   KEEP:   NC RTGs (4 tiers, rtg_power untouched in config), IE windmill
//           ("a ballache and doesn't produce much power, so it can stay"),
//           AR3 solar panel (satellite-chain hardware; ground-placement
//           power is a recorded dial, not culled today), NC decay generator
//           (block kept for its decay function; its POWER is zeroed via the
//           9 recipe overrides in kubejs/data/nuclearcraftneohaul/recipe/
//           decay_generator/ — serializer-verified efficiency->power term —
//           plus solar_power config zero in nuclearcraftneohaul-common.toml).
//
// Removal mechanics (KubeJS-achievable, doctrine-honest): recipes removed
// here (survival-unreachable), EMI hiding via the C-tag convention
// data/c/tags/item/hidden_from_recipe.json. Creative-tab entries remain
// visible (cosmetic only — modifyCreativeTab tab ids unverified for NC, not
// worth a startup-script crash risk; recorded as an open cosmetic item).
// Blocks/items still exist jar-side, unobtainable and inert (solar power
// config-zeroed so even cheated-in panels mint nothing).
//
// Targets are exact jar-verified ids (2026-10-29 probe, NC 0.9.13 lang +
// IE 12.4.2 lang).
//
// House rules: IIFE scope; declarations at function-body top; no spread;
// ES3-safe; console.info trail.
// ===========================================================================

;
(function () {

  var KILL = [
    'nuclearcraftneohaul:solar_panel_basic',
    'nuclearcraftneohaul:solar_panel_advanced',
    'nuclearcraftneohaul:solar_panel_elite',
    'nuclearcraftneohaul:solar_panel_du',
    'nuclearcraftneohaul:cobblestone_generator',
    'nuclearcraftneohaul:cobblestone_generator_compact',
    'nuclearcraftneohaul:cobblestone_generator_dense',
    'immersiveengineering:thermoelectric_generator'
  ]

  ServerEvents.recipes(function (event) {
    var i = 0
    for (i = 0; i < KILL.length; i++) {
      event.remove({ output: KILL[i] })
      console.info('[rf-cull] recipes removed for ' + KILL[i])
    }
  })

})()
