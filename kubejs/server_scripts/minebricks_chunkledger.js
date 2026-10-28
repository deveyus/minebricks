// ===========================================================================
// Minebricks — the Chunk Ledger: the persistent ore table built from chunk
// generation/saves. The scanner (minebricks_scanner.js) READS this table; it
// never counts blocks live. v1 — built 2026-10-29.
//
// FUNCTION (ruled by her 2026-10-26 03:06Z, NEXT-UP "Chunk ledger ruling";
// re-confirmed 2026-10-29: "it should make a call to our persistent data
// table that we build during chunk generation"):
//
//   ChunkDataEvent.Save fires for every chunk headed to disk. If the chunk's
//   own data tag lacks our marker key, the chunk has never been indexed:
//     1. census the chunk's sections once (generation-time truth),
//     2. write the record INTO the chunk's own data compound — marker and
//        chunk NBT hit disk in one write, server thread,
//     3. append the record to the server persistentData index the scanner
//        reads.
//   Exactly-once by construction: the marker lives in the chunk NBT itself,
//   so a persistentData wipe can never double-log. ChunkDataEvent.Load then
//   does two jobs: marked chunks re-heal a wiped index from their own stored
//   record; unmarked chunks (worlds generated before this script) index at
//   load — "indexing at load stays". Both phrases are the 03:06Z ruling,
//   verbatim in effect.
//
//   ZERO Java: NativeEvents.onEvent (KubeJS 2101.7.2-build.377 native event
//   wrapper) routes ChunkDataEvent to NeoForge.EVENT_BUS. The ~100-line Java
//   companion is dead per the same ruling. First NativeEvents use in the
//   pack — this file is the ledger probe the ruling queued for the debug
//   build.
//
// WHAT GETS INDEXED: every block state in minebricks:scanner_targets
// (#c:ores + ancient debris — the same taste as Silent's Gear's own
// prospector_hammer_targets; the hammer stays untouched). Record shape:
// "blockid:count|blockid:count", "" = indexed, zero ore. One string per
// chunk, stored twice (chunk data = authoritative, persistentData = the
// queryable table).
//
// Census primitive — every name verified 2026-10-29 against the official
// 1.21.1 client mappings (scratch/client-mappings-1.21.1.txt) and
// neoforge-universal-21.1.265.jar (both in scratch/):
//   ChunkDataEvent.getChunk() / getData()      — neoforge jar (ctor + field)
//   ChunkEvent.getLevel()                      — neoforge jar
//   ChunkAccess.getSections()                  — mappings 161:161
//   ChunkAccess.getPos(), ChunkPos.x/.z fields — mappings 197:197 / fields
//   LevelChunkSection.hasOnlyAir()             — mappings 98:98
//   LevelChunkSection.getStates()              — mappings 148:148
//   PalettedContainer.count(CountConsumer)     — mappings 299:306 (void;
//     CountConsumer.accept(Object,int) visits each UNIQUE state WITH its
//     count — the whole section census in one native call, no per-block
//     script walking, no palette iteration needed)
//   LevelChunk.getLevel().dimension().location() — mappings 518:518 / 944:944
//   ResourceKey.location()                     — mappings 69:69
//   CompoundTag contains/putString/getString   — mappings
//   Previously runtime-proven in this pack: Java.loadClass vanilla chain,
//   state.is(TagKey), registries key lookup (cropscan/mint lineage),
//   entity.persistentData putLong/contains (scanner v1 throttle).
//
// KNOWN EDGE (documented, accepted): chunks saved before ServerEvents fires
// (initial spawn-chunk pregen) stamp their chunk-data marker but defer the
// index append; the Load handler heals the index on the chunk's next load
// (unload/reload or restart). Fresh worlds — the pack's target — never hit
// this, because every chunk first-touches after the server is up.
//
// House rules honored: IIFE scope isolation (0.4.8 doctrine); declarations
// at function-body top ONLY, loops/try assign (0.4.12 scope doctrine); no
// array spread (0.4.10 parse doctrine); ES3-safe throughout; every failure
// path lands in console.info (latest.log) — a failed census stamps NO
// marker and retries on the chunk's next save/load.
// ===========================================================================

