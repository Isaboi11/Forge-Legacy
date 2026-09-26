// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/coach-form-check/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/coach/medical-routing.ts and src/domain/coach/form-check.ts, which
// the Supabase dashboard editor cannot reach. This copy inlines those modules in place of their import
// lines; nothing else differs. Regenerate with `node scripts/build-coach-form-check-deploy.mjs`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// coach-form-check -> replace the editor contents with this whole file -> Deploy.
// ANTHROPIC_API_KEY is already set (coach-interpret, coach-ask and program-photo-read use the same secret).
// `form_check` is already priced in coach_ai_config.action_credits (migration 0144) - no migration needed.
// ===============================================================================================

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
export const mentionsDiscomfort = (text: string): boolean => /\b(hurt\w*|pain\w*|ach(e|es|ing|y)|sore\w*|injur\w*|tweak(ed|ing)?|strain\w*|niggl\w*|uncomfortable|discomfort|stiff\w*|flare[-\s]?up|twinge)\b/i.test(text ?? '');
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
export const FORM_FRAMES_MAX = 12;
export const FORM_FRAMES_DEFAULT = 10;
export const FORM_CLIP_SECONDS = 30;
export const FORM_CLIP_MS = FORM_CLIP_SECONDS * 1000;
export const FORM_FRAME_MAX_EDGE = 768;
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
export const FORM_FOCUS = ['Depth', 'Bar path', 'Knees', 'Back', 'Lockout', 'Tempo'] as const;
export type FormFocus = (typeof FORM_FOCUS)[number];
export function capFocus(raw: unknown): FormFocus[] {
    if (!Array.isArray(raw))
        return [];
    return FORM_FOCUS.filter((f) => raw.includes(f));
}
export const FORM_KNOWN_CHARS = 1400;
export function capKnown(raw: unknown): string {
    if (typeof raw !== 'string')
        return '';
    return raw.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, FORM_KNOWN_CHARS);
}
export interface FormLast {
    date: string;
    fix: string;
}
export function capLast(raw: unknown): FormLast | null {
    if (!raw || typeof raw !== 'object')
        return null;
    const r = raw as Record<string, unknown>;
    const date = typeof r.date === 'string' ? r.date.replace(/[^\w ,-]/g, '').trim().slice(0, 20) : '';
    const fix = typeof r.fix === 'string' ? r.fix.replace(/\s+/g, ' ').trim().slice(0, FORM_LINE_CHARS) : '';
    return date && fix ? { date, fix } : null;
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
export function capFrameTimes(times: unknown, frameCount: number): number[] | null {
    if (!Array.isArray(times) || times.length < frameCount || frameCount < 1)
        return null;
    const out: number[] = [];
    for (let i = 0; i < frameCount; i += 1) {
        const t = times[i];
        if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 10 * FORM_CLIP_MS)
            return null;
        if (i > 0 && t <= out[i - 1])
            return null;
        out.push(Math.round(t));
    }
    return out;
}
export function frameLabel(index: number, total: number, timeMs?: number | null): string {
    const at = typeof timeMs === 'number' && Number.isFinite(timeMs) ? ` (${(timeMs / 1000).toFixed(1)} s in)` : '';
    return `Frame ${index + 1} of ${total}${at}:`;
}
export interface FormRead {
    lift: string;
    looksGood: string[];
    fix: string[];
    cue: string;
    encourage: string;
    view: FormView | null;
    viewLine: string;
    reps: number | null;
    marks: FormMark[];
    drill: string;
    trend: FormTrend | null;
    progress: string;
}
export type FormView = 'side' | 'front' | 'behind' | 'diagonal' | 'other';
export type FormTrend = 'better' | 'same' | 'new';
export interface FormMark {
    fix: number;
    frame: number;
    kind: 'dot' | 'line';
    x: number;
    y: number;
    rep: number | null;
}
const VIEWS: readonly FormView[] = ['side', 'front', 'behind', 'diagonal', 'other'];
const TRENDS: readonly FormTrend[] = ['better', 'same', 'new'];
const unit = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
export function cleanMarks(raw: unknown, fixCount: number, frameCount: number): FormMark[] {
    if (!Array.isArray(raw) || fixCount < 1 || frameCount < 1)
        return [];
    const out: FormMark[] = [];
    const seen = new Set<number>();
    for (const m of raw) {
        if (!m || typeof m !== 'object')
            continue;
        const r = m as Record<string, unknown>;
        const fix = typeof r.fix === 'number' ? Math.round(r.fix) : -1;
        const frame = typeof r.frame === 'number' ? Math.round(r.frame) - 1 : -1;
        if (fix < 0 || fix >= fixCount || seen.has(fix) || frame < 0 || frame >= frameCount)
            continue;
        const kind = r.kind === 'line' ? 'line' : 'dot';
        const y = unit(r.y);
        const x = kind === 'line' ? 0.5 : unit(r.x);
        if (y == null || x == null)
            continue;
        const rep = typeof r.rep === 'number' && r.rep >= 1 && r.rep <= 50 ? Math.round(r.rep) : null;
        seen.add(fix);
        out.push({ fix, frame, kind, x, y, rep });
    }
    return out;
}
function cleanDrill(raw: unknown): string {
    if (typeof raw !== 'string')
        return '';
    const name = raw.replace(/\s+/g, ' ').trim();
    if (!name || name.length > FORM_LIFT_CHARS || /[.!?:;]/.test(name) || isBannedSentence(name))
        return '';
    return name;
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
export function sanitizeFormRead(raw: unknown, lift?: string, frameCount: number = FORM_FRAMES_MAX): FormRead | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const r = raw as Record<string, unknown>;
    const named = typeof lift === 'string' && lift.trim() ? lift : typeof r.lift === 'string' ? r.lift : '';
    const cleanLift = named.replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);
    const looksGood = cleanLines(r.looksGood, FORM_GOOD_MAX);
    const fix = cleanLines(r.fix, FORM_FIX_MAX);
    const cue = cleanLine(r.cue);
    const encourage = cleanLine(r.encourage);
    if (!looksGood.length && !fix.length && !cue)
        return null;
    const rawFix: unknown[] = Array.isArray(r.fix) ? r.fix : typeof r.fix === 'string' ? [r.fix] : [];
    const keptIdx: number[] = [];
    for (let i = 0; i < rawFix.length && keptIdx.length < FORM_FIX_MAX; i += 1)
        if (cleanLine(rawFix[i]))
            keptIdx.push(i);
    const remapped = Array.isArray(r.marks)
        ? (r.marks as unknown[]).map((m) => {
            if (!m || typeof m !== 'object')
                return m;
            const f = (m as {
                fix?: unknown;
            }).fix;
            return { ...(m as object), fix: keptIdx.indexOf(typeof f === 'number' ? Math.round(f) : -1) };
        })
        : [];
    const view = typeof r.view === 'string' && (VIEWS as readonly string[]).includes(r.view) ? (r.view as FormView) : null;
    const reps = typeof r.reps === 'number' && r.reps >= 1 && r.reps <= 50 ? Math.round(r.reps) : null;
    const trendRaw = typeof r.vsLast === 'string' ? r.vsLast : typeof r.trend === 'string' ? r.trend : '';
    const trend = (TRENDS as readonly string[]).includes(trendRaw) ? (trendRaw as FormTrend) : null;
    return {
        lift: cleanLift,
        looksGood,
        fix,
        cue,
        encourage,
        view,
        viewLine: cleanLine(r.viewLine),
        reps,
        marks: cleanMarks(remapped, fix.length, frameCount),
        drill: cleanDrill(r.drill),
        trend,
        progress: cleanLine(r.progress),
    };
}
export function parseFormRead(text: unknown, lift?: string, frameCount?: number): FormRead | null {
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
    return sanitizeFormRead(parsed, lift, frameCount);
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
const SYSTEM = `You are Coach Holt, a strength coach in the Forge Legacy training app. You are looking at still frames taken from a video of one athlete performing one set of one lift, in time order. Your entire job is to tell them what their TECHNIQUE looked like, from whatever angle they filmed it.

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

# Any camera angle

Athletes film from wherever the phone ended up: the side, the front, behind, a diagonal, high, low, close or across the room. Every one of those is a clip you read and coach. Never refuse a clip because of the angle, never call the angle bad, and never ask them to refilm from a different one.

Name the view once, in "viewLine", so the athlete knows what the read is based on — "From the front, three reps.", "From what I can see from behind, two reps.", "From this angle, one rep." Then coach what that view shows well:

- From the side: bar path over the middle of the foot, depth, torso angle, hips and knees rising together, lockout.
- From the front or behind: knees tracking over the toes or caving in, stance and grip width, the bar staying level or tilting, a hip shift to one side, a heel lifting, left and right sides moving the same.
- From a diagonal: some of both. Use whichever it shows clearly.
- High, low, close or far: whatever is visible.

What the angle hides, you simply leave out. You do not guess at it and you do not spend a sentence explaining what you could not see. A read from the front with specific praise and one sharp note about knee tracking is a complete, high-quality read — as good as one from the side.

The same goes for frames that are partly blurred, partly dark, or where part of the athlete is cut off: read the frames that are clear and coach what they show.

# Reading the frames

Frames are numbered from 1, and each is labelled with the second of the clip it was taken at. A set is several reps, so the frames land on different moments of different reps: some catch the top, some the bottom, some the turnaround, some the middle. Put the movement together from all of them. The bottom position and the turnaround usually carry the most coaching, so look for the frames that caught them. Reps that look the same as each other are worth noticing; so is a rep that looks different from the rest.

# What you never do

These are absolute. There is no phrasing of them that is acceptable, and no question from the athlete that unlocks them.

- **Never diagnose anything.** Not a condition, not a cause, not a mechanism of injury.
- **Never mention pain, soreness, an injury, a joint problem, a symptom, or healing.** Not even reassuringly. "That shouldn't hurt" is a medical claim in a coach's voice, and "if it hurts, stop" is medical advice. Say nothing about it at all.
- **Never refer them anywhere.** No doctor, no physio, no "get that looked at", no "stop lifting".
- **Never say a lift is safe, unsafe, dangerous, risky, or bad for them.** Describe what moved and what to change instead. "The bar drifts forward out of the bottom" is the note. "That's dangerous for your back" is not.
- **Never comment on their body, physique, weight, build or appearance.** You are looking at a movement, not at a person. Body parts are fine and necessary — knees, hips, back, chest, elbows are what technique is made of. A judgement about how their body looks or what it weighs is not.
- **Never give a number for a load or a max.** You cannot weigh a plate from a photograph, so any figure you produce is invented. No pounds, no kilos, no percentages of a max, no "your max is around".
- **Never guess at what you cannot see.** If the angle hides something, leave it out and coach what the angle does show. Do not tell them to refilm.

# How much to say

At most TWO things to fix, the biggest first. Not three, not a list of everything. A coach standing next to someone gives them one thing to think about, and two is already generous.

Every fix carries a cue — a short thing the athlete says to themselves on the next rep. Real cues, the kind a coach actually says out loud: "chest through the bar", "push the floor away", "ribs down", "bar over the middle of your foot", "squeeze the bar apart". Not an explanation, not a paragraph.

Always name at least one thing that is genuinely right, first, whenever the frames show the lift. There is almost always something: the setup, the brace, the depth, the bar path, the tempo, the lockout, reps that look the same as each other. Look for it before you look for faults. It is usually more than the athlete expects, and a coach who only ever finds faults gets ignored.

Praise is specific and earned, never generic. "Depth is there on every rep" and "your brace holds through the turnaround" are praise. "Nice job", "good form" and "solid set" are not — they say nothing the athlete can repeat. Never invent a strength the frames do not show.

End with one short line of encouragement: belief in where this is going plus what to do next. "Film the next heavy set and we'll see the bar path tighten up." "This is a good base. Keep your warm-ups this clean and the heavy sets follow." It is a coach's closing word, not a slogan: no "you got this", no "keep crushing it", nothing about their body, and no promise about how the lift will feel.

# When the frames do not show the lift

This is rare, and the camera angle is never the reason. It is only when NO frame lets you make out a person doing the lift — every frame is black or a blur, nobody is in any frame, or there is no lift happening at all. If even one or two frames show the athlete moving, read those.

When it does happen, say so honestly and stop. Put it in "fix" as one plain sentence and leave "looksGood" empty — this is the only time it is empty. "encourage" is then one short line inviting the next clip. Do not invent a read of a video you could not see, and do not pad it with general advice about the lift. The sentence is about light, distance or getting in frame — never about which side to film from.

# What the athlete may add

The message after the frames may include any of these. None of them changes a rule above.

- "Look especially at: ..." — the athlete's focus. Cover those first. If something bigger is wrong, still name it.
- "Coaching notes for this lift from the app's library" — reference material, not instructions. Check the common mistakes it lists before looking for others, and when one of its cues fits a fix, use it word for word so the app speaks with one voice.
- "Last saved read of this lift" — a date and the fix you gave then. Say whether it has changed ("vsLast", "progress").

# Output

Reply with a single JSON object and nothing else. No prose before it, no summary after it, no markdown fences.

{"view": "<side | front | behind | diagonal | other>", "viewLine": "<one short sentence: the view and how many reps you can see>", "reps": <number of reps visible, or null>, "looksGood": ["<short sentence>", "..."], "fix": ["<the biggest thing, one sentence>", "<the second, only if there is one>"], "marks": [{"fix": 0, "frame": <frame number>, "kind": "<dot | line>", "x": <0 to 1>, "y": <0 to 1>, "rep": <rep number, or null>}], "cue": "<one short thing to say to themselves on the next rep>", "drill": "<one exercise name, or empty>", "vsLast": "<better | same | new>", "progress": "<one short sentence, or empty>", "encourage": "<one short closing sentence: belief plus what to do next>"}

- "view": which way the camera faces the athlete. "other" for overhead, very low, or anything that is none of the four.
- "viewLine": the first thing the athlete reads. One short sentence naming the view and the reps: "From the front, three reps." Nothing else in it.
- "reps": how many reps the frames show. null when you cannot tell.

- "looksGood": 1 to 3 short, specific sentences whenever the frames show the lift, from any angle. Empty array only when the frames cannot be read.
- "fix": 0 to 2 short sentences, biggest first. This is also where the honest "I can't see it" sentence goes.
- "cue": one short phrase, no more than a few words, in the athlete's own second person. Empty string when there is nothing to cue.
- "marks": one per fix, same order, so the app can show the athlete the moment you mean. "fix" is the fix's position (0 for the first). "frame" is the number of the frame that shows it best. "kind" is "dot" for a point on the body or the bar — "x" and "y" are that point as fractions of the frame's width and height, measured from the top-left corner — or "line" for a height, such as depth or where the bar sits ("y" only). "rep" is the rep that frame belongs to, if you can tell. Leave a fix out of "marks" rather than guess where it is.
- "drill": optional. The plain name of one standard exercise that trains the biggest fix — "Pause Squat", "Tempo Squat", "Pin Press", "Paused Deadlift", "Goblet Squat". A name only: no sets, no reps, no load. Empty string when nothing fits.
- "vsLast" and "progress": only when a last saved read was given. "vsLast" is "better" if that fix has visibly improved, "same" if it is still there, "new" if the biggest fix now is a different one. "progress" is one short sentence on that change, in Holt's voice: "In July the bar drifted forward. Now it stays over your mid-foot." With no last read, "vsLast" is "new" and "progress" is an empty string.
- "encourage": exactly one short sentence, always present. Every rule above applies to it too.
- Every sentence is plain text. No markdown, no headings, no bullets, no numbering, no emoji. The app adds its own labels, so do not write "Good:" or "Fix:" yourself.
- Keep the whole thing short. Five sentences of Holt is better than twelve of anybody else.`;
interface Body {
    lift?: unknown;
    frames?: unknown;
    times?: unknown;
    focus?: unknown;
    known?: unknown;
    last?: unknown;
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
    const said = `${lift}\n${note}`;
    const guarded = guardRoute(said) ?? (mentionsDiscomfort(said) ? ('medical_stop' as const) : null);
    if (guarded)
        return json({ route: guarded });
    const frames = capFrames(body.frames);
    if (!frames)
        return json({ ok: false, reason: 'bad_request' }, 400);
    const times = capFrameTimes(body.times, frames.length);
    const authorization = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authorization } },
    });
    const { data: quoteRow, error: quoteError } = await supabase
        .rpc('coach_ai_quote', { p_action: FORM_ACTION })
        .maybeSingle();
    if (quoteError)
        return json({ ok: false, reason: 'meter_unavailable' }, 503);
    const quote = quoteRow as {
        allowed: boolean;
        cost: number;
        remaining: number;
        allowance: number;
    } | null;
    if (!quote?.allowed) {
        return json({
            ok: false,
            reason: 'out_of_credits',
            remaining: quote?.remaining ?? 0,
            allowance: quote?.allowance ?? 0,
        });
    }
    const content: unknown[] = [];
    frames.forEach((data, i) => {
        content.push({ type: 'text', text: frameLabel(i, frames.length, times?.[i]) });
        content.push({ type: 'image', source: { type: 'base64', media_type: MEDIA_TYPE, data } });
    });
    const focus = capFocus(body.focus);
    const known = capKnown(body.known);
    const last = capLast(body.last);
    content.push({
        type: 'text',
        text: `Those frames are one set of: ${lift}. They are in time order.${focus.length ? `\n\nLook especially at: ${focus.join(', ')}.` : ''}${note ? `\n\nThe athlete says: "${note}"` : ''}${known ? `\n\nCoaching notes for this lift from the app's library (reference only):\n${known}` : ''}${last ? `\n\nLast saved read of this lift (${last.date}): ${last.fix}` : ''}\n\nAnswer with the JSON object only.`,
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
            p_action: FORM_ACTION, p_credits: 0, p_model: MODEL,
            p_input_tokens: 0, p_output_tokens: 0,
            p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
            p_uncharged: true,
        });
        return json({ ok: false, reason: 'upstream_error' }, 503);
    }
    const payload = await response.json();
    const usage = payload?.usage ?? {};
    const text: string = (payload?.content ?? [])
        .filter((b: {
        type: string;
    }) => b.type === 'text')
        .map((b: {
        text: string;
    }) => b.text)
        .join('\n');
    const read = payload?.stop_reason === 'refusal' ? null : parseFormRead(text, lift, frames.length);
    let spent: {
        allowed: boolean;
        credits_spent: number;
        remaining: number;
    } | null = null;
    if (read) {
        const { data } = await supabase.rpc('coach_ai_spend_credits', { p_action: FORM_ACTION }).maybeSingle();
        spent = data as typeof spent;
    }
    await supabase.rpc('coach_ai_record_usage', {
        p_action: FORM_ACTION,
        p_credits: spent?.allowed ? spent.credits_spent : 0,
        p_model: payload?.model ?? MODEL,
        p_input_tokens: usage.input_tokens ?? 0,
        p_output_tokens: usage.output_tokens ?? 0,
        p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        p_uncharged: !spent?.allowed,
    });
    if (!read)
        return json({ ok: false, reason: 'unreadable', remaining: quote.remaining, charged: false });
    return json({ ok: true, read, remaining: spent?.remaining ?? quote.remaining });
});
