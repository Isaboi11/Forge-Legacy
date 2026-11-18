/**
 * ══ HOLT REMEMBERS YOU — the Sprint 4b contract module (Docs/AI-Sprint-4b-Build-Notes.md) ══
 *
 * Names and numbers both lanes build against. Append only, never rename. Lane A fills `keepFact`;
 * lane B's stored-chat rules live in `past-chats.ts` against `StoredTurn` below.
 *
 * Pure and import-free so `node --test` and the bundled function code can both use it.
 */

/** §1.1 — sent beside `actions_v1` by an app that understands memory. Without it coach-ask is 4a's, byte for byte. */
export const HOLT_MEMORY_CAPS = 'memory_v1';

/** §1.3 — what kind of thing a kept fact is (`holt_notes.kind`, 0278). Null on notes kept before 0278. */
export const FACT_KINDS = ['schedule', 'gym', 'like', 'dislike', 'avoid', 'goal', 'other'] as const;
export type FactKind = (typeof FACT_KINDS)[number];

export interface KeptFact {
  kind: FactKind;
  text: string;
}

/** §1.2 — the rolling recap of a chat's older turns. */
export const RECAP_MAX_CHARS = 600;
/** The recap's ceiling on the wire (`earlier`); the server trims again. */
export const RECAP_WIRE_CHARS = 800;
/** Recap once at least this many spoken turns have fallen out of the window and are not yet in it. */
export const RECAP_BATCH = 4;

export interface ChatRecap {
  text: string;
  /** How many spoken turns, counted from the start of the chat, the recap covers. */
  through: number;
}

/** §1.5 — the past chats screen. */
export const PAST_CHATS_ROUTE = '/holt-chats';

/** §1.5 — one line of a stored chat. `note` = the app's bracketed card note (as `summaryHistory` writes them). */
export interface StoredTurn {
  role: 'athlete' | 'holt' | 'note';
  text: string;
}

/**
 * §1.3 — the memory filter: may this fact be KEPT? The fact as stored (one line, 2–80 characters, a known kind — an
 * unknown kind is 'other'), or null.
 *
 * ⛔ STRICTER THAN A QUESTION'S GUARD, ON PURPOSE. A question may say "my knee hurts, swap it" and get the swap; a fact
 * is kept for months and read back in every ask, so it holds NOTHING about the body: no body part (a training phrase
 * like "leg day" or "shoulder press" is fine, "my shoulder" is not), no symptom, condition, injury, medication or
 * supplement, pregnancy, diagnosis, mental health, weight or body shape. An injury said in passing survives only as
 * "Avoid <movement>" — and an avoid fact that gives a reason is dropped, because the reason is where the medical lives.
 * A dropped fact is a smaller memory; a kept medical one is the failure this exists to prevent.
 *
 * The caller ALSO runs the medical guard (`medicalRoute`, `mentionsDiscomfort`) and the output scan (`scanReply`) on
 * the text — this file cannot import them (it is inlined, import-free, into coach-ask's paste copy).
 */
export function keepFact(fact: { kind?: unknown; text?: unknown }): KeptFact | null {
  if (!fact || typeof fact !== 'object' || typeof fact.text !== 'string') return null;
  const text = fact.text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\.$/, '')
    .trim();
  if (text.length < FACT_MIN_CHARS || text.length > FACT_MAX_CHARS) return null;
  const kind: FactKind = (FACT_KINDS as readonly string[]).includes(fact.kind as string) ? (fact.kind as FactKind) : 'other';
  if (factIsPersonalHealth(text)) return null;
  if (kind === 'avoid' && FACT_AVOID_REASON.test(text)) return null;
  return { kind, text };
}

/** One line, as `holt_notes` holds it (0204: varchar(80), ≥ 2 after trim). */
export const FACT_MAX_CHARS = 80;
export const FACT_MIN_CHARS = 2;
/** At most this many facts are kept from one chat (the rest wait for the next one). */
export const FACTS_PER_CHAT = 5;
/** The notes cap (0204's trigger, unchanged in 4b) — mirrors `HOLT_NOTES_MAX` in holt-notes.ts. */
export const HOLT_NOTES_CAP = 20;

/* ── the memory filter's word lists (≥ the summary's "never include" list: health, pain, injury, illness, medication,
   supplements, pregnancy, mental health, their body or weight) ── */

