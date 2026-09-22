/*
 * Forge Legacy — Programs (mock data)
 * Single source of truth for every Program screen (W-1/W-2/W-3/Home Active-Program card…).
 * Representative demo content — NOT final production copy.
 *
 * INVARIANT: exactly one program may be state:'active' at a time (the one-Active rule).
 *            ForgePrograms.active() returns it (and warns if the invariant is violated).
 *
 * Program states: 'preview' (Forge catalog, not started) | 'future' (saved to Upcoming)
 *                 | 'active' | 'graduated' | 'ended-early'.
 *
 * Usage
 *   ForgePrograms.active()        -> the single active program (or null)
 *   ForgePrograms.upcoming()      -> future programs
 *   ForgePrograms.legacy()        -> graduated + ended-early (unified)
 *   ForgePrograms.forgeCatalog()  -> the browsable Forge programs (state 'preview')
 *   ForgePrograms.byFamily()      -> { [family]: Program[] } grouping of the catalog
 *   ForgePrograms.byId(id) · .all() · .families() · .successorOf(id)
 */
(function (root) {
  var FAMILIES = ['Strength', 'Muscle Building', 'Running', 'Conditioning', 'Full Body & Home', 'Mobility'];

  // Representative repeating weekly pattern per family (schedule = one week's slots; runs durationWeeks).
  var PATTERNS = {
    'Strength': [
      { name: 'Lower Body A', focus: 'Squat' }, { name: 'Upper Body A', focus: 'Bench' },
      { name: 'Lower Body B', focus: 'Deadlift' }, { name: 'Upper Body B', focus: 'Press' },
    ],
    'Muscle Building': [
      { name: 'Push', focus: 'Chest · Shoulders · Triceps' }, { name: 'Pull', focus: 'Back · Biceps' },
      { name: 'Legs', focus: 'Quads · Hamstrings' },
    ],
    'Running': [
      { name: 'Easy Run', focus: 'Zone 2' }, { name: 'Tempo', focus: 'Threshold' }, { name: 'Long Run', focus: 'Endurance' },
    ],
    'Conditioning': [
      { name: 'Engine', focus: 'Intervals' }, { name: 'Circuit', focus: 'Full body' }, { name: 'Metcon', focus: 'Mixed modal' },
    ],
    'Full Body & Home': [
      { name: 'Full Body A', focus: 'Push emphasis' }, { name: 'Full Body B', focus: 'Pull emphasis' }, { name: 'Full Body C', focus: 'Legs emphasis' },
    ],
    'Mobility': [
      { name: 'Hips & Spine', focus: 'Flow' }, { name: 'Recovery Flow', focus: 'Restore' }, { name: 'Movement Prep', focus: 'Activate' },
    ],
  };

  function P(o) {
    var totalWorkouts = o.totalWorkouts != null ? o.totalWorkouts : (o.durationWeeks * o.workoutsPerWeek);
    return Object.assign({
      source: 'forge', state: 'preview', progress: null, nextWorkout: null,
      successorProgramId: null, startedAt: null, graduatedAt: null, chapterId: null,
      equipment: [], goal: '', description: '',
      schedule: PATTERNS[o.family] || [],
    }, o, { totalWorkouts: totalWorkouts });
  }

  // ---- 24 Forge catalog programs · 4 per family · state 'preview' ----
  var CATALOG = [
    // Strength
    P({ id: 'strength-foundation-1', name: 'Strength Foundation I', family: 'Strength', difficulty: 'Beginner', durationWeeks: 8, workoutsPerWeek: 3, goal: 'Build a full-body strength base', equipment: ['Barbell', 'Rack'], description: 'Master the fundamental lifts and lay a base of strength everything else is built on.', successorProgramId: 'strength-powerbuilding-1', featured: true }),
    P({ id: 'strength-powerbuilding-1', name: 'Powerbuilding I', family: 'Strength', difficulty: 'Intermediate', durationWeeks: 10, workoutsPerWeek: 4, goal: 'Strength and size together', equipment: ['Barbell', 'Dumbbells'], description: 'Heavy compound work paired with deliberate accessory volume — get stronger and bigger at once.' }),
    P({ id: 'strength-531', name: '5·3·1 Forged', family: 'Strength', difficulty: 'Advanced', durationWeeks: 12, workoutsPerWeek: 4, goal: 'Peak your main lifts', equipment: ['Barbell', 'Rack'], description: 'A percentage-driven peaking cycle that sharpens your squat, bench, and deadlift to new maxes.' }),
    P({ id: 'strength-barbell-mastery', name: 'Barbell Mastery', family: 'Strength', difficulty: 'Intermediate', durationWeeks: 8, workoutsPerWeek: 3, goal: 'Own the big four lifts', equipment: ['Barbell'], description: 'Relentless technical work on the big four, until the barbell moves the way it should.' }),
    // Muscle Building
    P({ id: 'mb-hypertrophy-block', name: 'Hypertrophy Block', family: 'Muscle Building', difficulty: 'Intermediate', durationWeeks: 8, workoutsPerWeek: 4, goal: 'Maximize muscle growth', equipment: ['Dumbbells', 'Machines'], description: 'A high-volume block engineered for one thing: visible, measurable muscle.', featured: true }),
    P({ id: 'mb-upper-lower', name: 'Upper / Lower Split', family: 'Muscle Building', difficulty: 'Intermediate', durationWeeks: 8, workoutsPerWeek: 4, goal: 'Balanced size across four days', equipment: ['Barbell', 'Dumbbells'], description: 'A four-day upper / lower rotation that balances volume and recovery for steady growth.' }),
    P({ id: 'mb-ppl', name: 'Push Pull Legs', family: 'Muscle Building', difficulty: 'Intermediate', durationWeeks: 12, workoutsPerWeek: 5, goal: 'High-volume classic split', equipment: ['Barbell', 'Dumbbells', 'Machines'], description: 'The classic push / pull / legs split at five days a week — high volume, full coverage.' }),
    P({ id: 'mb-arms-aesthetics', name: 'Arms & Aesthetics', family: 'Muscle Building', difficulty: 'Beginner', durationWeeks: 6, workoutsPerWeek: 3, goal: 'Arms, shoulders, and detail', equipment: ['Dumbbells', 'Cables'], description: 'Focused, high-frequency work for arms, shoulders, and the details that finish a physique.' }),
    // Running
    P({ id: 'run-c25k', name: 'Couch to 5K', family: 'Running', difficulty: 'Beginner', durationWeeks: 8, workoutsPerWeek: 3, goal: 'Run 5K without stopping', equipment: ['Running shoes'], description: 'Structured walk-run intervals that carry a first-time runner to a continuous 5K.', successorProgramId: 'run-10k', featured: true }),
    P({ id: 'run-10k', name: '10K Builder', family: 'Running', difficulty: 'Intermediate', durationWeeks: 8, workoutsPerWeek: 4, goal: 'Finish a strong 10K', equipment: ['Running shoes'], description: 'Build the endurance and pace discipline to finish a strong, even 10K.' }),
    P({ id: 'run-half-base', name: 'Half-Marathon Base', family: 'Running', difficulty: 'Intermediate', durationWeeks: 12, workoutsPerWeek: 4, goal: 'Build toward 13.1', equipment: ['Running shoes'], description: 'A patient aerobic base block that prepares your legs and lungs for 13.1 miles.' }),
    P({ id: 'run-speed-tempo', name: 'Speed & Tempo', family: 'Running', difficulty: 'Advanced', durationWeeks: 6, workoutsPerWeek: 4, goal: 'Sharpen race pace', equipment: ['Running shoes', 'Track'], description: 'Track intervals and threshold work to raise your top-end speed and race pace.' }),
    // Conditioning
    P({ id: 'cond-engine', name: 'Engine Builder', family: 'Conditioning', difficulty: 'Intermediate', durationWeeks: 6, workoutsPerWeek: 4, goal: 'Raise your aerobic ceiling', equipment: ['Rower', 'Bike'], description: 'Machine-based interval work that expands your aerobic engine session by session.' }),
    P({ id: 'cond-hiit', name: 'HIIT Foundations', family: 'Conditioning', difficulty: 'Beginner', durationWeeks: 4, workoutsPerWeek: 3, goal: 'An intro to intervals', equipment: ['Bodyweight'], description: 'Short, uncompromising interval sessions that build work capacity from the ground up.' }),
    P({ id: 'cond-circuit', name: 'Circuit Forge', family: 'Conditioning', difficulty: 'Intermediate', durationWeeks: 6, workoutsPerWeek: 4, goal: 'Strength-endurance circuits', equipment: ['Dumbbells', 'Kettlebell'], description: 'Loaded circuits that blur the line between strength and conditioning.' }),
    P({ id: 'cond-metcon', name: 'Metcon Weekly', family: 'Conditioning', difficulty: 'Advanced', durationWeeks: 8, workoutsPerWeek: 5, goal: 'Mixed-modal conditioning', equipment: ['Barbell', 'Rower'], description: 'Varied, high-intensity metabolic conditioning for athletes who want to be tested.' }),
    // Full Body & Home
    P({ id: 'fbh-bodyweight-basics', name: 'Bodyweight Basics', family: 'Full Body & Home', difficulty: 'Beginner', durationWeeks: 6, workoutsPerWeek: 3, goal: 'Strength with no gear', equipment: ['Bodyweight'], description: 'Serious strength, built with nothing but your bodyweight and intent.' }),
    P({ id: 'fbh-home-minimalist', name: 'Home Minimalist', family: 'Full Body & Home', difficulty: 'Beginner', durationWeeks: 8, workoutsPerWeek: 3, goal: 'One pair of dumbbells', equipment: ['Dumbbells'], description: 'A full, progressive program that asks for a single pair of dumbbells and consistency.' }),
    P({ id: 'fbh-full-body-3', name: 'Full-Body 3-Day', family: 'Full Body & Home', difficulty: 'Intermediate', durationWeeks: 8, workoutsPerWeek: 3, goal: 'Efficient full-body training', equipment: ['Barbell', 'Dumbbells'], description: 'Three efficient, full-body sessions a week — built for real schedules.' }),
    P({ id: 'fbh-dumbbell-only', name: 'Dumbbell Only', family: 'Full Body & Home', difficulty: 'Intermediate', durationWeeks: 6, workoutsPerWeek: 4, goal: 'A complete dumbbell program', equipment: ['Dumbbells'], description: 'A complete training block that never needs more than a set of dumbbells.' }),
    // Mobility
    P({ id: 'mob-daily', name: 'Daily Mobility', family: 'Mobility', difficulty: 'Beginner', durationWeeks: 4, workoutsPerWeek: 5, goal: 'Move better every day', equipment: ['Mat'], description: 'Short daily practice that keeps you moving well and feeling ready.' }),
    P({ id: 'mob-hip-spine', name: 'Hip & Spine', family: 'Mobility', difficulty: 'Beginner', durationWeeks: 6, workoutsPerWeek: 4, goal: 'Unlock hips and back', equipment: ['Mat', 'Band'], description: 'Targeted mobility for the hips and spine that carry every lift you make.' }),
    P({ id: 'mob-recovery-flow', name: 'Recovery Flow', family: 'Mobility', difficulty: 'Beginner', durationWeeks: 4, workoutsPerWeek: 3, goal: 'Active recovery', equipment: ['Mat'], description: 'Gentle, restorative flows for the days between the hard ones.' }),
    P({ id: 'mob-movement-prep', name: 'Movement Prep', family: 'Mobility', difficulty: 'Intermediate', durationWeeks: 4, workoutsPerWeek: 4, goal: 'Prime for training', equipment: ['Mat', 'Band'], description: 'Pre-training routines that prime your joints to move well under load.' }),
  ];

  // ---- The athlete's own program records (states beyond 'preview') ----
  var USER = [
    P({ id: 'usr-active-powerbuilding', name: 'Powerbuilding II', family: 'Strength', difficulty: 'Intermediate', durationWeeks: 8, workoutsPerWeek: 4, totalWorkouts: 32, goal: 'Strength and size together', equipment: ['Barbell', 'Dumbbells'], description: 'Build maximal strength while adding size through progressive overload and carefully selected accessory work.', state: 'active', structure: 'upper_lower', theme: 'powerbuilding', progress: { completed: 22, total: 32 }, nextWorkout: { name: 'Lower Body A', focus: 'Squat', modality: 'strength', split: 'lower', exerciseCount: 6 }, startedAt: '2026-02-24', chapterId: 'ch-3' }),

    P({ id: 'usr-future-hypertrophy', name: 'Hypertrophy Block', family: 'Muscle Building', difficulty: 'Intermediate', durationWeeks: 8, workoutsPerWeek: 4, goal: 'Maximize muscle growth', equipment: ['Dumbbells', 'Machines'], description: 'Saved for after the current strength phase.', state: 'future' }),
    P({ id: 'usr-future-half', name: 'Half-Marathon Base', family: 'Running', difficulty: 'Intermediate', durationWeeks: 12, workoutsPerWeek: 4, goal: 'Build toward 13.1', equipment: ['Running shoes'], description: 'Queued for the spring.', state: 'future' }),
    P({ id: 'usr-future-engine', name: 'Engine Builder', family: 'Conditioning', difficulty: 'Intermediate', durationWeeks: 6, workoutsPerWeek: 4, goal: 'Raise your aerobic ceiling', equipment: ['Rower', 'Bike'], description: 'On deck.', state: 'future' }),

    P({ id: 'usr-grad-foundation', name: 'Strength Foundation I', family: 'Strength', difficulty: 'Beginner', durationWeeks: 8, workoutsPerWeek: 3, totalWorkouts: 24, goal: 'Build a full-body strength base', equipment: ['Barbell', 'Rack'], description: 'Where it started.', state: 'graduated', progress: { completed: 24, total: 24 }, startedAt: '2025-12-01', graduatedAt: '2026-02-02', chapterId: 'ch-2', successorProgramId: 'strength-powerbuilding-1', log: [ { date: '2025-12-02', week: 1, session: 'Full Body A', entries: [ { name: 'Back Squat', sets: [{w:95,r:5},{w:95,r:5},{w:95,r:5}] }, { name: 'Bench Press', sets: [{w:75,r:5},{w:75,r:5},{w:75,r:5}] }, { name: 'Barbell Row', sets: [{w:75,r:5},{w:75,r:5},{w:75,r:5}] } ] }, { date: '2025-12-30', week: 4, session: 'Full Body B', entries: [ { name: 'Back Squat', sets: [{w:135,r:5},{w:135,r:5},{w:135,r:5}] }, { name: 'Overhead Press', sets: [{w:65,r:5},{w:65,r:5},{w:65,r:5}] }, { name: 'Deadlift', sets: [{w:185,r:5}] } ] }, { date: '2026-01-27', week: 8, session: 'Full Body C', entries: [ { name: 'Back Squat', sets: [{w:170,r:5},{w:170,r:5},{w:170,r:5}] }, { name: 'Bench Press', sets: [{w:120,r:5},{w:120,r:5},{w:120,r:5}] }, { name: 'Deadlift', sets: [{w:215,r:5}] } ] } ] }),
    P({ id: 'usr-grad-c25k', name: 'Couch to 5K', family: 'Running', difficulty: 'Beginner', durationWeeks: 8, workoutsPerWeek: 3, totalWorkouts: 24, goal: 'Run 5K without stopping', equipment: ['Running shoes'], description: 'First running goal, cleared.', state: 'graduated', progress: { completed: 24, total: 24 }, startedAt: '2025-10-06', graduatedAt: '2025-12-01', chapterId: 'ch-2', log: [ { date: '2025-10-07', week: 1, session: 'Run / Walk', entries: [ { name: 'Intervals', note: 'Run 60s · walk 90s × 8', result: '2.1 mi · 30:00' } ] }, { date: '2025-11-04', week: 5, session: 'Run / Walk', entries: [ { name: 'Intervals', note: 'Run 5 min · walk 2 min × 4', result: '3.1 mi · 32:10' } ] }, { date: '2025-11-28', week: 8, session: 'Continuous', entries: [ { name: 'Steady run', note: 'No walk breaks', result: '3.1 mi · 29:40' } ] } ] }),
    P({ id: 'usr-ended-ppl', name: 'Push Pull Legs', family: 'Muscle Building', difficulty: 'Intermediate', durationWeeks: 12, workoutsPerWeek: 5, totalWorkouts: 60, goal: 'High-volume classic split', equipment: ['Barbell', 'Dumbbells', 'Machines'], description: 'Cut short to switch focus.', state: 'ended-early', progress: { completed: 9, total: 60 }, startedAt: '2026-01-05', chapterId: 'ch-2', log: [ { date: '2026-01-05', week: 1, session: 'Push', entries: [ { name: 'Bench Press', sets: [{w:135,r:8},{w:135,r:8},{w:135,r:8}] }, { name: 'Overhead Press', sets: [{w:75,r:8},{w:75,r:8}] }, { name: 'Cable Fly', sets: [{w:30,r:12},{w:30,r:12},{w:30,r:12}] } ] }, { date: '2026-01-07', week: 1, session: 'Pull', entries: [ { name: 'Deadlift', sets: [{w:225,r:5}] }, { name: 'Barbell Row', sets: [{w:115,r:8},{w:115,r:8},{w:115,r:8}] }, { name: 'Lat Pulldown', sets: [{w:120,r:10},{w:120,r:10},{w:120,r:10}] } ] }, { date: '2026-01-09', week: 1, session: 'Legs', entries: [ { name: 'Back Squat', sets: [{w:155,r:8},{w:155,r:8},{w:155,r:8}] }, { name: 'Romanian Deadlift', sets: [{w:135,r:10},{w:135,r:10}] }, { name: 'Leg Press', sets: [{w:270,r:12},{w:270,r:12}] } ] } ] }),
    P({ id: 'custom-my-ppl', name: 'My Push / Pull / Legs', family: 'Muscle Building', difficulty: 'Intermediate', durationWeeks: 8, workoutsPerWeek: 5, goal: 'My own split, dialed in', equipment: ['Barbell', 'Dumbbells', 'Machines'], description: 'A personal push / pull / legs build tuned to your lifts and your week.', source: 'custom', state: 'preview' }),
    P({ id: 'custom-garage-strength', name: 'Garage Strength', family: 'Strength', difficulty: 'Beginner', durationWeeks: 6, workoutsPerWeek: 3, goal: 'Barbell basics at home', equipment: ['Barbell', 'Rack'], description: 'A simple home-barbell plan you put together.', source: 'custom', state: 'preview' }),
    P({ id: 'shared-marcus-5x5', name: '5 × 5 Linear', family: 'Strength', difficulty: 'Intermediate', durationWeeks: 12, workoutsPerWeek: 3, goal: 'Add weight every session', equipment: ['Barbell', 'Rack'], description: 'Classic linear progression across the main barbell lifts.', source: 'forge', state: 'preview', sharedBy: 'Marcus L' }),
  ];

  var ALL = CATALOG.concat(USER);
  var INDEX = {}; ALL.forEach(function (p) { INDEX[p.id] = p; });

  function byId(id) { return INDEX[id] || null; }
  function byState(s) { return ALL.filter(function (p) { return p.state === s; }); }

  function active() {
    var a = byState('active');
    if (a.length > 1 && typeof console !== 'undefined') console.warn('[ForgePrograms] one-active invariant violated: ' + a.length + ' active programs');
    return a[0] || null;
  }
  function upcoming() { return byState('future'); }
  function legacy() { return ALL.filter(function (p) { return p.state === 'graduated' || p.state === 'ended-early'; }); }
  function mine() { return ALL.filter(function (p) { return p.source === 'custom' && !p.sharedBy; }); }
  function shared() { return ALL.filter(function (p) { return !!p.sharedBy; }); }
  function forgeCatalog() { return CATALOG.filter(function (p) { return p.state === 'preview'; }); }
  function byFamily() {
    var g = {}; FAMILIES.forEach(function (f) { g[f] = []; });
    forgeCatalog().forEach(function (p) { (g[p.family] = g[p.family] || []).push(p); });
    return g;
  }
  function featured() { return CATALOG.filter(function (p) { return p.featured; }); }
  function successorOf(id) { var p = byId(id); return p && p.successorProgramId ? byId(p.successorProgramId) : null; }

  // ---- Full logged-history generator: complete week → day → exercise → set tree ----
  var EX_TEMPLATES = {
    'Strength': [
      { name: 'Back Squat', sets: 4, reps: 5, base: 95, inc: 10 },
      { name: 'Bench Press', sets: 4, reps: 6, base: 75, inc: 5 },
      { name: 'Deadlift', sets: 3, reps: 5, base: 135, inc: 15 },
      { name: 'Barbell Row', sets: 3, reps: 8, base: 80, inc: 5 },
    ],
    'Muscle Building': [
      { name: 'Incline DB Press', sets: 4, reps: 10, base: 45, inc: 5 },
      { name: 'Cable Row', sets: 4, reps: 12, base: 100, inc: 5 },
      { name: 'Lateral Raise', sets: 3, reps: 15, base: 15, inc: 2.5 },
      { name: 'Barbell Curl', sets: 3, reps: 12, base: 50, inc: 5 },
    ],
    'Conditioning': [
      { name: 'Row Intervals', sets: 6, reps: 250, unit: 'm' },
      { name: 'Kettlebell Swing', sets: 4, reps: 20, base: 35, inc: 5 },
      { name: 'Burpees', sets: 3, reps: 15, unit: 'reps' },
    ],
    'Full Body & Home': [
      { name: 'Goblet Squat', sets: 3, reps: 12, base: 40, inc: 5 },
      { name: 'Push-up', sets: 3, reps: 15, unit: 'reps' },
      { name: 'Dumbbell Row', sets: 3, reps: 12, base: 40, inc: 5 },
      { name: 'Plank', sets: 3, reps: 45, unit: 's' },
    ],
    'Mobility': [
      { name: 'Hip Flow', sets: 1, reps: 5, unit: 'min' },
      { name: 'Spine Mobility', sets: 1, reps: 5, unit: 'min' },
      { name: 'Breathing', sets: 1, reps: 3, unit: 'min' },
    ],
  };

  function round5(x) { return Math.round(x / 5) * 5; }
  function fmtLogDate(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function runEffort(w, totalWeeks) {
    var frac = totalWeeks > 1 ? w / (totalWeeks - 1) : 1;
    var dist = (1.5 + frac * 1.6).toFixed(1);
    var mins = Math.round(30 - frac * 4);
    var note = frac < 0.4 ? 'Run 60s · walk 90s intervals' : frac < 0.75 ? 'Run 5 min · walk 2 min intervals' : 'Continuous — no walk breaks';
    return { name: 'Run', sets: [], result: dist + ' mi · ' + mins + ':00', note: note };
  }

  // Full logged history for a completed / in-progress program (drives the W-3 Record view).
  function fullLog(p) {
    if (!p || !p.progress) return [];
    var wpw = p.workoutsPerWeek || 3;
    var totalW = p.durationWeeks || 1;
    var done = p.progress.completed || 0;
    var days = (p.schedule && p.schedule.length) ? p.schedule : [{ name: 'Session', focus: '' }];
    var isRun = p.family === 'Running';
    var start = new Date((p.startedAt || '2025-01-01') + 'T00:00:00');
    var tmpl = EX_TEMPLATES[p.family] || EX_TEMPLATES['Strength'];
    // active + graduated show the whole program (completed = logged, upcoming = plan);
    // ended-early shows only what was actually done.
    var full = (p.state === 'active' || p.state === 'graduated');
    var wCount = full ? totalW : Math.ceil(done / wpw);
    var weeks = [];
    for (var w = 0; w < wCount; w++) {
      var wk = { week: w + 1, days: [] };
      for (var d = 0; d < wpw; d++) {
        var idx = w * wpw + d;
        if (!full && idx >= done) break; // ended-early: stop at the last logged day
        var completed = idx < done;
        var day = days[d % days.length];
        var date = new Date(start.getTime() + (w * 7 + d * 2) * 86400000);
        var exercises;
        if (isRun) {
          var eff = runEffort(w, totalW);
          exercises = completed
            ? [{ name: 'Run', sets: [], result: eff.result, note: eff.note, planned: '' }]
            : [{ name: 'Run', sets: [], result: '', note: '', planned: eff.note }];
        } else {
          exercises = tmpl.map(function (t) {
            if (completed) {
              var sets = [];
              for (var s = 0; s < t.sets; s++) {
                var val;
                if (t.unit === 'reps') val = t.reps + ' reps';
                else if (t.unit === 's') val = t.reps + 's';
                else if (t.unit === 'min') val = t.reps + ' min';
                else if (t.unit === 'm') val = t.reps + ' m';
                else val = round5(t.base + w * t.inc) + ' lb × ' + t.reps;
                sets.push({ label: 'Set ' + (s + 1), val: val, w: (t.unit ? 0 : round5(t.base + w * t.inc)), r: (t.unit ? 0 : t.reps) });
              }
              return { name: t.name, sets: sets, result: '', note: '', planned: '' };
            }
            var scheme = t.sets + ' × ' + t.reps + (t.unit && t.unit !== 'reps' ? ' ' + t.unit : '');
            return { name: t.name, sets: [], result: '', note: '', planned: scheme };
          });
        }
        wk.days.push({ name: day.name, focus: day.focus, date: completed ? fmtLogDate(date) : '', workoutNum: idx + 1, completed: completed, exercises: exercises });
      }
      weeks.push(wk);
    }
    return weeks;
  }

  // ---- Aggregate stats from the logged history (completed sessions only) ----
  function stats(p) {
    if (!p || !p.progress) return null;
    var fl = fullLog(p);
    var isRun = p.family === 'Running';
    var vol = 0, setCount = 0, workouts = 0, heaviest = 0, heaviestName = '', dist = 0, runs = 0;
    var weeks = [];
    fl.forEach(function (wk) {
      var wv = 0, ws = 0, wd = 0, wc = false;
      wk.days.forEach(function (day) {
        if (!day.completed) return;
        wc = true; workouts++;
        if (isRun) {
          var m = ((day.exercises[0] && day.exercises[0].result) || '').match(/([\d.]+)\s*mi/);
          if (m) { dist += parseFloat(m[1]); wd += parseFloat(m[1]); runs++; }
        } else {
          day.exercises.forEach(function (ex) {
            (ex.sets || []).forEach(function (stt) {
              ws++; setCount++;
              if (stt.w) { wv += stt.w * stt.r; vol += stt.w * stt.r; if (stt.w > heaviest) { heaviest = stt.w; heaviestName = ex.name; } }
            });
          });
        }
      });
      if (wc) weeks.push({ week: wk.week, volume: wv, sets: ws, distance: Math.round(wd * 10) / 10 });
    });
    return { volume: vol, workouts: workouts, sets: setCount, heaviest: heaviest, heaviestName: heaviestName, isRun: isRun, distance: Math.round(dist * 10) / 10, runs: runs, weeks: weeks };
  }

  var API = {
    FAMILIES: FAMILIES,
    families: function () { return FAMILIES.slice(); },
    all: function () { return ALL.slice(); },
    byId: byId,
    byState: byState,
    active: active,
    upcoming: upcoming,
    legacy: legacy,
    mine: mine,
    shared: shared,
    forgeCatalog: forgeCatalog,
    byFamily: byFamily,
    featured: featured,
    successorOf: successorOf,
    fullLog: fullLog,
    stats: stats,
  };
  root.ForgePrograms = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
