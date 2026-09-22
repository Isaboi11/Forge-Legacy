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
  /\b(ruptur\w*|fractur\w*(?!\s+(my|the|our)\s+(schedule|week|plans?|routine|program|calendar))|surger\w*|operation|operated|post[-\s]?op|sprain\w*|dislocat\w*|physio\w*|physical\s+therap\w*|doctor|surgeon|orthopa?ed\w*|mri|x[-\s]?ray|numb\w*|tingl\w*|pinched|shooting\s+pain|swell\w*|swollen|herniat\w*|bulging\s+disc|sciatic\w*|concussion|whiplash)\b/i;

/**
 * ⛔ SOMEONE MAY BE IN DANGER. Checked before everything else, and never sent to the model.
 *
 * Stress test 2026-09-21: the live model answered "I want to hurt myself" and "thinking about ending it"
 * with `unclear` — which the app renders as *"I didn't catch that"*. And when a stop DID fire, the only
 * copy was *"That's a physio's job"*. Both are wrong for a person in crisis, so this has its own route and
 * its own words (`CRISIS_STOP`). Broad on purpose: "kms lol" routes here too, because a false positive
 * costs one kind sentence and a false negative costs something that cannot be taken back.
 */
export const CRISIS =
  /\b(kill(ing)?\s+myself|kms|suicid\w*|end(ing)?\s+(it\s+all|my\s+life|it)\b(?!\s+(early|there|here|with|on|at))|want(ed)?\s+to\s+die|wanna\s+die|rather\s+(not\s+exist|be\s+dead)|(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|be\s+here\s+anymore)|hurt(ing)?\s+myself|harm(ing)?\s+myself|self[-\s]?harm\w*|cut(ting)?\s+myself|(hit|punch|punish)(ing)?\s+myself|no\s+reason\s+to\s+live|(till|until)\s+(they|it|i)\s+bleed|make\s+myself\s+bleed)\b/i;

/**
 * ⛔ STOP TRAINING, GET HELP NOW. Chest pain, fainting, can't breathe, stroke signs, rhabdo, a diabetic low.
 *
 * Also found 2026-09-21: 61 of 70 of these went straight past `ACUTE`, which is about damage, not about an
 * emergency. The copy is not a physio referral — it is "stop and call" (`URGENT_STOP`).
 */
export const URGENT =
  /\b(chest\s+(pain|pressure|tightness|is\s+tight|feels\s+tight|hurts)|pain\s+in\s+my\s+chest|(passed|pass(ing)?|blacked|black(ing)?)\s+out|faint(ed|ing)?\b|can'?t\s+(catch\s+my\s+)?breathe?|trouble\s+breathing|struggling\s+to\s+breathe|asthma\s+attack|heart\s+(is\s+|keeps\s+|won'?t\s+stop\s+)?(racing|pounding|skipping|fluttering)|(dark|brown|cola|tea)[-\s]colou?red\s+(pee|urine)|(pee|urine)\s+(is\s+|was\s+|looks\s+)?(dark|brown|cola|tea)\b|rhabdo\w*|worst\s+headache|severe\s+headache|thunderclap|face\s+(is\s+)?droop\w*|slurr\w*|seizure|can'?t\s+feel\s+my\s+(legs|arms|feet)|(low|crashing)\s+blood\s+sugar|hypoglyc\w*|dolor\s+de\s+pecho|duele\s+el\s+pecho|(lost|losing|lose|can'?t\s+control)\s+(my\s+)?(bladder|bowel)|throat\s+(is\s+)?(swelling|swollen|closing)|short(ness)?\s+of\s+breath|swollen\s+and\s+(hot|red)|(hot|red)\s+and\s+swollen)\b/i;
/* Added from the live run (2026-09-21): numb groin + bladder loss (cauda equina), a hot swollen calf with
   breathlessness (a clot), a swelling throat after a sting — each got the physio line instead of "call". */

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
const AMBIGUOUS_DAMAGE =
  /\b(broke|broken|tear|tears|tearing|tore|torn|strained|strain|strains|snapped|popped|blew\s+out|went\s+pop)\b/i;
/* `tore`/`torn`/`strained` moved down here 2026-09-21: "I tore my gym shorts", "strained relations with my
   gym buddy" and "torn between PPL and upper/lower" all stopped. "Tore my ACL" still does — ACL is anatomy. */

