// minebricks_lootdump.js — DEBUG TOOL, loot pass artifact generator
//
// Part of the loot-pass loop: Zee builds -> pack lead pulls/runs -> this writes
// output files -> files come back -> we work through them.
//
// What it does: /lootdump writes EVERY registered loot table to
//   kubejs/export/loot/<namespace>/<path>.json
// plus a summary index at kubejs/export/loot/DUMP-INDEX.txt
// (table id, pool count, condition types) and a log at DUMP-LOG.txt.
//
// Safe by construction: writes only to kubejs/export/, changes nothing in-world,
// no recipes touched, no tags touched. Requires op/permission 2. Heads up: this
// walks every registered table (order 20k here), so the server chugs for a
// minute or two while it runs — that is the tool working, not a hang. Progress
// mirrors into latest.log every 2500 tables.
//
// NOTE (0.4.13 — loot API rewritten against the actual 1.21.1 mappings, because
// her 0.4.12 run proved my old probe dead): there is NO getLootData anywhere in
// 1.21.1 (zero mapping hits — both old paths were fictional). The living chain,
// verified in client-mappings-1.21.1.txt:
//   MinecraftServer#reloadableRegistries()            -> ReloadableServerRegistries$Holder
//   Holder#getKeys(net.minecraft.core.registries.Registries.LOOT_TABLE)
//                                                     -> Collection<ResourceKey<LootTable>>
//   Holder#getLootTable(ResourceKey)                  -> LootTable
//   LootTable.DIRECT_CODEC  (a plain CODEC field does not exist in 1.21.1)
//   ResourceKey#location() for the namespace/path parts.
// Legacy 1.20.x shapes are probed as fallbacks so a future pack bump degrades
// loudly in DUMP-LOG.txt, not silently. Scope rules (0.4.12) still apply: IIFE,
// decls at function-body top only, loops/try assign, JsonIO-only writes,
// console.info mirror, no array spread.
//
// LESSON (0.4.12 mint run, now doctrine): reading `server.someMethod` as a
// PROPERTY binds the method itself, not its result — pass-through wrappers then
// feed a JS function where a Java type is expected ("getResultItem(function)").
// Every probe here CALLS with the () form.

