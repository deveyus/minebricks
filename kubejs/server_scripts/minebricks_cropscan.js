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

ServerEvents.commandRegistry((event) => {
  const { commands: Commands } = event

  event.register(
    Commands.literal('cropscan')
      .requires((src) => src.hasPermission(2))
      .executes((ctx) => {
        const server = ctx.source.server
        const log = []
        const T0 = Date.now()
        const say = (s) => { try { ctx.source.sendSuccess(() => Text.of(s), false) } catch (e) {} }

        // --- probe: block registry -------------------------------------------
        let Registries, blockReg, itemReg
        try {
          Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
          blockReg = Registries.BLOCK
          itemReg = Registries.ITEM
          log.push(`BuiltInRegistries OK (blocks=${blockReg.size()}, items=${itemReg.size()})`)
        } catch (e) {
          log.push(`FATAL: registry probe failed: ${e}`)
          writeText('CROP-LOG.txt', log.join('\n'))
          say('[cropscan] registry probe failed — see kubejs/export/cropscan/CROP-LOG.txt')
          return 0
        }

        // --- probe: classes ----------------------------------------------------
        let CropBlock = null, IntegerProperty = null, BlockItem = null
        try {
          CropBlock = Java.loadClass('net.minecraft.world.level.block.CropBlock')
          IntegerProperty = Java.loadClass('net.minecraft.world.level.block.state.properties.IntegerProperty')
          BlockItem = Java.loadClass('net.minecraft.world.item.BlockItem')
          log.push('class probes OK (CropBlock / IntegerProperty / BlockItem)')
        } catch (e) {
          log.push(`FATAL: class probe failed: ${e}`)
          writeText('CROP-LOG.txt', log.join('\n'))
          say('[cropscan] class probe failed — see CROP-LOG.txt')
          return 0
        }

        // --- probe: sereneseasons presence (phase detection) -------------------
        let ssLoaded = false
        try {
          const ModList = Java.loadClass('net.neoforged.fml.ModList')
          ssLoaded = ModList.get().isLoaded('sereneseasons')
        } catch (e) {
          log.push(`ModList probe failed (${e}) — inferring phase from tags instead`)
        }
        log.push(`sereneseasons loaded: ${ssLoaded} (phase ${ssLoaded ? 'B — audit gate' : 'A — authoring corpus'})`)

        // --- tag reverse index: block id -> [tag ids] ---------------------------
        const tagsOf = {}
        let tagEntries = 0
        try {
          const it = blockReg.getTags().iterator()
          while (it.hasNext()) {
            const ent = it.next()
            tagEntries++
            const tagId = ent.getKey().location().toString()
            const holders = ent.getValue()
            const hit = holders.iterator()
            while (hit.hasNext()) {
              const id = blockReg.getKey(hit.next().value()).toString()
              if (!tagsOf[id]) tagsOf[id] = []
              tagsOf[id].push(tagId)
            }
          }
          log.push(`tag index built: ${tagEntries} block tags scanned`)
        } catch (e) {
          log.push(`WARN: tag index build failed (${e}) — rows will carry empty tag lists`)
        }

        // --- item reverse index: crop block -> seed-ish items -------------------
        const itemsOfBlock = {}
        try {
          const it = itemReg.iterator()
          while (it.hasNext()) {
            const item = it.next()
            if (BlockItem.isInstance(item)) {
              const bid = blockReg.getKey(item.getBlock())
              if (bid) {
                const key = bid.toString()
                if (!itemsOfBlock[key]) itemsOfBlock[key] = []
                itemsOfBlock[key].push(itemReg.getKey(item).toString())
              }
            }
          }
          log.push('item reverse index built (BlockItem -> block)')
        } catch (e) {
          log.push(`WARN: item index failed (${e}) — seeds will be empty`)
        }

        // --- walk blocks ----------------------------------------------------------
        const rows = []
        const nsCount = {}
        let strict = 0, extended = 0, special = 0, fails = 0
        const it = blockReg.iterator()
        while (it.hasNext()) {
          const b = it.next()
          const id = blockReg.getKey(b).toString()
          try {
            const cls = b.getClass().getName()
            const simple = cls.substring(cls.lastIndexOf('.') + 1)
            const isStrict = CropBlock.isInstance(b)
            let ageProp = null
            const props = b.getStateDefinition().getProperties()
            const pit = props.iterator()
            while (pit.hasNext()) {
              const p = pit.next()
              try {
                if (String(p.getName()) === 'age' && IntegerProperty.isInstance(p)) ageProp = p
              } catch (pe) {}
            }
            const isExtended = !isStrict && ageProp && !id.includes('fire') && !id.includes('torch')
            const isSpecial = !isStrict && !isExtended && (simple.includes('Crop') || simple.includes('Plant') || simple.includes('Bush') || simple.includes('Vine'))
            if (!isStrict && !isExtended && !isSpecial) continue

            if (isStrict) strict++
            else if (isExtended) extended++
            else special++

            const ns = id.split(':')[0]
            nsCount[ns] = (nsCount[ns] || 0) + 1

            let seed = null
            if (isStrict) {
              try { seed = itemReg.getKey(b.getBaseSeedId().getItem()).toString() } catch (se) {}
            }
            const items = itemsOfBlock[id] || []

            let ageRange = null
            if (ageProp) {
              try { ageRange = String(ageProp.getPossibleValues()) } catch (pe2) {}
            }

            const tags = tagsOf[id] || []
            const seasonTags = tags.filter((t) => t.indexOf('sereneseasons:') === 0)

            rows.push({
              block: id,
              tier: isStrict ? 'strict' : (isExtended ? 'extended' : 'special'),
              cls: simple,
              age: ageRange,
              base_seed: seed,
              items: items,
              season_tags: seasonTags,
              tags: tags
            })
          } catch (rowErr) {
            fails++
            if (fails < 20) log.push(`row fail @ ${id}: ${rowErr}`)
          }
        }

        // --- the gate ---------------------------------------------------------------
        const gate = rows.filter((r) => r.tier === 'strict' && r.season_tags.length === 0)
        const triage = rows.filter((r) => r.tier !== 'strict' && r.season_tags.length === 0)

        // --- write ---------------------------------------------------------------------
        const payload = {
          tool: 'minebricks_cropscan',
          generated_utc: new Date().toISOString(),
          phase: ssLoaded ? 'B-audit' : 'A-authoring',
          sereneseasons_loaded: ssLoaded,
          totals: {
            blocks_seen: blockReg.size(),
            strict: strict, extended: extended, special: special,
            row_fails: fails, ns_count: nsCount
          },
          gate: { policy: 'zero untagged (lead ruling 00:39Z)', untagged_strict: gate.length },
          rows: rows
        }
        try {
          JsonIO.write('kubejs/export/cropscan/CROP-SCAN.json', payload)
          log.push('CROP-SCAN.json written via JsonIO')
        } catch (je) {
          log.push(`JsonIO full write failed (${je}) — falling back to text dump`)
          writeText('CROP-SCAN.json.txt', JSON.stringify(payload, (k, v) => v, 1))
        }

        const idx = rows.map((r) =>
          `${r.tier.padEnd(8)} ${r.block}  seed=${r.base_seed || '-'}  ss=[${r.season_tags.join(',')}]`
        ).join('\n')
        writeText('CROP-INDEX.txt', idx)

        log.push(`gate: ${gate.length} strict crops with zero sereneseasons tags`)
        log.push(`triage: ${triage.length} extended/special blocks with zero sereneseasons tags`)
        log.push(`elapsed ${Date.now() - T0} ms`)
        writeText('CROP-LOG.txt', log.join('\n'))

        say(`[cropscan] phase ${ssLoaded ? 'B' : 'A'}: strict=${strict} extended=${extended} special=${special} — untagged gate: ${gate.length}. Files in kubejs/export/cropscan/`)
        return 1
      })
  )
})

function writeText(rel, content) {
  const path = 'kubejs/export/cropscan/' + rel
  try {
    const Files = Java.loadClass('java.nio.file.Files')
    const Paths = Java.loadClass('java.nio.file.Paths')
    const p = Paths.get(path)
    if (p.getParent()) Files.createDirectories(p.getParent())
    Files.writeString(p, String(content))
  } catch (e) {
    try { JsonIO.write(path, { content: String(content), write_error: String(e) }) } catch (e2) {}
  }
}
