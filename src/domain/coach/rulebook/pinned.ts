/**
 * When the athlete names a FAMILY, not a lift — "rows", "curls", "lunges".
 *
 * ══ WHY THE CATALOGUE'S RESOLVER SAYS NO, AND WHY HOLT MAY STILL SAY YES ══
 *
 * `exercise-picker/aliases.ts` refuses these on purpose: *"'Row', 'curl' and 'fly' name families, not
 * lifts … an unmatched name is survivable; a confidently wrong one is invisible and permanent."* That is
 * right for an IMPORT, where the athlete's words become a logged row with history attached, and nobody
 * is there to say which row they meant.
 *
 * A coach is there. "Bench, rows, pull-ups, curls" (56 real requests name exercises like this) is CA-D3's
 * *Exercises given* state: the athlete chose the movements and left the variant to the coach. Picking the
 * row this athlete can do, with the rulebook's own preference order, in the room they have, is the job —
 * and it is REPORTED, not silent: every family pick comes back on `Assembly.chosen` so Holt can say "you
 * said rows — I've put in a barbell row", and the athlete can change it.
 *
 * ══ WHAT IS NOT HERE ══
 *
 * Words that name more than one PATTERN — "press" (bench, overhead or leg), "raise" (lateral, front,
 * calf), "extension" (leg or triceps). A family pick stays inside one movement pattern or it is a guess.
 * Those names are asked back through `Assembly.unresolved`, exactly like a typo.
 *
 * Matched with the catalogue's own `aliasKey`, so plurals, case and punctuation fold the same way they do
 * everywhere else: write each family once, in the singular.
 */

export interface PinFamily {
  /** What the athlete writes, in the singular. Compared through `aliasKey`. */
  words: string;
  /** The one movement pattern the family lives in. */
  pattern: string;
  /** Which rows of that pattern belong to the family. `null` means every row of the pattern. */
  name: RegExp | null;
}

export const PIN_FAMILIES: readonly PinFamily[] = [
  { words: 'row', pattern: 'Horizontal Pull', name: /\brows?\b/i },
  { words: 'curl', pattern: 'Elbow Flexion', name: /\bcurls?\b/i },
  { words: 'bicep curl', pattern: 'Elbow Flexion', name: /\bcurls?\b/i },
  { words: 'biceps', pattern: 'Elbow Flexion', name: null },
  { words: 'bicep', pattern: 'Elbow Flexion', name: null },
  { words: 'triceps', pattern: 'Elbow Extension', name: null },
  { words: 'tricep', pattern: 'Elbow Extension', name: null },
  { words: 'tricep extension', pattern: 'Elbow Extension', name: /\bextensions?\b/i },
  { words: 'lunge', pattern: 'Squat / Knee Dominant', name: /\blunges?\b/i },
  { words: 'fly', pattern: 'Horizontal Push', name: /\bfl(y|ies|ye|yes)\b/i },
  { words: 'shrug', pattern: 'Shoulder Isolation', name: /\bshrugs?\b/i },
  { words: 'lateral raise', pattern: 'Shoulder Isolation', name: /\blateral raises?\b/i },
  { words: 'calve', pattern: 'Calf / Ankle', name: null },
  { words: 'calf', pattern: 'Calf / Ankle', name: null },
  { words: 'ab', pattern: 'Core', name: null },
  { words: 'core', pattern: 'Core', name: null },
];
