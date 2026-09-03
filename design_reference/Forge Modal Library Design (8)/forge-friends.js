/*
 * Forge Legacy — Friends model (shared source of truth for the friend graph).
 *
 * WHY: friends were hardcoded per screen (Friends Feed had its own list, Public
 * Profile another, Share Configuration could only broadcast to "Friends" as a group).
 * This is the one place the accepted-friends list, outgoing requests, add-by-@handle,
 * and 1:1 program sends live, so Fr-1 (add a friend by handle) and Pr-3 (send a
 * program to ONE person) are real, not stubs.
 *
 *   ForgeFriends.list()                 -> accepted friends [{id,name,handle,rank,context}]
 *   ForgeFriends.get(id)                -> one friend or null
 *   ForgeFriends.isFriend(idOrHandle)   -> bool
 *   ForgeFriends.requestsOut()          -> outgoing pending requests [{handle,name,at}]
 *   ForgeFriends.addByHandle(handle)    -> { ok, status:'added'|'pending'|'already'|'self'|'invalid', name }
 *   ForgeFriends.sendProgram(id, prog)  -> { ok, name } ; prog = { programId, programName }
 *   ForgeFriends.programsSent()         -> [{ friendId, name, programId, programName, at }]
 *   ForgeFriends.onChange(fn)/offChange(fn)
 *
 * Reference-based, data only. Persists additions/sends in localStorage; the seed roster
 * mirrors the Friends Feed cast so the graph is consistent across screens.
 */
(function (root) {
  var REQ_KEY = 'forge.friends.requests.v1';   // outgoing handle requests [{handle,name,at}]
  var ADDED_KEY = 'forge.friends.added.v1';     // accepted-by-you additions [{id,name,handle,rank,context}]
  var SENT_KEY = 'forge.friends.programsSent.v1';

  // Canonical seed roster (mirrors Forge Friends Feed). Marcus Vale is the shared NPC.
  var SEED = [
    { id: 'priya',   name: 'Priya Nandakumar', handle: 'priya.lifts',  rank: 'Architect',  context: 'Trains mornings · building toward a 225 bench' },
    { id: 'diego',   name: 'Diego Salas',      handle: 'diego.salas',  rank: 'Craftsman',  context: 'Hybrid athlete · last trained yesterday' },
    { id: 'marcus',  name: 'Marcus Vale',      handle: 'marcus.vale',  rank: 'Architect',  context: 'Powerlifter · Iron Vigil squad' },
    { id: 'elena',   name: 'Elena Ruiz',       handle: 'elena.ruiz',   rank: 'Legend',     context: 'Coach · trains evenings' },
    { id: 'jonah',   name: 'Jonah Weiss',      handle: 'jonah.weiss',  rank: 'Builder',    context: 'Started 4 months ago · early riser' },
    { id: 'camille', name: 'Camille Fortin',   handle: 'camille.f',    rank: 'Craftsman',  context: 'Olympic lifting · deload week' }
  ];

  var listeners = [];
  function read(key) { try { var v = JSON.parse(root.localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function write(key, v) { try { root.localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} notify(); }
  function notify() { listeners.slice().forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function norm(h) { return String(h || '').trim().replace(/^@/, '').toLowerCase(); }

  function selfHandle() {
    try { var u = root.ForgeUser && root.ForgeUser.get(); if (u && u.handle) return norm(u.handle); } catch (e) {}
    return 'ada.forged';
  }

  function list() {
    // seed + any accepted-by-you additions (deduped by id/handle)
    var added = read(ADDED_KEY);
    var out = SEED.slice();
    added.forEach(function (a) {
      if (!out.some(function (f) { return f.id === a.id || norm(f.handle) === norm(a.handle); })) out.push(a);
    });
    return out;
  }
  function get(id) { var l = list(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function findByHandle(h) { var n = norm(h); var l = list(); for (var i = 0; i < l.length; i++) if (norm(l[i].handle) === n) return l[i]; return null; }
  function isFriend(idOrHandle) {
    if (!idOrHandle) return false;
    return !!(get(idOrHandle) || findByHandle(idOrHandle));
  }
  function requestsOut() { return read(REQ_KEY); }

  // Add a friend by @handle. Existing roster handles resolve to a real name; unknown
  // handles create an outgoing request (pending) using a title-cased name from the handle.
  function addByHandle(handle) {
    var n = norm(handle);
    if (!n || !/^[a-z0-9._]{2,}$/.test(n)) return { ok: false, status: 'invalid' };
    if (n === selfHandle()) return { ok: false, status: 'self' };
    if (isFriend(n)) { var f = findByHandle(n); return { ok: false, status: 'already', name: f ? f.name : n }; }
    var reqs = read(REQ_KEY);
    if (reqs.some(function (r) { return norm(r.handle) === n; })) return { ok: false, status: 'pending', name: '@' + n };
    var nm = n.split(/[._]/).map(function (p) { return p ? p.charAt(0).toUpperCase() + p.slice(1) : p; }).join(' ');
    reqs.unshift({ handle: n, name: nm, at: Date.now() });
    write(REQ_KEY, reqs);
    return { ok: true, status: 'pending', name: '@' + n };
  }

  function sendProgram(friendId, prog) {
    var f = get(friendId) || findByHandle(friendId);
    if (!f) return { ok: false };
    var sent = read(SENT_KEY);
    sent.unshift({ friendId: f.id, name: f.name, handle: f.handle, programId: (prog && prog.programId) || null, programName: (prog && prog.programName) || 'a program', at: Date.now() });
    write(SENT_KEY, sent);
    return { ok: true, name: f.name };
  }
  function programsSent() { return read(SENT_KEY); }

  function onChange(fn) { if (typeof fn === 'function' && listeners.indexOf(fn) === -1) listeners.push(fn); }
  function offChange(fn) { var i = listeners.indexOf(fn); if (i !== -1) listeners.splice(i, 1); }

  var API = {
    SEED: SEED,
    list: list, get: get, findByHandle: findByHandle, isFriend: isFriend,
    requestsOut: requestsOut, addByHandle: addByHandle,
    sendProgram: sendProgram, programsSent: programsSent,
    onChange: onChange, offChange: offChange,
  };
  root.ForgeFriends = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
