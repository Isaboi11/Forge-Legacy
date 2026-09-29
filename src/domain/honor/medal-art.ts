/**
 * Honor medal artwork — the engraved face that fills the honor medallion's recess.
 *
 * A port of the design's engine (`forge-honor-art.js`, Honor Medals spec, 2026-09-25). Every medal is
 * composed from layers on one 64×64 grid, so 177 medals read as one set:
 *
 *   FRAME   — the category silhouette (struck face only)
 *   MARK    — the engraved figure at the centre, one per honor family
 *   EXERGUE — the threshold under a hairline rule, like a coin's denomination (struck face only)
 *   TIER    — the apex (tier 4) gains the metallic sweep and a twelve-ray corona
 *
 * Two faces, as the spec rules them: CLEAN (one engraved mark, nothing else) ships on the hub, the
 * timeline and toasts — the screen's grouping already says the category and the label says the number.
 * STRUCK (the full coin) is for one medal shown large, where there is no label doing that work.
 *
 * Nothing sits ON the disc: every layer is cut INTO it. Light falls from above, so each groove is drawn
 * three times — a dark pass nudged up, a warm catch nudged down, then the bronze body between.
 *
 * ⚠ ONE DELIBERATE DEPARTURE FROM THE ENGINE: it colours those passes through `color` + `currentColor`
 * inheritance. react-native-svg does not reliably inherit `color` through nested groups on device, so
 * every pass here writes its stroke (and the exergue its fill) explicitly. Same pixels, no inheritance.
 * Geometry — frames, marks, fitting, transforms — is the engine's, number for number.
 *
 * Pure: no React, no platform imports. `medalSvg` returns an SVG string for `SvgXml`, or null for an
 * honor the design has no medal for (the caller keeps its category glyph).
 */

import { CORONA, FILL, FIT, FRAMES, FRAME_OF, MARKS, MEDALS, type MedalTier } from './medal-data.ts';
import { FINE, SYMBOLS } from './symbol-data.ts';

export type MedalFace = 'clean' | 'struck';

// ── geometry + material: the engine's GEOM and TIERS, verbatim ────────────────────────────────────
const GEOM = {
  frameStroke: 1.5,
  markBox: {
    rope: { ex: [34, 26, 22], noEx: [38, 38, 32] },
    flute: { ex: [34, 26, 22], noEx: [38, 38, 32] },
    hex: { ex: [38, 26, 22], noEx: [42, 38, 32] },
    tablet: { ex: [27, 26, 22], noEx: [29, 40, 32] },
    lozenge: { ex: [30, 24, 22], noEx: [32, 34, 32] },
    shield: { ex: [32, 24, 22], noEx: [34, 34, 31] },
    chevron: { ex: [34, 24, 22], noEx: [36, 33, 34] },
    octagon: { ex: [36, 26, 22], noEx: [40, 38, 32] },
    star8: { ex: [29, 24, 22], noEx: [32, 32, 32] },
    vesica: { ex: [29, 24, 22], noEx: [31, 34, 32] },
    quatrefoil: { ex: [34, 26, 22], noEx: [38, 38, 32] },
    laurel: { ex: [34, 26, 22], noEx: [38, 38, 32] },
    crown: { ex: [32, 24, 22], noEx: [35, 31, 34] },
    eclipse: { ex: [34, 26, 22], noEx: [38, 38, 32] },
  } as Record<string, { ex: readonly number[]; noEx: readonly number[] }>,
  mark: { stroke: 3.2, maxScale: 2.6 },
  exergue: { ruleY: 43.4, ruleX: [24, 40], ruleStroke: 0.8, ruleOpacity: 0.45, baseline: 52.4, size: 11.2, tracking: 0.2 },
  cleanBox: [34, 34, 32] as readonly number[],
  cleanStroke: 3.1,
  engrave: {
    depth: 0.58,
    frameDepth: 0.34,
    textDepth: 0.34,
    shadow: 'rgba(0,0,0,0.66)',
    shadowOpacity: 0.85,
    light: 'rgb(214,176,124)',
    lightOpacity: 0.62,
    frameLightOpacity: 0.3,
    textLightOpacity: 0.42,
  },
};

const BRONZE = { ink: '#BF8F4F', top: '#9A7340', bot: '#D0A263' };
const TIERS: Record<MedalTier, { ink: string; top: string; bot: string; frame: number; corona: boolean }> = {
  1: { ...BRONZE, frame: 0.6, corona: false },
  2: { ...BRONZE, frame: 0.6, corona: false },
  3: { ...BRONZE, frame: 0.6, corona: false },
  4: { ink: '#C79A5C', top: '#A07B44', bot: '#DCB478', frame: 0.66, corona: true },
};

