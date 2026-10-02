import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadHanken } from '@remotion/google-fonts/HankenGrotesk';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { CAPS, DUR, E, L, P, RDUR, doyAt, doyLabel, filmAt, pose, realAt, rng, win, type Pose } from './timeline';
import { Phone } from './Phone';
import { AppScreen, RECS, onScreenTime, recTime, screenStack } from './Screens';
import { LEGACY_CARDS, MEDAL_LABEL, END, SCORE } from './story';

const display = loadPlayfair('normal', { weights: ['500', '600', '700'], subsets: ['latin'] }).fontFamily;
loadPlayfair('italic', { weights: ['500', '600'], subsets: ['latin'] });
const sans = loadHanken('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] }).fontFamily;
const mono = loadMono('normal', { weights: ['400', '500'], subsets: ['latin'] }).fontFamily;
loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] });

export type FilmProps = { portrait: boolean; cut?: 'full' | 'ad15' };

/* ---------- background: light pool, beams, embers, sparks (verbatim from the mock-up) ---------- */
const r1 = rng(7);
const EMB = Array.from({ length: 80 }, () => ({ x: r1(), y: r1(), v: 0.02 + r1() * 0.07, s: 0.6 + r1() * 2.2, ph: r1() * 6.28, a: 0.25 + r1() * 0.6, sw: 10 + r1() * 40 }));
const r2 = rng(11);
const SPK = Array.from({ length: 46 }, () => { const an = r2() * Math.PI * 2; return { c: Math.cos(an), s: Math.sin(an), v: 300 + r2() * 900, l: 0.5 + r2() * 0.8 }; });
const medalPos = (portrait: boolean) => (portrait ? { x: -300, y: 560 } : { x: -230, y: 230 });

function drawBG(g: CanvasRenderingContext2D, cw: number, ch: number, W: number, H: number, t: number, ph: Pose, amb: number, portrait: boolean) {
  const sx = cw / W;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const bgG = g.createLinearGradient(0, 0, 0, ch); bgG.addColorStop(0, '#07090B'); bgG.addColorStop(1, '#020303');
  g.fillStyle = bgG; g.fillRect(0, 0, cw, ch);
  g.setTransform(sx, 0, 0, sx, 0, 0);
  const cx = W / 2 + ph.x, cy = H / 2 + ph.y;
  const warm = E.outC(P(t, 1.4, 2.2));
  const inten = 0.32 + 0.5 * Math.exp(-Math.max(0, t - 1.4) * 3) * (t > 1.4 ? 1 : 0) + 0.25 * win(t, 14, 17.6, 0.8, 0.6)
    + 0.35 * Math.exp(-Math.max(0, t - 15.7) * 2.5) * (t > 15.7 ? 1 : 0) + 0.15 * P(t, 17.4, 18.4);
  const R = 900, cr = Math.round(L(120, 186, warm)), cg = Math.round(L(128, 134, warm)), cb = Math.round(L(138, 84, warm)), lo = L(0.5, 1, warm);
  const lg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  lg.addColorStop(0, `rgba(${cr},${cg},${cb},${0.42 * inten * lo})`);
  lg.addColorStop(0.45, `rgba(${Math.round(cr * 0.68)},${Math.round(cg * 0.68)},${Math.round(cb * 0.7)},${0.16 * inten * lo})`);
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const bx = W * (0.3 + 0.22 * i) + Math.sin(amb * 0.25 + i * 2) * 60;
    const a = (0.045 + 0.02 * Math.sin(amb * 0.7 + i)) * (1 + inten * 0.4);
    const bg2 = g.createLinearGradient(bx, 0, bx + 200, H); bg2.addColorStop(0, `rgba(243,217,174,${a})`); bg2.addColorStop(1, 'rgba(243,217,174,0)');
    g.fillStyle = bg2; g.beginPath(); g.moveTo(bx - 40, 0); g.lineTo(bx + 60, 0); g.lineTo(bx + 420, H); g.lineTo(bx + 120, H); g.closePath(); g.fill();
  }
  for (const e of EMB) {
    const y = (e.y * H * 1.2 - amb * e.v * H * 1.0) % (H * 1.2); const yy = y < 0 ? y + H * 1.2 : y;
    const x = e.x * W + Math.sin(amb * 1.3 + e.ph) * e.sw;
    const tw = 0.5 + 0.5 * Math.sin(amb * 3 + e.ph * 3);
    g.fillStyle = `rgba(232,170,100,${e.a * tw * 0.7 * (0.15 + 0.85 * warm)})`; g.beginPath(); g.arc(x, yy - H * 0.1, e.s, 0, 6.283); g.fill();
  }
  const sparks = (t0: number, ox: number, oy: number, scale: number) => {
    const dt = t - t0; if (dt < 0 || dt > 1.4) return;
    for (const p of SPK) {
      if (dt > p.l) continue;
      const x = ox + p.c * p.v * dt * scale, y = oy + (p.s * p.v * dt + 900 * dt * dt) * scale, a = 1 - dt / p.l;
      g.strokeStyle = `rgba(243,200,140,${a * 0.9})`; g.lineWidth = 2 * scale; g.beginPath(); g.moveTo(x, y); g.lineTo(x - p.c * 18 * scale, y - (p.s * 18 + 6) * scale); g.stroke();
    }
  };
  sparks(1.4, cx, cy, 0.9);
  const mp = medalPos(portrait); sparks(15.72, W / 2 + mp.x, H / 2 + mp.y, 0.8);
  g.globalCompositeOperation = 'source-over';
}

