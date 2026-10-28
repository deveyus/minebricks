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
  function buildTagIndex(blockReg, log) {
    var tagsOf = {}
    var tagEntries = 0
    var it = null
    var ent = null
    var tagId = ''
    var holders = null
    var hit = null
    var id = ''
    try {
      it = blockReg.getTags().iterator()
      while (it.hasNext()) {
        ent = it.next()
        tagEntries++
        tagId = ent.getKey().location().toString()
        holders = ent.getValue()
        hit = holders.iterator()
        while (hit.hasNext()) {
          id = blockReg.getKey(hit.next().value()).toString()
          if (!tagsOf[id]) tagsOf[id] = []
          tagsOf[id].push(tagId)
        }
      }
      log.push('tag index built: ' + tagEntries + ' block tags scanned')
    } catch (e) {
      log.push('WARN: tag index build failed (' + e + ') — rows will carry empty tag lists')
    }
    return tagsOf
  }

  // --- item reverse index: crop block -> seed-ish items -------------------
  function buildItemIndex(itemReg, blockReg, BlockItem, log) {
    var itemsOfBlock = {}
    var it = null
    var item = null
    var bid = null
    var key = ''
    try {
      it = itemReg.iterator()
      while (it.hasNext()) {
        item = it.next()
        if (BlockItem.isInstance(item)) {
          bid = blockReg.getKey(item.getBlock())
          if (bid) {
            key = bid.toString()
            if (!itemsOfBlock[key]) itemsOfBlock[key] = []
            itemsOfBlock[key].push(itemReg.getKey(item).toString())
          }
        }
      }
      log.push('item reverse index built (BlockItem -> block)')
    } catch (e) {
      log.push('WARN: item index failed (' + e + ') — seeds will be empty')
    }
    return itemsOfBlock
  }

  // one block -> row, or null to skip. counters ride ctx.
  function scanBlock(b, ctx) {
    var id = ctx.blockReg.getKey(b).toString()
    var cls = ''
    var simple = ''
    var isStrict = false
    var ageProp = null
    var props = null
    var pit = null
    var p = null
    var isExtended = false
    var isSpecial = false
    var ns = ''
    var seed = null
    var items = null
    var ageRange = null
    var tags = null
    var seasonTags = null
    try {
      cls = b.getClass().getName()
      simple = cls.substring(cls.lastIndexOf('.') + 1)
      isStrict = ctx.CropBlock.isInstance(b)
      ageProp = null
      props = b.getStateDefinition().getProperties()
      pit = props.iterator()
      while (pit.hasNext()) {
        p = pit.next()
        try {
          if (String(p.getName()) === 'age' && ctx.IntegerProperty.isInstance(p)) ageProp = p
        } catch (pe) {}
      }
      isExtended = !isStrict && ageProp && !id.includes('fire') && !id.includes('torch')
      isSpecial = !isStrict && !isExtended && (simple.includes('Crop') || simple.includes('Plant') || simple.includes('Bush') || simple.includes('Vine'))
      if (!isStrict && !isExtended && !isSpecial) return null

      if (isStrict) ctx.strict++
      else if (isExtended) ctx.extended++
      else ctx.special++

      ns = id.split(':')[0]
      ctx.nsCount[ns] = (ctx.nsCount[ns] || 0) + 1

      seed = null
      if (isStrict) {
        try { seed = ctx.itemReg.getKey(b.getBaseSeedId().getItem()).toString() } catch (se) {}
      }
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
        cls: simple,
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

          // --- probe: classes ----------------------------------------------------
          var CropBlock = null
          var IntegerProperty = null
          var BlockItem = null
          try {
            CropBlock = Java.loadClass('net.minecraft.world.level.block.CropBlock')
            IntegerProperty = Java.loadClass('net.minecraft.world.level.block.state.properties.IntegerProperty')
            BlockItem = Java.loadClass('net.minecraft.world.item.BlockItem')
            log.push('class probes OK (CropBlock / IntegerProperty / BlockItem)')
          } catch (e) {
            log.push('FATAL: class probe failed: ' + e)
            writeText('CROP-LOG.txt', log.join('\n'))
            say('[cropscan] class probe failed — see CROP-LOG.txt')
            return 0
          }

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
          var itemsOfBlock = buildItemIndex(itemReg, blockReg, BlockItem, log)

          // --- walk blocks ----------------------------------------------------------
          var rows = []
          var nsCount = {}
          var ctxData = { blockReg: blockReg, itemReg: itemReg, CropBlock: CropBlock,
                          IntegerProperty: IntegerProperty, tagsOf: tagsOf, itemsOfBlock: itemsOfBlock,
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
