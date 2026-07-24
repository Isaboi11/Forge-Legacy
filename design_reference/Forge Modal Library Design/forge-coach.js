/* Forge Legacy — first-run coach marks (spotlight tours).
 *
 *   window.ForgeCoach.start({ page: 'legacy', steps: [ {target, title, body, pad, radius} ... ] })
 *
 * • Spotlight: dims the whole phone frame and cuts a glowing hole around the target.
 * • Short tour: Next / Got it + Skip all, per-step counter, Back after step 1.
 * • First-visit only, keyed per page in localStorage. Fires after a ~1s beat.
 * • Respects a global enable flag (toggled from Account Settings) and Reduce Motion.
 *
 * A step with no `target` is a centered "what this page is for" card over a full dim.
 * Targets that don't exist on this render are skipped gracefully.
 */
(function () {
  if (window.ForgeCoach) return;

  var SEEN = 'fl-coach-seen-v1';
  var ENABLED = 'fl-coach-enabled';
  var LEGACY_KEYS = ['forge_home_tour_v1']; // pre-existing bespoke tours, cleared on "replay all"
  var EASE = 'cubic-bezier(.4,0,.2,1)';

  function readSeen() { try { return JSON.parse(localStorage.getItem(SEEN) || '{}') || {}; } catch (e) { return {}; } }
  function writeSeen(m) { try { localStorage.setItem(SEEN, JSON.stringify(m)); } catch (e) {} }
  function enabled() { try { return localStorage.getItem(ENABLED) !== '0'; } catch (e) { return true; } }
  function reduceMotion() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  function ensureStyle() {
    if (document.getElementById('fl-coach-style')) return;
    var s = document.createElement('style');
    s.id = 'fl-coach-style';
    s.textContent =
      '@keyframes flCoachFade{from{opacity:0}to{opacity:1}}' +
      '@keyframes flCoachCardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
      '@keyframes flCoachPulse{0%,100%{box-shadow:0 0 0 4px rgba(191,143,79,.14),0 0 22px rgba(191,143,79,.26),0 0 0 9999px rgba(4,6,8,.76)}50%{box-shadow:0 0 0 6px rgba(191,143,79,.20),0 0 30px rgba(191,143,79,.40),0 0 0 9999px rgba(4,6,8,.76)}}' +
      '@media (prefers-reduced-motion: reduce){#fl-coach-hole{animation:none !important;transition:none !important}#fl-coach-overlay,#fl-coach-card{animation-duration:.001ms !important}}';
    document.head.appendChild(s);
  }

  function scroller(el, frame) {
    var sc = el.parentNode;
    while (sc && sc !== frame && sc !== document.body) {
      var st;
      try { st = getComputedStyle(sc); } catch (e) { st = null; }
      if (st && (st.overflowY === 'auto' || st.overflowY === 'scroll') && sc.scrollHeight > sc.clientHeight + 4) return sc;
      sc = sc.parentNode;
    }
    return null;
  }

  function runTour(frame, steps, page, opts) {
    ensureStyle();
    try { if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative'; } catch (e) {}

    var overlay = document.createElement('div');
    overlay.id = 'fl-coach-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;z-index:950;font-family:var(--fl-font-sans);animation:flCoachFade 300ms ease both;';

    var block = document.createElement('div'); // click shield (blocks the UI behind)
    block.style.cssText = 'position:absolute;inset:0;background:transparent;';
    overlay.appendChild(block);

    var hole = document.createElement('div');
    hole.id = 'fl-coach-hole';
    hole.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;border-radius:16px;border:1.5px solid var(--fl-bronze-primary);pointer-events:none;opacity:0;' +
      'box-shadow:0 0 0 4px rgba(191,143,79,.14),0 0 22px rgba(191,143,79,.26),0 0 0 9999px rgba(4,6,8,.76);' +
      'transition:top 340ms ' + EASE + ',left 340ms ' + EASE + ',width 340ms ' + EASE + ',height 340ms ' + EASE + ';animation:flCoachPulse 3.2s ease-in-out infinite;';
    overlay.appendChild(hole);

    var card = document.createElement('div');
    card.id = 'fl-coach-card';
    card.style.cssText = 'position:absolute;left:22px;right:22px;top:50%;padding:20px 22px;border-radius:var(--fl-radius-xl);background:var(--fl-surface-modal);border:1px solid var(--fl-charcoal-500);box-shadow:var(--fl-border-inset-md),var(--fl-shadow-ambient);display:flex;flex-direction:column;gap:11px;';
    overlay.appendChild(card);

    frame.appendChild(overlay);

    var idx = 0;
    var done = false;

    function cleanup() {
      window.removeEventListener('resize', onResize);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function finish() {
      if (done) return; done = true;
      ForgeCoach.markSeen(page);
      overlay.style.transition = 'opacity 220ms ease';
      overlay.style.opacity = '0';
      setTimeout(cleanup, 220);
      if (opts.onDone) try { opts.onDone(); } catch (e) {}
    }

    function renderCard(step) {
      var n = idx + 1, total = steps.length;
      card.style.animation = 'flCoachCardIn 300ms ease both';
      card.innerHTML = '';

      var top = document.createElement('div');
      top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
      var counter = document.createElement('span');
      counter.style.cssText = 'font-size:10.5px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:var(--fl-text-bronze-label);';
      counter.textContent = total > 1 ? (n + ' of ' + total) : 'Tip';
      top.appendChild(counter);
      var skip = document.createElement('span');
      skip.textContent = total > 1 ? 'Skip all' : 'Dismiss';
      skip.setAttribute('role', 'button'); skip.tabIndex = 0;
      skip.style.cssText = 'font-size:12.5px;font-weight:500;color:var(--fl-text-tertiary);cursor:pointer;';
      skip.onclick = finish;
      top.appendChild(skip);
      card.appendChild(top);

      if (step.title) {
        var t = document.createElement('span');
        t.style.cssText = 'font-family:var(--fl-font-display);font-size:22px;font-weight:600;letter-spacing:-0.2px;line-height:1.14;color:var(--fl-text-primary);';
        t.textContent = step.title;
        card.appendChild(t);
      }
      if (step.body) {
        var b = document.createElement('p');
        b.style.cssText = 'margin:0;font-size:14px;line-height:1.55;color:var(--fl-text-secondary);text-wrap:pretty;';
        b.textContent = step.body;
        card.appendChild(b);
      }

      var foot = document.createElement('div');
      foot.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:5px;';
      var left = document.createElement('span');
      if (idx > 0) {
        left.textContent = 'Back';
        left.setAttribute('role', 'button'); left.tabIndex = 0;
        left.style.cssText = 'font-size:12.5px;font-weight:600;color:var(--fl-text-tertiary);cursor:pointer;padding:6px 2px;';
        left.onclick = function () { idx = Math.max(0, idx - 1); place(); };
      }
      foot.appendChild(left);
      var next = document.createElement('div');
      next.setAttribute('role', 'button'); next.tabIndex = 0;
      next.style.cssText = 'display:inline-flex;align-items:center;white-space:nowrap;gap:8px;padding:11px 22px;border-radius:var(--fl-radius-md);background:var(--fl-bronze-fill);border:1px solid var(--fl-bronze-metal-border);color:#F7F5F1;font-size:13px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;cursor:pointer;box-shadow:var(--fl-bronze-metal-top-rim),var(--fl-shadow-card);text-shadow:0 1px 1px rgba(8,5,2,0.5);';
      next.textContent = (n >= total) ? (opts.doneLabel || 'Got it') : 'Next';
      next.onclick = function () { if (n >= total) finish(); else { idx++; place(); } };
      foot.appendChild(next);
      card.appendChild(foot);
    }

    function positionCard(holeTop, holeH, frameH) {
      var cardH = card.offsetHeight || 170;
      var spaceBelow = frameH - (holeTop + holeH + 16);
      if (holeTop == null) { // centered
        card.style.top = Math.max(20, (frameH - cardH) / 2) + 'px';
      } else if (spaceBelow > cardH + 12) {
        card.style.top = (holeTop + holeH + 16) + 'px';
      } else {
        var above = holeTop - 16 - cardH;
        card.style.top = above > 12 ? (above + 'px') : (Math.max(12, frameH - cardH - 16) + 'px');
      }
    }

    function place() {
      var step = steps[idx];
      renderCard(step);
      var el = step.target ? document.querySelector(step.target) : null;
      var fR = frame.getBoundingClientRect();

      if (!el) {
        hole.style.opacity = '0';
        hole.style.width = '0'; hole.style.height = '0';
        block.style.background = 'rgba(4,6,8,0.76)';
        positionCard(null, 0, fR.height);
        return;
      }
      block.style.background = 'transparent';

      var sc = scroller(el, frame);
      var proceed = function () {
        var r = el.getBoundingClientRect();
        var f = frame.getBoundingClientRect();
        var pad = step.pad != null ? step.pad : 8;
        var top = r.top - f.top - pad;
        var left = r.left - f.left - pad;
        var w = r.width + pad * 2;
        var hh = r.height + pad * 2;
        if (left < 6) { w += left - 6; left = 6; }
        if (left + w > f.width - 6) w = f.width - 6 - left;
        if (top < 6) { hh += top - 6; top = 6; }
        if (top + hh > f.height - 6) hh = f.height - 6 - top;
        hole.style.opacity = '1';
        hole.style.borderRadius = (step.radius != null ? step.radius : 16) + 'px';
        hole.style.top = top + 'px';
        hole.style.left = left + 'px';
        hole.style.width = Math.max(0, w) + 'px';
        hole.style.height = Math.max(0, hh) + 'px';
        positionCard(top, hh, f.height);
      };

      if (sc) {
        var scR = sc.getBoundingClientRect();
        var r0 = el.getBoundingClientRect();
        var margin = 96;
        var target = sc.scrollTop;
        if (r0.top < scR.top + margin) target = sc.scrollTop - (scR.top + margin - r0.top);
        else if (r0.bottom > scR.bottom - margin) target = sc.scrollTop + (r0.bottom - (scR.bottom - margin));
        target = Math.max(0, Math.min(target, sc.scrollHeight - sc.clientHeight));
        if (Math.abs(target - sc.scrollTop) > 2) {
          try { sc.scrollTo({ top: target, behavior: reduceMotion() ? 'auto' : 'smooth' }); } catch (e) { sc.scrollTop = target; }
          // Wait for the (possibly smooth) scroll to actually settle before positioning,
          // otherwise the hole/card land at the target's pre-scroll location.
          var last = null, stable = 0, t0 = Date.now();
          (function settle() {
            var reached = Math.abs(sc.scrollTop - target) < 2;
            var y = el.getBoundingClientRect().top;
            if (last !== null && Math.abs(y - last) < 0.5) stable++; else stable = 0;
            last = y;
            if ((reached && stable >= 2) || Date.now() - t0 > 900) { proceed(); return; }
            requestAnimationFrame(settle);
          })();
          return;
        }
      }
      proceed();
    }

    var _rt;
    function onResize() { clearTimeout(_rt); _rt = setTimeout(place, 120); }
    window.addEventListener('resize', onResize);

    place();
  }

  function startTour(opts, force) {
    opts = opts || {};
    var page = opts.page || 'default';
    if (!force) { if (!enabled()) return; if (readSeen()[page]) return; }
    var delay = opts.delay != null ? opts.delay : 1000;
    var frameSel = opts.frame || '[data-coach-frame],[data-screen-label]';
    var tries = 0;
    (function waitReady() {
      var frame = document.querySelector(frameSel);
      var steps = (opts.steps || []).filter(function (s) { return !s.target || document.querySelector(s.target); });
      if (frame && steps.length) { setTimeout(function () { if (document.querySelector('#fl-coach-overlay')) return; runTour(frame, steps, page, opts); }, delay); return; }
      if (++tries > 240) return;
      setTimeout(waitReady, 60);
    })();
  }

  var ForgeCoach = {
    enabled: enabled,
    setEnabled: function (on) { try { localStorage.setItem(ENABLED, on ? '1' : '0'); } catch (e) {} },
    hasSeen: function (p) { return !!readSeen()[p]; },
    markSeen: function (p) { var m = readSeen(); m[p] = true; writeSeen(m); },
    reset: function (p) { if (!p) { try { localStorage.removeItem(SEEN); } catch (e) {} return; } var m = readSeen(); delete m[p]; writeSeen(m); },
    resetAll: function () {
      try { localStorage.removeItem(SEEN); } catch (e) {}
      LEGACY_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    },
    start: function (opts) { startTour(opts, false); },
    replay: function (opts) { startTour(opts, true); },
  };
  window.ForgeCoach = ForgeCoach;
})();
