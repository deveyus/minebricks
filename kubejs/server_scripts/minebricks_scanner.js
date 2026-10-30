// ===========================================================================
// Minebricks — the Scanner: 5-nearest ore triangulation, v2 (2026-10-30)
//
// FUNCTION: right-click finds the 5 nearest chunks that have ore in the chunk
// ledger (minebricks_chunkledger.js persistentData table), weights each by
// sqrt(distance) from the player's chunk, picks one randomly weighted by
// those roots (seeded by player chunk coordinate), and reports that chunk's
// distance +/-10% (seeded by player chunk coordinate). All coordinates are
// chunk coordinates — never block coordinates.
//
// NO radius dial. The search expands outward in rings until 5 ore-bearing
// chunks are found (or a safety bound is hit). If fewer than 5 are found,
// weights are computed over however many were located.
//
// Report shape:
//   "Scanner: nearest ore chunk is N chunks away (chunk X, Z)."
//   plus "< 5 found — only M ore chunks within range." if under 5.
//
// Vehicle (unchanged): standalone generic item kubejs:scanner,
// registered in minebricks_scanner_item.js.
//
// House rules honored: IIFE scope isolation; declarations at function-body
// top ONLY, loops/try assign; no array spread; ES3-safe; failure paths to
// console.info — no silent content loss.
// ===========================================================================

