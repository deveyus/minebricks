// ============================================================================
// MINEBRICKS — WORLD SPIKE MURDER (active, 2026-10-28, lead's explicit call:
// "We'll need to murder World Anchors from Railcraft with the violence.")
// ============================================================================
// WHY: Railcraft Reborn's World Spikes (the World Anchor lineage) place a
// PERMANENT 3x3 chunk load on placement — no fuel, no upkeep, no cost, and the
// 1.2.14 source ships NO config gate for them (RailcraftConfig has zero spike
// keys; verified in railcraft-reborn/railcraft source + jar class strings).
// Free chunk loading undercuts the entire Chunk Loading Token design, so they
// die. With the violence.
//
// WHAT THE SPIKES WERE (ground truth, RC Reborn 1.2.14 source):
//   - WorldSpikeBlock.onPlace  -> forceChunk 3x3, released only on break
//   - PersonalWorldSpikeBlock  -> extends WorldSpikeBlock, same 3x3 behavior
//   - WorldSpikeMinecart       -> same 3x3, mobile
//   - Ticket flavor: "normal" load (block entities tick, machines run) with
//     naturalSpawning=false — spike-loaded chunks do NOT naturally spawn mobs.
//
// THE MURDER (recipe layer — the only lever RC Reborn exposes):
//   - Every survival path to a spike is removed. Items stay visible in
//     creative/EMI for admin testing; survival is sealed.
//   - Precedent: zero worlds booted on this pack yet, so no existing placed
//     spikes to clean up. If one ever exists, breaking it releases its chunks
//     (preRemoveSideEffects) — no orphans.
//
// ROLLBACK: delete this file (or flip KILL_SWITCH to false). One toggle.
//
// Replacement doctrine: chunk loading is paid for in Chunk Loading Tokens
// (ECONOMY PASS, NEXT-UP.md) — never free, always on the curve.
// ============================================================================

const KILL_SWITCH = true;

if (KILL_SWITCH) {
  ServerEvents.recipes(event => {
    // The anchors themselves
    event.remove({ output: 'railcraft:world_spike' });
    event.remove({ output: 'railcraft:personal_world_spike' });
    // The mobile one — assembly + the special disassembly recipe by id
    event.remove({ output: 'railcraft:world_spike_minecart' });
    event.remove({ id: 'railcraft:worldspike_minecart_disassembly' });
  });
  console.log('[minebricks] World Spike murder complete: world_spike, ' +
    'personal_world_spike, world_spike_minecart + disassembly recipes removed. ' +
    'Chunk loading now sells for tokens only.');
}
