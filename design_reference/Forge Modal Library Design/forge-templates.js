/*
 * Forge Legacy — Workout Template Store (shared source of truth)
 * The personal library of reusable, program-independent WorkoutTemplates that
 * W-26 (Templates Hub), W-27 (Template Detail) and W-25 (Free Workout Builder)
 * all read and write.
 *
 * Exposed as window.ForgeTemplates.
 *
 *   ForgeTemplates.all()          -> array (newest-relevant first is up to the caller)
 *   ForgeTemplates.get(id)        -> one template (or null)
 *   ForgeTemplates.save(tpl)      -> upsert (assigns id/createdAt if new); returns the saved record
 *   ForgeTemplates.remove(id)     -> delete
 *   ForgeTemplates.duplicate(id)  -> deep-copy "<name> (Copy)"; returns the new record
 *   ForgeTemplates.touch(id, mins)-> record a use (lastUsedAt = now, useCount++, prepend history)
 *
 * A template:
 *   { id, name, createdAt, lastUsedAt|null, useCount,
 *     warmup[], main[], cooldown[],           // each item: { id,name,equip,muscles[],type,sets,reps }
 *     history[] }                             // { at, durationMin, note } newest-first
 *
 * Only the one namespaced localStorage key is ever touched.
 */
(function () {
  var KEY = 'forge_templates_v1';
  var SEEDED = 'forge_templates_seeded_v1';
  var DAY = 86400000;

  function uid(p) { return (p || 't') + Date.now().toString(36) + Math.round(Math.random() * 1e6).toString(36); }
  function ex(name, equip, muscles, type, sets, reps) {
    return { id: uid('x'), name: name, equip: equip, muscles: muscles, type: type || 'Compound', sets: sets, reps: reps };
  }

  function seeds() {
    var now = Date.now();
    return [
      {
        id: uid(), name: 'Push Day', createdAt: now - 62 * DAY, lastUsedAt: now - 2 * DAY, useCount: 14,
        warmup: [ex('Push-Up', 'Bodyweight', ['Chest', 'Core'], 'Compound', 2, 15)],
        main: [
          ex('Bench Press', 'Barbell', ['Chest', 'Triceps'], 'Compound', 4, 8),
          ex('Overhead Press', 'Barbell', ['Shoulders', 'Triceps'], 'Compound', 3, 8),
          ex('Incline Dumbbell Press', 'Dumbbell', ['Upper Chest', 'Shoulders'], 'Compound', 3, 10),
          ex('Cable Fly', 'Cable', ['Chest'], 'Isolation', 3, 12),
          ex('Triceps Pushdown', 'Cable', ['Triceps'], 'Isolation', 3, 12),
        ],
        cooldown: [],
        history: [
          { at: now - 2 * DAY, durationMin: 52, note: 'Bench felt strong — hit 190 for a clean triple.' },
          { at: now - 9 * DAY, durationMin: 48, note: '' },
          { at: now - 16 * DAY, durationMin: 55, note: 'Shoulder a little tight on OHP, dropped the load.' },
          { at: now - 24 * DAY, durationMin: 50, note: '' },
        ],
      },
      {
        id: uid(), name: 'Pull Day', createdAt: now - 62 * DAY, lastUsedAt: now - 4 * DAY, useCount: 12,
        warmup: [ex('Face Pull', 'Cable', ['Rear Delts'], 'Isolation', 2, 15)],
        main: [
          ex('Deadlift', 'Barbell', ['Back', 'Hamstrings'], 'Compound', 3, 5),
          ex('Pull-Up', 'Bodyweight', ['Lats', 'Biceps'], 'Compound', 4, 8),
          ex('Bent-Over Row', 'Barbell', ['Back', 'Biceps'], 'Compound', 3, 10),
          ex('Lat Pulldown', 'Cable', ['Lats', 'Biceps'], 'Compound', 3, 12),
          ex('Barbell Curl', 'Barbell', ['Biceps'], 'Isolation', 3, 12),
        ],
        cooldown: [],
        history: [
          { at: now - 4 * DAY, durationMin: 58, note: '' },
          { at: now - 11 * DAY, durationMin: 61, note: 'First bodyweight set of 10 pull-ups.' },
          { at: now - 18 * DAY, durationMin: 56, note: '' },
        ],
      },
      {
        id: uid(), name: 'Leg Day', createdAt: now - 55 * DAY, lastUsedAt: now - 6 * DAY, useCount: 11,
        warmup: [],
        main: [
          ex('Back Squat', 'Barbell', ['Quads', 'Glutes'], 'Compound', 4, 6),
          ex('Romanian Deadlift', 'Barbell', ['Hamstrings', 'Glutes'], 'Compound', 3, 8),
          ex('Leg Press', 'Machine', ['Quads', 'Glutes'], 'Compound', 3, 12),
          ex('Walking Lunge', 'Dumbbell', ['Quads', 'Glutes'], 'Compound', 3, 10),
          ex('Leg Curl', 'Machine', ['Hamstrings'], 'Isolation', 3, 12),
        ],
        cooldown: [ex('Plank', 'Bodyweight', ['Core'], 'Isolation', 3, 45)],
        history: [
          { at: now - 6 * DAY, durationMin: 64, note: 'Squat PR — 275 × 6.' },
          { at: now - 13 * DAY, durationMin: 60, note: '' },
        ],
      },
      {
        id: uid(), name: 'Full Body Express', createdAt: now - 20 * DAY, lastUsedAt: null, useCount: 0,
        warmup: [ex('Push-Up', 'Bodyweight', ['Chest', 'Core'], 'Compound', 2, 12)],
        main: [
          ex('Back Squat', 'Barbell', ['Quads', 'Glutes'], 'Compound', 3, 8),
          ex('Bench Press', 'Barbell', ['Chest', 'Triceps'], 'Compound', 3, 8),
          ex('Bent-Over Row', 'Barbell', ['Back', 'Biceps'], 'Compound', 3, 10),
          ex('Overhead Press', 'Barbell', ['Shoulders', 'Triceps'], 'Compound', 3, 10),
        ],
        cooldown: [],
        history: [],
      },
    ];
  }

  function readAll() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) || [];
    } catch (e) {}
    // first run — seed the library once
    var s = seeds();
    try { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.setItem(SEEDED, '1'); } catch (e) {}
    return s;
  }
  function writeAll(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }

  function cloneItems(arr) {
    return (arr || []).map(function (it) { return Object.assign({}, it, { id: uid('x'), muscles: (it.muscles || []).slice() }); });
  }

  window.ForgeTemplates = {
    KEY: KEY,
    all: function () {
      var list = readAll();
      // ensure the seed set exists even if a prior write left an empty array
      if (!list.length) { var seeded = false; try { seeded = localStorage.getItem(SEEDED) === '1'; } catch (e) {} if (!seeded) { list = seeds(); writeAll(list); try { localStorage.setItem(SEEDED, '1'); } catch (e) {} } }
      return list;
    },
    get: function (id) { return this.all().filter(function (t) { return t.id === id; })[0] || null; },
    save: function (tpl) {
      var list = this.all();
      var rec = Object.assign({}, tpl);
      if (!rec.id) rec.id = uid();
      if (!rec.createdAt) rec.createdAt = Date.now();
      if (rec.useCount == null) rec.useCount = 0;
      if (rec.lastUsedAt === undefined) rec.lastUsedAt = null;
      if (!Array.isArray(rec.history)) rec.history = [];
      ['warmup', 'main', 'cooldown'].forEach(function (k) { if (!Array.isArray(rec[k])) rec[k] = []; });
      var i = -1;
      list.forEach(function (t, k) { if (t.id === rec.id) i = k; });
      if (i >= 0) list[i] = rec; else list.push(rec);
      writeAll(list);
      return rec;
    },
    remove: function (id) { writeAll(this.all().filter(function (t) { return t.id !== id; })); },
    duplicate: function (id) {
      var src = this.get(id);
      if (!src) return null;
      var copy = {
        id: uid(), name: (src.name + ' (Copy)').slice(0, 40), createdAt: Date.now(), lastUsedAt: null, useCount: 0,
        warmup: cloneItems(src.warmup), main: cloneItems(src.main), cooldown: cloneItems(src.cooldown), history: [],
      };
      var list = this.all(); list.push(copy); writeAll(list);
      return copy;
    },
    touch: function (id, durationMin) {
      var list = this.all();
      list.forEach(function (t) {
        if (t.id !== id) return;
        t.lastUsedAt = Date.now();
        t.useCount = (t.useCount || 0) + 1;
        if (!Array.isArray(t.history)) t.history = [];
        t.history.unshift({ at: Date.now(), durationMin: durationMin || 0, note: '' });
      });
      writeAll(list);
    },
    // convenience for screens
    exerciseCount: function (t) { return (t.warmup || []).length + (t.main || []).length + (t.cooldown || []).length; },
    estMinutes: function (t) {
      var m = (t.main || []).length * 9 + (t.warmup || []).length * 4 + (t.cooldown || []).length * 4;
      return Math.max(5, Math.round(m / 5) * 5);
    },

    // ── Launching a live session ──
    // A launch is a SNAPSHOT of the template's structure at the moment Start is
    // tapped. Active Workout consumes it, builds the session, and records the use
    // only after it successfully initializes — so abandoning before launch counts
    // nothing, and swaps/edits during the session never touch the template itself.
    // The stored object is the workout's launch CONTEXT — source identity, launchId,
    // structure snapshot, and the routing/conflict data Active Workout resolves against.
    LAUNCH_CONTEXT_KEY: 'forge_workout_launch_context_v1',
    LAUNCH_KEY: 'forge_workout_launch_context_v1',   // back-compat alias for the property name
    launchPayload: function (t) {
      var flat = [];
      ['warmup', 'main', 'cooldown'].forEach(function (sec) {
        (t[sec] || []).forEach(function (it) {
          flat.push({ name: it.name, equip: it.equip, muscles: (it.muscles || []).slice(), type: it.type || '', section: sec, sets: it.sets, reps: it.reps });
        });
      });
      // launchId makes initialization idempotent — Active Workout stamps the session with it
      // and refuses to re-consume or double-count the same launch on a refresh / remount.
      return { version: 1, launchId: uid('lx'), sourceType: 'template', source: 'template', sourceId: t.id, templateId: t.id, name: t.name, sourceName: t.name, at: Date.now(), estMin: this.estMinutes(t), exercises: flat };
    },
    startSession: function (t) {
      try { localStorage.setItem(this.LAUNCH_CONTEXT_KEY, JSON.stringify(this.launchPayload(t))); } catch (e) {}
    },
  };
})();
