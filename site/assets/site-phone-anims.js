/* Forge Legacy site — animated phone screens. FLPhoneAnims.get(React) -> { workout, seal, build, nutrition, holtStart, holtBuild } */
(function () {
  let cache = null;
  const R = p => { const id = 'r_' + p.replace(/^.*\//, '').replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '_'); return (window.__resources && window.__resources[id]) || p; };
  function build(React) {
    const h = React.createElement, { useState, useEffect, useRef } = React;
    const cq = n => (n / 3.93).toFixed(3) + 'cqw';
    const B = '#BF8F4F', BB = '#CDA063', FILL = 'linear-gradient(180deg,#8C6838 0%,#6A4B26 100%)', INK = '#EDE6DA', MUTE = '#9C9385', DIM = '#6F675C';
    const CARD = '#15130F', LINE = 'rgba(255,255,255,0.07)', BL = 'rgba(191,143,79,0.22)', GREEN = '#6FAE7B', GBG = 'rgba(111,174,123,0.10)', GL = 'rgba(111,174,123,0.45)';
    const DISP = 'var(--fl-font-display)', BGD = 'radial-gradient(120% 60% at 50% 0%, #1B1814 0%, #0D0C0B 60%)';
    const cl = v => Math.max(0, Math.min(1, v));
    const ez = v => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
    const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const S = (o, x) => Object.assign({}, o, x || {});

    const ExtT = React.createContext(null), ClockC = React.createContext(null);
    function useClock(L, still) {
      const ref = useRef(null), ext = React.useContext(ExtT);
      const [t, setT] = useState(reduce() ? still : 350);
      useEffect(() => {
        if (reduce() || ext != null) return;
        let raf = 0, start = 0, on = false, wait = 0;
        const HOLD = 1300, f = now => { if (!start) start = now - 350; const x = (now - start) % (L + HOLD); setT(x < L - 620 ? x : x < L - 620 + HOLD ? L - 620 : x - HOLD); raf = requestAnimationFrame(f); };
        const io = new IntersectionObserver(es => {
          const en = es[0], hgt = en.boundingClientRect.height || 1;
          const need = Math.min(0.9, (window.innerHeight * 0.92) / hgt);
          if (en.intersectionRatio >= need && !on) {
            on = true; start = 0; setT(350);
            wait = setTimeout(() => { raf = requestAnimationFrame(f); }, 600);
          } else if (en.intersectionRatio < 0.12 && on) {
            on = false; clearTimeout(wait); cancelAnimationFrame(raf); setT(350);
          }
        }, { threshold: Array.from({ length: 41 }, (_, i) => i / 40) });
        if (ref.current) io.observe(ref.current);
        return () => { io.disconnect(); clearTimeout(wait); cancelAnimationFrame(raf); };
      }, []);
      return [ext != null ? ext : t, ref];
    }

    const rise = (t, a, d, dy) => { const k = ez(cl((t - a) / (d || 320))); return { opacity: k, transform: 'translateY(' + ((1 - k) * (dy == null ? 10 : dy)).toFixed(1) + 'px)' }; };
    const lbl = (s, c, x) => h('span', { style: S({ fontSize: cq(10.5), fontWeight: 700, letterSpacing: '0.14em', color: c || B, textTransform: 'uppercase' }, x) }, s);
    const tapDot = (t, at, hold) => {
      const end = at + (hold || 0), d0 = t - at;
      if (d0 < -320 || t > end + 420) return null;
      let a, s;
      if (d0 < 0) { const k = 1 + d0 / 320; a = k; s = 1.3 - 0.3 * k; } else if (t <= end) { a = 1; s = 1; } else { const k = (t - end) / 420; a = 1 - k; s = 1 + 0.7 * k; }
      return h('span', { style: { position: 'absolute', left: '50%', top: '50%', width: cq(38), height: cq(38), marginLeft: cq(-19), marginTop: cq(-19), borderRadius: '50%', pointerEvents: 'none', zIndex: 30, background: 'rgba(255,248,235,' + (0.22 * a).toFixed(3) + ')', border: '1.5px solid rgba(255,248,235,' + (0.55 * a).toFixed(3) + ')', transform: 'scale(' + s.toFixed(3) + ')' } });
    };
    const pressT = (t, at, hold) => (t > at - 100 && t < at + (hold || 0) + 140) ? 'scale(0.965)' : 'none';
    const btn = (kids, x) => h('span', { style: S({ position: 'relative', flex: 1, height: cq(46), borderRadius: cq(10), background: FILL, border: '1px solid rgba(205,160,99,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: cq(8), fontSize: cq(12), fontWeight: 700, letterSpacing: '0.1em', color: '#FBF6EC', textTransform: 'uppercase' }, x) }, kids);
    const btn2 = (kids, x) => btn(kids, S({ background: '#16140F', border: '1px solid rgba(255,255,255,0.14)', color: INK }, x));
    const status = () => { const clk = React.useContext(ClockC) || '9:41'; return h('div', { style: { height: cq(50), flex: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 ' + cq(30) + ' ' + cq(6) } },
      h('span', { style: { fontSize: cq(15), fontWeight: 600 } }, clk),
      h('span', { style: { width: cq(25), height: cq(12), borderRadius: cq(4), border: '1px solid rgba(237,230,218,0.6)', padding: '1px', display: 'flex' } }, h('span', { style: { width: '70%', background: INK, borderRadius: cq(2) } }))); };
    function frame(o, ...kids) {
      const { t, L, fref, label, radius, bg } = o;
      const op = reduce() ? 1 : (t < 350 ? t / 350 : t > L - 600 ? cl((L - t) / 600) : 1);
      return h('div', { ref: fref, role: 'img', 'aria-label': label, style: { containerType: 'inline-size', position: 'relative', width: '100%', aspectRatio: '1320/2868', borderRadius: radius == null ? 29 : radius, overflow: 'hidden', background: bg || BGD, fontFamily: 'var(--fl-font-sans)', color: INK } },
        h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', opacity: op } }, status(), ...kids));
    }
    const fmt = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const ic = (id, size) => window.ForgeSymbols ? window.ForgeSymbols.create(React, id, { size: size || 16, strokeWidth: 1.8 }) : null;

    /* ── Active workout ── */
    function Workout(p) {
      const L = 13500, [t, ref] = useClock(L, 6200);
      const TW = 1150, CK = 2700, RS = 3150, MN = 9300;
      const typed = t < TW + 150 ? '' : t < TW + 330 ? '2' : t < TW + 510 ? '24' : '245';
      const typing = t >= TW && t < CK, d2 = t >= CK, rest = t >= RS, mini = t >= MN;
      const el = rest ? (t - RS) / 1000 : 0, left = Math.max(0, 90 - Math.floor(el));
      const ov = rest ? ez(cl((t - RS) / 300)) * (1 - ez(cl((t - MN - 120) / 280))) : 0;
      const prog = d2 ? 0.333 + 0.333 * ez(cl((t - CK) / 500)) : 0.333;
      const press = (1 - Math.cos(((t % 2800) / 2800) * 2 * Math.PI)) / 2;
      const reps = (dim) => h('span', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: cq(4) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(16), color: dim ? DIM : INK } }, '8'), h('span', { style: { fontSize: cq(9), letterSpacing: '0.1em', color: DIM } }, 'REPS'));
      const wBox = (txt, on, kids) => h('span', { style: { position: 'relative', height: cq(34), borderRadius: cq(8), border: '1px solid ' + (on ? 'rgba(191,143,79,0.55)' : 'transparent'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1px', fontFamily: DISP, fontSize: cq(16), color: txt === '—' ? DIM : INK } }, txt, kids);
      const caret = typing && typed && Math.floor(t / 420) % 2 === 0 ? h('span', { style: { width: '1.5px', height: cq(17), background: B } }) : null;
      const setRow = (n, state, weight, tapAt) => {
        const done = state === 'done', act = state === 'active', c = done ? GREEN : act ? B : DIM;
        return h('div', { key: n, style: { display: 'grid', gridTemplateColumns: cq(50) + ' 1fr 1fr ' + cq(46) + ' ' + cq(40), alignItems: 'center', gap: cq(6), height: cq(54), padding: '0 ' + cq(10), borderRadius: cq(12), background: done ? GBG : act ? 'rgba(191,143,79,0.06)' : 'transparent', border: '1px solid ' + (done ? GL : act ? 'rgba(191,143,79,0.5)' : 'transparent'), transition: 'background .3s, border-color .3s' } },
          h('span', { style: { display: 'flex', alignItems: 'center', gap: cq(6) } }, h('span', { style: { width: cq(24), height: cq(24), borderRadius: '50%', border: '1.5px solid ' + c, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(12) } }, n), done ? h('span', { style: { color: GREEN, fontSize: cq(13), fontWeight: 700 } }, '✓') : null),
          reps(state === 'idle'), weight,
          h('span', { style: { height: cq(34), borderRadius: cq(8), border: '1px solid ' + (act ? 'rgba(191,143,79,0.55)' : 'rgba(255,255,255,0.12)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISP, fontSize: cq(16), color: state === 'idle' ? DIM : INK } }, state === 'idle' ? '—' : '8'),
          h('span', { style: { position: 'relative', justifySelf: 'center', width: cq(30), height: cq(30), borderRadius: '50%', border: '1.5px solid ' + c, background: done ? 'rgba(111,174,123,0.22)' : 'transparent', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(14), fontWeight: 700, transform: tapAt ? pressT(t, tapAt) : 'none', transition: 'background .25s' } }, state === 'idle' ? '' : '✓', tapAt ? tapDot(t, tapAt) : null));
      };
      const C = 339.29;
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Active workout: logging 245 pounds for set two of bench press, checking it off, and the rest timer counting down' },
        h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(8) + ' ' + cq(18) } }, h('span', { style: { fontSize: cq(24), lineHeight: 1, color: INK } }, '‹'), h('span', { style: { flex: 1, fontFamily: DISP, fontSize: cq(17), fontWeight: 600 } }, p.hero ? 'Chest Day' : 'Freestyle Workout'), h('span', { style: { fontSize: cq(18), color: MUTE } }, '⋮')),
        h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: cq(6) + ' ' + cq(18) } },
          h('span', { style: { fontSize: cq(11), fontWeight: 700, letterSpacing: '0.12em', color: MUTE } }, h('span', { style: { color: B } }, d2 ? '2' : '1'), ' / 3 DONE'),
          mini ? h('span', { style: S({ display: 'flex', alignItems: 'center', gap: cq(10), height: cq(32), padding: '0 ' + cq(12), borderRadius: 999, border: '1px solid rgba(191,143,79,0.45)', background: '#15130F', fontSize: cq(11), color: MUTE }, rise(t, MN + 200, 300, 0)) }, h('span', { style: { fontFamily: DISP, fontSize: cq(15), color: INK } }, fmt(left)), '−15', h('span', { style: { color: B } }, '❚❚'), '+15')
            : h('span', { style: { display: 'flex', alignItems: 'center', gap: cq(8), height: cq(32), padding: '0 ' + cq(10), borderRadius: 999, border: '1px solid ' + LINE, fontSize: cq(9.5), fontWeight: 700, letterSpacing: '0.1em', color: DIM } }, 'REST TIMER', h('span', { style: { width: cq(26), height: cq(14), borderRadius: 999, background: rest ? 'rgba(191,143,79,0.5)' : '#2A2622' } }))),
        h('div', { style: { flex: 'none', margin: '0 ' + cq(18), height: cq(3), borderRadius: 2, background: 'rgba(255,255,255,0.08)' } }, h('div', { style: { width: (prog * 100).toFixed(1) + '%', height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#8C6838,#CDA063)' } })),
        h('div', { style: { flex: 'none', margin: cq(16) + ' ' + cq(14) + ' 0', padding: cq(14), borderRadius: cq(16), background: CARD, border: '1px solid rgba(191,143,79,0.3)', display: 'flex', flexDirection: 'column', gap: cq(14) } },
          h('div', { style: { display: 'flex', gap: cq(14) } },
            h('div', { style: { width: cq(100), height: cq(126), flex: 'none', borderRadius: cq(12), overflow: 'hidden', background: '#2B2723', border: '1px solid rgba(255,255,255,0.08)' } }, h('img', { src: R('assets/landing/bench-press-loop.webp'), alt: '', style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' } })),
            h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(8) } },
              h('span', { style: { fontFamily: DISP, fontSize: cq(19), fontWeight: 600, lineHeight: 1.15 } }, 'Barbell Bench Press'),
              h('span', { style: { fontSize: cq(10), fontWeight: 700, letterSpacing: '0.14em', color: MUTE } }, 'MAIN LIFT'),
              h('span', { style: { alignSelf: 'flex-start', padding: cq(3) + ' ' + cq(8), borderRadius: cq(4), border: '1px solid rgba(191,143,79,0.4)', fontSize: cq(9.5), fontWeight: 700, letterSpacing: '0.12em', color: B } }, 'STRENGTH'),
              h('span', { style: { fontSize: cq(12.5), color: B } }, '▷ How To'))),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', paddingTop: cq(12), borderTop: '1px solid ' + LINE } },
            [['LAST', '225 × 6', INK], ['GOAL', '3 × 8', B], ['BEST', '—', INK]].map(s => h('span', { key: s[0], style: { display: 'flex', flexDirection: 'column', gap: cq(4) } }, lbl(s[0], s[0] === 'GOAL' ? B : DIM, { fontSize: cq(9) }), h('span', { style: { fontFamily: DISP, fontSize: cq(15), color: s[2] } }, s[1]))))),
        h('div', { style: { flex: 'none', margin: cq(12) + ' ' + cq(14) + ' 0', padding: cq(10), borderRadius: cq(16), background: '#12110E', display: 'flex', flexDirection: 'column', gap: cq(8) } },
          h('div', { style: { display: 'grid', gridTemplateColumns: cq(50) + ' 1fr 1fr ' + cq(46) + ' ' + cq(40), gap: cq(6), padding: '0 ' + cq(10), fontSize: cq(9), fontWeight: 700, letterSpacing: '0.12em', color: DIM } }, h('span', null, 'SET'), h('span', { style: { textAlign: 'center' } }, 'TARGET'), h('span', { style: { textAlign: 'center' } }, 'LB'), h('span', { style: { textAlign: 'center' } }, 'ACTUAL'), h('span', null)),
          setRow(1, 'done', wBox('245', false)),
          setRow(2, d2 ? 'done' : 'active', wBox(typed || '—', typing, [caret && h('span', { key: 'c', style: { width: '1.5px', height: cq(17), background: B } }), h('span', { key: 'd' }, tapDot(t, TW))]), d2 ? 0 : CK),
          setRow(3, d2 ? 'active' : 'idle', wBox('—', false)),
          h('div', { style: { display: 'flex', gap: cq(8) } }, h('span', { style: { flex: 1, height: cq(38), borderRadius: cq(10), border: '1px dashed rgba(191,143,79,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(11), fontWeight: 700, letterSpacing: '0.1em', color: B } }, '+ ADD SET'))),
        h('div', { style: { flex: 1 } }),
        h('div', { style: { flex: 'none', display: 'flex', gap: cq(10), padding: cq(12) + ' ' + cq(14) + ' ' + cq(30), borderTop: '1px solid ' + LINE, background: '#0E0D0B' } }, btn('Finish workout'), btn2('Add exercise')),
        ov > 0.01 ? h('div', { style: { position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(6,5,4,' + (0.5 * ov).toFixed(3) + ')', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: cq(190) } },
          h('div', { style: { width: cq(236), padding: cq(16) + ' ' + cq(16) + ' ' + cq(14), borderRadius: cq(18), background: CARD, border: '1px solid rgba(191,143,79,0.32)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: cq(12), opacity: ov, transform: 'scale(' + (0.94 + 0.06 * ov).toFixed(3) + ')' } },
            lbl('Rest'),
            h('div', { style: { position: 'relative', width: cq(124), height: cq(124) } },
              h('svg', { viewBox: '0 0 120 120', style: { width: '100%', height: '100%', display: 'block' } },
                h('circle', { cx: 60, cy: 60, r: 54, fill: 'none', stroke: 'rgba(255,255,255,0.08)', strokeWidth: 5 }),
                h('circle', { cx: 60, cy: 60, r: 54, fill: 'none', stroke: B, strokeWidth: 5, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: (C * cl(el / 90)).toFixed(2), transform: 'rotate(-90 60 60)' })),
              h('span', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISP, fontSize: cq(32) } }, fmt(left))),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(10) } },
              ['−15s', '❚❚', '+15s'].map((s, i) => h('span', { key: s, style: { width: i === 1 ? cq(40) : cq(48), height: cq(40), borderRadius: i === 1 ? '50%' : cq(10), border: '1px solid ' + (i === 1 ? 'rgba(191,143,79,0.5)' : 'rgba(255,255,255,0.12)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(i === 1 ? 11 : 12), color: i === 1 ? B : MUTE } }, s))),
            h('div', { style: { display: 'flex', gap: cq(10), fontSize: cq(10), fontWeight: 700, letterSpacing: '0.12em' } },
              h('span', { style: { position: 'relative', color: B, padding: cq(4), transform: pressT(t, MN) } }, 'MINIMISE', tapDot(t, MN)), h('span', { style: { color: DIM, padding: cq(4) + ' 0' } }, '·'), h('span', { style: { color: MUTE, padding: cq(4) } }, 'SKIP REST')))) : null);
    }

    /* ── Hold to seal ── */
    function Seal(p) {
      const L = 9200, [t, ref] = useClock(L, 5200);
      const P0 = 1700, P1 = 3400;
      const k = t < P0 ? 0 : ez(cl((t - P0) / (P1 - P0))), sealed = t >= P1, holding = t >= P0 && t < P1;
      const pulse = sealed ? cl((t - P1) / 1100) : 0;
      const glow = sealed ? 0.4 * (1 - 0.5 * pulse) : 0.12 + 0.2 * k;
      const dot = (() => { const d0 = t - P0; if (d0 < -320 || t > P1 + 420) return null; return tapDot(t, P0, P1 - P0); })();
      return frame({ t, L, fref: ref, radius: p.radius, bg: 'radial-gradient(90% 55% at 50% 32%, #211C16 0%, #0C0B0A 72%)', label: 'Session complete: holding the Hold to Seal button until the session is sealed into the chapter' },
        h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: cq(14), padding: '0 ' + cq(26), textAlign: 'center' } },
          lbl('Chapter II — The Real Cut', MUTE, { fontSize: cq(10), letterSpacing: '0.16em' }),
          h('div', { style: { position: 'relative', width: cq(92), height: cq(92), margin: cq(4) + ' 0' } },
            sealed ? h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid ' + BB, opacity: (1 - pulse).toFixed(3), transform: 'scale(' + (1 + 0.8 * ez(pulse)).toFixed(3) + ')' } }) : null,
            h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(191,143,79,' + (sealed ? 0.8 : 0.45) + ')', background: 'radial-gradient(circle at 50% 35%, #2A231A 0%, #110F0C 75%)', boxShadow: '0 0 ' + cq(34) + ' rgba(191,143,79,' + glow.toFixed(3) + '), inset 0 1px 0 rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              h('img', { src: R('assets/welcome-logo-carved.png'), alt: '', style: { width: '52%', height: '52%', objectFit: 'contain', display: 'block' } }))),
          lbl(sealed ? 'Session sealed' : 'Session complete', B, { fontSize: cq(10) }),
          h('span', { style: { fontFamily: DISP, fontSize: cq(34), fontWeight: 600, lineHeight: 1 } }, p.hero ? 'Chest Day' : 'Shoulders'),
          h('span', { style: { fontSize: cq(12.5), color: MUTE, marginTop: cq(-6) } }, p.hero ? 'Sep 25' : 'Sep 23'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(18), marginTop: cq(6) } },
            h('span', { style: { display: 'flex', flexDirection: 'column', gap: cq(4) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(21) } }, p.hero ? '46:12' : '1:16:39'), lbl('Under iron', MUTE, { fontSize: cq(8.5) })),
            h('span', { style: { width: '1px', height: cq(34), background: 'rgba(255,255,255,0.14)' } }),
            h('span', { style: { display: 'flex', flexDirection: 'column', gap: cq(4) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(21) } }, p.hero ? '14,210' : '7,985'), lbl('Volume', MUTE, { fontSize: cq(8.5) }))),
          h('span', { style: { display: 'flex', alignItems: 'baseline', gap: cq(8) } }, lbl('Consistency', B, { fontSize: cq(8.5) }), h('span', { style: { fontFamily: DISP, fontSize: cq(13.5) } }, 'Another one down')),
          h('span', { style: { alignSelf: 'stretch', margin: cq(10) + ' ' + cq(8) + ' ' + cq(6), padding: '0 0 0 ' + cq(12), borderLeft: '2px solid ' + B, textAlign: 'left', fontFamily: DISP, fontSize: cq(14), lineHeight: 1.4, color: BB } }, 'Strength is a story told one rep at a time.'),
          h('span', { style: { position: 'relative', alignSelf: 'stretch', height: cq(50), borderRadius: cq(10), overflow: 'visible', transform: holding ? 'scale(0.975)' : 'none', transition: 'transform .12s' } },
            h('span', { style: { position: 'absolute', inset: 0, borderRadius: cq(10), overflow: 'hidden', background: '#16140F', border: '1px solid ' + (sealed ? 'rgba(205,160,99,0.6)' : 'rgba(255,255,255,0.16)') } },
              h('span', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: (sealed ? 100 : k * 100).toFixed(1) + '%', background: FILL } })),
            h('span', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: cq(8), fontSize: cq(12), fontWeight: 700, letterSpacing: '0.16em', color: sealed || k > 0.45 ? '#FBF6EC' : BB } }, sealed ? '✓  SEALED' : holding ? 'SEALING…' : 'HOLD TO SEAL'),
            dot),
          sealed ? h('span', { style: S({ fontSize: cq(12.5), color: MUTE }, rise(t, P1 + 250)) }, 'Added to Chapter II. It can’t be undone.') : h('span', { style: { fontSize: cq(10), fontWeight: 700, letterSpacing: '0.14em', color: B } }, 'VIEW DETAILS')));
    }

    /* ── Build a program ── */
    function Build(p) {
      const L = 17600, [t, ref] = useClock(L, 14200);
      const A1 = 1500, SB = 2200, A2 = 4200, SC = 5000, PH = [5500, 5900, 6300], A3 = 7700, SD = 8400, SE = 11200, A4 = 15000;
      const sc = t < SB ? 0 : t < SC ? 1 : t < SD ? 2 : t < SE ? 3 : 4;
      const sIn = a => { const k = ez(cl((t - a) / 340)); return { opacity: k, transform: 'translateX(' + ((1 - k) * 7).toFixed(2) + '%)' }; };
      const wrap = (a, kids) => h('div', { style: S({ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }, a ? sIn(a) : null) }, kids);
      const top = (glyph, title) => h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(10) + ' ' + cq(18), borderBottom: '1px solid ' + LINE } }, h('span', { style: { fontSize: cq(20), lineHeight: 1, color: INK, width: cq(16) } }, glyph), h('span', { style: { fontFamily: DISP, fontSize: cq(16), fontWeight: 600 } }, title));
      let body;
      if (sc === 0) {
        body = wrap(0, [
          h('div', { key: 'h', style: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: cq(10) + ' ' + cq(18) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(20), fontWeight: 600 } }, 'Workouts'), h('span', { style: { fontSize: cq(22), color: B } }, '+')),
          h('div', { key: 's', style: { flex: 'none', margin: '0 ' + cq(16), padding: cq(3), borderRadius: cq(10), background: '#15130F', border: '1px solid ' + LINE, display: 'grid', gridTemplateColumns: '1fr 1fr' } }, h('span', { style: { height: cq(32), borderRadius: cq(8), background: '#2A241C', border: '1px solid rgba(191,143,79,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(12.5), fontWeight: 600 } }, 'My Workouts'), h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(12.5), color: MUTE } }, 'Discover')),
          h('div', { key: 'b', style: { flex: 'none', padding: cq(26) + ' ' + cq(18) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(10) } },
            lbl('No active program'), h('span', { style: { fontFamily: DISP, fontSize: cq(27), fontWeight: 600, lineHeight: 1.1 } }, 'Build What’s Next'),
            h('span', { style: { fontSize: cq(13), lineHeight: 1.45, color: MUTE } }, 'Create your own program, or let Forge find one built for your goals.'),
            h('div', { style: { display: 'flex', gap: cq(10), marginTop: cq(8) } }, btn(['Build My Own', tapDot(t, A1)], { transform: pressT(t, A1), textTransform: 'none', letterSpacing: 0, fontSize: cq(13.5) }), btn2('Find Me One', { textTransform: 'none', letterSpacing: 0, fontSize: cq(13.5) }))),
          h('div', { key: 'l', style: { flex: 'none', padding: cq(28) + ' ' + cq(16) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(8) } }, lbl('Your library', MUTE, { padding: '0 ' + cq(2) }),
            ['Programs', 'Workout Templates'].map(s => h('span', { key: s, style: { height: cq(54), padding: '0 ' + cq(16), borderRadius: cq(12), background: CARD, border: '1px solid ' + LINE, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: cq(14) } }, s, h('span', { style: { color: MUTE } }, '›')))),
          h('div', { key: 'sp', style: { flex: 1 } }),
          h('div', { key: 'tb', style: { flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: cq(10) + ' 0 ' + cq(26), borderTop: '1px solid ' + LINE, background: '#0E0D0B' } },
            [['home', 'Home'], ['barbell', 'Workouts'], ['book', 'Legacy'], ['squad', 'Squads']].map(x => h('span', { key: x[1], style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: cq(4), fontSize: cq(10), color: x[1] === 'Workouts' ? B : DIM } }, ic(x[0], 16), x[1])))]);
      } else if (sc === 1) {
        const opt = (g, ti, d, at) => h('span', { key: ti, style: { position: 'relative', display: 'flex', alignItems: 'center', gap: cq(14), padding: cq(16), borderRadius: cq(14), background: t >= (at || 1e9) - 100 && t < (at || 0) + 400 ? '#1C1914' : CARD, border: '1px solid ' + (at && t >= at - 100 ? 'rgba(191,143,79,0.55)' : LINE), transform: at ? pressT(t, at) : 'none' } },
          h('span', { style: { width: cq(42), height: cq(42), flex: 'none', borderRadius: cq(10), background: '#1E1B17', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(17), color: g === '⟷' ? B : MUTE } }, g),
          h('span', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(4) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(16), fontWeight: 600 } }, ti), h('span', { style: { fontSize: cq(11.5), lineHeight: 1.4, color: MUTE } }, d)),
          h('span', { style: { color: MUTE } }, '›'), at ? tapDot(t, at) : null);
        body = wrap(SB, [top('×', 'Build a Program'),
          h('div', { key: 'c', style: { flex: 1, padding: cq(26) + ' ' + cq(16), display: 'flex', flexDirection: 'column', gap: cq(12) } },
            h('span', { style: { alignSelf: 'center', width: cq(30), height: '1.5px', background: B } }),
            h('span', { style: { textAlign: 'center', fontFamily: DISP, fontSize: cq(23), fontWeight: 600 } }, 'How do you want to start?'),
            h('span', { style: { textAlign: 'center', fontSize: cq(12.5), color: MUTE, marginBottom: cq(10) } }, 'Choose the option that works best for you.'),
            opt('≡', 'Paste a program', 'Paste a written workout or upload a PDF and Forge will build it for you.'),
            opt('◎', 'Upload pictures', 'Screenshots or photos of a program. Forge will convert them.', A2),
            opt('⟷', 'Build from scratch', 'Answer a few questions and Forge will help build your program.'))]);
      } else if (sc === 2) {
        const days = [['DAY 1 · UPPER', 'Bench 4×6', 'Row 4×8', 'OHP 3×10'], ['DAY 2 · LOWER', 'Squat 4×5', 'RDL 3×8', 'Lunge 3×10'], ['DAY 3 · UPPER', 'Incline 4×8', 'Pull-up 4×6', 'Dips 3×12']];
        const ready = t >= PH[2] + 400;
        body = wrap(SC, [top('‹', 'Upload pictures'),
          h('div', { key: 'c', style: { flex: 1, padding: cq(22) + ' ' + cq(16), display: 'flex', flexDirection: 'column', gap: cq(14) } },
            h('span', { style: { fontFamily: DISP, fontSize: cq(21), fontWeight: 600 } }, 'Add your plan'),
            h('span', { style: { fontSize: cq(12.5), lineHeight: 1.45, color: MUTE } }, 'Screenshots, photos of a notebook, or a whiteboard. Add as many as you need.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: cq(10), marginTop: cq(6) } },
              days.map((d, i) => h('span', { key: i, style: S({ position: 'relative', aspectRatio: '3/4', padding: cq(9), borderRadius: cq(8), background: 'linear-gradient(170deg,#EDE5D4 0%,#DCD1BC 100%)', color: '#2A241C', display: 'flex', flexDirection: 'column', gap: cq(5), boxShadow: '0 6px 16px rgba(0,0,0,0.4)' }, rise(t, PH[i], 300, 14)) },
                h('span', { style: { fontSize: cq(7.5), fontWeight: 700, letterSpacing: '0.08em' } }, d[0]), ...d.slice(1).map(s => h('span', { key: s, style: { fontSize: cq(9), fontStyle: 'italic', fontFamily: DISP } }, s)),
                h('span', { style: { position: 'absolute', top: cq(-6), right: cq(-6), width: cq(20), height: cq(20), borderRadius: '50%', background: FILL, border: '1px solid ' + BB, color: '#FBF6EC', fontSize: cq(10), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '✓'))),
              h('span', { style: { aspectRatio: '3/4', borderRadius: cq(8), border: '1px dashed rgba(191,143,79,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(22), color: B } }, '+')),
            h('span', { style: S({ fontSize: cq(12), color: MUTE }, rise(t, PH[2] + 300)) }, '3 photos added')),
          h('div', { key: 'f', style: { flex: 'none', display: 'flex', padding: cq(12) + ' ' + cq(16) + ' ' + cq(30) } }, btn(['Build my program', tapDot(t, A3)], { opacity: ready ? 1 : 0.4, transform: pressT(t, A3) }))]);
      } else if (sc === 3) {
        const k = ez(cl((t - SD - 200) / 2400));
        const steps = ['3 training days found', '9 exercises matched', 'Filled in sets, reps and rest'];
        body = wrap(SD, [top('×', 'Build a Program'),
          h('div', { key: 'c', style: { flex: 1, padding: '0 ' + cq(30), display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: cq(16) } },
            lbl('Forge is reading your photos'), h('span', { style: { fontFamily: DISP, fontSize: cq(24), fontWeight: 600, lineHeight: 1.15 } }, 'Building your program'),
            h('div', { style: { height: cq(4), borderRadius: 3, background: 'rgba(255,255,255,0.08)' } }, h('div', { style: { width: (k * 100).toFixed(1) + '%', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#8C6838,#CDA063)' } })),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: cq(12), marginTop: cq(8) } }, steps.map((s, i) => h('span', { key: s, style: S({ display: 'flex', alignItems: 'center', gap: cq(10), fontSize: cq(14) }, rise(t, SD + 700 + i * 650)) }, h('span', { style: { width: cq(20), height: cq(20), borderRadius: '50%', border: '1.5px solid ' + B, color: B, fontSize: cq(10), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '✓'), s))))]);
      } else {
        const saved = t >= A4 + 150;
        const days = [['Day 1', 'Upper A', 'Bench · Row · OHP'], ['Day 2', 'Lower A', 'Squat · RDL · Lunge'], ['Day 3', 'Upper B', 'Incline · Pull-up · Dips']];
        body = wrap(SE, [top('×', 'Build a Program'),
          h('div', { key: 'c', style: { flex: 1, padding: cq(20) + ' ' + cq(16), display: 'flex', flexDirection: 'column', gap: cq(10) } },
            lbl(saved ? 'Saved to your programs' : 'Draft — not saved yet', saved ? B : MUTE),
            h('span', { style: { fontFamily: DISP, fontSize: cq(25), fontWeight: 600, lineHeight: 1.1 } }, '3-Day Upper / Lower'),
            h('span', { style: { fontSize: cq(12.5), color: MUTE, marginBottom: cq(8) } }, '3 days · 8 weeks · Built from your photos'),
            days.map((d, i) => h('span', { key: d[0], style: S({ display: 'flex', alignItems: 'center', gap: cq(14), padding: cq(14), borderRadius: cq(14), background: CARD, border: '1px solid ' + BL }, rise(t, SE + 400 + i * 220)) },
              h('span', { style: { display: 'flex', flexDirection: 'column', gap: cq(4), flex: 1, minWidth: 0 } }, lbl(d[0], B, { fontSize: cq(9.5) }), h('span', { style: { fontFamily: DISP, fontSize: cq(16), fontWeight: 600 } }, d[1]), h('span', { style: { fontSize: cq(12), color: MUTE } }, d[2])),
              h('span', { style: { fontSize: cq(11.5), color: MUTE } }, '3 lifts'), h('span', { style: { color: MUTE } }, '›'))),
            h('span', { style: S({ fontSize: cq(12), lineHeight: 1.45, color: MUTE, marginTop: cq(4) }, rise(t, SE + 1300)) }, 'Check anything Forge read wrong before you save.')),
          h('div', { key: 'f', style: S({ flex: 'none', display: 'flex', gap: cq(10), padding: cq(12) + ' ' + cq(16) + ' ' + cq(30) }, rise(t, SE + 1200)) },
            saved ? btn2('✓  Saved', { color: B, borderColor: 'rgba(191,143,79,0.45)' }) : btn(['Save program', tapDot(t, A4)], { transform: pressT(t, A4) }))]);
      }
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Building a program: tap Build My Own, choose Upload pictures, add three photos of a plan, and Forge builds the program from them' }, body);
    }

    /* ── Nutrition targets ── */
    function Nutrition(p) {
      const L = 13200, [t, ref] = useClock(L, 5400);
      const G = 1000, CA = 1350, CT = 2200, PL = 6700, US = 9800;
      const V1 = { cal: 2370, p: 196, c: 230, f: 74 }, V2 = { cal: 2120, p: 196, c: 172, f: 72 };
      const goal = t >= G, calc = t >= CA && t < CT, shown = t >= CT, used = t >= US + 150;
      const kUp = ez(cl((t - CT) / 1000)), kRe = ez(cl((t - PL - 150) / 700));
      const val = k => Math.round((V1[k] + (V2[k] - V1[k]) * kRe) * kUp);
      const cal = val('cal');
      const macros = [['Protein', 'p', 4, B], ['Carbs', 'c', 4, '#A8834F'], ['Fat', 'f', 9, '#86683F']];
      const tri = (lab, on, at) => h('span', { key: lab, style: { position: 'relative', height: cq(40), borderRadius: cq(10), background: on ? 'rgba(191,143,79,0.12)' : CARD, border: '1px solid ' + (on ? 'rgba(191,143,79,0.6)' : LINE), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(13), fontWeight: on ? 600 : 500, color: on ? BB : MUTE, transform: at ? pressT(t, at) : 'none' } }, lab, at ? tapDot(t, at) : null);
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Daily targets: pick Lose, Forge calculates 2,370 calories with protein, carbs and fat, then recalculates when the pace changes' },
        h('div', { style: { flex: 1, minHeight: 0, padding: cq(6) + ' ' + cq(18) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(10) } },
          h('span', { style: { fontSize: cq(22), lineHeight: 1, color: B } }, '‹'),
          lbl('Nutrition', B, { marginTop: cq(6) }),
          h('span', { style: { fontFamily: DISP, fontSize: cq(26), fontWeight: 600, marginTop: cq(-4) } }, 'Daily targets'),
          h('div', { style: { padding: cq(3), borderRadius: 999, background: '#15130F', border: '1px solid ' + LINE, display: 'grid', gridTemplateColumns: '1fr 1fr' } }, h('span', { style: { height: cq(34), borderRadius: 999, background: '#26221D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(12.5), fontWeight: 600 } }, 'Recommended'), h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(12.5), color: MUTE } }, 'Manual')),
          lbl('Based on', MUTE, { fontSize: cq(9.5), marginTop: cq(4) }),
          h('div', { style: { padding: cq(12) + ' ' + cq(14), borderRadius: cq(12), background: CARD, border: '1px solid ' + LINE, display: 'flex', alignItems: 'center', gap: cq(10) } }, h('span', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: cq(3) } }, h('span', { style: { fontSize: cq(13.5) } }, '32 · 5′10″ · Active'), h('span', { style: { fontSize: cq(11), color: DIM } }, '196.4 lb from your Sep 21 weigh-in')), h('span', { style: { fontSize: cq(12), color: B } }, 'Edit')),
          lbl('Goal', MUTE, { fontSize: cq(9.5), marginTop: cq(4) }),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: cq(8) } }, tri('Lose', goal, G), tri('Maintain', false), tri('Gain', false)),
          h('div', { style: S({ height: cq(46), padding: '0 ' + cq(12), borderRadius: cq(12), background: CARD, border: '1px solid ' + LINE, display: 'flex', alignItems: 'center', gap: cq(12) }, goal ? rise(t, G + 150) : { opacity: 0.35 }) },
            h('span', { style: { flex: 1, fontSize: cq(13), color: MUTE } }, 'Pace'), h('span', { style: { fontSize: cq(18), color: MUTE } }, '−'),
            h('span', { style: { padding: cq(6) + ' ' + cq(10), borderRadius: cq(8), background: '#0E0D0B', fontSize: cq(13), fontWeight: 600 } }, (t >= PL ? '1.5' : '1.0') + ' lb / week'),
            h('span', { style: { position: 'relative', width: cq(26), textAlign: 'center', fontSize: cq(18), color: t >= PL - 200 && t < PL + 400 ? BB : MUTE, transform: pressT(t, PL) } }, '+', tapDot(t, PL))),
          h('div', { style: { padding: cq(16), borderRadius: cq(16), background: 'linear-gradient(180deg,#1A1712 0%,#13110E 100%)', border: '1px solid ' + BL, display: 'flex', flexDirection: 'column', gap: cq(12), minHeight: cq(176) } },
            !goal ? h('span', { style: { margin: 'auto 0', fontSize: cq(13), lineHeight: 1.5, color: DIM } }, 'Pick a goal and Forge works out your calories and macros.')
              : calc ? h('span', { style: { margin: 'auto 0', display: 'flex', alignItems: 'center', gap: cq(10), fontSize: cq(13), color: MUTE } }, h('span', { style: { display: 'flex', gap: cq(4) } }, [0, 1, 2].map(i => h('span', { key: i, style: { width: cq(6), height: cq(6), borderRadius: '50%', background: B, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(t / 150 - i * 0.9)) } }))), 'Working out your targets')
              : [h('div', { key: 'c', style: { display: 'flex', alignItems: 'baseline', gap: cq(10) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(36), fontWeight: 600, lineHeight: 1 } }, cal.toLocaleString('en-US')), lbl('Calories / day', B, { fontSize: cq(9.5) })),
                ...macros.map((m, i) => { const g = val(m[1]); const share = V1[m[1]] * m[2] / V1.cal; const kb = ez(cl((t - CT - 300 - i * 180) / 600)); const sh = (V1[m[1]] + (V2[m[1]] - V1[m[1]]) * kRe) * m[2] / (V1.cal + (V2.cal - V1.cal) * kRe);
                  return h('div', { key: m[0], style: { display: 'grid', gridTemplateColumns: cq(58) + ' 1fr ' + cq(50), alignItems: 'center', gap: cq(10) } }, h('span', { style: { fontSize: cq(12), color: MUTE } }, m[0]), h('span', { style: { height: cq(6), borderRadius: 4, background: 'rgba(255,255,255,0.07)' } }, h('span', { style: { display: 'block', width: (cl(sh / 0.45) * 100 * kb).toFixed(1) + '%', height: '100%', borderRadius: 4, background: m[3] } })), h('span', { style: { textAlign: 'right', fontFamily: DISP, fontSize: cq(15) } }, g + ' g')); })])),
        h('div', { style: { flex: 'none', display: 'flex', flexDirection: 'column', gap: cq(8), padding: cq(12) + ' ' + cq(16) + ' ' + cq(26) } },
          used ? btn2('✓  Targets set', { flex: 'none', color: B, borderColor: 'rgba(191,143,79,0.45)' }) : btn(['Use these targets', tapDot(t, US)], { flex: 'none', opacity: shown ? 1 : 0.4, transform: pressT(t, US) }),
          h('span', { style: { textAlign: 'center', fontSize: cq(11), color: DIM } }, 'Effective today · Previous days remain unchanged.')));
    }

    /* ── Coach Holt shared ── */
    const holtHead = () => h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(10), padding: cq(8) + ' ' + cq(16) + ' ' + cq(12), borderBottom: '1px solid ' + LINE } },
      h('img', { src: R('assets/coach-holt-mark.png'), alt: '', style: { width: cq(40), height: cq(40), borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(191,143,79,0.5)', display: 'block' } }),
      h('span', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(3) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(18), fontWeight: 600, letterSpacing: '0.06em', color: B, whiteSpace: 'nowrap' } }, 'COACH HOLT'),
        h('span', { style: { display: 'flex', alignItems: 'center', gap: cq(5), fontSize: cq(9), fontWeight: 700, letterSpacing: '0.14em', color: MUTE } }, 'YOUR COACH', h('span', { style: { width: cq(5), height: cq(5), borderRadius: '50%', background: GREEN } }), 'READY')),
      h('span', { style: { fontSize: cq(20), color: MUTE } }, '+'), h('span', { style: { fontSize: cq(20), color: MUTE, marginLeft: cq(12) } }, '×'));
    const composer = (ph) => h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(8), padding: cq(10) + ' ' + cq(14) + ' ' + cq(28), borderTop: '1px solid ' + LINE } },
      h('span', { style: { flex: 1, height: cq(40), borderRadius: cq(20), background: '#171512', border: '1px solid rgba(255,255,255,0.08)', padding: '0 ' + cq(14), display: 'flex', alignItems: 'center', fontSize: cq(13.5), color: DIM } }, ph),
      h('span', { style: { width: cq(40), height: cq(40), borderRadius: '50%', background: '#24211C', color: DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(17), fontWeight: 700 } }, '↑'));
    const avatar = s => h('img', { src: R('assets/coach-holt-mark.png'), alt: '', style: { width: cq(s), height: cq(s), borderRadius: '50%', objectFit: 'cover', flex: 'none', border: '1px solid rgba(191,143,79,0.5)', display: 'block' } });
    const dots = t => h('span', { style: { display: 'flex', gap: cq(5), padding: cq(4) + ' 0' } }, [0, 1, 2].map(i => h('span', { key: i, style: { width: cq(7), height: cq(7), borderRadius: '50%', background: B, opacity: 0.3 + 0.7 * Math.max(0, Math.sin(t / 160 - i * 0.9)) } })));
    const userB = (t, k, at, text) => h('div', { key: k, style: S({ alignSelf: 'flex-end', flex: 'none', maxWidth: '78%', padding: cq(10) + ' ' + cq(14), borderRadius: cq(18) + ' ' + cq(18) + ' ' + cq(5) + ' ' + cq(18), background: FILL, color: '#FBF6EC', fontSize: cq(14.5), lineHeight: 1.4 }, rise(t, at)) }, text);
    const holtB = (t, k, at, ans, text) => { const w = text.split(' '); return h('div', { key: k, style: S({ display: 'flex', flex: 'none', alignItems: 'flex-end', gap: cq(8) }, rise(t, at)) }, avatar(26),
      h('div', { style: { maxWidth: '84%', padding: cq(11) + ' ' + cq(14), borderRadius: cq(18) + ' ' + cq(18) + ' ' + cq(18) + ' ' + cq(5), background: '#1A1815', border: '1px solid rgba(191,143,79,0.18)', fontSize: cq(14.5), lineHeight: 1.42, color: '#E6DED0' } }, t < ans ? dots(t) : w.slice(0, Math.min(w.length, Math.floor((t - ans) / 60) + 1)).join(' '))); };
    const chips = (t, k, at, list, pick, tapAt) => h('div', { key: k, style: S({ flex: 'none', display: 'flex', flexWrap: 'wrap', gap: cq(8), marginLeft: cq(34) }, rise(t, at)) },
      list.map(c => { const on = c === pick && t >= tapAt, off = c !== pick && t >= tapAt;
        return h('span', { key: c, style: { position: 'relative', padding: cq(8) + ' ' + cq(14), borderRadius: 999, background: on ? FILL : '#16140F', border: '1px solid ' + (on ? 'rgba(205,160,99,0.6)' : 'rgba(191,143,79,0.35)'), fontSize: cq(13), color: on ? '#FBF6EC' : off ? DIM : INK, opacity: off ? 0.5 : 1, transform: c === pick ? pressT(t, tapAt) : 'none' } }, c, c === pick ? tapDot(t, tapAt) : null); }));
    const chatCol = (kids, top) => h('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: top ? 'flex-start' : 'flex-end', gap: cq(10), padding: cq(14) + ' ' + cq(16), WebkitMaskImage: top ? 'none' : 'linear-gradient(180deg, transparent 0, #000 10%)', maskImage: top ? 'none' : 'linear-gradient(180deg, transparent 0, #000 10%)' } }, kids);

    /* ── Coach Holt: start ── */
    function HoltStart(p) {
      const L = 15000, [t, ref] = useClock(L, 12600);
      const TP = 1700, CH = 2250, U1 = 2300, D1 = 2700, A1 = 3500, C1 = 4050, T1 = 5100, U2 = 5450, D2 = 5800, A2 = 6600, C2 = 6950, T2 = 8100, U3 = 8450, D3 = 8800, A3 = 9600, BC = 10500;
      let content;
      if (t < CH) {
        const out = 1 - ez(cl((t - TP - 200) / 300));
        const card = (g, ti, d, at) => h('span', { key: ti, style: { position: 'relative', display: 'flex', flexDirection: 'column', gap: cq(6), padding: cq(12) + ' ' + cq(10), minHeight: cq(150), borderRadius: cq(12), background: CARD, border: '1px solid ' + (at && t >= at - 100 ? 'rgba(191,143,79,0.6)' : LINE), transform: at ? pressT(t, at) : 'none' } },
          lbl(g, B, { fontSize: cq(8.5) }), h('span', { style: { fontSize: cq(13), fontWeight: 600, lineHeight: 1.25 } }, ti), h('span', { style: { fontSize: cq(10.5), lineHeight: 1.4, color: MUTE } }, d), h('span', { style: { marginTop: 'auto', alignSelf: 'flex-end', color: B, fontSize: cq(13) } }, '→'), at ? tapDot(t, at) : null);
        content = h('div', { style: { flex: 1, minHeight: 0, padding: cq(22) + ' ' + cq(16), display: 'flex', flexDirection: 'column', gap: cq(10), opacity: out } },
          h('span', { style: { fontFamily: DISP, fontSize: cq(25), fontWeight: 600 } }, 'Good evening, Isa.'), h('span', { style: { fontSize: cq(13.5), color: MUTE, marginTop: cq(-4) } }, 'What are we working on?'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: cq(8), marginTop: cq(10) } }, card('Build', 'Build a program', 'Built around your goals and schedule.', TP), card('Today', 'What should I train?', 'A session from your recent training.'), card('Adjust', 'Change my program', 'Swap lifts, days or volume.')),
          ['I already have a program', 'Ask Holt something'].map(s => h('span', { key: s, style: { display: 'flex', justifyContent: 'space-between', padding: cq(14) + ' ' + cq(4), borderBottom: '1px solid ' + LINE, fontSize: cq(13.5) } }, s, h('span', { style: { color: MUTE } }, '›'))));
      } else {
        const m = [];
        m.push(userB(t, 'u1', U1, 'Build me a program'));
        if (t >= D1) m.push(holtB(t, 'a1', D1, A1, 'How many days a week can you train?'));
        if (t >= C1) m.push(chips(t, 'c1', C1, ['3', '4', '5', '6'], '5', T1));
        if (t >= U2) m.push(userB(t, 'u2', U2, '5 days'));
        if (t >= D2) m.push(holtB(t, 'a2', D2, A2, 'What’s this block for?'));
        if (t >= C2) m.push(chips(t, 'c2', C2, ['Strength', 'Muscle', 'General health', 'Run & lift'], 'General health', T2));
        if (t >= U3) m.push(userB(t, 'u3', U3, 'General health'));
        if (t >= D3) m.push(holtB(t, 'a3', D3, A3, 'Good. Five days a week for general health. Building your block now.'));
        if (t >= BC) { const k = ez(cl((t - BC - 200) / 2200)), done = k >= 1;
          m.push(h('div', { key: 'bc', style: S({ flex: 'none', marginLeft: cq(34), padding: cq(14), borderRadius: cq(14), background: '#16140F', border: '1px solid rgba(191,143,79,0.28)', display: 'flex', flexDirection: 'column', gap: cq(10) }, rise(t, BC)) },
            lbl(done ? 'Ready · 8-week block' : 'Building · 8-week block'), h('div', { style: { height: cq(4), borderRadius: 3, background: 'rgba(255,255,255,0.08)' } }, h('div', { style: { width: (k * 100).toFixed(1) + '%', height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#8C6838,#CDA063)' } })),
            h('span', { style: { fontSize: cq(12), color: MUTE } }, done ? 'Opening your draft' : 'Split, volume and exercises'))); }
        content = chatCol(m);
      }
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Coach Holt: tap Build a program, answer how many days and what the block is for, and Holt starts building it' }, holtHead(), content, composer('Ask Coach Holt anything…'));
    }

    /* ── Coach Holt: the built block ── */
    function HoltBuild(p) {
      const L = 13000, [t, ref] = useClock(L, 9200);
      const D = 300, A = 1100, CARD0 = 2200, ST = 2500, WK = 3500, EX = 4200, BT = 5400, SV = 7600;
      const saved = t >= SV + 150;
      const stats = [['8', 'Weeks'], ['5', 'Days / week'], ['General health', 'Goal'], ['Full gym', 'Equipment'], ['60 min', 'Session'], ['Advanced', 'Level']];
      const sess = [['A', 'Full Body A'], ['B', 'Easy Run'], ['C', 'Full Body B'], ['D', 'Easy Run'], ['E', 'Full Body C']];
      const open = t >= EX;
      const m = [holtB(t, 'a', D, A, 'Done. Here’s your block. 8 weeks, 5 days a week, built for what you’ve got.')];
      if (t >= CARD0) m.push(h('div', { key: 'card', style: S({ flex: 'none', padding: cq(14), borderRadius: cq(16), background: '#16140F', border: '1px solid rgba(191,143,79,' + (saved ? 0.55 : 0.28) + ')', display: 'flex', flexDirection: 'column', gap: cq(10), transition: 'border-color .3s' }, rise(t, CARD0)) },
        lbl(saved ? '✓ Saved · Week 1 starts Monday' : 'Draft — not saved yet', saved ? B : MUTE, { fontSize: cq(9.5) }),
        h('span', { style: { fontFamily: DISP, fontSize: cq(21), fontWeight: 600, lineHeight: 1.1 } }, '8-Week Run & Lift Block'),
        h('span', { style: { fontSize: cq(11.5), color: MUTE, marginTop: cq(-4) } }, '5 days · 8 weeks · General health'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: cq(10) + ' ' + cq(8), padding: cq(10) + ' 0', borderTop: '1px solid ' + LINE, borderBottom: '1px solid ' + LINE } },
          stats.map((s, i) => h('span', { key: s[1], style: S({ display: 'flex', flexDirection: 'column', gap: cq(3) }, rise(t, ST + i * 130, 280, 6)) }, h('span', { style: { fontFamily: DISP, fontSize: cq(s[0].length > 6 ? 13.5 : 17), lineHeight: 1.15 } }, s[0]), lbl(s[1], B, { fontSize: cq(8) })))),
        ['WK 1', 'WK 2', 'WK 3'].map((w, i) => h('div', { key: w, style: S({ display: 'flex', flexDirection: 'column' }, rise(t, WK + i * 140, 280, 6)) },
          h('span', { style: { display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(6) + ' 0', fontSize: cq(12.5) } }, lbl(w, B, { fontSize: cq(9), width: cq(34) }), h('span', { style: { flex: 1 } }, '5 sessions'), h('span', { style: { color: MUTE, transform: i === 0 && open ? 'rotate(180deg)' : 'none', transition: 'transform .3s' } }, '⌄')),
          i === 0 && open ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: cq(5), margin: cq(2) + ' 0 ' + cq(6) + ' ' + cq(12), paddingLeft: cq(12), borderLeft: '1px solid ' + LINE } },
            sess.map((s, j) => h('span', { key: s[0], style: S({ display: 'flex', gap: cq(10), fontSize: cq(12), color: '#CFC6B8' }, rise(t, EX + 100 + j * 110, 240, 4)) }, h('span', { style: { color: DIM, width: cq(10) } }, s[0]), s[1]))) : null)),
        h('div', { style: S({ display: 'flex', gap: cq(8), marginTop: cq(4) }, rise(t, BT)) },
          saved ? btn2('✓  Added to your programs', { height: cq(40), color: B, borderColor: 'rgba(191,143,79,0.45)', textTransform: 'none', letterSpacing: 0, fontSize: cq(13) })
            : [btn2('Change something', { key: 'c', height: cq(40), textTransform: 'none', letterSpacing: 0, fontSize: cq(12.5), color: '#C9C0B2' }), btn(['Save program', tapDot(t, SV)], { key: 's', height: cq(40), textTransform: 'none', letterSpacing: 0, fontSize: cq(12.5), transform: pressT(t, SV) })])));
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Coach Holt lays out a draft 8-week block with weeks and sessions, and it is saved only when you tap Save program' }, holtHead(), chatCol(m, true), composer('Tap an answer, or type it'));
    }

    /* ── shared: honor medals ── */
    const medal = (m, s, x) => {
      const A = window.ForgeHonorArt; let el = null;
      try { el = A ? A.create(React, Object.assign({ id: m.mark, tier: 2 }, m), { face: 'struck', size: 64, style: { width: '100%', height: '100%', display: 'block' } }) : null; } catch (e) { el = null; }
      return h('span', { style: S({ position: 'relative', width: cq(s), height: cq(s), flex: 'none', borderRadius: '50%', background: 'radial-gradient(circle at 50% 35%, #2A231A 0%, #110F0C 75%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(191,143,79,0.35)', display: 'flex', padding: cq(s * 0.04) }, x) }, el);
    };
    const M = { bench: { name: 'Bench 225', cat: 'strength', mark: 'str-bench', ex: '225' }, squat: { name: 'Squat 225', cat: 'strength', mark: 'str-squat', ex: '225' }, dead: { name: 'Deadlift 315', cat: 'strength', mark: 'str-dead', ex: '315' }, goal: { name: 'First Goal', cat: 'goals', mark: 'goal-struck' }, seal: { name: 'Chapter sealed', cat: 'chapters', mark: 'chp-seal', tier: 3 }, held: { name: '10 Workouts in a Chapter', cat: 'chapters', mark: 'chp-held', ex: 'X' } };
    const medCell = (m, s, cap, sub, x) => h('span', { key: cap, style: S({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: cq(6), textAlign: 'center', minWidth: 0 }, x) }, medal(m, s), h('span', { style: { fontSize: cq(10.5), lineHeight: 1.25, color: INK } }, cap), h('span', { style: { fontSize: cq(9), color: DIM } }, sub));
    const backHead = (title, sub, right) => h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(8) + ' ' + cq(18) + ' ' + cq(12), borderBottom: '1px solid ' + LINE } }, h('span', { style: { fontSize: cq(24), lineHeight: 1, color: INK } }, '‹'),
      h('span', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(2) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(17), fontWeight: 600, whiteSpace: 'nowrap' } }, title), sub ? h('span', { style: { fontSize: cq(11), color: MUTE } }, sub) : null), right || null);
    const glyphDisc = (txt, s) => h('span', { style: { width: cq(s), height: cq(s), flex: 'none', borderRadius: '50%', background: '#1E1B17', border: '1px solid rgba(191,143,79,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(s * 0.36), fontWeight: 700, letterSpacing: '0.04em', color: BB } }, txt);

    /* ── Honor earned ── */
    function Honor(p) {
      const L = 11800, [t, ref] = useClock(L, 4300);
      const CK = 900, OV = 1500, MD = 2000, CT = 5300, HS = 5800;
      const d = t >= CK, hs = t >= HS;
      const ov = t >= OV && t < CT + 600 ? ez(cl((t - OV) / 400)) * (1 - ez(cl((t - CT - 150) / 350))) : 0;
      const mk = ez(cl((t - MD) / 520)), flash = cl((t - MD - 350) / 1000);
      let base;
      if (!hs) {
        const row = (n, done, tapAt) => h('div', { key: n, style: { display: 'flex', alignItems: 'center', gap: cq(12), height: cq(52), padding: '0 ' + cq(12), borderRadius: cq(12), background: done ? GBG : 'rgba(191,143,79,0.06)', border: '1px solid ' + (done ? GL : 'rgba(191,143,79,0.5)'), transition: 'background .3s, border-color .3s' } },
          h('span', { style: { width: cq(24), height: cq(24), borderRadius: '50%', border: '1.5px solid ' + (done ? GREEN : B), color: done ? GREEN : B, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(12) } }, n),
          h('span', { style: { flex: 1, fontFamily: DISP, fontSize: cq(16) } }, '225 lb × 5'),
          h('span', { style: { position: 'relative', width: cq(30), height: cq(30), borderRadius: '50%', border: '1.5px solid ' + (done ? GREEN : B), background: done ? 'rgba(111,174,123,0.22)' : 'transparent', color: done ? GREEN : B, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(14), fontWeight: 700, transform: tapAt ? pressT(t, tapAt) : 'none' } }, '✓', tapAt ? tapDot(t, tapAt) : null));
        base = [h('div', { key: 'h', style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(8) + ' ' + cq(18) } }, h('span', { style: { fontSize: cq(24), lineHeight: 1 } }, '‹'), h('span', { style: { flex: 1, fontFamily: DISP, fontSize: cq(17), fontWeight: 600 } }, 'Freestyle Workout')),
          h('div', { key: 'c', style: { margin: cq(12) + ' ' + cq(14) + ' 0', padding: cq(14), borderRadius: cq(16), background: CARD, border: '1px solid rgba(191,143,79,0.3)', display: 'flex', flexDirection: 'column', gap: cq(10) } },
            h('span', { style: { fontFamily: DISP, fontSize: cq(20), fontWeight: 600 } }, 'Barbell Bench Press'), lbl('Goal · 225 × 5', B, { fontSize: cq(9.5), marginBottom: cq(4) }),
            row(1, true), row(2, true), row(3, d, d ? 0 : CK))];
      } else {
        const shift = ez(cl((t - HS - 150) / 480)), pk = ez(cl((t - HS - 350) / 520)), pulse = cl((t - HS - 700) / 1100);
        const gapQ = 8, tx = 'translateX(calc(' + (-(1 - shift) * 100).toFixed(1) + '% - ' + ((1 - shift) * gapQ / 3.93).toFixed(3) + 'cqw))';
        const slot = { flex: '0 0 calc((100% - ' + cq(gapQ * 3) + ') / 4)' };
        const sec = (name, count, kids) => h('div', { key: name, style: { display: 'flex', flexDirection: 'column', gap: cq(12), padding: cq(16) + ' ' + cq(16) + ' 0' } }, h('span', { style: { display: 'flex', justifyContent: 'space-between' } }, lbl(name, B, { fontSize: cq(9.5) }), h('span', { style: { fontSize: cq(11), color: DIM } }, count)), h('div', { style: { display: 'flex', gap: cq(gapQ), overflow: 'hidden' } }, kids));
        base = [backHead('Honors', '36 honors'),
          sec('Recent', '', [
            h('span', { key: 'new', style: S({ position: 'relative', display: 'flex', justifyContent: 'center' }, slot) },
              h('span', { style: { position: 'absolute', top: 0, left: '50%', width: cq(60), height: cq(60), marginLeft: cq(-30), borderRadius: '50%', border: '1.5px solid ' + BB, opacity: t > HS + 700 ? (1 - pulse).toFixed(3) : 0, transform: 'scale(' + (1 + 0.7 * ez(pulse)).toFixed(3) + ')' } }),
              medCell(M.bench, 60, 'Bench 225', 'Sep 23', { opacity: pk, transform: 'scale(' + (0.6 + 0.4 * pk).toFixed(3) + ')' })),
            ...[[M.squat, 'Squat 225', 'Sep 21'], [M.goal, 'First Goal', 'Sep 12'], [M.held, '10 Workouts', 'Aug 30'], [M.dead, 'Deadlift 315', 'Aug 22']].map(x => h('span', { key: x[1], style: S({ display: 'flex', justifyContent: 'center', transform: tx }, slot) }, medCell(x[0], 60, x[1], x[2])))]),
          sec('Strength', '9', [[M.bench, 'Bench 225', 'Sep 23'], [M.squat, 'Squat 225', 'Sep 21'], [M.dead, 'Deadlift 315', 'Aug 22'], [M.bench, 'Bench 185', 'Jul 30']].map(x => h('span', { key: x[1], style: S({ display: 'flex', justifyContent: 'center' }, slot) }, medCell(x[0], 60, x[1], x[2])))),
          sec('Chapters', '4', [[M.held, '10 Workouts', 'Aug 30'], [M.seal, 'Chapter I', 'Aug 14'], [M.held, '25 Workouts', 'Aug 2'], [M.goal, 'First Goal', 'Jul 12']].map(x => h('span', { key: x[1], style: S({ display: 'flex', justifyContent: 'center' }, slot) }, medCell(x[0], 60, x[1], x[2]))))];
      }
      return frame({ t, L, fref: ref, radius: p.radius, label: 'An honor is earned: the last set of bench is checked, the Bench 225 medal is struck, and it lands first in Recent honors' },
        h('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }, base),
        ov > 0.01 ? h('div', { style: { position: 'absolute', inset: 0, zIndex: 10, background: 'radial-gradient(80% 50% at 50% 38%, rgba(40,31,20,' + (0.97 * ov).toFixed(3) + ') 0%, rgba(8,7,6,' + (0.97 * ov).toFixed(3) + ') 75%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: cq(12), padding: '0 ' + cq(34), textAlign: 'center', opacity: ov } },
          h('span', { style: rise(t, 1800) }, lbl('Honor earned')),
          h('div', { style: { position: 'relative', width: cq(150), height: cq(150), margin: cq(10) + ' 0' } },
            t > MD + 350 ? h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid ' + BB, opacity: (1 - flash).toFixed(3), transform: 'scale(' + (1 + 0.6 * ez(flash)).toFixed(3) + ')' } }) : null,
            medal(M.bench, 150, { opacity: mk, transform: 'scale(' + (1.35 - 0.35 * mk).toFixed(3) + ')', boxShadow: '0 0 ' + cq(60) + ' rgba(191,143,79,' + (0.55 * mk * (1 - 0.45 * flash)).toFixed(3) + '), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(191,143,79,0.5)' })),
          h('span', { style: S({ fontFamily: DISP, fontSize: cq(30), fontWeight: 600 }, rise(t, 2700)) }, 'Bench 225'),
          h('span', { style: rise(t, 2900) }, lbl('Strength · Sep 23', MUTE, { fontSize: cq(9.5) })),
          h('span', { style: S({ fontSize: cq(13.5), lineHeight: 1.5, color: MUTE }, rise(t, 3200)) }, '225 lb for a full set of five. Kept in Chapter II, The Real Cut.'),
          h('div', { style: S({ alignSelf: 'stretch', display: 'flex', marginTop: cq(16) }, rise(t, 3600)) }, btn(['Continue', tapDot(t, CT)], { transform: pressT(t, CT) }))) : null);
    }

    /* ── Close a chapter ── */
    function Chapter(p) {
      const L = 15500, [t, ref] = useClock(L, 12000);
      const TXT = 'Cut from 204 to 190 and kept my bench. Proof I can finish what I start.';
      const TY = 1000, CH = 38, TE = TY + TXT.length * CH, CB = TE + 550, MO = CB + 300, CS = MO + 2100, SL = CS + 450;
      const typed = t < TY ? '' : TXT.slice(0, Math.min(TXT.length, Math.floor((t - TY) / CH)));
      const typing = t >= TY && t < CB, sealed = t >= SL;
      const mo = t >= MO ? ez(cl((t - MO) / 300)) * (1 - ez(cl((t - CS - 150) / 300))) : 0;
      const sk = ez(cl((t - SL) / 340)), sp = cl((t - SL - 250) / 1100);
      const stat = (v, l) => h('span', { key: l, style: { display: 'flex', flexDirection: 'column', gap: cq(4) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(20) } }, v), lbl(l, MUTE, { fontSize: cq(8.5) }));
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Closing a chapter: write what it meant, tap Close chapter, confirm, and the chapter is sealed' },
        backHead('Chapter II'),
        h('div', { style: { flex: 1, minHeight: 0, padding: cq(18) + ' ' + cq(18) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(12) } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(12) } },
            h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(8) } }, lbl('Chapter II'), h('span', { style: { fontFamily: DISP, fontSize: cq(28), fontWeight: 600, lineHeight: 1.05 } }, 'The Real Cut'),
              h('span', { style: { display: 'flex', alignItems: 'center', gap: cq(8) } }, sealed ? lbl('✓ Sealed', B, { fontSize: cq(9.5) }) : lbl('● Open', GREEN, { fontSize: cq(9.5) }), h('span', { style: { fontSize: cq(11.5), color: DIM } }, sealed ? 'Sealed Sep 24, 2026' : 'Since Jun 2, 2026'))),
            h('div', { style: { position: 'relative', width: cq(66), height: cq(66), flex: 'none' } },
              sealed ? h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid ' + BB, opacity: (1 - sp).toFixed(3), transform: 'scale(' + (1 + 0.8 * ez(sp)).toFixed(3) + ')' } }) : null,
              sealed ? medal(M.seal, 66, { opacity: sk, transform: 'scale(' + (1.8 - 0.8 * sk).toFixed(3) + ')', boxShadow: '0 0 ' + cq(30) + ' rgba(191,143,79,' + (0.45 * (1 - 0.5 * sp)).toFixed(3) + '), 0 0 0 1px rgba(191,143,79,0.55)' }) : h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.14)' } }))),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: cq(8), padding: cq(14), borderRadius: cq(14), background: CARD, border: '1px solid ' + LINE } }, stat('42', 'Workouts'), stat('6', 'Honors'), stat('1 / 2', 'Goals met')),
          lbl('Reflection', MUTE, { fontSize: cq(9.5), marginTop: cq(6) }),
          h('div', { style: { minHeight: cq(128), padding: cq(16), borderRadius: cq(14), background: sealed ? '#16130F' : CARD, border: '1px solid ' + (typing ? 'rgba(191,143,79,0.5)' : sealed ? 'rgba(191,143,79,0.3)' : LINE), display: 'flex', flexDirection: 'column', gap: cq(12), transition: 'border-color .3s, background .3s' } },
            sealed ? h('span', { style: { color: B, fontFamily: DISP, fontSize: cq(20), lineHeight: 0.6 } }, '“') : null,
            h('span', { style: { fontFamily: DISP, fontSize: cq(15.5), lineHeight: 1.45, color: typed ? INK : DIM } }, typed || 'What did this chapter mean?', typing && typed && (t >= TE ? Math.floor(t / 420) % 2 === 0 : true) ? h('span', { style: { display: 'inline-block', width: '1.5px', height: cq(16), marginLeft: '1px', verticalAlign: 'middle', background: B } }) : null),
            sealed ? h('span', { style: rise(t, SL + 200) }, lbl('Written · Sealed Sep 24, 2026', MUTE, { fontSize: cq(9) })) : null),
          h('span', { style: { fontSize: cq(11.5), color: DIM } }, 'History can be added to, never rewritten.')),
        h('div', { style: { flex: 'none', display: 'flex', padding: cq(12) + ' ' + cq(16) + ' ' + cq(30) } },
          sealed ? btn2('✓  Chapter sealed', { color: B, borderColor: 'rgba(191,143,79,0.45)' }) : btn(['Close chapter', tapDot(t, CB)], { opacity: t >= TE ? 1 : 0.4, transform: pressT(t, CB) })),
        mo > 0.01 ? h('div', { style: { position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(6,5,4,' + (0.62 * mo).toFixed(3) + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 ' + cq(26) } },
          h('div', { style: { width: '100%', padding: cq(22) + ' ' + cq(20) + ' ' + cq(18), borderRadius: cq(20), background: '#15130F', border: '1px solid rgba(191,143,79,0.32)', boxShadow: '0 24px 60px rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column', gap: cq(10), opacity: mo, transform: 'scale(' + (0.95 + 0.05 * mo).toFixed(3) + ')' } },
            lbl('Close chapter'), h('span', { style: { fontFamily: DISP, fontSize: cq(22), fontWeight: 600 } }, 'Seal The Real Cut?'),
            h('span', { style: { fontSize: cq(13), lineHeight: 1.5, color: MUTE } }, 'Once it’s sealed, nothing in it can be changed. You can still add photos and notes.'),
            h('div', { style: { display: 'flex', gap: cq(10), marginTop: cq(10) } }, btn2('Not yet', { height: cq(42), textTransform: 'none', letterSpacing: 0, fontSize: cq(13) }), btn(['Close & seal', tapDot(t, CS)], { height: cq(42), textTransform: 'none', letterSpacing: 0, fontSize: cq(13), transform: pressT(t, CS) })))) : null);
    }

    /* ── Log food ── */
    function FoodLog(p) {
      const L = 14800, [t, ref] = useClock(L, 11200), MEAL = p.hero ? 'Breakfast' : 'Snack';
      const LG = 1100, SO = 1300, TY = 1900, Q = 'greek yog', RS = 2600, PK = 3500, PL = 4700, AD = 5800, SC = 6000, UP = 6300;
      const sheet = t >= SO && t < SC + 450 ? ez(cl((t - SO) / 380)) * (1 - ez(cl((t - SC) / 380))) : 0;
      const k = ez(cl((t - UP) / 900));
      const base = p.hero ? { cal: 310, p: 12, c: 58, f: 5 } : { cal: 1625, p: 107, c: 166, f: 53 }, add = { cal: 225, p: 35, c: 14, f: 5 }, goal = { cal: 2500, p: 190, c: 250, f: 80 };
      const v = key => Math.round(base[key] + add[key] * k);
      const ring = (s, frac, sw, col) => { const r = 50 - sw / 2, C2 = 2 * Math.PI * r; return h('svg', { viewBox: '0 0 100 100', style: { position: 'absolute', inset: 0, width: '100%', height: '100%' } },
        h('circle', { cx: 50, cy: 50, r, fill: 'none', stroke: 'rgba(255,255,255,0.08)', strokeWidth: sw }),
        h('circle', { cx: 50, cy: 50, r, fill: 'none', stroke: col, strokeWidth: sw, strokeLinecap: 'round', strokeDasharray: C2.toFixed(2), strokeDashoffset: (C2 * (1 - cl(frac))).toFixed(2), transform: 'rotate(-90 50 50)' })); };
      const small = (key, name, col) => h('span', { key: name, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: cq(6) } },
        h('span', { style: { position: 'relative', width: cq(70), height: cq(70), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } }, ring(70, v(key) / goal[key], 7, col), h('span', { style: { fontFamily: DISP, fontSize: cq(16) } }, v(key) + 'g'), h('span', { style: { fontSize: cq(9), color: MUTE } }, name)),
        h('span', { style: { fontSize: cq(9.5), color: DIM } }, Math.round(v(key) / goal[key] * 100) + '% of ' + goal[key] + 'g'));
      const meal = (n, food, cal, x) => h('div', { key: n, style: S({ display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(10) + ' ' + cq(12), borderRadius: cq(12), background: CARD, border: '1px solid ' + LINE }, x) }, h('span', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(2) } }, h('span', { style: { fontSize: cq(13), fontWeight: 600 } }, n), h('span', { style: { fontSize: cq(11), color: MUTE } }, food)), h('span', { style: { fontSize: cq(12), color: B } }, cal + ' cal'));
      const inDetail = t >= PK + 250, serv = t >= PL ? 1.5 : 1, sk = ez(cl((t - PL) / 400));
      const results = [['Greek Yogurt, Plain', '1 cup · 150 cal'], ['Greek Yogurt, Vanilla', '1 cup · 190 cal'], ['Greek Yogurt Bar', '1 bar · 110 cal']];
      const typed = t < TY ? '' : Q.slice(0, Math.min(Q.length, Math.floor((t - TY) / 70)));
      const toast = t >= SC + 250 && t < SC + 3200 ? Math.min(ez(cl((t - SC - 250) / 300)), 1 - ez(cl((t - SC - 2900) / 300))) : 0;
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Logging food: search for greek yogurt, pick it, change the serving to one and a half cups, add it, and the calorie and macro rings fill' },
        h('div', { style: { flex: 1, minHeight: 0, padding: cq(4) + ' ' + cq(16) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(10) } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(10) } }, h('img', { src: R('assets/welcome-logo-carved.png'), alt: '', style: { width: cq(24), height: cq(24), objectFit: 'contain' } }), h('span', { style: { flex: 1, fontFamily: DISP, fontSize: cq(21), fontWeight: 600 } }, 'Nutrition')),
          h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' } }, h('span', { style: { display: 'flex', flexDirection: 'column', gap: cq(2) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(17) } }, 'Today'), h('span', { style: { fontSize: cq(11), color: MUTE } }, p.hero ? 'Sep 25, 2026' : 'Sep 16, 2026')), h('span', { style: { fontSize: cq(11.5), color: B } }, 'See Details ›')),
          h('div', { style: { position: 'relative', alignSelf: 'center', width: cq(168), height: cq(168), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: cq(2) } }, ring(168, v('cal') / goal.cal, 6, 'url(#flcal)'),
            h('svg', { width: 0, height: 0, style: { position: 'absolute' } }, h('defs', null, h('linearGradient', { id: 'flcal', x1: 0, y1: 0, x2: 1, y2: 1 }, h('stop', { offset: '0%', stopColor: '#8C6838' }), h('stop', { offset: '100%', stopColor: BB })))),
            h('span', { style: { fontFamily: DISP, fontSize: cq(32) } }, v('cal').toLocaleString('en-US')), h('span', { style: { fontSize: cq(13), color: INK } }, 'calories'), h('span', { style: { fontSize: cq(10.5), color: DIM } }, 'of 2,500')),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' } }, small('p', 'Protein', '#6FAE7B'), small('c', 'Carbs', B), small('f', 'Fat', '#C98A5E')),
          btn(['+  Log Food', tapDot(t, LG)], { flex: 'none', textTransform: 'none', letterSpacing: 0, fontFamily: DISP, fontSize: cq(16), fontWeight: 500, background: 'linear-gradient(180deg,#3A2E1E 0%,#2A2117 100%)', color: INK, transform: pressT(t, LG) }),
          h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: cq(4) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(16) } }, 'Today’s Meals'), h('span', { style: { fontSize: cq(11.5), color: B } }, 'View All ›')),
          t >= UP + 250 ? meal(MEAL, 'Greek Yogurt, Plain · 1.5 cups', 225, rise(t, UP + 250)) : null,
          ...(p.hero ? [meal('Pre-workout', 'Banana, oats', 310)] : [meal('Breakfast', 'Protein Oatmeal', 540), meal('Lunch', 'Chicken Burrito Bowl', 620)])),
        toast > 0.01 ? h('div', { style: { position: 'absolute', top: cq(44), left: cq(18), right: cq(18), zIndex: 12, display: 'flex', alignItems: 'center', gap: cq(10), padding: cq(12) + ' ' + cq(14), borderRadius: cq(12), background: '#1C1914', border: '1px solid rgba(191,143,79,0.4)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', fontSize: cq(13), opacity: toast, transform: 'translateY(' + ((1 - toast) * -8).toFixed(1) + 'px)' } }, h('span', { style: { color: B, fontWeight: 700 } }, '✓'), 'Added to ' + MEAL + ' · 225 cal') : null,
        sheet > 0.01 ? h('div', { style: { position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,' + (0.5 * sheet).toFixed(3) + ')' } },
          h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '80%', borderRadius: cq(22) + ' ' + cq(22) + ' 0 0', background: '#14120F', borderTop: '1px solid rgba(191,143,79,0.25)', transform: 'translateY(' + ((1 - sheet) * 100).toFixed(1) + '%)', display: 'flex', flexDirection: 'column', gap: cq(12), padding: cq(10) + ' ' + cq(16) + ' ' + cq(28) } },
            h('span', { style: { alignSelf: 'center', width: cq(38), height: cq(4), borderRadius: 3, background: 'rgba(255,255,255,0.18)' } }),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, h('span', { style: { fontFamily: DISP, fontSize: cq(20), fontWeight: 600 } }, 'Log Food'), h('span', { style: { padding: cq(4) + ' ' + cq(10), borderRadius: 999, border: '1px solid rgba(191,143,79,0.4)', fontSize: cq(11), color: B } }, MEAL)),
            h('div', { style: { padding: cq(3), borderRadius: cq(10), background: '#0E0D0B', border: '1px solid ' + LINE, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' } }, ['Search', 'Scan', 'My Foods'].map((s, i) => h('span', { key: s, style: { height: cq(30), borderRadius: cq(8), background: i === 0 ? '#26221D' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(12), fontWeight: i === 0 ? 600 : 500, color: i === 0 ? INK : MUTE } }, s))),
            inDetail ? h('div', { style: S({ display: 'flex', flexDirection: 'column', gap: cq(14), flex: 1 }, sIn2(t, PK + 250)) },
                h('span', { style: { fontFamily: DISP, fontSize: cq(20), fontWeight: 600 } }, 'Greek Yogurt, Plain'),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(12), height: cq(48), padding: '0 ' + cq(12), borderRadius: cq(12), background: CARD, border: '1px solid ' + LINE } }, h('span', { style: { flex: 1, fontSize: cq(13), color: MUTE } }, 'Serving'), h('span', { style: { fontSize: cq(18), color: MUTE } }, '−'), h('span', { style: { minWidth: cq(76), textAlign: 'center', padding: cq(6) + ' ' + cq(10), borderRadius: cq(8), background: '#0E0D0B', fontSize: cq(13), fontWeight: 600 } }, serv === 1 ? '1 cup' : '1.5 cups'), h('span', { style: { position: 'relative', width: cq(26), textAlign: 'center', fontSize: cq(18), color: t >= PL - 200 && t < PL + 400 ? BB : MUTE, transform: pressT(t, PL) } }, '+', tapDot(t, PL))),
                h('div', { style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: cq(8), padding: cq(14), borderRadius: cq(14), background: CARD, border: '1px solid ' + BL } },
                  [['Calories', 150, 225, ''], ['Protein', 23, 35, 'g'], ['Carbs', 9, 14, 'g'], ['Fat', 3, 5, 'g']].map(m => h('span', { key: m[0], style: { display: 'flex', flexDirection: 'column', gap: cq(4) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(m[3] ? 17 : 24) } }, Math.round(m[1] + (m[2] - m[1]) * sk) + m[3]), lbl(m[0], m[3] ? MUTE : B, { fontSize: cq(8.5) })))),
                h('div', { style: { flex: 1 } }),
                h('div', { style: { display: 'flex' } }, btn(['Add to ' + MEAL, tapDot(t, AD)], { transform: pressT(t, AD) })))
              : [h('div', { key: 's', style: { display: 'flex', alignItems: 'center', gap: cq(8), height: cq(44), padding: '0 ' + cq(14), borderRadius: cq(12), background: '#0E0D0B', border: '1px solid ' + (typed ? 'rgba(191,143,79,0.5)' : LINE), fontSize: cq(14) } }, h('span', { style: { color: DIM } }, '⌕'), typed ? h('span', null, typed) : h('span', { style: { color: DIM } }, 'Search foods'), t >= TY && t < PK && Math.floor(t / 420) % 2 === 0 ? h('span', { style: { width: '1.5px', height: cq(17), background: B } }) : null),
                ...(t >= RS ? results.map((r, i) => h('div', { key: r[0], style: S({ position: 'relative', display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(12) + ' ' + cq(12), borderRadius: cq(12), background: i === 0 && t >= PK - 100 ? '#1C1914' : CARD, border: '1px solid ' + (i === 0 && t >= PK - 100 ? 'rgba(191,143,79,0.5)' : LINE), transform: i === 0 ? pressT(t, PK) : 'none' }, rise(t, RS + i * 120, 260, 6)) }, h('span', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: cq(2) } }, h('span', { style: { fontSize: cq(13.5), fontWeight: 600 } }, r[0]), h('span', { style: { fontSize: cq(11), color: MUTE } }, r[1])), h('span', { style: { width: cq(28), height: cq(28), borderRadius: '50%', border: '1px solid rgba(191,143,79,0.45)', color: B, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(16) } }, '+'), i === 0 ? tapDot(t, PK) : null)) : [])])) : null);
    }
    const sIn2 = (t, a) => { const k = ez(cl((t - a) / 320)); return { opacity: k, transform: 'translateX(' + ((1 - k) * 6).toFixed(2) + '%)' }; };

    /* ── Dark to Paper ── */
    function Theme(p) {
      const L = 9800, [t, ref] = useClock(L, 1000);
      const T1 = 1800, T2 = 6000;
      const k = ez(cl((t - T1 - 150) / 800)) * (1 - ez(cl((t - T2 - 150) / 800)));
      const P = { dark: { bg: BGD, card: '#15130F', ink: INK, mute: MUTE, dim: DIM, line: LINE, b: B, fill: FILL, fillInk: '#FBF6EC', track: 'rgba(255,255,255,0.08)' },
        paper: { bg: 'linear-gradient(180deg,#F6F1E7 0%,#EFE7D8 100%)', card: '#FBF8F2', ink: '#1F1B16', mute: '#6E6354', dim: '#9A8E7C', line: 'rgba(31,27,22,0.10)', b: '#A47A3D', fill: 'linear-gradient(180deg,#B48A4E 0%,#946B35 100%)', fillInk: '#FFFFFF', track: 'rgba(31,27,22,0.08)' } };
      const home = (c, tapAt, glyph, clip) => h('div', { style: { position: 'absolute', inset: 0, background: c.bg, color: c.ink, display: 'flex', flexDirection: 'column', clipPath: clip || 'none' } },
        h('div', { style: { height: cq(50), flex: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 ' + cq(30) + ' ' + cq(6) } }, h('span', { style: { fontSize: cq(15), fontWeight: 600 } }, '9:41'), h('span', { style: { width: cq(25), height: cq(12), borderRadius: cq(4), border: '1px solid ' + c.dim, padding: '1px', display: 'flex' } }, h('span', { style: { width: '70%', background: c.ink, borderRadius: cq(2) } }))),
        h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(10), padding: cq(8) + ' ' + cq(18) + ' ' + cq(12), borderBottom: '1px solid ' + c.line } },
          h('img', { src: R('assets/welcome-logo-carved.png'), alt: '', style: { width: cq(22), height: cq(22), objectFit: 'contain' } }), h('span', { style: { flex: 1, fontFamily: DISP, fontSize: cq(16), fontWeight: 600 } }, 'Forge Legacy'),
          h('span', { style: { position: 'relative', width: cq(34), height: cq(34), borderRadius: '50%', border: '1px solid ' + c.line, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(15), color: c.b, transform: pressT(t, tapAt) } }, glyph, tapDot(t, tapAt)),
          h('span', { style: { width: cq(34), height: cq(34), borderRadius: '50%', border: '1px solid ' + c.b, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(11), fontWeight: 700, color: c.b } }, 'IA')),
        h('div', { style: { flex: 1, minHeight: 0, padding: cq(20) + ' ' + cq(18) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(10) } },
          lbl('Chapter III', c.mute, { fontSize: cq(10), letterSpacing: '0.18em' }),
          h('span', { style: { fontFamily: DISP, fontSize: cq(36), fontWeight: 600, lineHeight: 1, letterSpacing: '0.02em' } }, 'THE REBUILD'),
          lbl('Week 6 · Day 2', c.ink, { fontSize: cq(10.5), marginTop: cq(4) }),
          h('span', { style: { paddingLeft: cq(12), borderLeft: '2px solid ' + c.b, fontFamily: DISP, fontStyle: 'italic', fontSize: cq(15), lineHeight: 1.4, color: c.b } }, 'The number fades. The discipline remains.'),
          h('div', { style: { marginTop: cq(8), padding: cq(18), borderRadius: cq(18), background: c.card, border: '1px solid ' + c.line, display: 'flex', flexDirection: 'column', gap: cq(8) } },
            lbl('Today’s workout', c.mute, { fontSize: cq(9.5) }), h('span', { style: { fontFamily: DISP, fontSize: cq(26), fontWeight: 600, lineHeight: 1.05 } }, 'Lower Body A'), h('span', { style: { fontSize: cq(12.5), color: c.mute } }, 'Squat'),
            lbl('6 exercises', c.ink, { fontSize: cq(9.5), marginTop: cq(6) }),
            h('span', { style: { marginTop: cq(8), height: cq(46), borderRadius: cq(10), background: c.fill, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(12), fontWeight: 700, letterSpacing: '0.1em', color: c.fillInk } }, 'START WORKOUT')),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: cq(10) } },
            h('div', { style: { padding: cq(14), borderRadius: cq(14), background: c.card, border: '1px solid ' + c.line, display: 'flex', flexDirection: 'column', gap: cq(6) } }, lbl('Current program', c.mute, { fontSize: cq(8.5) }), h('span', { style: { fontFamily: DISP, fontSize: cq(15) } }, 'Powerbuilding II'), h('span', { style: { fontSize: cq(11), color: c.mute } }, '12 / 32 workouts'), h('span', { style: { height: cq(3), borderRadius: 2, background: c.track } }, h('span', { style: { display: 'block', width: '37%', height: '100%', borderRadius: 2, background: c.b } }))),
            h('div', { style: { padding: cq(14), borderRadius: cq(14), background: c.card, border: '1px solid ' + c.line, display: 'flex', flexDirection: 'column', gap: cq(6) } }, lbl('Mission', c.mute, { fontSize: cq(8.5) }), h('span', { style: { fontFamily: DISP, fontSize: cq(15) } }, 'Squat 405 lb'), h('span', { style: { fontSize: cq(11), color: c.mute } }, 'Your long-term objective')))),
        h('div', { style: { flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: cq(10) + ' 0 ' + cq(26), borderTop: '1px solid ' + c.line } },
          [['home', 'Home'], ['barbell', 'Workouts'], ['book', 'Legacy'], ['squad', 'Squads']].map(x => h('span', { key: x[1], style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: cq(4), fontSize: cq(10), color: x[1] === 'Home' ? c.b : c.dim } }, ic(x[0], 16), x[1]))));
      const op = reduce() ? 1 : (t < 350 ? t / 350 : t > L - 600 ? cl((L - t) / 600) : 1);
      return h('div', { ref, role: 'img', 'aria-label': 'The home screen switching from Dark mode to Paper mode and back', style: { containerType: 'inline-size', position: 'relative', width: '100%', aspectRatio: '1320/2868', borderRadius: p.radius == null ? 29 : p.radius, overflow: 'hidden', background: '#0D0C0B', fontFamily: 'var(--fl-font-sans)' } },
        h('div', { style: { position: 'absolute', inset: 0, opacity: op } },
          home(P.dark, T1, '☀'),
          k > 0.001 ? home(P.paper, T2, '☾', 'inset(0 0 ' + ((1 - k) * 100).toFixed(2) + '% 0)') : null,
          k > 0.01 && k < 0.99 ? h('span', { style: { position: 'absolute', left: 0, right: 0, top: (k * 100).toFixed(2) + '%', height: '2px', marginTop: '-1px', background: BB, boxShadow: '0 0 12px rgba(205,160,99,0.8)' } }) : null));
    }

    /* ── Squad feed ── */
    function Squad(p) {
      const L = 12500, [t, ref] = useClock(L, 9200);
      const NP = 1200, AK = 3700, CM = 5000, TY = 5500, TXT = 'Strong week, Marcus.', SE = TY + TXT.length * 50 + 450, CMT = SE + 200;
      const np = ez(cl((t - NP) / 600)), acked = t >= AK, commenting = t >= CM && t < SE + 100;
      const typed = t < TY ? '' : TXT.slice(0, Math.min(TXT.length, Math.floor((t - TY) / 50)));
      const who = (ini, name, time) => h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(10) } }, glyphDisc(ini, 34), h('span', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: cq(2) } }, h('span', { style: { fontSize: cq(13.5), fontWeight: 600 } }, name), h('span', { style: { fontSize: cq(10.5), color: DIM } }, 'Iron Vigil')), h('span', { style: { fontSize: cq(11), color: DIM } }, time));
      const statsRow = s => h('div', { style: { display: 'flex', gap: cq(22) } }, s.map(x => h('span', { key: x[1], style: { display: 'flex', flexDirection: 'column', gap: cq(3) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(19) } }, x[0]), lbl(x[1], B, { fontSize: cq(8) }))));
      const post = (kids, x) => h('div', { style: S({ flex: 'none', padding: cq(14), borderRadius: cq(16), background: CARD, border: '1px solid ' + LINE, display: 'flex', flexDirection: 'column', gap: cq(10) }, x) }, kids);
      const act = (on, n, tapAt) => h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(18), paddingTop: cq(10), borderTop: '1px solid ' + LINE, fontSize: cq(12) } },
        h('span', { style: { position: 'relative', display: 'flex', alignItems: 'center', gap: cq(6), color: on ? BB : MUTE, fontWeight: on ? 600 : 500, transform: tapAt ? pressT(t, tapAt) : 'none' } }, on ? '✓ Acknowledged' : 'Acknowledge', h('span', { style: { color: on ? BB : DIM } }, String(n)), tapAt ? tapDot(t, tapAt) : null),
        h('span', { style: { color: MUTE } }, 'Comment'));
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Squad feed: Marcus posts a workout, you acknowledge it and leave a comment' },
        backHead('Iron Vigil', '5 members', glyphDisc('IV', 34)),
        h('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden', padding: cq(14) + ' ' + cq(14) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(12) } },
          h('div', { style: { flex: 'none', maxHeight: (np * 420 / 3.93).toFixed(2) + 'cqw', overflow: 'hidden', opacity: np } },
            post([who('MH', 'Marcus Hale', t < NP + 3000 ? 'now' : '1m'), lbl('Workout', B, { fontSize: cq(9) }), h('span', { style: { fontFamily: DISP, fontSize: cq(21), fontWeight: 600, marginTop: cq(-4) } }, 'Chest & Arms'),
              statsRow([['18,045', 'Volume (lb)'], ['1:06:27', 'Time'], ['6', 'Lifts']]),
              h('span', { style: { alignSelf: 'flex-start', padding: cq(5) + ' ' + cq(10), borderRadius: cq(6), border: '1px solid rgba(191,143,79,0.45)', fontSize: cq(11), color: BB } }, 'Record · Bench 245 × 8'),
              act(acked, acked ? 3 : 2, AK),
              t >= CMT ? h('div', { style: S({ display: 'flex', gap: cq(8), alignItems: 'flex-start' }, rise(t, CMT)) }, glyphDisc('IA', 24), h('span', { style: { padding: cq(8) + ' ' + cq(12), borderRadius: cq(12), background: '#1E1B17', fontSize: cq(12.5) } }, h('span', { style: { fontWeight: 600 } }, 'You  '), TXT)) : null], { borderColor: t < NP + 1600 ? 'rgba(191,143,79,0.45)' : LINE, transition: 'border-color .6s' })),
          post([who('TR', 'Tyler Reed', '14h'), lbl('Workout', B, { fontSize: cq(9) }), h('span', { style: { fontFamily: DISP, fontSize: cq(21), fontWeight: 600, marginTop: cq(-4) } }, 'Lower Body'), statsRow([['26,810', 'Volume (lb)'], ['47:08', 'Time'], ['12', 'Lifts']]), act(false, 4)]),
          post([who('MH', 'Marcus Hale', '1d'), lbl('Announcement', B, { fontSize: cq(9) }), h('span', { style: { fontSize: cq(13), lineHeight: 1.45, color: '#CFC6B8' } }, 'We hit our total workouts goal for September.')])),
        h('div', { style: { flex: 'none', display: 'flex', alignItems: 'center', gap: cq(8), padding: cq(10) + ' ' + cq(14) + ' ' + cq(28), borderTop: '1px solid ' + LINE, background: '#0E0D0B' } },
          h('span', { style: { position: 'relative', flex: 1, minWidth: 0, height: cq(40), borderRadius: cq(20), background: '#171512', border: '1px solid ' + (commenting ? 'rgba(191,143,79,0.45)' : 'rgba(255,255,255,0.08)'), padding: '0 ' + cq(14), display: 'flex', alignItems: 'center', fontSize: cq(13.5), whiteSpace: 'nowrap', overflow: 'hidden' } }, commenting && typed ? h('span', null, typed) : h('span', { style: { color: DIM } }, 'Comment on Marcus’s workout'), commenting && Math.floor(t / 420) % 2 === 0 ? h('span', { style: { width: '1.5px', height: cq(17), marginLeft: '1px', background: B } }) : null, tapDot(t, CM)),
          h('span', { style: { position: 'relative', width: cq(40), height: cq(40), flex: 'none', borderRadius: '50%', background: typed && commenting ? FILL : '#24211C', color: typed && commenting ? '#FBF6EC' : DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(17), fontWeight: 700, transform: pressT(t, SE) } }, '↑', tapDot(t, SE))));
    }

    /* ── Rank up ── */
    function Rank(p) {
      const L = 12500, [t, ref] = useClock(L, 8200);
      const CT = 1300, UP = 2200;
      const up = t >= UP, k = ez(cl((t - UP) / 650)), pulse = cl((t - UP - 250) / 1200);
      const lifetime = t >= CT ? 120 : 119;
      const bImg = (src, s, x) => h('img', { src, alt: '', style: S({ width: cq(s), height: cq(s), objectFit: 'contain', display: 'block' }, x) });
      const BUI = R('assets/landing/badge-builder.webp'), CRA = R('assets/landing/badge-craftsman.webp');
      const statC = (l, v, hi) => h('span', { key: l, style: { padding: cq(10) + ' ' + cq(12), borderRadius: cq(12), background: CARD, border: '1px solid ' + (hi ? 'rgba(191,143,79,0.45)' : LINE), display: 'flex', flexDirection: 'column', gap: cq(4), transition: 'border-color .4s' } }, lbl(l, MUTE, { fontSize: cq(8) }), h('span', { style: { fontFamily: DISP, fontSize: cq(15) } }, v));
      const rows = [['Builder III', 'I’m putting in the work.', BUI, 'done'], ['Builder IV', 'I train whether or not I feel like it.', BUI, up ? 'done' : 'here'], ['Craftsman I', 'The work is part of who I am.', CRA, up ? 'here' : 'next'], ['Craftsman II', '', CRA, 'next'], ['Craftsman III', '', CRA, 'next']];
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Rank up: the 120th workout moves the rank from Builder IV to Craftsman I, and rank never goes down' },
        backHead('Progress'),
        h('div', { style: { flex: 1, minHeight: 0, padding: cq(18) + ' ' + cq(16) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(12) } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(16) } },
            h('div', { style: { position: 'relative', width: cq(92), height: cq(92), flex: 'none' } },
              up ? h('span', { style: { position: 'absolute', inset: cq(6), borderRadius: '50%', border: '1.5px solid ' + BB, opacity: (1 - pulse).toFixed(3), transform: 'scale(' + (1 + 0.7 * ez(pulse)).toFixed(3) + ')' } }) : null,
              h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: '0 0 ' + cq(40) + ' rgba(191,143,79,' + (up ? 0.45 * (1 - 0.5 * pulse) : 0.1).toFixed(3) + ')' } }),
              bImg(BUI, 92, { position: 'absolute', inset: 0, opacity: 1 - k }), bImg(CRA, 92, { position: 'absolute', inset: 0, opacity: k, transform: 'scale(' + (1.25 - 0.25 * k).toFixed(3) + ')' })),
            h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(6) } }, lbl(up && t < UP + 3200 ? 'New rank' : 'Current rank', up && t < UP + 3200 ? BB : MUTE, { fontSize: cq(9) }),
              h('span', { style: { fontFamily: DISP, fontSize: cq(25), fontWeight: 600, lineHeight: 1.05 } }, up ? 'Craftsman · I' : 'Builder · IV'),
              h('span', { style: { fontFamily: DISP, fontStyle: 'italic', fontSize: cq(13), color: B } }, up ? 'The work is part of who I am.' : 'I train whether or not I feel like it.'))),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: cq(8) } }, statC('Chapter', 'The Real Cut'), statC('Forging since', '2024'), statC('Lifetime', String(lifetime), t >= CT && t < CT + 1600)),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: cq(6) } }, lbl('Rank journey', MUTE, { fontSize: cq(9.5) }), h('span', { style: { fontSize: cq(11), color: DIM } }, up ? 'Rank 9 of 28' : 'Rank 8 of 28')),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: cq(6) } }, rows.map(r => { const here = r[3] === 'here', next = r[3] === 'next';
            return h('div', { key: r[0], style: { display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(9) + ' ' + cq(12), borderRadius: cq(12), background: here ? '#1A1712' : 'transparent', border: '1px solid ' + (here ? 'rgba(191,143,79,0.5)' : 'transparent'), transition: 'background .45s, border-color .45s' } },
              bImg(r[2], 34, { filter: next ? 'grayscale(1) brightness(0.5)' : 'none', transition: 'filter .45s' }),
              h('span', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: cq(2) } }, h('span', { style: { display: 'flex', alignItems: 'center', gap: cq(8), fontFamily: DISP, fontSize: cq(15), color: next ? DIM : INK } }, r[0], here ? h('span', { style: { padding: cq(2) + ' ' + cq(7), borderRadius: 999, background: FILL, fontFamily: 'var(--fl-font-sans)', fontSize: cq(8), fontWeight: 700, letterSpacing: '0.1em', color: '#FBF6EC' } }, 'YOU ARE HERE') : null), r[1] && !next ? h('span', { style: { fontSize: cq(11), color: MUTE } }, r[1]) : null),
              h('span', { style: { color: DIM } }, '›')); })),
          h('span', { style: S({ marginTop: cq(6), fontSize: cq(12.5), color: MUTE }, rise(t, UP + 1400)) }, 'Rank never goes down. Take a year off and you’re still a Craftsman.')));
    }

    /* ── Scan a Nutrition Facts label ── */
    function LabelScan(p) {
      const L = 14600, [t, ref] = useClock(L, 9600);
      const TP = 1000, CAM = 1250, AL = 2500, SH = 3100, RD = 3350, BK = 5200, NM = 7400, TYN = 7800, NAME = 'Honey Oat Cereal', CH = 55;
      const NAMED = TYN + NAME.length * CH, SV = NAMED + 700, TST = SV + 250;
      const cam = t >= CAM && t < BK + 450 ? ez(cl((t - CAM) / 380)) * (1 - ez(cl((t - BK) / 380))) : 0;
      const filled = t >= BK, reading = t >= SH;
      const fk = i => ez(cl((t - BK - 250 - i * 110) / 480));
      const INB = '#0E0D0B';
      const box = (kids, x) => h('span', { style: S({ position: 'relative', height: cq(44), padding: '0 ' + cq(12), borderRadius: cq(10), background: INB, border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', fontSize: cq(15), color: INK, boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.45)' }, x) }, kids);
      const num = (n, i, suf) => { const k = fk(i); return k <= 0 ? h('span', { style: { color: DIM } }, '0') : h('span', { style: { opacity: Math.min(1, k * 2) } }, (n % 1 ? n : Math.round(n * k)) + (suf || '')); };
      const fLbl = (s, flag) => h('span', { style: { display: 'flex', alignItems: 'center', gap: cq(6) } }, lbl(s, B, { fontSize: cq(9.5) }), flag && fk(4) > 0.5 ? h('span', { style: { width: cq(6), height: cq(6), borderRadius: '50%', background: BB, boxShadow: '0 0 6px rgba(205,160,99,0.6)' } }) : null);
      const field = (name, n, i, suf, flag) => h('span', { key: name, style: { display: 'flex', flexDirection: 'column', gap: cq(6), minWidth: 0 } }, fLbl(name, flag), box(num(n, i, suf), flag && fk(i) > 0.5 ? { border: '1px solid rgba(205,160,99,0.55)' } : null));
      const typed = t < TYN ? '' : NAME.slice(0, Math.min(NAME.length, Math.floor((t - TYN) / CH)));
      const nameOn = t >= NM, ready = t >= NAMED;
      const toast = t >= TST && t < TST + 2900 ? Math.min(ez(cl((t - TST) / 300)), 1 - ez(cl((t - TST - 2600) / 300))) : 0;
      const scanIc = h('svg', { width: '55%', height: '55%', viewBox: '0 0 24 24', fill: 'none', stroke: B, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2' }), h('path', { d: 'M8 9h8M8 12h8M8 15h5' }));
      const form = h('div', { style: { flex: 1, minHeight: 0, padding: cq(2) + ' ' + cq(18) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(12) } },
        h('span', { style: { fontSize: cq(22), color: B, lineHeight: 1, height: cq(24) } }, '‹'),
        h('span', { style: { fontFamily: DISP, fontSize: cq(27), fontWeight: 600, lineHeight: 1.1 } }, 'Create food'),
        !filled
          ? h('div', { style: { position: 'relative', display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(10) + ' ' + cq(12), borderRadius: cq(14), background: '#1A1814', border: '1px solid ' + BL, boxShadow: '0 10px 24px -12px rgba(0,0,0,0.7)', transform: pressT(t, TP) } },
              h('span', { style: { flex: 'none', width: cq(34), height: cq(34), borderRadius: cq(9), background: INB, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, scanIc),
              h('span', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: cq(2) } }, h('span', { style: { fontSize: cq(14.5), fontWeight: 600 } }, 'Scan label'), h('span', { style: { fontSize: cq(11.5), color: MUTE } }, 'Fill from a Nutrition Facts photo')),
              h('span', { style: { color: B, fontSize: cq(16) } }, '›'), tapDot(t, TP))
          : h('div', { style: S({ display: 'flex', alignItems: 'center', gap: cq(12), padding: cq(10) + ' ' + cq(12), borderRadius: cq(12), background: 'rgba(191,143,79,0.10)', border: '1px solid ' + BL }, rise(t, BK + 60)) },
              h('span', { style: { flex: 'none', width: cq(28), height: cq(36), borderRadius: cq(5), background: 'linear-gradient(180deg,#E4DED3,#BDB6A8)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: cq(3), padding: '0 ' + cq(4) } }, h('span', { style: { height: cq(3), background: '#2A2620' } }), [0, 1, 2, 3].map(i => h('span', { key: i, style: { height: '1px', background: '#6B655B' } }))),
              h('span', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: cq(3) } }, h('span', { style: { fontSize: cq(13.5), fontWeight: 600 } }, 'Label scanned'), h('span', { style: { display: 'flex', alignItems: 'center', gap: cq(5), fontSize: cq(11.5), color: MUTE } }, '15 filled ·', h('span', { style: { width: cq(6), height: cq(6), borderRadius: '50%', background: BB } }), '1 to check')),
              h('span', { style: { fontSize: cq(12), fontWeight: 600, color: B } }, 'Rescan')),
        h('span', { style: { display: 'flex', flexDirection: 'column', gap: cq(6), marginTop: cq(2) } },
          nameOn ? h('span', { style: S({ fontSize: cq(13), fontWeight: 600, color: BB }, rise(t, NM, 300, 4)) }, 'Almost done — add a food name') : lbl('Name', B, { fontSize: cq(9.5) }),
          box([typed ? h('span', { key: 'v' }, typed) : h('span', { key: 'p', style: { color: DIM } }, 'e.g. Overnight oats'), nameOn && !ready && Math.floor(t / 420) % 2 === 0 ? h('span', { key: 'c', style: { width: '1.5px', height: cq(18), marginLeft: '1px', background: BB } }) : null], nameOn ? { border: '1px solid rgba(191,143,79,0.7)', boxShadow: '0 0 0 3px rgba(191,143,79,0.14), inset 0 2px 5px rgba(0,0,0,0.45)' } : null)),
        h('span', { style: { display: 'flex', flexDirection: 'column', gap: cq(6) } }, lbl('Serving size', MUTE, { fontSize: cq(9.5) }),
          h('span', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr 1.2fr', gap: cq(8), alignItems: 'center' } },
            h('span', { style: { fontSize: cq(12.5), fontWeight: 600, color: MUTE } }, '1 serving ='),
            box(fk(0) > 0 ? h('span', { style: { opacity: fk(0) } }, '2/3') : h('span', { style: { color: DIM } }, '80')),
            box([h('span', { key: 'u', style: { flex: 1, opacity: filled ? 0.4 + 0.6 * fk(0) : 1 } }, fk(0) > 0.5 ? 'cup' : 'grams'), h('span', { key: 'a', style: { color: B, fontSize: cq(11) } }, '▾')]))),
        h('span', { style: { display: 'flex', flexDirection: 'column', gap: cq(10) } }, lbl('Nutrition per serving', MUTE, { fontSize: cq(9.5) }),
          field('Calories', 230, 1),
          h('span', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: cq(8) } }, field('Protein g', 3, 2), field('Carbs g', 37, 3), field('Fat g', 8, 4, '', true))),
        h('span', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: cq(10), borderTop: '1px solid ' + LINE } }, lbl('More nutrients', MUTE, { fontSize: cq(9.5) }), h('span', { style: { fontSize: cq(11.5), color: filled ? B : DIM, opacity: filled ? fk(6) : 1 } }, filled ? '11 filled' : '›')),
        h('div', { style: { flex: 1 } }),
        h('div', { style: { display: 'flex', padding: '0 0 ' + cq(26) } }, btn([filled ? 'Create food · 230 cal' : 'Create food', tapDot(t, SV)], { flex: 1, opacity: ready ? 1 : 0.4, transform: pressT(t, SV) })));
      const drift = 1 - ez(cl((t - CAM - 150) / (AL - CAM - 150)));
      const aligned = t >= AL;
      const LR = [['Total Fat', '8g', 0, 1], ['Saturated Fat', '1g', 1, 1], ['Cholesterol', '0mg', 0, 1], ['Sodium', '160mg', 0, 1], ['Total Carbohydrate', '37g', 0, 1], ['Dietary Fiber', '4g', 1, 1], ['Total Sugars', '12g', 1, 1], ['Incl. 10g Added Sugars', '', 2, 1], ['Protein', '3g', 0, 1]];
      const LM = [['Vitamin D 2mcg', 'Calcium 130mg'], ['Iron 8mg', 'Potassium 140mg']];
      const scanK = ez(cl((t - RD) / 1600));
      const hl = i => reading ? ez(cl((scanK - (0.18 + i * 0.062)) / 0.06)) : 0;
      const mark = (s, i) => h('span', { style: { padding: '0 ' + cq(2), borderRadius: cq(2), background: 'rgba(191,143,79,' + (0.42 * hl(i)).toFixed(3) + ')' } }, s);
      const INKL = '#15130F', rule = (w, m) => h('span', { style: { display: 'block', height: w, background: INKL, margin: (m || 0) + ' 0' } });
      const label = h('div', { style: { width: '100%', padding: cq(9) + ' ' + cq(10) + ' ' + cq(10), background: '#EFE9DE', border: '1.5px solid ' + INKL, color: INKL, fontFamily: 'var(--fl-font-sans)', display: 'flex', flexDirection: 'column', boxShadow: '0 14px 30px rgba(0,0,0,0.55)' } },
        h('span', { style: { fontSize: cq(25), fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 } }, 'Nutrition Facts'), rule('1px', cq(4)),
        h('span', { style: { fontSize: cq(9.5) } }, '8 servings per container'),
        h('span', { style: { display: 'flex', justifyContent: 'space-between', fontSize: cq(11), fontWeight: 800 } }, h('span', null, 'Serving size'), mark('2/3 cup (55g)', 0)), rule(cq(6), cq(3)),
        h('span', { style: { fontSize: cq(8.5), fontWeight: 700 } }, 'Amount per serving'),
        h('span', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 800, lineHeight: 1.05 } }, h('span', { style: { fontSize: cq(18) } }, 'Calories'), h('span', { style: { fontSize: cq(26) } }, mark('230', 1))), rule(cq(3.5), cq(2)),
        h('span', { style: { alignSelf: 'flex-end', fontSize: cq(8), fontWeight: 700 } }, '% Daily Value*'),
        ...LR.map((r, i) => h('span', { key: r[0], style: { display: 'flex', justifyContent: 'space-between', gap: cq(6), padding: cq(2) + ' 0 ' + cq(2) + ' ' + cq(r[2] * 9), borderTop: '1px solid rgba(21,19,16,0.55)', fontSize: cq(9.5), lineHeight: 1.25 } }, h('span', null, h('span', { style: { fontWeight: r[2] ? 400 : 800 } }, r[0] + ' '), r[1] ? mark(r[1], i + 2) : null), h('span', { style: { fontWeight: 700 } }, ['10%', '5%', '0%', '7%', '13%', '14%', '', '20%', ''][i]))),
        rule(cq(6), cq(2)),
        ...LM.map((r, i) => h('span', { key: i, style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: cq(6), padding: cq(2) + ' 0', borderTop: i ? '1px solid rgba(21,19,16,0.55)' : 'none', fontSize: cq(9) } }, h('span', null, mark(r[0], 11 + i)), h('span', null, mark(r[1], 11 + i)))));
      const flash = t >= SH && t < SH + 320 ? 1 - (t - SH) / 320 : 0;
      const brC = aligned ? BB : 'rgba(237,230,218,0.7)';
      const corner = (pos) => h('span', { key: pos, style: S({ position: 'absolute', width: cq(30), height: cq(30), borderColor: brC, borderStyle: 'solid', borderWidth: 0 }, pos === 'tl' ? { left: -2, top: -2, borderLeftWidth: 2.5, borderTopWidth: 2.5, borderTopLeftRadius: cq(12) } : pos === 'tr' ? { right: -2, top: -2, borderRightWidth: 2.5, borderTopWidth: 2.5, borderTopRightRadius: cq(12) } : pos === 'bl' ? { left: -2, bottom: -2, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderBottomLeftRadius: cq(12) } : { right: -2, bottom: -2, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderBottomRightRadius: cq(12) }) });
      const tight = aligned ? ez(cl((t - AL) / 300)) : 0;
      const camera = cam > 0.01 ? h('div', { style: { position: 'absolute', inset: 0, zIndex: 10, opacity: cam, background: 'radial-gradient(90% 55% at 50% 40%, #3A342B 0%, #1A1712 55%, #080807 100%)', overflow: 'hidden' } },
        h('div', { style: { position: 'absolute', left: cq(46), right: cq(46), top: cq(128), transform: 'translate(' + (drift * 22).toFixed(1) + 'px,' + (drift * 30).toFixed(1) + 'px) rotate(' + (drift * -6).toFixed(2) + 'deg) scale(' + (1 + drift * 0.08).toFixed(3) + ')', filter: reading ? 'brightness(0.72)' : 'none' } }, label),
        h('div', { style: { position: 'absolute', left: cq(30 + tight * 4), right: cq(30 + tight * 4), top: cq(112 + tight * 4), height: cq(382 - tight * 8), borderRadius: cq(14), boxShadow: '0 0 0 999px rgba(4,4,4,' + (reading ? 0.7 : 0.5) + ')' } },
          corner('tl'), corner('tr'), corner('bl'), corner('br'),
          reading && scanK < 1 ? h('span', { style: { position: 'absolute', left: cq(8), right: cq(8), top: (scanK * 100).toFixed(2) + '%', height: 2, background: BB, boxShadow: '0 0 16px 3px rgba(205,160,99,0.5)' } }) : null),
        h('div', { style: { position: 'absolute', left: 0, right: 0, top: 0 } }, status()),
        h('div', { style: { position: 'absolute', left: cq(18), right: cq(18), top: cq(62), display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: cq(15) } }, h('span', { style: { width: cq(30), color: INK, fontSize: cq(18) } }, '✕'), h('span', { style: { fontWeight: 600 } }, 'Scan label'), h('span', { style: { width: cq(30), textAlign: 'right', color: reading ? 'transparent' : INK } }, '⚡︎')),
        h('div', { style: { position: 'absolute', left: 0, right: 0, top: cq(528), display: 'flex', justifyContent: 'center' } },
          h('span', { style: { flex: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: cq(8), padding: cq(7) + ' ' + cq(14), borderRadius: 999, background: 'rgba(10,10,10,0.75)', border: '1px solid ' + (reading ? 'rgba(191,143,79,0.45)' : 'rgba(255,255,255,0.12)'), fontSize: cq(12.5), fontWeight: 600 } },
            reading ? h('span', { style: { width: cq(6), height: cq(6), borderRadius: '50%', background: BB, opacity: 0.4 + 0.6 * Math.abs(Math.sin(t / 220)) } }) : null, reading ? 'Reading label…' : aligned ? 'Hold still' : 'Flat · bright · no glare')),
        h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: cq(40), display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 ' + cq(36) } },
          h('span', { style: { justifySelf: 'start', width: cq(40), height: cq(40), borderRadius: cq(10), border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(20,18,15,0.8)', opacity: reading ? 0.3 : 1 } }),
          h('span', { style: { position: 'relative', width: cq(72), height: cq(72), borderRadius: '50%', padding: cq(5), border: '2.5px solid ' + (reading ? 'rgba(255,255,255,0.2)' : BB), boxShadow: reading ? 'none' : '0 0 22px rgba(191,143,79,0.35)', transform: pressT(t, SH), display: 'block' } }, h('span', { style: { display: 'block', width: '100%', height: '100%', borderRadius: '50%', background: '#F0EDE8', opacity: reading ? 0.2 : 1 } }), tapDot(t, SH)),
          h('span', null)),
        flash > 0 ? h('div', { style: { position: 'absolute', inset: 0, background: '#FFF8EC', opacity: (flash * 0.85).toFixed(3) } }) : null) : null;
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Scanning a Nutrition Facts label: tap Scan label, line the label up in the camera frame, take the photo, and Forge reads it and fills in serving size, calories and macros, flags one value to check, then the food is named and saved' },
        form,
        toast > 0.01 ? h('div', { style: { position: 'absolute', top: cq(44), left: cq(18), right: cq(18), zIndex: 12, display: 'flex', alignItems: 'center', gap: cq(10), padding: cq(12) + ' ' + cq(14), borderRadius: cq(12), background: '#1C1914', border: '1px solid rgba(191,143,79,0.4)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)', fontSize: cq(13), opacity: toast, transform: 'translateY(' + ((1 - toast) * -8).toFixed(1) + 'px)' } }, h('span', { style: { color: B, fontWeight: 700 } }, '✓'), 'Saved to My Foods · 230 cal') : null,
        camera);
    }

    /* ── Hero: a morning with Forge (gym → bench → car → kitchen) ── */
    const HD_BEATS = [
      { name: 'Coach', at: 0, len: 8600, clock: '6:02', time: '6:02 AM', place: 'Gym', note: 'You ask for a 45-minute chest day and Holt writes it.' },
      { name: 'Train', at: 8600, len: 8600, clock: '6:21', time: '6:21 AM', place: 'Bench', note: 'Check off the set and the rest timer starts itself.' },
      { name: 'Squad', at: 17200, len: 12400, clock: '7:04', time: '7:04 AM', place: 'Car', note: 'Seal it from the car. Your squad sees it and comments.' },
      { name: 'Eat', at: 29600, len: 9400, clock: '7:32', time: '7:32 AM', place: 'Kitchen', note: 'Log breakfast and the rings update.' },
    ];
    const HD_L = 39000;
    function HeroCoach(p) {
      const L = 6400, [t, ref] = useClock(L, 5000);
      const U1 = 350, D1 = 700, A1 = 1450, CD = 2900, ST = 5200;
      const lifts = [['Barbell Bench Press', '3 × 8 · 245 lb'], ['Incline DB Press', '3 × 10 · 70 lb'], ['Cable Fly', '3 × 12 · 35 lb'], ['Weighted Dips', '3 × 8 · +25 lb']];
      const m = [];
      if (t >= U1) m.push(userB(t, 'u', U1, 'Quick chest day. I’ve got 45 minutes.'));
      if (t >= D1) m.push(holtB(t, 'a', D1, A1, 'Bench first while you’re fresh, then incline and flys. Four lifts, done in 45.'));
      if (t >= CD) m.push(h('div', { key: 'c', style: S({ flex: 'none', marginLeft: cq(34), padding: cq(14), borderRadius: cq(16), background: '#16140F', border: '1px solid rgba(191,143,79,0.28)', display: 'flex', flexDirection: 'column', gap: cq(9) }, rise(t, CD)) },
        h('span', { style: { display: 'flex', justifyContent: 'space-between' } }, lbl('Today · Chest · 45 min'), lbl('4 lifts', MUTE)),
        ...lifts.map((l, j) => h('span', { key: l[0], style: S({ display: 'flex', justifyContent: 'space-between', gap: cq(8), fontSize: cq(13) }, rise(t, CD + 150 + j * 120)) }, h('span', null, l[0]), h('span', { style: { color: MUTE } }, l[1]))),
        h('span', { style: { position: 'relative', marginTop: cq(4), height: cq(38), borderRadius: cq(10), background: FILL, border: '1px solid rgba(205,160,99,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cq(14), fontWeight: 600, color: '#FBF6EC', transform: pressT(t, ST) } }, 'Start workout', tapDot(t, ST))));
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Coach Holt: you ask for a quick 45 minute chest day and Holt lays out four lifts with a Start workout button' }, holtHead(), chatCol(m), composer('Ask Holt anything'));
    }
    function SquadMine(p) {
      const L = 6000, [t, ref] = useClock(L, 5000);
      const NP = 250, A = [1500, 1900, 2300], C1 = 2900, C2 = 3900;
      const np = ez(cl((t - NP) / 600)), acks = A.filter(x => t >= x).length;
      const who = (ini, name, time) => h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(10) } }, glyphDisc(ini, 34), h('span', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: cq(2) } }, h('span', { style: { fontSize: cq(13.5), fontWeight: 600 } }, name), h('span', { style: { fontSize: cq(10.5), color: DIM } }, 'Iron Vigil')), h('span', { style: { fontSize: cq(11), color: DIM } }, time));
      const statsRow = st2 => h('div', { style: { display: 'flex', gap: cq(22) } }, st2.map(x => h('span', { key: x[1], style: { display: 'flex', flexDirection: 'column', gap: cq(3) } }, h('span', { style: { fontFamily: DISP, fontSize: cq(19) } }, x[0]), lbl(x[1], B, { fontSize: cq(8) }))));
      const post = (kids, x) => h('div', { style: S({ flex: 'none', padding: cq(14), borderRadius: cq(16), background: CARD, border: '1px solid ' + LINE, display: 'flex', flexDirection: 'column', gap: cq(10) }, x) }, kids);
      const cm = (at, ini, name, txt) => t >= at ? h('div', { key: ini, style: S({ display: 'flex', gap: cq(8), alignItems: 'flex-start' }, rise(t, at)) }, glyphDisc(ini, 24), h('span', { style: { padding: cq(8) + ' ' + cq(12), borderRadius: cq(12), background: '#1E1B17', fontSize: cq(12.5), lineHeight: 1.4 } }, h('span', { style: { fontWeight: 600 } }, name + '  '), txt)) : null;
      return frame({ t, L, fref: ref, radius: p.radius, label: 'Squad feed: your sealed chest day posts to Iron Vigil, three squad members acknowledge it, and Marcus and Tyler comment' },
        backHead('Iron Vigil', '5 members', glyphDisc('IV', 34)),
        h('div', { style: { flex: 1, minHeight: 0, overflow: 'hidden', padding: cq(14) + ' ' + cq(14) + ' 0', display: 'flex', flexDirection: 'column', gap: cq(12) } },
          h('div', { style: { flex: 'none', maxHeight: (np * 520 / 3.93).toFixed(2) + 'cqw', overflow: 'hidden', opacity: np } },
            post([who('IA', 'You', 'now'), lbl('Workout', B, { fontSize: cq(9) }), h('span', { style: { fontFamily: DISP, fontSize: cq(21), fontWeight: 600, marginTop: cq(-4) } }, 'Chest Day'),
              statsRow([['14,210', 'Volume (lb)'], ['46:12', 'Time'], ['4', 'Lifts']]),
              h('span', { style: { alignSelf: 'flex-start', padding: cq(5) + ' ' + cq(10), borderRadius: cq(6), border: '1px solid rgba(191,143,79,0.45)', fontSize: cq(11), color: BB, whiteSpace: 'nowrap' } }, 'Record · Bench 245 × 8'),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: cq(10), paddingTop: cq(10), borderTop: '1px solid ' + LINE, fontSize: cq(12) } },
                h('span', { style: { display: 'flex' } }, ['MH', 'TR', 'DK'].slice(0, acks).map((g, j) => h('span', { key: g, style: { marginLeft: j ? cq(-8) : 0, transform: 'scale(' + (0.6 + 0.4 * ez(cl((t - A[j]) / 220))).toFixed(3) + ')' } }, glyphDisc(g, 22)))),
                h('span', { style: { flex: 1, color: acks ? BB : MUTE, fontWeight: acks ? 600 : 500 } }, acks ? acks + ' acknowledged' : 'Acknowledge'),
                h('span', { style: { color: MUTE } }, 'Comment')),
              cm(C1, 'MH', 'Marcus', 'Bench is moving.'), cm(C2, 'TR', 'Tyler', 'Save me a spot tomorrow.')], { borderColor: t < NP + 1800 ? 'rgba(191,143,79,0.45)' : LINE, transition: 'border-color .6s' })),
          post([who('MH', 'Marcus Hale', '14h'), lbl('Workout', B, { fontSize: cq(9) }), h('span', { style: { fontFamily: DISP, fontSize: cq(21), fontWeight: 600, marginTop: cq(-4) } }, 'Chest & Arms'), statsRow([['18,045', 'Volume (lb)'], ['1:06:27', 'Time'], ['6', 'Lifts']])])),
        composer('Comment on your workout'));
    }
    function hdScene(i, op, k) {
      const bl = v => 'blur(' + v + 'px)';
      const A = (st, kids) => h('span', { style: S({ position: 'absolute', display: 'block' }, st) }, kids);
      const txt = { fontFamily: 'var(--fl-font-sans)', fontWeight: 800, color: 'rgba(235,230,220,0.85)', fontSize: 'clamp(7px,1.3vw,12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
      const dumb = (x, y, w, n, key) => A({ key, left: x + '%', top: y + '%', width: w + '%', aspectRatio: '3.1', filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.6))' }, [
        A({ key: 'h', left: '26%', right: '26%', top: '40%', height: '20%', background: 'linear-gradient(180deg,#f2f2f0,#8e8e8c 45%,#d9d9d6 60%,#6d6d6b)' }),
        A(S({ key: 'l', left: 0, top: 0, width: '30%', height: '100%', borderRadius: '10%', background: 'linear-gradient(180deg,#3a3937 0%,#1a1918 30%,#0e0e0d 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }, txt), n),
        A(S({ key: 'r', right: 0, top: 0, width: '30%', height: '100%', borderRadius: '10%', background: 'linear-gradient(180deg,#3a3937 0%,#1a1918 30%,#0e0e0d 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }, txt), n)]);
      const plate = (x, y, w, key, n) => A({ key, left: x + '%', top: y + '%', width: w + '%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle, #cfcfcc 0 5%, #3a3a38 5.5% 8%, #121212 8.5% 30%, #1d1d1c 31% 33%, #111 34% 84%, #2b2a28 85% 90%, #0b0b0b 91% 100%)', boxShadow: '0 10px 24px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.1)' },
        n ? A(S({ left: '40%', top: '13%', width: '20%', height: '12%', color: 'rgba(235,230,220,0.8)' }, txt, { fontSize: 'clamp(8px,1.6vw,15px)' }), n) : null);
      let body;
      if (i === 0) {
        const HEX = 'polygon(22% 0, 78% 0, 100% 24%, 100% 76%, 78% 100%, 22% 100%, 0 76%, 0 24%)';
        const db = (x, y, w, n, key, fb, dim) => A({ key, left: x + '%', top: y + '%', width: w + '%', aspectRatio: '3.3', filter: 'blur(' + (fb || 0) + 'px) brightness(' + (dim || 1) + ')' }, [
          A({ key: 'sh', left: '4%', right: '4%', bottom: '-14%', height: '26%', borderRadius: '50%', background: 'rgba(0,0,0,0.75)', filter: 'blur(6px)' }),
          A({ key: 'h', left: '27%', right: '27%', top: '41%', height: '18%', background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.28) 0 1px, transparent 1px 3px), linear-gradient(180deg,#e9e9e6 0%,#8f8f8b 38%,#f5f5f2 55%,#5d5d5a 100%)' }),
          ...['l', 'r'].map(sd => A(S({ key: sd, [sd === 'l' ? 'left' : 'right']: 0, top: 0, width: '31%', height: '100%', clipPath: HEX, background: 'linear-gradient(180deg,#55534e 0%,#35332f 16%,#232220 45%,#141413 80%,#0a0a09 100%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }, txt, { color: 'rgba(235,232,224,0.8)', fontWeight: 700, fontSize: 'clamp(6px,1vw,10px)' }), [
            A({ key: 'hl', left: '22%', right: '22%', top: 0, height: '14%', background: 'linear-gradient(180deg, rgba(255,245,225,0.45), transparent)' }), A({ key: 'hl2', left: 0, width: '10%', top: '24%', bottom: '24%', background: 'linear-gradient(90deg, rgba(255,245,225,0.14), transparent)' }), n])) ]);
        body = [
          A({ key: 'w', inset: 0, background: 'linear-gradient(180deg,#0c0c0b 0%,#151513 40%,#1b1a18 60%,#0f0f0e 100%)' }),
          A({ key: 'f', top: '52%', bottom: '-30%', left: '-40%', right: '-40%', transformOrigin: '50% 0', transform: 'perspective(600px) rotateX(55deg)', backgroundColor: '#1a1917', backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 150px, rgba(0,0,0,0.7) 150px 152px), repeating-linear-gradient(0deg, transparent 0 150px, rgba(0,0,0,0.7) 150px 152px), radial-gradient(rgba(255,255,255,0.08) 0.7px, transparent 1.2px), radial-gradient(rgba(200,195,185,0.05) 0.7px, transparent 1.2px)', backgroundSize: 'auto, auto, 5px 5px, 8px 8px', backgroundPosition: '0 0, 0 0, 0 0, 2px 3px' }),
          A({ key: 'rail1', left: '-5%', right: '-5%', top: '27%', height: '2.2%', background: 'linear-gradient(180deg,#3a3936,#141413 60%,#0a0a0a)', filter: 'blur(2px)' }),
          A({ key: 'rail2', left: '-5%', right: '-5%', top: '47.5%', height: '2.4%', background: 'linear-gradient(180deg,#3a3936,#141413 60%,#0a0a0a)', filter: 'blur(1px)' }),
          ...[-4, 18, 40, 62, 84].map((x, j) => db(x, 17, 19, ['20', '22.5', '25', '27.5', '30'][j], 'a' + j, 1.6, 1.05)),
          ...[-9, 15, 39, 63, 87].map((x, j) => db(x, 35.5, 23, ['35', '40', '45', '50', '55'][j], 'b' + j, 0.4, 1.2)),
          db(8, 76, 34, '', 'fl1', 3.5, 1.15), db(58, 84, 36, '', 'fl2', 5, 1.1),
          A({ key: 'lt', inset: 0, background: 'radial-gradient(70% 40% at 50% 8%, rgba(245,210,160,0.28), transparent 70%), radial-gradient(50% 30% at 50% 64%, rgba(230,200,150,0.12), transparent 70%)' }),
        ];
      }
      else if (i === 1) body = [
        A({ key: 'w', inset: 0, background: 'linear-gradient(180deg,#141312 0%,#1f1d1a 55%,#121110 100%)' }),
        ...[6, 90].map(x => A({ key: 'u' + x, left: x - 2.5 + '%', top: 0, bottom: '20%', width: '5%', background: 'linear-gradient(90deg,#1b1b1a,#5a5955 45%,#2a2927)', backgroundImage: 'radial-gradient(circle, #0b0b0b 0 32%, transparent 36%), linear-gradient(90deg,#1b1b1a,#5a5955 45%,#2a2927)', backgroundSize: '100% 6%, 100% 100%', backgroundRepeat: 'repeat-y, no-repeat', backgroundPosition: 'center 0, 0 0' })),
        A({ key: 'bar', left: '-5%', right: '-5%', top: '31%', height: '1.6%', background: 'linear-gradient(180deg,#f4f4f2,#9a9a97 45%,#dcdcd9 60%,#6f6f6c)', boxShadow: '0 3px 6px rgba(0,0,0,0.5)' }),
        plate(-24, 10, 38, 'p1', '45'), plate(-14, 14, 30, 'p2', '25'),
        plate(86, 10, 38, 'p3', '45'), plate(84, 14, 30, 'p4', '25'),
        A({ key: 'bench', left: '14%', right: '14%', top: '66%', height: '14%', borderRadius: '14px', background: 'linear-gradient(180deg,#3a3633 0%,#1e1c1a 35%,#0f0e0d 100%)', transform: 'perspective(500px) rotateX(42deg)', boxShadow: '0 20px 30px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.12)' }),
        ...[26, 70].map(x => A({ key: 'leg' + x, left: x + '%', top: '78%', width: '4%', height: '16%', background: 'linear-gradient(90deg,#1a1a19,#4a4946,#1a1a19)' })),
        A({ key: 'lt', inset: 0, background: 'radial-gradient(60% 40% at 50% 0%, rgba(240,200,140,0.22), transparent 70%)' }),
      ];
      else if (i === 2) body = [
        A({ key: 'sky', inset: 0, background: 'linear-gradient(180deg,#c4cfd2 0%,#dfe1d6 22%,#cbbf9f 36%,#2a2a28 42%)' }),
        ...[[4, 6, 30, '#5c7a55'], [30, 2, 24, '#7f9a6b'], [58, 8, 32, '#4e6b4b'], [86, 4, 26, '#8aa073']].map((c, j) => A({ key: 't' + j, left: c[0] - c[2] / 2 + '%', top: c[1] + '%', width: c[2] + '%', aspectRatio: '1', borderRadius: '50%', background: c[3], opacity: 0.8, filter: bl(14) })),
        A({ key: 'dash', left: '-20%', right: '-20%', top: '38%', bottom: '-10%', borderRadius: '50% 50% 0 0 / 14% 14% 0 0', background: 'linear-gradient(180deg,#2a2a29 0%,#141414 18%,#0b0b0b 100%)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.12)' }),
        ...[[6, '#8fb6e0'], [24, '#e0896a']].map((g, j) => A({ key: 'g' + j, left: g[0] + '%', top: '44%', width: '17%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle, #0a0c10 0 55%, transparent 56%), repeating-conic-gradient(from 220deg, ' + g[1] + ' 0 2deg, transparent 2deg 12deg)', boxShadow: '0 0 0 2px #3a3d42, 0 0 18px ' + g[1] + '55', opacity: 0.9 })),
        A({ key: 'scr', left: '66%', top: '45%', width: '30%', height: '13%', borderRadius: '6px', background: 'linear-gradient(135deg,#1b2530,#0b1016)', boxShadow: '0 0 0 2px #2c2c2c, 0 0 20px rgba(120,160,210,0.25)' }),
        ...[0, 1, 2].map(j => A({ key: 'v' + j, left: 69 + j * 9 + '%', top: '61%', width: '7%', height: '5%', borderRadius: '3px', background: 'repeating-linear-gradient(180deg,#2a2a2a 0 2px,#0c0c0c 2px 5px)' })),
        A({ key: 'wheel', left: '-12%', top: '48%', width: '66%', aspectRatio: '1', borderRadius: '50%', border: 'clamp(14px,3.2vw,26px) solid #0d0d0d', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.12), 0 -2px 0 rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.6)' }),
        A({ key: 'spoke', left: '-6%', top: '71%', width: '54%', height: '7%', borderRadius: '30px', background: 'linear-gradient(180deg,#262626,#0b0b0b)' }),
        A({ key: 'hub', left: '9%', top: '62%', width: '24%', aspectRatio: '1.1', borderRadius: '42%', background: 'radial-gradient(circle at 50% 35%, #2a2a2a, #0a0a0a 70%)', boxShadow: '0 0 0 2px #1c1c1c' }),
        A({ key: 'gear', left: '82%', top: '80%', width: '8%', height: '16%', borderRadius: '40% 40% 10% 10%', background: 'linear-gradient(90deg,#0c0c0c,#3a3a3a,#0c0c0c)' }),
      ];
      else body = [
        A({ key: 'wall', inset: 0, background: 'linear-gradient(180deg,#2b2621 0%,#3b332a 40%,#2a241e 56%)' }),
        A({ key: 'tile', left: 0, right: 0, top: '10%', height: '42%', backgroundImage: 'repeating-linear-gradient(0deg, rgba(20,16,12,0.45) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(20,16,12,0.35) 0 1px, transparent 1px 44px), linear-gradient(180deg,#6d655a,#5a5248)', opacity: 0.55, filter: 'blur(3px)' }),
        A({ key: 'cab', left: 0, right: 0, top: 0, height: '12%', background: 'linear-gradient(180deg,#15120f,#221d18)', boxShadow: '0 6px 14px rgba(0,0,0,0.5)' }),
        A({ key: 'beam', left: '-20%', top: '-10%', width: '90%', height: '90%', background: 'linear-gradient(115deg, transparent 30%, rgba(255,226,180,0.22) 42%, transparent 54%, rgba(255,226,180,0.14) 62%, transparent 70%)', filter: 'blur(10px)' }),
        A({ key: 'ctr', left: 0, right: 0, top: '52%', bottom: 0, background: 'linear-gradient(180deg,#d9d3c9 0%,#bdb6aa 1.2%,#9d968b 2%,#8a8378 30%,#5f5850 100%)' }),
        A({ key: 'vein', left: 0, right: 0, top: '54%', bottom: 0, background: 'linear-gradient(170deg, transparent 20%, rgba(255,255,255,0.10) 24%, transparent 30%), linear-gradient(160deg, transparent 55%, rgba(255,255,255,0.07) 60%, transparent 66%)' }),
        A({ key: 'refl', left: '5%', right: '30%', top: '53%', height: '18%', background: 'radial-gradient(60% 50% at 40% 0%, rgba(255,236,205,0.35), transparent 70%)', filter: 'blur(6px)' }),
        A({ key: 'pls', left: '-8%', top: '76%', width: '52%', height: '12%', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', filter: 'blur(10px)' }),
        A({ key: 'plate', left: '-8%', top: '64%', width: '50%', aspectRatio: '1.9', borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 48%, #f1ede6 0 58%, #d6d0c6 62% 70%, #f6f3ee 74% 94%, rgba(246,243,238,0) 98%)', filter: 'blur(2px)' }, [
          A({ key: 'y1', left: '18%', top: '26%', width: '30%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, #e9a53a 0 20%, #f5e9d2 34%, #fbf7ef 60%, rgba(251,247,239,0) 72%)', filter: 'blur(2.5px)' }),
          A({ key: 'y2', left: '40%', top: '34%', width: '28%', height: '38%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, #e39a2e 0 20%, #f5e9d2 34%, #fbf7ef 60%, rgba(251,247,239,0) 72%)', filter: 'blur(2.5px)' }),
          A({ key: 'tst', left: '64%', top: '20%', width: '24%', height: '46%', borderRadius: '28%', background: 'radial-gradient(ellipse at 50% 45%, #d9a466 0 40%, #a8692f 70%, #6b3e18 100%)', transform: 'rotate(12deg)', filter: 'blur(3px)' })]),
        A({ key: 'shs', left: '76%', top: '63%', width: '20%', height: '6%', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', filter: 'blur(8px)' }),
        A({ key: 'shaker', left: '79%', top: '22%', width: '14%', height: '44%', filter: 'blur(1.5px)' }, [
          A({ key: 'cap', left: '5%', right: '5%', top: 0, height: '16%', borderRadius: '28% 28% 6% 6%', background: 'linear-gradient(90deg,#070707,#2e2e2e 35%,#0e0e0e 70%,#1c1c1c)' }),
          A({ key: 'body', left: 0, right: 0, top: '15%', bottom: 0, borderRadius: '5% 5% 12% 12%', background: 'linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0.20))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)', overflow: 'hidden' }, [
            A({ key: 'liq', left: 0, right: 0, top: '34%', bottom: 0, background: 'linear-gradient(90deg,#4a2f1d,#7d5436 40%,#6a452c 70%,#43291a)' }),
            A({ key: 'foam', left: 0, right: 0, top: '30%', height: '6%', background: 'linear-gradient(180deg,#b8977a,#7d5436)' }),
            A({ key: 'gl', left: '14%', width: '10%', top: '4%', bottom: '6%', background: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1))', filter: 'blur(1px)' })])]),
        A({ key: 'mug', left: '62%', top: '47%', width: '11%', height: '15%', borderRadius: '5% 5% 16% 16%', background: 'linear-gradient(90deg,#8e877d,#e6e0d6 35%,#f3efe8 50%,#a39c91)', boxShadow: '0 12px 16px rgba(0,0,0,0.4)', filter: 'blur(3.5px)' }),
        A({ key: 'hdl', left: '72.5%', top: '49.5%', width: '3.6%', height: '8%', borderRadius: '0 50% 50% 0', border: '3px solid #cfc8bc', borderLeft: 'none', filter: 'blur(3px)' }),
        A({ key: 'grade', inset: 0, background: 'linear-gradient(180deg, rgba(40,28,16,0.10), rgba(20,14,8,0.25))' }),
      ];
      return h('div', { key: 'sc' + i, 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, opacity: op, overflow: 'hidden' } },
        h('div', { style: { position: 'absolute', inset: 0, transform: 'scale(' + (1.03 + 0.05 * k).toFixed(4) + ')', filter: 'blur(' + [1.2, 1.6, 1.6, 3.2][i] + 'px) saturate(0.82) contrast(1.04)' } }, ...body),
        h('div', { style: { position: 'absolute', inset: 0, background: 'radial-gradient(110% 85% at 50% 45%, transparent 40%, rgba(6,5,4,0.7) 100%), linear-gradient(180deg, rgba(8,7,6,0.18), rgba(8,7,6,0.38))' } }));
    }
    function HeroDay(p) {
      const L = HD_L, ref = useRef(null), st = useRef({ start: 0, on: false, raf: 0, wait: 0, off: 0 });
      const [t, setT] = useState(reduce() ? 8400 : 0);
      useEffect(() => {
        if (reduce()) return;
        const s = st.current;
        const f = now => { if (!s.start) s.start = now - s.off; setT((now - s.start) % L); s.raf = requestAnimationFrame(f); };
        s.f = f;
        const io = new IntersectionObserver(es => {
          const en = es[0], hg = en.boundingClientRect.height || 1, need = Math.min(0.85, (window.innerHeight * 0.9) / hg);
          if (en.intersectionRatio >= need && !s.on) { s.on = true; s.start = 0; s.wait = setTimeout(() => { s.raf = requestAnimationFrame(f); }, 600); }
          else if (en.intersectionRatio < 0.12 && s.on) { s.on = false; clearTimeout(s.wait); cancelAnimationFrame(s.raf); s.raf = 0; s.off = 0; s.start = 0; setT(0); }
        }, { threshold: Array.from({ length: 41 }, (_, i) => i / 40) });
        if (ref.current) io.observe(ref.current);
        return () => { io.disconnect(); clearTimeout(s.wait); cancelAnimationFrame(s.raf); };
      }, []);
      const jump = i => { const s = st.current, at = HD_BEATS[i].at; if (reduce()) { setT(at + 2600); return; } s.off = at; s.start = 0; setT(at); if (!s.on || !s.raf) { s.on = true; clearTimeout(s.wait); cancelAnimationFrame(s.raf); const f = now => { if (!s.start) s.start = now - s.off; setT((now - s.start) % L); s.raf = requestAnimationFrame(f); }; s.raf = requestAnimationFrame(f); } };
      let bi = 0; for (let i = 0; i < 4; i++) if (t >= HD_BEATS[i].at) bi = i;
      const beat = HD_BEATS[bi], lt = t - beat.at, len = beat.len;
      const pOp = reduce() || !st.current.raf ? 1 : lt < 280 ? lt / 280 : lt > len - 280 ? cl((len - lt) / 280) : 1;
      const prev = (bi + 3) % 4, sk = ez(cl(lt / 800));
      const scenes = HD_BEATS.map((b, i) => i === bi ? hdScene(i, reduce() ? 1 : sk, lt / len) : i === prev && sk < 1 && t > 800 ? hdScene(i, 1 - sk, 1) : null);
      const rad = 'clamp(17px,3.6vw,29px)';
      const run = (C, ext, x) => h(ExtT.Provider, { value: ext }, h(C, S({ radius: rad }, x)));
      let screen, sub = 1;
      const K = 0.78, SW = 4700;
      if (bi === 0) screen = run(HeroCoach, Math.min(lt * K, 5700));
      else if (bi === 1) screen = run(Workout, Math.min(700 + lt * 0.8, 6300), { hero: true });
      else if (bi === 2) { if (lt < SW) { screen = run(Seal, Math.min(1200 + lt * 0.8, 4900), { hero: true }); sub = lt > SW - 280 ? cl((SW - lt) / 280) : 1; } else { screen = run(SquadMine, Math.min((lt - SW) * 0.8, 5300)); sub = cl((lt - SW) / 280); } }
      else screen = run(FoodLog, Math.min(900 + lt, 8900), { hero: true });
      const phone = h('div', { style: { position: 'absolute', left: '50%', top: '58%', width: '40%', transform: 'translate(-50%,-50%)', borderRadius: 'clamp(22px,4.4vw,36px)', padding: 'clamp(5px,0.9vw,8px)', background: '#1A1714', boxShadow: '0 50px 90px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)' } },
        h('div', { style: { position: 'relative', borderRadius: rad, overflow: 'hidden', background: '#0D0C0B', opacity: pOp * sub } }, h(ClockC.Provider, { value: beat.clock }, screen)));
      const chipK = reduce() ? 1 : ez(cl((lt - 150) / 450));
      const chip = h('div', { style: { position: 'absolute', zIndex: 3, left: '50%', top: 'clamp(12px,2.6vw,22px)', width: 'max-content', maxWidth: 'calc(100% - 28px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: 'clamp(6px,1.2vw,9px) clamp(12px,2vw,16px) clamp(7px,1.3vw,10px)', borderRadius: 16, background: 'rgba(12,11,9,0.7)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#F3ECDF', textAlign: 'center', opacity: chipK, transform: 'translate(-50%,' + ((1 - chipK) * -6).toFixed(1) + 'px)' } },
        h('span', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BB, whiteSpace: 'nowrap' } }, h('span', { style: { width: 5, height: 5, borderRadius: '50%', background: BB } }), beat.time + ' · ' + beat.name),
        h('span', { style: { fontSize: 'clamp(12px,1.5vw,14.5px)', fontWeight: 500, lineHeight: 1.35, textWrap: 'balance' } }, beat.note));
      const tabs = h('div', { role: 'tablist', 'aria-label': 'A morning with Forge', style: { display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 } },
        HD_BEATS.map((b, i) => h('button', { key: b.name, type: 'button', role: 'tab', 'aria-selected': i === bi, onClick: () => jump(i), style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--fl-font-sans)' } },
          h('span', { style: { display: 'block', height: 3, borderRadius: 3, background: '#E6DFD0', overflow: 'hidden' } }, h('span', { style: { display: 'block', height: '100%', width: (i === bi ? cl(lt / len) * 100 : 0).toFixed(2) + '%', background: 'var(--fl-bronze-600)' } })),
          h('span', { style: { fontSize: 14, fontWeight: 600, color: i === bi ? '#1F1B16' : '#9A9083' } }, b.name))));
      return h('div', { ref, style: { width: '100%', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 } },
        h('div', { role: 'img', 'aria-label': 'A morning with Forge: at the gym Coach Holt builds a chest day, at the bench a set is logged and rest starts, in the car the session is sealed and the squad acknowledges and comments, then breakfast is logged in the kitchen', style: { position: 'relative', width: '100%', aspectRatio: '5/6.5', borderRadius: 'clamp(22px,3vw,32px)', overflow: 'hidden', background: '#0D0C0B', boxShadow: '0 40px 80px -36px rgba(40,30,20,0.55)' } }, ...scenes, phone, chip),
        tabs);
    }

    return { heroDay: HeroDay, workout: Workout, seal: Seal, build: Build, nutrition: Nutrition, holtStart: HoltStart, holtBuild: HoltBuild, honor: Honor, chapter: Chapter, foodLog: FoodLog, theme: Theme, squad: Squad, rank: Rank, labelScan: LabelScan };
  }
  window.FLPhoneAnims = { get(React) { if (!cache) cache = build(React); return cache; } };
})();
