// minebricks_lang_tweaks.js — client-side lang overrides (display renames)
//
// The one ruling this file exists for (pack lead's ask, 2026-10-28 04:50Z):
// culturaldelights:popcorn is "Pogcorn" now.
//
// How it works: ClientEvents.lang('en_us') injects entries into the client lang
// map at resource-load time — the same mechanism as a resource-pack lang
// override, but pack-managed, so every player sees the same names.
//
// Verification trail (house rule — verify, then trust):
//   * item id from her 0.4.12 food dump: culturaldelights:popcorn, the ONLY
//     exact "Popcorn" display in the pack (330 foods, 14 namespaces swept)
//   * lang key + current value from the mod jar itself
//     (culturaldelights-0.17.8.jar assets/culturaldelights/lang/en_us.json):
//     item.culturaldelights.popcorn = "Popcorn"
//   * event surface parsed from our own kubejs jar: LangKubeEvent has
//     add(key, value) / addAll / renameItem / renameBlock / renameEntity —
//     add() with the literal jar-verified key beats renameItem()'s key
//     derivation for sharpness.
//
// Safe by construction: display text only. No item ids, no recipes, no tags, no
// behavior change — the server never runs this file. To add more renames later:
// drop another event.add('item.<ns>.<path>', 'New Name') line in, after checking
// the key in that mod's assets/<ns>/lang/en_us.json first.

;
(function () {
  ClientEvents.lang('en_us', function (event) {
    event.add('item.culturaldelights.popcorn', 'Pogcorn')
    console.info('[lang-tweaks] item.culturaldelights.popcorn -> Pogcorn')
  })
})()