;
(function () {

  var LEDGER_DATA_KEY = 'minebricks_scanner_ledger' // chunk-data marker + record (one string)
  var INDEX_ROOT = 'mb_ledger'                      // server persistentData table root
  var TAG_ID = 'minebricks:scanner_targets'

  var TAG_KEY = null
  var BLOCK_REG = null
  var SERVER = null
  var FIRST_INDEXED = false
  var CENSUS_COUNTS = null
  var CENSUS_TAG = null

  // --- lazily built, reused for the life of the server ----------------------
  function buildTagKey() {
    var RLc = null
    var TagKeyC = null
    var RegsC = null
    RLc = Java.loadClass('net.minecraft.resources.ResourceLocation')
    TagKeyC = Java.loadClass('net.minecraft.tags.TagKey')
    RegsC = Java.loadClass('net.minecraft.core.registries.Registries')
    return TagKeyC.create(RegsC.BLOCK, RLc.parse(TAG_ID))
  }

  // --- census consumer: one native count() call feeds this per unique state -
  // module-level sink so the SAM wrapper is built once, not per section
  function censusAccept(state, n) {
    var bid = ''
    if (CENSUS_TAG && state.is(CENSUS_TAG)) {
      bid = String(BLOCK_REG.getKey(state.getBlock()).toString())
      if (!CENSUS_COUNTS[bid]) CENSUS_COUNTS[bid] = 0
      CENSUS_COUNTS[bid] = CENSUS_COUNTS[bid] + n
    }
  }

  // --- the census: sections only, air skipped, one count() per section ------
  function chunkRecord(chunk) {
    var ok = true
    var sections = null
    var i = 0
    var sec = null
    var states = null
    var id = ''
    var parts = []

    if (!TAG_KEY) TAG_KEY = buildTagKey()
    if (!BLOCK_REG) BLOCK_REG = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').BLOCK
    CENSUS_TAG = TAG_KEY
    CENSUS_COUNTS = {}
    sections = chunk.getSections()
    for (i = 0; i < sections.length; i++) {
      sec = sections[i]
      if (sec.hasOnlyAir()) continue
      states = sec.getStates()
      try {
        states.count(censusAccept)
      } catch (eCount) {
        ok = false
        console.info('[chunk-ledger] census failed on section ' + i + ': ' + eCount)
        break
      }
    }
    if (!ok) return null
    for (id in CENSUS_COUNTS) parts.push(id + ':' + CENSUS_COUNTS[id])
    return parts.join('|')
  }

  // --- index helpers ----------------------------------------------------------
  function dimKeyOf(chunk) {
    var d = ''
    try {
      d = String(chunk.getLevel().dimension().location().toString())
    } catch (eDim) {
      d = ''
    }
    return d
  }

  function indexKeyOf(dim, cx, cz) {
    return INDEX_ROOT + ':' + dim + '|' + cx + ',' + cz
  }

  function indexPut(dim, cx, cz, rec) {
    var ok = false
    if (!SERVER || dim === '') return false
    try {
      SERVER.persistentData.putString(indexKeyOf(dim, cx, cz), rec)
      ok = true
    } catch (eIdx) {
      console.info('[chunk-ledger] index write failed: ' + eIdx)
      ok = false
    }
    return ok
  }

  // --- handlers (each fully guarded: a native chunk-pipeline event must
  // never throw into world saving) -------------------------------------------
  function onSave(ev) {
    var data = null
    var chunk = null
    var dim = ''
    var rec = ''
    var cx = 0
    var cz = 0
    var got = false

    data = ev.getData()
    if (data.contains(LEDGER_DATA_KEY)) return // marker-gated: exactly-once
    chunk = ev.getChunk()
    rec = chunkRecord(chunk)
    if (rec === null) return // no marker stamped; retries on next save
    data.putString(LEDGER_DATA_KEY, rec) // marker + record ride this one write
    dim = dimKeyOf(chunk)
    cx = chunk.getPos().x
    cz = chunk.getPos().z
    got = indexPut(dim, cx, cz, rec)
    if (!got) {
      console.info('[chunk-ledger] index deferred (server not up yet) at ' + dim + '|' + cx + ',' + cz + ' — chunk marker is in, heal lands on next load')
    }
    if (!FIRST_INDEXED && got) {
      FIRST_INDEXED = true
      console.info('[chunk-ledger] first chunk indexed — the scanner table is live (' + LEDGER_DATA_KEY + ')')
    }
  }

  function onLoad(ev) {
    var data = null
    var chunk = null
    var dim = ''
    var rec = ''
    var cx = 0
    var cz = 0

    data = ev.getData()
    chunk = ev.getChunk()
    dim = dimKeyOf(chunk)
    cx = chunk.getPos().x
    cz = chunk.getPos().z
    if (data.contains(LEDGER_DATA_KEY)) {
      // marked chunk: heal a wiped/deferred index from chunk truth
      if (SERVER && dim !== '') {
        try {
          if (!SERVER.persistentData.contains(indexKeyOf(dim, cx, cz))) {
            rec = String(data.getString(LEDGER_DATA_KEY))
            SERVER.persistentData.putString(indexKeyOf(dim, cx, cz), rec)
          }
        } catch (eHeal) {
          console.info('[chunk-ledger] index heal failed: ' + eHeal)
        }
      }
      return
    }
    // unmarked chunk (pre-ledger world): index at load, marker rides next save
    rec = chunkRecord(chunk)
    if (rec === null) return
    data.putString(LEDGER_DATA_KEY, rec)
    indexPut(dim, cx, cz, rec)
  }

  function safe(fn, ev) {
    try {
      fn(ev)
    } catch (eSafe) {
      console.info('[chunk-ledger] handler error: ' + eSafe)
    }
  }

  // --- wiring ---------------------------------------------------------------
  ServerEvents.loaded(function (event) {
    SERVER = event.server
  })
  ServerEvents.unloaded(function (event) {
    SERVER = null
    FIRST_INDEXED = false
  })

  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.level.ChunkDataEvent$Save'), function (ev) {
    safe(onSave, ev)
  })
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.level.ChunkDataEvent$Load'), function (ev) {
    safe(onLoad, ev)
  })

  console.info('[chunk-ledger] wired: ChunkDataEvent Save/Load -> ' + TAG_ID + ' census -> chunk marker + persistentData table')

})()
