// ============================================================================
// MINEBRICKS — SOPHISTICATED BACKPACKS KNOBS (staged 2026-10-26, NOT shipped)
// ============================================================================
// Two open calls from PACK_NOTES, both sketched below with the lead's pick
// pending. Route A/B is a dial; loot keep/kill is a separate dial.
// ============================================================================

// ----------------------------------------------------------------------------
// DIAL 1 — stack upgrades OFF (lead's call, route pending A vs B)
// ----------------------------------------------------------------------------
// ROUTE A — KubeJS (deterministic, rides the script layer):
//   event.remove({ output: 'sophisticatedbackpacks:stack_upgrade' })
//   event.remove({ output: 'sophisticatedbackpacks:stack_upgrade_tier_1' })
//   // (+ tier 2/3/4/5 if they exist as separate items — pin exact ids from
//   //  ProbeJS dump at build time)
//   // Hiding from the creative/EMI view: pin via ProbeJS at build time.
//
// ROUTE B — server config (config/sophisticatedbackpacks-server.toml):
//   the mod's upgrade settings section carries per-upgrade enable keys.
//   Exact key names get pinned by reading the mod's default config at build
//   time, then the toml is committed to config/ so packwiz ships it.
//
// Route A lives in the script layer (one source of truth, reviewable);
// Route B is native to the mod (survives mod updates that reshuffle items).
// Either is one toggle away — pick and delete the other.
// ROUTE A IS LEFT COMMENTED SO NOTHING FIRES UNTIL THE PICK:

// ServerEvents.recipes(event => {
//   event.remove({ output: 'sophisticatedbackpacks:stack_upgrade' });
// });

// ----------------------------------------------------------------------------
// DIAL 2 — loot spawns (backpacks/upgrades generate into loot chests; mobs can
// spawn wearing them). KEEP or KILL is the lead's call. Kill sketch:
// ----------------------------------------------------------------------------
// ServerEvents.generatedLootTables? — no; the mod injects via its own loot
// tables under data/sophisticatedbackpacks/loot_table/. Kill = override those
// files to empty (datapack-style) or event.remove on the inject — pin the
// exact table list from the jar at build time. Sketch only, pending the call.