const Background: React.FC<{ W: number; H: number; t: number; ph: Pose; amb: number; portrait: boolean }> = (p) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current; if (!c) return;
    const g = c.getContext('2d'); if (!g) return;
    drawBG(g, c.width, c.height, p.W, p.H, p.t, p.ph, p.amb, p.portrait);
  });
  return <canvas ref={ref} width={p.W / 2} height={p.H / 2} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
};

/* ---------- captions: problem line read for ~1.1 s, struck through in bronze, then the fix arrives word by word ---------- */
const Caption: React.FC<{ c: (typeof CAPS)[number]; x: number; portrait: boolean }> = ({ c, x, portrait }) => {
  const A = realAt(c.a), B = realAt(c.b);
  if (!(x > A - 0.05 && x < B + 0.05)) return null;
  const out = E.inC(P(x, B - 0.4, B));
  let wa = A;
  let pain: React.ReactNode = null;
  if (c.pain) {
    const pp = E.outC(P(x, A, A + 0.35));
    wa = A + 1.3;
    pain = (
      <div style={{
        position: 'relative', width: 'max-content', maxWidth: '100%', marginBottom: 22, marginInline: c.wide ? 'auto' : undefined,
        fontFamily: sans, fontWeight: 500, fontSize: 34, letterSpacing: 0, lineHeight: 1.2, color: '#8B8377',
        opacity: pp * (1 - out) * (1 - 0.45 * P(x, A + 1.45, A + 1.7)), transform: `translateY(${(1 - pp) * 16 - out * 18}px)`,
      }}>
        {c.pain}
        <i style={{
          position: 'absolute', left: -4, top: '54%', height: 3, borderRadius: 2, background: '#BA8654',
          width: `calc(${E.io(P(x, A + 1.1, A + 1.45)) * 100}% + 8px)`, opacity: P(x, A + 1.1, A + 1.15),
        }} />
      </div>
    );
  }
  let j = 0;
  const words = c.text.split('*').map((part, pi) => {
    const nodes = part.split(/(\s+)/).filter(Boolean).map((w, wi) => {
      if (/^\s+$/.test(w)) return ' ';
      const p = E.outExpo(P(x, wa + j * 0.05, wa + j * 0.05 + 0.55)); j++;
      return (
        <span key={wi} style={{
          display: 'inline-block', whiteSpace: 'pre', opacity: p * (1 - out),
          transform: `translateY(${(1 - p) * 46 - out * 24}px)`,
          filter: 1 - p > 0.02 || out > 0.02 ? `blur(${((1 - p) * 10 + out * 8).toFixed(1)}px)` : 'none',
        }}>{w}</span>
      );
    });
    return pi % 2 ? <em key={pi} style={{ fontStyle: 'italic', color: '#D9AB78' }}>{nodes}</em> : <React.Fragment key={pi}>{nodes}</React.Fragment>;
  });
  const pos: React.CSSProperties = portrait
    ? c.wide ? { left: 84, right: 84, bottom: 110, textAlign: 'center', fontSize: 80 } : { left: 84, right: 84, top: 250, fontSize: 96 }
    : c.wide ? { left: 0, width: '100%', bottom: 96, textAlign: 'center', fontSize: 76 } : { left: 330, top: 380, width: 640, fontSize: 84 };
  return (
    <div style={{ position: 'absolute', fontFamily: display, fontWeight: 600, color: '#F4EFE6', letterSpacing: '-.015em', lineHeight: 1.04, ...pos }}>
      {pain}{words}
    </div>
  );
};

