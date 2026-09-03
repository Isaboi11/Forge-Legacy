/*
 * Forge Legacy — canonical Chapters + Legacy-Timeline seed (single source of truth).
 *
 * WHY: the athlete's chapter narrative (active + sealed chapters and every timeline
 * mark) was hard-coded INDEPENDENTLY inside "Forge Chapter Detail" and "Forge Legacy
 * Timeline". The two duplicated the same story, so they could drift — and both sealed
 * chapters ("Ironborn", "Foundation") opened the SAME detail because the detail only
 * knew "active vs archived", not WHICH chapter. This module makes chapters a shared,
 * addressable dataset both screens resolve against.
 *
 * TENURE: like forge-honors.js, the depth scales with ForgeUser.tenure():
 *   new -> 1 nascent active chapter, no history
 *   y1  -> 1 active chapter, no sealed chapters yet (matches Legacy's "no prior chapters")
 *   y3  -> active Ch III + sealed Ch II + sealed Ch I (the veteran résumé)
 * Kept consistent with forge-user.js (lifts/counts) and forge-honors.js (earn dates).
 *
 * DATA ONLY — no React here. Each screen attaches glyphs from the string `icon` /
 * event `type` via its own ForgeSymbols factory, exactly like forge-honors /
 * forge-legacy-pins, so this file stays framework-free.
 *
 * Screens read:
 *   ForgeChapters.forTenure(t)      -> [chapter]  newest-first (active first, then sealed)
 *   ForgeChapters.currentChapter(t) -> the active chapter, or null
 *   ForgeChapters.sealed(t)         -> [chapter] sealed only, newest-first
 *   ForgeChapters.byId(id, t)       -> one chapter record
 *   ForgeChapters.latestSealed(t)   -> most-recently sealed chapter, or null
 *   ForgeChapters.timelineFor(t)    -> [chapter] shaped for the Legacy Timeline rail
 *
 * Timeline event `type` is one of the 10 canonical TimelineRow types:
 *   chapter-open · chapter-seal · rank · honor · goal · pr ·
 *   program-start · program-grad · accomplishment · photo
 */
