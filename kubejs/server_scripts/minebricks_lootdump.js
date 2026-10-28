// minebricks_lootdump.js — DEBUG TOOL, loot pass artifact generator
//
// Part of the loot-pass loop: Zee builds -> pack lead pulls/runs -> this writes
// output files -> files come back -> we work through them.
//
// What it does: /lootdump writes EVERY registered loot table to
//   kubejs/export/loot/<namespace>/<path>.json
// plus a summary index at kubejs/export/loot/DUMP-INDEX.txt
// (table id, pool count, condition types) and a log at DUMP-LOG.txt recording
// exactly which API paths worked and which fell back — first run is the probe.
//
// Safe by construction: writes only to kubejs/export/, changes nothing in-world,
// no recipes touched, no tags touched. Requires op/permission 2.
//
// NOTE (0.4.12 rewrite — the fork's scope rules, harness-proven on our own
// rhino jar): this fork throws "redeclaration of var X" (or worse: silently
// stale bindings / OOM) for ANY const/let/var declared inside a loop body,
// try block, or other nested block — the 0.4.11 first-run failures came from
// exactly that (lootdump#34 old line). House doctrine now:
//   * whole file IIFE-wrapped (0.4.8 rule, keeps the shared global scope clean)
//   * declarations ONLY at function-body top; loops and try blocks only assign
//   * no java.nio.file.Files — the KubeJS class filter blocks JDK classes to
//     scripts (proven in her 0.4.11 runtime); all writes go through JsonIO,
//     which is proven working, plus a console.info mirror into latest.log so
//     dump output is visible even when a file write degrades.
// NOTE (0.4.10 still applies): the fork cannot parse array spread `[...x]`.

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

  function probeLootData(server, log) {
    var found = null
    var paths = [['server', 'lootData'], ['server', 'getLootData()']]
    paths.forEach(function (pm) {
      if (found) return
      var obj = pm[0] === 'server' ? server : null
      var member = pm[1]
      try {
        found = member.indexOf('()') >= 0 ? obj[member.slice(0, member.length - 2)]() : obj[member]
        if (found) log.push('lootData via server.' + member + ' OK')
      } catch (e) {
        log.push('server.' + member + ' failed: ' + e)
      }
    })
    return found
  }

  function probeAllIds(lootData, log) {
    var ids = null
    var paths = ['allIds', 'getAllIds()']
    paths.forEach(function (member) {
      if (ids) return
      try {
        ids = member.indexOf('()') >= 0 ? lootData[member.slice(0, member.length - 2)]() : lootData[member]
        if (ids) log.push('allIds via ' + member + ' OK (' + ids.size + ' ids)')
      } catch (e) {
        log.push(member + ' failed: ' + e)
      }
    })
    return ids
  }

  // walk a GSON json tree, collect short condition type names (no spread, no Set)
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

  function dumpOneTable(lootData, id, codec, ops, index, log, tally) {
    var key = id.namespace() + '/' + id.path()
    var entry = { id: key, pools: '?', conditions: '' }
    var table = null
    var enc = null
    var json = null
    var condTypes = null
    try {
      table = lootData.getLootTable(id)
      if (codec && ops) {
        enc = codec.encodeStart(ops, table)
        if (enc.result().isPresent()) {
          json = enc.result().get()
          entry.pools = json.pools ? json.pools.size() : 0
          condTypes = []
          walkForConditions(json, condTypes)
          entry.conditions = condTypes.join(',')
          try {
            JsonIO.write(DIR + key + '.json', json)
            tally.ok++
          } catch (we) {
            tally.fail++
            log.push('JsonIO table write failed: ' + key + ': ' + we)
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

          // --- API probe: loot data manager -----------------------------------
          var lootData = probeLootData(server, log)
          if (!lootData) {
            log.push('FATAL: no lootData path worked — paste DUMP-LOG.txt back to Zee')
            writeText('DUMP-LOG.txt', log.join('\n'))
            ctx.source.sendFailure(Text.of('[lootdump] API probe failed — send kubejs/export/loot/DUMP-LOG.txt to Zee'))
            return 0
          }

          // --- API probe: all ids ---------------------------------------------
          var ids = probeAllIds(lootData, log)
          if (!ids) {
            log.push('FATAL: no allIds path worked — paste DUMP-LOG.txt back to Zee')
            writeText('DUMP-LOG.txt', log.join('\n'))
            ctx.source.sendFailure(Text.of('[lootdump] id probe failed — see DUMP-LOG.txt'))
            return 0
          }

          // --- API probe: table serializer --------------------------------------
          var codec = null
          try {
            codec = Java.loadClass('net.minecraft.world.level.storage.loot.LootTable').CODEC
            log.push('LootTable.CODEC found')
          } catch (e) {
            log.push('LootTable.CODEC missing: ' + e)
          }
          var ops = null
          var JsonOps = null
          try {
            JsonOps = Java.loadClass('com.mojang.serialization.JsonOps')
            ops = server.registryAccess().createSerializationContext(JsonOps.INSTANCE)
            log.push('RegistryOps context OK')
          } catch (e) {
            log.push('registryAccess path failed: ' + e)
          }

          var index = []
          var tally = { ok: 0, fail: 0 }

          ids.forEach(function (id) {
            dumpOneTable(lootData, id, codec, ops, index, log, tally)
          })

          writeText('DUMP-INDEX.txt', index.sort().join('\n'))
          log.push('done: ' + tally.ok + ' written, ' + tally.fail + ' failed, ' + (Date.now() - T0) + 'ms')
          writeText('DUMP-LOG.txt', log.join('\n'))
          ctx.source.sendSuccess(function () {
            return Text.of('[lootdump] ' + tally.ok + ' tables -> kubejs/export/loot/ (' + tally.fail + ' failed, see DUMP-LOG.txt)')
          }, true)
          return 1
        })
    )
  })
})()