/**
 * Anatomy, as athletes say it. The qualifier for `AMBIGUOUS_DAMAGE` — never a stop on its own, because
 * naming a body part is what a swap request does.
 */
const BODY_PART =
  /\b(shoulder|shoulders|rotator\s+cuff|labrum|knee|knees|acl|mcl|meniscus|back|spine|disc|neck|hip|hips|ankle|ankles|wrist|wrists|elbow|elbows|arm|arms|leg|legs|foot|feet|hand|hands|rib|ribs|collarbone|clavicle|hamstring|hamstrings|quad|quads|calf|calves|groin|achilles|bicep|biceps|tricep|triceps|pec|pecs|chest|glute|glutes|femur|tibia|fibula|humerus|tendon|ligament|muscle|hammy|hammies|lat|lats|oblique|obliques|adductor|adductors|shin|shins|trap|traps)\b/i;

/**
 * The damage word and the body part NEAR each other — at most four words apart, either order.
 *
 * Anywhere-in-the-sentence was too loose once `tore` joined the ambiguous list: "I tore my gym shorts on a
 * squat. Anyway, legs today?" stopped on *legs*. Near is what the injury sentences actually look like:
 * "popped my hamstring", "tearing in my shoulder", "ACL is torn", "hamstring just snapped".
 */
const WORDS = String.raw`(?:[\w'-]+\s+){0,4}`;
const DAMAGE_NEAR_BODY = new RegExp(
  String.raw`\b(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b` +
    `|` +
    String.raw`\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\b`,
  'i',
);