;
(function () {
  var DIR = 'kubejs/export/loot/'
  var TAG = 'lootdump'

  function writeText(rel, content) {
    var path = DIR + rel
    try {
      JsonIO.write(path, { content: String(content) })
      console.info('[' + TAG + '] wrote ' + path + ' (' + String(content).length + ' chars)')
    } catch (e) {
      console.info('[' + TAG + '] JsonIO WRITE FAILED for ' + path + ': ' + e)
    }
  }

  // registry-aware ops context; plain JsonOps fallback, loudly logged
  function probeOps(server, log) {
    var JsonOps = null
    var ra = null
    var ops = null
    try {
      JsonOps = Java.loadClass('com.mojang.serialization.JsonOps')
    } catch (e0) {
      log.push('FATAL: JsonOps load failed: ' + e0)
      return null
    }
    try {
      ra = server['registryAccess']()
      ops = ra.createSerializationContext(JsonOps.INSTANCE)
      log.push('RegistryOps context OK (registry-aware)')
      return ops
    } catch (e1) {
      log.push('registryOps context failed (' + e1 + ') — falling back to plain JsonOps; some encodes may degrade')
    }
    return JsonOps.INSTANCE
  }

  function probeCodec(log) {
    var LT = null
    var dc = null
    var cc = null
    try {
      LT = Java.loadClass('net.minecraft.world.level.storage.loot.LootTable')
    } catch (e0) {
      log.push('FATAL: LootTable class load failed: ' + e0)
      return null
    }
    try {
      dc = LT.DIRECT_CODEC
      log.push('LootTable.DIRECT_CODEC found (1.21 shape)')
      return dc
    } catch (e1) {}
    try {
      cc = LT.CODEC
      log.push('LootTable.CODEC found (1.20 shape)')
      return cc
    } catch (e2) {}
    log.push('FATAL: no codec field on LootTable (tried DIRECT_CODEC, CODEC)')
    return null
  }

  // returns { rr: caller-with-getLootTable, keys: table id collection } or null
  function probeLoot(server, log) {
    var rr = null
    var keys = null
    try {
      rr = server['reloadableRegistries']()
      keys = rr.getKeys(Java.loadClass('net.minecraft.core.registries.Registries').LOOT_TABLE)
      if (keys) {
        log.push('loot tables via reloadableRegistries().getKeys(LOOT_TABLE) OK')
        return { rr: rr, keys: keys }
      }
    } catch (e1) {
      log.push('reloadableRegistries path failed: ' + e1)
    }
    // legacy 1.20.x shapes — loud fallbacks only
    try {
      rr = server['getLootData']()
      keys = rr.getAllIds()
      if (keys) {
        log.push('loot tables via server.getLootData().getAllIds() OK (legacy shape)')
        return { rr: rr, keys: keys }
      }
    } catch (e2) {
      log.push('getLootData().getAllIds() failed: ' + e2)
    }
    log.push('FATAL: no loot table source worked — paste DUMP-LOG.txt back to Zee')
    return null
  }

  // walk a GSON json tree, collect short condition type names
  function walkForConditions(node, acc) {
    var t = null
    var s = ''
    var shortName = ''
    if (!node || typeof node !== 'object') return
    if (node.isJsonObject && node.isJsonObject()) {
      t = node.get('type')
      if (t && t.isJsonPrimitive && t.isJsonPrimitive()) {
        s = t.asString()
        if (s.indexOf('loot') >= 0) {
          shortName = s.substring(s.indexOf('/') + 1)
          if (acc.indexOf(shortName) < 0) acc.push(shortName)
        }
      }
    }
    if (node.isJsonArray && node.isJsonArray()) {
      for (var i = 0; i < node.size(); i++) walkForConditions(node.get(i), acc)
    } else if (node.isJsonObject && node.isJsonObject()) {
      node.entrySet().forEach(function (e) { walkForConditions(e.getValue(), acc) })
    }
  }

  function dumpOneTable(probe, id, codec, ops, index, log, tally) {
    var loc = null
    var ns = ''
    var pth = ''
    var key = ''
    var entry = { id: '', pools: '?', conditions: '' }
    var table = null
    var enc = null
    var json = null
    var payload = null
    var poolsJ = null
    var condTypes = null
    try {
      try { loc = id.location() } catch (le) { loc = id } // ResourceKey vs ResourceLocation
      try { ns = String(loc.namespace()) } catch (n1) { ns = String(loc).split(':')[0] }
      try { pth = String(loc.path()) } catch (n2) { pth = String(loc).split(':')[1] }
      key = ns + '/' + pth
      entry.id = key
      table = probe.rr.getLootTable(id)
      if (codec && ops) {
        enc = codec.encodeStart(ops, table)
        if (enc.result().isPresent()) {
          json = enc.result().get()
          try {
            poolsJ = json.get('pools')
            entry.pools = poolsJ && poolsJ.isJsonArray() ? poolsJ.size() : 0
          } catch (pe) { entry.pools = '?' }
          condTypes = []
          walkForConditions(json, condTypes)
          entry.conditions = condTypes.join(',')
          // JsonIO gets a plain JS object (parse is cheap, proven path);
          // raw Gson element as fallback in case toString ever lies
          try {
            payload = JSON.parse(String(json))
            JsonIO.write(DIR + key + '.json', payload)
            tally.ok++
          } catch (we1) {
            try {
              JsonIO.write(DIR + key + '.json', json)
              tally.ok++
              log.push('raw-gson write used for ' + key)
            } catch (we2) {
              tally.fail++
              log.push('JsonIO table write failed: ' + key + ': ' + we2)
            }
          }
        } else {
          tally.fail++
          log.push('encode empty: ' + key)
        }
      } else {
        tally.fail++
        log.push('no codec/ops: ' + key)
      }
    } catch (e) {
      tally.fail++
      log.push('FAIL ' + key + ': ' + e)
    }
    index.push(key + ' pools=' + entry.pools + (entry.conditions ? ' conds=' + entry.conditions : ''))
  }

  ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands

    event.register(
      Commands.literal('lootdump')
        .requires(function (src) { return src.hasPermission(2) })
        .executes(function (ctx) {
          var server = ctx.source.server
          var log = []
          var T0 = Date.now()

          // --- API probe: loot tables -------------------------------------------
          var probe = probeLoot(server, log)
          if (!probe) {
            writeText('DUMP-LOG.txt', log.join('\n'))
            ctx.source.sendFailure(Text.of('[lootdump] API probe failed — send kubejs/export/loot/DUMP-LOG.txt to Zee'))
            return 0
          }

          // --- API probe: serializer --------------------------------------------
          var codec = probeCodec(log)
          var ops = probeOps(server, log)
          if (!codec || !ops) {
            log.push('FATAL: serializer unavailable — paste DUMP-LOG.txt back to Zee')
            writeText('DUMP-LOG.txt', log.join('\n'))
            ctx.source.sendFailure(Text.of('[lootdump] codec/ops probe failed — see DUMP-LOG.txt'))
            return 0
          }

          var total = 0
          try { total = probe.keys.size() } catch (ts) { total = probe.keys.length }
          log.push('tables: ' + total)
          console.info('[' + TAG + '] starting dump of ' + total + ' loot tables')

          var index = []
          var tally = { ok: 0, fail: 0 }
          var done = 0

          probe.keys.forEach(function (id) {
            dumpOneTable(probe, id, codec, ops, index, log, tally)
            done++
            if (done % 2500 === 0) console.info('[' + TAG + '] progress ' + done + '/' + total)
          })

          writeText('DUMP-INDEX.txt', index.sort().join('\n'))
          log.push('done: ' + tally.ok + ' written, ' + tally.fail + ' failed, ' + (Date.now() - T0) + 'ms')
          writeText('DUMP-LOG.txt', log.join('\n'))
          console.info('[' + TAG + '] done: ' + tally.ok + ' tables, ' + tally.fail + ' failed')
          ctx.source.sendSuccess(function () {
            return Text.of('[lootdump] ' + tally.ok + ' tables -> kubejs/export/loot/ (' + tally.fail + ' failed, see DUMP-LOG.txt)')
          }, true)
          return 1
        })
    )
  })
})()
