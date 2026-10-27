// minebricks_por_probe.js — DEBUG TOOL, Pollution of the Realms staging probe kit
//
// Staged draft (passive until commanded). Serves the ONE in-game probe session
// for PoR (NEXT-UP 402 block). The four open probes and how this kit covers them:
//   (1) emitter config path/format  -> /porprobe walks config/ and dumps any
//       adpo*/pollut*/endertech* toml verbatim
//   (2) /adpother command tree      -> reflection dump of Commands.class (declared
//       methods + fields incl. the emitAt/emitFrom/clean/chunkStats literals)
//   (3) MBd2 emitter attach         -> live MBD2 KubeJS listeners below log recipe
//       events to POR-MBD-EVENTS.log while the operator toggles emitters on a
//       controller; no listener ever mutates anything
//   (4) KJS direct-write surface    -> reflection dump of Emissions / WorldData /
//       ChunkPollution / AbstractPollution / Emitter / Pollutants / Emitters / Fuels
//
// House rules honored: writes only to kubejs/export/por-probe/, requires
// permission 2, changes nothing in-world, no config file is edited.

const POR_DIR = 'kubejs/export/por-probe/'

function porAppend(rel, line) {
  const path = POR_DIR + rel
  try {
    const Files = Java.loadClass('java.nio.file.Files')
    const Paths = Java.loadClass('java.nio.file.Paths')
    const Opt = Java.loadClass('java.nio.file.StandardOpenOption')
    const p = Paths.get(path)
    if (p.getParent()) Files.createDirectories(p.getParent())
    Files.writeString(p, line + '\n', Opt.CREATE, Opt.APPEND)
  } catch (e) {
    try { JsonIO.write(path, { line: String(line), append_error: String(e) }) } catch (e2) {}
  }
}

function porWrite(rel, content) {
  const path = POR_DIR + rel
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

// reflection: declared methods + fields of a loaded class -> JSON rows
function porReflect(cls) {
  const rows = []
  let Mod = null
  try { Mod = Java.loadClass('java.lang.reflect.Modifier') } catch (e) {}
  try {
    const ms = cls.getDeclaredMethods()
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]
      const ps = m.getParameterTypes()
      const params = []
      for (let k = 0; k < ps.length; k++) params.push(String(ps[k].getSimpleName()))
      rows.push({
        kind: 'm',
        name: String(m.getName()),
        sig: '(' + params.join(',') + ') -> ' + String(m.getReturnType().getSimpleName()),
        st: Mod ? Mod.isStatic(m.getModifiers()) : null
      })
    }
  } catch (e) { rows.push({ kind: 'm', error: String(e) }) }
  try {
    const fs = cls.getDeclaredFields()
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i]
      rows.push({
        kind: 'f',
        name: String(f.getName()),
        type: String(f.getType().getSimpleName()),
        st: Mod ? Mod.isStatic(f.getModifiers()) : null
      })
    }
  } catch (e) { rows.push({ kind: 'f', error: String(e) }) }
  return rows
}

function porDescribe(v) {
  try { if (v && v.class) return String(v.class.name) + ' :: ' + String(v) } catch (e) {}
  try { return String(v) } catch (e2) { return '<unstringable>' }
}

// --- suite 1: config walk ------------------------------------------------------
function porSuiteConfig(log, cfgDump) {
  const Files = Java.loadClass('java.nio.file.Files')
  const Paths = Java.loadClass('java.nio.file.Paths')
  const root = Paths.get('config')
  if (!Files.exists(root)) { log.push('config/ MISSING — PoR has not booted yet?'); return }
  let stream = null
  try {
    stream = Files.walk(root, 2)
    const arr = stream.toArray()
    log.push('config walk: ' + arr.length + ' entries')
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]
      if (Files.isDirectory(p)) continue
      const name = String(p.getFileName())
      const full = String(p.toString())
      if (!/\.toml$|\.json$/i.test(name)) continue
      if (i < 400) log.push('  ' + full)
      if (/adpo|pollut|endertech/i.test(full)) {
        let body = ''
        try { body = String(Files.readString(p)) } catch (e) { body = '<read failed: ' + e + '>' }
        if (body.length > 24000) body = body.slice(0, 24000) + '\n...<truncated>'
        cfgDump[full] = body
        log.push('  DUMPED: ' + full + ' (' + body.length + ' chars)')
      }
    }
  } catch (e) {
    log.push('config walk FAILED: ' + e)
  } finally {
    try { if (stream) stream.close() } catch (e2) {}
  }
}

// --- suite 2: class reflection dump --------------------------------------------
const POR_CLASSES = [
  'com.endertech.minecraft.mods.adpother.Commands',
  'com.endertech.minecraft.mods.adpother.emissions.Emissions',
  'com.endertech.minecraft.mods.adpother.emissions.Emission',
  'com.endertech.minecraft.mods.adpother.emissions.PeriodicTileEmission',
  'com.endertech.minecraft.mods.adpother.pollution.WorldData',
  'com.endertech.minecraft.mods.adpother.pollution.ChunkPollution',
  'com.endertech.minecraft.mods.adpother.pollution.AbstractPollution',
  'com.endertech.minecraft.mods.adpother.pollution.Stats',
  'com.endertech.minecraft.mods.adpother.sources.Emitter',
  'com.endertech.minecraft.mods.adpother.sources.EmitterWithCustomRate',
  'com.endertech.minecraft.mods.adpother.init.Pollutants',
  'com.endertech.minecraft.mods.adpother.init.Emitters',
  'com.endertech.minecraft.mods.adpother.init.Fuels'
]

