// ============================================================================
// MINEBRICKS — AR3 SUPPLY PASS (DRAFT v0.1 — staged 2026-10-26, NOT shipped)
// ============================================================================
// Advanced Rocketry 3 (3.0.beta) ships an EMPTY recipe directory — verified
// (data/adv_rocketry/recipe/ exists, zero files). Every machine and chip below
// is uncraftable until this pass runs. All item IDs taken live from the jar's
// lang file (assets/adv_rocketry/lang/en_us.json) — no guessed IDs.
//
// STATUS: DRAFT. Nothing here is decided. Every cost is a DIAL for the pack
// lead. Bless/edit the DIALS block, then this file ships as-is.
//
// PROBE P4 (in-game): confirm whether the Satellite ITEM is assembler output
// (built from ID chip + payload inside the Satellite Assembler GUI) or needs
// its own crafting recipe. If assembler output, delete the satellite recipe
// block below and the assembler consumes chips instead.
// ============================================================================

// ----------------------------------------------------------------------------
// DIALS — pack lead's taste calls. Suggested defaults are vanilla-only so
// nothing gates on a lane that isn't built yet (Metalworks steel can swap in
// later as an upgrade pass — that's dial D-12, not a blocker).
// ----------------------------------------------------------------------------
// D-1  launchpad cost            (default: iron + stone slabs — cheap, it's a pad)
// D-2  launch stations cost      (default: mid iron/copper/redstone)
// D-3  rocket machines cost      (default: iron-heavy, redstone control)
// D-4  satellite chain cost      (default: iron + copper + glass + redstone)
// D-5  ID chip blank             (default: paper + copper around a diamond?) -> suggested: copper + paper, cheap chips
// D-6  suit set cost             (default: iron + leather + glass blocks)
// D-7  jetpack cost              (default: iron + redstone + pressure tank)
// D-8  upgrades cost             (default: cheap, iron + redstone)
// D-9  scanners cost             (default: glass + copper + redstone)
// D-10 steel swap (Metalworks)   (later pass — replaces iron bases with steel casts)
// D-11 loot tables for AR3       (jar has 6; supply pass = recipes first, loot later)
// D-12 anything HER-instinct     — scratch space, edit freely

