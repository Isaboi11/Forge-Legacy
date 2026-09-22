/* Forge Legacy — Community Posts store (shared source of truth for the feed).
 * Consumed by: Community Home (feed), Community Composer (create), Community Post Detail (thread).
 *
 * Post TYPES are role-gated. gate: 'member' = anyone in the community may post it;
 * 'mod' = owner/moderators only. The owner configures these later (4-role management);
 * here the defaults are enforced and the composer greys out what the viewer can't post.
 *
 * Seed posts are static, representative content per community (so Post Detail can open any of
 * them). New posts authored in the composer + new comments are persisted as a localStorage
 * overlay and merged on top, so Home, Detail, and the composer all agree.
 */
(function () {
  var POSTS_KEY = 'forge.community.posts.v1';      // { [communityId]: [post, ...] }  (newest first)
  var COMMENTS_KEY = 'forge.community.comments.v1'; // { [postId]: [comment, ...] }    (newest first)

  var TYPES = [
    { id: 'discussion',  label: 'Discussion',       icon: 'message',  gate: 'member', blurb: 'Start a conversation or share a training note.' },
    { id: 'photo',       label: 'Photo',            icon: 'image',    gate: 'member', blurb: 'Share a photo from your training.' },
    { id: 'formcheck',   label: 'Video / Form Check', icon: 'video',  gate: 'member', blurb: 'Post a lift for honest feedback.' },
    { id: 'achievement', label: 'Achievement',      icon: 'trophy',   gate: 'member', blurb: 'Log a PR or milestone lift.' },
    { id: 'question',    label: 'Question',         icon: 'help',     gate: 'member', blurb: 'Ask the community for input.' },
    { id: 'poll',        label: 'Poll',             icon: 'poll',     gate: 'member', blurb: 'Put a question to a vote.' },
    { id: 'event',       label: 'Event',            icon: 'calendar', gate: 'mod',    blurb: 'Schedule a community event.' },
    { id: 'forgeprogram',label: 'Forge Program',    icon: 'dumbbell', gate: 'mod',    blurb: 'Share a program members can run.' },
    { id: 'paidprogram', label: 'Paid Program',     icon: 'external', gate: 'mod',    blurb: 'Link a paid program that imports to Forge.' },
    { id: 'milestone',   label: 'Milestone',        icon: 'flag',     gate: 'mod',    blurb: 'Post a shared community goal.' }
  ];

  var RANK = { member: 0, mod: 1, owner: 2 };

  // ── Seed posts, keyed by community. Each post: id, type, author, role, time, body + type fields, respect, comments[] ──
  var SEED = {
    ironcollective: [
      { id: 'ic_disc', type: 'discussion', author: 'Marcus Vale', role: 'mod', time: '4h ago', respect: 28,
        body: 'Bracing cue that finally clicked for my athletes: breathe into your belt 360\u00b0, not just the front. Try it on your next heavy set and report back.',
        comments: [
          { id: 'c1', author: 'Jasmine Rae', role: null, time: '3h ago', respect: 6, body: 'This changed my squat overnight. The obliques finally engage.', replies: [] },
          { id: 'c2', author: 'Coach Halden', role: 'owner', time: '2h ago', respect: 11, body: 'Exactly. Cue it as \u201cexpand the can,\u201d not \u201cpush the gut out.\u201d', replies: [
            { id: 'c2r1', author: 'Marcus Vale', role: 'mod', time: '2h ago', respect: 3, body: 'Stealing that cue for tomorrow\u2019s session.' }
          ] }
        ] },
      { id: 'ic_pr', type: 'achievement', author: 'Jasmine Rae', role: null, time: '5h ago', respect: 52,
        body: 'Hit a new PR today. 405 for a single. All glory to the process.',
        achievement: { value: '405 lb', exercise: 'Bench Press', label: 'New Personal Record' },
        comments: [
          { id: 'c1', author: 'Alex Morgan', role: null, time: '4h ago', respect: 4, body: 'Monster. Congrats!', replies: [] },
          { id: 'c2', author: 'Coach Halden', role: 'owner', time: '4h ago', respect: 9, body: 'Two years of consistency showing up. Proud of you.', replies: [] }
        ] },
      { id: 'ic_fc', type: 'formcheck', author: 'Theo Brandt', role: null, time: '2d ago', respect: 33,
        body: 'Third set at 180kg. Does my hip rise look early to anyone? Honest eyes welcome.',
        media: { dur: '0:27' },
        comments: [
          { id: 'c1', author: 'Marcus Vale', role: 'mod', time: '2d ago', respect: 7, body: 'Hips beat the bar a touch. Cue \u201cchest up, drive the floor away\u201d and it evens out.', replies: [] }
        ] },
      { id: 'ic_ev', type: 'event', author: 'Coach Halden', role: 'owner', time: '1d ago', respect: 30,
        body: 'Doors open early this Saturday \u2014 bring a friend who\u2019s never lifted with a crew before.',
        event: { month: 'OCT', day: '12', title: 'Saturday Community Lift', when: 'Sat \u00b7 9:00 AM \u00b7 Main Floor', going: 128 },
        comments: [
          { id: 'c1', author: 'Owen Clarke', role: null, time: '1d ago', respect: 2, body: 'Bringing two first-timers. They\u2019re nervous but in.', replies: [] }
        ] },
      { id: 'ic_prog', type: 'forgeprogram', author: 'Coach Halden', role: 'owner', time: '6h ago', respect: 64,
        body: 'Sharing the block a lot of you asked for. 8 weeks, upper/lower, built to add to your bench and squat without frying you. Save it and run it when your current program wraps.',
        program: { title: 'October Strength Block', meta: '8 weeks \u00b7 Upper / Lower \u00b7 4 days/wk' },
        comments: [
          { id: 'c1', author: 'Theo Brandt', role: null, time: '5h ago', respect: 4, body: 'Ran the beta of this. The upper-day volume is brutal in the best way.', replies: [] }
        ] },
      { id: 'ic_progext', type: 'paidprogram', author: 'Elena Ruiz', role: 'mod', time: '1d ago', respect: 88,
        body: 'My full 12-week hypertrophy program is live. Same spreadsheet my in-person clients run \u2014 buy once, then import it straight into Forge Legacy and track every session here.',
        program: { title: 'Hypertrophy Foundations', meta: '12 weeks \u00b7 Push/Pull/Legs \u00b7 imports to Forge', price: '$29' },
        comments: [
          { id: 'c1', author: 'Jasmine Rae', role: null, time: '20h ago', respect: 6, body: 'Bought it. The import-to-Forge flow is seamless \u2014 every session tracked automatically.', replies: [] }
        ] }
    ],
    endurance: [
      { id: 'en_ach', type: 'achievement', author: 'Owen Clarke', role: null, time: '2h ago', respect: 61,
        body: 'First sub-20 5K this morning. Three years chipping at it. Legs are jelly.',
        achievement: { value: '19:48', exercise: '5K', label: 'New Personal Record' },
        comments: [
          { id: 'c1', author: 'Dana Whitfield', role: 'owner', time: '2h ago', respect: 8, body: 'Huge. The barrier is as mental as physical \u2014 well earned.', replies: [] }
        ] },
      { id: 'en_q', type: 'question', author: 'Priya Nair', role: 'mod', time: '6h ago', respect: 24,
        body: 'Long-run fueling: what\u2019s everyone taking past the 90-minute mark? Comparing notes for fall marathons.',
        comments: [
          { id: 'c1', author: 'Owen Clarke', role: null, time: '5h ago', respect: 5, body: '40g carbs/hr for me, gels every 30 min. Gut took weeks to train though.', replies: [] },
          { id: 'c2', author: 'Sam Reeves', role: null, time: '4h ago', respect: 3, body: 'Real food up to 2hr, then gels. Rice cakes are underrated.', replies: [] }
        ] }
    ]
  };

  function read(key) { try { var v = JSON.parse(localStorage.getItem(key)); if (v && typeof v === 'object') return v; } catch (e) {} return {}; }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  function mergedComments(communityId, post) {
    var overlay = read(COMMENTS_KEY)[post.id] || [];
    return overlay.concat(post.comments || []);
  }

  window.ForgeCommunityPosts = {
    TYPES: TYPES.slice(),
    type: function (id) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i]; return null; },
    canPost: function (role, typeId) { var t = this.type(typeId); if (!t) return false; return (RANK[role] || 0) >= (RANK[t.gate === 'mod' ? 'mod' : 'member'] || 0); },
    allowedFor: function (role) { var self = this; return TYPES.filter(function (t) { return self.canPost(role, t.id); }); },

    // Feed for a community: new (persisted) posts on top of seed.
    list: function (communityId) {
      var stored = read(POSTS_KEY)[communityId] || [];
      var seed = SEED[communityId] || [];
      return stored.concat(seed);
    },
    get: function (communityId, postId) {
      var all = this.list(communityId);
      for (var i = 0; i < all.length; i++) if (all[i].id === postId) {
        var p = Object.assign({}, all[i]);
        p.comments = mergedComments(communityId, all[i]);
        return p;
      }
      return null;
    },
    add: function (communityId, post) {
      var map = read(POSTS_KEY);
      var arr = map[communityId] || [];
      var p = Object.assign({ id: 'new_' + Date.now(), time: 'Just now', respect: 0, comments: [] }, post);
      arr.unshift(p);
      map[communityId] = arr; write(POSTS_KEY, map);
      return p;
    },
    addComment: function (communityId, postId, comment) {
      var map = read(COMMENTS_KEY);
      var arr = map[postId] || [];
      var c = Object.assign({ id: 'nc_' + Date.now(), time: 'Just now', respect: 0, replies: [] }, comment);
      arr.unshift(c);
      map[postId] = arr; write(COMMENTS_KEY, map);
      return c;
    }
  };
})();
