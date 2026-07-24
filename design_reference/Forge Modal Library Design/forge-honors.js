/*
 * Forge Legacy — canonical HONORS catalog (single source of truth).
 *
 * 167 honors across 13 categories. DATA ONLY: the real earn-evaluation runs in the
 * app engine (Claude Code handoff). This file describes each honor's award trigger
 * and provides a DESIGN SEED of which honors each tenure tier (new|y1|y3) has earned,
 * so Legacy / Honors / Progress screens render a believable, consistent set.
 *
 * Pairs with forge-user.js (tenure, lifts, counts). Screens read:
 *   ForgeHonors.CATEGORIES         -> [{id,name,glyph}]
 *   ForgeHonors.ALL                -> [{cat,id,name,trigger,hidden, lb?,kg?,lift?}]
 *   ForgeHonors.byId(id)           -> one honor record
 *   ForgeHonors.byCategory(catId)  -> honors in a category
 *   ForgeHonors.earnedFor(tenure)  -> [{...honor, date}] the athlete has earned (newest-last)
 *   ForgeHonors.countFor(tenure)   -> number earned
 */
(function () {
  var CATEGORIES = [
    { id: 'strength',    name: 'Strength',    glyph: 'shield' },
    { id: 'chapters',    name: 'Chapters',    glyph: 'book' },
    { id: 'training',    name: 'Training',    glyph: 'dumbbell' },
    { id: 'goals',       name: 'Goals',       glyph: 'spark' },
    { id: 'programs',    name: 'Programs',    glyph: 'banner' },
    { id: 'partnership', name: 'Partnership', glyph: 'train' },
    { id: 'longevity',   name: 'Longevity',   glyph: 'laurel' },
    { id: 'endurance',   name: 'Endurance',   glyph: 'shoe' },
    { id: 'competition', name: 'Competition', glyph: 'swords' },
    { id: 'communities', name: 'Communities', glyph: 'explore' },
    { id: 'squad',       name: 'Squad',       glyph: 'squads' },
    { id: 'prestige',    name: 'Prestige',    glyph: 'trophy' },
    { id: 'hidden',      name: 'Hidden',      glyph: 'flame' },
  ];

  var ALL = [];
  function H(cat, id, name, trigger, extra) {
    var o = { cat: cat, id: id, name: name, trigger: trigger, hidden: cat === 'hidden' };
    if (extra) { for (var k in extra) o[k] = extra[k]; }
    ALL.push(o);
  }

  // ── STRENGTH (26) ──
  H('strength', 'str-bench-135', 'Bench 135', 'Bench press PR \u2265 135 lb / 60 kg', { lb: 135, kg: 60, lift: 'bench' });
  H('strength', 'str-bench-225', 'Bench 225', 'Bench press PR \u2265 225 lb / 100 kg', { lb: 225, kg: 100, lift: 'bench' });
  H('strength', 'str-bench-315', 'Bench 315', 'Bench press PR \u2265 315 lb / 140 kg', { lb: 315, kg: 140, lift: 'bench' });
  H('strength', 'str-bench-405', 'Bench 405', 'Bench press PR \u2265 405 lb / 180 kg', { lb: 405, kg: 180, lift: 'bench' });
  H('strength', 'str-squat-225', 'Squat 225', 'Squat PR \u2265 225 lb / 100 kg', { lb: 225, kg: 100, lift: 'squat' });
  H('strength', 'str-squat-315', 'Squat 315', 'Squat PR \u2265 315 lb / 140 kg', { lb: 315, kg: 140, lift: 'squat' });
  H('strength', 'str-squat-405', 'Squat 405', 'Squat PR \u2265 405 lb / 180 kg', { lb: 405, kg: 180, lift: 'squat' });
  H('strength', 'str-squat-500', 'Squat 500', 'Squat PR \u2265 500 lb / 225 kg', { lb: 500, kg: 225, lift: 'squat' });
  H('strength', 'str-dead-315', 'Deadlift 315', 'Deadlift PR \u2265 315 lb / 140 kg', { lb: 315, kg: 140, lift: 'deadlift' });
  H('strength', 'str-dead-405', 'Deadlift 405', 'Deadlift PR \u2265 405 lb / 180 kg', { lb: 405, kg: 180, lift: 'deadlift' });
  H('strength', 'str-dead-500', 'Deadlift 500', 'Deadlift PR \u2265 500 lb / 225 kg', { lb: 500, kg: 225, lift: 'deadlift' });
  H('strength', 'str-dead-600', 'Deadlift 600', 'Deadlift PR \u2265 600 lb / 270 kg', { lb: 600, kg: 270, lift: 'deadlift' });
  H('strength', 'str-club-1000', '1,000 Pound Club', 'Bench + squat + deadlift PRs combined \u2265 1,000 lb', { lb: 1000 });
  H('strength', 'str-club-1200', '1,200 Pound Club', 'Combined PRs \u2265 1,200 lb', { lb: 1200 });
  H('strength', 'str-club-1500', '1,500 Pound Club', 'Combined PRs \u2265 1,500 lb', { lb: 1500 });
  H('strength', 'str-club-400kg', '400 Kilogram Club', 'Combined PRs \u2265 400 kg', { kg: 400 });
  H('strength', 'str-club-500kg', '500 Kilogram Club', 'Combined PRs \u2265 500 kg', { kg: 500 });
  H('strength', 'str-club-600kg', '600 Kilogram Club', 'Combined PRs \u2265 600 kg', { kg: 600 });
  H('strength', 'str-ohp-95', 'Overhead Press 95', 'Overhead press PR \u2265 95 lb / 40 kg', { lb: 95, kg: 40, lift: 'ohp' });
  H('strength', 'str-ohp-135', 'Overhead Press 135', 'Overhead press PR \u2265 135 lb / 60 kg', { lb: 135, kg: 60, lift: 'ohp' });
  H('strength', 'str-ohp-185', 'Overhead Press 185', 'Overhead press PR \u2265 185 lb / 80 kg', { lb: 185, kg: 80, lift: 'ohp' });
  H('strength', 'str-ohp-225', 'Overhead Press 225', 'Overhead press PR \u2265 225 lb / 100 kg', { lb: 225, kg: 100, lift: 'ohp' });
  H('strength', 'str-pull-25', 'Weighted Pull-Up +25', 'Added-weight pull-up PR \u2265 25 lb / 10 kg', { lb: 25, kg: 10, lift: 'pullup' });
  H('strength', 'str-pull-50', 'Weighted Pull-Up +50', 'Added-weight pull-up PR \u2265 50 lb / 20 kg', { lb: 50, kg: 20, lift: 'pullup' });
  H('strength', 'str-pull-75', 'Weighted Pull-Up +75', 'Added-weight pull-up PR \u2265 75 lb / 35 kg', { lb: 75, kg: 35, lift: 'pullup' });
  H('strength', 'str-pull-100', 'Weighted Pull-Up +100', 'Added-weight pull-up PR \u2265 100 lb / 45 kg', { lb: 100, kg: 45, lift: 'pullup' });

  // ── CHAPTERS (14) ──
  H('chapters', 'chp-first', 'First Chapter Sealed', 'Seal your first chapter');
  H('chapters', 'chp-5', '5 Chapters Sealed', 'Sealed chapters \u2265 5');
  H('chapters', 'chp-10', '10 Chapters Sealed', 'Sealed chapters \u2265 10');
  H('chapters', 'chp-25', '25 Chapters Sealed', 'Sealed chapters \u2265 25');
  H('chapters', 'chp-50', '50 Chapters Sealed', 'Sealed chapters \u2265 50');
  H('chapters', 'chp-depth-10', '10 Workouts in a Chapter', 'Sessions within one chapter \u2265 10');
  H('chapters', 'chp-depth-25', '25 Workouts in a Chapter', 'Sessions within one chapter \u2265 25');
  H('chapters', 'chp-depth-50', '50 Workouts in a Chapter', 'Sessions within one chapter \u2265 50');
  H('chapters', 'chp-depth-100', '100 Workouts in a Chapter', 'Sessions within one chapter \u2265 100');
  H('chapters', 'chp-depth-250', '250 Workouts in a Chapter', 'Sessions within one chapter \u2265 250');
  H('chapters', 'chp-half', 'Half a Year, One Chapter', 'One chapter held open \u2265 182 days');
  H('chapters', 'chp-year', 'A Full Year, One Chapter', 'One chapter held open \u2265 365 days');
  H('chapters', 'chp-2yr', 'Two Years, One Chapter', 'One chapter held open \u2265 730 days');
  H('chapters', 'chp-3yr', 'Three Years, One Chapter', 'One chapter held open \u2265 1,095 days');

  // ── TRAINING (23) ──
  H('training', 'trn-first', 'First Workout Logged', 'Total sessions \u2265 1');
  H('training', 'trn-25', '25 Workouts Logged', 'Total sessions \u2265 25');
  H('training', 'trn-50', '50 Workouts Logged', 'Total sessions \u2265 50');
  H('training', 'trn-100', '100 Workouts Logged', 'Total sessions \u2265 100');
  H('training', 'trn-250', '250 Workouts Logged', 'Total sessions \u2265 250');
  H('training', 'trn-500', '500 Workouts Logged', 'Total sessions \u2265 500');
  H('training', 'trn-1000', '1,000 Workouts Logged', 'Total sessions \u2265 1,000');
  H('training', 'trn-1500', '1,500 Workouts Logged', 'Total sessions \u2265 1,500');
  H('training', 'trn-2500', '2,500 Workouts Logged', 'Total sessions \u2265 2,500');
  H('training', 'trn-5000', '5,000 Workouts Logged', 'Total sessions \u2265 5,000');
  H('training', 'trn-hr-100', '100 Hours Forged', 'Cumulative session hours \u2265 100');
  H('training', 'trn-hr-250', '250 Hours Forged', 'Cumulative session hours \u2265 250');
  H('training', 'trn-hr-500', '500 Hours Forged', 'Cumulative session hours \u2265 500');
  H('training', 'trn-hr-1000', '1,000 Hours Forged', 'Cumulative session hours \u2265 1,000');
  H('training', 'trn-hr-2500', '2,500 Hours Forged', 'Cumulative session hours \u2265 2,500');
  H('training', 'trn-hr-5000', '5,000 Hours Forged', 'Cumulative session hours \u2265 5,000');
  H('training', 'trn-hr-7500', '7,500 Hours Forged', 'Cumulative session hours \u2265 7,500');
  H('training', 'trn-hr-10000', '10,000 Hours Forged', 'Cumulative session hours \u2265 10,000');
  H('training', 'trn-wk-10', '10 Active Weeks', 'Cumulative active weeks \u2265 10');
  H('training', 'trn-wk-50', '50 Active Weeks', 'Cumulative active weeks \u2265 50');
  H('training', 'trn-wk-150', '150 Active Weeks', 'Cumulative active weeks \u2265 150');
  H('training', 'trn-wk-300', '300 Active Weeks', 'Cumulative active weeks \u2265 300');
  H('training', 'trn-wk-500', '500 Active Weeks', 'Cumulative active weeks \u2265 500');

  // ── GOALS (6) ──
  H('goals', 'goal-first', 'First Goal Achieved', 'Goals achieved \u2265 1');
  H('goals', 'goal-5', '5 Goals Achieved', 'Goals achieved \u2265 5');
  H('goals', 'goal-10', '10 Goals Achieved', 'Goals achieved \u2265 10');
  H('goals', 'goal-25', '25 Goals Achieved', 'Goals achieved \u2265 25');
  H('goals', 'goal-50', '50 Goals Achieved', 'Goals achieved \u2265 50');
  H('goals', 'goal-100', '100 Goals Achieved', 'Goals achieved \u2265 100');

  // ── PROGRAMS (7) ──
  H('programs', 'prog-first', 'First Program Graduated', 'Programs graduated \u2265 1');
  H('programs', 'prog-5', '5 Programs Graduated', 'Programs graduated \u2265 5');
  H('programs', 'prog-10', '10 Programs Graduated', 'Programs graduated \u2265 10');
  H('programs', 'prog-25', '25 Programs Graduated', 'Programs graduated \u2265 25');
  H('programs', 'prog-50', '50 Programs Graduated', 'Programs graduated \u2265 50');
  H('programs', 'prog-family', 'Program Family Mastery', 'Graduate every program in one successor lineage');
  H('programs', 'prog-3lineage', 'Three Lineages Mastered', 'Fully master 3 distinct program lineages');

  // ── PARTNERSHIP (3) ──
  H('partnership', 'prt-first', 'First Workout With Friend', 'Workout-with-friend sessions \u2265 1');
  H('partnership', 'prt-10', '10 Workouts With Friend', 'Workout-with-friend sessions \u2265 10');
  H('partnership', 'prt-50', '50 Workouts With Friend', 'Workout-with-friend sessions \u2265 50');

  // ── LONGEVITY (7) ──
  H('longevity', 'lng-90d', '90 Days Forging', 'Account age \u2265 90 days');
  H('longevity', 'lng-1yr', '1 Year Forging', 'Account age \u2265 1 year');
  H('longevity', 'lng-3yr', '3 Years Forging', 'Account age \u2265 3 years');
  H('longevity', 'lng-5yr', '5 Years Forging', 'Account age \u2265 5 years');
  H('longevity', 'lng-10yr', '10 Years Forging', 'Account age \u2265 10 years');
  H('longevity', 'lng-15yr', '15 Years Forging', 'Account age \u2265 15 years');
  H('longevity', 'lng-20yr', '20 Years Forging', 'Account age \u2265 20 years');

  // ── ENDURANCE (38) ──
  H('endurance', 'end-run-mile', 'First Mile Run', 'Run \u2265 1 mile in a session');
  H('endurance', 'end-run-5k', 'First 5K Run', 'Run \u2265 5K in a session');
  H('endurance', 'end-run-10k', 'First 10K Run', 'Run \u2265 10K in a session');
  H('endurance', 'end-run-half', 'First Half Marathon Run', 'Run \u2265 13.1 mi in a session');
  H('endurance', 'end-run-marathon', 'First Marathon Run', 'Run \u2265 26.2 mi in a session');
  H('endurance', 'end-run-lt-100', '100 Lifetime Running Miles', 'Lifetime running distance \u2265 100 mi');
  H('endurance', 'end-run-lt-500', '500 Lifetime Running Miles', 'Lifetime running distance \u2265 500 mi');
  H('endurance', 'end-run-lt-1000', '1,000 Lifetime Running Miles', 'Lifetime running distance \u2265 1,000 mi');
  H('endurance', 'end-run-lt-5000', '5,000 Lifetime Running Miles', 'Lifetime running distance \u2265 5,000 mi');
  H('endurance', 'end-run-lt-15000', '15,000 Lifetime Running Miles', 'Lifetime running distance \u2265 15,000 mi');
  H('endurance', 'end-walk-mile', 'First Mile Walked', 'Walk \u2265 1 mile in a session');
  H('endurance', 'end-walk-5k', 'First 5K Walked', 'Walk \u2265 5K in a session');
  H('endurance', 'end-walk-10k', 'First 10K Walked', 'Walk \u2265 10K in a session');
  H('endurance', 'end-walk-half', 'First Half Marathon Walk', 'Walk \u2265 13.1 mi in a session');
  H('endurance', 'end-walk-marathon', 'First Marathon Walk', 'Walk \u2265 26.2 mi in a session');
  H('endurance', 'end-walk-lt-100', '100 Lifetime Walking Miles', 'Lifetime walking distance \u2265 100 mi');
  H('endurance', 'end-walk-lt-500', '500 Lifetime Walking Miles', 'Lifetime walking distance \u2265 500 mi');
  H('endurance', 'end-walk-lt-1000', '1,000 Lifetime Walking Miles', 'Lifetime walking distance \u2265 1,000 mi');
  H('endurance', 'end-walk-lt-5000', '5,000 Lifetime Walking Miles', 'Lifetime walking distance \u2265 5,000 mi');
  H('endurance', 'end-walk-lt-15000', '15,000 Lifetime Walking Miles', 'Lifetime walking distance \u2265 15,000 mi');
  H('endurance', 'end-cyc-25', 'First 25-Mile Ride', 'Cycle \u2265 25 mi in a session');
  H('endurance', 'end-cyc-50', 'First 50-Mile Ride', 'Cycle \u2265 50 mi in a session');
  H('endurance', 'end-cyc-century', 'First Century Ride', 'Cycle \u2265 100 mi in a session');
  H('endurance', 'end-cyc-double', 'First Double Century Ride', 'Cycle \u2265 200 mi in a session');
  H('endurance', 'end-cyc-lt-250', '250 Lifetime Cycling Miles', 'Lifetime cycling distance \u2265 250 mi');
  H('endurance', 'end-cyc-lt-1000', '1,000 Lifetime Cycling Miles', 'Lifetime cycling distance \u2265 1,000 mi');
  H('endurance', 'end-cyc-lt-5000', '5,000 Lifetime Cycling Miles', 'Lifetime cycling distance \u2265 5,000 mi');
  H('endurance', 'end-cyc-lt-15000', '15,000 Lifetime Cycling Miles', 'Lifetime cycling distance \u2265 15,000 mi');
  H('endurance', 'end-cyc-lt-50000', '50,000 Lifetime Cycling Miles', 'Lifetime cycling distance \u2265 50,000 mi');
  H('endurance', 'end-swim-500', 'First 500m Swim', 'Swim \u2265 500 m in a session');
  H('endurance', 'end-swim-1000', 'First 1000m Swim', 'Swim \u2265 1,000 m in a session');
  H('endurance', 'end-swim-mile', 'First Mile Swim', 'Swim \u2265 1 mile in a session');
  H('endurance', 'end-swim-5k', 'First 5K Swim', 'Swim \u2265 5K in a session');
  H('endurance', 'end-swim-lt-25', '25 Lifetime Swimming Kilometers', 'Lifetime swimming distance \u2265 25 km');
  H('endurance', 'end-swim-lt-100', '100 Lifetime Swimming Kilometers', 'Lifetime swimming distance \u2265 100 km');
  H('endurance', 'end-swim-lt-250', '250 Lifetime Swimming Kilometers', 'Lifetime swimming distance \u2265 250 km');
  H('endurance', 'end-swim-lt-500', '500 Lifetime Swimming Kilometers', 'Lifetime swimming distance \u2265 500 km');
  H('endurance', 'end-swim-lt-1000', '1,000 Lifetime Swimming Kilometers', 'Lifetime swimming distance \u2265 1,000 km');

  // ── COMPETITION (9) ──
  H('competition', 'cmp-first-win', 'First Victory', 'Challenges won \u2265 1');
  H('competition', 'cmp-win-10', '10 Challenge Wins', 'Challenges won \u2265 10');
  H('competition', 'cmp-win-25', '25 Challenge Wins', 'Challenges won \u2265 25');
  H('competition', 'cmp-first-enter', 'First Challenge Entered', 'Challenges entered \u2265 1');
  H('competition', 'cmp-enter-10', '10 Challenges Entered', 'Challenges entered \u2265 10');
  H('competition', 'cmp-veteran', 'Challenge Veteran', 'Challenges entered \u2265 25');
  H('competition', 'cmp-streak-3', '3-Challenge Streak', 'Squad participation streak \u2265 3');
  H('competition', 'cmp-streak-5', '5-Challenge Streak', 'Squad participation streak \u2265 5');
  H('competition', 'cmp-streak-10', '10-Challenge Streak', 'Squad participation streak \u2265 10');

  // ── COMMUNITIES (5) ──
  H('communities', 'com-first', 'First Community Joined', 'Communities joined \u2265 1');
  H('communities', 'com-builder', 'Community Builder', 'An owned community reaches 50 members');
  H('communities', 'com-helpful', 'Helpful Contributor', 'Cumulative comment likes received \u2265 25');
  H('communities', 'com-mentor', 'Mentor', '10 distinct liked top-level comments across \u2265 3 communities');
  H('communities', 'com-organizer', 'Event Organizer', 'Host 1 community event through to its scheduled end');

  // ── SQUAD (15) ──
  H('squad', 'sqd-founder', 'Squad Founder', 'Create a squad');
  H('squad', 'sqd-pw-first', 'First Perfect Week', 'Every current member trained every day of a 7-day window');
  H('squad', 'sqd-pw-10', '10 Perfect Weeks', 'Perfect weeks \u2265 10');
  H('squad', 'sqd-pw-25', '25 Perfect Weeks', 'Perfect weeks \u2265 25');
  H('squad', 'sqd-streak-7', '7-Day Squad Streak', 'Squad streak \u2265 7 days');
  H('squad', 'sqd-streak-30', '30-Day Squad Streak', 'Squad streak \u2265 30 days');
  H('squad', 'sqd-streak-100', '100-Day Squad Streak', 'Squad streak \u2265 100 days');
  H('squad', 'sqd-mission-first', 'First Mission Complete', 'Squad missions completed \u2265 1');
  H('squad', 'sqd-mission-10', '10 Missions Complete', 'Squad missions completed \u2265 10');
  H('squad', 'sqd-mission-25', '25 Missions Complete', 'Squad missions completed \u2265 25');
  H('squad', 'sqd-teamplayer', 'Team Player', 'Cumulative check-ins logged \u2265 50');
  H('squad', 'sqd-wk-100', '100 Squad Workouts', 'Squad cumulative workouts \u2265 100');
  H('squad', 'sqd-wk-500', '500 Squad Workouts', 'Squad cumulative workouts \u2265 500');
  H('squad', 'sqd-wk-1000', '1,000 Squad Workouts', 'Squad cumulative workouts \u2265 1,000');
  H('squad', 'sqd-everyone', 'Everyone Finished Program', 'Every current squad member graduates the same program');

  // ── PRESTIGE (8) ──
  H('prestige', 'prs-4paths', 'Many Paths', 'Top-tier in \u2265 4 of 7 solo categories + 1 Year Forging');
  H('prestige', 'prs-5paths', 'A Wider Legacy', 'Top-tier in \u2265 5 of 7 + 3 Years Forging');
  H('prestige', 'prs-6paths', 'Almost Every Path', 'Top-tier in \u2265 6 of 7 + 5 Years Forging');
  H('prestige', 'prs-7paths', 'The Complete Legacy', 'Top-tier in all 7 of 7 + 10 Years Forging');
  H('prestige', 'prs-lifter', 'The Complete Lifter', 'Bench 405 + Squat 500 + Deadlift 600 + 3 Years');
  H('prestige', 'prs-disciplines', 'Three Disciplines', 'First Marathon + First Century Ride + First 5K Swim + 3 Years');
  H('prestige', 'prs-plan', 'Built by the Plan', 'Three Lineages Mastered + (1,500 lb or 600 kg Club) + 5 Years');
  H('prestige', 'prs-chapters', 'A Life in Chapters', '25 Chapters Sealed + 50 Goals Achieved + 5 Years');

  // ── HIDDEN (6) ── never surfaced until earned
  H('hidden', 'hid-early', 'Early Forge', 'Session start before 6:00 AM local');
  H('hidden', 'hid-midnight', 'Midnight Forge', 'Session start 12:00\u20133:00 AM local');
  H('hidden', 'hid-newyear', "New Year's Forge", 'Session logged on January 1');
  H('hidden', 'hid-leapday', 'Leap Day Forge', 'Session logged on February 29');
  H('hidden', 'hid-fullcircle', 'Full Circle', 'Session on account anniversary in a non-Longevity year');
  H('hidden', 'hid-triple', 'Triple Threat', 'Honors from 3 different categories in one evaluation');

  // ── index ──
  var BY_ID = {};
  ALL.forEach(function (h) { BY_ID[h.id] = h; });

  // ── DESIGN SEED: which honors each tenure has earned (id + earned date) ──
  // Kept consistent with forge-user.js lifts/counts (a y3 veteran = Architect,
  // ~3 yr; y1 = Craftsman, ~1 yr; new = day one). Newest date shown as "Recent".
  var SEED = {
    'new': [],
    'y1': [
      { id: 'trn-first',     date: 'Feb 3, 2025' },
      { id: 'chp-first',     date: 'Feb 3, 2025' },
      { id: 'goal-first',    date: 'Mar 20, 2025' },
      { id: 'lng-90d',       date: 'May 4, 2025' },
      { id: 'str-bench-135', date: 'Jun 15, 2025' },
      { id: 'str-squat-225', date: 'Sep 2, 2025' },
    ],
    'y3': [
      { id: 'trn-first',     date: 'Jan 20, 2023' },
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
