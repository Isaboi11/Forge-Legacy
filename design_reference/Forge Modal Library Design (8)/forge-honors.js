/*
 * Forge Legacy — canonical HONORS catalog (single source of truth).
 *
 * 179 honors across 14 categories. DATA ONLY: the real earn-evaluation runs in the
 * app engine (Claude Code handoff). This file describes each honor's award trigger
 * plus its MEDAL SPEC (mark / exergue / tier / ring), and provides a DESIGN SEED of
 * which honors each tenure tier (new|y1|y3) has earned so Legacy / Honors / Progress
 * screens render a believable, consistent set.
 *
 * The medal spec fields are consumed by forge-honor-art.js:
 *   frame  — category silhouette (from CATEGORIES[].frame)
 *   mark   — the engraved figure at the medal's centre (id in ForgeHonorArt.MARKS)
 *   ex     — exergue legend: the threshold, engraved in the bottom band ('' = none)
 *   tier   — 1 muted bronze · 2 primary · 3 bright · 4 apex (metallic sweep + rays)
 *
 * Pairs with forge-user.js (tenure, lifts, counts). Screens read:
 *   ForgeHonors.CATEGORIES         -> [{id,name,glyph,frame,note}]
 *   ForgeHonors.ALL                -> [{cat,id,name,trigger,hidden,mark,ex,tier,...}]
 *   ForgeHonors.byId(id)           -> one honor record
 *   ForgeHonors.byCategory(catId)  -> honors in a category
 *   ForgeHonors.earnedFor(tenure)  -> [{...honor, date}] the athlete has earned (newest-last)
 *   ForgeHonors.countFor(tenure)   -> number earned
 */
