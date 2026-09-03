/* Forge Legacy — Friends Posts store (separate domain model).
 *
 * The simplest, most personal surface. A flat, author-scoped personal feed — NOT keyed by any
 * community or squad. No roles, no post-type taxonomy, no gating, no moderation hierarchy.
 *
 * A friend post is lightweight: a caption + an optional single medium (photo / video / progress)
 * and optional attachments (workout / PR / honor / program). "kind" describes the medium — it is
 * NOT a Community-style editorial category. Audience is the only control: friends | squad | both,
 * never public. Reactions are a small acknowledge vocabulary, never a popularity count.
 *
 * Consumed by: Forge Friends Feed (list / create / detail) and the shared Post Detail (friend
 * origin) via get(). caption and body are kept as aliases so both the Friends feed and the shared
 * shell read the same seed. Comments are arrays (canonical), shaped like the other two stores.
 */
(function () {
  var POSTS_KEY = 'forge.friends.posts.v1';        // [post, ...] newest first — flat, not keyed
  var COMMENTS_KEY = 'forge.friends.comments.v1';   // { [postId]: [comment, ...] }

  var REACTIONS = [
    { key: 'respect', name: 'Respect',  glyph: 'flame' },
    { key: 'honor',   name: 'Honor',    glyph: 'laurel' },
    { key: 'support', name: 'Support',  glyph: 'heart' },
    { key: 'strong',  name: 'Strength', glyph: 'dumbbell' }
  ];
  var KINDS = ['note', 'photo', 'video', 'progress', 'milestone'];

  function C(author, time, body) { return { id: 'c_' + author.replace(/\W/g, '') + time, author: author, role: null, time: time, respect: 0, body: body, replies: [] }; }

  var SEED = [
    { id: 'p1', author: 'Diego Salas', rel: 'Friend', rank: 'CRAFTSMAN', time: '18m', aud: 'friends', kind: 'progress',
      caption: '12 weeks apart. Same shorts, different engine. Showed up on the days I didn\u2019t want to \u2014 that\u2019s the whole secret.',
      reactors: ['Priya', 'Sam'], more: 4, reactions: { respect: 4, support: 2 },
      comments: [ C('Priya Nandakumar', '12m', 'The change is unreal. Proof it\u2019s the boring days that count.'), C('Sam Okafor', '5m', 'Needed to see this. Back at it tomorrow.') ] },
    { id: 'p2', author: 'Priya Nandakumar', rel: 'Friend', rank: 'ARCHITECT', time: '1h', aud: 'friends', kind: 'milestone',
      mileKind: 'honor', mileHead: 'Shared 2 Honors', mileTitle: 'The Unbroken', mileItems: [{ g: 'medal', l: 'The Unbroken' }, { g: 'flame', l: 'Century Club' }],
      caption: 'Didn\u2019t see these coming today. Chose to share because you all pushed me here.',
      reactors: ['Diego', 'Elena', 'Marcus'], more: 6, reactions: { respect: 4, honor: 5 },
      comments: [ C('Elena Ruiz', '1h', 'This is huge. The consistency shows.'), C('Marcus Vale', '42m', 'Proud of you. Earned every bit of it.'), C('Sam Okafor', '20m', 'Needed to see this today. Back to the platform tomorrow.') ] },
    { id: 'p3', author: 'Marcus Vale', rel: 'Friend', rank: 'ARCHITECT', time: '3h', aud: 'both', kind: 'video',
      caption: 'New bench PR \u2014 315 for a single. Bar speed felt easy, which is the scary part.',
      media: { dur: '0:22' }, videoDur: '0:22', workout: 'Bench Session', pr: 'Bench PR',
      reactors: ['Priya', 'Jonah'], more: 5, reactions: { respect: 4, strong: 3 },
      comments: [ C('Priya Nandakumar', '2h', 'Bar speed like that means there\u2019s more in the tank. Congrats!') ] },
    { id: 'p4', author: 'Elena Ruiz', rel: 'Friend', rank: '', time: '6h', aud: 'friends', kind: 'photo',
      caption: 'Chalk, coffee, and a quiet platform. Best kind of Saturday.',
      reactors: ['Camille'], more: 2, reactions: { respect: 2, support: 1 },
      comments: [ C('Camille Fortin', '5h', 'The pre-lift calm is everything.') ] },
    { id: 'p5', author: 'Jonah Weiss', rel: 'Friend', rank: 'BUILDER', time: '1d', aud: 'friends', kind: 'milestone',
      mileKind: 'program', mileHead: 'Completed a Program', mileTitle: 'Hypertrophy Foundations', mileSub: '12 weeks \u00b7 48 sessions logged', mileItems: [{ g: 'shield', l: 'Program Architect' }],
      caption: '12 weeks, done. Toughest block I\u2019ve run. On to the next one.',
      reactors: ['Elena', 'Diego'], more: 3, reactions: { respect: 3, support: 2 },
      comments: [ C('Camille Fortin', '20h', 'That block is brutal. Well done finishing it.') ] },
    { id: 'p6', author: 'Camille Fortin', rel: 'Friend', rank: 'CRAFTSMAN', time: '2d', aud: 'friends', kind: 'photo',
      caption: 'Deload week. A reminder that rest is part of the work, not a break from it.',
      reactors: [], more: 0, reactions: { support: 1 },
      comments: [ C('Jonah Weiss', '1d', 'Respect the deload. It\u2019s where the growth lands.') ] }
  ];

  // body is an alias of caption so the shared Post Detail (which reads .body) works unchanged.
  SEED.forEach(function (p) { if (p.body == null) p.body = p.caption; });

  function read(key, fb) { try { var v = JSON.parse(localStorage.getItem(key)); if (v) return v; } catch (e) {} return fb; }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function mergedComments(post) { var overlay = (read(COMMENTS_KEY, {}) || {})[post.id] || []; return overlay.concat(post.comments || []); }

  window.ForgeFriendsPosts = {
    REACTIONS: REACTIONS.slice(),
    KINDS: KINDS.slice(),
    list: function () { var stored = read(POSTS_KEY, []) || []; return stored.concat(SEED); },
    get: function (postId) {
      var all = this.list();
      for (var i = 0; i < all.length; i++) if (all[i].id === postId) { var p = Object.assign({}, all[i]); p.comments = mergedComments(all[i]); return p; }
      return null;
    },
    add: function (post) {
      var arr = read(POSTS_KEY, []) || [];
      var p = Object.assign({ id: 'ff_' + Date.now(), time: 'Just now', rel: 'You', rank: '', aud: 'friends', reactors: [], more: 0, reactions: {}, comments: [] }, post);
      if (p.body == null) p.body = p.caption || '';
      if (p.caption == null) p.caption = p.body || '';
      arr.unshift(p); write(POSTS_KEY, arr); return p;
    },
    addComment: function (postId, comment) {
      var map = read(COMMENTS_KEY, {}) || {}; var arr = map[postId] || [];
      var c = Object.assign({ id: 'fc_' + Date.now(), role: null, time: 'Just now', respect: 0, replies: [] }, comment);
      arr.unshift(c); map[postId] = arr; write(COMMENTS_KEY, map); return c;
    }
  };
})();
