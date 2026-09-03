/* Forge Legacy — Transformation store (progress photo/video sets).
 * Documentary body-change record: guided pose sets tied to a chapter, chronological.
 * Photos persist via <image-slot> (keyed by entryId + pose); this store holds the
 * entry list + the optional capture reminder. Single source of truth — the Progress
 * Hub preview and the Legacy gallery both read it. Calm/documentary: no compare-scoring,
 * no likes, no feed.
 */
(function () {
  var EK = 'forge.xform.entries', RK = 'forge.xform.remind';

  var POSES = [
    { key: 'rf', label: 'Front Relaxed', short: 'Front' },
    { key: 'rs', label: 'Side Relaxed', short: 'Side' },
    { key: 'rb', label: 'Back Relaxed', short: 'Back' },
    { key: 'ff', label: 'Front Flexed', short: 'Front' },
    { key: 'su', label: 'Side Arms Up', short: 'Arms Up' },
    { key: 'bf', label: 'Back Flexed', short: 'Back' },
  ];

  var TAGS = ['Milestone', 'Competition', 'Posing', 'Bulk', 'Cut', 'Off-season'];

  var seed = [
    { id: 'xf-seed-3', label: 'Mar 6, 2026', chapter: 'The Rebuild', caption: 'Twelve weeks in. The work is showing.', tags: ['Milestone'], hasVideo: true, meta: '183 lb · Week 12 · Morning · Gym lighting' },
    { id: 'xf-seed-2', label: 'Jan 2, 2026', chapter: 'The Rebuild', caption: '', tags: [], hasVideo: false, meta: '188 lb · Off-season · Home' },
    { id: 'xf-seed-1', label: 'Oct 10, 2025', chapter: 'Ironclad', caption: 'Where this chapter started.', tags: ['Off-season'], hasVideo: false, meta: '195 lb · Starting point · Morning' },
  ];

  function loadE() { try { var r = JSON.parse(window.localStorage.getItem(EK)); if (Array.isArray(r) && r.length) return r; } catch (e) {} return seed.slice(); }
  function loadR() { try { var r = JSON.parse(window.localStorage.getItem(RK)); if (r && typeof r === 'object') return r; } catch (e) {} return { enabled: false, freq: 'monthly' }; }

  var entries = loadE(), remind = loadR(), subs = [];
  function emit() { subs.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
  function persistE() { try { window.localStorage.setItem(EK, JSON.stringify(entries)); } catch (e) {} }
  function persistR() { try { window.localStorage.setItem(RK, JSON.stringify(remind)); } catch (e) {} }

  window.addEventListener('storage', function (e) {
    if (!e) return;
    if (e.key === EK) { entries = loadE(); emit(); }
    if (e.key === RK) { remind = loadR(); emit(); }
  });

  window.ForgeTransformation = {
    POSES: POSES,
    TAGS: TAGS,
    entries: function () { return entries.slice(); },        // newest first
    add: function (en) { entries = [en].concat(entries); persistE(); emit(); },
    remove: function (id) { entries = entries.filter(function (e) { return e.id !== id; }); persistE(); emit(); },
    update: function (id, patch) { entries = entries.map(function (e) { return e.id === id ? Object.assign({}, e, patch) : e; }); persistE(); emit(); },
    remind: function () { return Object.assign({}, remind); },
    setRemind: function (r) { remind = Object.assign({}, remind, r); persistR(); emit(); },
    reset: function () { entries = seed.slice(); persistE(); emit(); },
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
  };
})();
