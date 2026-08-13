/**
 * ACTION IS FINE. TALKING IS NOT.
 *
 * ══ WHY THIS FILE EXISTS ══
 *
 * PO decision, 2026-08-12. The pricing plan sells Coach AI with one example — *"My shoulder hurts, swap
 * tomorrow."* — and `isMedical()` in `chat-core.ts` matches `hurt\w*` and stops flat. The sentence the
 * feature is sold with is one the app refuses.
 *
 * The check is not wrong. Its reasoning is in `chat-core.ts` and it holds: a false positive costs an
 * athlete a redirect they can ignore, a false negative is a training app improvising about an injury.
 * But it also means an athlete cannot use ordinary words to ask for a substitution **the app already
 * gives away free** — manual substitution is a free-tier feature, and refusing to perform it because
 * somebody said "hurts" is worse service for no safety gain.
 *
 * So the line moves from *what they mentioned* to *what they asked for*. It is the same shape the photo
 * -read rules already use: always paired with an action, never an assessment.
 *
 *   · **Action** — *"my shoulder hurts, swap tomorrow"* → do it. Say NOTHING about the shoulder.
 *   · **Advice** — *"my shoulder hurts, what's wrong with it?"* → stop.
 *   · **Acuity** — *"I tore my rotator cuff"* → stop, whatever else the sentence asked for.
 *
 * ══ ⚠ WHY ACUITY STOPS EVEN WHEN IT ASKS FOR AN ACTION ══
 *
 * `Coach-AI-Preflight-Gates` §1.2: the limitation vocabulary has no severity axis. `shoulders` means
 * both "cranky" and "torn", and the rule it maps to — remove overhead pressing and direct deltoid work,
 * keep horizontal pressing — is the correct one for the first athlete and wrong for the second.
 *
 * There is no field in `CoachConstraints` that can hold "how bad". So severity is routed to the stop
 * instead, which is what the stop is for. **Mapping a tear onto a mild exclusion is the failure this
 * file exists to prevent**, and it is worse than refusing, because it answers confidently.
 *
 * ══ ⚠ THIS IS THE BOUNDARY, NOT THE PROMPT ══
 *
 * The system prompt also describes these rules and the model is good at them. It is not trusted with
 * them alone: a prompt is a request, and this runs on the raw text afterwards and overrules the answer.
 * Same rule `entitlement.ts` states about itself — the gate belongs in the layer that cannot be talked
 * out of it.
 *
 * Pure, dependency-free, and imported by BOTH the app and the `coach-interpret` Edge Function so the two
 * can never drift. Relative imports only — `@/` is type-only in domain code and breaks `node --test`.
 */

/**
 * Damage, clinical contact, and neurological symptoms. Always stops.
 *
 * ⚠ DELIBERATELY NARROWER THAN `isMedical()`. That regex includes `hurt|sore|ache|pain`, which is
 * exactly the vocabulary an athlete uses when asking for a swap — catching those here would re-break the
 * example the feature is sold with. This is the subset no substitution can responsibly answer.
 *
 * Where the two overlap, erring toward stopping is still right. `swell|swollen` is in both, and stays
 * in both: swelling is a sign, not a preference.
 */
export const ACUTE =
  /\b(tore|torn|ruptur\w*|fractur\w*|surger\w*|operation|operated|post[-\s]?op|sprain\w*|strained|strains|dislocat\w*|physio\w*|physical\s+therap\w*|doctor|surgeon|orthopa?ed\w*|mri|x[-\s]?ray|numb\w*|tingl\w*|pinched|shooting\s+pain|swell\w*|swollen|herniat\w*|bulging\s+disc|sciatic\w*|concussion|whiplash)\b/i;

/**
 * ⚠ WORDS A GYM USES FOR GOOD NEWS, AND A CLINIC USES FOR BAD.
 *
 * *"I broke my PR on squats"* and *"I broke my ankle"* differ by one noun. *"Tearing through this
 * program"* is a compliment. Putting `broke` or `tearing` in the unconditional list above stops an
 * athlete for celebrating a personal record — a false positive with no safety value at all, and the
 * kind that teaches people the coach is broken.
 *
 * So these require an anatomical neighbour somewhere in the sentence. Everything in `ACUTE` above is
 * unambiguous enough to stand alone; everything here is not.
 */
const AMBIGUOUS_DAMAGE = /\b(broke|broken|tear|tears|tearing|snapped|popped|blew\s+out|went\s+pop)\b/i;

/**
 * Anatomy, as athletes say it. The qualifier for `AMBIGUOUS_DAMAGE` — never a stop on its own, because
 * naming a body part is what a swap request does.
 */
const BODY_PART =
  /\b(shoulder|shoulders|rotator\s+cuff|labrum|knee|knees|acl|mcl|meniscus|back|spine|disc|neck|hip|hips|ankle|ankles|wrist|wrists|elbow|elbows|arm|arms|leg|legs|foot|feet|hand|hands|rib|ribs|collarbone|clavicle|hamstring|hamstrings|quad|quads|calf|calves|groin|achilles|bicep|biceps|tricep|triceps|pec|pecs|chest|glute|glutes|femur|tibia|fibula|humerus|tendon|ligament|muscle)\b/i;

/** Asking what is wrong or how to treat it. Advice, not action — and advice is out of Holt's lane. */
export const SEEKING_ADVICE =
  /\b(what('?s| is)\s+wrong|why\s+does\s+(it|my)|should\s+i\s+(see|go|worry|rest|stop|ice|stretch|take)|is\s+(it|this|that)\s+(ok|okay|serious|bad|normal|fine)|do\s+i\s+need\s+(to|a)|how\s+do\s+i\s+(fix|heal|treat|rehab)|diagnos\w*|what\s+(should|do)\s+i\s+do\s+about|will\s+it\s+heal)\b/i;

export type MedicalRoute =
  /** Nothing clinical. Proceed. */
  | 'clear'
  /** Damage or clinical contact named. Stop, whatever else was asked. */
  | 'acute'
  /** A question about the body rather than a request to change training. Stop. */
  | 'advice';

/**
 * Which of the three this sentence is.
 *
 * ⚠ ORDER MATTERS AND ACUITY WINS. *"I tore my rotator cuff, swap tomorrow"* asks for an action and is
 * still a tear. Checking the action first would let the request launder the injury.
 */
export function medicalRoute(text: string): MedicalRoute {
  const t = (text ?? '').trim();
  if (!t) return 'clear';
  if (ACUTE.test(t)) return 'acute';
  // "broke my ankle" stops; "broke my PR" does not. The body part is the whole difference.
  if (AMBIGUOUS_DAMAGE.test(t) && BODY_PART.test(t)) return 'acute';
  if (SEEKING_ADVICE.test(t)) return 'advice';
  return 'clear';
}

/** Does this sentence stop? The one question every caller actually has. */
export const stopsForMedical = (text: string): boolean => medicalRoute(text) !== 'clear';
