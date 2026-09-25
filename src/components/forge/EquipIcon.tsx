import { EngravedIcon, engravedTint, type EngravedName } from './primitives/icons/EngravedIcon'
import { flColor } from '@/constants/foundation'

/**
 * The equipment glyph shared by the Exercise Picker rows and the Program Builder's exercise cards.
 *
 * The design's `EQ` map has five glyphs, drawn for its 26-movement demo set. The real catalog carries
 * 14 equipment types, so each one resolves to the closest of the design's shapes plus three additions
 * (band / ball / cardio) rather than inventing a glyph per type. Unknown or missing equipment falls back
 * to Barbell, matching the `.dc`'s `EQ[equip] || EQ.Barbell`.
 *
 * Drawn from the PO's engraved set (2026-09-25): bronze wears the engraved gradient, any other colour
 * (e.g. a selected row's white) stays flat.
 */
export type GlyphName = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'band' | 'ball' | 'cardio'

/** Each equipment glyph's drawing in the PO's engraved set (2026-09-25). */
const ENGRAVED: Record<GlyphName, EngravedName> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  bodyweight: 'bodyweight',
  band: 'band',
  ball: 'med-ball',
  cardio: 'cardio',
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

/**
 * Catalog `equipmentId` → the words an athlete reads.
 *
 * ⚠ FOUR SCREENS WERE PRINTING THE RAW DATABASE KEY. Program detail, the share card, the program
 * builder and the workout builder each rendered `equip` straight into a pill, so a program's equipment
 * row read `battle_rope · medicine_ball · plyo_box`. It survived because the pills are decorative and
 * nobody reads their own gym's equipment list — it was caught while shooting App Store screenshots.
 *
 * Every name below is copied 1:1 from `exercise-relationships/source/equipment.json`, which is the
 * catalogue's own `name` field. **They are not invented here.** A new equipment type is added THERE and
 * mirrored here; if the two ever disagree, that file wins.
 *
 * ⚠ An unknown id de-snakes rather than disappearing. A missing pill silently removes real information
 * about what a program demands, and `Plyo Box` still reads as English while telling us the map is short
 * a row. This also makes the function idempotent for saved programs whose `equip` is already a display
 * name — see `NAME_GLYPH` above, which exists for exactly that case.
 */
const EQUIP_LABEL: Record<string, string> = {
  barbell: 'Barbell',
  ez_bar: 'EZ-Curl Bar',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  cable: 'Cable Machine',
  selectorized_machine: 'Selectorized Machine',
  smith_machine: 'Smith Machine',
  bodyweight: 'Bodyweight',
  resistance_band: 'Resistance Band',
  suspension_trainer: 'Suspension Trainer',
  medicine_ball: 'Medicine Ball',
  plyo_box: 'Plyometric Box',
  sled: 'Sled / Prowler',
  battle_rope: 'Battle Rope',
  cardio: 'Cardio Equipment / Outdoors',
}

export function equipmentLabel(equip: string | undefined): string {
  if (!equip) return ''
  return EQUIP_LABEL[equip] ?? equip.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function EquipIcon({ equip, size = 20, color = flColor.bronze400 }: { equip?: string; size?: number; color?: string }) {
  return <EngravedIcon name={ENGRAVED[glyphFor(equip)]} size={size} color={engravedTint(color)} />
}
