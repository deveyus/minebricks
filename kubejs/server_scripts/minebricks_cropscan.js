// minebricks_cropscan.js — DEBUG TOOL, Serene Seasons remap authoring + zero-untagged gate
//
// Ruling (pack lead, 00:39Z): "we've failed if we have untagged crops" — the
// seasons pass ships with ZERO untagged crops. This is the instrument for that.
//
// Phase A (now, pre-SS): walks the block registry and inventories every crop we
//   can detect -> the authoring corpus for the season-assignment datapack.
// Phase B (post-SS, sereneseasons installed): same walk + tag audit — any crop
//   missing from ALL sereneseasons:* crop tags lands on the UNTAGGED failure
//   list. Gate: empty list before v0.5.0 ships.
//
// Detection tiers (honest about limits):
//   strict   — instanceof net.minecraft.world.level.block.CropBlock (vanilla
//              wheat/carrots/potatoes/beetroot, FD/CD/Let's Do standard crops)
//   extended — has an integer "age" property but is not CropBlock (nether wart,
//              cave vines/glow berries, custom growth blocks; also catches some
//              non-crops -> triage list, not the gate)
//   special  — class name hints (contains Crop/Plant/Bush/Vine) without either
//              signal above (grape vines etc.) -> triage list
//
// What it does: /cropscan writes
//   kubejs/export/cropscan/CROP-SCAN.json  (full rows, per-namespace counts, phase)
//   kubejs/export/cropscan/CROP-INDEX.txt  (one line per crop, human-readable)
//   kubejs/export/cropscan/CROP-LOG.txt    (probe notes + the UNTAGGED gate list)
//
// Safe by construction: writes only to kubejs/export/, changes nothing in-world,
// no tags touched, no growth altered. Requires op/permission 2.
//
// NOTE (0.4.12 rewrite — the fork's scope rules, harness-proven on our own
// rhino jar): declarations ONLY at function-body top; loops/try blocks only
// assign (loop-body const = "redeclaration of var X" throw / stale binding /
// OOM). This file also carried the 4th copy of the global `writeText` — the
// cross-file collision that cross-wired the dump scripts' outputs on 0.4.11;
// everything now lives inside this IIFE and writes go through JsonIO only
// (class filter blocks java.nio.file.Files — proven in her 0.4.11 runtime),
// with a console.info mirror into latest.log.
// NOTE (0.4.10 still applies): no array spread `[...x]` anywhere.
// NOTE (0.4.13 — her 0.4.12 run autopsy): the whole introspection layer is
// rewritten because all three Java-class tricks died in her runtime:
//   getClass()            — not exposed on KubeJS-wrapped blocks (9,864 row fails)
//   Cls.isInstance(x)     — class-filter wrapper has no isInstance
//   Map.Entry#getKey()    — KubeJS pairs registry tag entries into (k,v) tuples
// Replacements, chosen for proof over cleverness:
//   strict tier = duck-typed CropBlock: getBaseSeedId() exists only there, and
//     doubles as the seed answer; age property by name; special tier is now an
//     ID-hint scan (crop/plant/bush/berry/vine), not a class-name scan;
//   tag index walks builtInRegistryHolder().tags() — the exact chain that
//     already delivered mint's 1,475 tags on 0.4.12;
//   item index duck-types BlockItem via getBlock().

