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
 * Parametric: `family` sets the arc text, `level` (1–4) warms the seal via the glow — the flame raster
 * stays constant, the warmth is all vector (per the design's "seal warms with each sub-rank").
 */
import React from 'react';
import Svg, {
  Circle, ClipPath, Defs, G, Image as SvgImage, LinearGradient, Path, RadialGradient, Rect, Stop, Text, TextPath,
} from 'react-native-svg';

const FLAME = require('@/assets/artwork/ranks/seal-flame.png');
const ROMAN = ['I', 'II', 'III', 'IV'] as const;

export function RankSeal({ size = 300, family = 'Foundation', level = 1 }: { size?: number; family?: string; level?: 1 | 2 | 3 | 4 }) {
  const lvl = Math.max(1, Math.min(4, level));
  // Warmth rises with the sub-rank — modulated ONLY in the vector glow (flame raster is constant).
  const glowInner = 0.34 + (lvl - 1) * 0.15; // I 0.34 → IV 0.79
  const glowMid = 0.1 + (lvl - 1) * 0.05;

  return (
    <Svg width={size} height={size} viewBox="0 0 620 620">
      <Defs>
        <RadialGradient id="discGrad" cx="50%" cy="34%" r="78%">
          <Stop offset="0%" stopColor="#26262C" />
          <Stop offset="46%" stopColor="#16181B" />
          <Stop offset="100%" stopColor="#090B0D" />
        </RadialGradient>
        <LinearGradient id="bevelBronze" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#DDB578" />
          <Stop offset="16%" stopColor="#C0904F" />
          <Stop offset="50%" stopColor="#8A6C46" />
          <Stop offset="80%" stopColor="#5C452E" />
          <Stop offset="100%" stopColor="#463526" />
        </LinearGradient>
        <RadialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#CDA063" stopOpacity={glowInner} />
          <Stop offset="55%" stopColor="#BF8F4F" stopOpacity={glowMid} />
          <Stop offset="100%" stopColor="#BF8F4F" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id="discClip"><Circle cx={310} cy={310} r={236} /></ClipPath>
        <Path id="topArc" d="M38,310 A272,272 0 0,1 582,310" fill="none" />
        <Path id="botArc" d="M38,310 A272,272 0 0,0 582,310" fill="none" />
      </Defs>

      {/* machined edge + bevel rim */}
      <Circle cx={310} cy={310} r={302} fill="none" stroke="#6A5334" strokeWidth={13} strokeDasharray="2.4 6.4" />
      <Circle cx={310} cy={310} r={300} fill="none" stroke="#2A2016" strokeWidth={20} />
      <Circle cx={310} cy={310} r={299} fill="none" stroke="url(#bevelBronze)" strokeWidth={15} />
      <Circle cx={310} cy={310} r={291.5} fill="none" stroke="rgba(222,190,148,0.35)" strokeWidth={1.2} />

      {/* recessed text groove + curved rank text */}
      <Circle cx={310} cy={310} r={272} fill="none" stroke="#0B0E11" strokeWidth={42} />
      <Circle cx={310} cy={310} r={293} fill="none" stroke="rgba(186,146,92,0.30)" strokeWidth={1} />
      <Circle cx={310} cy={310} r={251} fill="none" stroke="rgba(186,146,92,0.30)" strokeWidth={1} />
      <Text fill="#CDA063" fontSize={42} fontWeight="600" letterSpacing={13}>
        <TextPath href="#topArc" startOffset="50%" textAnchor="middle">{family.toUpperCase()}</TextPath>
      </Text>
      <Text fill="#BF8F4F" fontSize={40} fontWeight="600" letterSpacing={15}>
        <TextPath href="#botArc" startOffset="50%" textAnchor="middle">{`TIER ${ROMAN[lvl - 1]}`}</TextPath>
      </Text>
      <Rect x={32} y={304} width={12} height={12} rx={1.5} transform="rotate(45 38 310)" fill="#BF8F4F" />
      <Rect x={576} y={304} width={12} height={12} rx={1.5} transform="rotate(45 582 310)" fill="#BF8F4F" />

      {/* inner disc */}
      <Circle cx={310} cy={310} r={238} fill="url(#discGrad)" />
      <Circle cx={310} cy={310} r={238} fill="none" stroke="#8A6C46" strokeWidth={3} />

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
