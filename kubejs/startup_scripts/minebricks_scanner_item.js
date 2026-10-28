// ===========================================================================
// Minebricks — the Scanner (standalone ore-survey item), vehicle v1
// Spec: Fina 2026-10-28 ("Building — The scanner, use the wooden pick as it's
// icon for now (I'll find some art later); give it a recipe of 9 wood planks
// (we'll retrofit it later), and get the script wired up to it.")
//
// Vehicle ruling (same day): the Silent's Gear prospector hammer stays
// EXACTLY as shipped — no interference, no hijack, tag-scan and all. The
// scanner is its own generic item: fixed range, no material scaling, no
// other functions. Range was the only thing a tier ever fed; if progression
// sounds fun later, it's a second item with a bigger dial, not a stat map.
//
// Placeholder dressing (both retrofitted on her word):
//   icon   = vanilla wooden pickaxe — via parentModel(minecraft:item/
//            wooden_pickaxe), the full vanilla model+texture chain; PLUS
//            assets/kubejs/textures/item/scanner.png carries the same 16x16
//            pixels byte-identical from the vanilla 1.21.1 client jar, so the
//            icon renders as the pick whichever path wins.
//   recipe = 9 planks (server script minebricks_scanner.js).
//
// Name: "Scanner" is a stand-in — the probe's name is HERS (open item).
//
// Verification trail (jar-verified against the pinned kubejs-neoforge-
// 2101.7.2-build.377, 2026-10-28):
//   StartupEvents.registry      — StartupEvents.class <clinit> strings
//   ItemBuilder.create/unstackable-family — ItemBuilder.class method table
//   BuilderBase.displayName     — BuilderBase.class method table
//   ModelledBuilderBase.parentModel — ModelledBuilderBase.class method table
//   ItemBuilder.maxStackSize    — ItemBuilder.class method table
//
// House rules: IIFE scope isolation (0.4.8 doctrine — MBD2/LDLib2 inject
// top-level bindings; function-scoped declarations merely shadow, which is
// legal); declarations at function-body top only.
// ===========================================================================

;
(function () {

  StartupEvents.registry('item', (event) => {
    event.create('scanner')
      .displayName('Scanner')
      .maxStackSize(1)
      .parentModel('minecraft:item/wooden_pickaxe')
    console.info('Minebricks scanner: item registered (kubejs:scanner, wooden-pick placeholder icon)')
  })

})()
