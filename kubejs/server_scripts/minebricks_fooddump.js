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
//
// NOTE (0.4.12 rewrite — the fork's scope rules, harness-proven on our own
// rhino jar): declarations ONLY at function-body top; loops/try blocks only
// assign (loop-body const = "redeclaration of var X" throw / stale binding /
// OOM — the 0.4.11 first-run failures). IIFE-wrapped per 0.4.8 rule. No
// java.nio.file.Files — the KubeJS class filter blocks JDK classes (proven in
// her 0.4.11 runtime); all writes via JsonIO (proven working) + console.info
// mirror into latest.log.
// NOTE (0.4.10 still applies): no array spread `[...x]` anywhere.
// NOTE (0.4.13 — her 0.4.12 run autopsy): effect rows now introspect the real
// chain — pe.effect() is a MobEffectInstance (mappings FoodProperties$PossibleEffect
// effect()); the id lives one Holder deeper (getEffect().value()), and duration/
// amplifier come along free (MobEffectInstance getDuration/getAmplifier, mappings
// verified). 0.4.12 called .value() on the instance itself and every effect row
// degraded to its error string. Nutrition numbers were never touched — 330/330
// clean then, and this only enriches the fx fields.

;
(function () {
  var DIR = 'kubejs/export/food/'
  var TAG = 'fooddump'

  function writeText(rel, content) {
    var path = DIR + rel
    try {
      JsonIO.write(path, { content: String(content) })
      console.info('[' + TAG + '] wrote ' + path + ' (' + String(content).length + ' chars)')
    } catch (e) {
      console.info('[' + TAG + '] JsonIO WRITE FAILED for ' + path + ': ' + e)
    }
  }

  function fatal(ctx, log, msg) {
    log.push(msg)
    writeText('FOOD-LOG.txt', log.join('\n'))
    ctx.source.sendFailure(Text.of('[fooddump] probe failed — see kubejs/export/food/FOOD-LOG.txt'))
    return 0
  }

  // one item -> row, or null if not a food / unreadable. counters ride ctx.
  function scanItem(item, ctx) {
    var id = 'unknown:' + ctx.seq
    ctx.seq++
    try { id = String(ctx.itemReg.getKey(item)) } catch (e) { /* keep placeholder */ }

    var fp = null
    try {
      fp = item.components().get(ctx.FOOD)
    } catch (e) {
      try { fp = item.getDefaultInstance().get(ctx.FOOD) } catch (e2) { fp = null }
    }
    if (!fp) return null

    ctx.foods++
    var ns = id.indexOf(':') >= 0 ? id.substring(0, id.indexOf(':')) : 'unknown'
    ctx.nsCount[ns] = (ctx.nsCount[ns] || 0) + 1

    var row = {
      id: id,
      ns: ns,
      nutrition: 0,
      saturation: 0,
      satRatio: 0,
      canAlwaysEat: false,
      eatSeconds: null,
      effects: [],
      convertsTo: null
    }
    var effs = null
    var me = null
    var eid = null
    var chance = null
    var dur = null
    var amp = null
    var conv = null
    try {
      row.nutrition = fp.nutrition()
      row.saturation = fp.saturation()
      row.satRatio = row.nutrition > 0 ? Math.round((row.saturation / row.nutrition) * 1000) / 1000 : 0
      try { row.canAlwaysEat = fp.canAlwaysEat() } catch (e) { /* default false */ }
      try { row.eatSeconds = fp.eatSeconds() } catch (e) { ctx.log.push('eatSeconds n/a: ' + id) }

      try {
        effs = fp.effects()
        if (effs) {
          effs.forEach(function (pe) {
            me = null
            eid = null
            chance = null
            dur = null
            amp = null
            try {
              me = pe.effect() // MobEffectInstance — .value() lives on its Holder, not here
              eid = String(ctx.Registries.MOB_EFFECT.getKey(me.getEffect().value()))
            } catch (e2) {
              row.effects.push({ error: String(e2) })
              return
            }
            try { chance = pe.probability() } catch (e3) { /* some mappings differ */ }
            try { dur = me.getDuration() } catch (e4) { /* optional detail */ }
            try { amp = me.getAmplifier() } catch (e5) { /* optional detail */ }
            row.effects.push({ id: eid, chance: chance, duration: dur, amplifier: amp })
          })
        }
      } catch (e) {
        ctx.log.push('effects() failed: ' + id + ': ' + e)
      }

      try {
        conv = fp.usingConvertsTo()
        if (conv && conv.isPresent()) {
          row.convertsTo = String(ctx.itemReg.getKey(conv.get().getItem()))
        }
      } catch (e) { /* optional field, fine */ }
    } catch (e) {
      ctx.fails++
      ctx.log.push('FAIL ' + id + ': ' + e)
    }
    return row
  }

  ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands

    event.register(
      Commands.literal('fooddump')
        .requires(function (src) { return src.hasPermission(2) })
        .executes(function (ctx) {
          var server = ctx.source.server
          var log = []
          var T0 = Date.now()

          // --- probe: item registry --------------------------------------------
          var Registries = null
          var itemReg = null
          try {
            Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
            itemReg = Registries.ITEM
            log.push('BuiltInRegistries.ITEM OK (' + itemReg.size() + ' items)')
          } catch (e) {
            return fatal(ctx, log, 'FATAL: BuiltInRegistries.ITEM failed: ' + e)
          }

          // --- probe: food data component ----------------------------------------
          var FOOD = null
          try {
            FOOD = Java.loadClass('net.minecraft.core.component.DataComponents').FOOD
            log.push('DataComponents.FOOD OK')
          } catch (e) {
            return fatal(ctx, log, 'FATAL: DataComponents.FOOD failed: ' + e)
          }

          // --- walk ---------------------------------------------------------------
          var rows = []
          var nsCount = {}
          var ctxData = { Registries: Registries, itemReg: itemReg, FOOD: FOOD, rows: rows,
                          nsCount: nsCount, log: log, foods: 0, fails: 0, seq: 0 }

          var it = itemReg.iterator()
          var row = null
          while (it.hasNext()) {
            row = scanItem(it.next(), ctxData)
            if (row) rows.push(row)
          }

          rows.sort(function (a, b) { return (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) })

          // --- write ---------------------------------------------------------------
          JsonIO.write(DIR + 'FOOD-DUMP.json', {
            generated: new Date().toISOString(),
            packItems: itemReg.size(),
            foods: ctxData.foods,
            failures: ctxData.fails,
            byNamespace: nsCount,
            rows: rows
          })
          console.info('[' + TAG + '] FOOD-DUMP.json: ' + ctxData.foods + ' foods')

          var nsLine = Object.keys(nsCount).sort().map(function (k) { return k + '=' + nsCount[k] }).join(' ')
          var index = [
            '# fooddump index — ' + ctxData.foods + ' foods out of ' + itemReg.size() + ' items, ' + Object.keys(nsCount).length + ' namespaces',
            '# namespaces: ' + nsLine
          ]
          rows.forEach(function (r) {
            var fx = r.effects.length
              ? ' fx=' + r.effects.map(function (e) {
                  if (!e.id) return 'ERR:' + e.error
                  var durBit = (e.duration !== null && e.duration !== undefined) ? '/' + e.duration + 't' : ''
                  return e.id + '@' + e.chance + durBit
                }).join('|')
              : ''
            var cv = r.convertsTo ? ' -> ' + r.convertsTo : ''
            var secs = r.eatSeconds === null ? '?' : r.eatSeconds
            index.push(r.id + '  nut=' + r.nutrition + ' sat=' + r.saturation + ' ratio=' + r.satRatio
              + ' alwaysEat=' + r.canAlwaysEat + ' secs=' + secs + fx + cv)
          })
          writeText('FOOD-INDEX.txt', index.join('\n'))

          log.push('done: ' + ctxData.foods + ' foods, ' + ctxData.fails + ' failed, ' + (Date.now() - T0) + 'ms')
          writeText('FOOD-LOG.txt', log.join('\n'))
          ctx.source.sendSuccess(function () {
            return Text.of('[fooddump] ' + ctxData.foods + ' foods -> kubejs/export/food/ (' + ctxData.fails + ' failed, see FOOD-LOG.txt)')
          }, true)
          return 1
        })
    )
  })
})()
