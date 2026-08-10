import type { Experience, Goal } from '../constraints.ts';

/**
 * What Holt says about HOW to perform a movement — the line the athlete reads under **THE PLAN SAYS**.
 *
 * ══ WHY THIS IS A RULEBOOK AND NOT A STRING ON EACH EXERCISE ══
 *
 * "4 second negatives" is a training variable, not decoration. It changes what the set does. So it is
 * authored the same way every other prescription in this engine is: a table keyed by things the engine
 * actually knows — the movement pattern, the goal, and the athlete's experience — with no per-exercise
 * hand-writing, because 721 hand-written strings would drift the first time one was edited.
 *
 * ══ THE LINE I AM NOT CROSSING ══
 *
 * ⚠ **TEMPO IS PRESCRIBED FOR MUSCLE AND NOWHERE ELSE**, and that is a deliberate limit rather than an
 * oversight. A controlled eccentric is a real hypertrophy variable with real support behind it. Under a
 * STRENGTH goal it is the opposite of what the set is for: heavy work wants intent and speed off the
 * chest, and telling somebody to take four seconds lowering a five-rep max would make the prescription
 * worse, confidently. Conditioning wants density, mobility wants breath.
 *
 * So the tempo line appears where it is training and stays silent where it would be noise. A coach who
 * says the same thing about every exercise is not coaching, he is filling space — and the athlete stops
 * reading the field, which costs the cues that DO matter.
 *
 * ══ WHAT THE TECHNIQUE HALF IS AND IS NOT ══
 *
 * Standard, uncontested coaching for the movement family — where the hips go on a hinge, what the knees
 * do in a squat. It is not novel and is not meant to be: it is the sentence a competent coach says while
 * watching the first rep, and this engine has no business inventing a technique nobody teaches.
 *
 * ⚠ AND IT IS WITHHELD FROM ADVANCED LIFTERS. Someone who has squatted for ten years does not need to be
 * told where their knees track, and being told anyway is how an app stops being taken seriously.
 */

/** The catalogue's own `movementPattern` values — 18 of them, and this covers every one it prescribes. */
const TECHNIQUE: Record<string, string> = {
  'Squat / Knee Dominant': 'Brace before you drop. Knees track over the toes, chest stays proud out of the hole.',
  'Hinge / Hip Dominant': 'Hips back, bar close, spine flat. The stretch belongs in the hamstrings — never the low back.',
  'Horizontal Push': 'Shoulder blades pinned to the bench. Elbows tucked to about 45°, not flared.',
  'Horizontal Pull': 'Lead with the elbow, finish with the shoulder blade. Body stays still — no rowing with the hips.',
  'Vertical Push': 'Ribs down, glutes tight. Press around the head, not in front of it.',
  'Vertical Pull': 'Start from a dead hang. Pull the elbows to your pockets rather than the chin to the bar.',
  'Elbow Flexion': 'Elbows pinned to your sides. If the shoulders are swinging, the weight is doing the arms’ job.',
  'Elbow Extension': 'Upper arm still, only the forearm moves. Lock out without slamming the elbow.',
  'Shoulder Isolation': 'Light and clean. Lead with the elbows, stop at shoulder height — no shrugging into it.',
  'Hip Isolation': 'Drive through the whole foot and squeeze at the top. The lower back should be doing none of this.',
  'Calf / Ankle': 'Full stretch at the bottom, full contraction at the top. This one only works through the whole range.',
  Core: 'Brace like you are about to be hit. Breathe shallow and keep the ribs down — do not hold your breath.',
  Carry: 'Tall and quiet. Shoulders packed, small steps, and put it down before your posture goes.',
  'Power / Plyometric': 'Every rep is fast and fresh. The moment ground contact slows down, the set is over.',
  Mobility: 'Breathe into it. Ease to the edge and stay there — this is not a place to force anything.',
};

/**
 * The intent — what the set is FOR, which is where tempo lives when tempo is real.
 *
 * `null` where the goal has nothing honest to add on top of technique.
 */
const INTENT: Record<string, string | null> = {
  // ⭐ The one place tempo is prescribed. Time under tension is the variable being trained here.
  muscle: 'Three seconds down, no pause at the bottom, drive up. The lowering half is the half that grows.',
  // Heavy work wants intent, not tempo. Slowing a top set down makes it a worse top set.
  strength: 'Move it like you mean it. Brace hard, then be violent out of the bottom — speed is the point.',
  weight_loss: 'Keep the rest short and the form honest. Density is doing the work here, not load.',
  conditioning: 'Keep moving. The set ends when the reps do, not when it starts to hurt.',
  mobility: null,
};

export interface CueInput {
  /** The catalogue's `movementPattern` for the exercise. */
  pattern: string;
  goal: Goal;
  experience: Experience;
  /** True for the day's opening lift. It carries the intent; accessories carry technique only. */
  isPrimary: boolean;
}

/**
 * The cue for one prescribed exercise, or `null` when there is nothing worth saying.
 *
 * ⚠ **`null` IS A REAL ANSWER AND MUST STAY ONE.** An advanced lifter doing an accessory gets no cue, and
 * that is correct — the field earns its place by being worth reading, and a coach who comments on every
 * set trains the athlete to ignore him.
 */
export function cueFor(input: CueInput): string | null {
  const technique = TECHNIQUE[input.pattern] ?? null;
  const intent = INTENT[input.goal] ?? null;

  // The opening lift is where the block's intent belongs: it is the set that carries the session.
  if (input.isPrimary && intent) {
    // A beginner gets both — what to do, and what good looks like while doing it.
    return input.experience === 'beginner' && technique ? `${intent} ${technique}` : intent;
  }

  // Everything else is technique, and only for someone who might not already know it.
  if (input.experience === 'advanced') return null;
  return technique;
}

/** Cardio's cues come from the endurance rulebook, which knows what the bout is for. This is lifting. */
export const CUE_PATTERNS = Object.keys(TECHNIQUE);