;
(function () {

  var SCANNER_ID = 'kubejs:scanner'
  var NEAREST_COUNT = 5
  var MAX_SEARCH_RADIUS = 96   // safety bound so the search can't run forever
  var INDEX_ROOT = 'mb_ledger' // must match minebricks_chunkledger.js
  var THROTTLE_TICKS = 10

  var SERVER = null

  // --- table access -----------------------------------------------------------
  function indexKeyOf(dim, cx, cz) {
    return INDEX_ROOT + ':' + dim + '|' + cx + ',' + cz
  }

  // --- dimension resolution: entity.level.dimension is a Holder<LevelResource> field ---
  // In NeoForge 1.21.1, Level.dimension is a public final field (Holder<LevelResource>),
  // NOT a callable method. Calling level.dimension() throws "not a function".
  // Access as a field, convert Holder to string via String(), parse the dimension id.
  function playerDim(entity) {
    var level = null
    try {
      level = entity.level
    } catch (e) {
      console.info('[scanner] playerDim: entity.level threw: ' + e)
      return ''
    }
    if (!level) {
      console.info('[scanner] playerDim: entity.level is null')
      return ''
    }

    var dimStr = ''

    // Approach 1: level.dimension field -> Holder -> String() -> parse
    try {
      var dimHolder = level.dimension   // field access (no parens - it's a field, not a method)
      var s = String(dimHolder)          // Holder.toString() -> "minecraft:overworld" or similar
      var m = s.match(/[a-z0-9]+:[a-z0-9_.\/\\-]+/i)
      if (m) dimStr = m[0]
    } catch (e) {
      console.info('[scanner] playerDim: level.dimension field threw: ' + e)
    }

    // Approach 2: level.dimensionType field -> Holder -> String() -> parse
    if (!dimStr) {
      try {
        var dt = level.dimensionType
        if (dt) {
          var s2 = String(dt)
          var m2 = s2.match(/[a-z0-9]+:[a-z0-9_.\/\\-]+/i)
          if (m2) dimStr = m2[0]
        }
      } catch (e) {
        console.info('[scanner] playerDim: level.dimensionType threw: ' + e)
      }
    }

    console.info('[scanner] playerDim: resolved dimension = "' + dimStr + '"')
    return dimStr
  }

  // --- seeded RNG: simple LCG seeded by player chunk coordinate --------------
  // seed = cx * 31 + cz (chunk coordinate only, never block coordinate)
  function makeSeededRng(cx, cz) {
    var s = (cx * 31 + cz) | 0
    if (s < 0) s = -s
    s = s || 1 // avoid zero seed
    return function () {
      s = (s * 16807) % 2147483647
      return (s - 1) / 2147483646 // [0, 1)
    }
  }

  // --- find the NEAREST_COUNT ore-bearing chunks outward from player chunk ---
  function findNearestOreChunks(dim, pcx, pcz, count) {
    var found = []
    var ring = 0
    var dx = 0
    var dz = 0
    var cx = 0
    var cz = 0
    var key = ''
    var has = false
    var rec = ''
    var dist = 0

    while (ring <= MAX_SEARCH_RADIUS && found.length < count) {
      // walk the ring perimeter: dx = +/-ring, dz = -ring..ring, then
      // dz = +/-ring, dx = -(ring-1)..(ring-1) to avoid double-corners
      dz = -ring
      while (dz <= ring) {
        cx = pcx + ring
        cz = pcz + dz
        key = indexKeyOf(dim, cx, cz)
        has = false
        try {
          has = SERVER.persistentData.contains(key)
        } catch (eC) {
          has = false
        }
        if (has) {
          try {
            rec = String(SERVER.persistentData.getString(key))
            if (rec && rec.length > 0) {
              dist = Math.sqrt(ring * ring + dz * dz)
              found.push({ cx: cx, cz: cz, dist: dist })
            }
          } catch (eR) {}
        }
        if (found.length >= count) break
        dz = dz + 1
      }
      if (found.length >= count) break

      dz = ring
      while (dz > -ring) {
        cx = pcx - ring
        cz = pcz + dz
        key = indexKeyOf(dim, cx, cz)
        has = false
        try {
          has = SERVER.persistentData.contains(key)
        } catch (eC) {
          has = false
        }
        if (has) {
          try {
            rec = String(SERVER.persistentData.getString(key))
            if (rec && rec.length > 0) {
              dist = Math.sqrt(ring * ring + dz * dz)
              found.push({ cx: cx, cz: cz, dist: dist })
            }
          } catch (eR) {}
        }
        if (found.length >= count) break
        dz = dz - 1
      }
      if (found.length >= count) break

      dx = -ring + 1
      while (dx <= ring - 1) {
        cz = pcz + ring
        cx = pcx + dx
        key = indexKeyOf(dim, cx, cz)
        has = false
        try {
          has = SERVER.persistentData.contains(key)
        } catch (eC) {
          has = false
        }
        if (has) {
          try {
            rec = String(SERVER.persistentData.getString(key))
            if (rec && rec.length > 0) {
              dist = Math.sqrt(dx * dx + ring * ring)
              found.push({ cx: cx, cz: cz, dist: dist })
            }
          } catch (eR) {}
        }
        if (found.length >= count) break
        dx = dx + 1
      }
      if (found.length >= count) break

      dx = ring - 1
      while (dx >= -ring + 1) {
        cz = pcz - ring
        cx = pcx + dx
        key = indexKeyOf(dim, cx, cz)
        has = false
        try {
          has = SERVER.persistentData.contains(key)
        } catch (eC) {
          has = false
        }
        if (has) {
          try {
            rec = String(SERVER.persistentData.getString(key))
            if (rec && rec.length > 0) {
              dist = Math.sqrt(dx * dx + ring * ring)
              found.push({ cx: cx, cz: cz, dist: dist })
            }
          } catch (eR) {}
        }
        if (found.length >= count) break
        dx = dx - 1
      }
      if (found.length >= count) break

      ring = ring + 1
    }
    return found
  }

  // --- weighted random pick: sqrt(distance) as weight -------------------------
  function pickWeighted(chunks, rng) {
    var totalWeight = 0
    var weights = []
    var i = 0
    var w = 0
    var r = 0
    var acc = 0

    for (i = 0; i < chunks.length; i++) {
      w = Math.sqrt(chunks[i].dist)
      weights.push(w)
      totalWeight = totalWeight + w
    }
    if (totalWeight <= 0) return chunks[0]

    r = rng() * totalWeight
    acc = 0
    for (i = 0; i < chunks.length; i++) {
      acc = acc + weights[i]
      if (r <= acc) return chunks[i]
    }
    return chunks[chunks.length - 1]
  }

  // --- report -------------------------------------------------------------------
  function report(entity, chosen, foundCount, rng) {
    var lines = []
    var dist = 0
    var jitter = 0
    var reported = 0

    if (!chosen) {
      lines.push('Scanner: no ore chunks found within range.')
      lines.push('  The ledger indexes each chunk on its first save/load — move on and re-check.')
    } else {
      dist = chosen.dist
      // distance +/-10%, seeded by chunk coordinate (same rng stream)
      jitter = (rng() * 0.2 - 0.1) * dist // -10% .. +10%
      reported = dist + jitter
      lines.push('Scanner: nearest ore chunk is ' + reported.toFixed(1) + ' chunks away (chunk ' + chosen.cx + ', ' + chosen.cz + ').')
      if (foundCount < NEAREST_COUNT) {
        lines.push('  Only ' + foundCount + ' ore chunk(s) found within range.')
      }
    }
    for (var i = 0; i < lines.length; i++) {
      try {
        entity.tell(lines[i])
      } catch (eTell) {
        console.info('[scanner] ' + lines[i])
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

    // Dump dimension structure at startup so we can see what's available
    console.info('[scanner] DUMP: server = ' + String(event.server))
    try {
      var dimMgr = event.server.dimensionManager
      console.info('[scanner] DUMP: dimensionManager = ' + String(dimMgr))
      if (dimMgr) {
        var dims = dimMgr.dimensions
        console.info('[scanner] DUMP: dimensionManager.dimensions = ' + String(dims))
        if (dims) {
          var it = dims.iterator()
          var n = 0
          while (it.hasNext()) {
            var key = it.next()
            console.info('[scanner] DUMP: dimension key = ' + String(key))
            n++
          }
          console.info('[scanner] DUMP: dimension count = ' + n)
        }
      }
    } catch (e) {
      console.info('[scanner] DUMP: dimensionManager failed: ' + e)
    }

    try {
      var reg = event.server.getRegistry('minecraft:dimension_type')
      console.info('[scanner] DUMP: registry minecraft:dimension_type = ' + String(reg))
    } catch (e) {
      console.info('[scanner] DUMP: getRegistry dimension_type failed: ' + e)
    }

    // Also dump what's on Level directly
    try {
      var serverLevel = event.server.getLevel('minecraft:overworld')
      console.info('[scanner] DUMP: overworld Level = ' + String(serverLevel))
      if (serverLevel) {
        console.info('[scanner] DUMP: Level.dimension field = ' + String(serverLevel.dimension))
        console.info('[scanner] DUMP: Level.dimensionType field = ' + String(serverLevel.dimensionType))
      }
    } catch (e) {
      console.info('[scanner] DUMP: getLevel overworld failed: ' + e)
    }
  })
  ServerEvents.unloaded(function (event) {
    SERVER = null
  })

  ItemEvents.rightClicked(function (event) {
    var hand = ''
    var entity = null
    var stackId = ''
    var chunks = []
    var chosen = null
    var rng = null
    try {
      hand = String(event.hand)
      if (hand !== 'MAIN_HAND') {
        entity.tell('Scanner: hold it in your main hand.')
        return
      }
      entity = event.entity
      if (!entity) return
      // server side only: the event rides 'common' and fires on both logical sides
      if (entity.level.isClientSide()) return
      stackId = String(event.item.id)
      if (stackId !== SCANNER_ID) {
        entity.tell('Scanner: not a scanner item.')
        return
      }
      if (!throttleOK(entity)) return

      var pcx = Math.floor(entity.x / 16)
      var pcz = Math.floor(entity.z / 16)
      var dim = playerDim(entity)
      if (dim === '') {
        entity.tell('Scanner: cannot determine dimension.')
        return
      }
      if (!SERVER) {
        entity.tell('Scanner: server not ready yet.')
        return
      }

      rng = makeSeededRng(pcx, pcz)
      chunks = findNearestOreChunks(dim, pcx, pcz, NEAREST_COUNT)
      chosen = pickWeighted(chunks, rng)
      report(entity, chosen, chunks.length, rng)
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
