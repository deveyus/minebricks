// minebricks_fooddump.js — DEBUG TOOL, Spice-of-Life math corpus generator
//
// Part of the debug-script loop: Zee builds -> pack lead pulls/runs -> this writes
// output files -> files come back -> we do the math.
//
// What it does: /fooddump walks the full item registry and writes EVERY item that
// carries a food component to
//   kubejs/export/food/FOOD-DUMP.json   (full rows + per-namespace counts)
//   kubejs/export/food/FOOD-INDEX.txt   (one line per food, sorted, human-readable)
//   kubejs/export/food/FOOD-LOG.txt     (probe notes, counts, exactly what failed)
//
// Purpose: the corpus for the Farmer's-Delight -> Spice of Life Onion math. Run it
// on the current pack AND again after the barrel adds land — the diff between runs
// is exactly what FD (and friends) contribute to the variety pool.
//
// Safe by construction: writes only to kubejs/export/, changes nothing in-world,
// no recipes touched, no tags touched. Requires op/permission 2.

ServerEvents.commandRegistry((event) => {
  const { commands: Commands } = event

  event.register(
    Commands.literal('fooddump')
      .requires((src) => src.hasPermission(2))
      .executes((ctx) => {
        const server = ctx.source.server
        const log = []
        const T0 = Date.now()

        // --- probe: item registry --------------------------------------------
        let Registries = null
        let itemReg = null
        try {
          Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
          itemReg = Registries.ITEM
          log.push(`BuiltInRegistries.ITEM OK (${itemReg.size()} items)`)
        } catch (e) {
          log.push(`FATAL: BuiltInRegistries.ITEM failed: ${e}`)
          writeText('FOOD-LOG.txt', log.join('\n'))
          ctx.source.sendFailure(Text.of('[fooddump] registry probe failed — see kubejs/export/food/FOOD-LOG.txt'))
          return 0
        }

        // --- probe: food data component ----------------------------------------
        let FOOD = null
        try {
          FOOD = Java.loadClass('net.minecraft.core.component.DataComponents').FOOD
          log.push('DataComponents.FOOD OK')
        } catch (e) {
          log.push(`FATAL: DataComponents.FOOD failed: ${e}`)
          writeText('FOOD-LOG.txt', log.join('\n'))
          ctx.source.sendFailure(Text.of('[fooddump] component probe failed — see kubejs/export/food/FOOD-LOG.txt'))
          return 0
        }

        // --- walk ---------------------------------------------------------------
        const rows = []
        const nsCount = {}
        let foods = 0
        let fails = 0

        const it = itemReg.iterator()
        while (it.hasNext()) {
          const item = it.next()
          let id = 'unknown:' + (foods + fails)
          try { id = String(itemReg.getKey(item)) } catch (e) { /* keep placeholder */ }

          let fp = null
          try {
            fp = item.components().get(FOOD)
          } catch (e) {
            try { fp = item.getDefaultInstance().get(FOOD) } catch (e2) { fp = null }
          }
          if (!fp) continue

          foods++
          const ns = id.indexOf(':') >= 0 ? id.substring(0, id.indexOf(':')) : 'unknown'
          nsCount[ns] = (nsCount[ns] || 0) + 1

          const row = {
            id: id,
            nutrition: 0,
            saturation: 0,
            satRatio: 0,
            canAlwaysEat: false,
            eatSeconds: null,
            effects: [],
            convertsTo: null
          }
          try {
            row.nutrition = fp.nutrition()
            row.saturation = fp.saturation()
            row.satRatio = row.nutrition > 0 ? Math.round((row.saturation / row.nutrition) * 1000) / 1000 : 0
            try { row.canAlwaysEat = fp.canAlwaysEat() } catch (e) { /* default false */ }
            try { row.eatSeconds = fp.eatSeconds() } catch (e) { log.push(`eatSeconds n/a: ${id}`) }

            try {
              const effs = fp.effects()
              if (effs) {
                effs.forEach((pe) => {
                  try {
                    const me = pe.effect().value()
                    const eid = String(Registries.MOB_EFFECT.getKey(me))
                    let chance = null
                    try { chance = pe.probability() } catch (e2) { /* some mappings differ */ }
                    row.effects.push({ id: eid, chance: chance })
                  } catch (e2) {
                    row.effects.push({ error: String(e2) })
                  }
                })
              }
            } catch (e) {
              log.push(`effects() failed: ${id}: ${e}`)
            }

            try {
              const conv = fp.usingConvertsTo()
              if (conv && conv.isPresent()) {
                row.convertsTo = String(itemReg.getKey(conv.get().getItem()))
              }
            } catch (e) { /* optional field, fine */ }
          } catch (e) {
            fails++
            log.push(`FAIL ${id}: ${e}`)
          }
          rows.push(row)
        }

        rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

        // --- write ---------------------------------------------------------------
        JsonIO.write('kubejs/export/food/FOOD-DUMP.json', {
          generated: new Date().toISOString(),
          packItems: itemReg.size(),
          foods: foods,
          failures: fails,
          byNamespace: nsCount,
          rows: rows
        })

        const nsLine = Object.keys(nsCount).sort().map((k) => `${k}=${nsCount[k]}`).join(' ')
        // NOTE (0.4.10): the pack's Rhino fork cannot parse array spread `[...x]`
        // (parse error -> whole file silently dropped). forEach + push instead.
        const index = [
          `# fooddump index — ${foods} foods out of ${itemReg.size()} items, ${Object.keys(nsCount).length} namespaces`,
          `# namespaces: ${nsLine}`
        ]
        rows.forEach((r) => {
          const fx = r.effects.length
            ? ' fx=' + r.effects.map((e) => (e.id ? `${e.id}@${e.chance}` : `ERR:${e.error}`)).join('|')
            : ''
          const cv = r.convertsTo ? ' -> ' + r.convertsTo : ''
          const secs = r.eatSeconds === null ? '?' : r.eatSeconds
          index.push(`${r.id}  nut=${r.nutrition} sat=${r.saturation} ratio=${r.satRatio} alwaysEat=${r.canAlwaysEat} secs=${secs}${fx}${cv}`)
        })
        writeText('FOOD-INDEX.txt', index.join('\n'))

        log.push(`done: ${foods} foods, ${fails} failed, ${Date.now() - T0}ms`)
        writeText('FOOD-LOG.txt', log.join('\n'))
        ctx.source.sendSuccess(() => Text.of(`[fooddump] ${foods} foods -> kubejs/export/food/ (${fails} failed, see FOOD-LOG.txt)`), true)
        return 1
      })
  )
})

function writeText(rel, content) {
  const path = 'kubejs/export/food/' + rel
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