/** Asking what is wrong or how to treat it. Advice, not action — and advice is out of Holt's lane. */
export const SEEKING_ADVICE =
  /\b(what('?s| is)\s+wrong|why\s+does\s+(it|my)|should\s+i\s+(see\s+(a|someone|somebody|the|my)|go\s+to\s+(a|the)\s+(doctor|er|hospital|clinic)|worry|rest\s+(it|my|this|that)\b|stop\s+(training|lifting|running)\s+(on|with|because)|ice|stretch\s+(it|my|this|that)\b)|is\s+(it|this|that)\s+(ok|okay|serious|bad|normal|fine)(?!\s+(to|if|for)\b)|do\s+i\s+need\s+(a\s+(brace|scan|doctor|cast|splint|x[-\s]?ray|mri)|to\s+(see|get\s+it\s+(checked|looked\s+at)))|how\s+do\s+i\s+(fix|heal|treat|rehab)\s+(it|this|that|my)\b|diagnos\w*|what\s+(should|do)\s+i\s+do\s+about|will\s+it\s+heal)\b/i;
/* Narrowed 2026-09-21: "should I take creatine", "how long should I rest between sets", "is it bad to lift
   every day" and "do I need to eat breakfast" all stopped as medical. Each alternative now needs the body,
   a clinic, or a pronoun standing in for a symptom. */

/**
 * Disordered eating, stated as something the athlete is DOING. Not the diagnosis words — "I'm in recovery
 * from bulimia, keep calorie talk out of my program" is a request Holt can honour, and stopping on the
 * word would punish the person for telling him. Extreme targets ("under 100 lbs at 5'6") are the model's
 * call (`care` in the prompt); this is the floor that does not depend on it.
 */
export const DISORDERED_EATING =
  /\b(purg(e|es|ed|ing)|throw(ing)?\s+up\s+after\s+(i\s+eat|eating|meals?|food)|make\s+myself\s+(throw\s+up|sick|puke)|starv(e|ing)\s+myself|laxatives?\s+(to|for)\s+(lose|drop|cut)|(eat|eating)\s+(only\s+)?([1-7]\d{2}|[1-9]\d)\s+cal\w*|stop(ped)?\s+eating\s+(to|so)\b)/i;

/*
 * ⛔ LEGAL CAUTION (PO, 2026-09-22: *"let's just stay away from anything that would get us into legal
 * trouble"*). Three families that a coach app must not answer, stopped HERE because the live model ignored
 * the prompt's "never reassure about a symptom" line ("cracking by itself usually isn't a red flag"):
 */

/** A medical condition, medication, pregnancy or a procedure — the answer depends on a clinician. → advice */
export const MEDICAL_CONTEXT =
  /\b(pregnan\w*|postpartum|post-partum|breastfeed\w*|breast-feed\w*|c-?section|miscarriage|epilep\w*|diabet\w*|insulin|heart\s+(condition|disease|murmur|attack|problem|issue)s?|arrhythmia|a-?fib|pacemaker|blood\s+pressure|hypertension|asthma|copd|cancer|chemo\w*|osteopor\w*|arthritis|ssris?|antidepressant\w*|medications?|prescription|cortisone|steroid\s+shot|kidney|liver\s+(disease|condition)|hernia|cleared\s+(me|by)|got\s+clearance)\b/i;

/** A noise or sensation in a body part, or "is it bad/normal … my <body part>" — a symptom question. → advice */
const SENSATION = String.raw`(crack\w*|pop|pops|popping|click\w*|grind\w*|clunk\w*|crunch\w*)`;
const SYMPTOM_QUESTION_SOURCE = () =>
  String.raw`\b${SENSATION}\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b|\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}${SENSATION}\b|\bis\s+(it|this|that)\s+(bad|normal|ok|okay|safe|dangerous|fine)\b[^.?!]{0,40}\bmy\s+(?:${BODY_PART.source.slice(3, -3)})\b`;

/** An AMOUNT of caffeine, a supplement or a drug. → care */
export const DOSE =
  /(\b\d+(\.\d+)?\s*(mg|mcg|milligrams?|grams?|g|iu|scoops?)\b[^.?!]{0,30}\b(caffeine|creatine|pre-?workout|supplements?|beta-?alanine|melatonin|vitamin|ashwagandha|stims?)\b|\bhow\s+(much|many\s+(mg|milligrams|scoops))\s+(of\s+)?(caffeine|creatine|pre-?workout|melatonin|beta-?alanine|ashwagandha|vitamin\s*d?)\b|\b(caffeine|creatine|pre-?workout|melatonin)\s+(dose|dosage|dosing)\b)/i;

const SYMPTOM_QUESTION = new RegExp(SYMPTOM_QUESTION_SOURCE(), 'i');

/**
 * ⚠ ANY MENTION OF DISCOMFORT — the BROAD list, on purpose, and not what `medicalRoute` uses.
 *
 * `medicalRoute` deliberately lets "my shoulder hurts, swap tomorrow" through: in the chat that is a
 * substitution request the app gives away free, and stopping it was the defect this file was written to
 * end. A FORM CHECK is the opposite case — a video of a person moving, where "my knee hurts on rep 3" is
 * the sentence a coach app must not read frames against (PO 2026-09-22, legal caution). Live test the same
 * day: that note reached the model and spent credits, because the narrow route is correctly clear.
 *
 * So the broad check lives here, next to the narrow one, and each caller picks the line it needs.
 */
export const mentionsDiscomfort = (text: string): boolean =>
  /\b(hurt\w*|pain\w*|ach(e|es|ing|y)|sore\w*|injur\w*|tweak(ed|ing)?|strain\w*|niggl\w*|uncomfortable|discomfort|stiff\w*|flare[-\s]?up|twinge)\b/i.test(text ?? '');

export type MedicalRoute =
  /** Nothing clinical. Proceed. */
  | 'clear'
  /** Self-harm or suicide. `CRISIS_STOP`, never the model. */
  | 'crisis'
  /** An emergency happening now. `URGENT_STOP`: stop training and call. */
  | 'urgent'
  /** Disordered eating. `CARE_STOP`: no program built on it, a pointer to a person who can help. */
  | 'care'
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
  if (CRISIS.test(t)) return 'crisis';
  if (URGENT.test(t)) return 'urgent';
  if (DISORDERED_EATING.test(t)) return 'care';
  if (DOSE.test(t)) return 'care';
  if (ACUTE.test(t)) return 'acute';
  // "broke my ankle" stops; "broke my PR" does not. The body part is the whole difference.
  if (DAMAGE_NEAR_BODY.test(t)) return 'acute';
  if (MEDICAL_CONTEXT.test(t) || SYMPTOM_QUESTION.test(t)) return 'advice';
  if (SEEKING_ADVICE.test(t)) return 'advice';
  return 'clear';
}

/** Does this sentence stop? The one question every caller actually has. */
export const stopsForMedical = (text: string): boolean => medicalRoute(text) !== 'clear';
