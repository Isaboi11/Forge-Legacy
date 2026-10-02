import React from 'react';
import { Img, staticFile } from 'remotion';
import { SCREEN_W } from './Phone';
import { realAt, win, P, E } from './timeline';
import recordings from './recordings.json';

// The status bar is drawn here, not captured: the web build has no safe-area inset, so recordings are taken
// at 402 × 808 and sit below a 54 px bar, exactly where an iPhone app's content starts.
export const STATUS_H = 54;
export const REC_W = 402;
export const REC_H = 808;

export const StatusBar: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const c = dark ? '#1C1C1E' : '#F2EEE7';
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 0, height: STATUS_H, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '6px 34px 0 44px', fontSize: 16, fontWeight: 600, color: c, zIndex: 45,
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {[5, 8, 11, 14].map((h) => <b key={h} style={{ display: 'block', width: 4, height: h, background: c, borderRadius: 1 }} />)}
        <span style={{ width: 26, height: 12, border: `1.5px solid ${c}`, borderRadius: 4, padding: 1.5, marginLeft: 4 }}>
          <i style={{ display: 'block', height: '100%', width: '78%', background: c, borderRadius: 1.5 }} />
        </span>
      </span>
    </div>
  );
};

/* ---------- the grey, unbranded "other app" in shot 1. Not a real product, names nobody. ---------- */
export const OldApp: React.FC<{ t: number }> = ({ t }) => (
  <div style={{
    position: 'absolute', inset: 0, background: '#EDEDF0', color: '#1C1C1E', fontFamily: 'Inter, -apple-system, sans-serif',
    filter: `grayscale(1) brightness(${1 - 0.5 * P(t, 1.0, 1.4)})`,
  }}>
    <StatusBar dark />
    <div style={{ position: 'absolute', left: 24, top: 72, fontSize: 32, fontWeight: 700, letterSpacing: '-.01em' }}>Workouts</div>
    <div style={{ position: 'absolute', left: 20, right: 20, top: 136, height: 340, borderRadius: 22, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
      <svg style={{ position: 'absolute', left: '50%', top: 34, marginLeft: -30 }} width="60" height="74" viewBox="0 0 60 74">
        <path d="M30 2C34 18 52 26 52 46a22 22 0 0 1-44 0c0-12 8-18 10-28 4 6 6 10 6 14 4-8 6-18 6-30z" fill="#D1D1D6" />
        <path d="M22 30l10 12-6 6 10 14" stroke="#EDEDF0" strokeWidth="3" fill="none" />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 118, textAlign: 'center', fontSize: 104, fontWeight: 800, lineHeight: 1, color: '#C7C7CC' }}>0</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', fontSize: 16, color: '#8E8E93', letterSpacing: '.04em' }}>DAY STREAK</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 272, textAlign: 'center', fontSize: 18, fontWeight: 600, color: '#3A3A3C' }}>You lost your 23-day streak.</div>
    </div>
    <div style={{ position: 'absolute', left: 20, right: 20, top: 500, height: 56, borderRadius: 14, background: '#D1D1D6', color: '#3A3A3C', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>Start over</div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 574, textAlign: 'center', color: '#8E8E93', fontSize: 14 }}>Day 1 of a new streak</div>
  </div>
);

/* ---------- real recordings ----------
   recordings.json is written by the capture scripts: { shotId: { dir, frames, fps, from } } where `from` is the
   film time at which recording frame 0 is on screen. The recording then plays in REAL time, so a reading hold
   (which freezes the choreography) does not freeze the app — the app is dimmed during holds anyway. */
// `pauses`: [recordingSecond, extraSeconds]. Positive = hold that exact frame longer (only where the real screen is
// still, so the hold shows exactly what the app shows). Negative = SKIP that many seconds of the recording — a cut
// over dead air (waiting on the model, navigating), never over anything that changes what the app did.
// `spots`: bronze outline on part of the real screen, in recording seconds, in screen coordinates (status bar incl.).
// `lifts`: PO 10-02 zoom-outs — ONE key piece of the real screen per shot is lifted off the phone, ~2× (`k`), and set
// back. Same timing and coordinates as a spot; `r` is the piece's own corner radius so the crop keeps its shape.
export type Spot = { at: number; until: number; x: number; y: number; w: number; h: number };
export type Lift = Spot & { k?: number; r?: number };
export type Rec = {
  dir: string; frames: number; fps: number; from: number;
  pauses?: [number, number][]; taps?: { at: number; x: number; y: number }[]; spots?: Spot[]; lifts?: Lift[];
  // `slow`: [fromRec, toRec, factor] — play that stretch `factor`× slower. Used ONLY to undo a capture artefact:
  // the logger's rest countdown runs ~2× fast under the fake clock, so at 2× slow it reads as the app really runs.
  slow?: [number, number, number];
  // `dissolves`: recording seconds where the take CUTS (a wait happened between two frames). PO 10-02 "smoother":
  // the frame before the cut fades out over the one after, instead of a hard jump.
  dissolves?: number[];
};
export const RECS = recordings as unknown as Record<string, Rec>;
const sorted = (rec: Rec) => [...(rec.pauses ?? [])].sort((a, b) => a[0] - b[0]);

