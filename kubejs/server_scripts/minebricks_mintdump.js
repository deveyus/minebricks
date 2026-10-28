// minebricks_mintdump.js — DEBUG TOOL, mintscan corpus generator (ground truth)
//
// Part of the debug-script loop: Zee builds -> pack lead pulls/runs -> this writes
// output files -> files come back -> mintscan works them.
//
// What it does: /mintdump captures the RUNTIME graph AFTER every mod + KubeJS
// script has had its say — the graph mintscan is supposed to verify — and writes:
//   kubejs/export/mint/recipes.json    every registered recipe, normalized
//                                      (id, type, ingredient slots pre-resolved
//                                      to concrete items, output item + count)
//   kubejs/export/mint/tags.json       every item tag -> member items (runtime
//                                      state, so tag edits are captured too)
//   kubejs/export/mint/blockloot.json  block id -> loot table id (mining edges)
//   kubejs/export/mint/MINT-LOG.txt    probe notes, counts, exactly what failed
//
// Loot table contents ride the existing /lootdump output (kubejs/export/loot/).
//
// Why dumps and not jar parsing: jars show the graph BEFORE KubeJS scripts
// mutate it. This dump shows the graph the game will actually run. mintscan
// treats these files as ground truth; jar-side extraction is only ever a
// fixture while the pack can't be booted here.
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