const GRAD_ID: Record<MedalTier | 'apex', string> = {
  1: 'fl-medal-t1',
  2: 'fl-medal-t2',
  3: 'fl-medal-t3',
  4: 'fl-medal-t4',
  apex: 'fl-medal-apex',
};

/** Two decimals, as the engine writes every coordinate. */
function n(v: number): number {
  return Math.round(v * 100) / 100;
}

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Spec {
  face: MedalFace;
  frame: string;
  mark: string | null;
  ex: string;
  tier: MedalTier;
}

/** The medal spec for an app honor slug, or null when the design has no medal for it. */
export function medalSpec(slug: string, face: MedalFace = 'clean'): Spec | null {
  const rec = MEDALS[slug];
  if (!rec) return null;
  const [, cat, mark, ex, tier] = rec;
  return {
    face,
    frame: FRAME_OF[cat] ?? 'rope',
    mark: SYMBOLS[mark] || MARKS[mark] ? mark : null,
    ex: ex || '',
    tier: TIERS[tier] ? tier : 2,
  };
}

export function hasMedal(slug: string | null | undefined): boolean {
  return !!slug && !!MEDALS[slug];
}

// ── layers — one builder each, in strike order ───────────────────────────────────────────────────
function frameLayer(spec: Spec): string {
  if (spec.face === 'clean') return '';
  return `<g stroke-width="${GEOM.frameStroke}" opacity="${TIERS[spec.tier].frame}">${FRAMES[spec.frame]}</g>`;
}

/*
 * ══ THE FORGE HONOR SYMBOLS (PO 2026-09-29) — "symbols inside medals" ══
 * The figure at the centre is now the Honor Symbols delivery (`symbol-data.ts`), not the engine's mark;
 * frames, exergue and corona are the engine's, untouched. The symbols are an icon SET drawn on one 24×24
 * grid with a 2-unit margin, so every one is fitted by that same box — optical weight stays even across
 * the set, which a per-figure bounding box would undo. Two weights, as drawn: main, and fine at the
 * design's .7/1.35 of it. Round caps and joins, as drawn — the engine's square caps would chip them.
 */
const SYMBOL_BOX = [2, 2, 20, 20] as const;
const SYMBOL_STROKE = { clean: 2.5, struck: 2.3 };
const SYMBOL_FINE_RATIO = 0.7 / 1.35;

