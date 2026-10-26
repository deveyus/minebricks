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

ServerEvents.commandRegistry((event) => {
  const { commands: Commands } = event

  event.register(
    Commands.literal('mintdump')
      .requires((src) => src.hasPermission(2))
      .executes((ctx) => {
        const server = ctx.source.server
        const log = []
        const T0 = Date.now()

        // --- probe: registries ------------------------------------------------
        let Registries = null
        try {
          Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
          log.push(`BuiltInRegistries OK (${Registries.ITEM.size()} items, ${Registries.BLOCK.size()} blocks)`)
        } catch (e) {
          log.push(`FATAL: BuiltInRegistries failed: ${e}`)
          writeText('MINT-LOG.txt', log.join('\n'))
          ctx.source.sendFailure(Text.of('[mintdump] registry probe failed — see kubejs/export/mint/MINT-LOG.txt'))
          return 0
        }

        let regAccess = null
        for (const m of ['registryAccess', 'registryAccess()']) {
          try {
            regAccess = m.endsWith('()') ? server[m.slice(0, -2)]() : server[m]
            if (regAccess) { log.push(`registryAccess via server.${m} OK`); break }
          } catch (e) {
            log.push(`server.${m} failed: ${e}`)
          }
        }

        // --- probe: recipe manager ---------------------------------------------
        let rm = null
        for (const m of ['recipeManager', 'getRecipeManager()']) {
          try {
            rm = m.endsWith('()') ? server[m.slice(0, -2)]() : server[m]
            if (rm) { log.push(`recipeManager via server.${m} OK`); break }
          } catch (e) {
            log.push(`server.${m} failed: ${e}`)
          }
        }
        if (!rm) {
          log.push('FATAL: no recipeManager path worked — paste MINT-LOG.txt back to Zee')
          writeText('MINT-LOG.txt', log.join('\n'))
          ctx.source.sendFailure(Text.of('[mintdump] recipe manager probe failed — send kubejs/export/mint/MINT-LOG.txt to Zee'))
          return 0
        }

        // --- probe: recipe type registry ----------------------------------------
        let typeReg = null
        let types = []
        try {
          typeReg = Registries.RECIPE_TYPE
          const it = typeReg.iterator()
          while (it.hasNext()) {
            const t = it.next()
            try { types.push({ t: t, name: String(typeReg.getKey(t)) }) } catch (e) { log.push(`type key failed: ${e}`) }
          }
          log.push(`RECIPE_TYPE registry OK (${types.length} types)`)
        } catch (e) {
          log.push(`RECIPE_TYPE registry failed (${e}) — falling back to vanilla type constants`)
        }
        if (!types.length) {
          const RT = Java.loadClass('net.minecraft.world.item.crafting.RecipeType')
          const named = [
            ['CRAFTING', 'minecraft:crafting'], ['SMELTING', 'minecraft:smelting'],
            ['BLASTING', 'minecraft:blasting'], ['SMOKING', 'minecraft:smoking'],
            ['CAMPFIRE_COOKING', 'minecraft:campfire_cooking'], ['STONECUTTING', 'minecraft:stonecutting'],
            ['SMITHING', 'minecraft:smithing']
          ]
          for (const [f, n] of named) {
            try { types.push({ t: RT[f], name: n }) } catch (e) { log.push(`constant ${f} failed: ${e}`) }
          }
          log.push(`vanilla fallback types: ${types.length}`)
        }

        // --- walk recipes -------------------------------------------------------
        const rows = []
        const typeCount = {}
        let fails = 0

        for (const tt of types) {
          let holders = null
          try {
            holders = rm.getAllRecipesFor(tt.t)
          } catch (e) {
            log.push(`getAllRecipesFor(${tt.name}) failed: ${e}`)
            continue
          }
          if (!holders) continue
          typeCount[tt.name] = holders.size()

          holders.forEach((holder) => {
            let rid = 'unknown'
            try {
              const rk = holder.id()
              try { rid = String(rk.location()) } catch (e1) { rid = String(rk).replace(/^.* \/ /, '') }
            } catch (e) { log.push(`id failed in ${tt.name}: ${e}`) }

            const row = { id: rid, type: tt.name, slots: [], out: null }
            try {
              const ing = holder.value().getIngredients()
              if (ing) {
                for (let i = 0; i < ing.size(); i++) {
                  const slot = []
                  try {
                    const stacks = ing.get(i).getItems()
                    if (stacks) {
                      for (let j = 0; j < stacks.length; j++) {
                        const st = stacks[j]
                        try {
                          const iid = String(Registries.ITEM.getKey(st.getItem()))
                          slot.push({ item: iid, count: st.getCount() })
                        } catch (e2) { slot.push({ error: String(e2) }) }
                      }
                    }
                  } catch (e3) { slot.push({ error: String(e3) }) }
                  row.slots.push(slot)
                }
              }
            } catch (e) {
              log.push(`ingredients failed: ${rid}: ${e}`)
              fails++
            }

            try {
              const out = regAccess ? holder.value().getResultItem(regAccess) : null
              if (out && !out.isEmpty()) {
                row.out = {
                  item: String(Registries.ITEM.getKey(out.getItem())),
                  count: out.getCount()
                }
              }
            } catch (e) {
              log.push(`result failed: ${rid}: ${e}`)
            }

            rows.push(row)
          })
        }

        rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        JsonIO.write('kubejs/export/mint/recipes.json', {
          generated: new Date().toISOString(),
          graphKind: 'runtime-post-kubejs',
          recipeTypes: typeCount,
          recipes: rows.length,
          failures: fails,
          rows: rows
        })
        log.push(`recipes: ${rows.length} rows (${fails} partial), types: ${Object.keys(typeCount).length}`)

        // --- walk tags ------------------------------------------------------------
        const tagMap = {}
        let tagOk = 0
        const it = Registries.ITEM.iterator()
        while (it.hasNext()) {
          const item = it.next()
          let id = null
          let holder = null
          try {
            id = String(Registries.ITEM.getKey(item))
            holder = item.builtInRegistryHolder()
          } catch (e) { continue }
          try {
            const tags = holder.tags()
            tags.forEach((tk) => {
              let t = null
              try { t = String(tk.location()) } catch (e1) { try { t = String(tk) } catch (e2) { return } }
              if (!tagMap[t]) tagMap[t] = []
              tagMap[t].push(id)
              tagOk++
            })
          } catch (e) { /* item without tag holder, fine */ }
        }
        const tagIds = Object.keys(tagMap).sort()
        JsonIO.write('kubejs/export/mint/tags.json', {
          generated: new Date().toISOString(),
          graphKind: 'runtime-post-kubejs',
          tags: tagIds.length,
          memberships: tagOk,
          map: tagMap
        })
        log.push(`tags: ${tagIds.length} tags, ${tagOk} memberships`)

        // --- block -> loot table edges ---------------------------------------------
        const blockLoot = {}
        let blFails = 0
        try {
          const bit = Registries.BLOCK.iterator()
          while (bit.hasNext()) {
            const block = bit.next()
            try {
              const key = block.getLootTable()
              if (key) {
                let loc = null
                try { loc = String(key.location()) } catch (e1) { loc = String(key).replace(/^.* \/ /, '') }
                blockLoot[String(Registries.BLOCK.getKey(block))] = loc
              }
            } catch (e) { blFails++ }
          }
        } catch (e) {
          log.push(`block walk failed: ${e}`)
        }
        const blIds = Object.keys(blockLoot).sort()
        JsonIO.write('kubejs/export/mint/blockloot.json', {
          generated: new Date().toISOString(),
          graphKind: 'runtime-post-kubejs',
          blocks: blIds.length,
          map: blockLoot
        })
        log.push(`blockloot: ${blIds.length} mapped (${blFails} skipped)`)

        log.push(`done in ${Date.now() - T0}ms`)
        writeText('MINT-LOG.txt', log.join('\n'))
        ctx.source.sendSuccess(() => Text.of(`[mintdump] ${rows.length} recipes, ${tagIds.length} tags, ${blIds.length} block-loot edges -> kubejs/export/mint/ (see MINT-LOG.txt)`), true)
        return 1
      })
  )
})

function writeText(rel, content) {
  const path = 'kubejs/export/mint/' + rel
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