(function () {

  // ── y3 · Established veteran (Ada Ridge, forging since 2023) ────────────────
  // active Chapter III + two sealed chapters. This is the app's existing seed depth.
  var CH_REBUILD = {
    id: 'rebuild', no: 'Chapter III', name: 'The Rebuild', status: 'active',
    creed: 'Every workout becomes part of this chapter.',
    range: 'Started Mar 4, 2026', summary: '22 workouts · 3 honors',
    goal: { label: 'Squat 405 lb', value: '335 / 405 lb', pct: '82%', done: 335, max: 405, expected: 'Expected by Oct 2026' },
    progress: { count: '22', since: '6 weeks into this chapter' },
    notes: 'The injury taught me patience. Rebuilding the base before chasing the numbers again. Every session is a deposit.',
    reflection: null, memories: [],
    secondary: [
      { name: 'Bench Press 275 lb', right: '82%' },
      { name: 'Chin-ups × 12', right: '55%' },
      { name: 'Daily mobility', right: 'On track' },
    ],
    programs: [
      { name: 'Powerbuilding II', icon: 'dumbbell', done: 22, total: 32, next: 'Week 6 · Day 2 · Lower A' },
      { name: 'Base Conditioning', icon: 'shoe', done: 6, total: 12, next: 'Week 3 · Day 1' },
    ],
    honors: [
      { icon: 'laurel', label: 'The Unbroken', date: 'Apr 2' },
      { icon: 'spark',  label: 'First PR',     date: 'Mar 20' },
      { icon: 'shield', label: 'Early Riser',  date: 'Mar 12' },
    ],
    media: [
      { title: 'Week 1 Check-in', kind: 'Photo', mediaId: 'chap-rb-1' },
      { title: 'Squat 335 PR',    kind: 'Clip',  mediaId: 'chap-rb-2' },
      { title: 'Morning Session', kind: 'Photo', mediaId: 'chap-rb-3' },
    ],
    events: [
      { type: 'honor',         title: 'Earned \u201CThe Unbroken\u201D', sub: '30 sessions · no missed week', date: 'Apr 2',  year: 2026 },
      { type: 'pr',            title: 'Squat PR · 335 lb',                sub: 'Halfway to the goal',          date: 'Mar 20', year: 2026 },
      { type: 'program-start', title: 'Started Powerbuilding II',        sub: '10-week program',              date: 'Mar 6',  year: 2026 },
      { type: 'chapter-open',  title: 'Began The Rebuild',               sub: 'The Rebuild',                  date: 'Mar 4',  year: 2026 },
    ],
  };

  var CH_IRONBORN = {
    id: 'ironborn', no: 'Chapter II', name: 'Ironborn', status: 'sealed',
    creed: 'The chapter where the work stopped being a decision.',
    range: 'Sep 2025 – Mar 2026', summary: '48 workouts · 4 honors',
    goal: { label: 'Deadlift 405 lb' },
    outcome: {
      goalLabel: 'Deadlift 405 lb', date: 'Oct 2, 2025', headline: 'Achieved 405 lb Deadlift',
      stats: [ { v: '48', l: 'Workouts' }, { v: '2', l: 'Programs completed' }, { v: '4', l: 'Honors' }, { v: '6 months', l: 'Duration' } ],
    },
    reflection: {
      body: 'When I started this chapter I didn\u2019t believe I could pull over 350. Now 405 feels normal. The number was never the point — becoming the person who trains like this was.',
      meta: 'Written Oct 2, 2025',
    },
    memories: [
      { note: 'Came back to this the night I won my first meet. Everything I needed was already here.', added: 'Added May 2, 2026 · 2 months after sealing' },
      { note: 'Showed my brother the 405 clip. He starts training next week.', added: 'Added Apr 10, 2026 · 5 weeks after sealing' },
    ],
    secondary: [
      { name: 'Bench Press 275 lb', right: 'Feb 12',       achieved: true },
      { name: 'Sub-25 min 5K',      right: 'Not achieved', achieved: false },
    ],
    programs: [
      { name: 'Nine Weeks Out', icon: 'dumbbell', meta: 'Peaking block',                          status: 'Graduated',   statusKind: 'grad' },
      { name: 'Engine Base',    icon: 'shoe',     meta: 'Still in progress when chapter ended',   status: 'In progress', statusKind: 'carry' },
    ],
    honors: [
      { icon: 'laurel', label: 'Century',  date: 'Oct 15' },
      { icon: 'shield', label: 'Ironwill', date: 'Sep 30' },
    ],
    media: [
      { title: '405 Pull',     kind: 'Clip',  mediaId: 'chap-ib-1' },
      { title: '12 Weeks Out', kind: 'Photo', mediaId: 'chap-ib-2' },
      { title: 'Meet Day',     kind: 'Photo', mediaId: 'chap-ib-3' },
    ],
    events: [
      { type: 'chapter-seal',  title: 'Sealed Ironborn',              sub: '48 workouts · 4 honors',    date: 'Mar 1',  year: 2026 },
      { type: 'honor',         title: 'Earned \u201CCentury\u201D',   sub: '100 sessions logged',       date: 'Oct 15', year: 2025 },
      { type: 'program-grad',  title: 'Graduated Nine Weeks Out',     sub: 'Peaking block',             date: 'Oct 10', year: 2025 },
      { type: 'goal',          title: 'Achieved 405 lb Deadlift',     sub: '',                          date: 'Oct 2',  year: 2025 },
      { type: 'pr',            title: 'Deadlift PR · 405 lb',         sub: 'The number, finally moved', date: 'Oct 2',  year: 2025 },
      { type: 'chapter-open',  title: 'Began Ironborn',               sub: 'Ironborn',                  date: 'Sep 4',  year: 2025 },
    ],
  };

  var CH_FOUNDATION = {
    id: 'foundation', no: 'Chapter I', name: 'Foundation', status: 'sealed',
    creed: 'Where it began. The first honest month of work.',
    range: 'May 2025 – Aug 2025', summary: '15 workouts · 2 honors',
    goal: { label: 'Train 3× a week for a month' },
    outcome: {
      goalLabel: 'Train 3× a week for a month', date: 'Jun 10, 2025', headline: 'Built the first real habit',
      stats: [ { v: '15', l: 'Workouts' }, { v: '1', l: 'Program completed' }, { v: '2', l: 'Honors' }, { v: '3 months', l: 'Duration' } ],
    },
    reflection: {
      body: 'I almost quit in week two. I didn\u2019t. That\u2019s the whole chapter — I just kept showing up until it wasn\u2019t a question anymore.',
      meta: 'Written Aug 20, 2025',
    },
    memories: [],
    secondary: [
      { name: 'First 5K under 30 min', right: 'Jul 12', achieved: true },
    ],
    programs: [
      { name: 'Starting Strength', icon: 'dumbbell', meta: 'First program, start to finish', status: 'Graduated', statusKind: 'grad' },
    ],
    honors: [
      { icon: 'shield', label: 'First Iron', date: 'Aug 1' },
      { icon: 'spark',  label: 'First 5K',   date: 'Jul 12' },
    ],
    media: [
      { title: 'First progress photo', kind: 'Photo', mediaId: 'tl-photo-1' },
      { title: 'First 5K finish',      kind: 'Photo', mediaId: 'chap-fd-2' },
    ],
    events: [
      { type: 'chapter-seal',   title: 'Sealed Foundation',      sub: '15 workouts · 2 honors',       date: 'Aug 22', year: 2025 },
      { type: 'rank',           title: 'Reached Foundation II',  sub: 'The Flame',                    date: 'Aug 20', year: 2025 },
      { type: 'accomplishment', title: 'First 5K · 28:40',       sub: 'First race, start to finish',  date: 'Jul 12', year: 2025 },
      { type: 'photo',          title: 'First progress photo',   sub: '',                             date: 'May 5',  year: 2025, mediaId: 'tl-photo-1' },
      { type: 'chapter-open',   title: 'Began Foundation',       sub: 'Your first chapter',           date: 'May 3',  year: 2025 },
    ],
  };

  // ── y1 · ~1 year in (Craftsman, forging since 2025) ────────────────────────
  // A single active chapter, no sealed history yet. Milestones line up with
  // forge-honors y1 seed (First Iron, bench 135, squat 225) and y1 lifts.
  var CH_FIRSTFORGE = {
    id: 'firstforge', no: 'Chapter I', name: 'First Forge', status: 'active',
    creed: 'Learning what my body will do when I ask it honestly.',
    range: 'Started Feb 3, 2025', summary: '31 workouts · 4 honors',
    goal: { label: 'Squat 315 lb', value: '300 / 315 lb', pct: '95%', done: 300, max: 315, expected: 'Expected by Apr 2026' },
    progress: { count: '31', since: '12 months of steady work' },
    notes: 'No idea what I was doing at the start. Now the barbell feels like mine. Still chasing the first three plates.',
    reflection: null, memories: [],
    secondary: [
      { name: 'Bench Press 225 lb', right: '90%' },
      { name: 'First pull-up × 5',  right: 'Done' },
    ],
    programs: [
      { name: 'Foundations of Strength', icon: 'dumbbell', done: 24, total: 24, next: 'Program complete' },
      { name: 'Couch to 5K',             icon: 'shoe',     done: 7,  total: 9,  next: 'Week 8 · Run 1' },
    ],
    honors: [
      { icon: 'shield', label: 'First Iron', date: 'Feb 3' },
      { icon: 'spark',  label: 'First PR',   date: 'Jun 15' },
      { icon: 'laurel', label: '90 Days',    date: 'May 4' },
    ],
    media: [
      { title: 'Day One',      kind: 'Photo', mediaId: 'chap-ff-1' },
      { title: '225 Squat',    kind: 'Clip',  mediaId: 'chap-ff-2' },
      { title: '90-Day Check', kind: 'Photo', mediaId: 'chap-ff-3' },
    ],
    events: [
      { type: 'pr',            title: 'Squat PR · 225 lb',          sub: 'Two plates',                 date: 'Sep 2',  year: 2025 },
      { type: 'pr',            title: 'Bench PR · 135 lb',          sub: 'First plate on each side',   date: 'Jun 15', year: 2025 },
      { type: 'honor',         title: 'Earned \u201C90 Days\u201D', sub: '90 days of training',        date: 'May 4',  year: 2025 },
      { type: 'goal',          title: 'First goal achieved',        sub: 'Train 3× a week for a month',date: 'Mar 20', year: 2025 },
      { type: 'chapter-open',  title: 'Began First Forge',          sub: 'Your first chapter',         date: 'Feb 3',  year: 2025 },
    ],
  };

  // ── new · day one (Foundation I, forging since 2026) ───────────────────────
  // A nascent active chapter. Almost nothing has happened yet — the Legacy hub
  // shows its empty state; this is what Chapter Detail shows if reached.
  var CH_DAYONE = {
    id: 'dayone', no: 'Chapter I', name: 'Foundation', status: 'active',
    creed: 'Every workout becomes part of this chapter.',
    range: 'Started this week', summary: '1 workout',
    goal: { label: 'Set your first goal', value: '—', pct: '0%', done: 0, max: 1, expected: 'No target yet' },
    progress: { count: '1', since: 'You just started' },
    notes: 'This is where it starts. Come back and write what this chapter meant.',
    reflection: null, memories: [],
    secondary: [],
    programs: [],
    honors: [],
    media: [],
    events: [
      { type: 'chapter-open', title: 'Began Foundation', sub: 'Your first chapter', date: 'Today', year: 2026 },
    ],
  };

  var TIERS = {
    'new': [ CH_DAYONE ],
    'y1':  [ CH_FIRSTFORGE ],
    'y3':  [ CH_REBUILD, CH_IRONBORN, CH_FOUNDATION ],
  };

  function tenure() {
    try { if (window.ForgeUser && window.ForgeUser.tenure) return window.ForgeUser.tenure(); } catch (e) {}
    return 'y3';
  }
  function forTenure(t) {
    t = t || tenure();
    return (TIERS[t] || TIERS.y3).slice();
  }
  function currentChapter(t) {
    var list = forTenure(t);
    for (var i = 0; i < list.length; i++) if (list[i].status === 'active') return list[i];
    return null;
  }
  function sealed(t) {
    return forTenure(t).filter(function (c) { return c.status === 'sealed'; });
  }
  function latestSealed(t) {
    var s = sealed(t);
    return s.length ? s[0] : null;
  }
  function byId(id, t) {
    var list = forTenure(t);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  // Legacy-Timeline shape: newest-first chapters, each carrying its ordered events.
  function timelineFor(t) {
    return forTenure(t).map(function (c) {
      return {
        id: c.id, name: c.no + ' · ' + c.name, status: c.status === 'active' ? 'Active' : 'Sealed',
        active: c.status === 'active', summary: c.summary, events: c.events.slice(),
      };
    });
  }

  window.ForgeChapters = {
    tenure: tenure,
    forTenure: forTenure,
    currentChapter: currentChapter,
    sealed: sealed,
    latestSealed: latestSealed,
    byId: byId,
    timelineFor: timelineFor,
  };
})();
