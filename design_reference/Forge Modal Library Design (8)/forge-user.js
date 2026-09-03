/*
 * Forge Legacy — canonical "self" user model (single source of truth).
 *
 * WHY: the app previously hard-coded the logged-in athlete's identity per screen,
 * so "you" were Marcus Vale on Onboarding/Profile, Marcus Vance in Settings, and
 * Ada Ridge in Competitions/Trophy Case — you could literally lose to yourself.
 * Every screen that renders the SELF athlete now reads identity from here.
 *
 * Canonical self = Ada Ridge (@ada.forged). Marcus Vale is a separate NPC rival/
 * squadmate (kept consistent as "Vale", never "Vance").
 *
 * TENURE: the app also only modelled new-vs-established. This model carries three
 * tenure tiers so personas actually differ. Select with ?tenure=new|y1|y3
 * (or localStorage 'forge.tenure'); default established = 'y3'. Screens read the
 * tier's counts to scale history depth (honors, chapters, PRs, competitions…).
 *
 * Data only — no React. Screens format/units it themselves (ForgeUnits).
 */
(function () {
  var LIFTS_Y3 = { squat: 405, bench: 275, deadlift: 495, squatCurrent: 335 };

  var TIERS = {
    // Brand-new athlete — day one. Near-empty legacy.
    'new': {
      tenure: 'new', name: 'Ada Ridge', firstName: 'Ada', handle: 'ada.forged', initials: 'AR',
      joinedYear: '2026', joinedLabel: 'Forging since 2026', memberYears: 0,
      rankTitle: 'Foundation', rankTier: 'I', rankFull: 'Foundation · I', statement: "I've started.",
      archetype: 'New Athlete',
      counts: { chapters: 0, honors: 0, prs: 0, competitions: 0, championships: 0, podiums: 0, squadYears: 0, weeklyStreak: 0 },
      lifts: { squat: null, bench: null, deadlift: null, squatCurrent: null },
      hasHistory: false,
    },
    // ~1 year in — consistent, mid-ladder, some legacy.
    'y1': {
      tenure: 'y1', name: 'Ada Ridge', firstName: 'Ada', handle: 'ada.forged', initials: 'AR',
      joinedYear: '2025', joinedLabel: 'Forging since 2025', memberYears: 1,
      rankTitle: 'Craftsman', rankTier: 'III', rankFull: 'Craftsman · III', statement: 'I know how to train.',
      archetype: 'Athlete',
      counts: { chapters: 1, honors: 6, prs: 9, competitions: 3, championships: 1, podiums: 2, squadYears: 1, weeklyStreak: 2 },
      lifts: { squat: 335, bench: 225, deadlift: 405, squatCurrent: 300 },
      hasHistory: true,
    },
    // ~3 years in — deep legacy, high rank, full competitive résumé.
    'y3': {
      tenure: 'y3', name: 'Ada Ridge', firstName: 'Ada', handle: 'ada.forged', initials: 'AR',
      joinedYear: '2023', joinedLabel: 'Forging since 2023', memberYears: 3,
      rankTitle: 'Established', rankTier: 'II', rankFull: 'Established · II', statement: "I've built something real.",
      archetype: 'Bodybuilder',
      counts: { chapters: 3, honors: 18, prs: 22, competitions: 12, championships: 3, podiums: 9, squadYears: 2, weeklyStreak: 5 },
      lifts: LIFTS_Y3,
      hasHistory: true,
    },
  };

  function readTenure() {
    try {
      var u = new URL(window.location.href);
      var p = (u.searchParams.get('tenure') || '').toLowerCase();
      if (TIERS[p]) { try { window.localStorage.setItem('forge.tenure', p); } catch (e) {} return p; }
    } catch (e) {}
    try { var s = window.localStorage.getItem('forge.tenure'); if (TIERS[s]) return s; } catch (e) {}
    return 'y3'; // default = established veteran (matches the app's existing seed depth)
  }

  function resolve() {
    var t = TIERS[readTenure()] || TIERS.y3;
    // If the athlete typed a name during onboarding, honor it over the canonical default.
    var out = Object.assign({}, t);
    try {
      var nm = window.localStorage.getItem('forge.profile.name');
      if (nm && nm.trim()) {
        out.name = nm.trim();
        out.firstName = out.name.split(/\s+/)[0];
        var parts = out.name.trim().split(/\s+/);
        out.initials = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
      }
      var hd = window.localStorage.getItem('forge.profile.handle');
      if (hd && hd.trim()) out.handle = hd.trim().replace(/^@/, '');
      var sx = window.localStorage.getItem('forge.profile.sex');
      if (sx) out.sex = (String(sx).toLowerCase().charAt(0) === 'f') ? 'f' : 'm';
    } catch (e) {}
    if (!out.sex) out.sex = 'm'; // gendered artwork (e.g. Established rank) defaults to male
    return out;
  }

  window.ForgeUser = {
    TIERS: TIERS,
    tenure: readTenure,
    get: resolve,
    // convenience: the canonical NPC rival/squadmate, so screens stop inventing "Vance".
    rival: { name: 'Marcus Vale', firstName: 'Marcus', handle: 'marcus.vale', initials: 'MV', rankFull: 'Architect · III' },
  };
})();
