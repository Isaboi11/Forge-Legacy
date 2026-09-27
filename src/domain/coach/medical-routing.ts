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
  /\b(chest\s+(pain|pressure|tightness|is\s+tight|feels\s+tight|hurts)|pain\s+in\s+my\s+chest|(passed|pass(ing)?|blacked|black(ing)?)\s+out|faint(ed|ing)?\b|can'?t\s+(catch\s+my\s+)?breathe?|trouble\s+breathing|struggling\s+to\s+breathe|asthma\s+attack|heart\s+(is\s+|keeps\s+|won'?t\s+stop\s+)?(racing|pounding|skipping|fluttering)|(dark|brown|cola|tea)[-\s]colou?red\s+(pee|urine)|(pee|urine)\s+(is\s+|was\s+|looks\s+)?(dark|brown|cola|tea)\b|rhabdo\w*|worst\s+headache|severe\s+headache|thunderclap|face\s+(is\s+)?droop\w*|slurr\w*|seizure|can'?t\s+feel\s+my\s+(legs|arms|feet)|(low|crashing)\s+blood\s+sugar|blood\s+(sugar|glucose)\s+(is\s+|was\s+|keeps\s+|feels\s+|went\s+|just\s+)*(low|crash\w*|dropp\w*|tank\w*|plummet\w*)|hypoglyc\w*|dolor\s+de\s+pecho|duele\s+el\s+pecho|(lost|losing|lose|can'?t\s+control)\s+(my\s+)?(bladder|bowel)|throat\s+(is\s+)?(swelling|swollen|closing)|short(ness)?\s+of\s+breath|swollen\s+and\s+(hot|red)|(hot|red)\s+and\s+swollen)\b/i;
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
  /\b(purg(e|es|ed|ing)|(throw(ing|n)?|threw)\s+up\s+after\s+(i\s+eat|eating|meals?|food)|make\s+myself\s+(throw\s+up|sick|puke)|starv(e|ing)\s+myself|laxatives?\s+(to|for)\s+(lose|drop|cut)|(eat|eating)\s+(only\s+)?([1-7]\d{2}|[1-9]\d)\s+cal\w*\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)))|stop(ped)?\s+eating\s+(to|so)\b|(vomit\w*|puk(e|es|ed|ing)|barf\w*|(throw(s|ing|n)?|threw)\s+up)\s+(\w+\s+){0,3}(after|when)\s+(i\s+)?(eat\w*|ate|meals?|food|dinner|lunch|breakfast|snacks?|bing\w*)|(vomit\w*|puk(e|es|ed|ing)|sick|(throw(s|ing|n)?|threw)\s+up)\s+(\w+\s+){0,4}on\s+purpose|self[-\s]induced\s+vomit\w*)/i;
/* Widened 2026-09-26 (QA R2-F6): "I threw up after dinner on purpose" and "vomit after meals" both reached a
   model. The vomit words need a meal or "on purpose" beside them — "I threw up after sprints" is not this. */

/**
 * The diagnosis named (QA R2-F6: "I'm anorexic", "I have an eating disorder" both reached a model — and the
 * second went to the dish writer). → care, unless the sentence is about recovery, which → advice: still a stop
 * (the PO's 09-22 legal-caution rule names eating disorders), but with the professional pointer rather than the
 * behaviour copy. ⚠ Before 09-26 recovery talk passed entirely; the PO's rule is why it no longer does.
 */
export const EATING_DISORDER_NAMED =
  /\b(anorexi\w*|anorectic|bulimi\w*|eating\s+disorder\w*|binge[-\s]eating|arfid|orthorexi\w*|ednos)\b/i;
const RECOVERY = /\b(recover(y|ing|ed)|in\s+treatment|my\s+(therapist|treatment\s+team))\b/i;

