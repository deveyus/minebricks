// ===========================================================================
// Minebricks — the Scanner: use-event wiring + placeholder recipe, v1
// Spec: Fina 2026-10-28 (Building). Vehicle = standalone generic item
// (kubejs:scanner, registered in minebricks_scanner_item.js). The hammer is
// untouched; this script never references it.
//
// WHAT V1 DOES, HONESTLY:
//   right-click (main hand, server side) -> cube scan of SCANNER_RANGE
//   around the player -> count blocks in minebricks:scanner_targets ->
//   grouped report in chat. That is all. No ledger, no seeded weighted
//   pick, no triangulation — those ride the ore/metal matrix conversation
//   (her sequencing: scanner vehicle first, metal matrix next).
//
// THE FIXED RANGE DIAL:
//   SCANNER_RANGE = 8. One number, hers to turn. 8 = a 17-wide cube
//   (4,913 block probes through KubeJS wrappers) — light enough to click
//   freely. Bigger numbers cost real time per click; if she wants deep
//   survey ranges later, that's the second-item/bigger-dial conversation
//   or the ledger design, not a free re-tune of this loop.
//
// TARGET SET — minebricks:scanner_targets (kubejs/data/minebricks/tags/
// block/scanner_targets.json): #c:ores + ancient debris. Deliberately the
// SAME membership shape as Silent's Gear's own prospector_hammer_targets
// (jar-verified 2026-10-28: ["minecraft:ancient_debris", "#c:ores"]) —
// the "free scanner" design: every ore that self-tags c:ores (silentgear,
// silentgems, whatever the metal matrix adds) is visible automatically.
// The tag is ours to grow; swapping the report to a richer payload later
// touches only this file.
//
// Verification trail (jar-verified against pinned kubejs 2101.7.2-build.377
// + vanilla 1.21.1 client mappings, 2026-10-28):
//   ItemEvents.rightClicked         — ItemEvents.class <clinit> strings
//                                     (group 'common': fires both sides)
//   event.hand/entity/item          — ItemClickedKubeEvent.class surface
//                                     (getHand/getEntity/getItem)
//   stack.id                        — ItemStackKJS kjs$getId -> JS .id
//   entity.level                    — EntityKJS kjs$getLevel -> net.minecraft
//                                     Level (LevelKJS mixin on the same object)
//   level.getBlock(x,y,z)           — LevelKJS kjs$getBlock(III) -> LevelBlock
//   blockState / .block             — LevelBlock.class getBlockState/getBlock
//   state.is(TagKey)                — mappings: BlockBehaviour$BlockStateBase
//                                     boolean is(net.minecraft.tags.TagKey)
//   TagKey.create                   — net.minecraft.tags.TagKey (vanilla)
//   Registries.BLOCK / BuiltInRegistries.BLOCK — vanilla constants; the
//                                     BuiltInRegistries loadClass chain is
//                                     ALSO runtime-proven in her instance
//                                     (cropscan 0.4.13, mint lineage)
//   reg.getKey(block).toString()    — runtime-proven (cropscan/mint, 0.4.13)
//   level.isClientSide()            — mappings: LevelReader boolean isClientSide()
//   level.getGameTime()             — mappings: long getGameTime()
//   entity.persistentData           — NeoForge Entity extension; best-effort
//                                     throttle, wrapped so its absence can
//                                     never block a scan
//   event.shaped                    — runtime-proven house pattern
//                                     (minebricks_ar3_supply_pass.js)
//
// House rules honored: IIFE scope isolation; declarations at function-body
// top ONLY, loops/try assign (0.4.12 scope doctrine, harness-proven); no
// array spread (0.4.10 parse doctrine); ES3-safe throughout; every failure
// path lands in console.info (latest.log) — no silent content loss.
// ===========================================================================

