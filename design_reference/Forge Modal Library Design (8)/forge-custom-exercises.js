/*
 * Forge Legacy — Custom Exercise Store (shared source of truth)
 * The athlete's own authored exercises (W-28 Create/Edit Custom Exercise),
 * surfaced in the Exercise Library's "Custom Exercises" section and available
 * to the pickers alongside the built-in catalog.
 *
 * Exposed as window.ForgeCustomExercises.
 *
 *   ForgeCustomExercises.all()       -> array
 *   ForgeCustomExercises.get(id)     -> one record (or null)
 *   ForgeCustomExercises.save(rec)   -> upsert (assigns id/createdAt if new); returns saved record
 *   ForgeCustomExercises.remove(id)  -> delete
 *
 * A record:
 *   { id, name, cat, equip, type, muscles[], env[], notes, createdAt }
 *
 * Seeds the two example customs the Library already referenced (Sled Push,
 * Farmer's Carry) on first run so the section is never empty.
 */
(function () {
  var KEY = 'forge_custom_exercises_v1';
  var SEEDED = 'forge_custom_exercises_seeded_v1';
  function uid() { return 'ce' + Date.now().toString(36) + Math.round(Math.random() * 1e6).toString(36); }

  function seeds() {
    var now = Date.now();
    return [
      { id: uid(), name: 'Sled Push', cat: 'Conditioning', equip: 'Custom', type: 'Compound', muscles: ['Quads', 'Glutes', 'Core'], env: ['Gym', 'Outside'], notes: 'Heavy sled, 20-metre pushes. Drive low and keep the arms long.', createdAt: now - 30 * 86400000 },
      { id: uid(), name: "Farmer's Carry", cat: 'Full Body', equip: 'Custom', type: 'Compound', muscles: ['Forearms', 'Core', 'Traps'], env: ['Gym', 'Home', 'Outside'], notes: 'Two heavy dumbbells or kettlebells. Walk tall, brace the trunk, small steps.', createdAt: now - 22 * 86400000 },
    ];
  }

  function readAll() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) || [];
    } catch (e) {}
    var s = seeds();
    try { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.setItem(SEEDED, '1'); } catch (e) {}
    return s;
  }
  function writeAll(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }

  window.ForgeCustomExercises = {
    KEY: KEY,
    all: function () { return readAll(); },
    get: function (id) { return this.all().filter(function (r) { return r.id === id; })[0] || null; },
    save: function (rec) {
      var list = this.all();
      var out = Object.assign({}, rec);
      if (!out.id) out.id = uid();
      if (!out.createdAt) out.createdAt = Date.now();
      if (!Array.isArray(out.muscles)) out.muscles = [];
      if (!Array.isArray(out.env)) out.env = [];
      var i = -1;
      list.forEach(function (r, k) { if (r.id === out.id) i = k; });
      if (i >= 0) list[i] = out; else list.push(out);
      writeAll(list);
      return out;
    },
    remove: function (id) { writeAll(this.all().filter(function (r) { return r.id !== id; })); },
  };
})();