/** Training phrases that name a body part and are not about the body: removed before the body check. */
const FACT_TRAINING_PHRASE =
  /\b(?:shoulder|hip|back|chest|leg|calf|calves|neck|wrist|ankle|knee|arm|ab|core|glute|lower[- ]body|upper[- ]body|full[- ]body)s?[- ](?:press(?:es)?|raises?|thrusts?|days?|squats?|extensions?|curls?|fl(?:y|ies|ys)|openers?|bridges?|abduction|adduction|rows?|workouts?|sessions?|training|exercises?|work|focus|machines?|hinges?|dips?|ups?|swings?|circuits?|blasters?|kickbacks?)\b|\bbooty days?\b|\bmedicine balls?\b|\bhip[- ]hinge|\b(?:full|upper|lower)[- ]body\b|\bpush[- ]?ups?\b|\bpull[- ]?ups?\b|\bchin[- ]?ups?\b|\bsit[- ]?ups?\b|\bbodyweight (?:workouts?|training|exercises?|sessions?|only|moves|circuits?)\b|\bweight (?:training|room|lifting|belt|vest|bench|plates?|rack|machines?|stack)\b|\bback squats?\b/gi;

/** A joint, organ or other part of the body (muscle names alone are training words — see `FACT_MY_BODY`). */
const FACT_BODY_PART =
  /\b(?:knees?|kneecaps?|ankles?|wrists?|elbows?|necks?|spine|spinal|hips?|shoulders?|lower back|upper back|feet|foot|toes?|heels?|achilles|shins?|groin|ribs?|joints?|tendons?|ligaments?|acl|mcl|pcl|meniscus|rotator|cuffs?|discs?|vertebrae?|sciatic|hearts?|lungs?|bladder|pelvic|pelvis|cervix|uterus|womb|breasts?|nipples?|skin|blood|headaches?|eyes?|eyesight|jaw|teeth|tooth|stomach|gut|bowels?|colon|kidneys?|liver|thyroid|nerves?|brain|bones?|cartilage|hernia|prostate|testicles?|ovar(?:y|ies))\b/i;

/** "my back", "bad knees", "a weak core", "my arms" — a person's own body, whichever part. */
const FACT_MY_BODY =
  /\b(?:my|his|her|their|bad|weak|sore|tight|stiff|cranky|dodgy|tweaked|injured|hurt|hurting|aching|achy|busted|torn|pulled|strained|sprained|broken|fractured|swollen|surgical|surgery on (?:my|the))\s+(?:\w+\s+)?(?:back|body|core|abs|arms?|legs?|chest|glutes?|butt|bum|quads?|hamstrings?|hams|calf|calves|biceps?|triceps?|lats?|traps?|pecs?|delts?|forearms?|thighs?|belly|waist|hips?|muscles?|frame|physique|figure|shape)\b/i;

/** Symptoms, injuries, care and the people who give it. */
const FACT_SYMPTOM =
  /\b(?:pains?|painful|hurts?|hurting|hurt|aches?|aching|achy|sore(?:ness)?|tight(?:ness)?|stiff(?:ness)?|numb(?:ness)?|tingl\w*|swell\w*|swollen|inflam\w*|injur\w*|tears?|torn|strain(?:ed|s)?|sprain(?:ed|s)?|pulled|tweak(?:ed|s)?|broke|broken|fractur\w*|dislocat\w*|surger(?:y|ies)|surgical|operations?|operated|rehab\w*|physio\w*|physical therap\w*|pt|chiro\w*|doctors?|dr|gp|cardiolog\w*|ortho\w*|clinic\w*|hospital\w*|flare\w*|bruis\w*|cramp\w*|dizz\w*|faint\w*|nause\w*|vomit\w*|migraines?|concussion\w*|limp\w*|bleed\w*|recover(?:ing)? from|healing|heal(?:ed|s)?|scars?|scarring|stitches|cast|brace|splint|crutch\w*|cane|wheelchair|sling)\b/i;

/** Named conditions, illness, mental health, eating disorders, allergies and dietary medicine. */
const FACT_CONDITION =
  /\b(?:asthma\w*|diabet\w*|arthrit\w*|hernias?|scoliosis|tendin\w*|bursitis|plantar|fasciitis|sciatica|epilep\w*|seizures?|blood pressure|hypertension|cholesterol|cancer|chemo\w*|tumou?rs?|adhd|autis\w*|anxiety|anxious|depress\w*|bipolar|ptsd|ocd|panic|mental|therap(?:y|ist|ists)|counsel\w*|eating disorders?|anorexi\w*|bulimi\w*|binge\w*|purg\w*|pcos|endometriosis|ibs|crohn\w*|colitis|celiac|coeliac|allerg\w*|intoleran\w*|lactose|gluten|thyroid\w*|osteo\w*|lupus|fibromyalgia|covid|condition|conditions|illness\w*|ill|sick\w*|disease\w*|disorders?|syndromes?|chronic|disab\w*|prosthe\w*|amput\w*|insomnia|apnea|apnoea|menopaus\w*|perimenopaus\w*|menstrua\w*|my period|cardiac|stroke|clots?|anemi\w*|anaemi\w*|hiv|hepatitis|sober|sobriety|addict\w*|alcoholi\w*|recovery from)\b/i;