function symbolLayer(spec: Spec, art: string): string {
  let box: readonly number[];
  if (spec.face === 'clean') box = GEOM.cleanBox;
  else {
    const mb = GEOM.markBox[spec.frame] ?? GEOM.markBox.rope;
    box = spec.ex ? mb.ex : mb.noEx;
  }
  const b = SYMBOL_BOX;
  const s = Math.min(box[0] / b[2], box[1] / b[3], GEOM.mark.maxScale);
  const tx = n(32 - s * (b[0] + b[2] / 2));
  const ty = n(box[2] - s * (b[1] + b[3] / 2));
  const main = SYMBOL_STROKE[spec.face] / s;
  const body = art.split(FINE).join(String(n(main * SYMBOL_FINE_RATIO)));
  return `<g transform="translate(${tx},${ty}) scale(${n(s)})" stroke-width="${n(main)}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
}

function markLayer(spec: Spec): string {
  if (!spec.mark) return '';
  const art = SYMBOLS[spec.mark];
  if (art) return symbolLayer(spec, art);
  let box: readonly number[];
  let stroke = GEOM.mark.stroke;
  if (spec.face === 'clean') {
    box = GEOM.cleanBox;
    stroke = GEOM.cleanStroke;
  } else {
    const mb = GEOM.markBox[spec.frame] ?? GEOM.markBox.rope;
    box = spec.ex ? mb.ex : mb.noEx;
  }
  const b = FIT[spec.mark] ?? [0, 0, 24, 24];
  const s = Math.min(box[0] / b[2], box[1] / b[3], GEOM.mark.maxScale);
  const tx = n(32 - s * (b[0] + b[2] / 2));
  const ty = n(box[2] - s * (b[1] + b[3] / 2));
  return `<g transform="translate(${tx},${ty}) scale(${n(s)})" stroke-width="${n(stroke / s)}">${MARKS[spec.mark]}</g>`;
}

function exergueLayer(spec: Spec, fontFamily: string): string {
  if (!spec.ex || spec.face === 'clean') return '';
  const E = GEOM.exergue;
  return (
    `<path d="M${E.ruleX[0]} ${E.ruleY}H${E.ruleX[1]}" stroke-width="${E.ruleStroke}" opacity="${E.ruleOpacity}"/>` +
    `<text x="32" y="${E.baseline}" text-anchor="middle" fill="${FILL}" stroke="none" opacity="1"` +
    ` font-family="${esc(fontFamily)}" font-size="${E.size}" letter-spacing="${E.tracking}">${esc(spec.ex)}</text>`
  );
}

function tierLayer(spec: Spec): string {
  if (spec.face === 'clean') return '';
  return TIERS[spec.tier].corona ? CORONA : '';
}

/**
 * The gradient id for this medal INSTANCE. ⚠ Unique per instance, never the engine's shared ids: on web
 * these are DOM ids, and a `url(#x)` resolving into a hidden tab screen paints nothing (the same trap
 * `EngravedIcon` documents).
 */
function gradId(tier: MedalTier, instance: string): string {
  return `${tier === 4 ? GRAD_ID.apex : GRAD_ID[tier]}-${instance}`;
}

/**
 * Shadow above, warm catch below, bronze body between — each pass coloured explicitly. `FILL` (the
 * exergue's figures, the frames' solid beads) takes the pass's colour, as `currentColor` did.
 */
function engrave(body: string, opts: { ink: string; paint: string; depth?: number; lightOpacity?: number }): string {
  if (!body) return '';
  const E = GEOM.engrave;
  const d = opts.depth ?? E.depth;
  const pass = (fill: string) => body.split(FILL).join(fill);
  return (
    `<g transform="translate(0,${-d})" stroke="${E.shadow}" opacity="${E.shadowOpacity}">${pass(E.shadow)}</g>` +
    `<g transform="translate(0,${d})" stroke="${E.light}" opacity="${opts.lightOpacity ?? E.lightOpacity}">${pass(E.light)}</g>` +
    `<g stroke="${opts.paint}">${pass(opts.ink)}</g>`
  );
}

function vgrad(id: string, from: string, mid: string, to: string): string {
  return (
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="32" y1="6" x2="32" y2="58">` +
    `<stop offset="0%" stop-color="${from}"/><stop offset="50%" stop-color="${mid}"/>` +
    `<stop offset="100%" stop-color="${to}"/></linearGradient>`
  );
}

/** Only the paint this medal uses. Every medal carries its own defs (no shared sprite on native). */
function defsFor(tier: MedalTier, id: string): string {
  if (tier === 4) {
    return (
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="9" y1="7" x2="55" y2="57">` +
      '<stop offset="0%" stop-color="#6B5335"/><stop offset="34%" stop-color="#A9803F"/>' +
      '<stop offset="50%" stop-color="#CFA76D"/><stop offset="66%" stop-color="#A9803F"/>' +
      '<stop offset="100%" stop-color="#5E4A30"/></linearGradient>'
    );
  }
  const t = TIERS[tier];
  return vgrad(id, t.top, t.ink, t.bot);
}

function inner(spec: Spec, fontFamily: string, gid: string): string {
  const t = TIERS[spec.tier];
  const paint = `url(#${gid})`;
  const E = GEOM.engrave;
  let s = '<g fill="none" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="8">';
  if (spec.face === 'clean') {
    s += engrave(markLayer(spec), { ink: t.ink, paint });
  } else {
    // The rim is the medal's own edge, not an engraving — it sits proud.
    const rim = tierLayer(spec);
    if (rim) s += `<g stroke="${t.ink}">${rim}</g>`;
    s += engrave(frameLayer(spec), { ink: t.ink, paint, depth: E.frameDepth, lightOpacity: E.frameLightOpacity });
    s += engrave(markLayer(spec), { ink: t.ink, paint });
    s += engrave(exergueLayer(spec, fontFamily), { ink: t.ink, paint, depth: E.textDepth, lightOpacity: E.textLightOpacity });
  }
  return s + '</g>';
}

/**
 * The medal as a standalone SVG document (viewBox 64×64), or null when the honor has no medal.
 * `fontFamily` is the exergue's typeface — the app's display serif (struck face only). `instance` makes
 * the gradient id unique to this rendering (pass React's `useId()`).
 */
export function medalSvg(
  slug: string,
  opts: { face?: MedalFace; fontFamily?: string; instance?: string } = {},
): string | null {
  const spec = medalSpec(slug, opts.face ?? 'clean');
  if (!spec || !spec.mark) return null;
  const gid = gradId(spec.tier, (opts.instance ?? 'm').replace(/[^a-zA-Z0-9_-]/g, ''));
  return (
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs>${defsFor(spec.tier, gid)}</defs>` +
    inner(spec, opts.fontFamily ?? 'Georgia', gid) +
    '</svg>'
  );
}
