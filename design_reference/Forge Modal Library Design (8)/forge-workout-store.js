/**
 * Forge Workout Store — the smallest shared mutable store the swap loop needs.
 *
 * Holds per-slot exercise overrides so a Replace performed on one screen is
 * reflected everywhere else. A "slot" is a stable address for one exercise
 * position:
 *   • active workout      → "w:<exerciseIndex>"
 *   • program schedule    → "p:<programId>:<index>"
 *
 * Value is a compact record { name, equip, muscles[], tags[] }. Only this one
 * namespaced localStorage key is ever touched.
 *
 * Prototype scope on purpose: no versioning, no history, no full program edit.
 */
(function () {
  var KEY = 'forge_workout_store_v1';
  function readAll() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function writeAll(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  window.ForgeWorkoutStore = {
    get: function (slot, fallback) { var o = readAll(); return (o[slot] != null) ? o[slot] : (fallback === undefined ? null : fallback); },
    set: function (slot, record) { if (!slot) return; var o = readAll(); o[slot] = record; writeAll(o); },
    clear: function (slot) { var o = readAll(); delete o[slot]; writeAll(o); },
    all: function () { return readAll(); },
  };
})();