/** Medication, drugs and supplements — no amount and no name of one is ever kept. */
const FACT_MEDICATION =
  /\b(?:medic\w*|meds|pills?|prescri\w*|insulin|metformin|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide|glp-?1|statins?|steroids?|trt|testosterone|hormones?|hrt|sarms?|peptides?|adderall|ritalin|ssris?|antidepress\w*|inhalers?|epipen|advil|ibuprofen|tylenol|acetaminophen|paracetamol|aspirin|naproxen|aleve|painkillers?|opioids?|cbd|thc|marijuana|cannabis|supplements?|creatine|caffeine|pre-?workouts?|protein (?:powder|shakes?)|whey|casein|bcaas?|melatonin|vitamins?|birth control|contracepti\w*|doses?|dosage|dosing|mg|mcg|injections?|inject\w*)\b/i;

/** Pregnancy and fertility. */
const FACT_PREGNANCY =
  /\b(?:pregnan\w*|expecting|trimester|postpartum|post-partum|prenatal|antenatal|breastfeed\w*|nursing|newborn|baby|c-section|miscarri\w*|ivf|fertility|conceiv\w*|ttc)\b/i;

/** Diagnosis and tests. */
const FACT_DIAGNOSIS = /\b(?:diagnos\w*|mri|x-?rays?|ct scans?|ultrasounds?|scans?|tested positive|blood ?tests?|bloodwork|lab (?:results|work|tests?))\b/i;

/** Weight, body shape and size. */
const FACT_BODY_SHAPE =
  /\b(?:weigh|weighs|weighed|weighing|weight|bodyweight|body (?:image|shape|type|comp\w*|recomp\w*|dysmorph\w*)|fat|fatter|body ?fat|belly|love handles|dad bod|mom bod|skinny|thin|thinner|slim\w*|overweight|obes\w*|bmi|physique|figure|curves?|curvy|toned?|tone up|lean(?:er)? out|get lean|leaner|shred\w*|six-?pack|flat (?:stomach|belly|tummy)|beach body|bikini|waist\w*|thighs?|hips|butt|booty|measurements?|inches|bulk(?:ing)? up|size|calories?|kcal|deficit|surplus|diet\w*|fasting|keto|appearance|ribs)\b/i;

/** Losing or gaining an amount of the athlete's own weight (a lift's weight — "a 225 bench", "dumbbells to 50 lb" — is fine). */
const FACT_WEIGHT_CHANGE =
  /\b(?:lose|lost|losing|gain|gained|gaining|drop|dropped|dropping|shed|shedding|cut|cutting|put on|down)\s+(?:about\s+|around\s+|another\s+)?(?:\d+(?:\.\d+)?\s*)?(?:lbs?|pounds|kgs?|kilos?|stone)\b|\b\d+(?:\.\d+)?\s*(?:lbs?|pounds|kgs?|kilos?)\s+(?:down|lighter|heavier|to go|to lose|overweight)\b/i;

