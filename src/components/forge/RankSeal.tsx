/**
 * RankSeal — the vector Forged Seal, ported from `Forge Rank Seal.dc.html` (the design's `{{ seal }}`).
 *
 * WHY vector: the raster hexagonal badges (`assets/artwork/ranks/<family>-<level>.png`) ship with an
 * alpha-flatten (opaque backing → black square) and have NO clean master. This circular seal is the
 * design's actual method and is transparent by construction (a circle, not a bounding box).
 *
 * Hybrid, exactly like the .dc: a VECTOR frame (machined rings, bevel gradient, curved rank text,
 * recessed disc) + ONE raster flame (`seal-flame.png` — the design's `rank-bowlfire` with its filter
 * baked in once, soft alpha retained), composited **clipped to the disc circle** so it can never box.
 * react-native-svg has no `mix-blend-mode`, so the two blends are approximated on the dark disc:
 *   screen glow → a bronze radial drawn normally · multiply vignette → a dark stroke at opacity.
 *
 * Parametric: `family` sets the arc text + the accent palette; `level` (1–4) warms the seal via the
 * glow opacity (the flame raster stays constant, the warmth is all vector).
 *
 * Per-family COLOR — SOURCED ONLY (FORGE_DELTAS §17/§18, ruling A): the design sources exactly ONE
 * non-bronze family seal — **legend/hall = gold** (its badge chrome: diamonds #D6AA5A, rim
 * #F4DCA6→#9A7038, text #E4C489/#B98F4D). Every other family is **bronze by spec** ("held inside a
 * machined bronze seal") — not a gap. A richer 7-family palette is NOT sourced anywhere portable (the
 * raster art is flattened, the accent palette is a global user theme) → DEFERRED-until-authored, never
 * invented here.
 */
import React from 'react';
import { flColor } from '@/constants/foundation';
import Svg, {
  Circle, ClipPath, Defs, G, Image as SvgImage, LinearGradient, Path, RadialGradient, Rect, Stop, Text, TextPath,
} from 'react-native-svg';

const FLAME = require('@/assets/artwork/ranks/seal-flame.png');
const ROMAN = ['I', 'II', 'III', 'IV'] as const;

/** The recolorable elements of the seal frame. The near-black structural rings stay constant. */
interface SealAccent {
  bevel: readonly [string, string, string, string, string]; // rim bevel gradient, brightest → darkest
  glowInner: string; // flame-heat radial, centre colour (opacity is tier-driven)
  glowMid: string;
  textTop: string; // family arc text
  textBottom: string; // tier arc text
  diamond: string; // side diamond ticks
  knurl: string; // dashed machined edge stroke
  rimHi: string; // rgba rim highlight hairline
  groove: string; // rgba recessed-groove hairlines
  discRing: string; // inner disc ring stroke
}

/** Bronze — the spec default and the palette for six of the seven families. */
const BRONZE: SealAccent = {
  bevel: ['#DDB578', '#C0904F', '#8A6C46', '#5C452E', '#463526'],
  glowInner: flColor.bronze300,
  glowMid: '#BA8654',
  textTop: '#C99767',
  textBottom: '#BA8654',
  diamond: '#BA8654',
  knurl: '#6A5334',
  rimHi: 'rgba(222,190,148,0.35)',
  groove: 'rgba(181, 138, 97,0.30)',
  discRing: '#8A6C46',
};

/** Gold — the ONLY sourced non-bronze family seal (legend/hall), from the Legends badge chrome. */
const GOLD: SealAccent = {
  bevel: ['#F4DCA6', '#E4C489', '#D6AA5A', '#B98F4D', '#9A7038'],
  glowInner: '#F4DCA6',
  glowMid: '#D6AA5A',
  textTop: '#E4C489',
  textBottom: '#B98F4D',
  diamond: '#D6AA5A',
  knurl: '#7A6030',
  rimHi: 'rgba(244,220,166,0.35)',
  groove: 'rgba(212,170,90,0.30)',
  discRing: '#9A7038',
};

/** family → accent. Only legend/hall is non-bronze; everything else falls through to bronze. */
const SEAL_ACCENT: Record<string, SealAccent> = { legend: GOLD, hall: GOLD };

