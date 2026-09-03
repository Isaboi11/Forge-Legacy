/* Forge Legacy — Squad Posts store (separate domain model).
 *
 * DELIBERATELY NOT the community store. Squads are a narrow, training-centered surface —
 * internal training activity, challenge progress, coordination, recognition, and sanctioned
 * squad events. This store enforces that contract: the full Community taxonomy (public events,
 * polls, program promotion, paid programs, owner/mod editorial categories) is INTENTIONALLY
 * absent, not merely hidden.
 *
 * Shape mirrors ForgeCommunityPosts so the shared Post Detail shell can be reused, but the TYPES,
 * role model, and gating are squad-specific.
 *
 * PER-SQUAD ISOLATION: every post and comment is keyed by squadId. A squad is internal, so there
 * is no cross-squad feed and posts NEVER leak between squads. squad ids match the Squads Hub
 * (iron · dawn · proving · home). The active squad rides on localStorage 'forge.squad' — use
 * activeId() / setActive(id); meta(id) resolves display identity. list/get/add/addComment all
 * REQUIRE a squadId, so a caller physically cannot read or write the wrong squad's feed.
 */
(function () {
  var POSTS_KEY = 'forge.squad.posts.v1';       // { [squadId]: [post, ...] }  (newest first)
  var COMMENTS_KEY = 'forge.squad.comments.v1';  // { [squadId]: { [postId]: [comment, ...] } }
  var REGISTRY_KEY = 'forge.squad.registry.v1';  // { [squadId]: { name, tagline, members, crest, owned } } created squads
  var ACTIVE_KEY = 'forge.squad';                // active squad id

  // Squad-appropriate content only. No poll / public event / program / paid-program / milestone-promo.
  var TYPES = [
    { id: 'progress',     label: 'Progress Photos', icon: 'camera',   gate: 'member', blurb: 'Share your progress photos.' },
    { id: 'recap',        label: 'Workout Recap',   icon: 'dumbbell', gate: 'member', blurb: 'Share how the session went.' },
    { id: 'pr',           label: 'PR / Milestone',  icon: 'trophy',   gate: 'member', blurb: 'Mark a personal record for the squad.' },
    { id: 'formcheck',    label: 'Form Check',      icon: 'video',    gate: 'member', blurb: 'Post a lift for the squad\u2019s eyes.' },
    { id: 'challenge',    label: 'Challenge Update', icon: 'swords',  gate: 'member', blurb: 'Report progress in the active competition.' },
    { id: 'traintogether',label: 'Train Together',  icon: 'train',    gate: 'member', blurb: 'Invite the squad to train live.' },
    { id: 'discussion',   label: 'Discussion',      icon: 'message',  gate: 'member', blurb: 'A short note to the squad.' },
    { id: 'announcement', label: 'Squad Announcement', icon: 'banner', gate: 'captain', blurb: 'Captain-only note pinned for the squad.' }
  ];

  // Retired from the picker but still resolvable so historic posts render.
  var LEGACY = [
    { id: 'checkin', label: 'Check-in', icon: 'check', gate: 'member', blurb: 'Log that you trained today.' }
  ];

  var RANK = { member: 0, captain: 1, owner: 2 };

  // Display identity per squad (mirrors Squads Hub). crest is a Forge symbol id. Feed content is
  // fully separate below. Creator-made squads are persisted in the registry overlay and merge here.
  var SQUADS = {
    iron:    { name: 'Iron Vigil',  tagline: 'Hold the line, every dawn.',            members: 5, crest: 'swords',   photo: true },
    dawn:    { name: 'Dawn Patrol',  tagline: 'First light, before the world wakes.',  members: 6, crest: 'mountain' },
    proving: { name: 'The Proving',  tagline: 'Earn it. Every rep. Every day.',        members: 4, crest: 'shield' },
    home:    { name: 'Home Forge',   tagline: 'Built here. Built together.',           members: 1, crest: 'flame' }
  };

  // Each squad's OWN feed. Distinct content per squad proves there is no cross-squad leak.
  var SEED = {
    iron: [
      { id: 'iv_fc', type: 'formcheck', author: 'Dana Cole', role: null, time: '3h ago', respect: 14,
        body: 'Leg day A \u2014 third set at 180kg. Squad eyes only: does my hip rise look early on the last rep?',
        media: { dur: '0:31' }, challengeContext: 'Forge League \u00b7 Week 3',
        comments: [
          { id: 'c1', author: 'Marcus Vale', role: 'captain', time: '2h ago', respect: 5, body: 'Hips beat the bar a hair on rep 3. Cue chest-up out of the hole and it cleans up.', replies: [
            { id: 'c1r1', author: 'Dana Cole', role: null, time: '2h ago', respect: 1, body: 'On it for tomorrow. Filming again.' }
          ] },
          { id: 'c2', author: 'Ada Ridge', role: 'owner', time: '1h ago', respect: 3, body: 'Looks strong. That\u2019s two clean check-ins this week \u2014 keep it rolling.', replies: [] }
        ] },
      { id: 'iv_pr', type: 'pr', author: 'Marcus Vale', role: 'captain', time: '5h ago', respect: 22,
        body: 'New squad best for the month. Bar speed felt easy, which is the scary part.',
        achievement: { value: '315 lb', exercise: 'Bench Press', label: 'Squad PR' },
        comments: [
          { id: 'c1', author: 'Theo Brandt', role: null, time: '4h ago', respect: 2, body: 'Monster. That\u2019s the one to beat now.', replies: [] }
        ] },
      { id: 'iv_ch', type: 'challenge', author: 'Ada Ridge', role: 'owner', time: '1d ago', respect: 18,
        body: 'Week 3 of the Forge League is in the books \u2014 we\u2019re holding 2nd, two workouts behind Marcus. Two more sessions each closes it.',
        challenge: { name: 'Forge League', place: '2nd', of: '5', metric: '5 workouts' },
        comments: [
          { id: 'c1', author: 'Lena Cross', role: null, time: '22h ago', respect: 1, body: 'Logging a double tomorrow. Let\u2019s take it.', replies: [] }
        ] },
      { id: 'iv_ann', type: 'announcement', author: 'Ada Ridge', role: 'owner', time: '2d ago', respect: 9,
        body: 'Saturday is a squad session at the main floor, 9am. Warm-up starts sharp \u2014 bring your logbooks, we\u2019re maxing the mission this week.',
        comments: [] }
    ],
    dawn: [
      { id: 'dp_ci', type: 'checkin', author: 'Sana Okafor', role: null, time: '1h ago', respect: 7,
        body: 'Checked in \u2014 5:40am tempo run before work. The quiet hour is the whole point.',
        comments: [
          { id: 'c1', author: 'Ravi Menon', role: 'captain', time: '48m ago', respect: 2, body: 'That\u2019s eleven straight for you. The streak is unreal.', replies: [] }
        ] },
      { id: 'dp_pr', type: 'pr', author: 'Ravi Menon', role: 'captain', time: '6h ago', respect: 19,
        body: 'Finally cracked it on a cold morning. Negative split the whole way.',
        achievement: { value: '19:48', exercise: '5K', label: 'Squad PR' },
        comments: [
          { id: 'c1', author: 'Sana Okafor', role: null, time: '5h ago', respect: 3, body: 'Sub-20 before sunrise. Absurd. Congrats.', replies: [] }
        ] },
      { id: 'dp_tt', type: 'traintogether', author: 'Mara Lindqvist', role: null, time: '1d ago', respect: 5,
        body: 'Train together \u2014 Sun \u00b7 6:00 AM \u00b7 Riverside loop\nEasy 10k, coffee after. All paces welcome.',
        comments: [] }
    ]
  };

  function read(key) { try { var v = JSON.parse(localStorage.getItem(key)); if (v && typeof v === 'object') return v; } catch (e) {} return {}; }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function mergedComments(squadId, post) { var byPost = read(COMMENTS_KEY)[squadId] || {}; var overlay = byPost[post.id] || []; return overlay.concat(post.comments || []); }

  window.ForgeSquadPosts = {
    TYPES: TYPES.slice(),
    SQUADS: SQUADS,
    type: function (id) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i]; for (var j = 0; j < LEGACY.length; j++) if (LEGACY[j].id === id) return LEGACY[j]; return null; },
    canPost: function (role, typeId) { var t = this.type(typeId); if (!t) return false; return (RANK[role] || 0) >= (RANK[t.gate === 'captain' ? 'captain' : 'member'] || 0); },
    allowedFor: function (role) { var self = this; return TYPES.filter(function (t) { return self.canPost(role, t.id); }); },

    activeId: function () { try { return localStorage.getItem(ACTIVE_KEY) || 'iron'; } catch (e) { return 'iron'; } },
    setActive: function (id) { try { localStorage.setItem(ACTIVE_KEY, id); } catch (e) {} },
    // meta merges the creator-persisted registry over the built-in seeds.
    meta: function (id) { var reg = read(REGISTRY_KEY); return reg[id] || SQUADS[id] || { name: 'Your Squad', tagline: '', members: 1, crest: 'swords' }; },
    // Register a creator-made squad. Returns the id so the caller can activate + route to it.
    register: function (meta) {
      var reg = read(REGISTRY_KEY);
      var id = meta.id || ('sq_' + Date.now());
      reg[id] = { name: (meta.name || 'Your Squad'), tagline: (meta.tagline || ''), members: (meta.members || 1), crest: (meta.crest || 'swords'), goal: (meta.goal || ''), description: (meta.description || ''), privacy: (meta.privacy || 'Private'), owned: true, created: true };
      write(REGISTRY_KEY, reg); return id;
    },
    // Merge a patch into a squad's identity. Seed squads gain a registry override; meta() merges it.
    updateMeta: function (id, patch) {
      var reg = read(REGISTRY_KEY);
      var base = reg[id] || Object.assign({}, SQUADS[id] || {});
      reg[id] = Object.assign({}, base, patch);
      write(REGISTRY_KEY, reg); return reg[id];
    },
    // All squads the athlete belongs to: creator-made (registry) first, then the built-in seeds.
    all: function () {
      var reg = read(REGISTRY_KEY); var out = [];
      for (var k in reg) if (Object.prototype.hasOwnProperty.call(reg, k)) out.push(Object.assign({ id: k }, reg[k]));
      for (var s in SQUADS) if (Object.prototype.hasOwnProperty.call(SQUADS, s)) out.push(Object.assign({ id: s }, SQUADS[s]));
      return out;
    },

    // Every read/write is squad-scoped — cross-squad leakage is structurally impossible.
    list: function (squadId) { var stored = read(POSTS_KEY)[squadId] || []; return stored.concat(SEED[squadId] || []); },
    get: function (squadId, postId) {
      var all = this.list(squadId);
      for (var i = 0; i < all.length; i++) if (all[i].id === postId) { var p = Object.assign({}, all[i]); p.comments = mergedComments(squadId, all[i]); return p; }
      return null;
    },
    add: function (squadId, post) {
      var map = read(POSTS_KEY); var arr = map[squadId] || [];
      var p = Object.assign({ id: 'sq_' + Date.now(), time: 'Just now', respect: 0, comments: [] }, post);
      arr.unshift(p); map[squadId] = arr; write(POSTS_KEY, map); return p;
    },
    addComment: function (squadId, postId, comment) {
      var map = read(COMMENTS_KEY); var byPost = map[squadId] || {}; var arr = byPost[postId] || [];
      var c = Object.assign({ id: 'sc_' + Date.now(), time: 'Just now', respect: 0, replies: [] }, comment);
      arr.unshift(c); byPost[postId] = arr; map[squadId] = byPost; write(COMMENTS_KEY, map); return c;
    }
  };
})();