function porSuiteClasses(log, clsDump) {
  let modListOk = null
  try {
    const ModList = Java.loadClass('net.neoforged.fml.ModList')
    modListOk = ModList.get().isLoaded('adpother')
    const feLoaded = ModList.get().isLoaded('forgeendertech')
    log.push('ModList: adpother=' + modListOk + ' forgeendertech=' + feLoaded)
  } catch (e) {
    log.push('ModList probe failed: ' + e)
  }
  for (let i = 0; i < POR_CLASSES.length; i++) {
    const name = POR_CLASSES[i]
    try {
      const cls = Java.loadClass(name)
      clsDump[name] = porReflect(cls)
      log.push('CLASS OK: ' + name + ' (' + clsDump[name].length + ' members)')
    } catch (e) {
      clsDump[name] = { error: String(e) }
      log.push('CLASS MISS: ' + name + ' (' + String(e).split('\n')[0] + ')')
    }
  }
}

// --- suite 3: MBD2 live listeners (registered at script load, log-only) ---------
const POR_MBD_EVENTS = [
  'MACHINE_ON_RECIPE_FINISH',
  'BEFORE_RECIPE_WORKING',
  'AFTER_RECIPE_WORKING',
  'RECIPE_STATUS_CHANGED',
  'MACHINE_ON_CONSUME_INPUTS_AFTER_WORKING',
  'STRUCTURE_FORMED'
]
const POR_MBD_GETTERS = [
  'getPos', 'getBlockPos', 'getMachinePos', 'getRecipe', 'getRecipeId', 'getId',
  'getController', 'getDefinition', 'getMachine', 'getLevel', 'getServer'
]

porAppend('POR-MBD-EVENTS.log', '--- probe kit loaded ' + Date.now() + ' ---')
try {
  for (let i = 0; i < POR_MBD_EVENTS.length; i++) {
    const label = POR_MBD_EVENTS[i]
    try {
      MBDServerEvents[label]((event) => {
        try {
          const out = ['[' + label + '] t=' + Date.now()]
          try { out.push('class=' + String(event.class.name)) } catch (e) { out.push('class=<err>') }
          for (let g = 0; g < POR_MBD_GETTERS.length; g++) {
            const getter = POR_MBD_GETTERS[g]
            try {
              const v = event[getter]()
              if (v != null) out.push(getter + '=' + porDescribe(v))
            } catch (e) {}
          }
          porAppend('POR-MBD-EVENTS.log', out.join('\n  '))
        } catch (e) {}
      })
      porAppend('POR-MBD-EVENTS.log', '[init] listener registered: ' + label)
    } catch (e) {
      porAppend('POR-MBD-EVENTS.log', '[init] listener FAILED: ' + label + ' -> ' + String(e).split('\n')[0])
    }
  }
} catch (e) {
  porAppend('POR-MBD-EVENTS.log', '[init] MBDServerEvents group not reachable: ' + String(e).split('\n')[0])
}

// --- /porprobe -------------------------------------------------------------------
ServerEvents.commandRegistry((event) => {
  const { commands: Commands } = event

  event.register(
    Commands.literal('porprobe')
      .requires((src) => src.hasPermission(2))
      .executes((ctx) => {
        const say = (s) => { try { ctx.source.sendSuccess(() => Text.of(s), false) } catch (e) {} }
        const log = []
        const cfgDump = {}
        const clsDump = {}
        const T0 = Date.now()
        log.push('PoR probe kit run @ ' + T0)

        porSuiteConfig(log, cfgDump)
        porSuiteClasses(log, clsDump)

        // suite 3 status: did the live listeners land?
        try {
          const Files = Java.loadClass('java.nio.file.Files')
          const Paths = Java.loadClass('java.nio.file.Paths')
          const evLog = Paths.get(POR_DIR + 'POR-MBD-EVENTS.log')
          if (Files.exists(evLog)) {
            const body = String(Files.readString(evLog))
            const ok = (body.match(/\[init\] listener registered/g) || []).length
            const bad = (body.match(/\[init\] listener FAILED/g) || []).length
            log.push('MBD2 listeners: registered=' + ok + ' failed=' + bad + ' (live lines appended while a machine runs a recipe)')
          } else {
            log.push('MBD2 listeners: no log file (script load issue?)')
          }
        } catch (e) {
          log.push('MBD2 listener status check failed: ' + e)
        }

        log.push('elapsed ms: ' + (Date.now() - T0))
        porWrite('POR-LOG.txt', log.join('\n'))
        porWrite('POR-PROBE.json', JSON.stringify({ t: T0, classes: clsDump, config: cfgDump }, null, 1))

        say('[porprobe] done -> kubejs/export/por-probe/ (POR-LOG.txt, POR-PROBE.json)')
        say('[porprobe] live MBD2 events: kubejs/export/por-probe/POR-MBD-EVENTS.log')
        return 1
      })
  )
})