export function RankSeal({ size = 300, family = 'Foundation', level = 1 }: { size?: number; family?: string; level?: 1 | 2 | 3 | 4 }) {
  const lvl = Math.max(1, Math.min(4, level));
  const acc = SEAL_ACCENT[family.toLowerCase()] ?? BRONZE;
  // Warmth rises with the sub-rank — modulated ONLY in the vector glow opacity (flame raster is constant).
  const glowInnerOp = 0.34 + (lvl - 1) * 0.15; // I 0.34 → IV 0.79
  const glowMidOp = 0.1 + (lvl - 1) * 0.05;

  return (
    <Svg width={size} height={size} viewBox="0 0 620 620">
      <Defs>
        <RadialGradient id="discGrad" cx="50%" cy="34%" r="78%">
          <Stop offset="0%" stopColor="#26262C" />
          <Stop offset="46%" stopColor="#16181B" />
          <Stop offset="100%" stopColor="#090B0D" />
        </RadialGradient>
        <LinearGradient id="bevelAccent" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={acc.bevel[0]} stopOpacity={1} />
          <Stop offset="16%" stopColor={acc.bevel[1]} stopOpacity={1} />
          <Stop offset="50%" stopColor={acc.bevel[2]} stopOpacity={1} />
          <Stop offset="80%" stopColor={acc.bevel[3]} stopOpacity={1} />
          <Stop offset="100%" stopColor={acc.bevel[4]} stopOpacity={1} />
        </LinearGradient>
        <RadialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={acc.glowInner} stopOpacity={glowInnerOp} />
          <Stop offset="55%" stopColor={acc.glowMid} stopOpacity={glowMidOp} />
          <Stop offset="100%" stopColor={acc.glowMid} stopOpacity={0} />
        </RadialGradient>
        <ClipPath id="discClip"><Circle cx={310} cy={310} r={236} /></ClipPath>
        <Path id="topArc" d="M38,310 A272,272 0 0,1 582,310" fill="none" />
        <Path id="botArc" d="M38,310 A272,272 0 0,0 582,310" fill="none" />
      </Defs>

      {/* machined edge + bevel rim */}
      <Circle cx={310} cy={310} r={302} fill="none" stroke={acc.knurl} strokeWidth={13} strokeDasharray="2.4 6.4" />
      <Circle cx={310} cy={310} r={300} fill="none" stroke="#2A2016" strokeWidth={20} />
      <Circle cx={310} cy={310} r={299} fill="none" stroke="url(#bevelAccent)" strokeWidth={15} />
      <Circle cx={310} cy={310} r={291.5} fill="none" stroke={acc.rimHi} strokeWidth={1.2} />

      {/* recessed text groove + curved rank text */}
      <Circle cx={310} cy={310} r={272} fill="none" stroke="#0B0E11" strokeWidth={42} />
      <Circle cx={310} cy={310} r={293} fill="none" stroke={acc.groove} strokeWidth={1} />
      <Circle cx={310} cy={310} r={251} fill="none" stroke={acc.groove} strokeWidth={1} />
      <Text fill={acc.textTop} fontSize={42} fontWeight="600" letterSpacing={13}>
        <TextPath href="#topArc" startOffset="50%" textAnchor="middle">{family.toUpperCase()}</TextPath>
      </Text>
      <Text fill={acc.textBottom} fontSize={40} fontWeight="600" letterSpacing={15}>
        <TextPath href="#botArc" startOffset="50%" textAnchor="middle">{`TIER ${ROMAN[lvl - 1]}`}</TextPath>
      </Text>
      <Rect x={32} y={304} width={12} height={12} rx={1.5} transform="rotate(45 38 310)" fill={acc.diamond} />
      <Rect x={576} y={304} width={12} height={12} rx={1.5} transform="rotate(45 582 310)" fill={acc.diamond} />

      {/* inner disc */}
      <Circle cx={310} cy={310} r={238} fill="url(#discGrad)" />
      <Circle cx={310} cy={310} r={238} fill="none" stroke={acc.discRing} strokeWidth={3} />

      {/* flame heat glow (screen-blend approximation) + the baked fire-bowl, clipped to the disc */}
      <Circle cx={310} cy={288} r={128} fill="url(#flameGlow)" />
      <G clipPath="url(#discClip)">
        <SvgImage href={FLAME} x={118} y={122} width={384} height={330} preserveAspectRatio="xMidYMid meet" />
      </G>

      {/* seat vignette (multiply approximation: dark ring at opacity) */}
      <G opacity={0.55}>
        <Circle cx={310} cy={310} r={238} fill="none" stroke="#000000" strokeWidth={26} />
      </G>
    </Svg>
  );
}
