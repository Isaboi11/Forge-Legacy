import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';
import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadHanken } from '@remotion/google-fonts/HankenGrotesk';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { E, L, P, RDUR, WEB_ONEAPP, adToFilm, capsFor, readOf, doyAt, doyLabel, filmAt, pose, realAt, rng, webAt, win, type Cap, type Pose } from './timeline';
import { Phone, PhoneFace, PhoneLift } from './Phone';
import { PhoneBody3D } from './Phone3D';
import { AppScreen, RECS, REC_H, REC_W, STATUS_H, frameSrc, onScreenTime, recTime, screenEnd, screenStack, type Lift } from './Screens';
import { SCREEN_W } from './Phone';
import { LEGACY_CARDS, MEDAL, MORE_MEDALS, ACCOMPLISHMENTS, END, SCORE, SCORE_AD15, SCORE_WEB } from './story';

const display = loadPlayfair('normal', { weights: ['500', '600', '700'], subsets: ['latin'] }).fontFamily;
loadPlayfair('italic', { weights: ['500', '600'], subsets: ['latin'] });
const sans = loadHanken('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] }).fontFamily;
const mono = loadMono('normal', { weights: ['400', '500'], subsets: ['latin'] }).fontFamily;
loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] });

// `flatPhone`: the old CSS phone (quick drafts — the 3D phone renders several times slower).
export type FilmProps = { portrait: boolean; cut?: 'full' | 'ad15' | 'web'; flatPhone?: boolean };

// PO 10-02: "slight motion with the phones… slowly spinning, really slow and barely noticeable". A slow turn of a few
// degrees and back (~14 s), a faint tilt and float, on REAL time — so the phone keeps breathing while a line is held.
// (A generic phone: Apple's no-spinning rule is about iPhone images.)
const drift = (p: Pose, r: number): Pose => ({
  ...p,
  // PO 10-02: 3.5° was "too subtle" → 8°.
  ry: p.ry + 8 * Math.sin((2 * Math.PI * r) / 13),
  rx: p.rx + 2 * Math.sin((2 * Math.PI * r) / 9 + 1),
  y: p.y + 8 * Math.sin((2 * Math.PI * r) / 11 + 2),
});