ServerEvents.recipes(event => {

  // ==========================================================================
  // PHASE 1 — SATELLITE CHAIN (the GPS gate's critical path)
  // The gate (minebricks_gps_gate.js) cannot fire until these exist.
  // ==========================================================================

  // Launch Pad (multi-block pad tile)
  event.shaped('adv_rocketry:launchpad', [
    'ISI',
    'SCS',
    'ISI'
  ], {
    I: 'minecraft:iron_ingot',
    S: 'minecraft:smooth_stone',
    C: 'minecraft:copper_ingot'
  });

  // Satellite Launch Station (the Shape-B gate block — builder owns the unlock)
  event.shaped('adv_rocketry:launch_station_satellite_missions', [
    'IRI',
    'RGR',
    'IRI'
  ], {
    I: 'minecraft:iron_ingot',
    R: 'minecraft:redstone',
    G: 'minecraft:glass_pane'
  });

  // Satellite Assembler
  event.shaped('adv_rocketry:satellite_assembler', [
    'ICI',
    'GRG',
    'ICI'
  ], {
    I: 'minecraft:iron_ingot',
    C: 'minecraft:copper_ingot',
    G: 'minecraft:glass_pane',
    R: 'minecraft:redstone'
  });

  // Satellite ID Chip (cheap — chips are fuel, not treasure: D-5)
  event.shaped('adv_rocketry:satellite_id_chip', [
    ' PC',
    'PCP',
    'CP '
  ], {
    P: 'minecraft:paper',
    C: 'minecraft:copper_ingot'
  });

  // Satellite (item) — SEE PROBE P4 before trusting this block.
  event.shapeless('adv_rocketry:satellite', [
    'adv_rocketry:satellite_id_chip',
    'adv_rocketry:satellite_optical_telescope'
  ]);

  // Satellite payload scanners (D-9)
  event.shaped('adv_rocketry:satellite_optical_telescope', [
    ' G ',
    'GRG',
    ' C '
  ], {
    G: 'minecraft:glass_pane',
    R: 'minecraft:redstone',
    C: 'minecraft:copper_ingot'
  });
  event.shaped('adv_rocketry:satellite_mass_scanner', [
    ' G ',
    'GRG',
    ' I '
  ], {
    G: 'minecraft:glass_pane',
    R: 'minecraft:redstone',
    I: 'minecraft:iron_ingot'
  });
  event.shaped('adv_rocketry:satellite_composition_scanner', [
    ' G ',
    'GRG',
    ' C '
  ].map(r => r), { // placeholder twin of optical — D-9 dial to differentiate
    G: 'minecraft:glass_pane',
    R: 'minecraft:redstone',
    C: 'minecraft:copper_ingot'
  });

  // Satellite Monitor (ground-side readout)
  event.shaped('adv_rocketry:satellite_monitor', [
    'IGI',
    'GRG',
    'IGI'
  ], {
    I: 'minecraft:iron_ingot',
    G: 'minecraft:glass_pane',
    R: 'minecraft:redstone'
  });

  // ==========================================================================
  // PHASE 2 — ROCKET CHAIN (rides to orbit, per Shape B)
  // ==========================================================================

  event.shaped('adv_rocketry:rocket_assembler', [
    'III',
    'IRI',
    'III'
  ], { I: 'minecraft:iron_ingot', R: 'minecraft:redstone' });

  event.shaped('adv_rocketry:rocket_motor', [
    ' I ',
    'ICI',
    'IBI'
  ], {
    I: 'minecraft:iron_ingot',
    C: 'minecraft:copper_ingot',
    B: 'minecraft:iron_block'
  });

  event.shaped('adv_rocketry:rocket_motor_improved', [
    ' I ',
    'IMI',
    'IBI'
  ], {
    I: 'minecraft:iron_ingot',
    M: 'adv_rocketry:rocket_motor',
    B: 'minecraft:iron_block'
  });

  event.shaped('adv_rocketry:fuel_tank', [
    ' I ',
    'IGI',
    'IGI'
  ], { I: 'minecraft:iron_ingot', G: 'minecraft:glass' });

  event.shaped('adv_rocketry:guidance_computer', [
    'IRI',
    'RGR',
    'IRI'
  ], {
    I: 'minecraft:iron_ingot',
    R: 'minecraft:redstone',
    G: 'minecraft:glass_pane'
  });

  event.shaped('adv_rocketry:cargo_hold', [
    'III',
    'ICI',
    'III'
  ], { I: 'minecraft:iron_ingot', C: 'minecraft:chest' });

  event.shaped('adv_rocketry:drill', [
    'III',
    'IDI',
    'IBI'
  ], {
    I: 'minecraft:iron_ingot',
    D: 'minecraft:iron_pickaxe',
    B: 'minecraft:iron_block'
  });

  event.shaped('adv_rocketry:gas_intake', [
    ' I ',
    'IFI',
    'IBI'
  ], {
    I: 'minecraft:iron_ingot',
    F: 'minecraft:iron_bars',
    B: 'minecraft:iron_block'
  });

  event.shaped('adv_rocketry:fueling_station', [
    'IBI',
    'FTF',
    'IBI'
  ], {
    I: 'minecraft:iron_ingot',
    B: 'minecraft:iron_block',
    F: 'minecraft:furnace',
    T: 'adv_rocketry:pressure_tank'
  });

  event.shaped('adv_rocketry:pressure_tank', [
    'III',
    'IGI',
    'III'
  ], { I: 'minecraft:iron_ingot', G: 'minecraft:glass' });

  event.shaped('adv_rocketry:launch_station', [
    'IRI',
    'IBI',
    'IRI'
  ], {
    I: 'minecraft:iron_ingot',
    R: 'minecraft:redstone',
    B: 'minecraft:iron_block'
  });

  event.shaped('adv_rocketry:structure_tower', [
    ' I ',
    'IBI',
    ' I '
  ], { I: 'minecraft:iron_ingot', B: 'minecraft:iron_block' });

  event.shaped('adv_rocketry:rocket_item_loader', [
    'IHI',
    'ICI',
    'IHI'
  ], { I: 'minecraft:iron_ingot', H: 'minecraft:hopper', C: 'minecraft:chest' });

  event.shaped('adv_rocketry:rocket_fluid_loader', [
    'IHI',
    'ITI',
    'IHI'
  ], {
    I: 'minecraft:iron_ingot',
    H: 'minecraft:hopper',
    T: 'adv_rocketry:pressure_tank'
  });

  event.shaped('adv_rocketry:data_storage_block', [
    'III',
    'ICI',
    'III'
  ], { I: 'minecraft:iron_ingot', C: 'minecraft:bookshelf' }); // D-dial: rename feel

  event.shaped('adv_rocketry:fluid_release', [
    'ITI',
    'IFI',
    'ITI'
  ], {
    I: 'minecraft:iron_ingot',
    T: 'adv_rocketry:pressure_tank',
    F: 'minecraft:iron_bars'
  });

  event.shaped('adv_rocketry:seat', [
    ' P ',
    'PPP',
    ' I '
  ], { P: 'minecraft:iron_ingot', I: 'minecraft:smooth_stone' }); // TODO check real mat — D-dial

  // ==========================================================================
  // PHASE 3 — SUIT, SUPPORT & CHIPS (pickable later; not gate-relevant)
  // ==========================================================================

  // Space suit (D-6)
  event.shaped('adv_rocketry:space_helmet', [
    'LLL',
    'LGL',
    '   '
  ], { L: 'minecraft:leather', G: 'minecraft:glass' });
  event.shaped('adv_rocketry:space_chestplate', [
    'L L',
    'LGL',
    'LLL'
  ], { L: 'minecraft:leather', G: 'minecraft:glass' });
  event.shaped('adv_rocketry:space_leggings', [
    'LGL',
    'L L',
    'L L'
  ], { L: 'minecraft:leather', G: 'minecraft:glass' });
  event.shaped('adv_rocketry:space_boots', [
    '   ',
    'L L',
    'L L'
  ], { L: 'minecraft:leather' });

  // Radiation shield, LoRa, battery, storage (D-8 family)
  event.shaped('adv_rocketry:radiation_shield', [
    'LPL',
    'PLP',
    'LPL'
  ], { L: 'minecraft:leather', P: 'minecraft:lead' });
  event.shaped('adv_rocketry:lora_module', [
    ' R ',
    'RCR',
    ' I '
  ], { R: 'minecraft:redstone', C: 'minecraft:copper_ingot', I: 'minecraft:iron_ingot' });
  event.shaped('adv_rocketry:battery', [
    ' C ',
    'CRC',
    ' C '
  ], { C: 'minecraft:copper_ingot', R: 'minecraft:redstone' });
  event.shapeless('adv_rocketry:item_data_storage', ['minecraft:book', 'minecraft:iron_ingot']);

  // ID chips: planet + asteroid (cheap family per D-5)
  event.shaped('adv_rocketry:planet_id_chip', [
    ' PC',
    'PGP',
    'CP '
  ], { P: 'minecraft:paper', C: 'minecraft:copper_ingot', G: 'minecraft:grass_block' }); // D-dial: world token
  event.shaped('adv_rocketry:asteroid_id_chip', [
    ' PC',
    'PCP',
    'CP '
  ], { P: 'minecraft:paper', C: 'minecraft:copper_ingot' });

  // Portable pressure tanks (D-8)
  event.shaped('adv_rocketry:portable_pressure_tank_aluminum', [
    ' I ',
    'IGI',
    ' I '
  ], { I: 'minecraft:iron_ingot', G: 'minecraft:glass' });
  event.shaped('adv_rocketry:portable_pressure_tank_steel', [
    ' B ',
    'BGB',
    ' B '
  ], { B: 'minecraft:iron_block', G: 'minecraft:glass' }); // D-10 steel swap later

  // Jetpack + upgrades (D-7 / D-8)
  event.shaped('adv_rocketry:jetpack', [
    'I I',
    'ITI',
    ' R '
  ], {
    I: 'minecraft:iron_ingot',
    T: 'adv_rocketry:portable_pressure_tank_aluminum',
    R: 'minecraft:redstone'
  });
  event.shapeless('adv_rocketry:flight_speed_upgrade', ['minecraft:redstone', 'minecraft:iron_ingot', 'minecraft:sugar']);
  event.shapeless('adv_rocketry:gravity_boots_upgrade', ['minecraft:iron_ingot', 'minecraft:lead']);
  event.shapeless('adv_rocketry:legs_upgrade', ['minecraft:iron_ingot', 'minecraft:redstone', 'minecraft:piston']);
  event.shapeless('adv_rocketry:night_vision_upgrade', ['minecraft:golden_carrot', 'minecraft:iron_ingot', 'minecraft:glass_pane']);

  // Atmosphere Analyzer + Galaxy Database + Linker
  event.shaped('adv_rocketry:atm_analyzer', [
    ' G ',
    'GRG',
    'IRI'
  ], { G: 'minecraft:glass_pane', R: 'minecraft:redstone', I: 'minecraft:iron_ingot' });
  event.shaped('adv_rocketry:galaxy_database', [
    'BBB',
    'BDB',
    'BBB'
  ], { B: 'minecraft:book', D: 'minecraft:diamond' });
  event.shaped('adv_rocketry:linker', [
    ' C ',
    'CRC',
    ' P '
  ], { C: 'minecraft:copper_ingot', R: 'minecraft:redstone', P: 'minecraft:paper' });

  // Suit Workstation
  event.shaped('adv_rocketry:suit_workstation', [
    'III',
    'ISI',
    'III'
  ], { I: 'minecraft:iron_ingot', S: 'minecraft:iron_block' }); // D-dial

  // ==========================================================================
  // NOTES FOR THE NEXT PASS (not blocking, listed so nothing gets lost):
  //  - D-10: Metalworks steel swap pass (foundry-cast bases for tier-2 costs)
  //  - D-11: loot pass — 6 loot tables ship in-jar; decide keep/kill/extend
  //  - Statistical ore-availability check per metal BEFORE shipping (standing
  //    requirement from the Metalworks notes — no TFC-style scarcity traps)
  //  - Recipe feel check vs progression pace once Phase 1 survives a live test
  // ============================================================================
});
