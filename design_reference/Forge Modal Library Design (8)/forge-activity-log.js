/* Forge Legacy — shared activity log (single source of truth for W-18 History + W-19 Detail).
   Read-only training record. Both screens consume this so a tapped history row opens
   the matching session detail. window.ForgeActivityLog. */
(function () {
  var TYPES = {
    strength: { label: 'Strength', symbol: 'dumbbell',   color: 'var(--fl-icon-bronze)' },
    run:      { label: 'Run',      symbol: 'shoe',       color: 'oklch(0.74 0.10 55)' },
    walk:     { label: 'Walk',     symbol: 'footprints', color: 'oklch(0.74 0.05 145)' },
    bike:     { label: 'Bike',     symbol: 'bicycle',    color: 'oklch(0.72 0.06 235)' },
    swim:     { label: 'Swim',     symbol: 'swim',       color: 'oklch(0.74 0.07 205)' },
    hiit:     { label: 'HIIT',     symbol: 'glove',      color: 'oklch(0.66 0.13 35)' },
    mobility: { label: 'Mobility', symbol: 'lotus',      color: 'oklch(0.72 0.06 300)' },
    yoga:     { label: 'Yoga',     symbol: 'lotus',      color: 'oklch(0.74 0.07 20)' },
    other:    { label: 'Other',    symbol: 'mountain',   color: 'oklch(0.72 0.02 80)' }
  };
  var ORDER = ['strength', 'run', 'walk', 'bike', 'swim', 'hiit', 'mobility', 'yoga', 'other'];

  // ── the training log · reverse-chronological, read-only ──
  var RECORDS = [
    // June 2026
    { key: 'j10', type: 'strength', title: 'Leg Day A',   month: 'June 2026', date: 'Tue, Jun 10', min: 45, sets: 18, ex: 6, chapter: 'Chapter III · The Rebuild', pr: true, milestone: '405 lb Back Squat · PR', partners: ['Marcus Vale', 'Ada Ridge'], playlist: 'Leg Day Bangers' },
    { key: 'j08', type: 'run',      title: 'Tempo Run',   month: 'June 2026', date: 'Sun, Jun 8',  min: 32, mi: 5.2, chapter: 'Chapter III · The Rebuild' },
    { key: 'j07', type: 'strength', title: 'Push Day A',  month: 'June 2026', date: 'Sat, Jun 7',  min: 52, sets: 21, ex: 7, chapter: 'Chapter III · The Rebuild' },
    { key: 'j05', type: 'mobility', title: 'Hip Mobility Flow', month: 'June 2026', date: 'Thu, Jun 5', min: 18, chapter: 'Chapter III · The Rebuild' },
    { key: 'j04', type: 'hiit',     title: 'Conditioning Circuit', month: 'June 2026', date: 'Wed, Jun 4', min: 24, rounds: 6, chapter: 'Chapter III · The Rebuild' },
    { key: 'j03', type: 'strength', title: 'Pull Day A',  month: 'June 2026', date: 'Tue, Jun 3',  min: 48, sets: 20, ex: 6, chapter: 'Chapter III · The Rebuild' },
    { key: 'j01', type: 'bike',     title: 'Zone 2 Ride', month: 'June 2026', date: 'Sun, Jun 1',  min: 50, mi: 14.1 },
    // May 2026
    { key: 'm31', type: 'walk',     title: 'Recovery Walk', month: 'May 2026', date: 'Sat, May 31', min: 41, mi: 2.4, chapter: 'Chapter III · The Rebuild' },
    { key: 'm30', type: 'strength', title: 'Leg Day B',   month: 'May 2026', date: 'Fri, May 30', min: 44, sets: 17, ex: 6, chapter: 'Chapter III · The Rebuild' },
    { key: 'm28', type: 'run',      title: 'Long Run',    month: 'May 2026', date: 'Wed, May 28', min: 64, mi: 9.4, chapter: 'Chapter III · The Rebuild' },
    { key: 'm27', type: 'strength', title: 'Push Day B',  month: 'May 2026', date: 'Tue, May 27', min: 12, sets: 5, ex: 2, chapter: 'Chapter III · The Rebuild', partial: true },
    { key: 'm26', type: 'yoga',     title: 'Evening Yoga', month: 'May 2026', date: 'Mon, May 26', min: 35, chapter: 'Chapter III · The Rebuild' },
    { key: 'm24', type: 'swim',     title: 'Endurance Swim', month: 'May 2026', date: 'Sat, May 24', min: 38, swim: '1,500 m', chapter: 'Chapter III · The Rebuild' },
    { key: 'm22', type: 'strength', title: 'Pull Day B',  month: 'May 2026', date: 'Thu, May 22', min: 47, sets: 19, ex: 6, chapter: 'Chapter III · The Rebuild' },
    { key: 'm20', type: 'other',    title: 'Sauna & Cold Plunge', month: 'May 2026', date: 'Tue, May 20', min: 30 },
    { key: 'm17', type: 'strength', title: 'Leg Day A',   month: 'May 2026', date: 'Sat, May 17', min: 46, sets: 18, ex: 6, chapter: 'Chapter III · The Rebuild', pr: true, milestone: '385 lb Back Squat · PR' },
    // April 2026
    { key: 'a29', type: 'strength', title: 'Push Day A',  month: 'April 2026', date: 'Wed, Apr 29', min: 49, sets: 20, ex: 7, chapter: 'Chapter II · Base Building' },
    { key: 'a27', type: 'bike',     title: 'Hill Intervals', month: 'April 2026', date: 'Mon, Apr 27', min: 42, mi: 11.0, chapter: 'Chapter II · Base Building' },
    { key: 'a24', type: 'strength', title: 'Pull Day A',  month: 'April 2026', date: 'Fri, Apr 24', min: 45, sets: 19, ex: 6, chapter: 'Chapter II · Base Building' },
    { key: 'a21', type: 'run',      title: 'Threshold Run', month: 'April 2026', date: 'Tue, Apr 21', min: 38, mi: 6.0, chapter: 'Chapter II · Base Building' },
    { key: 'a18', type: 'mobility', title: 'Hip Mobility Flow', month: 'April 2026', date: 'Sat, Apr 18', min: 20, chapter: 'Chapter II · Base Building' },
    { key: 'a15', type: 'hiit',     title: 'Sprint Intervals', month: 'April 2026', date: 'Wed, Apr 15', min: 22, rounds: 8, chapter: 'Chapter II · Base Building' },
    { key: 'a12', type: 'strength', title: 'Leg Day B',   month: 'April 2026', date: 'Sun, Apr 12', min: 43, sets: 17, ex: 6, chapter: 'Chapter II · Base Building' }
  ];

  // ── strength breakdowns (representative; the tapped session renders exactly its own) ──
  var WORKOUTS = {
    'Leg Day A': [
      { section: 'Warm-up', items: [ { name: 'Bodyweight Squat', sets: [{ r: 15 }, { r: 15 }] } ] },
      { section: 'Main Workout', items: [
        { name: 'Barbell Back Squat', sets: [{ w: 135, r: 8 }, { w: 185, r: 6 }, { w: 205, r: 5 }, { w: 205, r: 5 }], note: 'Kept every rep below parallel. Felt strong off the floor.' },
        { name: 'Romanian Deadlift', sets: [{ w: 185, r: 10 }, { w: 185, r: 10 }, { w: 185, r: 8 }] },
        { name: 'Leg Press', sets: [{ w: 360, r: 12 }, { w: 360, r: 12 }, { w: 410, r: 10 }] }
      ] },
      { section: 'Cool-down', items: [ { name: 'Couch Stretch', sets: [], meta: '2 min · each side', metaLabel: 'Duration' } ] }
    ],
    'Leg Day B': [
      { section: 'Warm-up', items: [ { name: 'Leg Swings', sets: [], meta: '10 · each side', metaLabel: 'Reps' } ] },
      { section: 'Main Workout', items: [
        { name: 'Front Squat', sets: [{ w: 135, r: 8 }, { w: 155, r: 6 }, { w: 175, r: 5 }] },
        { name: 'Bulgarian Split Squat', sets: [{ w: 50, r: 10 }, { w: 50, r: 10 }, { w: 50, r: 9 }] },
        { name: 'Seated Leg Curl', sets: [{ w: 110, r: 12 }, { w: 120, r: 11 }, { w: 120, r: 10 }] },
        { name: 'Standing Calf Raise', sets: [{ w: 180, r: 15 }, { w: 180, r: 15 }, { w: 180, r: 13 }] }
      ] },
      { section: 'Cool-down', items: [ { name: 'Pigeon Stretch', sets: [], meta: '90 sec · each side', metaLabel: 'Duration' } ] }
    ],
    'Push Day A': [
      { section: 'Warm-up', items: [ { name: 'Band Pull-Apart', sets: [{ r: 20 }, { r: 20 }] } ] },
      { section: 'Main Workout', items: [
        { name: 'Barbell Bench Press', sets: [{ w: 135, r: 8 }, { w: 185, r: 6 }, { w: 205, r: 5 }, { w: 205, r: 5 }], note: 'Paused every first rep. Bar path stayed tight.' },
        { name: 'Overhead Press', sets: [{ w: 95, r: 8 }, { w: 115, r: 6 }, { w: 115, r: 5 }] },
        { name: 'Incline Dumbbell Press', sets: [{ w: 60, r: 10 }, { w: 60, r: 10 }, { w: 65, r: 8 }] },
        { name: 'Lateral Raise', sets: [{ w: 20, r: 15 }, { w: 20, r: 15 }, { w: 20, r: 12 }] },
        { name: 'Triceps Pushdown', sets: [{ w: 60, r: 14 }, { w: 70, r: 12 }, { w: 70, r: 11 }] }
      ] },
      { section: 'Cool-down', items: [ { name: 'Doorway Pec Stretch', sets: [], meta: '60 sec · each side', metaLabel: 'Duration' } ] }
    ],
    'Push Day B': [
      { section: 'Main Workout', items: [
        { name: 'Barbell Bench Press', sets: [{ w: 135, r: 8 }, { w: 175, r: 6 }], note: 'Cut it short — shoulder felt tweaky on the second set. Logged and walked away.' },
        { name: 'Overhead Press', sets: [{ w: 95, r: 8 }] }
      ] }
    ],
    'Pull Day A': [
      { section: 'Warm-up', items: [ { name: 'Scapular Pull-Up', sets: [{ r: 10 }, { r: 10 }] } ] },
      { section: 'Main Workout', items: [
        { name: 'Deadlift', sets: [{ w: 225, r: 5 }, { w: 275, r: 3 }, { w: 315, r: 2 }, { w: 315, r: 2 }], note: 'Reset every rep. No touch-and-go — clean pulls all the way.' },
        { name: 'Pull-Up', sets: [{ r: 10 }, { r: 9 }, { r: 8 }] },
        { name: 'Barbell Row', sets: [{ w: 155, r: 10 }, { w: 155, r: 10 }, { w: 155, r: 9 }] },
        { name: 'Face Pull', sets: [{ w: 50, r: 15 }, { w: 50, r: 15 }, { w: 50, r: 14 }] },
        { name: 'Barbell Curl', sets: [{ w: 65, r: 12 }, { w: 65, r: 10 }, { w: 65, r: 9 }] }
      ] },
      { section: 'Cool-down', items: [ { name: 'Lat Stretch', sets: [], meta: '60 sec · each side', metaLabel: 'Duration' } ] }
    ],
    'Pull Day B': [
      { section: 'Warm-up', items: [ { name: 'Band Face Pull', sets: [{ r: 20 }, { r: 20 }] } ] },
      { section: 'Main Workout', items: [
        { name: 'Rack Pull', sets: [{ w: 275, r: 6 }, { w: 315, r: 5 }, { w: 365, r: 3 }] },
        { name: 'Chest-Supported Row', sets: [{ w: 90, r: 12 }, { w: 90, r: 12 }, { w: 100, r: 10 }] },
        { name: 'Lat Pulldown', sets: [{ w: 130, r: 12 }, { w: 145, r: 10 }, { w: 145, r: 9 }] },
        { name: 'Hammer Curl', sets: [{ w: 35, r: 12 }, { w: 35, r: 11 }, { w: 35, r: 10 }] }
      ] },
      { section: 'Cool-down', items: [ { name: 'Child\u2019s Pose', sets: [], meta: '2 min', metaLabel: 'Duration' } ] }
    ]
  };

  var DOW = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
  var MON = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };
  var TIMES = ['6:12 AM', '6:42 AM', '7:05 AM', '12:20 PM', '5:38 PM', '6:15 PM', '7:48 PM'];

  function programOf(r) { return !r.chapter ? '' : (/III/.test(r.chapter) ? 'Powerbuilding II' : 'Powerbuilding I'); }
  function chapterShort(r) { return r.chapter ? r.chapter.split('\u00b7')[0].trim() : ''; }

  // "5.2 mi @ 32 min" → "6:09 /mi"
  function pacePerMile(mi, min) {
    if (!mi) return '';
    var secPer = (min * 60) / mi;
    var m = Math.floor(secPer / 60), s = Math.round(secPer % 60);
    return m + ':' + (s < 10 ? '0' + s : s) + ' /mi';
  }
  function fmtDur(m) {
    if (m < 1) return '< 1 min';
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return r === 0 ? h + ' hr' : h + ' hr ' + r + ' min';
  }

  // ordinal: count strength "workouts" chronologically (oldest = 1); others get a plain session index
  var strengthCount = 0, sessionCount = 0;
  var chrono = RECORDS.slice().reverse(); // oldest first
  var ordMap = {};
  chrono.forEach(function (r) {
    sessionCount += 1;
    if (r.type === 'strength') strengthCount += 1;
    ordMap[r.key] = r.type === 'strength' ? { label: 'Workout #' + strengthCount, n: strengthCount } : { label: 'Session #' + sessionCount, n: sessionCount };
  });

  function detail(key) {
    var all = logged().concat(RECORDS);
    var r = all.filter(function (x) { return x.key === key; })[0] || RECORDS[0];
    var t = TYPES[r.type] || TYPES.other;
    var isStrength = r.type === 'strength';
    var prog = programOf(r);

    // hero
    var programTag = isStrength ? (prog || 'Free Session') : t.label;
    var summaryLine;
    if (isStrength) summaryLine = fmtDur(r.min) + ' · ' + r.ex + ' exercises · ' + r.sets + ' sets';
    else if (r.type === 'run' || r.type === 'walk' || r.type === 'bike') summaryLine = fmtDur(r.min) + ' · ' + r.mi.toFixed(1) + ' mi';
    else if (r.type === 'swim') summaryLine = fmtDur(r.min) + ' · ' + r.swim;
    else if (r.type === 'hiit') summaryLine = fmtDur(r.min) + ' · ' + r.rounds + ' rounds';
    else summaryLine = fmtDur(r.min);

    var parts = r.date.split(/,\s*/); // ["Tue","Jun 10"]
    var md = parts[1].split(' ');     // ["Jun","10"]
    var ordEntry = ordMap[r.key];
    var timeStr = r._time || TIMES[(ordEntry ? ordEntry.n : 0) % TIMES.length];
    var whenLine = DOW[parts[0]] + ', ' + MON[md[0]] + ' ' + md[1] + ' \u00b7 ' + timeStr;

    var ord = ordEntry || { label: r._ordLabel || (isStrength ? 'Free Session' : t.label), n: 0 };
    var ordinalLine = ord.label + (chapterShort(r) ? ' \u00b7 ' + chapterShort(r) : '');

    // body
    var sections = isStrength ? (r._sections || WORKOUTS[r.title] || null) : null;
    var stats = [];
    if (r.type === 'run' || r.type === 'walk' || r.type === 'bike') {
      stats = [
        { label: 'Distance', value: r.mi.toFixed(1) + ' mi' },
        { label: 'Avg Pace', value: pacePerMile(r.mi, r.min) },
        { label: 'Duration', value: fmtDur(r.min) }
      ];
    } else if (r.type === 'swim') {
      var per100 = (r.min * 60) / 15; // 1,500 m → per-100m
      var pm = Math.floor(per100 / 60), ps = Math.round(per100 % 60);
      stats = [
        { label: 'Distance', value: r.swim },
        { label: 'Avg Pace', value: pm + ':' + (ps < 10 ? '0' + ps : ps) + ' /100m' },
        { label: 'Duration', value: fmtDur(r.min) }
      ];
    } else if (r.type === 'hiit') {
      stats = [
        { label: 'Rounds', value: String(r.rounds) },
        { label: 'Work : Rest', value: '40s : 20s' },
        { label: 'Duration', value: fmtDur(r.min) }
      ];
    } else if (!isStrength) {
      stats = [{ label: 'Duration', value: fmtDur(r.min) }];
    }

    // per-mile splits for runs (representative, centred on avg pace)
    var splits = [];
    if (r.type === 'run') {
      var whole = Math.floor(r.mi);
      var avg = (r.min * 60) / r.mi;
      var offsets = [8, 3, -2, -4, -1, 5, 2, -3, 6, 0];
      for (var i = 0; i < whole; i++) {
        var s = avg + offsets[i % offsets.length];
        var mm = Math.floor(s / 60), ss = Math.round(s % 60);
        splits.push({ label: 'Mile ' + (i + 1), value: mm + ':' + (ss < 10 ? '0' + ss : ss) });
      }
    }

    return {
      key: r.key, type: r.type, typeLabel: t.label, symbol: t.symbol, color: t.color,
      title: r.title,
      programTag: programTag,
      hasMilestone: !!r.milestone, milestoneText: r.milestone || '',
      summaryLine: summaryLine,
      whenLine: whenLine,
      ordinalLine: ordinalLine,
      isStrength: isStrength,
      sections: sections,
      hasStats: stats.length > 0, stats: stats,
      hasSplits: splits.length > 0, splits: splits,
      partners: (r.partners || []).map(function (n) { return { name: n, initials: n.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() }; }),
      partnersLabel: (r.partners || []).join(', '),
      playlist: r.playlist || '',
      chapterName: r.chapter || '',
      programName: (isStrength && prog) ? (prog + ' \u2014 ' + r.title) : ''
    };
  }

  var LKEY = 'forge_logged_sessions_v1';
  var _seq = 0;
  function logged() { try { return JSON.parse(localStorage.getItem(LKEY) || '[]') || []; } catch (e) { return []; } }
  var DOWA = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONA = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function two(n) { return n < 10 ? '0' + n : '' + n; }
  // Append a completed session to the record (localStorage-backed, newest first). Merged into records()/detail().
  function logSession(entry) {
    var now = new Date();
    var h = now.getHours(), ap = h < 12 ? 'AM' : 'PM', h12 = h % 12; if (h12 === 0) h12 = 12;
    var rec = Object.assign({ chapter: 'Chapter III \u00b7 The Rebuild' }, entry, {
      key: 'L' + now.getTime() + '-' + (++_seq) + Math.floor(Math.random() * 1000),
      date: DOWA[now.getDay()] + ', ' + MONA[now.getMonth()] + ' ' + now.getDate(),
      month: MONF[now.getMonth()] + ' ' + now.getFullYear(),
      _time: h12 + ':' + two(now.getMinutes()) + ' ' + ap
    });
    var arr = logged(); arr.unshift(rec); if (arr.length > 50) arr = arr.slice(0, 50);
    try { localStorage.setItem(LKEY, JSON.stringify(arr)); } catch (e) {}
    return rec.key;
  }

  window.ForgeActivityLog = {
    TYPES: TYPES,
    ORDER: ORDER,
    records: function () { return logged().concat(RECORDS).map(function (r) { return Object.assign({}, r); }); },
    detail: detail,
    logSession: logSession,
    clearLogged: function () { try { localStorage.removeItem(LKEY); } catch (e) {} }
  };
})();