/** Seconds since the take started on screen → the recording's own second, honouring holds and skips. */
export function recTime(rec: Rec, sinceStart: number): number {
  let p = sinceStart;
  if (rec.slow) {
    const [a, b, k] = rec.slow;
    const pa = onScreenNoSlow(rec, a);
    if (pa != null && p > pa) {
      const span = (b - a) * k;
      if (p <= pa + span) return a + (p - pa) / k;
      p -= span - (b - a);
    }
  }
  for (const [at, extra] of sorted(rec)) {
    if (p <= at) break;
    if (extra > 0) { if (p <= at + extra) return at; p -= extra; }
    else p -= extra; // a skip: the recording jumps ahead
  }
  return p;
}
/** The inverse: a recording second → seconds since the take started on screen; null if it was cut out. */
export function onScreenTime(rec: Rec, recSec: number): number | null {
  const base = onScreenNoSlow(rec, recSec);
  if (base == null || !rec.slow) return base;
  const [a, b, k] = rec.slow;
  if (recSec <= a) return base;
  return recSec < b ? base + (recSec - a) * (k - 1) : base + (b - a) * (k - 1);
}
function onScreenNoSlow(rec: Rec, recSec: number): number | null {
  let shift = 0;
  for (const [at, extra] of sorted(rec)) {
    if (at >= recSec) break;
    if (extra < 0 && recSec < at - extra) return null; // inside a skipped stretch
    shift += extra;
  }
  return recSec + shift;
}

const LABELS: Record<string, [string, string]> = {
  home: ['Home · Jan 19', "Today's Workout · Lower A · Start Workout"],
  tap: ['Logger · Back Squat', 'Sets 2–4 in three taps → NEW PERSONAL RECORD 225 × 5 → Rest'],
  coach: ['Coach Holt · Feb 10', '"Bench has been stuck at 225 for three weeks." → reply → Do it → Updated by Holt'],
  missed: ['Activity History · March', 'Mar 9–15 empty → Home: WELCOME BACK · Good to see you, Jordan.'],
  squad: ['Squads · Ironside', '6 / 6 trained today'],
  story: ['Legacy · Oct', 'Sealed chapters · the two chapters float out · 1,000 Pound Club medal'],
};

/** The recording's frame on screen at real time r. */
export function frameSrc(rec: Rec, r: number) {
  const f = Math.max(0, Math.min(rec.frames - 1, Math.floor(recTime(rec, r - realAt(rec.from)) * rec.fps)));
  return staticFile(`${rec.dir}/f${String(f).padStart(5, '0')}.jpg`);
}

export const RecordingOrPlaceholder: React.FC<{ id: string; r: number }> = ({ id, r }) => {
  const rec = RECS[id];
  if (rec) {
    const rt = recTime(rec, r - realAt(rec.from));
    const D = 0.45;
    const d = (rec.dissolves ?? []).find((c) => rt >= c && rt < c + D);
    const img = { position: 'absolute' as const, left: 0, top: STATUS_H, width: REC_W, height: REC_H };
    return (
      <>
        <Img src={frameSrc(rec, r)} style={img} />
        {d != null && (
          <Img src={staticFile(`${rec.dir}/f${String(Math.max(0, Math.floor(d * rec.fps) - 1)).padStart(5, '0')}.jpg`)}
            style={{ ...img, opacity: 1 - E.io((rt - d) / D) }} />
        )}
      </>
    );
  }
  const [a, b] = LABELS[id] ?? [id, ''];
  return (
    <div style={{
      position: 'absolute', left: 0, top: STATUS_H, width: SCREEN_W, height: REC_H, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14, padding: 36, textAlign: 'center',
      background: 'repeating-linear-gradient(135deg,#0B0E11 0 18px,#0E1216 18px 36px)', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ fontSize: 12, letterSpacing: '.18em', color: '#BA8654', fontWeight: 600 }}>REAL SCREEN GOES HERE</div>
      <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 30, color: '#F2EEE7', fontWeight: 600 }}>{a}</div>
      <div style={{ fontSize: 16, color: '#A39C92', lineHeight: 1.4 }}>{b}</div>
    </div>
  );
};

/* Which app screen is showing, film time → [id, opacity]. Same windows as the mock-up's scene() calls. */
export function screenStack(t: number): [string, number][] {
  const s = (a: number, b: number) => win(t, a, b, 0.28, 0.28);
  return [
    ['tap', s(1.75, 5.7)], // PO 10-01: no Home screen — the logger is what the phone turns into
    ['coach', s(5.6, 9.15)],
    ['missed', s(9.05, 11.7)],
    ['squad', s(11.45, 14.25)], // PO 10-02
    ['story', s(14.05, 21)],
  ];
}

/** Film time at which a screen's window closes (its fade-out ends). */
export const screenEnd = (id: string) => ({ tap: 5.7, coach: 9.15, missed: 11.7, squad: 14.25, story: 21 } as Record<string, number>)[id] ?? 21;

export const AppScreen: React.FC<{ t: number; r: number }> = ({ t, r }) => {
  return (
    <>
      {t < 1.75 && <OldApp t={t} />}
      {t >= 1.75 && (
        <>
          <StatusBar />
          {screenStack(t).map(([id, v]) => v > 0 && (
            <div key={id} style={{ position: 'absolute', inset: 0, opacity: v, transform: `translateY(${(1 - E.outC(Math.min(1, v * 1.5))) * 30}px)` }}>
              <RecordingOrPlaceholder id={id} r={r} />
            </div>
          ))}
        </>
      )}
    </>
  );
};
