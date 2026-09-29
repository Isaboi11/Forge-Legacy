/**
 * "Dumbbells only at home" → the kit, in `home-gym/equipment.ts` ids (QA holtai-04, 2026-09-26).
 *
 * ══ WHY THIS IS CODE ON THE DEVICE ══
 *
 * `coach-interpret` has no equipment field — its patch carries an `environment` and nothing else — so a
 * typed "dumbbells only" came back as `home`, and `home` resolves to whatever the Home Gym profile holds.
 * The tester's profile was empty, so a three-day strength block was built with no dumbbells in it, no rows,
 * and no question asked. The sentence already said everything; it simply had nowhere to go.
 *
 * So the athlete's own words are read here, for free and before anything else, and what they name is the
 * kit for THIS build. It is deliberately narrow: only gear named outright, never inferred from a room
 * ("my garage" says nothing about what is in it), and a named item under a negation ("no bench",
 * "without a bar") is left out rather than guessed at.
 *
 * Pure, no imports: runs under `node --test`.
 */

/** What a sentence says about the kit, as a constraint patch, or `null` when it names none. */
export interface TypedEquipment {
  environment: 'home' | 'bodyweight';
  ownedEquipment?: string[];
}

const MINI_BANDS = /\b(mini ?bands?|loop bands?|glute bands?)\b/gi;

/** Word → home-gym ids. Order does not matter; every match is collected. */
const GEAR: readonly (readonly [RegExp, readonly string[]])[] = [
  [/\b(dumb ?bells?|dbs)\b/i, ['dumbbells']],
  [/\b(kettle ?bells?|kbs)\b/i, ['kettlebells']],
  [/\b(mini ?bands?|loop bands?|glute bands?)\b/i, ['minibands']], // not MINI_BANDS: that one is global
  [/\b(resistance bands?|bands?|tubes?)\b/i, ['bands']],
  [/\b(pull-? ?up bar|chin-? ?up bar|doorway bar)\b/i, ['pullup']],
  [/\bbench\b/i, ['bench']],
  [/\b(barbell|olympic bar)\b/i, ['barbell', 'plates']],
  [/\b(squat rack|power rack|rack|squat stands)\b/i, ['rack']],
  [/\b(trx|suspension trainer|suspension straps)\b/i, ['trx']],
  [/\b(gymnastic rings|rings)\b/i, ['rings']],
  [/\b(medicine ball|med ball|slam ball)\b/i, ['medball']],
  [/\b(yoga mat|exercise mat|mat)\b/i, ['mat']],
];

/** A gym they train AT, not a home gym: the model's `full_gym` is the right answer there, not a list. */
const AT_A_GYM = /\b(full|commercial|big|regular|public|local|the)\s+gym\b|\bgym membership\b/i;
const NOTHING = /\b(no (equipment|gear|weights|kit)|bodyweight only|only bodyweight|just (my )?bodyweight|nothing at (all|home)|own nothing|have nothing)\b/i;
/** A negation in the few words before a match: "no bench", "without a bar", "don't have kettlebells". */
const NEGATED_BEFORE = /\b(no|not|without|don'?t have|do not have|haven'?t got|lack|minus)\b[\w\s,'-]{0,12}$/i;

export function typedEquipment(text: string): TypedEquipment | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  if (AT_A_GYM.test(t) && !/\bhome gym\b/i.test(t)) return null;

  const owned: string[] = [];
  for (const [re, ids] of GEAR) {
    // A mini band is not a long band: the plain `bands` row reads the sentence with the loop bands taken out.
    const said = ids[0] === 'bands' ? t.replace(MINI_BANDS, (x) => ' '.repeat(x.length)) : t;
    const m = re.exec(said);
    if (!m) continue;
    if (NEGATED_BEFORE.test(t.slice(0, m.index))) continue;
    for (const id of ids) if (!owned.includes(id)) owned.push(id);
  }
  if (owned.length) return { environment: 'home', ownedEquipment: owned };
  if (NOTHING.test(t)) return { environment: 'bodyweight' };
  return null;
}
