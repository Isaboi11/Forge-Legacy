// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DASHBOARD PASTE COPY of supabase/functions/coach-form-check/index.ts — GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/coach/medical-routing.ts and src/domain/coach/form-check.ts, which
// the Supabase dashboard editor cannot reach. This copy inlines those modules in place of their import
// lines; nothing else differs. Regenerate with `node scripts/build-coach-form-check-deploy.mjs`.
//
// Supabase dashboard → Edge Functions → Deploy a new function → "Via Editor" → name it
// coach-form-check → replace the editor contents with this whole file → Deploy.
// ANTHROPIC_API_KEY is already set (coach-interpret, coach-ask and program-photo-read use the same secret).
// `form_check` is already priced in coach_ai_config.action_credits (migration 0144) — no migration needed.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';
export const ACUTE = /\b(ruptur\w*|fractur\w*(?!\s+(my|the|our)\s+(schedule|week|plans?|routine|program|calendar))|surger\w*|operation|operated|post[-\s]?op|sprain\w*|dislocat\w*|physio\w*|physical\s+therap\w*|doctor|surgeon|orthopa?ed\w*|mri|x[-\s]?ray|numb\w*|tingl\w*|pinched|shooting\s+pain|swell\w*|swollen|herniat\w*|bulging\s+disc|sciatic\w*|concussion|whiplash)\b/i;
export const CRISIS = /\b(kill(ing)?\s+myself|kms|suicid\w*|end(ing)?\s+(it\s+all|my\s+life|it)\b(?!\s+(early|there|here|with|on|at))|want(ed)?\s+to\s+die|wanna\s+die|rather\s+(not\s+exist|be\s+dead)|(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|be\s+here\s+anymore)|hurt(ing)?\s+myself|harm(ing)?\s+myself|self[-\s]?harm\w*|cut(ting)?\s+myself|(hit|punch|punish)(ing)?\s+myself|no\s+reason\s+to\s+live|(till|until)\s+(they|it|i)\s+bleed|make\s+myself\s+bleed)\b/i;
export const URGENT = /\b(chest\s+(pain|pressure|tightness|is\s+tight|feels\s+tight|hurts)|pain\s+in\s+my\s+chest|(passed|pass(ing)?|blacked|black(ing)?)\s+out|faint(ed|ing)?\b|can'?t\s+(catch\s+my\s+)?breathe?|trouble\s+breathing|struggling\s+to\s+breathe|asthma\s+attack|heart\s+(is\s+|keeps\s+|won'?t\s+stop\s+)?(racing|pounding|skipping|fluttering)|(dark|brown|cola|tea)[-\s]colou?red\s+(pee|urine)|(pee|urine)\s+(is\s+|was\s+|looks\s+)?(dark|brown|cola|tea)\b|rhabdo\w*|worst\s+headache|severe\s+headache|thunderclap|face\s+(is\s+)?droop\w*|slurr\w*|seizure|can'?t\s+feel\s+my\s+(legs|arms|feet)|(low|crashing)\s+blood\s+sugar|hypoglyc\w*|dolor\s+de\s+pecho|duele\s+el\s+pecho|(lost|losing|lose|can'?t\s+control)\s+(my\s+)?(bladder|bowel)|throat\s+(is\s+)?(swelling|swollen|closing)|short(ness)?\s+of\s+breath|swollen\s+and\s+(hot|red)|(hot|red)\s+and\s+swollen)\b/i;
const AMBIGUOUS_DAMAGE = /\b(broke|broken|tear|tears|tearing|tore|torn|strained|strain|strains|snapped|popped|blew\s+out|went\s+pop)\b/i;
const BODY_PART = /\b(shoulder|shoulders|rotator\s+cuff|labrum|knee|knees|acl|mcl|meniscus|back|spine|disc|neck|hip|hips|ankle|ankles|wrist|wrists|elbow|elbows|arm|arms|leg|legs|foot|feet|hand|hands|rib|ribs|collarbone|clavicle|hamstring|hamstrings|quad|quads|calf|calves|groin|achilles|bicep|biceps|tricep|triceps|pec|pecs|chest|glute|glutes|femur|tibia|fibula|humerus|tendon|ligament|muscle|hammy|hammies|lat|lats|oblique|obliques|adductor|adductors|shin|shins|trap|traps)\b/i;
const WORDS = String.raw `(?:[\w'-]+\s+){0,4}`;
const DAMAGE_NEAR_BODY = new RegExp(String.raw `\b(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b` +
    `|` +
    String.raw `\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\b`, 'i');