/**
 * Weight-loss drugs and "fat burners" — a drug amount by another name (QA R2-F6: "appetite suppressants",
 * "can I take fat burners", "taking phentermine"). → care. `fat[-\s]?burners?` is the product, never
 * "fat burning cardio". The GLP-1s are `NUTRITION_MEDICAL` (prescribed, a dietitian's question).
 */
export const DIET_DRUG =
  /\b(appetite\s+(suppress\w*|blocker\w*|killer\w*)|fat[-\s]?burners?|diet\s+(pills?|drugs?|tea)|slimming\s+(pills?|tea|drops)|weight[-\s]?loss\s+(pills?|drugs?|meds?|medications?|injections?|shots?|tea|supplements?)|phentermine|adipex|qsymia|contrave|orlistat|xenical|clenbuterol|clen|dnp|ephedrine|ephedra|garcinia|hydroxycut|lipozene|sibutramine)\b/i;

/*
 * ⛔ LEGAL CAUTION (PO, 2026-09-22: *"let's just stay away from anything that would get us into legal
 * trouble"*). Three families that a coach app must not answer, stopped HERE because the live model ignored
 * the prompt's "never reassure about a symptom" line ("cracking by itself usually isn't a red flag"):
 */

/** A medical condition, medication, pregnancy or a procedure — the answer depends on a clinician. → advice */
export const MEDICAL_CONTEXT =
  /\b(pregnan\w*|postpartum|post-partum|breastfeed\w*|breast-feed\w*|c-?section|miscarriage|epilep\w*|diabet\w*|insulin|heart\s+(condition|disease|murmur|attack|problem|issue)s?|arrhythmia|a-?fib|pacemaker|blood\s+pressure|hypertension|asthma|copd|cancer|chemo\w*|osteopor\w*|arthritis|ssris?|antidepressant\w*|medications?|prescription|cortisone|steroid\s+shot|kidney\s+(disease|stones?|failure|function|problems?|issues?|condition|transplant|damage|infection)|ckd|liver\s+(disease|condition)|hernia|cleared\s+(me|by)|got\s+clearance|lactating|lactation|breast\s*milk|milk\s+supply|pumping\s+(breast\s*)?milk|(i'?m|i\s+am|im|currently|still|been|while|when|and)\s+(\w+\s+)?nursing\b(?!\s+(a|an|my|the|this|that|his|her|student|school|home|degree|shift|job|injur\w*|hangover))|nursing\s+((a|my|the|our)\s+)?(mom|mother|mum|baby|son|daughter|newborn|infant|twins))\b/i;
/* "I'm nursing, how much should I eat" reached a model (QA R2-F6). Nursing only as feeding a baby: "nursing a
   sore hamstring", "a nursing student" and "nursing a hangover" stay clear. */

/*
 * ══ THE KITCHEN'S STOPS (Chef Holt stress test, 2026-09-25 — `Docs/Chef-Holt-Stress-Test-2026-09-25.md`) ══
 *
 * Kitchen Mode invites food questions, and 288 of 3,137 simulated ones that must stop went past the code
 * guard to a model. The PO's 09-22 rule is that these stop in CODE. Each family below came from that run.
 */

/** Conditions, drugs and tests that make eating a clinical question. → advice (the dietitian copy) */
export const NUTRITION_MEDICAL =
  /\b(thyroid|hypothyroid\w*|hyperthyroid\w*|hashimoto\w*|cholesterol|statins?|a1c|pre-?diabet\w*|ibs|irritable\s+bowel|crohn'?s?|colitis|gerd|acid\s+reflux|gout|celiac|coeliac|pcos|polycystic|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide|glp-?1|metformin|blood\s*work|lab\s+(results?|work)|blood\s+tests?|blood\s+thinners?|warfarin|eliquis|gastric\s+(sleeve|bypass|band)|bariatric|lap[-\s]?band|anemi\w*|anaemi\w*|iron\s+deficien\w*|t[12]d|type\s*[-]?\s*(1|2|one|two|i|ii)\s+diabet\w*|(i\s+have|i'?ve\s+got|i'?m|im|i\s+am|with|living\s+with|as\s+a)\s+(a\s+)?type\s*[-]?\s*(1|2|one|two|i|ii)\b(?!\s*(and\s+type\s*\w+\s+)?(muscle|fib\w*|fibre\w*|fun|personality|error))|blood\s*(sugar|glucose)|glucose\s+(levels?|monitor\w*|spikes?|readings?)|cgm|insulin\s+resist\w*|(am\s+i|could\s+i\s+be|do\s+i\s+have|i\s+think\s+i'?m|i\s+think\s+i\s+(am|have)|think\s+i'?m)\s+(\w+\s+){0,2}(lactose\s+intolerant|gluten\s+intolerant|intolerant|allergic|celiac|an?\s+(food\s+)?allergy))\b/i;

/**
 * Restriction a coach must not help with: fasting and cleanses, "as low as possible", a daily intake under
 * 1,200, a target set under it, binge-restrict, days without food, crash weight cuts, laxatives and
 * diuretics in any word order, shame after eating. → care
 */
export const RESTRICTION =
  /\b((water|dry|juice|bone\s+broth)\s+fast\w*|(juice\s+)?cleanse\w*|detox\w*|lowest\s+(calories|cals?|possible)|as\s+(few|little|low)\s+(calories|cals?\s+)?as\s+possible|(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2})\s*(cal\w*|kcals?)\s*((a|per|each)\s+day|\/\s*(day|d)\b|daily)|(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2})\s*(cal\w*|kcals?)\s+(or\s+(less|under|below)\s+)?(a|per|each)\s+day|(target|goal|calories|cals?)\s+(to|at|of)\s+([1-9]\d{2}|1,?[01]\d{2})\b(?!\s*(protein|carbs?|g\b|grams?))|(only|just)\s+(eat(ing)?|consum\w*)\s+(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2}|[1-9]\d)\s*(cal\w*|kcals?)\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)|in\b|more|left|remaining|over|under|to\s+(go|spare|work|spend)))|(eat|eating|ate|consume|consuming)\s+(only|just|under|less\s+than|below)\s+(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2}|[1-9]\d)\s*(cal\w*|kcals?)\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)))|binge\w*\s+(and|then)\s+(then\s+)?(don'?t|not|stop|skip|starve|fast|purge|restrict)|(haven'?t|have\s+not|didn'?t|did\s+not|not)\s+eaten?\s+(anything\s+)?(in|for)\s+(\d+|a\s+few|two|three|four|several)\s+days|(cut|lose|drop)\s+(\d{2,}|[5-9])\s*(lbs?|pounds|kg|kilos?)\s+(in|by|within)\s+(a|one|1|2|two|3|three|a\s+few)\s+(week|days?)|(fasting|fasted|fast\s+for|without\s+(eating|food|any\s+food)|no\s+food|not\s+eat(ing)?|stop\s+eating|skip(ping)?\s+(eating|food|all\s+meals))\s+(for\s+)?((\d+|a|one|two|three|four|five|six|seven|a\s+few|a\s+couple(\s+of)?|several|multiple)[-\s]*(days?|weeks?)|(2[4-9]|[3-9]\d|\d{3})[-\s]*(hours?|hrs?|h)|(a\s+)?(whole|full|entire)\s+(day|week))\b|((\d+|a|one|two|three|four|five|six|seven|a\s+few|a\s+couple(\s+of)?|several|multiple)[-\s]*(days?|weeks?)|(2[4-9]|[3-9]\d|\d{3})[-\s]*(hours?|hrs?|h)|(a\s+)?(whole|full|entire)\s+(day|week))\s+(fast(s|ing)?|without\s+(eating|food|any\s+food)|of\s+(fasting|no\s+food|not\s+eating)|no\s+food)|laxatives?|diuretics?|water\s+pills|(feel|felt|feeling)\s+(so\s+)?(fat|disgusting|gross|ashamed|guilty)(\s+(and|&)\s+\w+)?\s+(after|when)\s+(i\s+)?(eat|eating|ate))\b/i;

/**
 * A crash cut, read as a RATE (QA R2-F6: "lose 30 pounds in 2 weeks" passed — `RESTRICTION` only knew "in a
 * week" and days). NUT-D5 caps a recommended deficit at ~1% of bodyweight a week; more than 2.5 lb (1.1 kg) a
 * week is past that for almost everyone, so it stops. "Lose 10 lbs in 3 months" and "1 lb a week" do not.
 */
const CRASH_CUT =
  /\b(cut|cutting|lose|losing|drop|dropping|shed|shedding|burn\s+off)\s+(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kgs?|kilos?|kilograms?)\s+(?:of\s+\w+\s+)?(?:in|by|within|over|inside)\s+(?:the\s+next\s+|less\s+than\s+|under\s+)?(a|an|one|two|three|four|five|six|a\s+few|a\s+couple(?:\s+of)?|\d+)\s*(days?|weeks?|wks?|months?)\b/i;
const WORD_N: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
export function isCrashCut(text: string): boolean {
  const m = CRASH_CUT.exec(text);
  if (!m) return false;
  const lbs = Number(m[2]) * (/^k/i.test(m[3]) ? 2.2 : 1);
  const n = /^\d/.test(m[4]) ? Number(m[4]) : /few/i.test(m[4]) ? 3 : /couple/i.test(m[4]) ? 2 : (WORD_N[m[4].toLowerCase()] ?? 1);
  const weeks = /^d/i.test(m[5]) ? n / 7 : /^m/i.test(m[5]) ? n * 4.3 : n;
  return lbs >= 5 && lbs / weeks > 2.5;
}

/**
 * Under 18 (NUT-D5): no recommended targets. Only with a cut, a diet or a number — "I'm 16, easy dinner?"
 * still gets a recipe, and "I'm sixteen, I want to get bigger and faster" is still a training request.
 */
export const MINOR_AGE =
  /\b((i'?m|i\s+am|im)\s+(only\s+|just\s+)?(1[0-7]|thirteen|fourteen|fifteen|sixteen|seventeen)\b(?!\s*(lbs?|pounds|kg|min|minutes|miles|reps|%|k\b|x\b|sets?|days?|weeks?|hours?))|(my|our|a|an|the)\s+(\w+\s+)?(son|daughter|kid|kids|child|children|boy|girl|teen|teenager|stepson|stepdaughter|nephew|niece|brother|sister)(\s+(is|who'?s|turned|just\s+turned)\s+|'s\s+|\s*,\s*)(only\s+|just\s+)?([4-9]|1[0-7])\b(?!\s*(lbs?|pounds|kg|min|minutes|months?|%))|\b([4-9]|1[0-7])[-\s]?(year|yr)s?[-\s]?olds?\b|\b([4-9]|1[0-7])\s?(yo|y\/o|y\.o\.)(?=\W|$)|\b(teen|teenager|middle\s+schooler|high\s+schooler|freshman\s+in\s+high\s+school))/i;
/* "my son is 14, set his calories" and "how many calories should a 16 year old eat" passed (QA R2-F6): the age
   was only ever "I'm 16". A teen, a child, "16yo", "my son is 14" now count. The TOPIC still has to be there —
   "my son wants a snack idea" and "my 14 year old wants to help cook" are recipes. */
export const MINOR_TOPIC =
  /\b(cut(ting)?\b(?!\s+(up|into|the|it|them|this|that|in\s+half|board|a|an|my|some|back|out|off))|(cut|cutting)\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg|fat)|(lose|losing|drop|dropping)\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg|fat)|diet(ing)?\b|calorie\w*|cals?\b|kcals?\b|macros?|deficit|fasting|bulk(s|ing|ed)?\b|meal\s+plan\w*|lean\s+out|shred\w*|weight\s+(loss|gain)|gain\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg)|how\s+much\s+(food\s+|protein\s+)?(should|does|do|can|must)\s+([\w'-]+\s+){1,4}(eat|have)\b)/i;
/* "im 16 how do I bulk" and "im 16 give me a cutting meal plan" passed: bare "bulk", "cutting" and a meal plan
   were not topics. NUT-A2-D4 is plain that under 18 gets no plan built on a target. */

/** A reaction or a blocked airway at the table. → urgent */
export const FOOD_URGENT =
  /\b((lips?|tongue|face|mouth|throat)\s+(is\s+|are\s+|feels?\s+|started\s+|keeps?\s+)?(swell\w*|swollen|closing|tight(ening)?)|anaphyla\w*|epi-?pens?|allergic\s+reaction|(i'?m|i\s+am|he'?s|she'?s|they'?re|someone\s+is|is)\s+choking|chok(ed|ing)\s+on|can'?t\s+swallow|hives\s+(and|with)\s+(trouble|can'?t|hard)|(lips?|tongue|mouth|throat|face)\s+(is\s+|are\s+|feels?\s+|felt\s+|got\s+|getting\s+|started\s+|starting\s+|keeps?\s+|went\s+|gone\s+)?(\w+\s+)?(itch\w*|tingl\w*|numb|prickl\w*|burning)|(itchy|tingly|prickly)\s+(lips?|tongue|mouth|throat)|(broke\s+out\s+in|breaking\s+out\s+in|covered\s+in|got|getting|have)\s+hives)\b/i;
/* "my throat feels itchy after shrimp" passed (QA R2-F6). An itching or tingling mouth after food is how a
   reaction starts; this is the "stop and call" line, not a recipe. */

/*
 * ⛔ TYPOS MUST NOT DEFEAT A STOP. "I awnt to die", "I want to uhrt ymself", "I'm on lbood thinners" and
 * "alxatives to drop water weight" all passed (stress test 2026-09-25). Tokens one edit (incl. a swap of two
 * letters) from a word below are read as that word and the whole router runs again. It only ever ADDS a
 * stop: the corrected text is never used for anything else.
 *
 * ⚠ THE LIST IS CHOSEN FOR WHAT IT CAN'T BE CONFUSED WITH. "choking" is one edit from "cooking", "purge" from
 * "purse", "cleanse" from "cleans", "swelling" from "smelling" — each would turn a kitchen sentence into an
 * emergency or an eating-disorder stop, so none of them is here. Their exact spellings still stop.
 */
const TYPO_WORDS = [
  'want', 'wanna', 'hurt', 'harm', 'kill', 'killing', 'myself', 'suicide', 'suicidal', 'anymore', 'alive', 'exist', 'reason', 'bleed', 'ending',
  'blood', 'thinners', 'pressure', 'laxative', 'laxatives', 'diuretic', 'diuretics', 'pregnant', 'diabetic', 'diabetes', 'insulin',
  'cholesterol', 'ozempic', 'wegovy', 'metformin', 'thyroid', 'lactose', 'intolerant', 'breastfeeding', 'medication', 'medications',
  /* The restriction phrasings only stop in their full shape ("water fast", "eating N calories till…"), so these
     are safe to correct: "heating the pan" becomes "eating the pan", which stops nothing. */
  'eating', 'eaten', "haven't", 'fast', 'disgusting', 'starve', 'lowest', 'possible', 'days', 'calories',
];
/* Real words one edit from a stop word, never "corrected". Added 2026-09-26 with the fasting-duration stop: "will
   the chili last for 3 days" would otherwise read "fast for 3 days". */
const REAL_WORDS = new Set(['last', 'past', 'cast', 'vast', 'fats', 'feast', 'east', 'fist']);
function oneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const diff: number[] = [];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 1) return true;
    return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  for (let i = 0; i < l.length; i += 1) if (l.slice(0, i) + l.slice(i + 1) === s) return true;
  return false;
}
/** The sentence with near-miss spellings of `TYPO_WORDS` corrected, or null when nothing changed. */
export function correctedForStops(text: string): string | null {
  const lower = text.toLowerCase();
  const fixed = lower.replace(/[a-z']+/g, (w) => (w.length < 4 || REAL_WORDS.has(w) ? w : TYPO_WORDS.find((c) => oneEdit(w, c)) ?? w));
  return fixed === lower ? null : fixed;
}

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
  // Phone keyboards type a curly apostrophe: "I’m 16" must read as "I'm 16" (QA R2-F6, iPhone input).
  const t = (text ?? '').replace(/[‘’ʼ]/g, "'").trim();
  if (!t) return 'clear';
  const r = routeOnce(t);
  if (r !== 'clear') return r;
  const fixed = correctedForStops(t);
  return fixed ? routeOnce(fixed) : 'clear';
}

/**
 * "Is that bad / is this ok" about FOOD is a food question — "I skip breakfast every day, is that bad" stopped
 * as a symptom question (stress test 2026-09-25). A body part or discomfort in the sentence keeps the stop.
 */
const FOODISH = /\b(eat|eating|ate|food|meal|breakfast|lunch|dinner|snack\w*|recipe|diet|protein|carbs?|sugar|calorie\w*|fruit|coffee)\b/i;

function routeOnce(t: string): MedicalRoute {
  if (CRISIS.test(t)) return 'crisis';
  if (URGENT.test(t) || FOOD_URGENT.test(t)) return 'urgent';
  if (DISORDERED_EATING.test(t) || RESTRICTION.test(t) || isCrashCut(t) || DIET_DRUG.test(t)) return 'care';
  if (EATING_DISORDER_NAMED.test(t)) return RECOVERY.test(t) ? 'advice' : 'care';
  if (MINOR_AGE.test(t) && MINOR_TOPIC.test(t)) return 'care';
  if (DOSE.test(t)) return 'care';
  if (ACUTE.test(t)) return 'acute';
  // "broke my ankle" stops; "broke my PR" does not. The body part is the whole difference.
  if (DAMAGE_NEAR_BODY.test(t)) return 'acute';
  if (MEDICAL_CONTEXT.test(t) || NUTRITION_MEDICAL.test(t) || SYMPTOM_QUESTION.test(t)) return 'advice';
  if (SEEKING_ADVICE.test(t) && !(FOODISH.test(t) && !BODY_PART.test(t) && !mentionsDiscomfort(t))) return 'advice';
  return 'clear';
}

/** Does this sentence stop? The one question every caller actually has. */
export const stopsForMedical = (text: string): boolean => medicalRoute(text) !== 'clear';

/**
 * ══ A STOPPED MESSAGE NEVER RIDES ALONG IN THE HISTORY (QA R2-F1, 2026-09-26) ══
 *
 * The stop used to guard only the CURRENT message. "I'm 20 weeks pregnant" stopped; the next, ordinary
 * question carried it to the model in the chat history, and Holt answered the pregnancy. The PO's 09-22
 * rule is that these topics never reach a model — so the history gets the same check as the question.
 *
 * Drops every turn whose words stop (either voice: a client is not a boundary, and a `holt` turn is only
 * what the client says Holt said), and the Holt turns straight after a dropped athlete turn — his answer
 * to it, which would carry the topic on its own. Used by the Edge Functions on whatever arrives, and by
 * the app's one history builder (`chat-history.ts`) before anything is sent.
 */
export function withoutStoppedTurns<T extends { role: string; text: string }>(
  turns: readonly T[],
  stops: (text: string) => boolean = stopsForMedical,
): T[] {
  const kept: T[] = [];
  let answering = false;
  for (const t of turns) {
    if (t.role !== 'holt') answering = false;
    if (stops(t.text)) {
      if (t.role !== 'holt') answering = true;
      continue;
    }
    if (t.role === 'holt' && answering) continue;
    kept.push(t);
  }
  return kept;
}
