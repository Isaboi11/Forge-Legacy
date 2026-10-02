// The film's clock, ported verbatim from the approved mock-up (artifact CYw5vmuyKNaJi6iVEPvS3d).
// "Film time" t runs 0..20 and drives every move; reading HOLDS stretch it into ~29 s of real time,
// so a caption can sit still long enough to read without the choreography being re-timed.

export const DUR = 20;

export const E = {
  lin: (x: number) => x,
  inQ: (x: number) => x * x,
  outQ: (x: number) => 1 - (1 - x) * (1 - x),
  inC: (x: number) => x * x * x,
  outC: (x: number) => 1 - Math.pow(1 - x, 3),
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  io4: (x: number) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outBack: (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
};
export type Ease = keyof typeof E;

export const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const P = (t: number, a: number, b: number) => cl((t - a) / (b - a));
export const L = (a: number, b: number, p: number) => a + (b - a) * p;
export const win = (t: number, a: number, b: number, fi = 0.3, fo = 0.3) =>
  t < a || t > b ? 0 : Math.min(E.outC(P(t, a, a + fi)), 1 - E.inQ(P(t, b - fo, b)));

/* Reading holds: [filmStart, filmEnd, extra real seconds]. A negative extra is a cut:
   [11.45, 13.95] (the old squad shot) takes no real time at all. */
// PO 10-01, second pass: "simplify… someone watching will see and understand right away" — one action per shot.
// Shot 2 is one tap → the record; shot 3 is Jordan's message → Holt's proposal. Earlier notes, still true:
// PO 10-01 after the first rough cut: "the home screen and the first active workout screen … should be seen
// for a little longer. Feels really rushed." → Home +1.0 s ([2.15, 2.2]), the lit squat screen +0.8 s ([2.85, 2.9]
// 2.0 → 2.8), and shot 2's logging +2.0 s ([5.3, 5.35]) so the record card and the rest ring can be read. Shot 3 +2.0 s
// ([7.0, 7.05]) for the simplified Holt exchange (one message, the proposal, "Changed").
export const HOLDS: [number, number, number][] = [
  [0.55, 1.3, 1.0], [2.15, 2.2, 1.0], [2.85, 2.9, 2.8], [5.3, 5.35, 0.6], [5.78, 5.82, 2.0], [7.0, 7.05, 1.15], [9.35, 9.4, 2.0], [10.95, 11.3, 0.6],
  [11.45, 13.95, -2.5], [13.97, 14.0, 2.0], [14.9, 15.0, 0.45], [16.75, 17.2, 0.6], [18.7, 20, 1.0],
];
const KN: [number, number][] = [[0, 0]];
(() => {
  let rr = 0, ff = 0;
  for (const h of HOLDS) {
    rr += h[0] - ff; KN.push([rr, h[0]]);
    rr += h[1] - h[0] + h[2]; KN.push([rr, h[1]]);
    ff = h[1];
  }
  rr += DUR - ff; KN.push([rr, DUR]);
})();
export const RDUR = KN[KN.length - 1][0];
function mapK(v: number, i: 0 | 1, j: 0 | 1) {
  for (let k = 1; k < KN.length; k++) {
    if (v <= KN[k][i]) {
      const a = KN[k - 1], b = KN[k], span = b[i] - a[i];
      return span ? a[j] + (b[j] - a[j]) * ((v - a[i]) / span) : b[j];
    }
  }
  return KN[KN.length - 1][j];
}
export const filmAt = (r: number) => mapK(r, 0, 1);
export const realAt = (f: number) => mapK(f, 1, 0);

type Keys = Record<string, number>;
type Track = [number, Keys, Ease][];
export function buildTrack(keys: [number, Keys, Ease?][]): Track {
  let acc: Keys = {};
  return keys.map((k) => { acc = { ...acc, ...k[1] }; return [k[0], { ...acc }, k[2] ?? 'io'] as [number, Keys, Ease]; });
}
export function sample(tr: Track, t: number): Keys {
  if (t <= tr[0][0]) return tr[0][1];
  for (let i = 1; i < tr.length; i++) {
    if (t <= tr[i][0]) {
      const a = tr[i - 1][1], b = tr[i][1], p = E[tr[i][2]](P(t, tr[i - 1][0], tr[i][0]));
      const o: Keys = {};
      for (const k in b) o[k] = L(a[k], b[k], p);
      return o;
    }
  }
  return tr[tr.length - 1][1];
}
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- phone path ---------- */
const PT = buildTrack([
  [0.0, { x: 300, y: 10, z: 0, rx: 3, ry: 344, rz: 0, s: 0.96 }],
  [1.38, { y: 0, rx: 4, ry: 350, s: 1 }, 'lin'],
  [1.75, { y: -50, z: 160, rx: 8, ry: 170 }, 'inQ'],
  [2.15, { y: 0, z: 0, rx: 6, ry: -12 }, 'outC'],
  [2.4, { rx: 6, ry: -14 }],
  [2.75, { x: 320, rx: 4, ry: -8, s: 1.06 }],
  [5.3, { rx: 3, ry: -4, s: 1.08 }],
  [5.75, { x: 300, rx: 4, ry: 16, rz: -1, s: 1.04 }],
  [8.9, { rx: 3, ry: 10, s: 1.07 }],
  [9.3, { rx: 6, ry: -20, rz: 1, s: 1.02 }],
  [11.3, { ry: -14, s: 1.04 }],
  [14.0, { ry: -14, s: 1.04 }],
  [14.85, { x: 0, y: 40, rx: 8, ry: 0, rz: 0, s: 0.64 }, 'io4'],
  [17.3, { y: 30, ry: -6, s: 0.62 }],
  [18.15, { x: 470, y: 20, rx: 5, ry: -20, s: 0.8 }],
  [20.0, { x: 480, rx: 4, ry: -15, s: 0.8 }],
]);
export type Pose = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number };
export function pose(t: number, portrait: boolean): Pose {
  const p = { ...sample(PT, t) } as Pose;
  if (portrait) {
    const endMix = E.io(P(t, 17.3, 18.15));
    p.x = L(p.x * 0.08, 0, endMix);
    p.y = p.y + 230 + 30 * P(t, 14, 14.8) + endMix * 160;
    p.s *= 1.05;
  } else p.s *= 0.9;
  return p;
}