;
(function () {
  var DIR = 'kubejs/export/mint/'
  var TAG = 'mintdump'

  function writeText(rel, content) {
    var path = DIR + rel
    try {
      JsonIO.write(path, { content: String(content) })
      console.info('[' + TAG + '] wrote ' + path + ' (' + String(content).length + ' chars)')
    } catch (e) {
      console.info('[' + TAG + '] JsonIO WRITE FAILED for ' + path + ': ' + e)
    }
  }

  function probeByNames(server, names, label, log) {
    var found = null
    names.forEach(function (m) {
      if (found) return
      try {
        found = m.indexOf('()') >= 0 ? server[m.slice(0, m.length - 2)]() : server[m]
        if (found) log.push(label + ' via server.' + m + ' OK')
      } catch (e) {
        log.push('server.' + m + ' failed: ' + e)
      }
    })
    return found
  }

  function collectTypes(Registries, log, types) {
    var typeReg = null
    var it = null
    var t = null
    var RT = null
    var named = null
    try {
      typeReg = Registries.RECIPE_TYPE
      it = typeReg.iterator()
      while (it.hasNext()) {
        t = it.next()
        try { types.push({ t: t, name: String(typeReg.getKey(t)) }) } catch (e) { log.push('type key failed: ' + e) }
      }
      log.push('RECIPE_TYPE registry OK (' + types.length + ' types)')
    } catch (e) {
      log.push('RECIPE_TYPE registry failed (' + e + ') — falling back to vanilla type constants')
    }
    if (!types.length) {
      try {
        RT = Java.loadClass('net.minecraft.world.item.crafting.RecipeType')
        named = [
          ['CRAFTING', 'minecraft:crafting'], ['SMELTING', 'minecraft:smelting'],
          ['BLASTING', 'minecraft:blasting'], ['SMOKING', 'minecraft:smoking'],
          ['CAMPFIRE_COOKING', 'minecraft:campfire_cooking'], ['STONECUTTING', 'minecraft:stonecutting'],
          ['SMITHING', 'minecraft:smithing']
        ]
        named.forEach(function (pair) {
          try { types.push({ t: RT[pair[0]], name: pair[1] }) } catch (e) { log.push('constant ' + pair[0] + ' failed: ' + e) }
        })
        log.push('vanilla fallback types: ' + types.length)
      } catch (e2) {
        log.push('RecipeType constants unavailable: ' + e2)
      }
    }
  }

  function scanRecipe(holder, typeName, ctx) {
    var rid = 'unknown'
    var rk = null
    var ing = null
    var slot = null
    var stacks = null
    var st = null
    var iid = ''
    var out = null
    try {
      rk = holder.id()
      try { rid = String(rk.location()) } catch (e1) { rid = String(rk).replace(/^.* \/ /, '') }
    } catch (e) { ctx.log.push('id failed in ' + typeName + ': ' + e) }

    var row = { id: rid, type: typeName, slots: [], out: null }
    try {
      ing = holder.value().getIngredients()
      if (ing) {
        for (var i = 0; i < ing.size(); i++) {
          slot = []
          try {
            stacks = ing.get(i).getItems()
            if (stacks) {
              for (var j = 0; j < stacks.length; j++) {
                st = stacks[j]
                try {
                  iid = String(ctx.Registries.ITEM.getKey(st.getItem()))
                  slot.push({ item: iid, count: st.getCount() })
                } catch (e2) { slot.push({ error: String(e2) }) }
              }
            }
          } catch (e3) { slot.push({ error: String(e3) }) }
          row.slots.push(slot)
        }
      }
    } catch (e) {
      ctx.log.push('ingredients failed: ' + rid + ': ' + e)
      ctx.fails++
    }

    try {
      out = ctx.regAccess ? holder.value().getResultItem(ctx.regAccess) : null
      if (out && !out.isEmpty()) {
        row.out = {
          item: String(ctx.Registries.ITEM.getKey(out.getItem())),
          count: out.getCount()
        }
      }
    } catch (e) {
      ctx.log.push('result failed: ' + rid + ': ' + e)
    }

    ctx.rows.push(row)
  }

  function dumpType(tt, rm, ctx) {
    var holders = null
    try {
      holders = rm.getAllRecipesFor(tt.t)
    } catch (e) {
      ctx.log.push('getAllRecipesFor(' + tt.name + ') failed: ' + e)
      return
    }
    if (!holders) return
    ctx.typeCount[tt.name] = holders.size()
    holders.forEach(function (holder) {
      scanRecipe(holder, tt.name, ctx)
    })
  }

  function walkTags(Registries, log) {
    var tagMap = {}
    var tagOk = 0
    var it = Registries.ITEM.iterator()
    var item = null
    var id = null
    var holder = null
    var tags = null
    while (it.hasNext()) {
      item = it.next()
      try {
        id = String(Registries.ITEM.getKey(item))
        holder = item.builtInRegistryHolder()
      } catch (e) { continue }
      try {
        tags = holder.tags()
        tags.forEach(function (tk) {
          var t = null
          try { t = String(tk.location()) } catch (e1) { try { t = String(tk) } catch (e2) { return } }
          if (!tagMap[t]) tagMap[t] = []
          tagMap[t].push(id)
          tagOk++
        })
      } catch (e) { /* item without tag holder, fine */ }
    }
    log.push('tags: ' + Object.keys(tagMap).sort().length + ' tags, ' + tagOk + ' memberships')
    return { tagMap: tagMap, tagOk: tagOk }
  }

  function walkBlockLoot(Registries, log) {
    var blockLoot = {}
    var blFails = 0
    var bit = null
    var block = null
    var key = null
    var loc = null
    try {
      bit = Registries.BLOCK.iterator()
      while (bit.hasNext()) {
        block = bit.next()
        try {
          key = block.getLootTable()
          if (key) {
            loc = null
            try { loc = String(key.location()) } catch (e1) { loc = String(key).replace(/^.* \/ /, '') }
            blockLoot[String(Registries.BLOCK.getKey(block))] = loc
          }
        } catch (e) { blFails++ }
      }
    } catch (e) {
      log.push('block walk failed: ' + e)
    }
    log.push('blockloot: ' + Object.keys(blockLoot).sort().length + ' mapped (' + blFails + ' skipped)')
    return blockLoot
  }

  ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands

    event.register(
      Commands.literal('mintdump')
        .requires(function (src) { return src.hasPermission(2) })
        .executes(function (ctx) {
          var server = ctx.source.server
          var log = []
          var T0 = Date.now()

          // --- probe: registries ------------------------------------------------
          var Registries = null
          try {
            Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
            log.push('BuiltInRegistries OK (' + Registries.ITEM.size() + ' items, ' + Registries.BLOCK.size() + ' blocks)')
          } catch (e) {
            log.push('FATAL: BuiltInRegistries failed: ' + e)
            writeText('MINT-LOG.txt', log.join('\n'))
            ctx.source.sendFailure(Text.of('[mintdump] registry probe failed — see kubejs/export/mint/MINT-LOG.txt'))
            return 0
          }

          // --- probe: registryAccess + recipe manager ---------------------------
          var regAccess = probeByNames(server, ['registryAccess', 'registryAccess()'], 'registryAccess', log)
          var rm = probeByNames(server, ['recipeManager', 'getRecipeManager()'], 'recipeManager', log)
          if (!rm) {
            log.push('FATAL: no recipeManager path worked — paste MINT-LOG.txt back to Zee')
            writeText('MINT-LOG.txt', log.join('\n'))
            ctx.source.sendFailure(Text.of('[mintdump] recipe manager probe failed — send kubejs/export/mint/MINT-LOG.txt to Zee'))
            return 0
          }

          // --- probe: recipe type registry ----------------------------------------
          var types = []
          collectTypes(Registries, log, types)

          // --- walk recipes -------------------------------------------------------
          var rows = []
          var typeCount = {}
          var ctxData = { rows: rows, typeCount: typeCount, log: log, fails: 0, regAccess: regAccess, Registries: Registries }

          types.forEach(function (tt) {
            dumpType(tt, rm, ctxData)
          })

          rows.sort(function (a, b) { return (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) })
          JsonIO.write(DIR + 'recipes.json', {
            generated: new Date().toISOString(),
            graphKind: 'runtime-post-kubejs',
            recipeTypes: typeCount,
            recipes: rows.length,
            failures: ctxData.fails,
            rows: rows
          })
          log.push('recipes: ' + rows.length + ' rows (' + ctxData.fails + ' partial), types: ' + Object.keys(typeCount).length)
          console.info('[' + TAG + '] recipes.json: ' + rows.length + ' rows')

          // --- walk tags ------------------------------------------------------------
          var tagData = walkTags(Registries, log)
          var tagIds = Object.keys(tagData.tagMap).sort()
          JsonIO.write(DIR + 'tags.json', {
            generated: new Date().toISOString(),
            graphKind: 'runtime-post-kubejs',
            tags: tagIds.length,
            memberships: tagData.tagOk,
            map: tagData.tagMap
          })
          console.info('[' + TAG + '] tags.json: ' + tagIds.length + ' tags')

          // --- block -> loot table edges ---------------------------------------------
          var blockLoot = walkBlockLoot(Registries, log)
          var blIds = Object.keys(blockLoot).sort()
          JsonIO.write(DIR + 'blockloot.json', {
            generated: new Date().toISOString(),
            graphKind: 'runtime-post-kubejs',
            blocks: blIds.length,
            map: blockLoot
          })
          console.info('[' + TAG + '] blockloot.json: ' + blIds.length + ' edges')

          log.push('done in ' + (Date.now() - T0) + 'ms')
          writeText('MINT-LOG.txt', log.join('\n'))
          ctx.source.sendSuccess(function () {
            return Text.of('[mintdump] ' + rows.length + ' recipes, ' + tagIds.length + ' tags, ' + blIds.length + ' block-loot edges -> kubejs/export/mint/ (see MINT-LOG.txt)')
          }, true)
          return 1
        })
    )
  })
})()
