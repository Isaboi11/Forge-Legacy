import type { ReactNode } from 'react'
import Svg, { Circle, Path } from 'react-native-svg'
import { flColor } from '@/constants/foundation'

/**
 * The equipment glyph shared by the Exercise Picker rows and the Program Builder's exercise cards.
 *
 * The design's `EQ` map has five glyphs, drawn for its 26-movement demo set. The real catalog carries
 * 14 equipment types, so each one resolves to the closest of the design's shapes plus three additions
 * (band / ball / cardio) rather than inventing a glyph per type. Unknown or missing equipment falls back
 * to Barbell, matching the `.dc`'s `EQ[equip] || EQ.Barbell`.
 *
 * `stroke` is set on <Svg> and cascades to the children; `fill` would NOT cascade in react-native-svg,
 * so every path here is stroke-only by design.
 */
export type GlyphName = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'band' | 'ball' | 'cardio'

const p = (d: string) => <Path key={d} d={d} />

const GLYPHS: Record<GlyphName, ReactNode> = {
  barbell: [p('M6.5 9v6'), p('M17.5 9v6'), p('M4 10.5v3'), p('M20 10.5v3'), p('M6.5 12h11')],
  dumbbell: [p('M7 8.5v7'), p('M17 8.5v7'), p('M4.5 10v4'), p('M19.5 10v4'), p('M7 12h10')],
  cable: [p('M12 3v6'), p('M8.5 9h7l-1 5a2.5 2.5 0 0 1-5 0z')],
  machine: [p('M5 3v18'), p('M5 7h9a3 3 0 0 1 0 6H9'), p('M9 13v5')],
  bodyweight: [<Circle key="c" cx={12} cy={6} r={2.4} />, p('M6 20c0-4.2 2.8-7 6-7s6 2.8 6 7')],
  band: [p('M5 7c4 0 4 10 8 10s6-4 6-7')],
  ball: [<Circle key="c" cx={12} cy={12} r={7.5} />, p('M4.8 9.5h14.4M4.8 14.5h14.4M12 4.5v15')],
  cardio: [p('M4 17l4-6 3.5 3.5L15 8l5 9')],
}

/** Catalog `equipmentId` → glyph. Ids come from `exercise-relationships/source/equipment.json`. */
const EQUIP_GLYPH: Record<string, GlyphName> = {
  barbell: 'barbell',
  smith_machine: 'barbell',
  dumbbell: 'dumbbell',
  kettlebell: 'dumbbell',
  cable: 'cable',
  selectorized_machine: 'machine',
  sled: 'machine',
  bodyweight: 'bodyweight',
  suspension_trainer: 'bodyweight',
  resistance_band: 'band',
  battle_rope: 'band',
  medicine_ball: 'ball',
  plyo_box: 'ball',
  cardio: 'cardio',
}

/** Display names, so a row that only has the label still resolves (e.g. a saved program's `equip`). */
const NAME_GLYPH: Record<string, GlyphName> = {
  Barbell: 'barbell',
  'Smith Machine': 'barbell',
  Dumbbell: 'dumbbell',
  Kettlebell: 'dumbbell',
  Cable: 'cable',
  'Cable Machine': 'cable',
  Machine: 'machine',
  'Selectorized Machine': 'machine',
  'Sled / Prowler': 'machine',
  Bodyweight: 'bodyweight',
  'Suspension Trainer': 'bodyweight',
  'Resistance Band': 'band',
  'Battle Rope': 'band',
  'Medicine Ball': 'ball',
  'Plyometric Box': 'ball',
  'Cardio Equipment / Outdoors': 'cardio',
}

export function glyphFor(equip: string | undefined): GlyphName {
  if (!equip) return 'barbell'
  return EQUIP_GLYPH[equip] ?? NAME_GLYPH[equip] ?? 'barbell'
}

export function EquipIcon({ equip, size = 20, color = flColor.bronze400 }: { equip?: string; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {GLYPHS[glyphFor(equip)]}
    </Svg>
  )
}