/* ---------- date counter (day of year) ----------
   Changed from the mock-up: shot 2 is filmed on Mon Jan 19, so the counter steps 5 → 19 during the turn
   (a first-ever lift can't be a record; Jordan's 225 × 5 beats a 215 × 5 from Jan 15). */
const DT = buildTrack([
  [0, { d: 5 }], [1.4, { d: 5 }], [2.45, { d: 19 }, 'io'], [5.35, { d: 19 }], [5.8, { d: 41 }],
  [9.1, { d: 41 }], [9.3, { d: 65 }], [9.45, { d: 65 }], [10.55, { d: 75 }, 'lin'], [14.15, { d: 75 }],
  [14.9, { d: 100 }, 'io'], [15.0, { d: 100 }], [17.0, { d: 365 }, 'io'],
]);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function doyLabel(d: number) {
  d = Math.max(1, Math.min(365, Math.round(d)));
  let m = 0;
  while (d > MD[m]) { d -= MD[m]; m++; }
  return MONTHS[m] + ' ' + d;
}
export const doyAt = (t: number) => sample(DT, t).d;

/* ---------- captions ---------- */
export type Spot = { x: number; y: number; w: number; h: number };
export type Cap = { a: number; b: number; text: string; pain?: string; spot?: Spot; wide?: boolean };
export const CAPS: Cap[] = [
  // PO 10-01: generic to any time of year (research: a median 70% gone within 100 days — the notch on the counter),
  // and an answer as the phone turns into Forge Legacy.
  { a: 0.25, b: 1.45, text: 'Most people quit their workout app *within 100 days.*' },
  { a: 1.95, b: 2.5, text: "Let's *change that.*" },
  { a: 2.85, b: 5.45, pain: 'Logging felt like homework.', text: 'One tap *per set.*' }, // outlines come from the take
  { a: 5.78, b: 8.95, pain: 'Stuck for weeks.', text: 'Your AI coach *gets you unstuck.*' }, // PO 10-01
  { a: 9.35, b: 11.4, pain: 'Miss a week, start over.', text: 'Miss a week. *Keep your progress.*' },
  { a: 13.97, b: 17.4, pain: 'Numbers nobody looks at.', text: 'A year that tells *your story.*', wide: true },
];

/* ---------- shots (film time) ---------- */
export const SHOTS = [
  { id: 'gap', a: 0, b: 2.5 },
  { id: 'tap', a: 2.5, b: 5.6 },
  { id: 'coach', a: 5.6, b: 9.1 },
  { id: 'missed', a: 9.1, b: 11.45 },
  { id: 'story', a: 13.95, b: 17.6 },
  { id: 'promise', a: 17.6, b: 20 },
] as const;
export type ShotId = (typeof SHOTS)[number]['id'];