export const SEEKING_ADVICE = /\b(what('?s| is)\s+wrong|why\s+does\s+(it|my)|should\s+i\s+(see\s+(a|someone|somebody|the|my)|go\s+to\s+(a|the)\s+(doctor|er|hospital|clinic)|worry|rest\s+(it|my|this|that)\b|stop\s+(training|lifting|running)\s+(on|with|because)|ice|stretch\s+(it|my|this|that)\b)|is\s+(it|this|that)\s+(ok|okay|serious|bad|normal|fine)(?!\s+(to|if|for)\b)|do\s+i\s+need\s+(a\s+(brace|scan|doctor|cast|splint|x[-\s]?ray|mri)|to\s+(see|get\s+it\s+(checked|looked\s+at)))|how\s+do\s+i\s+(fix|heal|treat|rehab)\s+(it|this|that|my)\b|diagnos\w*|what\s+(should|do)\s+i\s+do\s+about|will\s+it\s+heal)\b/i;
export const DISORDERED_EATING = /\b(purg(e|es|ed|ing)|throw(ing)?\s+up\s+after\s+(i\s+eat|eating|meals?|food)|make\s+myself\s+(throw\s+up|sick|puke)|starv(e|ing)\s+myself|laxatives?\s+(to|for)\s+(lose|drop|cut)|(eat|eating)\s+(only\s+)?([1-7]\d{2}|[1-9]\d)\s+cal\w*|stop(ped)?\s+eating\s+(to|so)\b)/i;
export const MEDICAL_CONTEXT = /\b(pregnan\w*|postpartum|post-partum|breastfeed\w*|breast-feed\w*|c-?section|miscarriage|epilep\w*|diabet\w*|insulin|heart\s+(condition|disease|murmur|attack|problem|issue)s?|arrhythmia|a-?fib|pacemaker|blood\s+pressure|hypertension|asthma|copd|cancer|chemo\w*|osteopor\w*|arthritis|ssris?|antidepressant\w*|medications?|prescription|cortisone|steroid\s+shot|kidney|liver\s+(disease|condition)|hernia|cleared\s+(me|by)|got\s+clearance)\b/i;
const SENSATION = String.raw `(crack\w*|pop|pops|popping|click\w*|grind\w*|clunk\w*|crunch\w*)`;
const SYMPTOM_QUESTION_SOURCE = () => String.raw `\b${SENSATION}\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b|\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}${SENSATION}\b|\bis\s+(it|this|that)\s+(bad|normal|ok|okay|safe|dangerous|fine)\b[^.?!]{0,40}\bmy\s+(?:${BODY_PART.source.slice(3, -3)})\b`;
export const DOSE = /(\b\d+(\.\d+)?\s*(mg|mcg|milligrams?|grams?|g|iu|scoops?)\b[^.?!]{0,30}\b(caffeine|creatine|pre-?workout|supplements?|beta-?alanine|melatonin|vitamin|ashwagandha|stims?)\b|\bhow\s+(much|many\s+(mg|milligrams|scoops))\s+(of\s+)?(caffeine|creatine|pre-?workout|melatonin|beta-?alanine|ashwagandha|vitamin\s*d?)\b|\b(caffeine|creatine|pre-?workout|melatonin)\s+(dose|dosage|dosing)\b)/i;
const SYMPTOM_QUESTION = new RegExp(SYMPTOM_QUESTION_SOURCE(), 'i');
export type MedicalRoute = 'clear' | 'crisis' | 'urgent' | 'care' | 'acute' | 'advice';
export function medicalRoute(text: string): MedicalRoute {
    const t = (text ?? '').trim();
    if (!t)
        return 'clear';
    if (CRISIS.test(t))
        return 'crisis';
    if (URGENT.test(t))
        return 'urgent';
    if (DISORDERED_EATING.test(t))
        return 'care';
    if (DOSE.test(t))
        return 'care';
    if (ACUTE.test(t))
        return 'acute';
    if (DAMAGE_NEAR_BODY.test(t))
        return 'acute';
    if (MEDICAL_CONTEXT.test(t) || SYMPTOM_QUESTION.test(t))
        return 'advice';
    if (SEEKING_ADVICE.test(t))
        return 'advice';
    return 'clear';
}
export const stopsForMedical = (text: string): boolean => medicalRoute(text) !== 'clear';
export const FORM_FRAMES_MIN = 3;
export const FORM_FRAMES_MAX = 6;
export const FORM_FRAMES_DEFAULT = 5;
export const FORM_CLIP_SECONDS = 10;
export const FORM_CLIP_MS = FORM_CLIP_SECONDS * 1000;
export const FORM_FRAME_MAX_EDGE = 1024;
export const FORM_FRAME_COMPRESS = 0.7;
export const FORM_FRAME_BASE64_CHARS = 6990000;
export const FORM_TOTAL_BASE64_CHARS = 14000000;
export const FORM_OUTPUT_CAP = 900;
export const FORM_LIFT_CHARS = 60;
export const FORM_NOTE_CHARS = 300;
export const FORM_LINE_CHARS = 200;
export const FORM_FIX_MAX = 2;
export const FORM_GOOD_MAX = 3;
export const FORM_ACTION = 'form_check';
const EDGE_INSET = 0.5;
export function frameTimestamps(durationMs: unknown, count: number = FORM_FRAMES_DEFAULT): number[] {
    const n = Math.min(FORM_FRAMES_MAX, Math.max(FORM_FRAMES_MIN, Math.round(Number(count) || 0) || FORM_FRAMES_DEFAULT));
    const raw = typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0 ? durationMs : FORM_CLIP_MS;
    const window = Math.min(raw, FORM_CLIP_MS);
    const slice = window / n;
    const out: number[] = [];
    for (let i = 0; i < n; i += 1)
        out.push(Math.round(slice * (i + EDGE_INSET)));
    return out;
}
export function clipIsLong(durationMs: unknown): boolean {
    return typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > FORM_CLIP_MS + 500;
}
export function formClipNotice(durationMs: unknown): string | null {
    if (!clipIsLong(durationMs))
        return null;
    return `That clip is longer than I need — I'll read the first ${FORM_CLIP_SECONDS} seconds of it.`;
}
export function capFrames(frames: unknown): string[] | null {
    if (!Array.isArray(frames))
        return null;
    const kept: string[] = [];
    let total = 0;
    for (const f of frames) {
        if (kept.length >= FORM_FRAMES_MAX)
            break;
        if (typeof f !== 'string')
            return null;
        const data = f.trim();
        const bare = data.startsWith('data:') ? data.slice(data.indexOf(',') + 1) : data;
        if (bare.length < 100)
            return null;
        if (bare.length > FORM_FRAME_BASE64_CHARS)
            return null;
        total += bare.length;
        if (total > FORM_TOTAL_BASE64_CHARS)
            return null;
        kept.push(bare);
    }
    return kept.length >= FORM_FRAMES_MIN ? kept : null;
}
export interface FormRead {
    lift: string;
    looksGood: string[];
    fix: string[];
    cue: string;
}
const MEDICAL_SENTENCE = /\b(pain\w*|hurt\w*|sore\w*|ach(e|es|ed|ing|y)|discomfort|injur\w*|tweak\w*|strain\w*|sprain\w*|ruptur\w*|tear\w*|torn|herniat\w*|impinge\w*|tendin\w*|tendon|ligament|bursit\w*|arthrit\w*|inflam\w*|sciatic\w*|nerve|numb\w*|tingl\w*|swell\w*|swollen|bruis\w*|flare[-\s]?up|discs?|meniscus|acl|mcl|labrum|rotator\s+cuff|diagnos\w*|symptom\w*|condition|physio\w*|physical\s+therap\w*|chiroprac\w*|doctor|clinic\w*|medical|rehab\w*|prehab|treatment|heal(s|ed|ing)?)\b/i;
const REFERRAL_SENTENCE = /\b(stop\s+(lifting|training|squatting|benching|deadlifting|pressing|doing)|see\s+(a|your)\s+(doctor|physio\w*|specialist|professional|pt\b)|get\s+(it|that|this)(\s+[\w'-]+){0,2}\s+(checked|looked\s+at|seen)|seek\s+(help|advice|attention))\b/i;
const VERDICT_SENTENCE = /\b(safe(r|st|ly)?|unsafe|safety(?!\s*(squat\s+)?(bar|bars|pin|pins|strap|straps))|dangerous|danger|risky|risk\w*|injury\s+risk|harmful|hazard\w*|you'?ll\s+(get\s+hurt|blow|wreck|destroy)|wreck(ing)?\s+your|bad\s+for\s+your)\b/i;
const BODY_SENTENCE = /\b(body\s?fat|physique|overweight|obese|obesity|skinny|chubby|fat\b|flabby|slim|bulky|belly|gut\b|love\s+handles|lean(er|ness)\b|lean\s+(body|mass|muscle)|lean(ed|ing)?\s+out\b(?!\s+over)|put(ting)?\s+on\s+(some\s+)?(muscle|size|mass)|your\s+(physique|frame|build)\b|(los(e|ing)|drop(ping)?|gain(ing)?|shed(ding)?)\s+(some\s+|a\s+few\s+|a\s+bit\s+of\s+)?(weight|fat|pounds|lbs?|kg)|you\s+look\s+(strong|big|small|heavy|light|thin|fit))\b/i;
const NUMBER_SENTENCE = /(\b\d+(\.\d+)?\s*(lb|lbs|pound|pounds|kg|kgs|kilo|kilos|plate|plates)\b|\b(1\s?rm|e1rm|one[-\s]?rep\s+max|your\s+(true\s+|estimated\s+)?max|max\s+out|rep\s+max)\b|\b\d+\s*%\s*(of\s+)?(your\s+)?(1\s?rm|max)\b)/i;
const BANNED = [MEDICAL_SENTENCE, REFERRAL_SENTENCE, VERDICT_SENTENCE, BODY_SENTENCE, NUMBER_SENTENCE];
export function bannedFamily(sentence: string): 'medical' | 'referral' | 'verdict' | 'body' | 'number' | null {
    const names = ['medical', 'referral', 'verdict', 'body', 'number'] as const;
    for (let i = 0; i < BANNED.length; i += 1)
        if (BANNED[i].test(sentence))
            return names[i];
    return null;
}
export const isBannedSentence = (sentence: string): boolean => bannedFamily(sentence) !== null;
function sentences(line: string): string[] {
    return line
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
}
function cleanLine(raw: unknown): string {
    if (typeof raw !== 'string')
        return '';
    const flat = raw.replace(/\s+/g, ' ').trim().slice(0, FORM_LINE_CHARS);
    if (!flat)
        return '';
    const kept = sentences(flat).filter((s) => !isBannedSentence(s));
    return kept.join(' ').trim();
}
function cleanLines(raw: unknown, max: number): string[] {
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    const out: string[] = [];
    for (const item of list) {
        if (out.length >= max)
            break;
        const line = cleanLine(item);
        if (line)
            out.push(line);
    }
    return out;
}
export function sanitizeFormRead(raw: unknown, lift?: string): FormRead | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const r = raw as Record<string, unknown>;
    const named = typeof lift === 'string' && lift.trim() ? lift : typeof r.lift === 'string' ? r.lift : '';
    const cleanLift = named.replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);
    const looksGood = cleanLines(r.looksGood, FORM_GOOD_MAX);
    const fix = cleanLines(r.fix, FORM_FIX_MAX);
    const cue = cleanLine(r.cue);
    if (!looksGood.length && !fix.length && !cue)
        return null;
    return { lift: cleanLift, looksGood, fix, cue };
}
export function parseFormRead(text: unknown, lift?: string): FormRead | null {
    if (typeof text !== 'string' || !text.trim())
        return null;
    const stripped = text.replace(/```[a-zA-Z]*\n?/g, '').trim();
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start < 0 || end <= start)
        return null;
    let parsed: unknown;
    try {
        parsed = JSON.parse(stripped.slice(start, end + 1));
    }
    catch {
        return null;
    }
    return sanitizeFormRead(parsed, lift);
}
export const FORM_NO_READ = "I couldn't get a read on that one. Film it from the side, whole body in frame, and I'll look again.";
export function formCheckSummary(read: FormRead | null | undefined): string[] {
    if (!read)
        return [FORM_NO_READ];
    const lines: string[] = [];
    const lift = read.lift.trim();
    if (read.looksGood.length) {
        const good = read.looksGood.join(' ');
        lines.push(lift ? `${lift} — ${good}` : good);
    }
    else if (lift && read.fix.length) {
        lines.push(`${lift} — here's the one thing I'd change.`);
    }
    if (read.fix[0])
        lines.push(read.fix[0]);
    if (read.fix[1])
        lines.push(`Then: ${read.fix[1]}`);
    if (read.cue)
        lines.push(`Next set, think: "${read.cue.replace(/^["“']|["”']$/g, '')}"`);
    return lines.length ? lines : [FORM_NO_READ];
}
export type FormCheckResult = {
    kind: 'ok';
    read: FormRead;
    remaining: number | null;
} | {
    kind: 'stopped';
    route: 'crisis' | 'urgent' | 'care' | 'medical_stop';
} | {
    kind: 'unreadable';
} | {
    kind: 'bad_frames';
} | {
    kind: 'out_of_credits';
    remaining: number;
    allowance: number;
} | {
    kind: 'not_entitled';
} | {
    kind: 'unavailable_here';
} | {
    kind: 'unavailable';
} | {
    kind: 'offline';
};
export function formResultFrom(body: unknown, lift?: string): FormCheckResult {
    if (!body || typeof body !== 'object')
        return { kind: 'unavailable' };
    const d = body as {
        ok?: boolean;
        read?: unknown;
        route?: string;
        reason?: string;
        remaining?: number;
        allowance?: number;
    };
    if (d.route === 'crisis' || d.route === 'urgent' || d.route === 'care' || d.route === 'medical_stop') {
        return { kind: 'stopped', route: d.route };
    }
    if (d.ok) {
        const read = sanitizeFormRead(d.read, lift);
        if (!read)
            return { kind: 'unreadable' };
        return { kind: 'ok', read, remaining: typeof d.remaining === 'number' ? d.remaining : null };
    }
    switch (d.reason) {
        case 'unreadable':
            return { kind: 'unreadable' };
        case 'bad_request':
        case 'too_large':
            return { kind: 'bad_frames' };
        case 'out_of_credits':
            if (!d.allowance)
                return { kind: 'not_entitled' };
            return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance };
        default:
            return { kind: 'unavailable' };
    }
}
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MODEL = 'claude-sonnet-5';
const MEDIA_TYPE = 'image/jpeg';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const SYSTEM = `You are Coach Holt, a strength coach in the Forge Legacy training app. You are looking at a few still frames taken from a video of one athlete performing one lift, in time order. Your entire job is to tell them what their TECHNIQUE looked like.

# Who Holt is

The coach you hired. Warm, invested, direct, and on the athlete's side. Encouraging but never cheesy: praise is specific and earned (name what they actually did well), proportionate, and brief. He has opinions and says them. He never guilts anyone.

Banned: emoji, "Great question!", "champ", "buddy", "king", hustle slogans ("no days off", "beast mode", "let's gooo"), toxic positivity ("push through it"), fake urgency. At most one exclamation mark, and only on something genuinely excellent.

# What you may talk about

Only these, and only what is visible in the frames:

- Bar path — where the bar travelled and whether it stayed over the middle of the foot.
- Brace and torso — ribs down, air held, the spine holding its shape or losing it, torso angle changing mid-rep.
- Depth and range — how far the lift travelled, hip crease against knee, lockout, the bar touching or not.
- Joint timing — hips and knees moving together or one before the other, knees tracking in or out, elbows flaring or tucking.
- Bar or body position — where the bar sits, grip width, stance width, foot turnout, head and eye line.
- Tempo and control — rushed, bouncing, stalling, uneven between reps, the eccentric dumped.
- Setup — unrack, walkout, bracing sequence, where they start the rep from.

# What you never do

These are absolute. There is no phrasing of them that is acceptable, and no question from the athlete that unlocks them.

- **Never diagnose anything.** Not a condition, not a cause, not a mechanism of injury.
- **Never mention pain, soreness, an injury, a joint problem, a symptom, or healing.** Not even reassuringly. "That shouldn't hurt" is a medical claim in a coach's voice, and "if it hurts, stop" is medical advice. Say nothing about it at all.
- **Never refer them anywhere.** No doctor, no physio, no "get that looked at", no "stop lifting".
- **Never say a lift is safe, unsafe, dangerous, risky, or bad for them.** Describe what moved and what to change instead. "The bar drifts forward out of the bottom" is the note. "That's dangerous for your back" is not.
- **Never comment on their body, physique, weight, build or appearance.** You are looking at a movement, not at a person. Body parts are fine and necessary — knees, hips, back, chest, elbows are what technique is made of. A judgement about how their body looks or what it weighs is not.
- **Never give a number for a load or a max.** You cannot weigh a plate from a photograph, so any figure you produce is invented. No pounds, no kilos, no percentages of a max, no "your max is around".
- **Never guess at what you cannot see.** If the camera angle hides the thing you would comment on, say that instead of guessing.

# How much to say

At most TWO things to fix, the biggest first. Not three, not a list of everything. A coach standing next to someone gives them one thing to think about, and two is already generous.

Every fix carries a cue — a short thing the athlete says to themselves on the next rep. Real cues, the kind a coach actually says out loud: "chest through the bar", "push the floor away", "ribs down", "bar over the middle of your foot", "squeeze the bar apart". Not an explanation, not a paragraph.

Name what is already right first, when something is. It is usually more than the athlete expects, and a coach who only ever finds faults gets ignored.

# When the frames do not show the lift

Say so, honestly, and stop. Put it in "fix" as one plain sentence and leave "looksGood" empty. Do not invent a read of a video you could not see, and do not pad it with general advice about the lift.

That covers all of these: the frames are too dark, too blurred or too far away; the athlete is out of frame or only partly in it; the camera is behind them or straight on when the lift needs a side view; the frames show something other than the lift you were told about; there is no lift happening in them at all. In every case, one sentence on what to change about the filming — angle, distance, lighting, framing — and nothing else.

# Output

Reply with a single JSON object and nothing else. No prose before it, no summary after it, no markdown fences.

{"looksGood": ["<short sentence>", "..."], "fix": ["<the biggest thing, one sentence>", "<the second, only if there is one>"], "cue": "<one short thing to say to themselves on the next rep>"}

- "looksGood": 0 to 3 short sentences. Empty array when the frames cannot be read.
- "fix": 0 to 2 short sentences, biggest first. This is also where the honest "I can't see it" sentence goes.
- "cue": one short phrase, no more than a few words, in the athlete's own second person. Empty string when there is nothing to cue.
- Every sentence is plain text. No markdown, no headings, no bullets, no numbering, no emoji.
- Keep the whole thing short. Four sentences of Holt is better than twelve of anybody else.`;
interface Body {
    lift?: unknown;
    frames?: unknown;
    note?: unknown;
}
function guardRoute(text: string): 'crisis' | 'urgent' | 'care' | 'medical_stop' | null {
    const r = medicalRoute(text);
    if (r === 'clear')
        return null;
    if (r === 'crisis' || r === 'urgent' || r === 'care')
        return r;
    return 'medical_stop';
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
});
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response('ok', { headers: CORS });
    if (!ANTHROPIC_API_KEY) {
        return json({ ok: false, reason: 'unconfigured' }, 503);
    }
    let body: Body;
    try {
        body = await req.json();
    }
    catch {
        return json({ ok: false, reason: 'bad_request' }, 400);
    }
    const lift = (typeof body.lift === 'string' ? body.lift : '').replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);
    const note = (typeof body.note === 'string' ? body.note : '').replace(/\s+/g, ' ').trim().slice(0, FORM_NOTE_CHARS);
    if (!lift)
        return json({ ok: false, reason: 'bad_request' }, 400);
    const guarded = guardRoute(`${lift}\n${note}`);
    if (guarded)
        return json({ route: guarded });
    const frames = capFrames(body.frames);
    if (!frames)
        return json({ ok: false, reason: 'bad_request' }, 400);
    const authorization = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authorization } },
    });
    const { data: spend, error: spendError } = await supabase
        .rpc('coach_ai_spend_credits', { p_action: FORM_ACTION })
        .maybeSingle();
    if (spendError)
        return json({ ok: false, reason: 'meter_unavailable' }, 503);
    const reserved = spend as {
        allowed: boolean;
        credits_spent: number;
        remaining: number;
        allowance: number;
    } | null;
    if (!reserved?.allowed) {
        return json({
            ok: false,
            reason: 'out_of_credits',
            remaining: reserved?.remaining ?? 0,
            allowance: reserved?.allowance ?? 0,
        });
    }
    const content: unknown[] = [];
    frames.forEach((data, i) => {
        content.push({ type: 'text', text: `Frame ${i + 1} of ${frames.length}:` });
        content.push({ type: 'image', source: { type: 'base64', media_type: MEDIA_TYPE, data } });
    });
    content.push({
        type: 'text',
        text: `Those frames are one set of: ${lift}. They are in time order.${note ? `\n\nThe athlete says: "${note}"` : ''}\n\nAnswer with the JSON object only.`,
    });
    let response: Response;
    try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: FORM_OUTPUT_CAP,
                thinking: { type: 'disabled' },
                output_config: { effort: 'low' },
                system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
                messages: [{ role: 'user', content }],
            }),
        });
    }
    catch {
        return json({ ok: false, reason: 'upstream_unreachable' }, 503);
    }
    if (!response.ok) {
        console.error('anthropic', response.status, (await response.text().catch(() => '')).slice(0, 800));
        await supabase.rpc('coach_ai_record_usage', {
            p_action: FORM_ACTION, p_credits: reserved.credits_spent, p_model: MODEL,
            p_input_tokens: 0, p_output_tokens: 0,
            p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
            p_uncharged: true,
        });
        return json({ ok: false, reason: 'upstream_error' }, 503);
    }
    const payload = await response.json();
    const usage = payload?.usage ?? {};
    await supabase.rpc('coach_ai_record_usage', {
        p_action: FORM_ACTION,
        p_credits: reserved.credits_spent,
        p_model: payload?.model ?? MODEL,
        p_input_tokens: usage.input_tokens ?? 0,
        p_output_tokens: usage.output_tokens ?? 0,
        p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        p_uncharged: false,
    });
    if (payload?.stop_reason === 'refusal') {
        return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
    }
    const text: string = (payload?.content ?? [])
        .filter((b: {
        type: string;
    }) => b.type === 'text')
        .map((b: {
        text: string;
    }) => b.text)
        .join('\n');
    const read = parseFormRead(text, lift);
    if (!read)
        return json({ ok: false, reason: 'unreadable', remaining: reserved.remaining });
    return json({ ok: true, read, remaining: reserved.remaining });
});
