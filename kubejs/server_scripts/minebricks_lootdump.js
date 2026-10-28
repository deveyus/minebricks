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

ServerEvents.commandRegistry((event) => {
  const { commands: Commands } = event

  event.register(
    Commands.literal('lootdump')
      .requires((src) => src.hasPermission(2))
      .executes((ctx) => {
        const server = ctx.source.server
        const log = []
        const T0 = Date.now()

        // --- API probe: loot data manager -------------------------------------
        let lootData = null
        const lootDataPaths = [
          ['server', 'lootData'],
          ['server', 'getLootData()']
        ]
        for (const [obj, member] of lootDataPaths) {
          try {
            const o = obj === 'server' ? server : null
            lootData = member.endsWith('()') ? o[member.slice(0, -2)]() : o[member]
            if (lootData) { log.push(`lootData via server.${member} OK`); break }
          } catch (e) {
            log.push(`server.${member} failed: ${e}`)
          }
        }
        if (!lootData) {
          log.push('FATAL: no lootData path worked — paste DUMP-LOG.txt back to Zee')
          writeText('DUMP-LOG.txt', log.join('\n'))
          ctx.source.sendFailure(Text.of('[lootdump] API probe failed — send kubejs/export/loot/DUMP-LOG.txt to Zee'))
          return 0
        }

        // --- API probe: all ids -----------------------------------------------
        let ids = null
        for (const member of ['allIds', 'getAllIds()']) {
          try {
            ids = member.endsWith('()') ? lootData[member.slice(0, -2)]() : lootData[member]
            if (ids) { log.push(`allIds via ${member} OK (${ids.size} ids)`); break }
          } catch (e) {
            log.push(`${member} failed: ${e}`)
          }
        }

        // --- API probe: table serializer --------------------------------------
        let codec = null
        try {
          codec = Java.loadClass('net.minecraft.world.level.storage.loot.LootTable').CODEC
          log.push('LootTable.CODEC found')
        } catch (e) {
          log.push(`LootTable.CODEC missing: ${e}`)
        }
        let ops = null
        try {
          const JsonOps = Java.loadClass('com.mojang.serialization.JsonOps')
          ops = server.registryAccess().createSerializationContext(JsonOps.INSTANCE)
          log.push('RegistryOps context OK')
        } catch (e) {
          log.push(`registryAccess path failed: ${e}`)
        }

        const index = []
        let ok = 0, fail = 0

        ids.forEach((id) => {
          const key = `${id.namespace()}/${id.path()}`
          let entry = { id: key, pools: '?', conditions: '' }
          try {
            const table = lootData.getLootTable(id)
            if (codec && ops) {
              const enc = codec.encodeStart(ops, table)
              if (enc.result().isPresent()) {
                const json = enc.result().get()
                entry.pools = json.pools ? json.pools.size() : 0
                // NOTE (0.4.10): the pack's Rhino fork cannot parse array spread `[...x]`
                // (parse error -> whole file silently dropped). Plain arrays only.
                const condTypes = []
                walkForConditions(json, condTypes)
                entry.conditions = condTypes.join(',')
                JsonIO.write(`kubejs/export/loot/${id.namespace()}/${id.path()}.json`, json)
                ok++
              } else {
                fail++
                log.push(`encode empty: ${key}`)
              }
            } else {
              fail++
              log.push(`no codec/ops: ${key}`)
            }
          } catch (e) {
            fail++
            log.push(`FAIL ${key}: ${e}`)
          }
          index.push(`${key} pools=${entry.pools}${entry.conditions ? ' conds=' + entry.conditions : ''}`)
        })

        function walkForConditions(node, acc) {
          if (!node || typeof node !== 'object') return
          if (node.isJsonObject && node.isJsonObject()) {
            const t = node.get('type')
            if (t && t.isJsonPrimitive && t.isJsonPrimitive()) {
              const s = t.asString()
              if (s.indexOf('loot') >= 0) {
                const short = s.substring(s.indexOf('/') + 1)
                if (acc.indexOf(short) < 0) acc.push(short)
              }
            }
          }
          if (node.isJsonArray && node.isJsonArray()) {
            for (let i = 0; i < node.size(); i++) walkForConditions(node.get(i), acc)
          } else if (node.isJsonObject && node.isJsonObject()) {
            node.entrySet().forEach((e) => walkForConditions(e.getValue(), acc))
          }
        }

        writeText('DUMP-INDEX.txt', index.sort().join('\n'))
        log.push(`done: ${ok} written, ${fail} failed, ${Date.now() - T0}ms`)
        writeText('DUMP-LOG.txt', log.join('\n'))
        ctx.source.sendSuccess(() => Text.of(`[lootdump] ${ok} tables -> kubejs/export/loot/ (${fail} failed, see DUMP-LOG.txt)`), true)
        return 1
      })
  )
})

function writeText(rel, content) {
  const path = 'kubejs/export/loot/' + rel
  try {
    const Files = Java.loadClass('java.nio.file.Files')
    const Paths = Java.loadClass('java.nio.file.Paths')
    const p = Paths.get(path)
    if (p.getParent()) Files.createDirectories(p.getParent())
    Files.writeString(p, String(content))
  } catch (e) {
    JsonIO.write(path, { content: String(content), write_error: String(e) })
  }
}