/* ---------- background: light pool, beams, embers, sparks (verbatim from the mock-up) ---------- */
const r1 = rng(7);
const EMB = Array.from({ length: 80 }, () => ({ x: r1(), y: r1(), v: 0.02 + r1() * 0.07, s: 0.6 + r1() * 2.2, ph: r1() * 6.28, a: 0.25 + r1() * 0.6, sw: 10 + r1() * 40 }));
const r2 = rng(11);
const SPK = Array.from({ length: 46 }, () => { const an = r2() * Math.PI * 2; return { c: Math.cos(an), s: Math.sin(an), v: 300 + r2() * 900, l: 0.5 + r2() * 0.8 }; });
// Under Chapter I, clear of the bottom caption (PO 10-02).
const medalPos = (portrait: boolean) => (portrait ? { x: -330, y: 160 } : { x: -600, y: 150 });

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
  // PO 10-02: the diagonal light beams read as cheesy — gone. A soft overhead wash instead, no hard edges.
  const top = g.createRadialGradient(W / 2, -H * 0.35, 0, W / 2, -H * 0.35, H * 1.25);
  top.addColorStop(0, `rgba(243,217,174,${0.07 * lo})`); top.addColorStop(1, 'rgba(243,217,174,0)');
  g.fillStyle = top; g.fillRect(0, 0, W, H);
  // …and fewer, fainter embers: dust in the light, not sparks.
  for (const e of EMB.slice(0, 28)) {
    const y = (e.y * H * 1.2 - amb * e.v * H * 1.0) % (H * 1.2); const yy = y < 0 ? y + H * 1.2 : y;
    const x = e.x * W + Math.sin(amb * 1.3 + e.ph) * e.sw;
    const tw = 0.5 + 0.5 * Math.sin(amb * 3 + e.ph * 3);
    g.fillStyle = `rgba(232,170,100,${e.a * tw * 0.32 * (0.15 + 0.85 * warm)})`; g.beginPath(); g.arc(x, yy - H * 0.1, e.s * 0.8, 0, 6.283); g.fill();
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
const Caption: React.FC<{ c: Cap; x: number; portrait: boolean }> = ({ c, x, portrait }) => {
  const A = realAt(c.a), B = realAt(c.b);
  if (!(x > A - 0.05 && x < B + 0.05)) return null;
  const out = E.inC(P(x, B - 0.4, B));
  let wa = A;
  let pain: React.ReactNode = null;
  const rd = readOf(c);
  if (c.pain) {
    const pp = E.outC(P(x, A, A + 0.35));
    wa = A + rd + 0.2;
    pain = (
      <div style={{
        position: 'relative', width: 'max-content', maxWidth: '100%', marginBottom: 22, marginInline: c.wide ? 'auto' : undefined,
        fontFamily: sans, fontWeight: 500, fontSize: c.wide ? 46 : 34, letterSpacing: 0, lineHeight: 1.2, color: c.wide ? '#B8AFA2' : '#9A9286',
        opacity: pp * (1 - out) * (1 - 0.45 * P(x, A + rd + 0.35, A + rd + 0.6)), transform: `translateY(${(1 - pp) * 16 - out * 18}px)`,
      }}>
        {c.pain}
        <i style={{
          position: 'absolute', left: -4, top: '54%', height: 3, borderRadius: 2, background: '#BA8654',
          width: `calc(${E.io(P(x, A + rd, A + rd + 0.35)) * 100}% + 8px)`, opacity: P(x, A + rd, A + rd + 0.05),
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
    ? c.wide ? { left: 84, right: 84, bottom: 64, textAlign: 'center', fontSize: 80 } : { left: 84, right: 84, top: 330, fontSize: 96 } // portrait: clear of the counter's quit label
    : c.wide ? { left: 0, width: '100%', bottom: 52, textAlign: 'center', fontSize: 76 } : { left: 330, top: 380, width: 640, fontSize: 84 };
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

export const Film: React.FC<FilmProps> = ({ portrait, cut, flatPhone }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  // The web loop splices the film's real time; in its one-app segment the squad shot's slot shows the one-app take.
  const web = cut === 'web' ? webAt(frame / fps) : null;
  const oneApp = web?.seg === WEB_ONEAPP;
  const caps = capsFor(oneApp);
  const r = web ? web.r : cut === 'ad15' ? adToFilm(frame / fps) : Math.min(RDUR, frame / fps);
  const t = filmAt(r);
  const amb = r;
  const ph = drift(pose(t, portrait), r);
  const realTaps = useMemo(tapsReal, []);

  // shake on the turn and the medal
  let shx = 0, shy = 0;
  if (t > 1.4 && t < 2.0) { const a = 16 * Math.exp(-(t - 1.4) * 8); shx = Math.sin(t * 95) * a; shy = Math.cos(t * 80) * a * 0.7; }

  // motion blur from speed
  const q = drift(pose(filmAt(Math.min(RDUR, r + 1 / 60)), portrait), r + 1 / 60);
  const sp = Math.abs(q.ry - ph.ry) + Math.abs(q.rx - ph.rx) + Math.abs(q.y - ph.y) / 12 + Math.abs(q.x - ph.x) / 12 + Math.abs(q.s - ph.s) * 60;
  const blur = Math.min(6, sp * 0.55);

  const lift = Math.abs(ph.y) > 600 ? 0 : 1 - Math.min(1, Math.max(0, -ph.y) / 600);

  // dimmer + bronze outline (read, then watch)
  let dimV = 0, spotV = 0, spotC: Cap['spot'] | null = null;
  for (const c of caps) {
    if (!c.pain) continue;
    const A = realAt(c.a);
    const d = amb < A ? 0 : amb < A + readOf(c) + 0.2 ? E.outC(P(amb, A, A + 0.3)) : 1 - E.io(P(amb, A + readOf(c) + 0.2, A + readOf(c) + 0.65));
    if (d > dimV) dimV = d;
    const v = win(amb, A + 1.4, A + 3.6, 0.25, 0.6);
    if (c.spot && v > spotV) { spotV = v; spotC = c.spot; }
  }

  // A recording can place its own outline on a beat of the real screen, or lift one piece of it off the phone.
  let liftV = 0, lifted: { l: Lift; id: string } | null = null;
  for (const k in RECS) {
    const rec = RECS[k];
    // The web loop can lift a different piece of a take than the full film does (`webLifts`).
    const recLifts = (cut === 'web' && rec.webLifts) || rec.lifts;
    if (!rec.spots?.length && !recLifts?.length) continue;
    // The squad and one-app takes share one slot: only the one on screen may lift (its lift would otherwise float).
    if (k === (oneApp ? 'squad' : 'oneapp')) continue;
    const since = amb - realAt(rec.from);
    if (since < 0) continue;
    const rt = recTime(rec, since);
    // Only while this recording's screen is the one showing (a slowed take would otherwise outlive its shot).
    // …and only after this shot's problem line has been read (the phone is lit): read first, then watch.
    // This shot's own problem line (a later shot's caption must never switch this screen's lift off mid-air).
    const ownPain = caps.find((c) => c.pain && realAt(c.a) >= realAt(rec.from) - 0.5 && c.a < screenEnd(k));
    const lit = ownPain ? E.outC(P(amb, realAt(ownPain.a) + readOf(ownPain) + 0.3, realAt(ownPain.a) + readOf(ownPain) + 0.65)) : 0;
    const nextCap = caps.find((c) => ownPain && c.a > ownPain.a);
    const shown = (screenStack(t, oneApp).find(([id]) => id === k)?.[1] ?? 0) * lit;
    for (const sp of rec.spots ?? []) {
      const v = shown * (rt < sp.at || rt > sp.until ? 0 : Math.min(E.outC(P(rt, sp.at, sp.at + 0.25)), 1 - E.inQ(P(rt, sp.until - 0.3, sp.until))));
      if (v > spotV) { spotV = v; spotC = { x: sp.x, y: sp.y, w: sp.w, h: sp.h }; }
    }
    // Lifts ramp on screen time, not recording time (a held frame would stall them half-way), and are set back down
    // before this screen fades: calm in, hold, calm out.
    for (const l of recLifts ?? []) {
      const a = l.onAt ?? onScreenTime(rec, l.at), b0 = onScreenTime(rec, l.until);
      if (a == null) continue;
      const out = Math.min(realAt(screenEnd(k)) - 0.25, nextCap ? realAt(nextCap.a) - 0.05 : Infinity) - realAt(rec.from);
      const b = Math.min(b0 ?? out, out);
      const v = (lit > 0.99 ? 1 : 0) * Math.min(E.io(P(since, a, a + 0.55)), 1 - E.io(P(since, b - 0.5, b)));
      if (v > liftV) { liftV = v; lifted = { l, id: k }; }
    }
  }

  // touches
  const taps = realTaps.length ? realTaps : MOCK_TAPS.map((k) => ({ ...k, t: realAt(k.t) }));
  const onScreen = (id?: string) => !id || (screenStack(t, oneApp).find(([sid]) => sid === id)?.[1] ?? 0) > 0.5;
  const tch = taps.find((k) => amb > k.t - 0.18 && amb < k.t + 0.55 && onScreen(k.id));

  // The touch dot at (x, y) in screen coordinates — on the phone, or on a lifted piece when the tap lands inside it.
  const touch = (x: number, y: number) => {
    if (!tch) return null;
    const d = amb - tch.t, rp = P(d, 0, 0.5);
    return (
      <>
        <div style={{ position: 'absolute', left: x, top: y, width: 46, height: 46, margin: '-23px 0 0 -23px', borderRadius: '50%', zIndex: 20,
          background: 'rgba(255,255,255,.55)', boxShadow: '0 0 20px rgba(255,255,255,.35)',
          opacity: d < 0 ? (1 + d / 0.18) * 0.9 : Math.max(0, 0.9 - d * 4), transform: `scale(${d < 0 ? 1.15 : 0.9})` }} />
        <div style={{ position: 'absolute', left: x, top: y, width: 46, height: 46, margin: '-23px 0 0 -23px', borderRadius: '50%', zIndex: 19,
          border: '2px solid rgba(243,217,174,.9)', opacity: d > 0 ? (1 - rp) * 0.9 : 0, transform: `scale(${1 + rp * 1.8})` }} />
      </>
    );
  };

  const overlay = (
    <>
      {/* PO 10-01: no dimming while a line is read — the phone just holds still. */}
      {spotC && spotV > 0 && (
        <div style={{
          position: 'absolute', left: spotC.x, top: spotC.y, width: spotC.w, height: spotC.h, borderRadius: 18, zIndex: 21,
          border: '2px solid rgba(214,165,112,.95)', boxShadow: '0 0 34px rgba(201,151,103,.55), inset 0 0 24px rgba(201,151,103,.18)',
          opacity: spotV, transform: `scale(${1.04 - 0.04 * E.outC(Math.min(1, spotV * 1.4))})`,
        }} />
      )}
      {tch && touch(tch.x, tch.y)}
      {/* glare (the CSS phone only — the 3D phone's glass reflects a real studio) */}
      {flatPhone && <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.10) 45%, rgba(255,255,255,0) 60%)', backgroundSize: '300% 100%', backgroundPosition: `${50 + ph.ry * 2.2}% 0` }} />}
      {/* bronze sweep after the turn */}
      {(() => { const swp = P(t, 2.05, 2.7); return swp > 0 && swp < 1 ? (
        <div style={{ position: 'absolute', top: '-10%', bottom: '-10%', width: 120, zIndex: 31, left: L(-160, 460, E.io(swp)), transform: 'skewX(-18deg)',
          background: 'linear-gradient(90deg, rgba(243,217,174,0), rgba(243,217,174,.35), rgba(243,217,174,0))' }} />) : null; })()}
      <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 40, opacity: 0.9 * win(t, 1.4, 2.0, 0.06, 0.3) }} />
    </>
  );

  // The lifted piece: the same recording frame, cropped to the piece, raised toward the camera and grown ~2x,
  // drifting to the screen's centre line so it stays over the phone. Real pixels; nothing is redrawn.
  const liftNode = lifted && liftV > 0 && (() => {
    const { l, id } = lifted, k = l.k ?? 2, e = liftV;
    const dx = (SCREEN_W / 2 - (l.x + l.w / 2)) * e;
    return (
      <div style={{
        position: 'absolute', left: l.x, top: l.y, width: l.w, height: l.h, borderRadius: l.r ?? 16, overflow: 'hidden',
        transform: `translate3d(${dx}px,0px,${90 * e}px) scale(${1 + (k - 1) * e})`,
        boxShadow: `0 ${34 * e}px ${90 * e}px rgba(0,0,0,${0.75 * e}), 0 0 0 1px rgba(186,134,84,${0.35 * e})`,
        opacity: Math.min(1, e * 5),
      }}>
        <Img src={frameSrc(RECS[id], r)} style={{ position: 'absolute', left: -l.x, top: STATUS_H - l.y, width: REC_W, height: REC_H }} />
        {/* A tap that lands on the lifted piece is shown on it (the web loop lifts the set rows while they are logged). */}
        {tch && tch.id === id && tch.x > l.x && tch.x < l.x + l.w && tch.y > l.y && tch.y < l.y + l.h && touch(tch.x - l.x, tch.y - l.y)}
      </div>
    );
  })();

  // floating Legacy cards
  // PO 10-01: two chapters, one either side of the phone — nothing else flies out. PO 10-02: they are the app's own
  // chapter cards (captured by capture/shot-5.mjs), about 2x their size on the phone.
  const CW = portrait ? 430 : 440;
  const CPOS = portrait
    ? [{ x: -228, y: -590, z: 0, ry: 8 }, { x: 228, y: -590, z: 0, ry: -8 }]
    : [{ x: -600, y: -120, z: 0, ry: 12 }, { x: 600, y: -120, z: 0, ry: -12 }];

  const mpos = medalPos(portrait);
  // PO 10-02 "keep it calm": the medal settles in from slightly larger, no spin, no shake.
  const m1 = E.outC(P(t, 15.3, 15.75)), mo = E.inQ(P(t, 17.2, 17.6));

  // The one-app shot is Sun Sep 27 (day 270): the counter jumps there on the cut, well past the quit line.
  const doy = oneApp ? 270 : doyAt(t);
  const pastQuit = doy >= 100;
  let tag = '', tagColor = '#A39C92', tagScale = 1;
  if (oneApp) { tag = `DAY ${doy} · STILL HERE`; tagColor = '#E3B98A'; }
  else if (t > 9.45 && t < 10.55) tag = 'MISSED WEEK';
  else if (pastQuit && t < 16.0) { tag = 'DAY 100 · STILL HERE'; tagColor = '#E3B98A'; tagScale = 1 + 0.18 * Math.exp(-Math.max(0, t - 14.9) * 5); }

  const ep = E.outC(P(t, 17.55, 18.4));
  const endItem = (i: number) => { const p2 = E.outC(P(t, 18.0 + i * 0.25, 18.7 + i * 0.25)); return { opacity: p2, transform: `translateY(${(1 - p2) * 16}px)` }; };
  // The App Store badge is never animated (Apple's rule): it cuts in, still.
  const badgeOn = t >= 18.5;

  return (
    <AbsoluteFill style={{ background: '#030405', overflow: 'hidden', fontFamily: sans }}>
      {cut === 'web' ? <Audio src={staticFile(SCORE_WEB)} /> : cut === 'ad15' ? <Audio src={staticFile(SCORE_AD15)} /> : SCORE && <Audio src={staticFile(SCORE)} />}
      <Background W={W} H={H} t={t} ph={ph} amb={amb} portrait={portrait} />
      <AbsoluteFill style={{ transform: `translate(${shx}px,${shy}px)` }}>
        {/* Legacy cards */}
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d' }}>
            {LEGACY_CARDS.map((card, i) => {
              const a = 14.2 + i * 0.14, p = E.outC(P(t, a, a + 0.7)), o = E.inQ(P(t, 17.25 + i * 0.05, 17.75 + i * 0.05));
              const c = CPOS[i], yOff = portrait ? 260 : 0;
              const x = L(ph.x, c.x, p), y = L(ph.y, c.y + yOff, p) + Math.sin(t * 1.2 + i) * 6 - o * 80, z = L(-300, c.z, p);
              const op = P(t, a, a + 0.2) * (1 - o);
              if (op <= 0) return null;
              return (
                <Img key={i} src={staticFile(card.src)} style={{
                  position: 'absolute', left: -CW / 2, top: -(CW * card.h) / card.w / 2, width: CW, height: (CW * card.h) / card.w,
                  borderRadius: (16 * CW) / card.w, boxShadow: '0 40px 90px rgba(0,0,0,.65), 0 0 0 1px rgba(186,134,84,.35)', opacity: op,
                  transform: `translate3d(${x}px,${y}px,${z}px) rotateY(${c.ry * p}deg) scale(${0.45 + 0.55 * p})`,
                }} />
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
          opacity: (t > 1.4 ? 0.9 * Math.exp(-(t - 1.4) * 4) : 0) + (t > 15.72 ? 0.25 * Math.exp(-(t - 15.72) * 4) : 0) }} />
        {/* phone */}
        <AbsoluteFill style={{ perspective: 2400, filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
          {flatPhone ? (
            <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d' }}>
              <Phone pose={ph} overlay={overlay} lift={liftNode || undefined}><AppScreen t={t} r={r} oneApp={oneApp} /></Phone>
            </div>
          ) : (
            <>
              <AbsoluteFill style={{ perspective: 2400 }}>
                <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d' }}>
                  <PhoneFace pose={ph} overlay={overlay}><AppScreen t={t} r={r} oneApp={oneApp} /></PhoneFace>
                </div>
              </AbsoluteFill>
              <PhoneBody3D W={W} H={H} pose={ph} />
              {liftNode && (
                <AbsoluteFill style={{ perspective: 2400 }}>
                  <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d' }}>
                    <PhoneLift pose={ph} lift={liftNode} />
                  </div>
                </AbsoluteFill>
              )}
            </>
          )}
        </AbsoluteFill>
        {/* medal */}
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d',
            transform: `translate3d(${mpos.x}px,${mpos.y}px,${L(260, 60, m1)}px) scale(${L(1.25, 1, m1) * (1 - mo * 0.2)})` }}>
            <Img src={staticFile(MEDAL.src)} style={{
              position: 'absolute', left: -MEDAL.size / 2, top: -MEDAL.size / 2, width: MEDAL.size, height: MEDAL.size, borderRadius: '50%',
              boxShadow: '0 0 60px rgba(201,151,103,.45), 0 30px 70px rgba(0,0,0,.6)', opacity: P(t, 15.3, 15.5) * (1 - mo),
            }} />
            <div style={{ position: 'absolute', left: -180, top: MEDAL.size / 2 + 18, width: 360, textAlign: 'center', opacity: P(t, 15.8, 16.1) * (1 - mo) }}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '.18em', color: '#BA8654' }}>{MEDAL.eyebrow}</div>
              <div style={{ fontFamily: display, fontSize: 30, fontWeight: 600, color: '#F4EFE6', marginTop: 6 }}>{MEDAL.name}</div>
            </div>
          </div>
        </AbsoluteFill>
        {/* PO 10-02: more of the year — four more real medals beside the chapters, then three accomplishment cards
            rise between the chapters and the phone. Calm: each settles in from slightly larger, one after another. */}
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transformStyle: 'preserve-3d' }}>
            {MORE_MEDALS.map((m, i) => {
              const a = 15.5 + i * 0.13, p = E.outC(P(t, a, a + 0.45)), o = E.inQ(P(t, 17.2, 17.6));
              const S = portrait ? 104 : 110, gx = portrait ? 150 : 170, gy = portrait ? 200 : 190;
              const base = portrait ? { x: 330, y: 75 } : { x: 600, y: 120 };
              const x = base.x + (i % 2 ? gx / 2 : -gx / 2), y = base.y + (i < 2 ? 0 : gy);
              const op = P(t, a, a + 0.15) * (1 - o);
              if (op <= 0) return null;
              return (
                <div key={i} style={{ position: 'absolute', transform: `translate3d(${x}px,${y}px,${L(200, 40, p)}px) scale(${L(1.2, 1, p)})`, opacity: op }}>
                  <Img src={staticFile(m.src)} style={{ position: 'absolute', left: -S / 2, top: -S / 2, width: S, height: S, borderRadius: '50%',
                    boxShadow: '0 0 40px rgba(201,151,103,.35), 0 20px 50px rgba(0,0,0,.6)' }} />
                  <div style={{ position: 'absolute', left: -85, top: S / 2 + 10, width: 170, textAlign: 'center', fontSize: 17, fontWeight: 600, lineHeight: 1.2, color: '#E9E3D8' }}>{m.name}</div>
                </div>
              );
            })}
            {ACCOMPLISHMENTS.map((c, i) => {
              const a = 15.9 + i * 0.15, p = E.outC(P(t, a, a + 0.55)), o = E.inQ(P(t, 17.2, 17.6));
              const AW = portrait ? 150 : 192, AH = (AW * c.h) / c.w, gap = 18;
              const x = (i - 1) * (AW + gap), y = portrait ? -95 : -370;
              const op = P(t, a, a + 0.2) * (1 - o);
              if (op <= 0) return null;
              return (
                <Img key={i} src={staticFile(c.src)} style={{
                  position: 'absolute', left: -AW / 2, top: -AH / 2, width: AW, height: AH, borderRadius: (14 * AW) / c.w, opacity: op,
                  boxShadow: '0 30px 70px rgba(0,0,0,.6), 0 0 0 1px rgba(186,134,84,.35)',
                  transform: `translate3d(${x}px,${y + (1 - p) * 40}px,${L(160, 30, p)}px) scale(${L(1.15, 1, p)})`,
                }} />
              );
            })}
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
        {caps.map((c, i) => <Caption key={i} c={c} x={amb} portrait={portrait} />)}
        {/* end card */}
        <div style={{ position: 'absolute', opacity: ep, transform: `translateY(${(1 - ep) * 30}px)`,
          ...(portrait ? { left: 70, right: 70, top: 170, textAlign: 'center' as const } : { left: 150, top: 290, width: 820 }) }}>
          <div style={{ fontFamily: display, fontSize: 30, letterSpacing: '.42em', fontWeight: 600, background: 'linear-gradient(#F3D9AE,#C99767 55%,#7E5C3B)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{END.wordmark}</div>
          <div style={{ fontFamily: display, fontWeight: 600, fontSize: 104, lineHeight: 1, letterSpacing: '-.02em', marginTop: 28, color: '#F4EFE6' }}>
            {END.headline[0]}<br /><em style={{ fontStyle: 'italic', color: '#D9AB78' }}>{END.headline[1]}</em>
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: '#E3B98A', marginTop: 30, ...endItem(0) }}>{cut === 'web' ? END.web : END.one}</div>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center', marginTop: 44, justifyContent: portrait ? 'center' : undefined }}>
            {/* Not on the web loop: the page offers a TestFlight beta, and the badge said App Store (panel, 10-03). */}
            {cut !== 'web' && <Img src={staticFile('badge/download-on-the-app-store.svg')} style={{ height: 64, opacity: badgeOn ? 1 : 0 }} />}
            <div style={{ fontFamily: mono, fontSize: 24, color: '#E3B98A', letterSpacing: '.06em', ...endItem(1) }}>{END.url}</div>
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, pointerEvents: 'none' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.75))' }} />
    </AbsoluteFill>
  );
};
