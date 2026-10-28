// minebricks_por_probe.js — DEBUG TOOL, Pollution of the Realms staging probe kit
//
// Staged draft (passive until commanded). Serves the ONE in-game probe session
// for PoR (NEXT-UP 402 block). The probes and how this kit covers them:
//   (1) emitter config path/format  -> covered OFFLINE since 0.4.10: her config
//       tarball + the config manifest already enumerate adpo*/pollut*/endertech*
//       toml verbatim; the old in-game Files.walk died to the class filter.
//   (2) /adpother command tree      -> reflection dump of Commands.class (declared
//       methods + fields incl. the emitAt/emitFrom/clean/chunkStats literals)
//   (3) MBd2 emitter attach         -> live MBD2 KubeJS listeners below log recipe
//       events to kubejs/export/por-probe/POR-MBD-EVENTS.log while the operator
//       toggles emitters on a controller; no listener ever mutates anything
//   (4) KJS direct-write surface    -> reflection dump of Emissions / WorldData /
//       ChunkPollution / AbstractPollution / Emitter / Pollutants / Emitters / Fuels
//   (5) chimney configs             -> covered by the same offline manifest walk
//       (adch|chimney patterns); reflection list includes ISmokeContainer + AdChimneys
//   (6) KJS interface adapters      -> suite tries JavaAdapter on Runnable (gate:
//       does the Rhino fork still generate adapter classes in KubeJS?) then on
//       ISmokeContainer itself (auto-generated no-op handler + best-effort Type)
//
// House rules honored: writes only to kubejs/export/por-probe/, requires
// permission 2, changes nothing in-world, no config file is edited.
//
// NOTE (0.4.12 rewrite — the fork's scope rules, harness-proven on our own
// rhino jar): declarations ONLY at function-body top; loops/try blocks only
// assign (the old `const label` inside the init for-loop threw "redeclaration
// of var label" at load — her 0.4.11 POR-MBD-EVENTS.log). IIFE-wrapped per
// 0.4.8 rule. No java.nio.file.Files — the KubeJS class filter blocks JDK
// classes (proven: her append_error at por_probe#28 old line); the MBD events
// log keeps FULL HISTORY in memory and rewrites the whole file via JsonIO
// (proven working) on every event — overwrite = append semantics. console.info
// mirrors everything into latest.log.
// NOTE (0.4.10 still applies): no array spread `[...x]` anywhere.

