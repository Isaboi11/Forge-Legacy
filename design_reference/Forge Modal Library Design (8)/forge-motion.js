/* Forge Legacy — Motion Foundation.
 * One voice for the whole app: shared easing/duration tokens, plus a handful of
 * understated primitives. Load once per screen (in <helmet>); everything is opt-in.
 *
 *   window.ForgeMotion.EASE / DUR                — tokens (match --fl-ease-* )
 *   ForgeMotion.countUp(el, to, {from,dur,fmt})  — smooth number roll-up
 *   ForgeMotion.drawPath(pathEl, {dur})          — left-to-right line-chart draw
 *   ForgeMotion.fadeIn(el, {dur,y})              — gentle fade/rise into place
 *   ForgeMotion.onView(el, cb)                   — fire cb once when el scrolls into view
 *   ForgeMotion.press(el)                        — 2–3px press-lift + soft bronze glow
 *   ForgeMotion.haptic('navigate'|'complete'|'milestone')
 *
 * Respects prefers-reduced-motion: animations resolve instantly, haptics stay silent.
 */
(function () {
  var RM = false;
  try { RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var EASE = {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',   // most transitions
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',          // enter / settle (matches --fl-ease-out)
    in: 'cubic-bezier(0.4, 0.0, 1, 1)',            // exit
    press: 'cubic-bezier(0.34, 1.56, 0.64, 1)',    // tactile press with a hair of overshoot
  };
  var DUR = { instant: 0, fast: 160, base: 260, slow: 420, chart: 480, count: 900 };

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };

  // requestAnimationFrame tween helper.
  function tween(dur, step, done) {
    if (RM || !dur) { step(1); if (done) done(); return function () {}; }
    var start = performance.now(), raf;
    function frame(now) {
      var t = clamp01((now - start) / dur);
      step(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(frame); else if (done) done();
    }
    raf = requestAnimationFrame(frame);
    return function () { if (raf) cancelAnimationFrame(raf); };
  }

  function countUp(el, to, opts) {
    if (!el) return function () {};
    opts = opts || {};
    var from = opts.from != null ? opts.from : 0;
    var fmt = opts.fmt || function (v) { return String(Math.round(v)); };
    return tween(opts.dur || DUR.count, function (p) { el.textContent = fmt(from + (to - from) * p); });
  }

  function drawPath(path, opts) {
    if (!path || !path.getTotalLength) return function () {};
    opts = opts || {};
    var len = 0; try { len = path.getTotalLength(); } catch (e) { return function () {}; }
    path.style.transition = 'none';
    path.style.strokeDasharray = len + ' ' + len;
    path.style.strokeDashoffset = String(len);
    // force layout so the offset applies before we animate it away
    path.getBoundingClientRect();
    if (RM) { path.style.strokeDashoffset = '0'; return function () {}; }
    path.style.transition = 'stroke-dashoffset ' + (opts.dur || DUR.chart) + 'ms ' + EASE.out;
    requestAnimationFrame(function () { path.style.strokeDashoffset = '0'; });
    return function () {};
  }

  function fadeIn(el, opts) {
    if (!el) return;
    opts = opts || {};
    if (RM) { el.style.opacity = '1'; el.style.transform = 'none'; return; }
    var y = opts.y != null ? opts.y : 8;
    el.style.opacity = '0';
    el.style.transform = 'translateY(' + y + 'px)';
    el.style.willChange = 'opacity, transform';
    requestAnimationFrame(function () {
      el.style.transition = 'opacity ' + (opts.dur || DUR.base) + 'ms ' + EASE.out + ', transform ' + (opts.dur || DUR.base) + 'ms ' + EASE.out;
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  // Fire once when an element enters the viewport (for on-scroll draw/count/fade).
  function onView(el, cb, opts) {
    if (!el) return function () {};
    if (RM || typeof IntersectionObserver === 'undefined') { cb(); return function () {}; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, { threshold: (opts && opts.threshold) || 0.35 });
    io.observe(el);
    return function () { io.disconnect(); };
  }

  // Press-lift: 2–3px raise + soft bronze glow on pointer-down, settle on release.
  function press(el, opts) {
    if (!el) return function () {};
    opts = opts || {};
    var lift = opts.lift != null ? opts.lift : 2;
    var glow = opts.glow !== false;
    var base = el.style.transition;
    el.style.transition = (base ? base + ', ' : '') + 'transform ' + DUR.fast + 'ms ' + EASE.press + ', box-shadow ' + DUR.base + 'ms ' + EASE.out;
    var down = function () { if (RM) return; el.style.transform = 'translateY(-' + lift + 'px)'; if (glow) el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(191,143,79,0.35), 0 0 16px rgba(191,143,79,0.18)'; };
    var up = function () { el.style.transform = ''; if (glow) el.style.boxShadow = ''; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
    return function () { el.removeEventListener('pointerdown', down); el.removeEventListener('pointerup', up); el.removeEventListener('pointerleave', up); el.removeEventListener('pointercancel', up); };
  }

  // Distinct haptic intents. navigate = light tick, complete = double, milestone = ramp.
  var HAPTIC = { navigate: [8], complete: [12, 40, 12], milestone: [10, 30, 18, 30, 26] };
  function haptic(intent) {
    if (RM) return;
    try { if (navigator.vibrate) navigator.vibrate(HAPTIC[intent] || HAPTIC.navigate); } catch (e) {}
  }

  window.ForgeMotion = {
    reduced: RM, EASE: EASE, DUR: DUR,
    tween: tween, countUp: countUp, drawPath: drawPath, fadeIn: fadeIn, onView: onView, press: press, haptic: haptic,
  };
})();