/** An avoid fact that says WHY (the why is where an injury lives) is not kept. */
const FACT_AVOID_REASON = /\b(?:because|due to|since|cause|'cause|cuz|coz|bc|b\/c|as (?:my|it|of|i)|after (?:my|the|a|an|i)|until|so (?:my|it|i)|for (?:my|the|a|an) |told (?:me|to)|recommended|advised|orders?)\b/i;

/** True when a line says anything about the athlete's health, body, weight or medicine (the memory filter's core). */
export function factIsPersonalHealth(text: string): boolean {
  const t = String(text ?? '').replace(/[‘’ʼ]/g, "'");
  const rest = t.replace(FACT_TRAINING_PHRASE, ' ');
  return FACT_MY_BODY.test(rest) || FACT_WEIGHT_CHANGE.test(rest) || FACT_BODY_PART.test(rest) || FACT_SYMPTOM.test(rest) || FACT_CONDITION.test(rest) || FACT_MEDICATION.test(rest) || FACT_PREGNANCY.test(rest) || FACT_DIAGNOSIS.test(rest) || FACT_BODY_SHAPE.test(rest);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// §1.3 — the end-of-chat call with memory: the summary AND the facts, as JSON
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The summariser's prompt with `memory_v1` (coach-ask `summarize`). Old phones keep `SUMMARY_SYSTEM` (ask-tools.ts) and
 * its plain-text reply, byte for byte. Stable, so it caches; nothing interpolated (the kinds are written out).
 */
export const SUMMARY_SYSTEM_V1 = `You write Coach Holt's private memory of a chat with an athlete in a training app. You return two things as JSON: a short summary of the chat, and the lasting facts the athlete told Holt about themselves.

# The summary

Write 1 to 3 short plain sentences, at most 400 characters in total, that Holt would want to know next time: what the athlete asked or wanted, what was decided, built or changed, and anything they said about themselves that matters for coaching (schedule, likes, dislikes, goals, equipment).

- The athlete reads these notes, so write to them in the second person ("You asked how your bench is progressing; it went from 205x5 to 225x5 since March."). Never "the athlete" or "they".
- Only what was actually said in the chat. Never guess or infer.
- Lines in [square brackets] are notes from the app about what it actually did. Trust them over the words: something Holt built or showed is only started or saved if a note says so, otherwise write that Holt offered it. A request that failed, was refused, or that Holt said he could not do was asked for and NOT done — never write it as done or underway.
- Never include anything about health, pain, injury, illness, medication, supplements, pregnancy, mental health, or their body or weight.
- If nothing worth remembering happened (a greeting, a single tap), the summary is exactly: NOTHING
- Plain text only. No lists, no markdown.

# The facts

A fact is something lasting the ATHLETE said about themselves or their training — still true next month — that Holt should not have to ask again. Each has a kind:
- schedule — the days, times or how long they can train ("Trains Mon, Wed, Fri mornings", "45 minutes max on weekdays")
- gym — where they train and what they have ("Trains at home: adjustable dumbbells to 50 lb and a bench", "Gym has no leg press")
- like — what they enjoy ("Likes rowing for conditioning")
- dislike — what they don't enjoy ("Hates burpees")
- avoid — something they asked never to be given, written as "Avoid <movement or exercise>" ("Avoid jumping", "Avoid overhead pressing")
- goal — what they are working toward, with their own numbers and dates ("Half marathon on April 12", "Wants a 225 bench by March")
- other — any other lasting coaching preference ("Left-handed", "Prefers to be told the why")

Rules for facts:
- Only what the athlete said in their own lines. Never something Holt suggested, offered or built, never what the app did, never an inference. If you are not sure they said it, leave it out.
- One short line each, at most 80 characters, in plain words close to theirs. No "you", no "the athlete" — a note, like the examples.
- Never anything about health, pain, injury, illness, medication, supplements, pregnancy, mental health, their body, their weight or their shape — not even as a goal ("lose 20 lbs", "get lean" and "bigger arms" are not facts). If they mentioned an injury or pain in passing and asked to avoid a movement, keep only "Avoid <movement>" — no body part, no reason, nothing about why.
- Not a fact: something for today or this week only, a question, a one-off request, how they feel today, or anything already in "Already kept" below (or a close rewording of it).
- At most 5 facts. None is fine: an empty list.`;

/** The JSON the summariser returns with `memory_v1` (structured output — no field can hold anything else). */
export const MEMORY_SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'facts'],
  properties: {
    summary: { type: 'string' },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'text'],
        properties: {
          kind: { type: 'string', enum: ['schedule', 'gym', 'like', 'dislike', 'avoid', 'goal', 'other'] },
          text: { type: 'string' },
        },
      },
    },
  },
} as const;

