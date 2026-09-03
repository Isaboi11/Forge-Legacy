/*
 * Forge Legacy — Accomplishments Store (shared source of truth)
 * Athlete-authored, freeform milestones (L-12/13/14). The deliberate opposite
 * of Honors: 100% athlete CRUD, no taxonomy, no numeric validation.
 *
 * Exposed as window.ForgeAccomplishments.
 *
 *   ForgeAccomplishments.all()            -> array, most-recent-first (by createdAt)
 *   ForgeAccomplishments.get(id)          -> one record (or null)
 *   ForgeAccomplishments.featured()       -> featured records, most-recent-first (max 3)
 *   ForgeAccomplishments.save(rec)        -> upsert (assigns id/createdAt if new); returns saved
 *   ForgeAccomplishments.remove(id)       -> delete (permanent, no tombstone)
 *   ForgeAccomplishments.setFeatured(id,v)-> toggle the featured flag
 *   ForgeAccomplishments.CHAPTERS         -> chapter list for the picker (active first)
 *   ForgeAccomplishments.chapter(id)      -> chapter record (or null)
 *
 * A record: { id, name, date (YYYY-MM-DD), chapterId (null|string), featured, photo (null|dataURL), note (string), createdAt }
 *   chapterId null  -> account-level ("built before Forge Legacy" / no chapter)
 *   chapterId [id]  -> chapter-level
 */
(function () {
  var KEY = 'forge_accomplishments_v1';
  function uid() { return 'ac' + Date.now().toString(36) + Math.round(Math.random() * 1e6).toString(36); }

  // Chapters mirror the current Legacy set (active first, then archived newest-first).
  var CHAPTERS = [
    { id: 'ch-3', label: 'Chapter III · The Rebuild', active: true },
    { id: 'ch-2', label: 'Chapter II · Ironborn', active: false },
    { id: 'ch-1', label: 'Chapter I · Foundations', active: false },
  ];

  function seeds() {
    var now = Date.now(), d = 86400000;
    return [
      { id: uid(), name: 'Marathon Finisher', date: '2026-06-14', chapterId: 'ch-3', featured: true, createdAt: now - 2 * d },
      { id: uid(), name: '315 lb Barbell Bench Press', date: '2026-05-03', chapterId: 'ch-3', featured: true, createdAt: now - 40 * d },
      { id: uid(), name: 'Spartan Race Finisher', date: '2025-11-10', chapterId: 'ch-2', featured: false, createdAt: now - 220 * d },
      { id: uid(), name: 'Deadlift 2× bodyweight', date: '2025-08-20', chapterId: 'ch-1', featured: true, createdAt: now - 300 * d },
      { id: uid(), name: 'Ran first 5K', date: '2024-08-01', chapterId: null, featured: false, createdAt: now - 680 * d },
    ];
  }

  function readAll() {
    try { var raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) || []; } catch (e) {}
    var s = seeds();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  function writeAll(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function sortDesc(list) { return list.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }); }

  window.ForgeAccomplishments = {
    KEY: KEY,
    CHAPTERS: CHAPTERS,
    chapter: function (id) { for (var i = 0; i < CHAPTERS.length; i++) { if (CHAPTERS[i].id === id) return CHAPTERS[i]; } return null; },
    all: function () { return sortDesc(readAll()); },
    get: function (id) { return readAll().filter(function (r) { return r.id === id; })[0] || null; },
    featured: function () { return sortDesc(readAll().filter(function (r) { return r.featured; })); },
    save: function (rec) {
      var list = readAll();
      var out = Object.assign({}, rec);
      if (!out.id) out.id = uid();
      if (!out.createdAt) out.createdAt = Date.now();
      if (typeof out.chapterId === 'undefined') out.chapterId = null;
      out.featured = !!out.featured;
      var i = -1;
      list.forEach(function (r, k) { if (r.id === out.id) i = k; });
      if (i >= 0) list[i] = out; else list.push(out);
      writeAll(list);
      return out;
    },
    remove: function (id) { writeAll(readAll().filter(function (r) { return r.id !== id; })); },
    setFeatured: function (id, val) { var list = readAll(); list.forEach(function (r) { if (r.id === id) r.featured = !!val; }); writeAll(list); },
  };
})();
