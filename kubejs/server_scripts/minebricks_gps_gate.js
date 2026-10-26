// ============================================================================
// MINEBRICKS — GPS GATE (Shape B skeleton — staged 2026-10-26, NOT shipped)
// ============================================================================
// Spec is LOCKED (pack lead rulings 2026-10-25, conv-2347Z -> 0110Z):
//   Shape B            — ride AR3's real satellite-mission chain
//   "up once per world"— one satellite per player, per world, permanent
//   attribution        — builder of the Satellite Launch Station owns the unlock
//   honesty            — no fake insertions; unlock fires only on real sky-clear
//   failure branch     — DROPPED by ruling (no failure copy exists, by design)
//   repeat launches    — SILENT by ruling
//   THE MOMENT         — two server-wide beats, copy LOCKED below
//
// STATUS: SKELETON. The copy and data model are final; the watch loop needs
// probes P1-P5 (need a live game). Every probe is marked TODO(P#) below.
// ============================================================================

// --- Xaero markers (verified from Xaero's Map Server Utils mcfunctions) -----
const MARKER_MAPS_OFF = '\u00a7n\u00a7o\u00a7m\u00a7i\u00a7n\u00a7i\u00a7m\u00a7a\u00a7p'; // disables minimap+worldmap for that player
const MARKER_MAPS_ON  = '\u00a7r\u00a7e\u00a7s\u00a7e\u00a7t\u00a7x\u00a7a\u00a7e\u00a7r\u00a7o'; // clears all server-set flags (maps back on)

// --- Data model -------------------------------------------------------------
// Per-player unlock lives in player.persistentData (NeoForgeData — verified to
// survive logout/death via IEntityExtension; probe P5 double-checks a real
// world save, fallback = JsonIO world registry keyed by player UUID).
const UNLOCK_KEY = 'minebricks:gps_unlocked';
const STATION_KEY = 'minebricks:owns_satellite_station'; // placed-event attribution

// --- THE MOMENT — [LOCKED COPY, pack lead approved 2026-10-25] --------------
// Two beats, server-wide. No closer. No failure line. No repeat-launch flavor.
// Beat 1 (T-0, gold):        TOWER CLEARED — <name>'s GPS satellite is climbing. Telemetry nominal.
// Beat 2 (insertion, gold bold): ORBITAL INSERTION COMPLETE
//                             satellite is on station. Map stream commencing.
// ----------------------------------------------------------------------------

// --- Join hook: replay the right map state for each player, every login -----
PlayerEvents.loggedIn(event => {
  const p = event.player;
  const unlocked = p.persistentData.getBoolean(UNLOCK_KEY);
  // Verified surfaces: KubeJS 2101.7 sends raw chat markers via player.tell /
  // status message channel — exact send path confirmed at build time (probe P5b:
  // confirm marker channel is the one Xaero listens on — Server Utils uses
  // system chat; if KubeJS path differs, fall back to a one-shot mcfunction).
  if (unlocked) {
    p.tell(MARKER_MAPS_ON);   // maps live for this player
  } else {
    p.tell(MARKER_MAPS_OFF);  // early game: Antique Atlas + paper maps only
  }
});

// --- Attribution: builder of the Satellite Launch Station owns the gate -----
BlockEvents.placed(event => {
  const blockId = String(event.block.id);
  if (blockId === 'adv_rocketry:launch_station_satellite_missions') {
    // TODO(P3): pad/station position correlation — record the station's block
    // position into the placer's persistentData so the watch loop can tell
    // "her rocket from her pad" instead of any rocket near any player.
    event.player.persistentData.putBoolean(STATION_KEY, true);
    // Attribution rule (locked): the BUILDER owns the unlock — no team logic
    // unless the lead adds it later.
  }
});

// --- Watch loop: mission rocket goes up, sky-clear fires the unlock ---------
// TODO(P1): rocket entity id — grab the real EntityRocket registry name at
//           build time (EntityEvents.spawned filter hangs off this).
// TODO(P2): program-data read — EntityRocket saves its 'program'; confirm the
//           read path in KubeJS so satellite missions are distinguishable from
//           asteroid/gas launches (only satellite missions count, per spec).
ServerEvents.loaded(event => {
  // event.server.scheduleRepeating(..., tick => {
  //   for each tracked rocket entity:
  //     if (rocket.program === SATELLITE_MISSION && rocket.startedFromOwnersStation) {
  //       if (skyClearAt(rocket.position)) {   // no clear sky, no unlock — silent, relaunch works
  //         fireTheMoment(rocket.owner);       // two locked beats, server-wide
  //         owner.persistentData.putBoolean(UNLOCK_KEY, true);
  //         stopTracking(rocket);              // repeat launches: silent
  //       }
  //       // failure branch: INTENTIONALLY ABSENT (ruling conv-0110Z — if it
  //       // never clears the sky, nothing happens; a relaunch just tries again)
  //     }
  // });
});

function fireTheMoment(playerName) {
  // [LOCKED COPY — do not paraphrase, reword, or "improve"]
  // Beat 1, gold:      TOWER CLEARED — <name>'s GPS satellite is climbing. Telemetry nominal.
  // Beat 2, gold bold: ORBITAL INSERTION COMPLETE
  //                    satellite is on station. Map stream commencing.
  // Delivery: server-wide broadcast (every player sees both beats).
  // TODO(P5b): pin the exact tellraw/tell call chain for gold + bold formatting.
}