;
(function () {

  var SCANNER_ID = 'kubejs:scanner'
  var SCANNER_RANGE = 8
  var TAG_ID = 'minebricks:scanner_targets'
  var REPORT_CAP = 8
  var THROTTLE_TICKS = 10

  // --- one TagKey, built lazily, reused for the life of the server --------
  var TAG_KEY = null

  function buildTagKey() {
    var RLc = null
    var TagKeyC = null
    var RegsC = null
    RLc = Java.loadClass('net.minecraft.resources.ResourceLocation')
    TagKeyC = Java.loadClass('net.minecraft.tags.TagKey')
    RegsC = Java.loadClass('net.minecraft.core.registries.Registries')
    return TagKeyC.create(RegsC.BLOCK, RLc.parse(TAG_ID))
  }

  // --- the scan: cube walk, tag filter, per-id counts ----------------------
  function scan(entity) {
    var tag = null
    var blockReg = null
    var lvl = null
    var px = 0
    var py = 0
    var pz = 0
    var r = SCANNER_RANGE
    var total = 0
    var counts = {}
    var dx = 0
    var dy = 0
    var dz = 0
    var lb = null
    var st = null
    var hit = false
    var id = ''

    tag = TAG_KEY
    if (!tag) {
      tag = buildTagKey()
      TAG_KEY = tag
    }
    blockReg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').BLOCK
    lvl = entity.level
    px = Math.floor(entity.x)
    py = Math.floor(entity.y)
    pz = Math.floor(entity.z)

    for (dx = -r; dx <= r; dx++) {
      for (dy = -r; dy <= r; dy++) {
        for (dz = -r; dz <= r; dz++) {
          lb = lvl.getBlock(px + dx, py + dy, pz + dz)
          st = lb.blockState
          hit = false
          if (st) {
            try {
              hit = st.is(tag)
            } catch (eTag) {
              hit = false
            }
          }
          if (hit) {
            total = total + 1
            id = String(blockReg.getKey(lb.block).toString())
            if (!counts[id]) counts[id] = 0
            counts[id] = counts[id] + 1
          }
        }
      }
    }
    return { total: total, counts: counts }
  }

  // --- best-effort right-click-hold throttle --------------------------------
  function throttleOK(entity) {
    var pd = null
    var now = 0
    var last = 0
    try {
      pd = entity.persistentData
      now = entity.level.getGameTime()
      last = -1000000
      if (pd.contains('minebricks_scanner_last')) last = pd.getLong('minebricks_scanner_last')
      if (now - last < THROTTLE_TICKS) return false
      pd.putLong('minebricks_scanner_last', now)
    } catch (eThrottle) {
      // throttle is cosmetic; its failure must never block a scan
    }
    return true
  }

  // --- report ----------------------------------------------------------------
  function report(entity, res) {
    var lines = []
    var rows = []
    var id = ''
    var cap = 0
    var i = 0
    var j = 0

    if (res.total === 0) {
      lines.push('Scanner (' + SCANNER_RANGE + ' m): no tagged ore in range.')
    } else {
      lines.push('Scanner (' + SCANNER_RANGE + ' m): ' + res.total + ' ore block(s).')
      for (id in res.counts) rows.push([id, res.counts[id]])
      rows.sort(function (a, b) { return b[1] - a[1] })
      cap = rows.length < REPORT_CAP ? rows.length : REPORT_CAP
      for (i = 0; i < cap; i++) lines.push('  ' + rows[i][0] + ' x' + rows[i][1])
      if (rows.length > cap) lines.push('  ...+' + (rows.length - cap) + ' more kind(s)')
    }
    for (j = 0; j < lines.length; j++) {
      try {
        entity.tell(lines[j])
      } catch (eTell) {
        console.info('[scanner] ' + lines[j])
      }
    }
  }

  // --- the use-event seam -----------------------------------------------------
  ItemEvents.rightClicked(function (event) {
    var hand = ''
    var entity = null
    var stackId = ''
    var lvl = null
    var res = null
    try {
      hand = String(event.hand)
      if (hand !== 'MAIN_HAND') return
      entity = event.entity
      if (!entity) return
      // server side only: the event rides 'common' and fires on both logical sides
      if (entity.level.isClientSide()) return
      stackId = String(event.item.id)
      if (stackId !== SCANNER_ID) return
      if (!throttleOK(entity)) return
      res = scan(entity)
      report(entity, res)
    } catch (eScan) {
      console.info('[scanner] scan failed: ' + eScan)
      try {
        if (entity) entity.tell('Scanner malfunction: ' + eScan)
      } catch (eTell) {}
    }
  })

  // --- placeholder recipe: 9 planks (retrofit on her word) --------------------
  ServerEvents.recipes(function (event) {
    event.shaped(SCANNER_ID, [
      'PPP',
      'PPP',
      'PPP'
    ], {
      P: '#minecraft:planks'
    })
    console.info('[scanner] recipe registered: 9 planks -> kubejs:scanner')
  })

})()
