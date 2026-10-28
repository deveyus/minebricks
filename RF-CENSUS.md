# RF-CENSUS — FE producers / consumers / storage, jar-derived (staged, not shipped)

Generated 2026-10-28 by scripts/rf_census.py against sha512-verified jars
(pulled from the pack's own CDN pins). Method: merged all en_us.json lang
files per jar (NC neohaul carries a stub emi lang that must not shadow the
real one) + recipe-JSON energy-field scans. Role regexes are triage-grade —
names below were hand-filtered; capacity NUMBERS are NOT extracted yet
(they live in code/configs — one jar-config pass away if wanted).

## THE SHAPE (her question 2026-10-28: "a lot of producers, modest consumers,
## VERY modest storage, yes?")

**Verdict: confirmed, with one sharp finding — a large share of the producer
fleet is passive/infinite-class, which collides with the standing no-infinity
doctrine (NEXT-UP core design goal). That list is ready for the audit.**

## PRODUCERS — ~10 fuel-burn families + a passive problem list

Fuel-burn / gated (doctrine-clean):
- NuclearCraft Neohaul: Solid Fuel Fission Controller, Molten Salt Fission
  Controller, Turbine Controller (steam->FE), Decay Generator (semi-passive:
  decays blocks placed against it — flagged below), Fusion: NOT present in
  0.9.13 (no fusion controller in the lang).
- Immersive Engineering: Diesel Generator (fuel), Kinetic Dynamo (rotation->FE),
  Thermoelectric Generator (passive heat differential — flagged).
- Immersive Petroleum: Portable Generator (fuel, portable).
- Railcraft Reborn: Steam Turbine (housing+rotor, steam->FE).

PASSIVE / INFINITE-CLASS — doctrine collision list for the audit:
- NC Solar Panels: Basic / Advanced / Elite / DU (4 tiers).
- NC Cobblestone Generators: 3 tiers (cobble mint vector, not just energy).
- NC Decay Generator (radiation decay chain = slow passive).
- IE Windmill blades (8 color tiers = passive rotation -> Kinetic Dynamo).
- IE Thermoelectric Generator (passive).
- AR3 Solar Panel.
Count: ~16 passive producer blocks/items across 3 mods, all ALREADY INSTALLED.

## CONSUMERS — bigger than "modest" once endgame opens

- NC Neohaul standard machines (~15+ types): Centrifuge, Electrolyzer
  (+anode/cathode terminals), Assembler, Ingot Former, Alloy Furnace,
  Crystallizer, Decay Hastener, Fluid Infuser / Extractor / Enricher,
  Fission Irradiator (+port), Pressurizer-class, + reactor internals
  (coolant heaters, neutron shields/sources) + Quantum Computer multiblock
  (32 gate blocks — compute-tier consumer).
- IE (~15-20 real): Arc Furnace, Crusher, Metal Press, Assembler, Excavator,
  Core Sample Drill, Industrial Fermenter, Squeezer, Refinery, Blast Furnace
  Preheater, Fluid Pump, Charging Station, External Heater, Sawmill-class.
- Immersive Petroleum: Pumpjack, High-Pressure Refinery Unit.
- AR3 (~8): Launch Stations (3), Rocket/Satellite Assemblers, Drill,
  Astrobody Data Processor, Station Controller, Fueling Station.
- Railcraft: Crusher, Electric Launcher Tracks.
- Productive Metalworks: foundries are FE-hungry (532 recipe-JSON energy
  fields — the heaviest recipe-energy footprint in the pack).
- Future: our MBD2 t1 rigs (currently item/fluid only; energy traits TBD —
  they will add consumer demand when wired).

## STORAGE — the gap is real (very modest, confirmed)

Network-grade battery blocks, all mod-internal, NO dedicated storage mod:
- IE: LV / MV / HV Accumulator (+ Creative Accumulator) — the de-facto
  network batteries.
- NC: Basic / Advanced / Elite / DU Lithium Ion Battery (4 tiers).
- AR3: Battery (1 block).
Portable: IE Accumulator Backpack, RC cart batteries (Nickel-Iron,
Nickel-Zinc, Zinc-Carbon, Zinc-Silver — minecart charging, not network).
False friends filtered out: PM Foundry Capacitors (x16 color re-skins) are
multiblock-INTEGRAL local buffers, not network storage; RC Signal Capacitor
Box is signal circuitry; NC lithium ORE/dust/storage-block items are
materials, not batteries.

Doctrine notes (her IRL-lossy framing, 2026-10-28):
- Local perfect buffers ALREADY exist by design: PM foundry capacitors are
  exactly "perfect local buffers" — lag-friendly, machine-integral.
- Network side is thin AND lossless today. IE wire loss exists as a config
  lever (per-distance loss; numbers = one config pass away). If "network
  buffers need to be lossy and bad" becomes a build item, the levers are:
  IE wire loss config, metering/splitting rules, and whatever the metal
  matrix decides machines should tolerate. Nothing lossy ships today.

## CULL ROUND 1 — ruled by her 2026-10-29, executed in 0.4.17 (see NEXT-UP for full record)

- NC Solar Panels (4 tiers): REMOVED — recipes out + EMI-hidden + config
  solar_power zeroed.
- NC Cobblestone Generators (3 tiers): REMOVED — recipes out + EMI-hidden
  (the cobble mint vector dies with the power question).
- NC Decay Generator: KEPT for its decay function; POWER zeroed at the
  recipe layer (9 overrides, efficiency = 0.0 — jar-verified power term).
- IE Thermoelectric Generator: REMOVED — recipes out + EMI-hidden.
- IE Windmill: KEPT (her call: ballache, little power).
- AR3 Solar Panel: KEPT — satellite-chain hardware; ground-placement FE
  generation (jar-verified in EntitySolarPanel) is a recorded dial for the
  planet-conditions conversation.
- NC RTGs (4 tiers): KEPT — "I'm ok with the various RTGs"; rtg_power
  untouched.
- Open cosmetic: creative-tab entries for the removed 8 remain visible
  (uncraftable + EMI-hidden is the survival truth); tab polish later.

Passive-fleet count after round 1: RTGs x4 + windmill + decay gen (inert
power-wise) + AR3 solar (dial pending). Fuel-burn families unchanged.