;
(function () {
  var DIR = 'kubejs/export/cropscan/'
  var TAG = 'cropscan'

  function writeText(rel, content) {
    var path = DIR + rel
    try {
      JsonIO.write(path, { content: String(content) })
      console.info('[' + TAG + '] wrote ' + path + ' (' + String(content).length + ' chars)')
    } catch (e) {
      console.info('[' + TAG + '] JsonIO WRITE FAILED for ' + path + ': ' + e)
    }
  }

  // --- tag reverse index: block id -> [tag ids] ---------------------------
  // holder-side walk (mint-proven on 0.4.12: 1,475 tags, 16,953 memberships);
  // the old registry.getTags() entry pairs were unreadable through KubeJS
  function buildTagIndex(blockReg, log) {
    var tagsOf = {}
    var tagEntries = 0
    var it = blockReg.iterator()
    var block = null
    var id = ''
    var tags = null
    try {
      while (it.hasNext()) {
        block = it.next()
        tags = null
        try {
          id = blockReg.getKey(block).toString()
          tags = block.builtInRegistryHolder().tags()
        } catch (e0) { continue }
        tags.forEach(function (tk) {
          var t = null
          try { t = String(tk.location()) } catch (e1) { try { t = String(tk) } catch (e2) { return } }
          if (!tagsOf[id]) tagsOf[id] = []
          tagsOf[id].push(t)
          tagEntries++
        })
      }
      log.push('tag index built (holder walk): ' + Object.keys(tagsOf).length + ' tagged blocks, ' + tagEntries + ' memberships')
    } catch (e) {
      log.push('WARN: tag index build failed (' + e + ') — rows will carry empty tag lists')
    }
    return tagsOf
  }

  // --- item reverse index: crop block -> seed-ish items -------------------
  function buildItemIndex(itemReg, blockReg, log) {
    var itemsOfBlock = {}
    var it = itemReg.iterator()
    var item = null
    var bid = null
    var key = ''
    var mapped = 0
    try {
      while (it.hasNext()) {
        item = it.next()
        // duck-typed BlockItem: only block items answer getBlock()
        bid = null
        try { bid = blockReg.getKey(item.getBlock()) } catch (e1) { bid = null }
        if (bid) {
          key = bid.toString()
          if (!itemsOfBlock[key]) itemsOfBlock[key] = []
          try { itemsOfBlock[key].push(itemReg.getKey(item).toString()); mapped++ } catch (e2) {}
        }
      }
      log.push('item reverse index built (duck-typed getBlock): ' + mapped + ' block items')
    } catch (e) {
      log.push('WARN: item index failed (' + e + ') — seeds will be empty')
    }
    return itemsOfBlock
  }

  // one block -> row, or null to skip. counters ride ctx.
  function scanBlock(b, ctx) {
    var id = ctx.blockReg.getKey(b).toString()
    var isStrict = false
    var seed = null
    var ageProp = null
    var props = null
    var pit = null
    var p = null
    var isExtended = false
    var isSpecial = false
    var ns = ''
    var items = null
    var ageRange = null
    var tags = null
    var seasonTags = null
    try {
      // strict tier: duck-typed CropBlock — getBaseSeedId() answers only there,
      // and doubles as the seed (class filter killed getClass/isInstance)
      try { seed = ctx.itemReg.getKey(b.getBaseSeedId().getItem()).toString(); isStrict = true } catch (se) {}
      props = b.getStateDefinition().getProperties()
      pit = props.iterator()
      while (pit.hasNext()) {
        p = pit.next()
        try {
          if (String(p.getName()) === 'age') ageProp = p
        } catch (pe) {}
      }
      isExtended = !isStrict && ageProp && !id.includes('fire') && !id.includes('torch')
      isSpecial = !isStrict && !isExtended
        && (id.indexOf('crop') >= 0 || id.indexOf('plant') >= 0 || id.indexOf('bush') >= 0
            || id.indexOf('berry') >= 0 || id.indexOf('vine') >= 0)
      if (!isStrict && !isExtended && !isSpecial) return null

      if (isStrict) ctx.strict++
      else if (isExtended) ctx.extended++
      else ctx.special++

      ns = id.split(':')[0]
      ctx.nsCount[ns] = (ctx.nsCount[ns] || 0) + 1

      // seed was captured by the strict-tier duck type above (no re-wipe here —
      // 0.4.12's `seed = null` placement cost us exactly this once already)
      items = ctx.itemsOfBlock[id] || []

      ageRange = null
      if (ageProp) {
        try { ageRange = String(ageProp.getPossibleValues()) } catch (pe2) {}
      }

      tags = ctx.tagsOf[id] || []
      seasonTags = tags.filter(function (t) { return t.indexOf('sereneseasons:') === 0 })

      return {
        block: id,
        tier: isStrict ? 'strict' : (isExtended ? 'extended' : 'special'),
        age: ageRange,
        base_seed: seed,
        items: items,
        season_tags: seasonTags,
        tags: tags
      }
    } catch (rowErr) {
      ctx.fails++
      if (ctx.fails < 20) ctx.log.push('row fail @ ' + id + ': ' + rowErr)
      return null
    }
  }

  ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands

    event.register(
      Commands.literal('cropscan')
        .requires(function (src) { return src.hasPermission(2) })
        .executes(function (ctx) {
          var server = ctx.source.server
          var log = []
          var T0 = Date.now()
          var say = function (s) { try { ctx.source.sendSuccess(function () { return Text.of(s) }, false) } catch (e) {} }

          // --- probe: block registry -------------------------------------------
          var Registries = null
          var blockReg = null
          var itemReg = null
          try {
            Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
            blockReg = Registries.BLOCK
            itemReg = Registries.ITEM
            log.push('BuiltInRegistries OK (blocks=' + blockReg.size() + ', items=' + itemReg.size() + ')')
          } catch (e) {
            log.push('FATAL: registry probe failed: ' + e)
            writeText('CROP-LOG.txt', log.join('\n'))
            say('[cropscan] registry probe failed — see kubejs/export/cropscan/CROP-LOG.txt')
            return 0
          }

          // (0.4.13: CropBlock/IntegerProperty/BlockItem class probes removed —
          // detection is duck-typed now, see header note)

          // --- probe: sereneseasons presence (phase detection) -------------------
          var ssLoaded = false
          var ModList = null
          try {
            ModList = Java.loadClass('net.neoforged.fml.ModList')
            ssLoaded = ModList.get().isLoaded('sereneseasons')
          } catch (e) {
            log.push('ModList probe failed (' + e + ') — inferring phase from tags instead')
          }
          log.push('sereneseasons loaded: ' + ssLoaded + ' (phase ' + (ssLoaded ? 'B — audit gate' : 'A — authoring corpus') + ')')

          var tagsOf = buildTagIndex(blockReg, log)
          var itemsOfBlock = buildItemIndex(itemReg, blockReg, log)

          // --- walk blocks ----------------------------------------------------------
          var rows = []
          var nsCount = {}
          var ctxData = { blockReg: blockReg, itemReg: itemReg,
                          tagsOf: tagsOf, itemsOfBlock: itemsOfBlock,
                          rows: rows, nsCount: nsCount, log: log,
                          strict: 0, extended: 0, special: 0, fails: 0 }

          var it = blockReg.iterator()
          var row = null
          while (it.hasNext()) {
            row = scanBlock(it.next(), ctxData)
            if (row) rows.push(row)
          }

          // --- the gate ---------------------------------------------------------------
          var gate = rows.filter(function (r) { return r.tier === 'strict' && r.season_tags.length === 0 })
          var triage = rows.filter(function (r) { return r.tier !== 'strict' && r.season_tags.length === 0 })

          // --- write ---------------------------------------------------------------------
          var payload = {
            tool: 'minebricks_cropscan',
            generated_utc: new Date().toISOString(),
            phase: ssLoaded ? 'B-audit' : 'A-authoring',
            sereneseasons_loaded: ssLoaded,
            totals: {
              blocks_seen: blockReg.size(),
              strict: ctxData.strict, extended: ctxData.extended, special: ctxData.special,
              row_fails: ctxData.fails, ns_count: nsCount
            },
            gate: { policy: 'zero untagged (lead ruling 00:39Z)', untagged_strict: gate.length },
            rows: rows
          }
          try {
            JsonIO.write(DIR + 'CROP-SCAN.json', payload)
            log.push('CROP-SCAN.json written via JsonIO')
            console.info('[' + TAG + '] CROP-SCAN.json: ' + rows.length + ' rows')
          } catch (je) {
            log.push('JsonIO full write failed (' + je + ') — falling back to text dump')
            writeText('CROP-SCAN.json.txt', JSON.stringify(payload, null, 1))
          }

          var idx = rows.map(function (r) {
            return r.tier.padEnd(8) + ' ' + r.block + '  seed=' + (r.base_seed || '-') + '  ss=[' + r.season_tags.join(',') + ']'
          }).join('\n')
          writeText('CROP-INDEX.txt', idx)

          log.push('gate: ' + gate.length + ' strict crops with zero sereneseasons tags')
          log.push('triage: ' + triage.length + ' extended/special blocks with zero sereneseasons tags')
          log.push('elapsed ' + (Date.now() - T0) + ' ms')
          writeText('CROP-LOG.txt', log.join('\n'))

          say('[cropscan] phase ' + (ssLoaded ? 'B' : 'A') + ': strict=' + ctxData.strict + ' extended=' + ctxData.extended + ' special=' + ctxData.special + ' — untagged gate: ' + gate.length + '. Files in kubejs/export/cropscan/')
          return 1
        })
    )
  })
})()
