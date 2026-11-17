/**
 * ══ WHAT HOLT SAID, CHECKED BEFORE THE ATHLETE KEEPS IT (AI Road to 10 Sprint 2 — CH-2 · audit C-I1, C-D6) ══
 *
 * `Docs/AI-Sprint-2-Build-Notes.md` §1.1. The medical stop has always been code on the way IN (`medical-routing.ts`):
 * what the athlete types is classified before a credit or a model. Nothing checked what came back OUT. The PO's
 * 09-22 rule ("Holt: medical = legal caution, STOP") exists because the live model ignored the prompt's "never
 * reassure about a symptom" line and said "cracking by itself usually isn't a red flag". The prompt is a request;
 * this is the layer that cannot be talked out of it.
 *
 * `scanReply(text, asked?)` reads a model's words and says whether they cross the line:
 *
 *   · `dose`        — an amount of a drug, medication or supplement ("take 400 mg of ibuprofen", "2 tablets",
 *                     "5 g of creatine a day", "pop an Advil").
 *   · `reassurance` — telling someone a symptom is nothing ("that's normal" about soreness, "probably fine",
 *                     "nothing to worry about", "not a red flag", "it'll go away on its own").
 *   · `diagnosis`   — naming what is wrong ("sounds like tendinitis", "you probably strained it", "shin splints").
 *   · `clinical`    — the clinical names for posture and movement faults (`valgus`, `kyphosis`, `impingement`…).
 *                     ⚠ ONE LIST, TWO HOMES: form check's sentence guard (`form-check.ts`) carries a byte-identical
 *                     copy of {@link CLINICAL_TERMS}, because that file must stay import-free too; a test holds them
 *                     equal (`output-scan.test.mjs`).
 *
 * A hit is a STOP: the caller takes the words back and shows the medical stop card (coach-ask's `retract` line, the
 * other functions' existing stop reply), settles the call `guarded` and refunds it. It never edits a sentence.
 *
 * ══ ⛔ IT ONLY ADDS STOPS ══
 *
 * Nothing here can let a sentence through that something else stopped. Its false positives cost one stop card on an
 * ordinary answer, refunded; its false negatives are the thing the PO said to stay away from. When the two disagree
 * the corpus decides (`src/domain/coach/__tests__/safety-both-ways.mjs`), and it grows in BOTH directions — lines
 * that must stop, and ordinary coaching that must still flow ("rest 90 seconds", "200 g of chicken", "a stall after
 * three months is normal", "that's a normal training response after a deload").
 *
 * ══ HOW "NORMAL" IS READ ══
 *
 * "Normal", "common", "fine", "nothing to worry about" are coaching words as often as reassurance. They stop only
 * beside a SYMPTOM — pain, soreness, swelling, numbness, dizziness, a joint that clicks — in the same sentence, or in
 * the sentence next to a short or pronoun-led one ("Soreness after leg day? Totally normal."), or anywhere in a reply
 * to a message that itself named a symptom ("my legs are sore, swap tomorrow" → "That's normal after a big week").
 * "Your squat stalled — that's normal after three months" has no symptom and flows.
 *
 * ⚠ PURE AND IMPORT-FREE. Four Edge Functions inline this file into their paste copies (`scripts/build-*-deploy.mjs`
 * refuses a module with imports), and the app imports it too. Every top-level name is prefixed `SCAN_` (or is an
 * export no other inlined module declares) because an inlined module shares one scope with its neighbours.
 */

export type ScanKind = 'dose' | 'reassurance' | 'diagnosis' | 'clinical';

export type ScanResult = { hit: false } | { hit: true; kind: ScanKind; match: string };

const SCAN_CLEAR: ScanResult = { hit: false };