/** The user turn for the memory summary: what is already kept (so nothing is kept twice), then the chat. */
export function memorySummaryTurn(transcript: string, kept: readonly string[]): string {
  const known = kept
    .map((k) => String(k ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 20);
  return `Already kept about this athlete:\n${known.length ? known.map((k) => `- ${k}`).join('\n') : '(nothing yet)'}\n\nThe chat:\n${transcript}`;
}

/** The model's JSON, read leniently: `{ summary, facts }` with only strings, or null when it is not that shape. */
export function parseMemorySummary(raw: unknown): { summary: string; facts: { kind: unknown; text: unknown }[] } | null {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    const s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      v = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as { summary?: unknown; facts?: unknown };
  const summary = typeof o.summary === 'string' ? o.summary : '';
  const facts = Array.isArray(o.facts) ? (o.facts.filter((f) => f && typeof f === 'object') as { kind: unknown; text: unknown }[]) : [];
  return { summary, facts };
}

/**
 * Which proposed facts to WRITE: each through `keepFact` and the caller's `stops` (the medical guard + the scan), then
 * no duplicate of what is kept or of each other (case-insensitive), at most `FACTS_PER_CHAT`, and only as many as fit
 * under the cap (`room`). Order is the model's.
 */
export function factsToKeep(
  proposed: readonly { kind?: unknown; text?: unknown }[],
  kept: readonly string[],
  room: number,
  stops: (text: string) => boolean,
): KeptFact[] {
  const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const seen = new Set(kept.map((k) => key(String(k ?? ''))));
  const out: KeptFact[] = [];
  for (const p of proposed) {
    if (out.length >= Math.min(FACTS_PER_CHAT, Math.max(0, room))) break;
    const f = keepFact(p);
    if (!f || stops(f.text)) continue;
    const k = key(f.text);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// §1.2 — the rolling recap of THIS chat
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The recap writer's prompt (coach-ask `recap`, Haiku). Stable, cached, nothing interpolated. */
export const RECAP_SYSTEM = `You keep Coach Holt's running notes of the chat he is having right now with an athlete in a training app. The chat is too long to send whole, so the older part is folded into these notes, and Holt reads them before the newest turns.

You are given the notes so far (maybe none) and the next part of the chat. Write the updated notes: everything from the old notes that still matters, plus what the new part adds.

- Keep what Holt would need to carry on the conversation: what the athlete asked for and decided, every number, day, date, time, distance, weight on the bar and name they gave, what Holt offered or explained, what is still open or was left for later.
- Short plain sentences about "the athlete" and "Holt", at most 600 characters in total. Newest decisions win: if they changed their mind, keep only the latest.
- Only what was said. Never guess, never add advice.
- Never include anything about health, pain, injury, illness, medication, supplements, pregnancy, mental health, or their body or weight — leave those parts out entirely.
- If there is nothing worth keeping, reply with exactly: NOTHING
- Plain text only. No lists, no markdown, no headings.`;

/** The recap writer's user turn. */
export function recapTurn(prior: string, transcript: string): string {
  const p = String(prior ?? '').replace(/\s+/g, ' ').trim();
  return `Notes so far:\n${p || '(none)'}\n\nThe next part of the chat:\n${transcript}`;
}

/**
 * A recap as it may be kept or sent: whitespace collapsed, every sentence `stops` catches removed (the medical guard,
 * passed in — this file cannot import it), capped at `max` at a sentence end where it can be. Null when nothing is left.
 */
export function cleanRecap(raw: unknown, stops: (sentence: string) => boolean, max: number = RECAP_MAX_CHARS): string | null {
  const t = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  if (!t || /^nothing\.?$/i.test(t)) return null;
  const sentences = (t.match(/[^.!?]+[.!?]*/g) ?? [t]).map((x) => x.trim()).filter(Boolean);
  const kept: string[] = [];
  let len = 0;
  for (const s of sentences) {
    if (stops(s)) continue;
    const add = (kept.length ? 1 : 0) + s.length;
    if (len + add > max) {
      if (!kept.length) kept.push(`${s.slice(0, max - 1).trimEnd()}…`);
      break;
    }
    kept.push(s);
    len += add;
  }
  const out = kept.join(' ').trim();
  return out.length >= 10 ? out : null;
}

/**
 * The recap as the model reads it (§1.1): a bracketed block in the MESSAGES, never the system block, so the cached
 * prefix is byte-identical with and without memory. Says plainly whose words these are.
 */
export function earlierBlock(recap: string): string {
  return `[Earlier in this conversation — the app's short notes of the turns before the ones below, not the athlete's own words: ${String(recap ?? '').replace(/\s+/g, ' ').trim()}]`;
}

/** The placeholder coach-ask puts first when Holt opened the chat (the API wants a user turn first). */
export const OPENED_PLACEHOLDER = '(The athlete opened the chat with Holt.)';

/**
 * `messages` with the recap ahead of the history: it takes the opener placeholder's place, or leads the first user
 * turn. Never touches anything else, and returns the same array when there is no recap.
 */
export function withEarlier<M extends { role: 'user' | 'assistant'; content: string }>(messages: M[], recap: string | null | undefined): M[] {
  if (!recap || !messages.length) return messages;
  const block = earlierBlock(recap);
  const first = messages[0];
  if (first.role !== 'user') return [{ role: 'user', content: block } as M, ...messages];
  return [{ ...first, content: first.content === OPENED_PLACEHOLDER ? block : `${block}\n\n${first.content}` }, ...messages.slice(1)];
}
