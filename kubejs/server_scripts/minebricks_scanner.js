// ===========================================================================
// Minebricks — the Scanner: reads the chunk ledger, v1.1 (2026-10-29)
//
// FUNCTION (hers, re-stated 2026-10-29 after the v1 misbuild): right-click
// makes a CALL TO THE PERSISTENT DATA TABLE built during chunk generation
// (minebricks_chunkledger.js) and reports what generation recorded for the
// chunks around you. It does NOT probe blocks — that was the v1 mistake,
// a prospector-hammer clone; the hammer stays the hammer, untouched, and
// this item reads the generation ledger instead.
//
// Vehicle (unchanged, 2026-10-28 ruling): standalone generic item
// kubejs:scanner, registered in minebricks_scanner_item.js. Icon = vanilla
// wooden pickaxe placeholder (art retrofit hers); name "Scanner" is a
// stand-in — THE NAME IS HERS. Recipe = 9 planks placeholder (retrofit
// hers). No material scaling, no other functions.
//
// THE DIALS (file top, hers to turn):
//   SCANNER_RADIUS_CHUNKS = 0 — how many chunks in each direction beyond
//   yours the table query covers (0 = just your chunk, 1 = 3x3, ...). The
//   table, not a block walk, pays the cost: radius only widens the lookup.
//   THROTTLE_TICKS = 10 — click-hold guard, carried over from v1.
//   REPORT_CAP = 8 — kinds shown per read before the "+n more" line.
//
// Report shape (honest to the source): what the LEDGER says, grouped by
// block id, plus how many chunks in the queried square have no record yet
// (they index on their first save/load). Empty-string records are real
// "indexed, zero ore" chunks, not gaps.
//
// Three-ping triangulation is NOT in this file — it stays parked with the
// ore/metal matrix conversation per her sequencing. The report payload
// evolves with that matrix (the table already stores per-block counts to
// feed it).
//
// Verification trail (2026-10-29): ItemEvents.rightClicked / event.hand /
// entity / item / stack.id / entity.level / level.isClientSide() /
// entity.persistentData putLong/contains/getLong / event.shaped — all
// runtime-proven in this pack (scanner v1 + cropscan/mint lineage).
// SERVER.persistentData getString/contains — vanilla CompoundTag surface,
// mappings-verified; written by minebricks_chunkledger.js.
//
// House rules honored: IIFE scope isolation; declarations at function-body
// top ONLY, loops/try assign; no array spread; ES3-safe; failure paths to
// console.info — no silent content loss.
// ===========================================================================

;
(function () {

  var SCANNER_ID = 'kubejs:scanner'
  var SCANNER_RADIUS_CHUNKS = 0
  var THROTTLE_TICKS = 10
  var REPORT_CAP = 8
  var INDEX_ROOT = 'mb_ledger' // must match minebricks_chunkledger.js

  var SERVER = null

  // --- table access -----------------------------------------------------------
  function indexKeyOf(dim, cx, cz) {
    return INDEX_ROOT + ':' + dim + '|' + cx + ',' + cz
  }

  function playerDim(entity) {
    var d = ''
    try {
      d = String(entity.level.dimension().location().toString())
    } catch (eDim1) {
      try {
        d = String(entity.level.getDimension().location().toString())
      } catch (eDim2) {
        d = ''
      }
    }
    return d
  }

  function parseRecord(rec, counts) {
    var parts = null
    var i = 0
    var kv = null
    var id = ''
    var n = 0
    if (!rec) return
    parts = rec.split('|')
    for (i = 0; i < parts.length; i++) {
      kv = parts[i].split(':')
      if (kv.length !== 2) continue
      id = kv[0]
      n = parseInt(kv[1], 10)
      if (isNaN(n)) continue
      if (!counts[id]) counts[id] = 0
      counts[id] = counts[id] + n
    }
  }

  function ledgerQuery(entity) {
    var res = { found: 0, missing: 0, counts: {}, chunks: 0, dim: '', cx: 0, cz: 0 }
    var pd = null
    var r = SCANNER_RADIUS_CHUNKS
    var cx = 0
    var cz = 0
    var dx = 0
    var dz = 0
    var key = ''
    var has = false

    res.dim = playerDim(entity)
    cx = Math.floor(entity.x / 16)
    cz = Math.floor(entity.z / 16)
    res.cx = cx
    res.cz = cz
    if (res.dim === '') return res
    if (!SERVER) return res
    try {
      pd = SERVER.persistentData
    } catch (ePd) {
      return res
    }
    for (dx = -r; dx <= r; dx++) {
      for (dz = -r; dz <= r; dz++) {
        res.chunks = res.chunks + 1
        key = indexKeyOf(res.dim, cx + dx, cz + dz)
        has = false
        try {
          has = pd.contains(key)
        } catch (eC) {
          has = false
        }
        if (has) {
          res.found = res.found + 1
          try {
            parseRecord(String(pd.getString(key)), res.counts)
          } catch (eG) {
            console.info('[scanner] record read failed: ' + eG)
          }
        } else {
          res.missing = res.missing + 1
        }
      }
    }
    return res
  }

  // --- report -------------------------------------------------------------------
  function report(entity, res) {
    var lines = []
    var rows = []
    var id = ''
    var total = 0
    var cap = 0
    var i = 0
    var j = 0

    for (id in res.counts) {
      total = total + res.counts[id]
      rows.push([id, res.counts[id]])
    }
    rows.sort(function (a, b) { return b[1] - a[1] })

    if (res.found === 0) {
      lines.push('Scanner: no ledger records for chunk (' + res.cx + ', ' + res.cz + ') yet.')
      lines.push('  The table indexes each chunk on its first save/load — move on and re-check.')
    } else {
      lines.push('Scanner — ledger read, chunk (' + res.cx + ', ' + res.cz + '):')
      if (total === 0) {
        lines.push('  no tagged ore in the indexed record(s).')
      } else {
        cap = rows.length < REPORT_CAP ? rows.length : REPORT_CAP
        for (i = 0; i < cap; i++) lines.push('  ' + rows[i][0] + ' x' + rows[i][1])
        if (rows.length > cap) lines.push('  ...+' + (rows.length - cap) + ' more kind(s)')
      }
      if (res.missing > 0) lines.push('  (' + res.missing + ' of ' + res.chunks + ' chunk(s) here not indexed yet)')
    }
    for (j = 0; j < lines.length; j++) {
      try {
        entity.tell(lines[j])
      } catch (eTell) {
        console.info('[scanner] ' + lines[j])
      }
    }
  }

  // --- best-effort click-hold throttle (carried from v1) ------------------------
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
      // throttle is cosmetic; its failure must never block a read
    }
    return true
  }

  // --- wiring --------------------------------------------------------------------
  ServerEvents.loaded(function (event) {
    SERVER = event.server
  })
  ServerEvents.unloaded(function (event) {
    SERVER = null
  })

  ItemEvents.rightClicked(function (event) {
    var hand = ''
    var entity = null
    var stackId = ''
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
      res = ledgerQuery(entity)
      report(entity, res)
    } catch (eScan) {
      console.info('[scanner] read failed: ' + eScan)
      try {
        if (entity) entity.tell('Scanner malfunction: ' + eScan)
      } catch (eTell) {}
    }
  })

  // --- placeholder recipe: 9 planks (retrofit on her word) -------------------------
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
