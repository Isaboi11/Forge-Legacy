/* Forge Gate — the first-run "sealed forge" lock.

   New users finish onboarding and land on Beginner Home. The full app (Legacy,
   ranks, honors, standing, chapters, the coached Home) stays SEALED until the
   athlete takes their first real initiative: complete a workout, join or create a
   squad, or join a community. The first such action grants the INITIATIVE honor
   and opens everything. State persists in localStorage so it survives navigation.

   Usage:
     ForgeGate.isUnlocked()                 -> bool
     ForgeGate.unlock('reason')             -> bool (true if THIS call was the first)
     ForgeGate.unlockAndCelebrate('reason') -> unlock + navigate (ceremony first time, else Home)
     ForgeGate.consumePending()             -> bool once (is a ceremony owed right now?)
     ForgeGate.guardBeginner()              -> redirect Beginner Home -> Home if already open
*/
(function () {
  var UNLOCK  = 'forge_unlocked';
  var PENDING = 'forge_unlock_pending';
  var REASON  = 'forge_unlock_reason';
  var HONORS  = 'forge_honors';
  var CEREMONY = 'Forge%20Legacy%20Unlocked.dc.html';
  var HOME_NEW = 'Forge%20Home.dc.html?new=1';

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function isUnlocked() { return get(UNLOCK) === '1'; }

  function addHonor(id) {
    try {
      var raw = get(HONORS); var arr = raw ? JSON.parse(raw) : [];
      if (arr.indexOf(id) === -1) { arr.push(id); set(HONORS, JSON.stringify(arr)); }
    } catch (e) {}
  }

  /* Records the first initiative. Returns true only if THIS call opened the gate. */
  function unlock(reason) {
    if (isUnlocked()) return false;
    set(UNLOCK, '1');
    set(REASON, reason || 'initiative');
    set(PENDING, '1');            // a ceremony is now owed
    addHonor('initiative');
    return true;
  }

  /* True once, then cleared — "is the unlock ceremony owed right now?" */
  function consumePending() {
    if (get(PENDING) === '1') { set(PENDING, '0'); return true; }
    return false;
  }

  function reason() { return get(REASON) || 'initiative'; }

  /* Unlock and go somewhere sensible: the ceremony on the first move, else straight Home. */
  function unlockAndCelebrate(r) {
    var first = unlock(r);
    if (first) { consumePending(); window.location.href = CEREMONY + '?reason=' + encodeURIComponent(r || 'initiative'); }
    else { window.location.href = HOME_NEW; }
  }

  /* Beginner Home calls this on load: if the forge is already open, don't show the gate again. */
  function guardBeginner() {
    if (isUnlocked()) { window.location.href = HOME_NEW; return true; }
    return false;
  }

  window.ForgeGate = {
    isUnlocked: isUnlocked,
    unlock: unlock,
    unlockAndCelebrate: unlockAndCelebrate,
    consumePending: consumePending,
    reason: reason,
    guardBeginner: guardBeginner,
    addHonor: addHonor,
  };
})();