/** A capture group's source, for building the bigger patterns. */
const scanSrc = (re: RegExp): string => re.source;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The shared clinical list (form check's sentence guard holds a byte-identical copy)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The clinical names for posture and movement — what a coach says in plain words ("your knees move in", "your lower
 * back rounds") and a clinician says as a finding. Audit V-D6: build 11 dropped these from form check, the web and
 * the server did not. Same list in both places now, and in Holt's chat.
 */
// ── CLINICAL TERMS: begin ──
export const CLINICAL_TERMS =
  /\b(valgus|varus|kyphos\w*|kyphotic|lordos\w*|lordotic|scolio\w*|hyperlordo\w*|hyperkyphos\w*|impinge\w*|spondyl\w*|stenosis|dyskines\w*|scapular\s+winging|winged\s+scapula\w*|anterior\s+pelvic\s+tilt|pelvic\s+obliquity|trendelenburg|genu\s+(valgum|varum|recurvatum)|pes\s+(planus|cavus)|hypermobil\w*|crossed\s+syndrome)\b/i;
// ── CLINICAL TERMS: end ──

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Dose
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Medication and drugs — what no coach gives an amount for, or tells anyone to take. ⚠ Not creatine or caffeine:
 * the prompt lets Holt give general context about those ("one of the most studied supplements"), so they are
 * {@link SCAN_SUPPLEMENT} and stop only with an amount.
 */
const SCAN_DRUG =
  /(ibuprofen|advil|motrin|nurofen|aleve|naproxen|tylenol|acetaminophen|paracetamol|panadol|aspirin|excedrin|nsaids?|anti[-\s]?inflammatories|anti[-\s]?inflammatory\s+(pills?|tablets?|meds?|medications?|drugs?)|pain\s?killers?|pain\s+(meds?|medications?|relievers?|pills?)|codeine|tramadol|oxycodone|hydrocodone|opioids?|morphine|gabapentin|muscle\s+relaxants?|cyclobenzaprine|flexeril|prednisone|cortisone|corticosteroids?|steroids?|anabolics?|testosterone|trt|sarms?|ostarine|rad[-\s]?140|ligandrol|cardarine|mk[-\s]?677|trenbolone|tren|anavar|oxandrolone|dianabol|winstrol|deca|hgh|growth\s+hormone|bpc[-\s]?157|tb[-\s]?500|peptide\s+(therapy|injections?|cycles?)|clenbuterol|clen|dnp|ephedrine|ephedra|yohimbine|adderall|ritalin|modafinil|kratom|benadryl|diphenhydramine|zzzquil|nyquil|unisom|antihistamines?|antibiotics?|insulin|metformin|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide|phentermine|laxatives?|diuretics?|water\s+pills?|sleeping\s+pills?|sleep\s+aids?|melatonin|inhalers?|epi-?pens?)/;

/**
 * Supplements — fine to talk about, never to dose. ⚠ Food is not here: protein powder, whey, collagen, espresso,
 * turmeric and baking soda are recipe ingredients with amounts in Holt's kitchen ("1 scoop protein powder",
 * "1 tsp turmeric"), and a stop on them would retract a dish.
 */
const SCAN_SUPPLEMENT =
  /(creatine|caffeine|pre[-\s]?workouts?|beta[-\s]?alanine|citrulline|arginine|bcaas?|eaas?|glutamine|hmb|ashwagandha|magnesium|zinc|zma|iron\s+(supplements?|pills?|tablets?)|vitamins?(\s+[a-k]\d{0,2})?|multivitamins?|fish\s+oil|omega[-\s]?3s?|glucosamine|chondroitin|curcumin|tongkat(\s+ali)?|fadogia|shilajit|sodium\s+bicarbonate|carnitine|cla|green\s+tea\s+extract|fat[-\s]?burners?|electrolyte\s+(tablets?|pills?|capsules?)|supplements?|stims?|stimulants?)/;

const SCAN_SUBSTANCE = `(?:${scanSrc(SCAN_DRUG)}|${scanSrc(SCAN_SUPPLEMENT)})`;
const SCAN_NUMBER = String.raw`\d+(?:[.,]\d+)?(?:\s*(?:-|–|to)\s*\d+(?:[.,]\d+)?)?`;
const SCAN_COUNT = String.raw`(?:\d+|a|an|one|two|three|four|five|six|half\s+an?|a\s+couple(?:\s+of)?|a\s+few|another|some)`;
const SCAN_MEASURE = String.raw`(?:g|grams?|scoops?|servings?|tsp|teaspoons?|tbsp|tablespoons?|ml|milliliters?|millilitres?|cc|units?|doses?)`;

const SCAN_DOSE: readonly RegExp[] = [
  // Any milligram, microgram or IU amount — nothing in training is measured in them.
  new RegExp(String.raw`\b${SCAN_NUMBER}\s*(?:mg|mcg|µg|ug|milligrams?|micrograms?|iu)\b`, 'i'),
  // A count of pills, tablets, puffs, shots of medicine.
  new RegExp(String.raw`\b${SCAN_COUNT}\s+(?:[\w-]+\s+)?(?:pills?|tablets?|capsules?|caplets?|softgels?|gel\s?caps?|lozenges?|puffs?|injections?|suppositor\w*)\b`, 'i'),
  // An amount beside a substance, either order, inside one sentence.
  new RegExp(String.raw`\b${SCAN_NUMBER}\s*${SCAN_MEASURE}\s+(?:of\s+)?(?:(?:your|the|pure|plain|a)\s+)?(?:[\w-]+\s+)?${SCAN_SUBSTANCE}\b`, 'i'),
  new RegExp(
    String.raw`\b${SCAN_SUBSTANCE}(?:\s*[:,(—–-]\s*|\s+(?:(?:at|is|of|around|about|roughly|dose|dosage|dosing|usually)\s+)*)${SCAN_NUMBER}\s*${SCAN_MEASURE}\b`,
    'i',
  ),
  new RegExp(String.raw`\b(?:a|one|two|three|half\s+a|a\s+couple\s+of)\s+(?:heaping\s+|level\s+|full\s+)?scoops?\s+of\s+${SCAN_SUBSTANCE}\b`, 'i'),
  // "two Advil", "an ibuprofen", "some painkillers".
  new RegExp(String.raw`\b${SCAN_COUNT}\s+${scanSrc(SCAN_DRUG)}\b`, 'i'),
  // Telling them to take one: "take ibuprofen", "try melatonin", "use your inhaler".
  new RegExp(String.raw`\b(?:take|taking|try|trying|pop|popping|use|using|grab|start(?:ing)?\s+(?:on|taking))\s+(?:an?\s+|some\s+|your\s+|the\s+)?${scanSrc(SCAN_DRUG)}\b`, 'i'),
  // A schedule for one: "ibuprofen every 6 hours", "melatonin before bed".
  new RegExp(
    String.raw`\b${scanSrc(SCAN_DRUG)}\b[^.?!\n]{0,40}\b(?:every\s+\d+(?:\s*(?:-|to)\s*\d+)?\s+hours?|(?:once|twice|three\s+times)\s+(?:a|per)\s+day|daily|per\s+day|a\s+day|before\s+bed|on\s+an\s+empty\s+stomach)\b`,
    'i',
  ),
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Diagnosis
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Anatomy as athletes say it. Only ever a qualifier here, never a stop on its own. */
const SCAN_BODY =
  /(shoulders?|rotator\s+cuff|labrum|knees?|kneecaps?|acl|mcl|meniscus|back|lower\s+back|spine|discs?|neck|hips?|ankles?|wrists?|elbows?|arms?|legs?|foot|feet|hands?|fingers?|ribs?|collarbone|hamstrings?|quads?|calf|calves|groin|achilles|biceps?|triceps?|pecs?|chest|glutes?|shins?|traps?|lats?|obliques?|adductors?|joints?|tendons?|ligaments?|muscles?|hammy|hammies)/;

/** A named condition or injury — Holt naming one is a diagnosis, whatever the sentence around it says. */
const SCAN_CONDITION =
  /\b(tendinitis|tendonitis|tendinopathy|tendinosis|bursitis|(osteo)?arthritis|fasciitis|plantar\s+fasci\w*|epicondyl\w*|tennis\s+elbow|golfer'?s\s+elbow|jumper'?s\s+knee|runner'?s\s+knee|shin\s+splints?|it\s?band\s+syndrome|itbs|piriformis\s+syndrome|carpal\s+tunnel|frozen\s+shoulder|adhesive\s+capsulitis|costochondritis|compartment\s+syndrome|osgood[-\s]schlatter\w*|sever'?s\s+disease|si\s+joint\s+dysfunction|sacroiliac\s+\w+|facet\s+(joint\s+)?(syndrome|irritation|arthropathy)|degenerative\s+disc|(herniated|bulging|slipped|ruptured)\s+discs?|herniat\w*|sciatica|stress\s+fractures?|fractur\w*|dislocat\w*|subluxat\w*|labral\s+tears?|slap\s+tears?|(meniscus|meniscal)\s+tears?|(acl|mcl|pcl|lcl)\s+(tears?|sprains?|injur\w*)|rotator\s+cuff\s+(tears?|injur\w*|tendin\w*|strain\w*)|torn\s+(\w+\s+)?(acl|mcl|meniscus|labrum|rotator\s+cuff|ligament|tendon|muscle|hamstring|bicep|pec|achilles|calf|quad|groin)|pulled\s+(a\s+)?(muscle|hamstring|groin|calf|quad|hammy|lat|pec)|pinched\s+nerve|nerve\s+(pain|irritation|impingement|entrapment|damage|compression)|sprain\w*|concussion\w*|whiplash|hernia\w*|rhabdo\w*|muscle\s+(knots?|spasms?|strains?|tears?|pulls?)|trigger\s+points?|overuse\s+injur\w*|repetitive\s+strain|patell\w+\s+(tendin\w*|pain\s+syndrome)|patellofemoral|chondromalacia|achilles\s+(tendin\w*|rupture|tear)|(hamstring|groin|calf|quad|lat|pec|oblique|adductor)\s+(strain|tear|pull)s?)\b/i;

/** The injury nouns a diagnosis is made of — never a stop alone ("less strain on your elbows" is coaching). */
const SCAN_INJURY_NOUN = String.raw`(?:strain|sprain|tear|impingement|inflammation|irritation|injur\w*|knot|spasm|nerve(?:\s+\w+)?|tendon\w*|ligament|cartilage|disc|bruise|contusion)`;

const SCAN_DIAGNOSIS: readonly RegExp[] = [
  SCAN_CONDITION,
  // "Sounds like a strain", "looks like you've tweaked your hamstring".
  new RegExp(
    String.raw`\b(?:sounds|looks|seems|feels)\s+like\s+(?:you(?:'ve|\s+have|\s+may\s+have|\s+might\s+have)?\s+)?(?:a|an|some|your|the)?\s*(?:[\w-]+\s+){0,2}${SCAN_INJURY_NOUN}\b`,
    'i',
  ),
  new RegExp(
    String.raw`\b(?:sounds|looks|seems)\s+like\s+(?:you(?:'ve|\s+have)?\s+)(?:strained|pulled|tweaked|tore|torn|sprained|irritated|inflamed|aggravated|injured|bruised|pinched|impinged)\b`,
    'i',
  ),
  // "You probably strained it", "it could be a pinched nerve", "most likely just a muscle strain".
  // "You could have pulled the bar closer" is a technique note: the verb needs an object that is the body.
  new RegExp(
    String.raw`\b(?:you(?:'ve|\s+have)?|it|that|this)\s+(?:probably|likely|might|may|could|must)\s+(?:have\s+|'ve\s+)?(?:just\s+)?(?:strained|pulled|tweaked|tore|sprained|irritated|aggravated|injured|bruised|pinched)\s+(?:it|something|that|this|(?:your|a|the)\s+(?:\w+\s+)?(?:${scanSrc(SCAN_BODY)}|nerve))\b`,
    'i',
  ),
  /\b(it|that|this|something)\s+(probably|likely|might|may|could|must)\s+be\s+(just\s+)?(strained|torn|sprained|irritated|inflamed|aggravated|injured|bruised|pinched|impinged)\b/i,
  new RegExp(
    String.raw`\b(?:probably|likely|possibly|most\s+likely|could\s+be|might\s+be|may\s+be|sounds\s+like)\s+(?:just\s+)?(?:a|an|some)\s+(?:[\w-]+\s+)?${SCAN_INJURY_NOUN}\b`,
    'i',
  ),
  // "You strained your hamstring" — a past-tense damage verb onto a body part.
  new RegExp(String.raw`\byou(?:'ve)?\s+(?:strained|tweaked|tore|sprained|injured|aggravated|irritated)\s+(?:your|a|the)?\s*(?:\w+\s+)?${scanSrc(SCAN_BODY)}\b`, 'i'),
  // "A classic sign of…", "symptoms of a strain".
  // ⚠ Not "a common cause of a stalled bench" or "a common sign of fatigue" — those are coaching.
  /\b(classic|tell[-\s]?tale)\s+(sign|symptom)s?\s+of\b/i,
  new RegExp(String.raw`\b(?:signs?|symptoms?)\s+of\s+(?:a|an)?\s*(?:\w+\s+)?(?:${SCAN_INJURY_NOUN}|condition|disorder|infection|syndrome)\b`, 'i'),
  new RegExp(String.raw`\b(?:is\s+)?caused\s+by\s+(?:a|an|your)?\s*(?:\w+\s+)?(?:${SCAN_INJURY_NOUN}|joint)\b`, 'i'),
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Reassurance
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Reassurance that only ever means "your symptom is nothing" — a stop wherever it is. */
const SCAN_REASSURE_HARD =
  /\b(red\s+flags?|harmless|benign|(probably|likely|almost\s+certainly|most\s+likely)\s+nothing\b|(it'?s|that'?s|probably|likely|just)\s+(just\s+)?(gas|trapped\s+wind|indigestion|heartburn|a\s+stitch|a\s+side\s+stitch)\b|(go(es)?\s+away|clear(s)?\s+up|settle(s)?\s+down|heal(s)?|resolve(s)?|sort(s)?\s+(it)?self\s+out|fix(es)?\s+itself)\s+(on\s+its\s+own|by\s+itself|itself|with\s+(time|rest))|(no|don'?t|do\s+not|won'?t|wouldn'?t)\s+(really\s+)?need\s+(to\s+(see|go\s+to|call|bother\s+with)\s+)?(an?|the|your)\s+(doctor|physio\w*|gp|physical\s+therapist|specialist|er|emergency\s+room|hospital)|(no\s+need|nothing)\s+to\s+(see|call)\s+(an?|the|your)\s+(doctor|physio\w*|gp)|(it|that|this)\s+shouldn'?t\s+(hurt|be\s+painful|cause\s+(any\s+)?pain)|(that'?s|it'?s|this\s+is|isn'?t|is\s+not)\s+(not\s+)?an\s+injury)\b/i;

/** Words that reassure when a symptom is in view, and are ordinary coaching when one is not. */
const SCAN_REASSURE_SOFT =
  /\b(((completely|perfectly|totally|pretty|very|quite|super|fairly|entirely)\s+)?normal|common|(to\s+be\s+)?expected|expect\s+(some|a\s+(bit|little)\s+of|to\s+(feel|be))|typical(ly)?|natural|(probably|usually|generally|likely|should\s+be|will\s+be|'ll\s+be|be|is|'s|are|'re|feels?|looks?|seems?|sounds?)\s+(totally\s+|completely\s+|perfectly\s+|probably\s+|usually\s+|just\s+)?(fine|ok|okay|alright|all\s+right|nothing)|nothing\s+(serious|major|to\s+(worry|be\s+(worried|concerned))\s+about)|no\s+(need\s+to\s+)?worr(y|ies)|don'?t\s+worry|not\s+(a\s+|any\s+)?(big\s+deal|concern|worry|problem|issue)|nothing\s+to\s+(fret|stress)\s+about|(not|isn'?t|aren'?t)\s+serious|part\s+of\s+(the\s+process|training|it|lifting|getting\s+(stronger|fitter))|(will|should|'ll|usually|tends\s+to)\s+(pass|fade|ease(\s+off)?|settle(\s+down)?|go\s+away|wear\s+off|calm\s+down|be\s+gone|subside|disappear)|(goes|go|went)\s+away|wears?\s+off|(it'?s|that'?s|this\s+is)\s+(just|only|simply)|just\s+(your\s+)?(body|muscles?)\s+(adapting|adjusting|recovering|getting\s+used))\b/i;

/** A symptom in view. ⚠ "stiff-leg", "tweak your grip", "chest up" and "the burn of a hard set" are not here. */
const SCAN_SYMPTOM = new RegExp(
  String.raw`\b(?:pain(?:s|ful|fully)?|hurt\w*(?!\s+(?:to\b|your\s+(?:progress|gains|chances|numbers)))|ach(?:e|es|ed|ing|y)|sore\w*|doms|stiff(?:ness|er)?\b(?!-leg|\s+leg(?:ged)?\s+(?:dead|rdl|good))|tightness|cramp\w*|spasm\w*|twinge\w*|tweaked|strained|sprain\w*|swell\w*|swollen|bruis\w*|numb(?!er)\w*|tingl\w*|pins\s+and\s+needles|dizz\w*|light[-\s]?headed\w*|faint\w*|wooz\w*|nause\w*|(?:feel|feels|feeling|felt)\s+(?:a\s+bit\s+|kind\s+of\s+|really\s+|so\s+)?(?:sick|ill|unwell|faint)|queas\w*|vomit\w*|throw(?:ing)?\s+up|threw\s+up|puk(?:e|ed|ing)|headaches?|migraines?|palpitations?|heart\s+(?:is\s+)?(?:racing|pounding|skipping|fluttering)|racing\s+heart|chest\s+(?:pain|tightness|pressure)|tight\s+chest|short(?:ness)?\s+of\s+breath|breathless\w*|burning\s+sensation|shooting\s+(?:pain|sensation)|throbb\w*|tenderness|tender\s+to\s+(?:the\s+)?touch|inflam\w*|bleed\w*|blood\s+in|rash\w*|itchy|itchiness|hives|shaky|trembl\w*|tremors?|injur\w*|discomfort|uncomfortable|niggl\w*|flare[-\s]?ups?|symptoms?)\b` +
    '|' +
    // "Cracking in my knee" — but not the cue "pop your hips through", so a preposition is required.
    String.raw`\b(?:crack\w*|pop(?:s|ping|ped)?|click\w*|grind\w*|clunk\w*|crunch\w*|burn(?:s|ing)?)\s+(?:in|from|of|at|around)\s+(?:the\s+|your\s+|my\s+|their\s+)?(?:[\w'-]+\s+)?${scanSrc(SCAN_BODY)}\b` +
    '|' +
    String.raw`\b(?:tight|weird|funny)\s+(?:[\w'-]+\s+)?${scanSrc(SCAN_BODY)}\b` +
    '|' +
    String.raw`\b${scanSrc(SCAN_BODY)}\s+(?:[\w'-]+\s+){0,3}(?:crack\w*|pop(?:s|ping|ped)?|click\w*|grind\w*|clunk\w*|crunch\w*|tight|weird|funny|burn(?:s|ing)?)\b`,
  'i',
);

/** A sentence that points back at something already said: "That's normal.", "Totally common." */
const SCAN_POINTS_BACK =
  /^(that'?s|that\s+is|it'?s|it\s+is|this\s+is|totally|completely|perfectly|very|pretty|quite|nothing|don'?t\s+worry|no\s+worries|normal|common|happens|yep|yeah|yes|sure|fine|all\s+normal)\b/i;

/** Sentences, terminators kept with their sentence; a line break ends one too. */
function scanSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const scanWords = (s: string): number => s.split(/\s+/).filter(Boolean).length;

/** Curly quotes and apostrophes straightened, so "that’s normal" reads as "that's normal" (phone keyboards). */
const scanNormal = (text: string): string => text.replace(/[‘’ʼ`´]/g, "'").replace(/[“”]/g, '"');

/**
 * Phrases that LOOK like a stop word and are not one, taken out before the lists are read. Done as text, not as a
 * lookbehind: the phone runs Hermes, and a variable-length lookbehind is not worth betting a module load on.
 *   · "won't hurt to add a rest day" — an idiom, not a symptom;
 *   · "band shoulder dislocates" — a catalogue warm-up (`band-shoulder-dislocate`), not a dislocation.
 */
const scanIdiomsOut = (text: string): string =>
  text
    .replace(/\b(?:won'?t|wouldn'?t|doesn'?t|didn'?t|can'?t|couldn'?t|never|not)\s+hurt\b/gi, ' ')
    .replace(/\b(?:(?:band|pvc|stick|dowel)[-\s]+)?shoulder[-\s]+dislocates?\b/gi, 'shoulder pass-throughs');

const scanHasSymptom = (s: string): boolean => SCAN_SYMPTOM.test(s);

function scanReassurance(text: string, asked: string): string | null {
  const hard = SCAN_REASSURE_HARD.exec(text);
  if (hard) return hard[0];
  const said = scanSentences(text);
  const askedSymptom = !!asked && scanHasSymptom(asked);
  for (let i = 0; i < said.length; i += 1) {
    const soft = SCAN_REASSURE_SOFT.exec(said[i]);
    if (!soft) continue;
    if (scanHasSymptom(said[i])) return soft[0];
    const pointsBack = SCAN_POINTS_BACK.test(said[i]) || scanWords(said[i]) <= 4;
    if (!pointsBack) continue;
    if (askedSymptom) return soft[0];
    if ((i > 0 && scanHasSymptom(said[i - 1])) || (i + 1 < said.length && scanHasSymptom(said[i + 1]))) return soft[0];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The scan
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Does this reply cross the medical line? `asked` is what the athlete said that this replies to, when there is one:
 * it only ever adds a stop (a reply to "my knee hurts" that says "that's normal" is about the knee).
 *
 * Checked in order — dose, diagnosis, clinical, reassurance — and the first hit is returned with the words that hit.
 * ⚠ `match` is the model's words: for logs and tests, never shown to the athlete and never sent to the app.
 */
export function scanReply(text: string, asked?: string | null): ScanResult {
  const t = scanIdiomsOut(scanNormal(typeof text === 'string' ? text : '')).trim();
  if (!t) return SCAN_CLEAR;
  for (const re of SCAN_DOSE) {
    const m = re.exec(t);
    if (m) return { hit: true, kind: 'dose', match: m[0] };
  }
  for (const re of SCAN_DIAGNOSIS) {
    const m = re.exec(t);
    if (m) return { hit: true, kind: 'diagnosis', match: m[0] };
  }
  const clinical = CLINICAL_TERMS.exec(t);
  if (clinical) return { hit: true, kind: 'clinical', match: clinical[0] };
  const reassured = scanReassurance(t, scanIdiomsOut(scanNormal(typeof asked === 'string' ? asked : '')));
  if (reassured) return { hit: true, kind: 'reassurance', match: reassured };
  return SCAN_CLEAR;
}

/**
 * Several fields of one answer, each read on its own (a dish's name, its "why", every step; a form read's lines).
 * The first hit wins. Fields are scanned apart so a step about cracking an egg never sits beside "normal" in another.
 */
export function scanTexts(texts: readonly unknown[], asked?: string | null): ScanResult {
  for (const x of texts) {
    if (typeof x !== 'string') continue;
    const r = scanReply(x, asked);
    if (r.hit) return r;
  }
  return SCAN_CLEAR;
}

/** Every string inside a value (an action's input, a dish), depth-first, for {@link scanTexts}. Capped. */
export function scanStringsOf(value: unknown, max = 200): string[] {
  const out: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (out.length >= max || depth > 6) return;
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) for (const x of v) walk(x, depth + 1);
    else if (v && typeof v === 'object') for (const x of Object.values(v as Record<string, unknown>)) walk(x, depth + 1);
  };
  walk(value, 0);
  return out;
}
