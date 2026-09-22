/* Forge Legacy — Body Metrics model (bodyweight + optional measurements).
 * The whole feature is OPTIONAL — `enabled` gates the section on/off entirely.
 * Weigh-ins are LOGGED data (not Legacy content). Bodyweight stored in POUNDS,
 * measurements in inches. Calm by design: no goal weight, no targets, no pressure.
 */
(function () {
  var EK = 'forge.body.entries', PK = 'forge.body.showtrend', NK = 'forge.body.enabled';

  var seed = [
    { label: 'Oct', weight: 205, m: {} },
    { label: 'Nov', weight: 203, m: {} },
    { label: 'Dec', weight: 202, m: {} },
    { label: 'Jan', weight: 201, m: {} },
    { label: 'Feb', weight: 200, m: {} },
    { label: 'Mar', weight: 199, m: { Waist: 33, Chest: 44, Arms: 16 } },
  ];

  function loadE() { try { var r = JSON.parse(window.localStorage.getItem(EK)); if (Array.isArray(r) && r.length) return r; } catch (e) {} return seed.slice(); }
  function loadP() { try { var v = window.localStorage.getItem(PK); return v === null ? true : v === '1'; } catch (e) { return true; } }
  function loadN() { try { var v = window.localStorage.getItem(NK); return v === null ? true : v === '1'; } catch (e) { return true; } }

  var entries = loadE(), showTrend = loadP(), enabled = loadN(), subs = [];
  function emit() { subs.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
  function persistE() { try { window.localStorage.setItem(EK, JSON.stringify(entries)); } catch (e) {} }
  function persistP() { try { window.localStorage.setItem(PK, showTrend ? '1' : '0'); } catch (e) {} }
  function persistN() { try { window.localStorage.setItem(NK, enabled ? '1' : '0'); } catch (e) {} }

  window.addEventListener('storage', function (e) {
    if (!e) return;
    if (e.key === EK) { entries = loadE(); emit(); }
    if (e.key === PK) { showTrend = loadP(); emit(); }
    if (e.key === NK) { enabled = loadN(); emit(); }
  });

  window.ForgeBody = {
    entries: function () { return entries.slice(); },
    latest: function () { return entries[entries.length - 1] || null; },
    add: function (en) { entries = entries.concat([en]); persistE(); emit(); },
    showTrend: function () { return showTrend; },
    setShowTrend: function (v) { showTrend = !!v; persistP(); emit(); },
    enabled: function () { return enabled; },
    setEnabled: function (v) { enabled = !!v; persistN(); emit(); },
    reset: function () { entries = seed.slice(); persistE(); emit(); },
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
  };
})();
