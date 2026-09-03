/* Forge Legacy — Communities store (shared source of truth).
 * The large-scale interest layer (thousands of members) that sits above Squads.
 * Consumed by: Discover Communities (browse/join), Community Profile (pre-join detail),
 * and Community Home (identity of the active community).
 *
 * Membership is persisted so Discover, Profile, and Home always agree on join state.
 *   state(id) -> 'joined' | 'requested' | null
 * The active community (which one Home / Profile renders) rides on localStorage 'forge.community'.
 *
 * Rules are per-community data (not shared placeholder copy) — each community expresses its own
 * culture. RULES below is only a generic fallback for a community that hasn't authored its own.
 */
(function () {
  var MEM_KEY = 'forge.communities.membership.v1';
  var ACTIVE_KEY = 'forge.community';

  // The user already belongs to Iron Collective (their Community Home). Everything else
  // starts joinable so the pre-join Profile is reachable and the routing split is demonstrable.
  var SEED = { ironcollective: 'joined' };

  var RULES = [
    'Respect the work. Critique the effort, never the person.',
    'Post with signal \u2014 share the win, the miss, and the lesson.',
    'No spam or unsolicited selling. Coaching offers go in Coaching, once.',
    'What\u2019s shared here stays here, unless the author says otherwise.'
  ];

  // Canonical interest taxonomy — the 11 categories Discover browses by.
  var CATEGORIES = [
    { id: 'Powerlifting', crest: 'barbell',  blurb: 'Raw strength and the barbell total.' },
    { id: 'Olympic',      crest: 'medal',    blurb: 'Snatch, clean & jerk \u2014 pure technique.' },
    { id: 'Bodybuilding', crest: 'flame',    blurb: 'Hypertrophy, symmetry, the long build.' },
    { id: 'Strongman',    crest: 'trophy',   blurb: 'Stones, yokes, odd-object power.' },
    { id: 'Running',      crest: 'shoe',     blurb: 'Road, track, and trail miles.' },
    { id: 'Hybrid',       crest: 'mountain', blurb: 'Lift heavy, run far \u2014 master both.' },
    { id: 'Functional',   crest: 'dumbbell', blurb: 'Work capacity and everyday power.' },
    { id: 'Cycling',      crest: 'bicycle',  blurb: 'Watts, climbs, and the long ride.' },
    { id: 'Swimming',     crest: 'swim',     blurb: 'Laps, open water, the black line.' },
    { id: 'Combat',       crest: 'glove',    blurb: 'Striking, grappling, and fight prep.' },
    { id: 'Mobility',     crest: 'lotus',    blurb: 'Flexibility, recovery, longevity.' }
  ];

  var COMMUNITIES = [
    {
      id: 'ironcollective', name: 'Iron Collective', category: 'Powerlifting', crest: 'dumbbell',
      tagline: 'Built on discipline. Driven by purpose. Stronger together.',
      members: 2412, postsPerWeek: 180, founded: '2024', join: 'public',
      tags: 'barbell strength raw meet powerlifting',
      about: 'A strength-first community for lifters who value the long game. Share training notes, ask honest questions, join community challenges, and show up for each other \u2014 on the platform and off it.',
      rules: [
        'Post real numbers. Honest attempts, grinders, and misses all count.',
        'Form checks welcome \u2014 add the angle and the load so feedback is useful.',
        'Program talk stays constructive. No one true method; context matters.',
        'Respect every level, from first plate to elite total.',
        'Coaching and paid programs post in Coaching only, once.',
        'What\u2019s shared here stays here. Screens leave the room with consent.'
      ],
      leaders: [
        { name: 'Coach Halden', sub: 'Founder \u00b7 Powerlifting Coach', role: 'owner' },
        { name: 'Marcus Vale', sub: 'Moderator \u00b7 Strength Coach', role: 'mod' },
        { name: 'Elena Ruiz', sub: 'Moderator \u00b7 Program Design', role: 'mod' }
      ],
      peek: [
        { author: 'Jasmine Rae', role: null, time: '5h ago', type: 'Achievement', body: 'Hit a new PR today. 405 for a single. All glory to the process.', respect: 52, comments: 23 },
        { author: 'Marcus Vale', role: 'mod', time: '4h ago', type: 'Discussion', body: 'Bracing cue that finally clicked for my athletes: breathe into your belt 360\u00b0, not just the front.', respect: 28, comments: 12 }
      ]
    },
    {
      id: 'endurance', name: 'Endurance Nation', category: 'Running', crest: 'shoe',
      tagline: 'Miles build the mind. Show up, log the work, go again.',
      members: 3180, postsPerWeek: 240, founded: '2023', join: 'public',
      tags: 'run 5k marathon endurance trail',
      about: 'For runners and endurance athletes chasing the long distance. Weekly mileage threads, race reports, pacing questions, and a crew that celebrates every finish line \u2014 fast or slow.',
      rules: [
        'Every pace belongs. Celebrate the finish, fast or slow.',
        'Race reports over hot takes \u2014 share the splits, the fuel, the lesson.',
        'Fueling and recovery talk is experience, not medical advice.',
        'Log honest mileage. No ghost runs, no inflated weeks.',
        'Respect the long game. No shaming DNFs, walk breaks, or rest days.',
        'Keep injuries private unless shared first. No unsolicited diagnosis.'
      ],
      leaders: [
        { name: 'Dana Whitfield', sub: 'Founder \u00b7 Marathon Runner', role: 'owner' },
        { name: 'Priya Nair', sub: 'Moderator \u00b7 Trail Running', role: 'mod' }
      ],
      peek: [
        { author: 'Owen Clarke', role: null, time: '2h ago', type: 'Achievement', body: 'First sub-20 5K this morning. Three years chipping at it. Legs are jelly.', respect: 61, comments: 18 },
        { author: 'Priya Nair', role: 'mod', time: '6h ago', type: 'Discussion', body: 'Long-run fueling: what\u2019s everyone taking past the 90-minute mark? Comparing notes for fall marathons.', respect: 24, comments: 31 }
      ]
    },
    {
      id: 'hybridsociety', name: 'Hybrid Athlete Society', category: 'Hybrid', crest: 'mountain',
      tagline: 'Do everything. Master it all. Run far, lift heavy.',
      members: 1540, postsPerWeek: 120, founded: '2024', join: 'public',
      tags: 'hyrox conditioning crossfit hybrid',
      about: 'The middle ground between the barbell and the road. Concurrent training, HYROX prep, conditioning debates, and the endless hunt for the engine-and-strength balance.',
      rules: [
        'Balance the engine and the barbell. Neither side wins alone.',
        'Share the full session \u2014 the lift and the conditioning.',
        'Event and HYROX tactics welcome; cite the standard you trained to.',
        'Concurrent-training debates stay evidence-first.',
        'No purist gatekeeping. Runners lift and lifters run here.',
        'Coaching and paid programs post in Coaching only, once.'
      ],
      leaders: [
        { name: 'Theo Brandt', sub: 'Founder \u00b7 Hybrid Athlete', role: 'owner' },
        { name: 'Sam Okafor', sub: 'Moderator \u00b7 Conditioning Coach', role: 'mod' }
      ],
      peek: [
        { author: 'Nadia Voss', role: null, time: '1h ago', type: 'Form Check', body: 'Wall-ball to run transition is wrecking me. How are you pacing the changeover in HYROX?', respect: 19, comments: 14 },
        { author: 'Theo Brandt', role: 'owner', time: '8h ago', type: 'Coaching', body: 'Concurrent training truth: you can\u2019t max out both ends at once. Pick a leader for the block.', respect: 47, comments: 22 }
      ]
    },
    {
      id: 'strongmanunited', name: 'Strongman United', category: 'Strongman', crest: 'trophy',
      tagline: 'Move the immovable. Stones, yokes, and the will behind them.',
      members: 890, postsPerWeek: 74, founded: '2023', join: 'private',
      tags: 'stones yoke log strongman',
      about: 'Events-first strongman training. Stone loading, yoke walks, log press, and the implement work most gyms can\u2019t hold. Approval keeps the coaching signal high and the room accountable.',
      rules: [
        'Implements demand respect. Load safe and film from the side.',
        'Event standards matter \u2014 state the implement and the distance.',
        'Equipment access varies. Help, don\u2019t gatekeep.',
        'Coaching signal over hype. Technique before one-rep glory.',
        'Approvals keep the room accountable \u2014 represent it well.',
        'Coaching and paid programs post in Coaching only, once.'
      ],
      leaders: [
        { name: 'Bjorn Halvorsen', sub: 'Founder \u00b7 Strongman Competitor', role: 'owner' },
        { name: 'Rita Cole', sub: 'Moderator \u00b7 Event Prep', role: 'mod' }
      ],
      peek: []
    },
    {
      id: 'weightroom', name: 'The Weightroom', category: 'Olympic', crest: 'medal',
      tagline: 'Technique above all. Snatch, clean, jerk \u2014 refined.',
      members: 2050, postsPerWeek: 155, founded: '2022', join: 'public',
      tags: 'snatch clean jerk technique olympic',
      about: 'Olympic weightlifting, obsessively technical. Positions, timing, mobility, and video after video of the lifts. Bring your clips \u2014 the room gives honest, specific feedback.',
      rules: [
        'Technique above all. Positions before load.',
        'Post the clip \u2014 snatch and clean feedback needs the bar path.',
        'Cue with intent: name the fault, then the fix.',
        'Mobility and timing talk welcome; keep it specific.',
        'No ego lifting in threads. Missed lifts teach the most.',
        'What\u2019s shared here stays here. Clips leave only with consent.'
      ],
      leaders: [
        { name: 'Mei Tanaka', sub: 'Founder \u00b7 Olympic Weightlifting', role: 'owner' },
        { name: 'Alex Morgan', sub: 'Moderator \u00b7 Technique Coach', role: 'mod' }
      ],
      peek: [
        { author: 'Chris Buhl', role: null, time: '3h ago', type: 'Form Check', body: 'Snatch keeps looping out front at the catch. Is this a timing or a bar-path issue? Clip inside.', respect: 33, comments: 27 },
        { author: 'Mei Tanaka', role: 'owner', time: '7h ago', type: 'Coaching', body: 'Stop rushing the first pull. Break the floor slow, let the bar find your hips. Speed comes after.', respect: 58, comments: 15 }
      ]
    },
    {
      id: 'physiqueforge', name: 'Physique Forge', category: 'Bodybuilding', crest: 'flame',
      tagline: 'Sculpt the frame you earn. Detail, discipline, patience.',
      members: 1220, postsPerWeek: 96, founded: '2024', join: 'private',
      tags: 'bodybuilding hypertrophy physique aesthetics',
      about: 'Hypertrophy and physique work for the long build. Contest prep logs, mind-muscle debates, nutrition detail, and progress shots shared with intent. Approval keeps the feedback constructive.',
      rules: [
        'Build with intent. Detail, discipline, and patience over shortcuts.',
        'Prep logs welcome \u2014 share the plan, not just the peak.',
        'Nutrition talk is experience, not medical or PED advice.',
        'Progress shots shared with purpose, never for validation.',
        'Critique the physique work, never the person.',
        'Coaching and paid programs post in Coaching only, once.'
      ],
      leaders: [
        { name: 'Lena Frost', sub: 'Founder \u00b7 Bodybuilding Coach', role: 'owner' },
        { name: 'Deon Pryce', sub: 'Moderator \u00b7 Contest Prep', role: 'mod' }
      ],
      peek: []
    },
    {
      id: 'workcapacity', name: 'Work Capacity', category: 'Functional', crest: 'dumbbell',
      tagline: 'Fit for anything. Ready for everything.',
      members: 1870, postsPerWeek: 132, founded: '2024', join: 'public',
      tags: 'functional crossfit conditioning wod work capacity gpp',
      about: 'General physical preparedness for people who refuse to specialize. Mixed-modal sessions, benchmark workouts, and honest talk about building a body that does everything well.',
      leaders: [ { name: 'Rhea Dunn', sub: 'Founder \u00b7 GPP Coach', role: 'owner' } ],
      peek: []
    },
    {
      id: 'wattsociety', name: 'Watt Society', category: 'Cycling', crest: 'bicycle',
      tagline: 'Chase the wattage. Earn the descent.',
      members: 1610, postsPerWeek: 118, founded: '2023', join: 'public',
      tags: 'cycling bike road gravel climbing watts ftp',
      about: 'Cyclists chasing power and distance \u2014 FTP tests, climbing threads, gear talk, and ride reports from the road, gravel, and the pain cave.',
      leaders: [ { name: 'Gio Marchetti', sub: 'Founder \u00b7 Road Racer', role: 'owner' } ],
      peek: []
    },
    {
      id: 'openwater', name: 'Open Water', category: 'Swimming', crest: 'swim',
      tagline: 'The water remembers every lap.',
      members: 740, postsPerWeek: 58, founded: '2024', join: 'public',
      tags: 'swim pool open water triathlon freestyle laps',
      about: 'Swimmers of every stroke \u2014 pool sets, open-water crossings, technique clips, and breathing debates. Bring your splits and your questions.',
      leaders: [ { name: 'Maren Sol', sub: 'Founder \u00b7 Open-Water Swimmer', role: 'owner' } ],
      peek: []
    },
    {
      id: 'fightcamp', name: 'Fight Camp', category: 'Combat', crest: 'glove',
      tagline: 'Sharpen every round.',
      members: 1130, postsPerWeek: 88, founded: '2023', join: 'private',
      tags: 'boxing mma bjj muay thai combat sparring fight',
      about: 'Combat athletes and the strength & conditioning behind them. Rounds, weight cuts, S&C for fighters, and technique breakdowns. Approval keeps the room disciplined.',
      leaders: [ { name: 'Darius Kane', sub: 'Founder \u00b7 Boxing Coach', role: 'owner' } ],
      peek: []
    },
    {
      id: 'longline', name: 'The Long Line', category: 'Mobility', crest: 'lotus',
      tagline: 'Mobility is strength that lasts.',
      members: 980, postsPerWeek: 64, founded: '2024', join: 'public',
      tags: 'mobility yoga recovery flexibility longevity prehab',
      about: 'Mobility, recovery, and training longevity. Prehab routines, flexibility progress, and the unglamorous work that keeps you lifting for decades.',
      leaders: [ { name: 'Ivy Sun', sub: 'Founder \u00b7 Mobility Coach', role: 'owner' } ],
      peek: []
    }
  ];

  function readMem() {
    try { var v = JSON.parse(localStorage.getItem(MEM_KEY)); if (v && typeof v === 'object') return v; } catch (e) {}
    return Object.assign({}, SEED);
  }
  function writeMem(m) { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch (e) {} }

  // Creator-made communities persist here and merge over the built-in seeds (crest is a Forge symbol id).
  var REGISTRY_KEY = 'forge.communities.registry.v1';
  function readReg() { try { var v = JSON.parse(localStorage.getItem(REGISTRY_KEY)); if (v && typeof v === 'object') return v; } catch (e) {} return {}; }
  function writeReg(r) { try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(r)); } catch (e) {} }
  function regList() { var r = readReg(), out = []; for (var k in r) if (Object.prototype.hasOwnProperty.call(r, k)) out.push(r[k]); return out; }

  // ── 4-role management: roles, member roster, join requests, posting permissions ──
  var ROLES = [
    { id: 'owner',       label: 'Owner',       rank: 3, blurb: 'Full control \u2014 identity, roles, permissions, and members. One per community.' },
    { id: 'moderator',   label: 'Moderator',   rank: 2, blurb: 'Keeps the room in order \u2014 manages members and posts, and can post every type.' },
    { id: 'contributor', label: 'Contributor', rank: 1, blurb: 'Trusted members granted the elevated post types \u2014 events, programs, milestones.' },
    { id: 'member',      label: 'Member',      rank: 0, blurb: 'Everyone in the community. Posts the everyday types.' }
  ];
  var ROLE_RANK = { member: 0, contributor: 1, moderator: 2, owner: 3 };
  var MEMBERS_SEED = {
    ironcollective: [
      { id: 'halden', name: 'Coach Halden', role: 'owner' },
      { id: 'marcus', name: 'Marcus Vale', role: 'moderator' },
      { id: 'elena', name: 'Elena Ruiz', role: 'moderator' },
      { id: 'jasmine', name: 'Jasmine Rae', role: 'contributor' },
      { id: 'theo', name: 'Theo Brandt', role: 'member' },
      { id: 'owen', name: 'Owen Clarke', role: 'member' },
      { id: 'alex', name: 'Alex Morgan', role: 'member' },
      { id: 'nadia', name: 'Nadia Voss', role: 'member' },
      { id: 'chris', name: 'Chris Buhl', role: 'member' }
    ]
  };
  var REQUESTS_SEED = {
    ironcollective: [
      { id: 'rq_sam', name: 'Sam Reeves', when: '2h ago', note: 'Powerlifter, 3 years in. Chasing a 500 squat.' },
      { id: 'rq_lena', name: 'Lena Frost', when: '5h ago', note: 'Coach looking to share programming with a serious room.' },
      { id: 'rq_dev', name: 'Dev Anand', when: '1d ago', note: '' }
    ]
  };
  var ROSTER_KEY = 'forge.communities.roster.v1';
  var REQ_KEY = 'forge.communities.requests.v1';
  var PERM_KEY = 'forge.communities.perms.v1';
  function _readKey(k) { try { var v = JSON.parse(localStorage.getItem(k)); if (v && typeof v === 'object') return v; } catch (e) {} return null; }
  function _writeKey(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function rosterFor(cid) { var all = _readKey(ROSTER_KEY) || {}; if (all[cid]) return all[cid]; return (MEMBERS_SEED[cid] ? MEMBERS_SEED[cid].slice() : [{ id: 'you', name: 'You', role: 'owner' }]); }
  function saveRoster(cid, l) { var all = _readKey(ROSTER_KEY) || {}; all[cid] = l; _writeKey(ROSTER_KEY, all); }
  function reqFor(cid) { var all = _readKey(REQ_KEY) || {}; if (all[cid]) return all[cid]; return (REQUESTS_SEED[cid] ? REQUESTS_SEED[cid].slice() : []); }
  function saveReq(cid, l) { var all = _readKey(REQ_KEY) || {}; all[cid] = l; _writeKey(REQ_KEY, all); }
  function permFor(cid) { var all = _readKey(PERM_KEY) || {}; return all[cid] || {}; }
  function savePerm(cid, m) { var all = _readKey(PERM_KEY) || {}; all[cid] = m; _writeKey(PERM_KEY, all); }

  window.ForgeCommunities = {
    RULES: RULES.slice(),
    CATEGORIES: CATEGORIES.slice(),
    categories: function () { return CATEGORIES.slice(); },
    all: function () { return regList().concat(COMMUNITIES); },
    get: function (id) { var r = readReg(); if (r[id]) return r[id]; for (var i = 0; i < COMMUNITIES.length; i++) if (COMMUNITIES[i].id === id) return COMMUNITIES[i]; return null; },
    // Register a creator-made community, join it, and return its id so the caller can activate + route.
    create: function (meta) {
      var reg = readReg();
      var id = meta.id || ('cm_' + Date.now());
      reg[id] = Object.assign({ id: id, category: 'Community', crest: 'squad', tagline: '', members: 1, postsPerWeek: 0, founded: 'Just now', join: 'public', created: true, about: '', leaders: [], rules: [], peek: [] }, meta, { id: id, created: true });
      writeReg(reg);
      var m = readMem(); m[id] = 'joined'; writeMem(m);
      return id;
    },
    // Merge a patch into a community's identity/about/rules. Seed communities gain a registry override.
    updateMeta: function (id, patch) {
      var reg = readReg();
      var base = reg[id] || Object.assign({}, this.get(id) || {});
      reg[id] = Object.assign({}, base, patch, { id: id });
      writeReg(reg); return reg[id];
    },
    rulesFor: function (id) { var c = this.get(id); return (c && c.rules && c.rules.length) ? c.rules.slice() : RULES.slice(); },
    activeId: function () { try { return localStorage.getItem(ACTIVE_KEY); } catch (e) { return null; } },
    setActive: function (id) { try { localStorage.setItem(ACTIVE_KEY, id); } catch (e) {} },
    state: function (id) { return readMem()[id] || null; },
    isMember: function (id) { return readMem()[id] === 'joined'; },
    join: function (id) { var m = readMem(); m[id] = 'joined'; writeMem(m); return 'joined'; },
    request: function (id) { var m = readMem(); m[id] = 'requested'; writeMem(m); return 'requested'; },
    withdraw: function (id) { var m = readMem(); delete m[id]; writeMem(m); return null; },

    // ── 4-role management ──
    ROLES: ROLES.slice(),
    roleRank: function (r) { return ROLE_RANK[r] != null ? ROLE_RANK[r] : 0; },
    roleLabel: function (r) { for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === r) return ROLES[i].label; return 'Member'; },
    members: function (cid) { return rosterFor(cid).slice(); },
    setMemberRole: function (cid, id, role) { var l = rosterFor(cid).map(function (m) { return m.id === id ? Object.assign({}, m, { role: role }) : m; }); saveRoster(cid, l); return l; },
    removeMember: function (cid, id) { var l = rosterFor(cid).filter(function (m) { return m.id !== id; }); saveRoster(cid, l); return l; },
    requests: function (cid) { return reqFor(cid).slice(); },
    acceptRequest: function (cid, id) {
      var reqs = reqFor(cid), r = null;
      reqs.forEach(function (x) { if (x.id === id) r = x; });
      saveReq(cid, reqs.filter(function (x) { return x.id !== id; }));
      if (r) { var l = rosterFor(cid); l.push({ id: 'm_' + id, name: r.name, role: 'member' }); saveRoster(cid, l); }
      return true;
    },
    denyRequest: function (cid, id) { saveReq(cid, reqFor(cid).filter(function (x) { return x.id !== id; })); return true; },
    // Effective minimum role allowed to post a type: stored override, else derived from the static gate.
    minRoleFor: function (cid, typeId, gate) { var p = permFor(cid); if (p[typeId]) return p[typeId]; return gate === 'mod' ? 'moderator' : 'member'; },
    setMinRole: function (cid, typeId, role) { var p = permFor(cid); p[typeId] = role; savePerm(cid, p); return p; }
  };
})();
