/*
 * Forge Legacy — Units
 * App-wide weight-unit authority. One setting, one source of truth.
 *
 * Canonical storage is POUNDS (lb). Everything in app data is stored in lb;
 * display converts to the user's chosen unit. Default unit: lb.
 *
 * Usage
 *   ForgeUnits.label                     -> 'lb' | 'kg'
 *   ForgeUnits.toDisplay(225)            -> number in current unit (225, or 102 in kg)
 *   ForgeUnits.fmt(225)                  -> '225 lb'  (thousands-separated, with unit)
 *   ForgeUnits.fmt(225, {unit:false})    -> '225'
 *   ForgeUnits.setPound / setKilo / set('kg')   (persists + notifies)
 *   const off = ForgeUnits.subscribe(fn) -> fn() runs on every unit change; call off() to stop
 *
 * In a component:  componentDidMount(){ this._off = ForgeUnits.subscribe(()=>this.forceUpdate()); }
 *                  componentWillUnmount(){ this._off && this._off(); }
 */
(function (root) {
  var KEY = 'fl-unit';
  var LB_PER_KG = 2.2046226218;
  var subs = [];

  function unit() {
    try {
      var v = root.localStorage && root.localStorage.getItem(KEY);
      return v === 'kg' ? 'kg' : 'lb';
    } catch (e) { return 'lb'; }
  }

  function set(u) {
    u = u === 'kg' ? 'kg' : 'lb';
    try { root.localStorage && root.localStorage.setItem(KEY, u); } catch (e) {}
    subs.slice().forEach(function (fn) { try { fn(u); } catch (e) {} });
    return u;
  }

  // lb (canonical) -> number in the current unit, rounded.
  function toDisplay(lb, decimals) {
    if (lb == null || isNaN(lb)) return lb;
    var v = unit() === 'kg' ? lb / LB_PER_KG : lb;
    var d = decimals == null ? 0 : decimals;
    var m = Math.pow(10, d);
    return Math.round(v * m) / m;
  }

  // lb -> "225 lb" (or kg). opts: { unit:true, decimals:0 }
  function fmt(lb, opts) {
    opts = opts || {};
    if (lb == null || isNaN(lb)) return String(lb);
    var n = toDisplay(lb, opts.decimals);
    var s = n.toLocaleString('en-US');
    return opts.unit === false ? s : s + ' ' + label();
  }

  // "weight × reps" with the weight converted (no inline unit — pair with a labeled context).
  function reps(lb, reps, opts) {
    return fmt(lb, { unit: (opts && opts.unit) || false }) + ' × ' + reps;
  }

  function label() { return unit(); }

  // ── Distance / pace / speed follow the SAME imperial(lb)/metric(kg) choice ──
  // Canonical storage: distance in MILES, pace in SECONDS-PER-MILE, speed in MPH.
  var KM_PER_MI = 1.609344;
  function system() { return unit() === 'kg' ? 'metric' : 'imperial'; }
  function distanceLabel() { return system() === 'metric' ? 'km' : 'mi'; }
  function distanceLabelLong() { return system() === 'metric' ? 'Kilometers' : 'Miles'; }
  function paceLabel() { return system() === 'metric' ? 'min / km' : 'min / mi'; }
  function speedLabel() { return system() === 'metric' ? 'km/h' : 'mph'; }
  function toDistance(mi, decimals) {
    if (mi == null || isNaN(mi)) return mi;
    var v = system() === 'metric' ? mi * KM_PER_MI : mi;
    var d = decimals == null ? 2 : decimals; var m = Math.pow(10, d);
    return Math.round(v * m) / m;
  }
  function fmtDistance(mi, opts) {
    opts = opts || {};
    if (mi == null || isNaN(mi)) return String(mi);
    var n = toDistance(mi, opts.decimals == null ? 2 : opts.decimals);
    return opts.unit === false ? String(n) : n + ' ' + distanceLabel();
  }
  // seconds-per-mile -> "m:ss" in the display distance unit
  function fmtPace(secPerMi) {
    if (secPerMi == null || isNaN(secPerMi)) return String(secPerMi);
    var sec = system() === 'metric' ? secPerMi / KM_PER_MI : secPerMi;
    var m = Math.floor(sec / 60); var s = Math.round(sec % 60);
    if (s === 60) { m += 1; s = 0; }
    return m + ':' + (s < 10 ? '0' + s : s);
  }
  function toSpeed(mph, decimals) {
    if (mph == null || isNaN(mph)) return mph;
    var v = system() === 'metric' ? mph * KM_PER_MI : mph;
    var d = decimals == null ? 1 : decimals; var m = Math.pow(10, d);
    return Math.round(v * m) / m;
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    subs.push(fn);
    return function () { var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
  }

  // Cross-tab / cross-view sync: another view flipping the setting notifies this one.
  try {
    root.addEventListener && root.addEventListener('storage', function (e) {
      if (e && e.key === KEY) subs.slice().forEach(function (fn) { try { fn(unit()); } catch (err) {} });
    });
  } catch (e) {}

  var API = {
    LB_PER_KG: LB_PER_KG,
    get unit() { return unit(); },
    get label() { return label(); },
    set: set,
    setPound: function () { return set('lb'); },
    setKilo: function () { return set('kg'); },
    toDisplay: toDisplay,
    fmt: fmt,
    reps: reps,
    subscribe: subscribe,
    // distance / pace / speed (same imperial/metric setting)
    KM_PER_MI: KM_PER_MI,
    get system() { return system(); },
    get distanceLabel() { return distanceLabel(); },
    get distanceLabelLong() { return distanceLabelLong(); },
    get paceLabel() { return paceLabel(); },
    get speedLabel() { return speedLabel(); },
    toDistance: toDistance,
    fmtDistance: fmtDistance,
    fmtPace: fmtPace,
    toSpeed: toSpeed,
  };

  root.ForgeUnits = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
