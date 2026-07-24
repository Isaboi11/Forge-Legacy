/* Forge Legacy — Profile Visibility model.
 * Single source of truth for which Legacy sections an athlete exposes, and to whom.
 * Persisted to localStorage so the settings screen and the public profile stay in sync.
 * Mirrors the ForgeUnits pub/sub shape used elsewhere in the app.
 *
 * Audience ladder (least → most private):
 *   everyone  — anyone who lands on the profile
 *   squads    — squad-mates (and anyone closer)
 *   friends   — accepted friends only
 *   private   — nobody but the owner
 *
 * A viewer's clearance:
 *   Stranger / Following → everyone
 *   Squad-mate          → everyone + squads
 *   Friend              → everyone + squads + friends
 *
 * Rank, My Standard and Honors are core identity — always visible, never listed here.
 */
(function () {
  var KEY = 'forge.profile.visibility';

  var SECTIONS = [
    { key: 'chapter',        label: 'Current Chapter & Goal', desc: 'The chapter you\u2019re training through now, and its goal.', symbol: 'book',       def: 'everyone' },
    { key: 'history',        label: 'Chapter History',        desc: 'Sealed chapters from your past.',                          symbol: 'chapter-seal', def: 'everyone' },
    { key: 'timeline',       label: 'Timeline',               desc: 'The running log of milestones and events.',                symbol: 'banner',     def: 'squads' },
    { key: 'transformation', label: 'Transformation',         desc: 'Physique and progress footage.',                           symbol: 'spark',      def: 'friends' },
    { key: 'photos',         label: 'Photos',                 desc: 'Your full photo archive.',                                 symbol: 'medal',      def: 'friends' },
    { key: 'accomplishments',label: 'Accomplishments',        desc: 'Records and milestones you\u2019ve preserved.',            symbol: 'trophy',     def: 'everyone' },
    { key: 'stats',          label: 'Training Stats',         desc: 'Volume, streaks and totals.',                              symbol: 'dumbbell',   def: 'squads' },
  ];

  var AUDIENCES = [
    { id: 'everyone', label: 'Everyone', short: 'Everyone' },
    { id: 'squads',   label: 'Squads',   short: 'Squads' },
    { id: 'friends',  label: 'Friends',  short: 'Friends' },
    { id: 'private',  label: 'Only me',  short: 'Only me' },
  ];

  var AUD_RANK = { everyone: 1, squads: 2, friends: 3, private: 99 };
  function clearanceOf(viewer) {
    switch (String(viewer || '').toLowerCase()) {
      case 'friend': case 'friends': return 3;
      case 'squad-mate': case 'squadmate': case 'squad': return 2;
      case 'owner': case 'self': return 99;
      default: return 1; // stranger, following
    }
  }

  var defaults = {};
  SECTIONS.forEach(function (s) { defaults[s.key] = s.def; });

  function load() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(KEY));
      return Object.assign({}, defaults, raw || {});
    } catch (e) { return Object.assign({}, defaults); }
  }

  var state = load();
  var subs = [];

  function emit() { subs.slice().forEach(function (fn) { try { fn(Object.assign({}, state)); } catch (e) {} }); }
  function persist() { try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  window.addEventListener('storage', function (e) {
    if (e && e.key === KEY) { state = load(); emit(); }
  });

  window.ForgeVisibility = {
    SECTIONS: SECTIONS,
    AUDIENCES: AUDIENCES,
    defaults: Object.assign({}, defaults),

    get: function (key) { return key ? state[key] : Object.assign({}, state); },
    set: function (key, value) { state[key] = value; persist(); emit(); },
    reset: function () { state = Object.assign({}, defaults); persist(); emit(); },

    // Can a viewer with `viewer` relationship see a section whose audience is `audience`?
    canSee: function (audience, viewer) {
      var need = AUD_RANK[audience] || 1;
      if (need >= 99) return false; // private — owner only
      return clearanceOf(viewer) >= need;
    },

    audienceLabel: function (id) {
      for (var i = 0; i < AUDIENCES.length; i++) if (AUDIENCES[i].id === id) return AUDIENCES[i].label;
      return id;
    },

    subscribe: function (fn) {
      subs.push(fn);
      return function () { subs = subs.filter(function (f) { return f !== fn; }); };
    },
  };
})();