(function () {
  var CATEGORIES = [
    { id: 'origin',      name: 'Origin',            glyph: 'spark',    frame: 'rope',       note: 'The nine first steps' },
    { id: 'training',    name: 'Training',          glyph: 'dumbbell', frame: 'flute',      note: 'Volume, hours, weeks, tonnage' },
    { id: 'programs',    name: 'Programs',          glyph: 'banner',   frame: 'hex',        note: 'Plans carried to the end' },
    { id: 'chapters',    name: 'Chapters',          glyph: 'book',     frame: 'tablet',     note: 'Sealed, deep, and long-held' },
    { id: 'goals',       name: 'Goals',             glyph: 'target',   frame: 'lozenge',    note: 'Aims set and struck' },
    { id: 'strength',    name: 'Strength',          glyph: 'shield',   frame: 'shield',     note: 'Absolute load on the bar' },
    { id: 'relative',    name: 'Relative Strength', glyph: 'scale',    frame: 'chevron',    note: 'Load measured against you' },
    { id: 'endurance',   name: 'Endurance',         glyph: 'shoe',     frame: 'octagon',    note: 'Run · walk · ride · swim' },
    { id: 'competition', name: 'Competition',       glyph: 'swords',   frame: 'star8',      note: 'Entered and won' },
    { id: 'partnership', name: 'Partnership',       glyph: 'train',    frame: 'vesica',     note: 'Training beside someone' },
    { id: 'squad',       name: 'Squad',             glyph: 'squads',   frame: 'quatrefoil', note: 'What the group did together' },
    { id: 'longevity',   name: 'Longevity',         glyph: 'laurel',   frame: 'laurel',     note: 'Returns and tenure' },
    { id: 'prestige',    name: 'Prestige',          glyph: 'trophy',   frame: 'crown',      note: 'Built entirely from other honors' },
    { id: 'hidden',      name: 'Hidden',            glyph: 'flame',    frame: 'eclipse',    note: 'Never shown before they are earned' },
  ];

  var ALL = [];
  function H(cat, id, name, trigger, art) {
    var o = { cat: cat, id: id, name: name, trigger: trigger, hidden: cat === 'hidden',
              mark: id, ex: '', tier: 2 };
    if (art) { for (var k in art) o[k] = art[k]; }
    ALL.push(o);
  }
  // family helper: one mark + one ring, rows of [id, name, trigger, exergue, tier, extra?]
  function F(cat, mark, rows) {
    rows.forEach(function (r) {
      var art = { mark: mark, ex: r[3], tier: r[4] };
      if (r[5]) { for (var k in r[5]) art[k] = r[5][k]; }
      H(cat, r[0], r[1], r[2], art);
    });
  }

  // ── ORIGIN (9) ── nine one-off firsts; no exergue, each mark carries the meaning
  H('origin', 'org-again',           'Again',              'Log a second workout',                                 { tier: 1 });
  H('origin', 'org-first-pr',        'First Personal Record', 'Set your first personal record',                    { tier: 2 });
  H('origin', 'org-standard',        'My Standard',        'Write your Standard — what you hold yourself to',      { tier: 2 });
  H('origin', 'org-first-goal',      'First Goal',         'Set your first goal',                                  { tier: 1 });
  H('origin', 'org-first-connection','First Connection',   'Join a squad, or add your first friend',               { tier: 1 });
  H('origin', 'org-initiative',      'Initiative',         'Build or choose your first program',                   { tier: 2 });
  H('origin', 'org-first-capture',   'First Capture',      'Add your first progress capture',                      { tier: 1 });
  H('origin', 'org-first-reflection','First Reflection',   'Write your first reflection',                          { tier: 2 });
  H('origin', 'org-first-week',      'First Week',         'Train 3 times inside any seven days',                  { tier: 3, ex: '3 / 7' });

  // ── TRAINING (27) ──
  F('training', 'trn-count', [
    ['trn-first', 'First Workout Logged', 'Total sessions \u2265 1',     '1',    1],
    ['trn-25',    '25 Workouts Logged',   'Total sessions \u2265 25',    '25',   1],
    ['trn-50',    '50 Workouts Logged',   'Total sessions \u2265 50',    '50',   1],
    ['trn-100',   '100 Workouts Logged',  'Total sessions \u2265 100',   '100',  2],
    ['trn-250',   '250 Workouts Logged',  'Total sessions \u2265 250',   '250',  2],
    ['trn-500',   '500 Workouts Logged',  'Total sessions \u2265 500',   '500',  2],
    ['trn-1000',  '1,000 Workouts Logged','Total sessions \u2265 1,000', '1000', 3],
    ['trn-1500',  '1,500 Workouts Logged','Total sessions \u2265 1,500', '1500', 3],
    ['trn-2500',  '2,500 Workouts Logged','Total sessions \u2265 2,500', '2500', 3],
    ['trn-5000',  '5,000 Workouts Logged','Total sessions \u2265 5,000', '5000', 4],
  ]);
  F('training', 'trn-hours', [
    ['trn-hr-100',   '100 Hours Forged',   'Cumulative session hours \u2265 100',    '100',  1],
    ['trn-hr-250',   '250 Hours Forged',   'Cumulative session hours \u2265 250',    '250',  1],
    ['trn-hr-500',   '500 Hours Forged',   'Cumulative session hours \u2265 500',    '500',  2],
    ['trn-hr-1000',  '1,000 Hours Forged', 'Cumulative session hours \u2265 1,000',  '1K',   2],
    ['trn-hr-2500',  '2,500 Hours Forged', 'Cumulative session hours \u2265 2,500',  '2.5K', 3],
    ['trn-hr-5000',  '5,000 Hours Forged', 'Cumulative session hours \u2265 5,000',  '5K',   3],
    ['trn-hr-7500',  '7,500 Hours Forged', 'Cumulative session hours \u2265 7,500',  '7.5K', 3],
    ['trn-hr-10000', '10,000 Hours Forged','Cumulative session hours \u2265 10,000', '10K',  4],
  ]);
  F('training', 'trn-weeks', [
    ['trn-wk-10',  '10 Active Weeks',  'Cumulative active weeks \u2265 10',  '10',  1],
    ['trn-wk-50',  '50 Active Weeks',  'Cumulative active weeks \u2265 50',  '50',  2],
    ['trn-wk-150', '150 Active Weeks', 'Cumulative active weeks \u2265 150', '150', 2],
    ['trn-wk-300', '300 Active Weeks', 'Cumulative active weeks \u2265 300', '300', 3],
    ['trn-wk-500', '500 Active Weeks', 'Cumulative active weeks \u2265 500', '500', 4],
  ]);
  F('training', 'trn-tonnage', [
    ['trn-vol-1m',  'One Million Pounds',        'Lifetime tonnage \u2265 1,000,000 lb',  '1M',  2],
    ['trn-vol-5m',  'Five Million Pounds',       'Lifetime tonnage \u2265 5,000,000 lb',  '5M',  2],
    ['trn-vol-10m', 'Ten Million Pounds',        'Lifetime tonnage \u2265 10,000,000 lb', '10M', 3],
    ['trn-vol-25m', 'Twenty-Five Million Pounds','Lifetime tonnage \u2265 25,000,000 lb', '25M', 4],
  ]);

  // ── PROGRAMS (5) ──
  F('programs', 'prog-grad', [
    ['prog-first', 'First Program Graduated', 'Programs graduated \u2265 1',  '1',  1],
    ['prog-5',     '5 Programs Graduated',    'Programs graduated \u2265 5',  '5',  2],
    ['prog-10',    '10 Programs Graduated',   'Programs graduated \u2265 10', '10', 2],
    ['prog-25',    '25 Programs Graduated',   'Programs graduated \u2265 25', '25', 3],
    ['prog-50',    '50 Programs Graduated',   'Programs graduated \u2265 50', '50', 4],
  ]);

  // ── CHAPTERS (14) ──
  F('chapters', 'chp-seal', [
    ['chp-first', 'First Chapter Sealed', 'Seal your first chapter',    '1',  1],
    ['chp-5',     '5 Chapters Sealed',    'Sealed chapters \u2265 5',   '5',  2],
    ['chp-10',    '10 Chapters Sealed',   'Sealed chapters \u2265 10',  '10', 2],
    ['chp-25',    '25 Chapters Sealed',   'Sealed chapters \u2265 25',  '25', 3],
    ['chp-50',    '50 Chapters Sealed',   'Sealed chapters \u2265 50',  '50', 4],
  ]);
  F('chapters', 'chp-depth', [
    ['chp-depth-10',  '10 Workouts in a Chapter',  'Sessions within one chapter \u2265 10',  '10',  1],
    ['chp-depth-25',  '25 Workouts in a Chapter',  'Sessions within one chapter \u2265 25',  '25',  1],
    ['chp-depth-50',  '50 Workouts in a Chapter',  'Sessions within one chapter \u2265 50',  '50',  2],
    ['chp-depth-100', '100 Workouts in a Chapter', 'Sessions within one chapter \u2265 100', '100', 3],
    ['chp-depth-250', '250 Workouts in a Chapter', 'Sessions within one chapter \u2265 250', '250', 4],
  ]);
  F('chapters', 'chp-held', [
    ['chp-half', 'Half a Year, One Chapter',  'One chapter held open \u2265 182 days',   '182D', 1],
    ['chp-year', 'A Full Year, One Chapter',  'One chapter held open \u2265 365 days',   '1 YR', 2],
    ['chp-2yr',  'Two Years, One Chapter',    'One chapter held open \u2265 730 days',   '2 YR', 3],
    ['chp-3yr',  'Three Years, One Chapter',  'One chapter held open \u2265 1,095 days', '3 YR', 4],
  ]);

  // ── GOALS (6) ──
  F('goals', 'goal-struck', [
    ['goal-first', 'First Goal Achieved', 'Goals achieved \u2265 1',   '1',   1],
    ['goal-5',     '5 Goals Achieved',    'Goals achieved \u2265 5',   '5',   1],
    ['goal-10',    '10 Goals Achieved',   'Goals achieved \u2265 10',  '10',  2],
    ['goal-25',    '25 Goals Achieved',   'Goals achieved \u2265 25',  '25',  2],
    ['goal-50',    '50 Goals Achieved',   'Goals achieved \u2265 50',  '50',  3],
    ['goal-100',   '100 Goals Achieved',  'Goals achieved \u2265 100', '100', 4],
  ]);

  // ── STRENGTH (19) ──
  F('strength', 'str-bench', [
    ['str-bench-135', 'Bench 135', 'Bench press PR \u2265 135 lb / 60 kg',  '135', 1, { lb: 135, kg: 60,  lift: 'bench' }],
    ['str-bench-225', 'Bench 225', 'Bench press PR \u2265 225 lb / 100 kg', '225', 2, { lb: 225, kg: 100, lift: 'bench' }],
    ['str-bench-315', 'Bench 315', 'Bench press PR \u2265 315 lb / 140 kg', '315', 3, { lb: 315, kg: 140, lift: 'bench' }],
    ['str-bench-405', 'Bench 405', 'Bench press PR \u2265 405 lb / 180 kg', '405', 4, { lb: 405, kg: 180, lift: 'bench' }],
  ]);
  F('strength', 'str-squat', [
    ['str-squat-225', 'Squat 225', 'Squat PR \u2265 225 lb / 100 kg', '225', 1, { lb: 225, kg: 100, lift: 'squat' }],
    ['str-squat-315', 'Squat 315', 'Squat PR \u2265 315 lb / 140 kg', '315', 2, { lb: 315, kg: 140, lift: 'squat' }],
    ['str-squat-405', 'Squat 405', 'Squat PR \u2265 405 lb / 180 kg', '405', 3, { lb: 405, kg: 180, lift: 'squat' }],
    ['str-squat-500', 'Squat 500', 'Squat PR \u2265 500 lb / 225 kg', '500', 4, { lb: 500, kg: 225, lift: 'squat' }],
  ]);
  F('strength', 'str-dead', [
    ['str-dead-315', 'Deadlift 315', 'Deadlift PR \u2265 315 lb / 140 kg', '315', 1, { lb: 315, kg: 140, lift: 'deadlift' }],
    ['str-dead-405', 'Deadlift 405', 'Deadlift PR \u2265 405 lb / 180 kg', '405', 2, { lb: 405, kg: 180, lift: 'deadlift' }],
    ['str-dead-500', 'Deadlift 500', 'Deadlift PR \u2265 500 lb / 225 kg', '500', 3, { lb: 500, kg: 225, lift: 'deadlift' }],
    ['str-dead-600', 'Deadlift 600', 'Deadlift PR \u2265 600 lb / 270 kg', '600', 4, { lb: 600, kg: 270, lift: 'deadlift' }],
  ]);
  F('strength', 'str-ohp', [
    ['str-ohp-95',  'Overhead Press 95',  'Overhead press PR \u2265 95 lb / 40 kg',   '95',  1, { lb: 95,  kg: 40,  lift: 'ohp' }],
    ['str-ohp-135', 'Overhead Press 135', 'Overhead press PR \u2265 135 lb / 60 kg',  '135', 2, { lb: 135, kg: 60,  lift: 'ohp' }],
    ['str-ohp-185', 'Overhead Press 185', 'Overhead press PR \u2265 185 lb / 80 kg',  '185', 3, { lb: 185, kg: 80,  lift: 'ohp' }],
    ['str-ohp-225', 'Overhead Press 225', 'Overhead press PR \u2265 225 lb / 100 kg', '225', 4, { lb: 225, kg: 100, lift: 'ohp' }],
  ]);
  F('strength', 'str-club', [
    ['str-club-1000', '1,000 Pound Club', 'Bench + squat + deadlift PRs \u2265 1,000 lb', '1000', 2, { lb: 1000 }],
    ['str-club-1200', '1,200 Pound Club', 'Combined PRs \u2265 1,200 lb',                 '1200', 3, { lb: 1200 }],
    ['str-club-1500', '1,500 Pound Club', 'Combined PRs \u2265 1,500 lb',                 '1500', 4, { lb: 1500 }],
  ]);

  // ── RELATIVE STRENGTH (11) ──
  F('relative', 'rel-bench', [
    ['rel-bench-1',   'Bodyweight Bench',         'Bench PR \u2265 1.00\u00D7 bodyweight', '1.00\u00D7', 2, { lift: 'bench' }],
    ['rel-bench-125', 'Bench 1.25\u00D7 Bodyweight', 'Bench PR \u2265 1.25\u00D7 bodyweight', '1.25\u00D7', 3, { lift: 'bench' }],
    ['rel-bench-15',  'Bench 1.5\u00D7 Bodyweight',  'Bench PR \u2265 1.50\u00D7 bodyweight', '1.50\u00D7', 4, { lift: 'bench' }],
  ]);
  F('relative', 'rel-squat', [
    ['rel-squat-15', 'Squat 1.5\u00D7 Bodyweight',   'Squat PR \u2265 1.50\u00D7 bodyweight', '1.50\u00D7', 2, { lift: 'squat' }],
    ['rel-squat-2',  'Double Bodyweight Squat',      'Squat PR \u2265 2.00\u00D7 bodyweight', '2.00\u00D7', 3, { lift: 'squat' }],
    ['rel-squat-25', 'Squat 2.5\u00D7 Bodyweight',   'Squat PR \u2265 2.50\u00D7 bodyweight', '2.50\u00D7', 4, { lift: 'squat' }],
  ]);
  F('relative', 'rel-dead', [
    ['rel-dead-2',  'Double Bodyweight Deadlift', 'Deadlift PR \u2265 2.00\u00D7 bodyweight', '2.00\u00D7', 2, { lift: 'deadlift' }],
    ['rel-dead-25', 'Deadlift 2.5\u00D7 Bodyweight', 'Deadlift PR \u2265 2.50\u00D7 bodyweight', '2.50\u00D7', 3, { lift: 'deadlift' }],
    ['rel-dead-3',  'Triple Bodyweight Deadlift', 'Deadlift PR \u2265 3.00\u00D7 bodyweight', '3.00\u00D7', 4, { lift: 'deadlift' }],
  ]);
  F('relative', 'rel-ohp', [
    ['rel-ohp-075', 'Overhead Press 0.75\u00D7 Bodyweight', 'OHP PR \u2265 0.75\u00D7 bodyweight', '0.75\u00D7', 2, { lift: 'ohp' }],
    ['rel-ohp-1',   'Bodyweight Overhead Press',            'OHP PR \u2265 1.00\u00D7 bodyweight', '1.00\u00D7', 4, { lift: 'ohp' }],
  ]);

  // ── ENDURANCE (38) ──
  F('endurance', 'end-run-session', [
    ['end-run-mile',     'First Mile Run',          'Run \u2265 1 mile in a session',    '1 MI',  1],
    ['end-run-5k',       'First 5K Run',            'Run \u2265 5K in a session',        '5K',    2],
    ['end-run-10k',      'First 10K Run',           'Run \u2265 10K in a session',       '10K',   2],
    ['end-run-half',     'First Half Marathon Run', 'Run \u2265 13.1 mi in a session',   '13.1',  3],
    ['end-run-marathon', 'First Marathon Run',      'Run \u2265 26.2 mi in a session',   '26.2',  4],
  ]);
  F('endurance', 'end-run-total', [
    ['end-run-lt-100',   '100 Lifetime Running Miles',    'Lifetime running \u2265 100 mi',    '100',  1],
    ['end-run-lt-500',   '500 Lifetime Running Miles',    'Lifetime running \u2265 500 mi',    '500',  2],
    ['end-run-lt-1000',  '1,000 Lifetime Running Miles',  'Lifetime running \u2265 1,000 mi',  '1K',   2],
    ['end-run-lt-5000',  '5,000 Lifetime Running Miles',  'Lifetime running \u2265 5,000 mi',  '5K',   3],
    ['end-run-lt-15000', '15,000 Lifetime Running Miles', 'Lifetime running \u2265 15,000 mi', '15K',  4],
  ]);
  F('endurance', 'end-walk-session', [
    ['end-walk-mile',     'First Mile Walk',          'Walk \u2265 1 mile in a session',  '1 MI', 1],
    ['end-walk-5k',       'First 5K Walk',            'Walk \u2265 5K in a session',      '5K',   2],
    ['end-walk-10k',      'First 10K Walk',           'Walk \u2265 10K in a session',     '10K',  2],
    ['end-walk-half',     'First Half Marathon Walk', 'Walk \u2265 13.1 mi in a session', '13.1', 3],
    ['end-walk-marathon', 'First Marathon Walk',      'Walk \u2265 26.2 mi in a session', '26.2', 4],
  ]);
  F('endurance', 'end-walk-total', [
    ['end-walk-lt-100',   '100 Lifetime Walking Miles',    'Lifetime walking \u2265 100 mi',    '100',  1],
    ['end-walk-lt-500',   '500 Lifetime Walking Miles',    'Lifetime walking \u2265 500 mi',    '500',  2],
    ['end-walk-lt-1000',  '1,000 Lifetime Walking Miles',  'Lifetime walking \u2265 1,000 mi',  '1K',   2],
    ['end-walk-lt-5000',  '5,000 Lifetime Walking Miles',  'Lifetime walking \u2265 5,000 mi',  '5K',   3],
    ['end-walk-lt-15000', '15,000 Lifetime Walking Miles', 'Lifetime walking \u2265 15,000 mi', '15K',  4],
  ]);
  F('endurance', 'end-ride-session', [
    ['end-cyc-25',      'First 25-Mile Ride',       'Ride \u2265 25 mi in a session',  '25',  1],
    ['end-cyc-50',      'First 50-Mile Ride',       'Ride \u2265 50 mi in a session',  '50',  2],
    ['end-cyc-century', 'First Century Ride',       'Ride \u2265 100 mi in a session', '100', 3],
    ['end-cyc-double',  'First Double Century Ride','Ride \u2265 200 mi in a session', '200', 4],
  ]);
  F('endurance', 'end-ride-total', [
    ['end-cyc-lt-250',   '250 Lifetime Cycling Miles',    'Lifetime cycling \u2265 250 mi',    '250',  1],
    ['end-cyc-lt-1000',  '1,000 Lifetime Cycling Miles',  'Lifetime cycling \u2265 1,000 mi',  '1K',   2],
    ['end-cyc-lt-5000',  '5,000 Lifetime Cycling Miles',  'Lifetime cycling \u2265 5,000 mi',  '5K',   2],
    ['end-cyc-lt-15000', '15,000 Lifetime Cycling Miles', 'Lifetime cycling \u2265 15,000 mi', '15K',  3],
    ['end-cyc-lt-50000', '50,000 Lifetime Cycling Miles', 'Lifetime cycling \u2265 50,000 mi', '50K',  4],
  ]);
  F('endurance', 'end-swim-session', [
    ['end-swim-500',  'First 500m Swim',  'Swim \u2265 500 m in a session',   '500M',  1],
    ['end-swim-1000', 'First 1000m Swim', 'Swim \u2265 1,000 m in a session', '1 KM',  2],
    ['end-swim-mile', 'First Mile Swim',  'Swim \u2265 1 mile in a session',  '1 MI',  3],
    ['end-swim-5k',   'First 5K Swim',    'Swim \u2265 5 km in a session',    '5K',    4],
  ]);
  F('endurance', 'end-swim-total', [
    ['end-swim-lt-25',   '25 Lifetime Swimming Kilometers',    'Lifetime swimming \u2265 25 km',    '25',    1],
    ['end-swim-lt-100',  '100 Lifetime Swimming Kilometers',   'Lifetime swimming \u2265 100 km',   '100',   2],
    ['end-swim-lt-250',  '250 Lifetime Swimming Kilometers',   'Lifetime swimming \u2265 250 km',   '250',   2],
    ['end-swim-lt-500',  '500 Lifetime Swimming Kilometers',   'Lifetime swimming \u2265 500 km',   '500',   3],
    ['end-swim-lt-1000', '1,000 Lifetime Swimming Kilometers', 'Lifetime swimming \u2265 1,000 km', '1000',  4],
  ]);

  // ── COMPETITION (6) ──
  F('competition', 'cmp-victory', [
    ['cmp-first-win', 'First Victory',    'Challenges won \u2265 1',  '1',  2],
    ['cmp-win-10',    '10 Challenge Wins','Challenges won \u2265 10', '10', 3],
    ['cmp-win-25',    '25 Challenge Wins','Challenges won \u2265 25', '25', 4],
  ]);
  F('competition', 'cmp-entered', [
    ['cmp-first-enter', 'First Challenge Entered', 'Challenges entered \u2265 1',  '1',  1],
    ['cmp-enter-10',    '10 Challenges Entered',   'Challenges entered \u2265 10', '10', 2],
    ['cmp-veteran',     'Challenge Veteran',       'Challenges entered \u2265 25', '25', 3],
  ]);

  // ── PARTNERSHIP (6) ──
  F('partnership', 'prt-together', [
    ['prt-first', 'Never Alone',           'Sessions alongside someone \u2265 1',   '1',   1],
    ['prt-10',    '10 Sessions Together',  'Sessions alongside someone \u2265 10',  '10',  2],
    ['prt-50',    '50 Sessions Together',  'Sessions alongside someone \u2265 50',  '50',  3],
    ['prt-100',   '100 Sessions Together', 'Sessions alongside someone \u2265 100', '100', 4],
  ]);
  H('partnership', 'prt-regular', 'The Regular',  'Train with the same person 25 times', { mark: 'prt-regular', ex: '25', tier: 3 });
  H('partnership', 'prt-wide',    'Wide Circle',  'Train with 10 different people',      { mark: 'prt-wide',    ex: '10', tier: 3 });

  // ── SQUAD (15) ──
  H('squad', 'sqd-founder', 'Squad Founder', 'Create a squad', { mark: 'sqd-founder', tier: 2 });
  F('squad', 'sqd-perfect', [
    ['sqd-pw-first', 'First Perfect Week', 'Every member met the squad standard for a week', '1',  2],
    ['sqd-pw-10',    '10 Perfect Weeks',   'Perfect weeks \u2265 10',                        '10', 3],
    ['sqd-pw-25',    '25 Perfect Weeks',   'Perfect weeks \u2265 25',                        '25', 4],
  ]);
  F('squad', 'sqd-streak', [
    ['sqd-streak-7',   '7-Day Squad Streak',   'Squad streak \u2265 7 days',   '7D',   1],
    ['sqd-streak-30',  '30-Day Squad Streak',  'Squad streak \u2265 30 days',  '30D',  2],
    ['sqd-streak-100', '100-Day Squad Streak', 'Squad streak \u2265 100 days', '100D', 4],
  ]);
  F('squad', 'sqd-volume', [
    ['sqd-wk-100',  '100 Squad Workouts',   'Squad cumulative workouts \u2265 100',   '100',  1],
    ['sqd-wk-500',  '500 Squad Workouts',   'Squad cumulative workouts \u2265 500',   '500',  2],
    ['sqd-wk-1000', '1,000 Squad Workouts', 'Squad cumulative workouts \u2265 1,000', '1000', 4],
  ]);
  F('squad', 'sqd-goal', [
    ['sqd-goal-first', 'First Squad Goal', 'Squad goals completed \u2265 1',  '1',  2],
    ['sqd-goal-10',    '10 Squad Goals',   'Squad goals completed \u2265 10', '10', 3],
    ['sqd-goal-25',    '25 Squad Goals',   'Squad goals completed \u2265 25', '25', 4],
  ]);
  H('squad', 'sqd-teamplayer', 'Team Player',              'Squad check-ins \u2265 50',                        { mark: 'sqd-teamplayer', ex: '50', tier: 2 });
  H('squad', 'sqd-everyone',   'Everyone Finished Program','Every member graduates the same program',          { mark: 'sqd-everyone',   tier: 4 });

  // ── LONGEVITY (10) ──
  F('longevity', 'lng-return', [
    ['lng-back-30',  'Back to the Iron',    'Train again after \u2265 30 days away',  '30D',  1],
    ['lng-back-90',  'The Long Way Back',   'Train again after \u2265 90 days away',  '90D',  2],
    ['lng-back-180', 'Never Gone for Good', 'Train again after \u2265 180 days away', '180D', 3],
  ]);
  F('longevity', 'lng-rings', [
    ['lng-90d',  '90 Days Forging',  'Account age \u2265 90 days', '90D',  1],
    ['lng-1yr',  '1 Year Forging',   'Account age \u2265 1 year',  '1 YR',  1],
    ['lng-3yr',  '3 Years Forging',  'Account age \u2265 3 years', '3 YR',  2],
    ['lng-5yr',  '5 Years Forging',  'Account age \u2265 5 years', '5 YR',  2],
    ['lng-10yr', '10 Years Forging', 'Account age \u2265 10 years','10 YR', 3],
    ['lng-15yr', '15 Years Forging', 'Account age \u2265 15 years','15 YR', 3],
    ['lng-20yr', '20 Years Forging', 'Account age \u2265 20 years','20 YR', 4],
  ]);

  // ── PRESTIGE (7) ── every prestige honor is apex material
  H('prestige', 'prs-4paths',      'Many Paths',           'Top of 4 different paths + 1 Year Forging',                  { mark: 'prs-4paths',      ex: '4',   tier: 4 });
  H('prestige', 'prs-5paths',      'A Wider Legacy',       'Top of 5 different paths + 3 Years Forging',                 { mark: 'prs-5paths',      ex: '5',   tier: 4 });
  H('prestige', 'prs-6paths',      'Almost Every Path',    'Top of 6 different paths + 5 Years Forging',                 { mark: 'prs-6paths',      ex: '6',   tier: 4 });
  H('prestige', 'prs-7paths',      'The Complete Legacy',  'Top of every solo path + 10 Years Forging',                  { mark: 'prs-7paths',      ex: '7',   tier: 4 });
  H('prestige', 'prs-lifter',      'The Complete Lifter',  'Bench 405 + Squat 500 + Deadlift 600 + 3 Years',             { mark: 'prs-lifter',      ex: '1505',tier: 4 });
  H('prestige', 'prs-disciplines', 'Three Disciplines',    'Marathon + Century Ride + 5K Swim + 3 Years',                { mark: 'prs-disciplines', ex: '3',   tier: 4 });
  H('prestige', 'prs-chapters',    'A Life in Chapters',   '25 Chapters Sealed + 50 Goals Achieved + 5 Years',           { mark: 'prs-chapters',    ex: '25',  tier: 4 });

  // ── HIDDEN (6) ── never surfaced until earned
  H('hidden', 'hid-early',      'Early Forge',       'Session start before 6:00 AM local',        { mark: 'hid-early',      tier: 2 });
  H('hidden', 'hid-midnight',   'Midnight Forge',    'Session start 12:00\u20133:00 AM local',    { mark: 'hid-midnight',   tier: 2 });
  H('hidden', 'hid-newyear',    "New Year's Forge",  'Session logged on January 1',               { mark: 'hid-newyear',    tier: 3 });
  H('hidden', 'hid-leapday',    'Leap Day Forge',    'Session logged on February 29',             { mark: 'hid-leapday',    tier: 3 });
  H('hidden', 'hid-fullcircle', 'Full Circle',       'Session on your account anniversary',       { mark: 'hid-fullcircle', tier: 3 });
  H('hidden', 'hid-triple',     'Triple Threat',     'Honors from 3 categories in one evaluation',{ mark: 'hid-triple',     tier: 4 });

  // ── index ──
  var BY_ID = {};
  ALL.forEach(function (h) { BY_ID[h.id] = h; });

  // ── DESIGN SEED: which honors each tenure has earned (id + earned date) ──
  var SEED = {
    'new': [],
    'y1': [
      { id: 'trn-first',     date: 'Feb 3, 2025' },
      { id: 'org-again',     date: 'Feb 5, 2025' },
      { id: 'org-first-week',date: 'Feb 9, 2025' },
      { id: 'chp-first',     date: 'Feb 3, 2025' },
      { id: 'goal-first',    date: 'Mar 20, 2025' },
      { id: 'lng-90d',       date: 'May 4, 2025' },
      { id: 'str-bench-135', date: 'Jun 15, 2025' },
      { id: 'str-squat-225', date: 'Sep 2, 2025' },
    ],
    'y3': [
      { id: 'trn-first',     date: 'Jan 20, 2023' },
      { id: 'org-again',     date: 'Jan 22, 2023' },
      { id: 'org-first-week',date: 'Jan 26, 2023' },
      { id: 'chp-first',     date: 'Jan 20, 2023' },
      { id: 'goal-first',    date: 'Mar 15, 2023' },
      { id: 'lng-90d',       date: 'Apr 22, 2023' },
      { id: 'str-bench-135', date: 'May 2, 2023' },
      { id: 'str-squat-225', date: 'Jun 10, 2023' },
      { id: 'end-run-5k',    date: 'Aug 1, 2023' },
      { id: 'lng-1yr',       date: 'Jan 20, 2024' },
      { id: 'str-squat-315', date: 'Mar 8, 2024' },
      { id: 'str-dead-315',  date: 'Apr 19, 2024' },
      { id: 'trn-100',       date: 'Jun 2, 2024' },
      { id: 'prog-first',    date: 'Jul 14, 2024' },
      { id: 'cmp-first-win', date: 'Sep 22, 2024' },
      { id: 'str-bench-225', date: 'Nov 30, 2024' },
      { id: 'str-squat-405', date: 'Feb 15, 2025' },
      { id: 'str-dead-405',  date: 'May 24, 2025' },
      { id: 'str-club-1000', date: 'Jun 28, 2025' },
      { id: 'rel-bench-1',   date: 'Aug 9, 2025' },
      { id: 'lng-3yr',       date: 'Jan 20, 2026' },
    ],
  };

  function tenure() {
    try { if (window.ForgeUser && window.ForgeUser.tenure) return window.ForgeUser.tenure(); } catch (e) {}
    return 'y3';
  }
  function earnedFor(t) {
    t = t || tenure();
    var list = SEED[t] || SEED.y3 || [];
    return list.map(function (e) {
      var h = BY_ID[e.id];
      return h ? Object.assign({ date: e.date }, h) : null;
    }).filter(Boolean);
  }

  window.ForgeHonors = {
    CATEGORIES: CATEGORIES,
    ALL: ALL,
    total: ALL.length,
    byId: function (id) { return BY_ID[id] || null; },
    byCategory: function (c) { return ALL.filter(function (h) { return h.cat === c; }); },
    categoryMeta: function (c) { for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === c) return CATEGORIES[i]; return null; },
    tenure: tenure,
    earnedFor: earnedFor,
    countFor: function (t) { return earnedFor(t).length; },
  };
})();