/* ---------- touches: from the recording manifest when a shot is real, the mock-up's list otherwise ---------- */
type Tap = { t: number; x: number; y: number; id?: string };
const MOCK_TAPS: Tap[] = [{ t: 2.22, x: 201, y: 450 }, { t: 3.2, x: 352, y: 285 }, { t: 3.9, x: 352, y: 347 }, { t: 4.6, x: 352, y: 409 }, { t: 5.86, x: 356, y: 810 }];
function tapsReal(): Tap[] {
  const out: Tap[] = [];
  for (const k in RECS) for (const tp of RECS[k].taps ?? []) {
    const on = onScreenTime(RECS[k], tp.at);
    if (on != null) out.push({ t: realAt(RECS[k].from) + on, x: tp.x, y: tp.y + 54, id: k });
  }
  return out;
}

export const Film: React.FC<FilmProps> = ({ portrait }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const r = Math.min(RDUR, frame / fps);
  const t = filmAt(r);
  const amb = r;
  const ph = pose(t, portrait);
  const realTaps = useMemo(tapsReal, []);

  // shake on the turn and the medal
  let shx = 0, shy = 0;
  if (t > 1.4 && t < 2.0) { const a = 16 * Math.exp(-(t - 1.4) * 8); shx = Math.sin(t * 95) * a; shy = Math.cos(t * 80) * a * 0.7; }
  if (t > 15.72 && t < 16.2) { const a = 8 * Math.exp(-(t - 15.72) * 9); shx += Math.sin(t * 90) * a; shy += Math.cos(t * 70) * a * 0.6; }

  // motion blur from speed
  const q = pose(Math.min(DUR, t + 1 / 60), portrait);
  const sp = Math.abs(q.ry - ph.ry) + Math.abs(q.rx - ph.rx) + Math.abs(q.y - ph.y) / 12 + Math.abs(q.x - ph.x) / 12 + Math.abs(q.s - ph.s) * 60;
  const blur = Math.min(6, sp * 0.55);

  const lift = Math.abs(ph.y) > 600 ? 0 : 1 - Math.min(1, Math.max(0, -ph.y) / 600);

  // dimmer + bronze outline (read, then watch)
  let dimV = 0, spotV = 0, spotC: (typeof CAPS)[number]['spot'] | null = null;
  for (const c of CAPS) {
    if (!c.pain) continue;
    const A = realAt(c.a);
    const d = amb < A ? 0 : amb < A + 1.3 ? E.outC(P(amb, A, A + 0.3)) : 1 - E.io(P(amb, A + 1.3, A + 1.75));
    if (d > dimV) dimV = d;
    const v = win(amb, A + 1.4, A + 3.6, 0.25, 0.6);
    if (c.spot && v > spotV) { spotV = v; spotC = c.spot; }
  }

  // A recording can place its own outline on a beat of the real screen (the proposal, "What changed").
  for (const k in RECS) {
    const rec = RECS[k];
    if (!rec.spots?.length) continue;
    const since = amb - realAt(rec.from);
    if (since < 0) continue;
    const rt = recTime(rec, since);
    // Only while this recording's screen is the one showing (a slowed take would otherwise outlive its shot).
    // …and only after this shot's problem line has been read (the phone is lit): read first, then watch.
    const lastPain = CAPS.filter((c) => c.pain && realAt(c.a) <= amb).pop();
    const lit = lastPain ? E.outC(P(amb, realAt(lastPain.a) + 1.4, realAt(lastPain.a) + 1.75)) : 0;
    const shown = (screenStack(t).find(([id]) => id === k)?.[1] ?? 0) * lit;
    for (const sp of rec.spots) {
      const v = shown * (rt < sp.at || rt > sp.until ? 0 : Math.min(E.outC(P(rt, sp.at, sp.at + 0.25)), 1 - E.inQ(P(rt, sp.until - 0.3, sp.until))));
      if (v > spotV) { spotV = v; spotC = { x: sp.x, y: sp.y, w: sp.w, h: sp.h }; }
    }
  }

  // touches
  const taps = realTaps.length ? realTaps : MOCK_TAPS.map((k) => ({ ...k, t: realAt(k.t) }));
  const onScreen = (id?: string) => !id || (screenStack(t).find(([sid]) => sid === id)?.[1] ?? 0) > 0.5;
  const tch = taps.find((k) => amb > k.t - 0.18 && amb < k.t + 0.55 && onScreen(k.id));

  const overlay = (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: dimV * 0.62, zIndex: 18 }} />
      {spotC && spotV > 0 && (
        <div style={{
          position: 'absolute', left: spotC.x, top: spotC.y, width: spotC.w, height: spotC.h, borderRadius: 18, zIndex: 21,
          border: '2px solid rgba(214,165,112,.95)', boxShadow: '0 0 34px rgba(201,151,103,.55), inset 0 0 24px rgba(201,151,103,.18)',
          opacity: spotV, transform: `scale(${1.04 - 0.04 * E.outC(Math.min(1, spotV * 1.4))})`,
        }} />
      )}
      {tch && (() => {
        const d = amb - tch.t, rp = P(d, 0, 0.5);
        return (
          <>
            <div style={{ position: 'absolute', left: tch.x, top: tch.y, width: 46, height: 46, margin: '-23px 0 0 -23px', borderRadius: '50%', zIndex: 20,
              background: 'rgba(255,255,255,.55)', boxShadow: '0 0 20px rgba(255,255,255,.35)',
              opacity: d < 0 ? (1 + d / 0.18) * 0.9 : Math.max(0, 0.9 - d * 4), transform: `scale(${d < 0 ? 1.15 : 0.9})` }} />
            <div style={{ position: 'absolute', left: tch.x, top: tch.y, width: 46, height: 46, margin: '-23px 0 0 -23px', borderRadius: '50%', zIndex: 19,
              border: '2px solid rgba(243,217,174,.9)', opacity: d > 0 ? (1 - rp) * 0.9 : 0, transform: `scale(${1 + rp * 1.8})` }} />
          </>
        );
      })()}
      {/* glare */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.10) 45%, rgba(255,255,255,0) 60%)', backgroundSize: '300% 100%', backgroundPosition: `${50 + ph.ry * 2.2}% 0` }} />
      {/* bronze sweep after the turn */}
      {(() => { const swp = P(t, 2.05, 2.7); return swp > 0 && swp < 1 ? (
        <div style={{ position: 'absolute', top: '-10%', bottom: '-10%', width: 120, zIndex: 31, left: L(-160, 460, E.io(swp)), transform: 'skewX(-18deg)',
          background: 'linear-gradient(90deg, rgba(243,217,174,0), rgba(243,217,174,.35), rgba(243,217,174,0))' }} />) : null; })()}
      <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, opacity: 0.9 * win(t, 1.4, 2.0, 0.06, 0.3) }} />
    </>
  );

  // floating Legacy cards
  // PO 10-01: two chapters, one either side of the phone — nothing else flies out.
  const CPOS = portrait
    ? [{ x: -250, y: -560, z: -60, ry: 14 }, { x: 250, y: -560, z: -60, ry: -14 }]
    : [{ x: -560, y: -110, z: -60, ry: 24 }, { x: 560, y: -110, z: -60, ry: -24 }];

  const mpos = medalPos(portrait);
  const m1 = P(t, 15.35, 15.72), m2 = E.outBack(m1), mo = E.inQ(P(t, 17.2, 17.6));
  const spin = (1 - E.outC(P(t, 15.35, 16.4))) * 540;

  const doy = doyAt(t);
  const pastQuit = doy >= 100;
  let tag = '', tagColor = '#A39C92', tagScale = 1;
  if (t > 9.45 && t < 10.55) tag = 'MISSED WEEK';
  else if (pastQuit && t < 16.7) { tag = 'DAY 100 · STILL HERE'; tagColor = '#E3B98A'; tagScale = 1 + 0.18 * Math.exp(-Math.max(0, t - 14.9) * 5); }

  const ep = E.outC(P(t, 17.55, 18.4));
  const endItem = (i: number) => { const p2 = E.outC(P(t, 18.0 + i * 0.25, 18.7 + i * 0.25)); return { opacity: p2, transform: `translateY(${(1 - p2) * 16}px)` }; };
  // The App Store badge is never animated (Apple's rule): it cuts in, still.
  const badgeOn = t >= 18.5;

  return (
    <AbsoluteFill style={{ background: '#030405', overflow: 'hidden', fontFamily: sans }}>
      {SCORE && <Audio src={staticFile(SCORE)} />}
      <Background W={W} H={H} t={t} ph={ph} amb={amb} portrait={portrait} />
      <AbsoluteFill style={{ transform: `translate(${shx}px,${shy}px)` }}>
        {/* Legacy cards */}
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d' }}>
            {LEGACY_CARDS.map((card, i) => {
              const a = 14.55 + i * 0.14, p = E.outC(P(t, a, a + 0.7)), o = E.inQ(P(t, 17.25 + i * 0.05, 17.75 + i * 0.05));
              const c = CPOS[i], yOff = portrait ? 260 : 0;
              const x = L(ph.x, c.x, p), y = L(ph.y, c.y + yOff, p) + Math.sin(t * 1.2 + i) * 6 - o * 80, z = L(-300, c.z, p);
              const op = P(t, a, a + 0.2) * (1 - o);
              if (op <= 0) return null;
              return (
                <div key={i} style={{
                  position: 'absolute', left: -150, top: -95, width: 300, height: 190, borderRadius: 22, padding: '22px 24px', color: '#F2EEE7',
                  background: 'linear-gradient(160deg, rgba(28,24,20,.92), rgba(10,11,13,.92))', border: '1px solid rgba(186,134,84,.45)',
                  boxShadow: '0 40px 90px rgba(0,0,0,.6), inset 0 1px 0 rgba(243,217,174,.12)', opacity: op,
                  transform: `translate3d(${x}px,${y}px,${z}px) rotateY(${c.ry * p}deg) scale(${0.4 + 0.6 * p})`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.16em', color: '#BA8654' }}>{card.k}</div>
                  {card.n && <div style={{ fontFamily: display, fontSize: 32, fontWeight: 600, lineHeight: 1.1, marginTop: 10 }}>{card.n}</div>}
                  <div style={{ fontSize: 16, color: '#A39C92', marginTop: 10 }}>{card.m}</div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
        {/* floor shadow */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 420, height: 70, marginLeft: -210, marginTop: -35, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(0,0,0,.85), rgba(0,0,0,0))', filter: 'blur(8px)',
          transform: `translate(${ph.x}px,${445 * ph.s + 30 + (portrait ? 230 : 0)}px) scale(${ph.s * (0.6 + 0.4 * lift)})`,
          opacity: 0.75 * lift * (1 - P(t, 14, 14.8) * 0.6),
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 60% at 50% 55%, rgba(243,217,174,.55), rgba(243,217,174,0) 70%)',
          opacity: (t > 1.4 ? 0.9 * Math.exp(-(t - 1.4) * 4) : 0) + (t > 15.72 ? 0.7 * Math.exp(-(t - 15.72) * 4) : 0) }} />
        {/* phone */}
        <AbsoluteFill style={{ perspective: 2400, filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d' }}>
            <Phone pose={ph} overlay={overlay}><AppScreen t={t} r={r} /></Phone>
          </div>
        </AbsoluteFill>
        {/* medal */}
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d',
            transform: `translate3d(${mpos.x}px,${mpos.y}px,${L(700, 80, E.outC(m1))}px) rotateY(${spin}deg) scale(${L(2.2, 1, m2) * (1 - mo * 0.3)})` }}>
            <svg viewBox="0 0 220 220" style={{ position: 'absolute', left: -110, top: -110, width: 220, height: 220, opacity: P(t, 15.35, 15.45) * (1 - mo) }}>
              <defs>
                <radialGradient id="mg" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#F3D9AE" /><stop offset=".45" stopColor="#C99767" /><stop offset="1" stopColor="#5C4726" /></radialGradient>
                <linearGradient id="mr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F3D9AE" /><stop offset=".5" stopColor="#7E5C3B" /><stop offset="1" stopColor="#C99767" /></linearGradient>
              </defs>
              <circle cx="110" cy="110" r="104" fill="url(#mr)" /><circle cx="110" cy="110" r="90" fill="url(#mg)" />
              <circle cx="110" cy="110" r="76" fill="none" stroke="#5C4726" strokeWidth="2" strokeDasharray="3 5" />
              <path d="M62 110h96M74 92v36M146 92v36M64 98v24M156 98v24" stroke="#3B2D20" strokeWidth="9" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', left: -160, top: 122, width: 320, textAlign: 'center', fontSize: 15, fontWeight: 600, letterSpacing: '.18em', color: '#E3B98A', opacity: P(t, 15.85, 16.1) * (1 - mo) }}>{MEDAL_LABEL}</div>
          </div>
        </AbsoluteFill>
        {/* date counter */}
        <div style={{ position: 'absolute', fontFamily: mono, color: '#F2EEE7', opacity: win(t, 0.4, 17.3, 0.4, 0.4), ...(portrait ? { left: 84, top: 110 } : { left: 150, top: 120 }) }}>
          <div style={{ fontSize: 44, letterSpacing: '.06em', fontVariantNumeric: 'tabular-nums' }}>
            {doyLabel(doy)}
            <span style={{ display: 'inline-block', marginLeft: 14, fontSize: 14, letterSpacing: '.2em', color: tagColor, verticalAlign: 'middle', transform: `scale(${tagScale})`, transformOrigin: '0 50%' }}>{tag}</span>
          </div>
          <div style={{ fontSize: 16, letterSpacing: '.24em', color: '#BA8654', marginTop: 6 }}>WEEK {Math.max(1, Math.ceil(doy / 7))}</div>
          <div style={{ position: 'relative', width: 360, height: 2, background: 'rgba(242,238,231,.14)', marginTop: 16 }}>
            <i style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(doy / 365) * 100}%`, background: 'linear-gradient(90deg,#7E5C3B,#F3D9AE)' }} />
            <span style={{ position: 'absolute', left: '27.4%', top: -7, width: 2, height: 16, background: pastQuit ? '#E3B98A' : '#6E6860' }} />
            <span style={{ position: 'absolute', left: '27.4%', top: 16, transform: 'translateX(-50%)', fontSize: 15, letterSpacing: '.2em', color: '#8B8377', whiteSpace: 'nowrap', opacity: pastQuit ? 0 : 1 }}>MOST PEOPLE QUIT BY HERE</span>
          </div>
        </div>
        {CAPS.map((c, i) => <Caption key={i} c={c} x={amb} portrait={portrait} />)}
        {/* end card */}
        <div style={{ position: 'absolute', opacity: ep, transform: `translateY(${(1 - ep) * 30}px)`,
          ...(portrait ? { left: 70, right: 70, top: 170, textAlign: 'center' as const } : { left: 150, top: 290, width: 820 }) }}>
          <div style={{ fontFamily: display, fontSize: 30, letterSpacing: '.42em', fontWeight: 600, background: 'linear-gradient(#F3D9AE,#C99767 55%,#7E5C3B)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{END.wordmark}</div>
          <div style={{ fontFamily: display, fontWeight: 600, fontSize: 104, lineHeight: 1, letterSpacing: '-.02em', marginTop: 28, color: '#F4EFE6' }}>
            {END.headline[0]}<br /><em style={{ fontStyle: 'italic', color: '#D9AB78' }}>{END.headline[1]}</em>
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: '#E3B98A', marginTop: 30, ...endItem(0) }}>{END.one}</div>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center', marginTop: 44, justifyContent: portrait ? 'center' : undefined }}>
            <Img src={staticFile('badge/download-on-the-app-store.svg')} style={{ height: 64, opacity: badgeOn ? 1 : 0 }} />
            <div style={{ fontFamily: mono, fontSize: 24, color: '#E3B98A', letterSpacing: '.06em', ...endItem(1) }}>{END.url}</div>
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, pointerEvents: 'none' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.75))' }} />
    </AbsoluteFill>
  );
};
