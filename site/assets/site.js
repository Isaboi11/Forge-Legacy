/* forgelegacy.app — page runtime for the Clean v2 site.
 *
 * The page is static HTML: every sub-page (#training, #nutrition, …) is already in the document and
 * CSS `:target` decides which one shows, so the text is crawlable and the tabs work with JS off.
 * This file adds what HTML can't: the menu drawer, the TestFlight form, the mobile sticky bar, and
 * the animated phone screens, which are React components from the design (site-phone-anims.js)
 * mounted as islands into `[data-anim]` placeholders. A placeholder's own <img> is the no-JS and
 * reduced-data fallback; React replaces it on mount.
 */
(function () {
  'use strict';

  // The design resolves its bundled assets through window.__resources by a derived id. Point the
  // ids at the files this site actually ships (webp, renamed), so site-phone-anims.js runs unedited.
  window.__resources = {
    r_coach_holt_mark: 'assets/landing/coach-holt-mark.webp',
    r_welcome_logo_carved: 'assets/landing/logo-carved.webp',
    r_bench_demo_frame: 'assets/landing/bench-demo-frame.webp',
    r_badge_builder: 'assets/landing/badge-builder.webp',
    r_badge_craftsman: 'assets/landing/badge-craftsman.webp',
  };
  const R = p => { const id = 'r_' + p.replace(/^.*\//, '').replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '_'); return (window.__resources && window.__resources[id]) || p; };

  const PAGES = ['training', 'nutrition', 'coach', 'legacy', 'squads'];
  const ALIAS = { chapters: 'legacy', rank: 'legacy' };
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  /* ── Coach Holt chat — verbatim from the design (Clean v2) ─────────────── */
  const HC_Q = 'What am I doing today?';
  const HC_A = "Push day. Bench has held at 185 for three weeks, so we're dropping to 165 and adding a set. You'll clear 185 in two weeks instead of grinding at it.";
  const HC_Q2 = "My shoulder's been sore. Can we swap overhead press?";
  const HC_A2 = "Yes. Landmine press keeps the push pattern with less strain at the top. Same four sets, lighter load, and I'll check in after Thursday.";
  const HC_W = HC_A.split(' '), HC_W2 = HC_A2.split(' ');
  const HC_LIFTS = [['Bench Press', '5 × 5 · 165 lb'], ['Overhead Press', '4 × 8 · 95 lb'], ['Incline DB Press', '3 × 10 · 55 lb']];
  const HC_T = (() => {
    const T = {}; T.TYPE0 = 700; T.CH = 55; T.WD = 65;
    T.SEND = T.TYPE0 + HC_Q.length * T.CH + 450; T.DOTS = T.SEND + 350; T.ANS = T.DOTS + 1300; T.CARD = T.ANS + HC_W.length * T.WD + 400;
    T.TYPE2 = T.CARD + 2400; T.SEND2 = T.TYPE2 + HC_Q2.length * 48 + 450; T.DOTS2 = T.SEND2 + 350; T.ANS2 = T.DOTS2 + 1400; T.CARD2 = T.ANS2 + HC_W2.length * T.WD + 400;
    T.TAP = T.CARD2 + 1700; T.APPLIED = T.TAP + 320; T.LOOP = T.APPLIED + 3600; T.FADE = T.LOOP - 700;
    return T;
  })();
  function HoltChat() {
    const h = React.createElement;
    const T = HC_T;
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [t, setT] = React.useState(reduce ? T.FADE - 200 : 0);
    const rootRef = React.useRef(null);
    React.useEffect(() => {
      if (reduce) return;
      let raf = 0, start = 0, on = false, wait = 0;
      const f = now => { if (!start) start = now; setT((now - start) % T.LOOP); raf = requestAnimationFrame(f); };
      const io = new IntersectionObserver(es => {
        const en = es[0], hgt = en.boundingClientRect.height || 1;
        const need = Math.min(0.9, (window.innerHeight * 0.92) / hgt);
        if (en.intersectionRatio >= need && !on) { on = true; start = 0; setT(0); wait = setTimeout(() => { raf = requestAnimationFrame(f); }, 600); }
        else if (en.intersectionRatio < 0.12 && on) { on = false; clearTimeout(wait); cancelAnimationFrame(raf); setT(0); }
      }, { threshold: Array.from({ length: 41 }, (_, i) => i / 40) });
      if (rootRef.current) io.observe(rootRef.current);
      return () => { io.disconnect(); clearTimeout(wait); cancelAnimationFrame(raf); };
    }, []);
    const cq = n => (n / 3.93).toFixed(3) + 'cqw';
    const e = (a, d) => Math.max(0, Math.min(1, (t - a) / (d || 300)));
    const rise = a => ({ opacity: e(a), transform: 'translateY(' + ((1 - e(a)) * 10).toFixed(1) + 'px)' });
    const bronze = '#BF8F4F', fill = 'linear-gradient(180deg,#8C6838 0%,#6A4B26 100%)';
    let typing = false, typed = '', typeEnd = 0;
    if (t >= T.TYPE0 && t < T.SEND) { typing = true; typed = HC_Q.slice(0, Math.min(HC_Q.length, Math.floor((t - T.TYPE0) / T.CH))); typeEnd = T.TYPE0 + HC_Q.length * T.CH; }
    if (t >= T.TYPE2 && t < T.SEND2) { typing = true; typed = HC_Q2.slice(0, Math.min(HC_Q2.length, Math.floor((t - T.TYPE2) / 48))); typeEnd = T.TYPE2 + HC_Q2.length * 48; }
    const fade = t > T.FADE ? Math.max(0, 1 - (t - T.FADE) / 700) : 1;
    const avatar = (s) => h('img', { src: R('assets/coach-holt-mark.png'), alt: '', style: { width: cq(s), height: cq(s), borderRadius: '50%', objectFit: 'cover', flex: 'none', border: '1px solid rgba(191,143,79,0.5)', display: 'block' } });
    const dots = h('span', { style: { display: 'flex', gap: cq(5), padding: cq(4) + ' 0' } }, [0, 1, 2].map(i => h('span', { key: i, style: { width: cq(7), height: cq(7), borderRadius: '50%', background: bronze, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(t / 160 - i * 0.9)) } })));
    const userB = (k, at, text) => h('div', { key: k, style: Object.assign({ alignSelf: 'flex-end', flex: 'none', maxWidth: '78%', padding: cq(10) + ' ' + cq(14), borderRadius: cq(18) + ' ' + cq(18) + ' ' + cq(5) + ' ' + cq(18), background: fill, color: '#FBF6EC', fontSize: cq(15), lineHeight: 1.4 }, rise(at)) }, text);
    const holtB = (k, at, ans, words) => h('div', { key: k, style: Object.assign({ display: 'flex', flex: 'none', alignItems: 'flex-end', gap: cq(8) }, rise(at)) }, avatar(26),
      h('div', { style: { maxWidth: '84%', padding: cq(11) + ' ' + cq(14), borderRadius: cq(18) + ' ' + cq(18) + ' ' + cq(18) + ' ' + cq(5), background: '#1A1815', border: '1px solid rgba(191,143,79,0.18)', fontSize: cq(15), lineHeight: 1.42, color: '#E6DED0' } },
        t < ans ? dots : words.slice(0, Math.min(words.length, Math.floor((t - ans) / T.WD) + 1)).join(' ')));
    const card = (k, at, kids) => h('div', { key: k, style: Object.assign({ flex: 'none', marginLeft: cq(34), padding: cq(14), borderRadius: cq(16), background: '#16140F', border: '1px solid rgba(191,143,79,0.28)', display: 'flex', flexDirection: 'column', gap: cq(9) }, rise(at)) }, kids);
    const label = s => h('span', { style: { fontSize: cq(10.5), fontWeight: 700, letterSpacing: '0.14em', color: bronze } }, s);
    const row = (k, l, r, st) => h('span', { key: k, style: Object.assign({ display: 'flex', justifyContent: 'space-between', gap: cq(8), fontSize: cq(13) }, st || {}) }, h('span', null, l), h('span', { style: { color: st && st.rc ? st.rc : '#9C9385' } }, r));
    const swapped = t >= T.APPLIED;
    const msgs = [];
    if (t >= T.SEND) msgs.push(userB('q', T.SEND, HC_Q));
    if (t >= T.DOTS) msgs.push(holtB('a', T.DOTS, T.ANS, HC_W));
    if (t >= T.CARD) msgs.push(card('c', T.CARD, [
      label('TODAY · PUSH'),
      row('b', 'Bench Press', '5 × 5 · 165 lb', { color: '#EDE6DA' }),
      swapped ? row('o', 'Landmine Press', '4 × 10 · 70 lb', { color: '#EDE6DA', rc: bronze }) : row('o', 'Overhead Press', '4 × 8 · 95 lb', { color: '#EDE6DA' }),
      row('i', 'Incline DB Press', '3 × 10 · 55 lb', { color: '#EDE6DA' }),
      h('span', { key: 'btn', style: { marginTop: cq(4), height: cq(38), borderRadius: cq(10), background: fill, border: '1px solid rgba(205,160,99,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(14), fontWeight: 600, color: '#FBF6EC' } }, 'Start workout')]));
    if (t >= T.SEND2) msgs.push(userB('q2', T.SEND2, HC_Q2));
    if (t >= T.DOTS2) msgs.push(holtB('a2', T.DOTS2, T.ANS2, HC_W2));
    if (t >= T.CARD2) {
      const pressing = t >= T.TAP && t < T.APPLIED;
      msgs.push(card('c2', T.CARD2, [
        label(swapped ? 'CHANGE APPLIED · WEEK 4' : 'PROPOSED CHANGE · WEEK 4'),
        row('from', 'Overhead Press', '4 × 8 · 95 lb', { color: '#6F675C', textDecoration: 'line-through', rc: '#6F675C' }),
        row('to', 'Landmine Press', '4 × 10 · 70 lb', { color: '#EDE6DA', fontWeight: 600, rc: bronze }),
        h('span', { key: 'why', style: { fontSize: cq(12), lineHeight: 1.4, color: '#9C9385' } }, 'Reason: shoulder soreness. Check-in after Thursday.'),
        swapped
          ? h('span', { key: 'done', style: Object.assign({ marginTop: cq(4), height: cq(38), borderRadius: cq(10), border: '1px solid rgba(191,143,79,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: cq(8), fontSize: cq(14), fontWeight: 600, color: bronze }, { opacity: e(T.APPLIED, 250) }) }, '✓ Added to your program')
          : h('span', { key: 'btns', style: { marginTop: cq(4), display: 'flex', gap: cq(8) } },
              h('span', { style: { flex: 1, height: cq(38), borderRadius: cq(10), border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(13.5), fontWeight: 600, color: '#C9C0B2' } }, 'Keep original'),
              h('span', { style: { flex: 1, height: cq(38), borderRadius: cq(10), background: fill, border: '1px solid rgba(205,160,99,' + (pressing ? 0.9 : 0.45) + ')', boxShadow: pressing ? '0 0 0 3px rgba(191,143,79,0.25)' : 'none', transform: pressing ? 'scale(0.96)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(13.5), fontWeight: 600, color: '#FBF6EC' } }, 'Apply'))]));
    }
    const caretOn = typing && (t < typeEnd || Math.floor(t / 450) % 2 === 0);
    return h('div', { ref: rootRef, role: 'img', 'aria-label': 'Coach Holt chat: someone asks what they are doing today and Holt lays out push day, then they ask to swap overhead press for a sore shoulder and Holt proposes landmine press, which they apply', style: { containerType: 'inline-size', width: '100%', aspectRatio: '1320/2868', borderRadius: '31px', overflow: 'hidden', background: 'radial-gradient(120% 60% at 50% 0%, #1B1814 0%, #0D0C0B 60%)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--fl-font-sans)', color: '#EDE6DA' } },
      h('div', { style: { height: cq(54), flex: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 ' + cq(30) + ' ' + cq(8) } },
        h('span', { style: { fontSize: cq(16), fontWeight: 600 } }, '9:41'),
        h('span', { style: { width: cq(25), height: cq(12), borderRadius: cq(4), border: '1px solid rgba(237,230,218,0.6)', padding: '1px', display: 'flex' } }, h('span', { style: { width: '70%', background: '#EDE6DA', borderRadius: cq(2) } }))),
      h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(10), padding: cq(10) + ' ' + cq(18), borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0F0E0C', position: 'relative', zIndex: 1 } },
        h('span', { style: { fontSize: cq(26), lineHeight: 1, color: bronze, marginTop: '-' + cq(3) } }, '‹'), avatar(34),
        h('span', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(2), whiteSpace: 'nowrap' } },
          h('span', { style: { fontFamily: 'var(--fl-font-display)', fontSize: cq(17), fontWeight: 600 } }, 'Coach Holt'),
          h('span', { style: { fontSize: cq(11.5), color: '#9C9385' } }, 'Reads your training'))),
      h('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: cq(10), padding: cq(16), opacity: fade, WebkitMaskImage: 'linear-gradient(180deg, transparent 0, #000 12%)', maskImage: 'linear-gradient(180deg, transparent 0, #000 12%)' } }, msgs),
      h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(8), padding: cq(10) + ' ' + cq(14) + ' ' + cq(28), borderTop: '1px solid rgba(255,255,255,0.07)' } },
        h('span', { style: { flex: 1, minWidth: 0, height: cq(40), borderRadius: cq(20), background: '#171512', border: '1px solid ' + (typing ? 'rgba(191,143,79,0.45)' : 'rgba(255,255,255,0.08)'), padding: '0 ' + cq(14), display: 'flex', alignItems: 'center', justifyContent: typed.length > 30 ? 'flex-end' : 'flex-start', fontSize: cq(15), whiteSpace: 'nowrap', overflow: 'hidden' } },
          typed ? h('span', { style: { color: '#EDE6DA' } }, typed) : h('span', { style: { color: '#6F675C' } }, typing ? '' : 'Ask Holt anything'),
          typing ? h('span', { style: { width: '1.5px', height: cq(18), flex: 'none', marginLeft: '1px', background: bronze, opacity: caretOn ? 1 : 0 } }) : null),
        h('span', { style: { width: cq(40), height: cq(40), flex: 'none', borderRadius: '50%', background: typed ? fill : '#24211C', color: typed ? '#FBF6EC' : '#6F675C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(18), fontWeight: 700 } }, '↑')));
  }


  /* ── Islands ─────────────────────────────────────────────────────────────── */
  const mounted = new WeakSet();
  function mountIn(scope) {
    if (!window.React || !window.ReactDOM || !window.FLPhoneAnims) return;
    const AN = window.FLPhoneAnims.get(React);
    $$('[data-anim]', scope).forEach(el => {
      if (mounted.has(el)) return;
      const name = el.getAttribute('data-anim');
      const C = name === 'holtChat' ? HoltChat : AN[name];
      if (!C) return;
      mounted.add(el);
      const r = el.getAttribute('data-r');
      const props = r ? { radius: +r } : {};
      try { ReactDOM.createRoot(el).render(React.createElement(C, props)); } catch (e) { /* keep the fallback image */ }
    });
  }

  /* ── Routing ─────────────────────────────────────────────────────────────
     With JS, <html data-page> picks the page (set first in <head> to avoid a flash). CSS :target is
     only the no-JS fallback — it does not update on pushState, which the Home link uses. */
  function current() {
    const h = (location.hash || '').slice(1);
    return PAGES.indexOf(h) >= 0 ? h : 'home';
  }
  function sync(scroll) {
    const h = (location.hash || '').slice(1);
    if (ALIAS[h]) { location.replace('#' + ALIAS[h]); return; }
    const cur = current();
    document.documentElement.setAttribute('data-page', cur);
    $$('[data-nav]').forEach(a => {
      const on = a.getAttribute('data-nav') === cur;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    mountIn(cur === 'home' ? $('#home') : document.getElementById(cur));
    if (scroll) window.scrollTo(0, 0);
    onScroll();
  }
  window.addEventListener('hashchange', () => { closeMenu(); sync(true); });

  // "Home" clears the hash without leaving a bare "#" in the address bar.
  $$('a[data-nav="home"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    closeMenu();
    if (location.hash) { history.pushState(null, '', location.pathname + location.search); sync(true); }
    else window.scrollTo(0, 0);
  }));
  window.addEventListener('popstate', () => sync(true));

  /* ── Menu drawer ─────────────────────────────────────────────────────────── */
  const drawer = $('#menu'), opener = $('#menu-open');
  function openMenu() {
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    opener.setAttribute('aria-expanded', 'true');
    const first = $('#menu nav a.on') || $('#menu nav a');
    if (first) first.focus();
  }
  function closeMenu() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    document.body.style.overflow = '';
    opener.setAttribute('aria-expanded', 'false');
  }
  opener.addEventListener('click', openMenu);
  $$('[data-close-menu]').forEach(b => b.addEventListener('click', () => { closeMenu(); opener.focus(); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) { closeMenu(); opener.focus(); } });

  /* ── "Get access" buttons scroll to the form without changing the page ──── */
  function toJoin(e) {
    if (e) e.preventDefault();
    closeMenu();
    const j = document.getElementById('join');
    if (!j) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: j.getBoundingClientRect().top + window.scrollY - 20, behavior: reduce ? 'auto' : 'smooth' });
    const input = $('#join input[type=email]');
    if (input) setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 450);
  }
  $$('[data-join]').forEach(b => b.addEventListener('click', toJoin));

  /* ── TestFlight form ─────────────────────────────────────────────────────── */
  const CFG = window.FL_SITE || {};
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Which platform link brought this visitor (forgelegacy.app/go/<platform>, migration 0247). Kept for the
  // tab, so it survives the #training-style page switches; it becomes the early-access form's source.
  const SRC = (() => {
    let s = null;
    try { s = new URLSearchParams(location.search).get('src') || sessionStorage.getItem('fl_src'); } catch (e) { /* private mode */ }
    s = s === 'tiktok' || s === 'instagram' ? s : null;
    try { if (s) sessionStorage.setItem('fl_src', s); } catch (e) { /* ignore */ }
    return s;
  })();
  let submitted = false;
  function done(email) {
    submitted = true;
    $$('[data-form]').forEach(f => { f.hidden = true; });
    $$('[data-done]').forEach(d => { $('strong', d).textContent = email; d.hidden = false; });
    onScroll();
  }
  $$('form[data-form]').forEach(form => {
    const input = $('input', form), btn = $('button', form), err = form.nextElementSibling;
    const setErr = msg => {
      err.textContent = msg; err.hidden = !msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      form.classList.toggle('bad', !!msg);
    };
    input.addEventListener('input', () => setErr(''));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const v = input.value.trim();
      if (!EMAIL_RE.test(v)) { setErr('Enter a valid email address.'); input.focus(); return; }
      if (!CFG.supabaseUrl || !CFG.anonKey) { setErr('Sign-up isn’t available right now. Email support@forgelegacy.app and we’ll send an invite.'); return; }
      btn.disabled = true; form.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(CFG.supabaseUrl + '/rest/v1/rpc/request_testflight_invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: CFG.anonKey, Authorization: 'Bearer ' + CFG.anonKey },
          body: JSON.stringify({ p_email: v, p_source: (SRC || 'site') + (form.dataset.form ? '-' + form.dataset.form : '') }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        done(v);
      } catch (x) {
        setErr('That didn’t go through. Try again, or email support@forgelegacy.app.');
      } finally {
        btn.disabled = false; form.removeAttribute('aria-busy');
      }
    });
  });

  /* ── Mobile sticky bar ───────────────────────────────────────────────────── */
  const bar = $('#bar');
  function onScroll() {
    if (!bar) return;
    const j = document.getElementById('join');
    const nearJoin = j && j.getBoundingClientRect().top < window.innerHeight;
    bar.hidden = !(window.innerWidth < 720 && window.scrollY > 560 && !nearJoin && !submitted);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  sync(false);
})();