;
(function () {
  var DIR = 'kubejs/export/por-probe/'
  var TAG = 'porprobe'

  // ---- in-memory event log: full history, rewritten whole on every append -----
  var mbdEventLines = []

  function logLine(line) {
    console.info('[' + TAG + '] ' + line)
  }

  function porWrite(rel, content) {
    var path = DIR + rel
    try {
      JsonIO.write(path, { content: String(content) })
      logLine('wrote ' + path + ' (' + String(content).length + ' chars)')
    } catch (e) {
      logLine('JsonIO WRITE FAILED for ' + path + ': ' + e)
    }
  }

  function porAppendEvent(line) {
    mbdEventLines.push(line)
    porWrite('POR-MBD-EVENTS.log', '--- probe kit loaded ---\n' + mbdEventLines.join('\n'))
  }

  // ---- reflection: declared methods + fields of a loaded class -> JSON rows ----
  function porReflect(cls) {
    var rows = []
    var Mod = null
    var ms = null
    var m = null
    var ps = null
    var params = null
    var fs = null
    var f = null
    try { Mod = Java.loadClass('java.lang.reflect.Modifier') } catch (e) {}
    try {
      ms = cls.getDeclaredMethods()
      for (var i = 0; i < ms.length; i++) {
        m = ms[i]
        ps = m.getParameterTypes()
        params = []
        for (var k2 = 0; k2 < ps.length; k2++) params.push(String(ps[k2].getSimpleName()))
        rows.push({
          kind: 'm',
          name: String(m.getName()),
          sig: '(' + params.join(',') + ') -> ' + String(m.getReturnType().getSimpleName()),
          st: Mod ? Mod.isStatic(m.getModifiers()) : null
        })
      }
    } catch (e) { rows.push({ kind: 'm', error: String(e) }) }
    try {
      fs = cls.getDeclaredFields()
      for (var i2 = 0; i2 < fs.length; i2++) {
        f = fs[i2]
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

  // ---- suite 1: config walk (retired in-game; covered offline) -----------------
  function porSuiteConfig(log) {
    log.push('config walk: RETIRED in-game (class filter blocks java.nio.file) — '
      + 'ground truth comes from the 0.4.10 config tarball + manifest: '
      + 'adpo*/pollut*/endertech* tomls were enumerated and hashed there (see '
      + 'au-config-rulings + au-instance-config-manifest). No in-game read needed.')
  }

  // ---- suite 2: class reflection dump --------------------------------------------
  var POR_CLASSES = [
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
    'com.endertech.minecraft.mods.adpother.init.Fuels',
    'com.endertech.minecraft.forge.blocks.ISmokeContainer',
    'com.endertech.minecraft.mods.adchimneys.init.Emitters',
    'com.endertech.minecraft.mods.adchimneys.smoke.Emitter'
  ]

  function porSuiteClasses(log, clsDump) {
    var modListOk = null
    var ModList = null
    var feLoaded = false
    var name = ''
    var cls = null
    try {
      ModList = Java.loadClass('net.neoforged.fml.ModList')
      modListOk = ModList.get().isLoaded('adpother')
      feLoaded = ModList.get().isLoaded('forgeendertech')
      log.push('ModList: adpother=' + modListOk + ' forgeendertech=' + feLoaded)
    } catch (e) {
      log.push('ModList probe failed: ' + e)
    }
    for (var i = 0; i < POR_CLASSES.length; i++) {
      name = POR_CLASSES[i]
      try {
        cls = Java.loadClass(name)
        clsDump[name] = porReflect(cls)
        log.push('CLASS OK: ' + name + ' (' + clsDump[name].length + ' members)')
      } catch (e) {
        clsDump[name] = { error: String(e) }
        log.push('CLASS MISS: ' + name + ' (' + String(e).split('\n')[0] + ')')
      }
    }
  }

  // ---- suite 3: MBD2 live listeners (registered at script load, log-only) ---------
  var POR_MBD_EVENTS = [
    'MACHINE_ON_RECIPE_FINISH',
    'BEFORE_RECIPE_WORKING',
    'AFTER_RECIPE_WORKING',
    'RECIPE_STATUS_CHANGED',
    'MACHINE_ON_CONSUME_INPUTS_AFTER_WORKING',
    'STRUCTURE_FORMED'
  ]
  var POR_MBD_GETTERS = [
    'getPos', 'getBlockPos', 'getMachinePos', 'getRecipe', 'getRecipeId', 'getId',
    'getController', 'getDefinition', 'getMachine', 'getLevel', 'getServer'
  ]

  function registerMbdListener(label) {
    try {
      MBDServerEvents[label](function (event) {
        var out = null
        var getter = ''
        var v = null
        try {
          out = ['[' + label + '] t=' + Date.now()]
          try { out.push('class=' + String(event.class.name)) } catch (e) { out.push('class=<err>') }
          for (var g = 0; g < POR_MBD_GETTERS.length; g++) {
            getter = POR_MBD_GETTERS[g]
            try {
              v = event[getter]()
              if (v != null) out.push(getter + '=' + porDescribe(v))
            } catch (e2) {}
          }
          porAppendEvent(out.join('\n  '))
        } catch (e3) {}
      })
      porAppendEvent('[init] listener registered: ' + label)
      return true
    } catch (e) {
      porAppendEvent('[init] listener FAILED: ' + label + ' -> ' + String(e).split('\n')[0])
      return false
    }
  }

  var mbdReachable = false
  porAppendEvent('--- probe kit loaded ' + Date.now() + ' ---')
  try {
    if (typeof MBDServerEvents !== 'undefined') {
      mbdReachable = true
      POR_MBD_EVENTS.forEach(function (label) {
        registerMbdListener(label)
      })
    } else {
      porAppendEvent('[init] MBDServerEvents group not reachable: binding is undefined')
    }
  } catch (e) {
    porAppendEvent('[init] MBDServerEvents group not reachable: ' + String(e).split('\n')[0])
  }

  // ---- suite 4: KJS interface-adapter viability -----------------------------------
  // Question: can a KubeJS script implement a Java interface (JavaAdapter) at all?
  // Gate 1 = Runnable (pure mechanism). Gate 2 = ISmokeContainer (the real contract).
  function porSuiteAdapter(log) {
    var adapterWorks = false
    var Runnable = null
    var r = null
    var ISC = null
    var TypeCls = null
    var typeVal = null
    var ec = null
    var fs = null
    var handler = null
    var ms = null
    var name = ''
    var isc = null
    try {
      Runnable = Java.loadClass('java.lang.Runnable')
      r = new JavaAdapter(Runnable, { run: function () {} })
      adapterWorks = true
      log.push('ADAPTER Runnable OK: ' + porDescribe(r))
    } catch (e) {
      log.push('ADAPTER Runnable FAILED (fork blocks adapter generation): ' + String(e).split('\n')[0])
      return
    }
    try {
      ISC = Java.loadClass('com.endertech.minecraft.forge.blocks.ISmokeContainer')
      try { TypeCls = Java.loadClass('com.endertech.minecraft.forge.blocks.ISmokeContainer$Type') } catch (e) {}
      if (TypeCls) {
        try {
          ec = TypeCls.getEnumConstants()
          if (ec != null && ec.length > 0) typeVal = ec[0]
        } catch (e2) {}
        if (typeVal == null) {
          try {
            fs = TypeCls.getDeclaredFields()
            for (var i = 0; i < fs.length && typeVal == null; i++) {
              try { typeVal = fs[i].get(null) } catch (e3) {} // static-only probe: instance fields throw, we skip
            }
          } catch (e4) {}
        }
      }
      handler = {}
      ms = ISC.getMethods()
      for (var k = 0; k < ms.length; k++) {
        name = String(ms[k].getName())
        if (name === 'getType' && typeVal != null) {
          handler.getType = function () { return typeVal }
        } else if (/^(is|has|can)/.test(name)) {
          handler[name] = function () { return false }
        } else {
          handler[name] = function () { return null }
        }
      }
      isc = new JavaAdapter(ISC, handler)
      log.push('ADAPTER ISmokeContainer OK: ' + porDescribe(isc))
      log.push('  type resolved: ' + (typeVal != null ? String(typeVal) : 'null (Type not enum/static-visible)'))
      try { log.push('  roundtrip: getType()=' + String(isc.getType()) + ' isVent()=' + String(isc.isVent())) } catch (e5) { log.push('  roundtrip FAILED: ' + String(e5).split('\n')[0]) }
    } catch (e) {
      log.push('ADAPTER ISmokeContainer FAILED: ' + String(e).split('\n')[0])
    }
  }

  // ---- /porprobe -------------------------------------------------------------------
  ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands

    event.register(
      Commands.literal('porprobe')
        .requires(function (src) { return src.hasPermission(2) })
        .executes(function (ctx) {
          var say = function (s) { try { ctx.source.sendSuccess(function () { return Text.of(s) }, false) } catch (e) {} }
          var log = []
          var clsDump = {}
          var cfgDump = {} // kept for output shape stability; suite 1 is offline now
          var T0 = Date.now()
          log.push('PoR probe kit run @ ' + T0)

          porSuiteConfig(log)
          porSuiteClasses(log, clsDump)
          porSuiteAdapter(log)

          // suite 3 status: counts from MEMORY (no file read needed)
          var ok = 0
          var bad = 0
          mbdEventLines.forEach(function (line) {
            if (line.indexOf('[init] listener registered') === 0) ok++
            if (line.indexOf('[init] listener FAILED') === 0) bad++
          })
          log.push('MBDServerEvents reachable at load: ' + mbdReachable)
          log.push('MBD2 listeners: registered=' + ok + ' failed=' + bad
            + ' (live lines appended while a machine runs a recipe)')

          log.push('elapsed ms: ' + (Date.now() - T0))
          porWrite('POR-LOG.txt', log.join('\n'))
          porWrite('POR-PROBE.json', JSON.stringify({ t: T0, classes: clsDump, config: cfgDump }, null, 1))

          say('[porprobe] done -> kubejs/export/por-probe/ (POR-LOG.txt, POR-PROBE.json)')
          say('[porprobe] live MBD2 events: kubejs/export/por-probe/POR-MBD-EVENTS.log')
          return 1
        })
    )
  })
})()
