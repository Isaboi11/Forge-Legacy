// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/coach-author/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/coach/author.ts, author-catalogue.ts and medical-routing.ts, which
// the Supabase dashboard editor cannot reach. This copy inlines them in place of their import lines;
// nothing else differs. Regenerate with `node scripts/build-coach-author-deploy.mjs`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// coach-author -> replace the editor contents with this whole file -> Deploy.
// ANTHROPIC_API_KEY is already set (coach-interpret, coach-ask and coach-kitchen use the same secret).
// No migration: it charges the `day` and `program` actions coach-interpret already uses (0203).
// ===============================================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
export const AUTHOR_ACTION = { day: 'day', program: 'program' } as const;
export const AUTHOR_OUTPUT_CAP = { day: 1400, program: 4500 } as const;
const SAID_MESSAGES = 6;
const SAID_CHARS = 1200;
export const AUTHOR_MAX_DAYS = 7;
export const AUTHOR_MAX_EXERCISES = 16;
export const AUTHOR_CARDIO_KEY = /^cardio-(run|walk|bike|row|elliptical|stair)$/;
export const AUTHOR_GOALS = ['strength', 'muscle', 'weight_loss', 'conditioning', 'mobility', 'health'] as const;
export const AUTHOR_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const AUTHOR_ROOMS = ['full_gym', 'home', 'bodyweight'] as const;
export interface AuthorRequest {
    kind: 'day' | 'program';
    said: string[];
    minutes: number | null;
    days: number | null;
    weeks: number | null;
    goal: (typeof AUTHOR_GOALS)[number] | null;
    level: (typeof AUTHOR_LEVELS)[number] | null;
    room: (typeof AUTHOR_ROOMS)[number] | null;
    canUse: string[];
    only: string[];
    cannot: string[];
    keep: string[];
    cardio: string[];
    offPatterns: string[];
    avoid: string[];
    recent: string[];
    notes: string[];
    beside: {
        race: string;
        runDays: number;
    } | null;
}
const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, max: number, chars: number): string[] => [...new Set((Array.isArray(v) ? v : []).map((x) => clean(x, chars)).filter(Boolean))].slice(0, max);
const oneOf = <T extends string>(options: readonly T[], v: unknown): T | null => typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : null;
const whole = (v: unknown, lo: number, hi: number): number | null => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null;
function besideOf(v: unknown): AuthorRequest['beside'] {
    if (!v || typeof v !== 'object')
        return null;
    const b = v as Record<string, unknown>;
    const race = clean(b.race, 24);
    const runDays = whole(b.runDays, 1, 7);
    return race && runDays != null ? { race, runDays } : null;
}
export function narrowAuthorRequest(raw: unknown): AuthorRequest {
    const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
        kind: d.kind === 'program' ? 'program' : 'day',
        said: (Array.isArray(d.said) ? d.said : []).map((x) => clean(x, SAID_CHARS)).filter(Boolean).slice(-SAID_MESSAGES),
        minutes: whole(d.minutes, 10, 180),
        days: whole(d.days, 1, AUTHOR_MAX_DAYS),
        weeks: whole(d.weeks, 1, 52),
        goal: oneOf(AUTHOR_GOALS, d.goal),
        level: oneOf(AUTHOR_LEVELS, d.level),
        room: oneOf(AUTHOR_ROOMS, d.room),
        canUse: list(d.canUse, 30, 40),
        only: list(d.only, 420, 80),
        cannot: list(d.cannot, 120, 80),
        keep: list(d.keep, 40, 80),
        cardio: list(d.cardio, 8, 24).filter((k) => AUTHOR_CARDIO_KEY.test(k)),
        offPatterns: list(d.offPatterns, 16, 40),
        avoid: list(d.avoid, 60, 80),
        recent: list(d.recent, 40, 80),
        notes: list(d.notes, 20, 80),
        beside: besideOf(d.beside),
    };
}
const GOAL_SAID: Record<(typeof AUTHOR_GOALS)[number], string> = {
    strength: 'get stronger',
    muscle: 'build muscle',
    weight_loss: 'lose weight',
    conditioning: 'get fitter',
    mobility: 'move better',
    health: 'general health',
};
const ROOM_SAID: Record<(typeof AUTHOR_ROOMS)[number], string> = {
    full_gym: 'a full commercial gym',
    home: 'their home gym',
    bodyweight: 'bodyweight only, no equipment',
};
export const movementsFor = (minutes: number | null): number => minutes == null ? 6 : minutes <= 30 ? 4 : minutes <= 45 ? 5 : minutes <= 60 ? 6 : 8;
export function authorUserTurn(r: AuthorRequest): string {
    const lines: string[] = [];
    lines.push(r.beside
        ? `Write ONLY the ${r.days ?? ''} LIFTING day${r.days === 1 ? '' : 's'} of a training week. The athlete is training for a ${r.beside.race} and runs ${r.beside.runDays} day${r.beside.runDays === 1 ? '' : 's'} a week on a running plan the app has already written. Do not write any running or cardio. The app repeats these lifting days for ${r.weeks ?? 'several'} weeks.`
        : r.kind === 'day'
            ? 'Write ONE training session.'
            : `Write ONE training week${r.days == null ? ', with as many training days as they asked for' : ` of ${r.days} training day${r.days === 1 ? '' : 's'} — unless their words name a different number of days, in which case their words win`}. The app repeats the week for ${r.weeks ?? 'several'} weeks.`);
    lines.push('What the athlete said, in order:');
    for (const s of r.said)
        lines.push(`- "${s}"`);
    lines.push('');
    lines.push('What the app knows:');
    if (r.minutes != null)
        lines.push(`- Time per session: ${r.minutes} minutes — about ${movementsFor(r.minutes)} movements unless they said a number.`);
    lines.push(r.goal ? `- Goal: ${GOAL_SAID[r.goal]}.` : '- Goal: not given. Read it from their words; if they did not say, write for building muscle.');
    if (r.level)
        lines.push(`- Level: ${r.level}.${r.level === 'advanced' ? '' : ' Nothing marked ^.'}`);
    if (r.room)
        lines.push(`- Training at: ${ROOM_SAID[r.room]}.`);
    if (r.only.length)
        lines.push(`- Their kit allows ONLY these movements — nothing else in the library can be done where they train: ${r.only.join(' ')}.`);
    else if (r.canUse.length)
        lines.push(`- Equipment they can use — ONLY movements whose equipment is one of these: ${r.canUse.join(', ')}.`);
    if (r.cannot.length)
        lines.push(`- Not available where they train — never use: ${r.cannot.join(' ')}.`);
    if (r.offPatterns.length) {
        lines.push(`- Working around something — NO movement from these sections: ${r.offPatterns.join('; ')}.${r.keep.length ? ` The only exceptions allowed from them: ${r.keep.join(' ')}.` : ''}`);
    }
    lines.push(r.cardio.length ? `- Cardio they can do: ${r.cardio.join(', ')}.` : '- Cardio they can do: none of the cardio- keys.');
    if (r.avoid.length)
        lines.push(`- Never use: ${r.avoid.join(', ')}.`);
    if (r.recent.length)
        lines.push(`- Trained in their last few sessions — prefer something else unless they asked for it by name: ${r.recent.join(', ')}.`);
    if (r.notes.length)
        lines.push(`- What you know about this athlete: ${r.notes.join('; ')}.`);
    return lines.join('\n');
}
export interface AuthoredExercise {
    key: string;
    sets: number;
    reps: number;
    repsTo: number;
    seconds: number;
    group: string;
    part: 'warmup' | 'main' | 'cooldown';
    note: string;
}
export interface AuthoredDay {
    name: string;
    exercises: AuthoredExercise[];
}
export interface AuthoredPlan {
    say: string;
    title: string;
    days: AuthoredDay[];
    unmet: string[];
}
export const AUTHOR_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['say', 'title', 'days', 'unmet'],
    properties: {
        say: { type: 'string' },
        title: { type: 'string' },
        days: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'exercises'],
                properties: {
                    name: { type: 'string' },
                    exercises: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['key', 'sets', 'reps', 'repsTo', 'seconds', 'group', 'part', 'note'],
                            properties: {
                                key: { type: 'string' },
                                sets: { type: 'number' },
                                reps: { type: 'number' },
                                repsTo: { type: 'number' },
                                seconds: { type: 'number' },
                                group: { type: 'string' },
                                part: { type: 'string', enum: ['warmup', 'main', 'cooldown'] },
                                note: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
        unmet: { type: 'array', items: { type: 'string' } },
    },
} as const;
const count = (v: unknown, hi: number): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= hi ? Math.round(v) : 0);
export function sanitizeAuthored(raw: unknown, kind: 'day' | 'program'): AuthoredPlan | null {
    if (!raw || typeof raw !== 'object')
        return null;
    const d = raw as Record<string, unknown>;
    const days: AuthoredDay[] = [];
    for (const day of Array.isArray(d.days) ? d.days : []) {
        if (!day || typeof day !== 'object')
            continue;
        const x = day as Record<string, unknown>;
        const exercises: AuthoredExercise[] = [];
        for (const e of Array.isArray(x.exercises) ? x.exercises : []) {
            if (!e || typeof e !== 'object')
                continue;
            const y = e as Record<string, unknown>;
            const key = clean(y.key, 80).toLowerCase().replace(/[*^]+$/, '');
            if (!/^[a-z0-9][a-z0-9-]*$/.test(key))
                continue;
            const group = clean(y.group, 4).toUpperCase();
            exercises.push({
                key,
                sets: count(y.sets, 10),
                reps: count(y.reps, 100),
                repsTo: count(y.repsTo, 100),
                seconds: count(y.seconds, 3600),
                group: /^[A-Z]$/.test(group) ? group : '',
                part: y.part === 'warmup' || y.part === 'cooldown' ? y.part : 'main',
                note: clean(y.note, 140),
            });
            if (exercises.length >= AUTHOR_MAX_EXERCISES)
                break;
        }
        if (exercises.length)
            days.push({ name: clean(x.name, 40), exercises });
        if (days.length >= (kind === 'day' ? 1 : AUTHOR_MAX_DAYS))
            break;
    }
    if (!days.length)
        return null;
    const unmet = (Array.isArray(d.unmet) ? d.unmet : []).map((u) => clean(u, 400)).filter((u) => u && u.length <= 220).slice(0, 3);
    return { say: clean(d.say, 320), title: clean(d.title, 48), days, unmet };
}
export const authoredIsWhole = (plan: AuthoredPlan | null): plan is AuthoredPlan => plan != null && plan.days.every((d) => d.exercises.filter((e) => e.part === 'main').length >= 3);
export function authoredFromModelText(text: string, kind: 'day' | 'program'): AuthoredPlan | null {
    try {
        return sanitizeAuthored(JSON.parse(text.trim()), kind);
    }
    catch {
        return null;
    }
}
export type AuthorResult = {
    kind: 'ok';
    plan: AuthoredPlan;
    remaining: number | null;
} | {
    kind: 'stop';
    route: 'crisis' | 'urgent' | 'care' | 'medical';
} | {
    kind: 'none';
} | {
    kind: 'out_of_credits';
} | {
    kind: 'not_entitled';
} | {
    kind: 'unavailable';
} | {
    kind: 'offline';
};
export function authorResultFrom(body: unknown, kind: 'day' | 'program'): AuthorResult {
    if (!body || typeof body !== 'object')
        return { kind: 'unavailable' };
    const d = body as {
        ok?: boolean;
        plan?: unknown;
        reason?: string;
        remaining?: number;
        allowance?: number;
        route?: string;
    };
    if (d.ok) {
        const plan = sanitizeAuthored(d.plan, kind);
        return plan ? { kind: 'ok', plan, remaining: typeof d.remaining === 'number' ? d.remaining : null } : { kind: 'none' };
    }
    switch (d.reason) {
        case 'stop':
            return { kind: 'stop', route: d.route === 'crisis' || d.route === 'urgent' || d.route === 'care' ? d.route : 'medical' };
        case 'none':
            return { kind: 'none' };
        case 'out_of_credits':
            return d.allowance ? { kind: 'out_of_credits' } : { kind: 'not_entitled' };
        default:
            return { kind: 'unavailable' };
    }
}
export function authorFallbackLine(r: Exclude<AuthorResult, {
    kind: 'ok';
} | {
    kind: 'stop';
}>): string {
    switch (r.kind) {
        case 'out_of_credits':
            return "You're out of Premium AI credits this month, so I built this one from the rulebook. It follows the focus, not every word.";
        case 'not_entitled':
            return 'Reading every word is part of Premium AI, so I built this one from the rulebook.';
        case 'offline':
            return "I couldn't get a connection, so I built this one from the rulebook. It follows the focus, not every word.";
        default:
            return "I couldn't write that one out just now, so I built it from the rulebook. It follows the focus, not every word.";
    }
}
export const ACUTE = /\b(ruptur\w*|fractur\w*(?!\s+(my|the|our)\s+(schedule|week|plans?|routine|program|calendar))|surger\w*|operation|operated|post[-\s]?op|sprain\w*|dislocat\w*|physio\w*|physical\s+therap\w*|doctor|surgeon|orthopa?ed\w*|mri|x[-\s]?ray|numb\w*|tingl\w*|pinched|shooting\s+pain|swell\w*|swollen|herniat\w*|bulging\s+disc|sciatic\w*|concussion|whiplash)\b/i;
export const CRISIS = /\b(kill(ing)?\s+myself|kms|suicid\w*|end(ing)?\s+(it\s+all|my\s+life|it)\b(?!\s+(early|there|here|with|on|at))|want(ed)?\s+to\s+die|wanna\s+die|rather\s+(not\s+exist|be\s+dead)|(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|be\s+here\s+anymore)|hurt(ing)?\s+myself|harm(ing)?\s+myself|self[-\s]?harm\w*|cut(ting)?\s+myself|(hit|punch|punish)(ing)?\s+myself|no\s+reason\s+to\s+live|(till|until)\s+(they|it|i)\s+bleed|make\s+myself\s+bleed)\b/i;
export const URGENT = /\b(chest\s+(pain|pressure|tightness|is\s+tight|feels\s+tight|hurts)|pain\s+in\s+my\s+chest|(passed|pass(ing)?|blacked|black(ing)?)\s+out|faint(ed|ing)?\b|can'?t\s+(catch\s+my\s+)?breathe?|trouble\s+breathing|struggling\s+to\s+breathe|asthma\s+attack|heart\s+(is\s+|keeps\s+|won'?t\s+stop\s+)?(racing|pounding|skipping|fluttering)|(dark|brown|cola|tea)[-\s]colou?red\s+(pee|urine)|(pee|urine)\s+(is\s+|was\s+|looks\s+)?(dark|brown|cola|tea)\b|rhabdo\w*|worst\s+headache|severe\s+headache|thunderclap|face\s+(is\s+)?droop\w*|slurr\w*|seizure|can'?t\s+feel\s+my\s+(legs|arms|feet)|(low|crashing)\s+blood\s+sugar|blood\s+(sugar|glucose)\s+(is\s+|was\s+|keeps\s+|feels\s+|went\s+|just\s+)*(low|crash\w*|dropp\w*|tank\w*|plummet\w*)|hypoglyc\w*|dolor\s+de\s+pecho|duele\s+el\s+pecho|(lost|losing|lose|can'?t\s+control)\s+(my\s+)?(bladder|bowel)|throat\s+(is\s+)?(swelling|swollen|closing)|short(ness)?\s+of\s+breath|swollen\s+and\s+(hot|red)|(hot|red)\s+and\s+swollen)\b/i;
const AMBIGUOUS_DAMAGE = /\b(broke|broken|tear|tears|tearing|tore|torn|strained|strain|strains|snapped|popped|blew\s+out|went\s+pop)\b/i;
const BODY_PART = /\b(shoulder|shoulders|rotator\s+cuff|labrum|knee|knees|acl|mcl|meniscus|back|spine|disc|neck|hip|hips|ankle|ankles|wrist|wrists|elbow|elbows|arm|arms|leg|legs|foot|feet|hand|hands|rib|ribs|collarbone|clavicle|hamstring|hamstrings|quad|quads|calf|calves|groin|achilles|bicep|biceps|tricep|triceps|pec|pecs|chest|glute|glutes|femur|tibia|fibula|humerus|tendon|ligament|muscle|hammy|hammies|lat|lats|oblique|obliques|adductor|adductors|shin|shins|trap|traps)\b/i;
const WORDS = String.raw `(?:[\w'-]+\s+){0,4}`;
const DAMAGE_NEAR_BODY = new RegExp(String.raw `\b(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b` +
    `|` +
    String.raw `\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\b`, 'i');
export const SEEKING_ADVICE = /\b(what('?s| is)\s+wrong|why\s+does\s+(it|my)|should\s+i\s+(see\s+(a|someone|somebody|the|my)|go\s+to\s+(a|the)\s+(doctor|er|hospital|clinic)|worry|rest\s+(it|my|this|that)\b|stop\s+(training|lifting|running)\s+(on|with|because)|ice|stretch\s+(it|my|this|that)\b)|is\s+(it|this|that)\s+(ok|okay|serious|bad|normal|fine)(?!\s+(to|if|for)\b)|do\s+i\s+need\s+(a\s+(brace|scan|doctor|cast|splint|x[-\s]?ray|mri)|to\s+(see|get\s+it\s+(checked|looked\s+at)))|how\s+do\s+i\s+(fix|heal|treat|rehab)\s+(it|this|that|my)\b|diagnos\w*|what\s+(should|do)\s+i\s+do\s+about|will\s+it\s+heal)\b/i;
export const DISORDERED_EATING = /\b(purg(e|es|ed|ing)|(throw(ing|n)?|threw)\s+up\s+after\s+(i\s+eat|eating|meals?|food)|make\s+myself\s+(throw\s+up|sick|puke)|starv(e|ing)\s+myself|laxatives?\s+(to|for)\s+(lose|drop|cut)|(eat|eating)\s+(only\s+)?([1-7]\d{2}|[1-9]\d)\s+cal\w*\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)))|stop(ped)?\s+eating\s+(to|so)\b|(vomit\w*|puk(e|es|ed|ing)|barf\w*|(throw(s|ing|n)?|threw)\s+up)\s+(\w+\s+){0,3}(after|when)\s+(i\s+)?(eat\w*|ate|meals?|food|dinner|lunch|breakfast|snacks?|bing\w*)|(vomit\w*|puk(e|es|ed|ing)|sick|(throw(s|ing|n)?|threw)\s+up)\s+(\w+\s+){0,4}on\s+purpose|self[-\s]induced\s+vomit\w*)/i;
export const EATING_DISORDER_NAMED = /\b(anorexi\w*|anorectic|bulimi\w*|eating\s+disorder\w*|binge[-\s]eating|arfid|orthorexi\w*|ednos)\b/i;
const RECOVERY = /\b(recover(y|ing|ed)|in\s+treatment|my\s+(therapist|treatment\s+team))\b/i;
export const DIET_DRUG = /\b(appetite\s+(suppress\w*|blocker\w*|killer\w*)|fat[-\s]?burners?|diet\s+(pills?|drugs?|tea)|slimming\s+(pills?|tea|drops)|weight[-\s]?loss\s+(pills?|drugs?|meds?|medications?|injections?|shots?|tea|supplements?)|phentermine|adipex|qsymia|contrave|orlistat|xenical|clenbuterol|clen|dnp|ephedrine|ephedra|garcinia|hydroxycut|lipozene|sibutramine)\b/i;
export const MEDICAL_CONTEXT = /\b(pregnan\w*|postpartum|post-partum|breastfeed\w*|breast-feed\w*|c-?section|miscarriage|epilep\w*|diabet\w*|insulin|heart\s+(condition|disease|murmur|attack|problem|issue)s?|arrhythmia|a-?fib|pacemaker|blood\s+pressure|hypertension|asthma|copd|cancer|chemo\w*|osteopor\w*|arthritis|ssris?|antidepressant\w*|medications?|prescription|cortisone|steroid\s+shot|kidney\s+(disease|stones?|failure|function|problems?|issues?|condition|transplant|damage|infection)|ckd|liver\s+(disease|condition)|hernia|cleared\s+(me|by)|got\s+clearance|lactating|lactation|breast\s*milk|milk\s+supply|pumping\s+(breast\s*)?milk|(i'?m|i\s+am|im|currently|still|been|while|when|and)\s+(\w+\s+)?nursing\b(?!\s+(a|an|my|the|this|that|his|her|student|school|home|degree|shift|job|injur\w*|hangover))|nursing\s+((a|my|the|our)\s+)?(mom|mother|mum|baby|son|daughter|newborn|infant|twins))\b/i;
export const NUTRITION_MEDICAL = /\b(thyroid|hypothyroid\w*|hyperthyroid\w*|hashimoto\w*|cholesterol|statins?|a1c|pre-?diabet\w*|ibs|irritable\s+bowel|crohn'?s?|colitis|gerd|acid\s+reflux|gout|celiac|coeliac|pcos|polycystic|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide|glp-?1|metformin|blood\s*work|lab\s+(results?|work)|blood\s+tests?|blood\s+thinners?|warfarin|eliquis|gastric\s+(sleeve|bypass|band)|bariatric|lap[-\s]?band|anemi\w*|anaemi\w*|iron\s+deficien\w*|t[12]d|type\s*[-]?\s*(1|2|one|two|i|ii)\s+diabet\w*|(i\s+have|i'?ve\s+got|i'?m|im|i\s+am|with|living\s+with|as\s+a)\s+(a\s+)?type\s*[-]?\s*(1|2|one|two|i|ii)\b(?!\s*(and\s+type\s*\w+\s+)?(muscle|fib\w*|fibre\w*|fun|personality|error))|blood\s*(sugar|glucose)|glucose\s+(levels?|monitor\w*|spikes?|readings?)|cgm|insulin\s+resist\w*|(am\s+i|could\s+i\s+be|do\s+i\s+have|i\s+think\s+i'?m|i\s+think\s+i\s+(am|have)|think\s+i'?m)\s+(\w+\s+){0,2}(lactose\s+intolerant|gluten\s+intolerant|intolerant|allergic|celiac|an?\s+(food\s+)?allergy))\b/i;
export const RESTRICTION = /\b((water|dry|juice|bone\s+broth)\s+fast\w*|(juice\s+)?cleanse\w*|detox\w*|lowest\s+(calories|cals?|possible)|as\s+(few|little|low)\s+(calories|cals?\s+)?as\s+possible|(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2})\s*(cal\w*|kcals?)\s*((a|per|each)\s+day|\/\s*(day|d)\b|daily)|(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2})\s*(cal\w*|kcals?)\s+(or\s+(less|under|below)\s+)?(a|per|each)\s+day|(target|goal|calories|cals?)\s+(to|at|of)\s+([1-9]\d{2}|1,?[01]\d{2})\b(?!\s*(protein|carbs?|g\b|grams?))|(only|just)\s+(eat(ing)?|consum\w*)\s+(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2}|[1-9]\d)\s*(cal\w*|kcals?)\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)|in\b|more|left|remaining|over|under|to\s+(go|spare|work|spend)))|(eat|eating|ate|consume|consuming)\s+(only|just|under|less\s+than|below)\s+(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2}|[1-9]\d)\s*(cal\w*|kcals?)\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)))|binge\w*\s+(and|then)\s+(then\s+)?(don'?t|not|stop|skip|starve|fast|purge|restrict)|(haven'?t|have\s+not|didn'?t|did\s+not|not)\s+eaten?\s+(anything\s+)?(in|for)\s+(\d+|a\s+few|two|three|four|several)\s+days|(cut|lose|drop)\s+(\d{2,}|[5-9])\s*(lbs?|pounds|kg|kilos?)\s+(in|by|within)\s+(a|one|1|2|two|3|three|a\s+few)\s+(week|days?)|(fasting|fasted|fast\s+for|without\s+(eating|food|any\s+food)|no\s+food|not\s+eat(ing)?|stop\s+eating|skip(ping)?\s+(eating|food|all\s+meals))\s+(for\s+)?((\d+|a|one|two|three|four|five|six|seven|a\s+few|a\s+couple(\s+of)?|several|multiple)[-\s]*(days?|weeks?)|(2[4-9]|[3-9]\d|\d{3})[-\s]*(hours?|hrs?|h)|(a\s+)?(whole|full|entire)\s+(day|week))\b|((\d+|a|one|two|three|four|five|six|seven|a\s+few|a\s+couple(\s+of)?|several|multiple)[-\s]*(days?|weeks?)|(2[4-9]|[3-9]\d|\d{3})[-\s]*(hours?|hrs?|h)|(a\s+)?(whole|full|entire)\s+(day|week))\s+(fast(s|ing)?|without\s+(eating|food|any\s+food)|of\s+(fasting|no\s+food|not\s+eating)|no\s+food)|laxatives?|diuretics?|water\s+pills|(feel|felt|feeling)\s+(so\s+)?(fat|disgusting|gross|ashamed|guilty)(\s+(and|&)\s+\w+)?\s+(after|when)\s+(i\s+)?(eat|eating|ate))\b/i;
const CRASH_CUT = /\b(cut|cutting|lose|losing|drop|dropping|shed|shedding|burn\s+off)\s+(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kgs?|kilos?|kilograms?)\s+(?:of\s+\w+\s+)?(?:in|by|within|over|inside)\s+(?:the\s+next\s+|less\s+than\s+|under\s+)?(a|an|one|two|three|four|five|six|a\s+few|a\s+couple(?:\s+of)?|\d+)\s*(days?|weeks?|wks?|months?)\b/i;
const WORD_N: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
export function isCrashCut(text: string): boolean {
    const m = CRASH_CUT.exec(text);
    if (!m)
        return false;
    const lbs = Number(m[2]) * (/^k/i.test(m[3]) ? 2.2 : 1);
    const n = /^\d/.test(m[4]) ? Number(m[4]) : /few/i.test(m[4]) ? 3 : /couple/i.test(m[4]) ? 2 : (WORD_N[m[4].toLowerCase()] ?? 1);
    const weeks = /^d/i.test(m[5]) ? n / 7 : /^m/i.test(m[5]) ? n * 4.3 : n;
    return lbs >= 5 && lbs / weeks > 2.5;
}
export const MINOR_AGE = /\b((i'?m|i\s+am|im)\s+(only\s+|just\s+)?(1[0-7]|thirteen|fourteen|fifteen|sixteen|seventeen)\b(?!\s*(lbs?|pounds|kg|min|minutes|miles|reps|%|k\b|x\b|sets\b|set\s+of\b|days?|weeks?|hours?))|(my|our|a|an|the)\s+(\w+\s+)?(son|daughter|kid|kids|child|children|boy|girl|teen|teenager|stepson|stepdaughter|nephew|niece|brother|sister)(\s+(is|who'?s|turned|just\s+turned)\s+|'s\s+|\s*,\s*)(only\s+|just\s+)?([4-9]|1[0-7])\b(?!\s*(lbs?|pounds|kg|min|minutes|months?|%))|\b([4-9]|1[0-7])[-\s]?(year|yr)s?[-\s]?olds?\b|\b([4-9]|1[0-7])\s?(yo|y\/o|y\.o\.)(?=\W|$)|\b(teen|teenager|middle\s+schooler|high\s+schooler|freshman\s+in\s+high\s+school))/i;
export const MINOR_TOPIC = /\b(cut(ting)?\b(?!\s+(up|into|the|it|them|this|that|in\s+half|board|a|an|my|some|back|out|off))|(cut|cutting)\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg|fat)|(lose|losing|drop|dropping)\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg|fat)|diet(ing)?\b|calorie\w*|cals?\b|kcals?\b|macros?|deficit|fasting|bulk(s|ing|ed)?\b|meal\s+plan\w*|lean\s+out|shred\w*|weight\s+(loss|gain)|gain\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg)|how\s+much\s+(food\s+|protein\s+)?(should|does|do|can|must)\s+([\w'-]+\s+){1,4}(eat|have)\b)/i;
export const FOOD_URGENT = /\b((lips?|tongue|face|mouth|throat)\s+(is\s+|are\s+|feels?\s+|started\s+|keeps?\s+)?(swell\w*|swollen|closing|tight(ening)?)|anaphyla\w*|epi-?pens?|allergic\s+reaction|(i'?m|i\s+am|he'?s|she'?s|they'?re|someone\s+is|is)\s+choking|chok(ed|ing)\s+on|can'?t\s+swallow|hives\s+(and|with)\s+(trouble|can'?t|hard)|(lips?|tongue|mouth|throat|face)\s+(is\s+|are\s+|feels?\s+|felt\s+|got\s+|getting\s+|started\s+|starting\s+|keeps?\s+|went\s+|gone\s+)?(\w+\s+)?(itch\w*|tingl\w*|numb|prickl\w*|burning)|(itchy|tingly|prickly)\s+(lips?|tongue|mouth|throat)|(broke\s+out\s+in|breaking\s+out\s+in|covered\s+in|got|getting|have)\s+hives)\b/i;
const TYPO_WORDS = [
    'want', 'wanna', 'hurt', 'harm', 'kill', 'killing', 'myself', 'suicide', 'suicidal', 'anymore', 'alive', 'exist', 'reason', 'bleed', 'ending',
    'blood', 'thinners', 'pressure', 'laxative', 'laxatives', 'diuretic', 'diuretics', 'pregnant', 'diabetic', 'diabetes', 'insulin',
    'cholesterol', 'ozempic', 'wegovy', 'metformin', 'thyroid', 'lactose', 'intolerant', 'breastfeeding', 'medication', 'medications',
    'eating', 'eaten', "haven't", 'fast', 'disgusting', 'starve', 'lowest', 'possible', 'days', 'calories',
];
const REAL_WORDS = new Set(['last', 'past', 'cast', 'vast', 'fats', 'feast', 'east', 'fist']);
function oneEdit(a: string, b: string): boolean {
    if (a === b)
        return true;
    if (Math.abs(a.length - b.length) > 1)
        return false;
    if (a.length === b.length) {
        const diff: number[] = [];
        for (let i = 0; i < a.length; i += 1)
            if (a[i] !== b[i])
                diff.push(i);
        if (diff.length === 1)
            return true;
        return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
    }
    const [s, l] = a.length < b.length ? [a, b] : [b, a];
    for (let i = 0; i < l.length; i += 1)
        if (l.slice(0, i) + l.slice(i + 1) === s)
            return true;
    return false;
}
export function correctedForStops(text: string): string | null {
    const lower = text.toLowerCase();
    const fixed = lower.replace(/[a-z']+/g, (w) => (w.length < 4 || REAL_WORDS.has(w) ? w : TYPO_WORDS.find((c) => oneEdit(w, c)) ?? w));
    return fixed === lower ? null : fixed;
}
const SENSATION = String.raw `(crack\w*|pop|pops|popping|click\w*|grind\w*|clunk\w*|crunch\w*)`;
const SYMPTOM_QUESTION_SOURCE = () => String.raw `\b${SENSATION}\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b|\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}${SENSATION}\b|\bis\s+(it|this|that)\s+(bad|normal|ok|okay|safe|dangerous|fine)\b[^.?!]{0,40}\bmy\s+(?:${BODY_PART.source.slice(3, -3)})\b`;
export const DOSE = /(\b\d+(\.\d+)?\s*(mg|mcg|milligrams?|grams?|g|iu|scoops?)\b[^.?!]{0,30}\b(caffeine|creatine|pre-?workout|supplements?|beta-?alanine|melatonin|vitamin|ashwagandha|stims?)\b|\bhow\s+(much|many\s+(mg|milligrams|scoops))\s+(of\s+)?(caffeine|creatine|pre-?workout|melatonin|beta-?alanine|ashwagandha|vitamin\s*d?)\b|\b(caffeine|creatine|pre-?workout|melatonin)\s+(dose|dosage|dosing)\b)/i;
const SYMPTOM_QUESTION = new RegExp(SYMPTOM_QUESTION_SOURCE(), 'i');
export const mentionsDiscomfort = (text: string): boolean => /\b(hurt\w*|pain\w*|ach(e|es|ing|y)|sore\w*|injur\w*|tweak(ed|ing)?|strain\w*|niggl\w*|uncomfortable|discomfort|stiff\w*|flare[-\s]?up|twinge)\b/i.test(text ?? '');
export type MedicalRoute = 'clear' | 'crisis' | 'urgent' | 'care' | 'acute' | 'advice';
export function medicalRoute(text: string): MedicalRoute {
    const t = (text ?? '').replace(/[‘’ʼ]/g, "'").trim();
    if (!t)
        return 'clear';
    const r = routeOnce(t);
    if (r !== 'clear')
        return r;
    const fixed = correctedForStops(t);
    return fixed ? routeOnce(fixed) : 'clear';
}
const FOODISH = /\b(eat|eating|ate|food|meal|breakfast|lunch|dinner|snack\w*|recipe|diet|protein|carbs?|sugar|calorie\w*|fruit|coffee)\b/i;
function routeOnce(t: string): MedicalRoute {
    if (CRISIS.test(t))
        return 'crisis';
    if (URGENT.test(t) || FOOD_URGENT.test(t))
        return 'urgent';
    if (DISORDERED_EATING.test(t) || RESTRICTION.test(t) || isCrashCut(t) || DIET_DRUG.test(t))
        return 'care';
    if (EATING_DISORDER_NAMED.test(t))
        return RECOVERY.test(t) ? 'advice' : 'care';
    if (MINOR_AGE.test(t) && MINOR_TOPIC.test(t))
        return 'care';
    if (DOSE.test(t))
        return 'care';
    if (ACUTE.test(t))
        return 'acute';
    if (DAMAGE_NEAR_BODY.test(t))
        return 'acute';
    if (MEDICAL_CONTEXT.test(t) || NUTRITION_MEDICAL.test(t) || SYMPTOM_QUESTION.test(t))
        return 'advice';
    if (SEEKING_ADVICE.test(t) && !(FOODISH.test(t) && !BODY_PART.test(t) && !mentionsDiscomfort(t)))
        return 'advice';
    return 'clear';
}
export const stopsForMedical = (text: string): boolean => medicalRoute(text) !== 'clear';
export function withoutStoppedTurns<T extends {
    role: string;
    text: string;
}>(turns: readonly T[], stops: (text: string) => boolean = stopsForMedical): T[] {
    const kept: T[] = [];
    let answering = false;
    for (const t of turns) {
        if (t.role !== 'holt')
            answering = false;
        if (stops(t.text)) {
            if (t.role !== 'holt')
                answering = true;
            continue;
        }
        if (t.role === 'holt' && answering)
            continue;
        kept.push(t);
    }
    return kept;
}
export const AUTHOR_CATALOGUE_COUNT = 733;
export const AUTHOR_CATALOGUE = "## Calf / Ankle\nbarbell|calves: barbell-calf-raise\nbodyweight|calves: calf-raise calf-wall-stretch* single-leg-calf-raise\nbodyweight|tibialis_anterior: tibialis-raise\ncable|calves: cable-calf-raise\ndumbbell|calves: dumbbell-calf-raise single-leg-dumbbell-calf-raise\ndumbbell|tibialis_anterior: dumbbell-tibialis-raise\nresistance_band|calves: band-calf-raise\nselectorized_machine|calves: donkey-calf-raise-machine seated-calf-raise-machine standing-calf-raise-machine\nselectorized_machine|tibialis_anterior: tibialis-raise-machine\nsmith_machine|calves: smith-machine-calf-raise\n\n## Cardio / Locomotion\nbodyweight|cardiovascular: bear-crawl* crab-walk* wall-walk\ncardio|cardiovascular: arc-trainer boxing-mitt-work double-under heavy-bag-boxing hike jump-rope jump-rope-intervals kickboxing-bag-work ruck shadow-boxing ski-erg ski-erg-intervals\nselectorized_machine|cardiovascular: arm-ergometer jacobs-ladder versaclimber\nsled|cardiovascular: light-sled-sprint sled-bear-crawl-drag\n\n## Carry\nbarbell|forearms,traps: barbell-front-rack-carry* barbell-overhead-carry* trap-bar-farmer-carry*\ncable|forearms,traps: cable-bear-hug-carry*\ndumbbell|forearms,traps: dumbbell-farmer-carry* dumbbell-front-rack-carry* dumbbell-overhead-carry* dumbbell-suitcase-carry* dumbbell-waiter-carry* farmer-carry* suitcase-carry*\nkettlebell|forearms,traps: cross-body-carry* front-rack-carry* kettlebell-bottoms-up-carry* kettlebell-farmer-carry* kettlebell-front-rack-carry* kettlebell-overhead-carry* kettlebell-suitcase-carry* overhead-carry*\nmedicine_ball|forearms,traps: slam-ball-bear-hug-carry*\nsandbag|forearms,traps: sandbag-bear-hug-carry* sandbag-front-carry* sandbag-shoulder-carry*\n\n## Core\nbarbell|obliques: barbell-russian-twist\nbarbell|rectus_abdominis: barbell-rollout\nbodyweight|adductors,obliques: copenhagen-plank*\nbodyweight|obliques: bicycle-crunch cross-body-mountain-climber windshield-wiper\nbodyweight|rectus_abdominis: ab-wheel-rollout bird-dog bird-dog-mobility crunch dead-bug dragon-flag^ forearm-plank* hanging-knee-raise hanging-leg-raise hollow-body-hold* hollow-rock l-sit* mcgill-curl-up modified-side-plank* mountain-climber open-book-rotation plank* plank-shoulder-tap reverse-crunch reverse-plank* rkc-plank* side-plank* sit-up toes-to-bar v-sit v-up\ncable|obliques: cable-chop cable-lift cable-press-around cable-side-bend\ncable|rectus_abdominis: cable-anti-rotation-hold* cable-crunch cable-dead-bug cable-pallof-press cable-reverse-crunch cable-rotation cable-wood-chop half-kneeling-pallof-press high-to-low-cable-wood-chop kneeling-cable-crunch low-to-high-cable-wood-chop tall-kneeling-pallof-press\ndumbbell|obliques: dumbbell-russian-twist dumbbell-side-bend\ndumbbell|rectus_abdominis: dumbbell-dead-bug\nkettlebell|obliques: kettlebell-russian-twist\nmedicine_ball|obliques: medicine-ball-russian-twist\nmedicine_ball|rectus_abdominis: medicine-ball-dead-bug medicine-ball-mountain-climber medicine-ball-v-up-pass\nresistance_band|rectus_abdominis: band-anti-rotation-hold* band-dead-bug band-pallof-press band-wood-chop\nselectorized_machine|obliques: machine-rotary-torso\nselectorized_machine|rectus_abdominis: machine-abdominal-crunch\nsuspension_trainer|rectus_abdominis: suspension-trainer-fallout suspension-trainer-knee-tuck suspension-trainer-mountain-climber suspension-trainer-pike suspension-trainer-side-plank*\n\n## Elbow Extension\nbarbell|triceps: barbell-jm-press barbell-overhead-triceps-extension barbell-skull-crusher\nbodyweight|triceps: triceps-stretch*\ncable|triceps: cable-cross-body-triceps-extension cable-overhead-triceps-extension cable-rope-pushdown cable-skull-crusher cable-triceps-pushdown single-arm-cable-overhead-triceps-extension single-arm-cable-pushdown\ndumbbell|triceps: dumbbell-jm-press dumbbell-skull-crusher dumbbell-tate-press dumbbell-triceps-kickback single-arm-dumbbell-overhead-triceps-extension two-hand-dumbbell-overhead-triceps-extension\nez_bar|triceps: ez-bar-jm-press^ ez-bar-overhead-triceps-extension ez-bar-skull-crusher\nresistance_band|triceps: band-overhead-triceps-extension band-triceps-kickback band-triceps-pushdown\nselectorized_machine|triceps: machine-triceps-extension machine-triceps-press\nsuspension_trainer|triceps: suspension-trainer-triceps-extension\n\n## Elbow Flexion\nbarbell|biceps: barbell-biceps-curl barbell-drag-curl barbell-preacher-curl barbell-reverse-curl\ncable|biceps: bayesian-cable-curl cable-biceps-curl cable-preacher-curl cable-reverse-curl cable-rope-hammer-curl cable-straight-bar-curl high-cable-curl single-arm-cable-curl\ndumbbell|biceps: alternating-dumbbell-curl cross-body-hammer-curl dumbbell-bayesian-curl dumbbell-biceps-curl dumbbell-concentration-curl dumbbell-drag-curl dumbbell-hammer-curl dumbbell-incline-curl dumbbell-preacher-curl dumbbell-reverse-curl dumbbell-spider-curl dumbbell-zottman-curl\nez_bar|biceps: ez-bar-biceps-curl ez-bar-drag-curl ez-bar-preacher-curl ez-bar-spider-curl\nez_bar|forearms: ez-bar-reverse-curl ez-bar-reverse-wrist-curl ez-bar-wrist-curl\nresistance_band|biceps: band-biceps-curl band-hammer-curl band-reverse-curl\nselectorized_machine|biceps: machine-biceps-curl machine-preacher-curl\nsuspension_trainer|biceps: suspension-trainer-biceps-curl\n\n## Hinge / Hip Dominant\nbarbell|glutes: axle-deadlift barbell-block-pull barbell-deadlift barbell-deficit-deadlift barbell-glute-bridge barbell-good-morning barbell-hip-thrust barbell-pause-deadlift barbell-rack-pull barbell-romanian-deadlift barbell-seated-good-morning barbell-snatch-grip-deadlift^ barbell-stiff-leg-deadlift barbell-sumo-deadlift barbell-tempo-deadlift\nbodyweight|erector_spinae: back-extension superman-hold*\nbodyweight|glutes: bodyweight-good-morning glute-bridge glute-bridge-iso-hold* single-leg-glute-bridge\nbodyweight|hamstrings: assisted-nordic-curl^ nordic-hamstring-curl^ sliding-hamstring-curl\ncable|glutes: cable-hip-thrust cable-pull-through cable-romanian-deadlift\ncable|hamstrings: cable-assisted-nordic-curl^ cable-standing-leg-curl\ndumbbell|glutes: dumbbell-burpee-deadlift dumbbell-glute-bridge dumbbell-hip-thrust dumbbell-romanian-deadlift dumbbell-stiff-leg-deadlift dumbbell-sumo-deadlift dumbbell-swing single-leg-dumbbell-romanian-deadlift\nkettlebell|glutes: double-kettlebell-swing kettlebell-deadlift kettlebell-romanian-deadlift kettlebell-sumo-deadlift kettlebell-swing single-arm-kettlebell-swing single-leg-kettlebell-romanian-deadlift\nresistance_band|glutes: band-glute-bridge band-good-morning band-hip-thrust band-romanian-deadlift\nresistance_band|hamstrings: band-leg-curl\nselectorized_machine|erector_spinae: machine-back-extension roman-chair-back-extension\nselectorized_machine|glutes: hip-thrust-machine\nselectorized_machine|hamstrings: lying-leg-curl-machine nordic-curl-machine^ seated-leg-curl-machine single-leg-seated-leg-curl standing-leg-curl-machine\nselectorized_machine|hamstrings,glutes: glute-ham-developer-raise\nsmith_machine|glutes: smith-machine-deadlift smith-machine-hip-thrust smith-machine-romanian-deadlift\nsuspension_trainer|glutes: suspension-trainer-glute-bridge\nsuspension_trainer|hamstrings: suspension-trainer-hamstring-curl\n\n## Hip Isolation\nbodyweight|adductors: adductor-rock-back\nbodyweight|glutes: frog-pump\ncable|abductors: cable-hip-abduction\ncable|adductors: cable-hip-adduction\ncable|glutes: cable-donkey-kick cable-glute-kickback\nresistance_band|abductors: band-clamshell band-hip-abduction band-lateral-walk band-monster-walk\nresistance_band|adductors: band-hip-adduction\nresistance_band|glutes: band-glute-kickback\nselectorized_machine|abductors: multi-hip-abduction-machine\nselectorized_machine|adductors: hip-adductor-machine multi-hip-adduction-machine\nselectorized_machine|glutes: glute-drive-machine glute-kickback-machine hip-abductor-machine multi-hip-extension-machine\nselectorized_machine|hip_flexors: multi-hip-flexion-machine\nsuspension_trainer|glutes: suspension-trainer-hip-press\n\n## Horizontal Pull\nbarbell|upper_back: barbell-bent-over-row barbell-meadows-row barbell-pendlay-row barbell-seal-row barbell-yates-row\nbodyweight|upper_back: bodyweight-row feet-elevated-inverted-row inverted-row underhand-inverted-row\ncable|rear_deltoids: cable-face-pull\ncable|upper_back: cable-seated-row close-grip-cable-seated-row high-cable-row low-cable-row single-arm-cable-row wide-grip-cable-seated-row\ndumbbell|lats: dumbbell-pullover-row\ndumbbell|upper_back: dumbbell-bent-over-row dumbbell-chest-supported-row dumbbell-gorilla-row dumbbell-incline-bench-row dumbbell-renegade-row dumbbell-seal-row single-arm-dumbbell-row\nkettlebell|upper_back: kettlebell-gorilla-row kettlebell-row renegade-kettlebell-row single-arm-kettlebell-row\nresistance_band|rear_deltoids: band-face-pull\nresistance_band|upper_back: band-seated-row single-arm-band-row\nselectorized_machine|upper_back: chest-supported-row-machine iso-lateral-row machine-high-row machine-low-row machine-seated-row machine-t-bar-row plate-loaded-seated-row\nsled|upper_back: sled-row\nsmith_machine|upper_back: smith-machine-bent-over-row\nsuspension_trainer|rear_deltoids: suspension-trainer-face-pull\nsuspension_trainer|upper_back: suspension-trainer-high-row suspension-trainer-low-row suspension-trainer-row suspension-trainer-single-arm-row\n\n## Horizontal Push\nbarbell|chest: barbell-bench-press barbell-board-press barbell-close-grip-bench-press barbell-decline-bench-press barbell-floor-press barbell-guillotine-press barbell-incline-bench-press barbell-larsen-press barbell-pin-press barbell-spoto-press\nbodyweight|chest: archer-push-up bench-dip clap-push-up close-grip-push-up decline-push-up deficit-push-up diamond-push-up dive-bomber-push-up explosive-push-up hindu-push-up incline-push-up knee-push-up parallel-bar-dip pike-push-up push-up ring-push-up scapular-push-up straight-bar-dip wide-push-up\ncable|chest: cable-chest-fly cable-chest-press cable-crossover cable-decline-chest-press cable-incline-chest-press high-to-low-cable-fly low-to-high-cable-fly single-arm-cable-chest-press single-arm-cable-fly\ndumbbell|chest: alternating-dumbbell-bench-press dumbbell-bench-press dumbbell-chest-fly dumbbell-decline-bench-press dumbbell-decline-chest-fly dumbbell-floor-press dumbbell-incline-bench-press dumbbell-incline-chest-fly dumbbell-neutral-grip-bench-press dumbbell-squeeze-press single-arm-dumbbell-bench-press single-arm-dumbbell-floor-press single-arm-dumbbell-incline-press\nkettlebell|chest: kettlebell-floor-press single-arm-kettlebell-floor-press\nresistance_band|chest: band-assisted-dip band-chest-fly band-chest-press band-push-up single-arm-band-chest-press\nselectorized_machine|chest: assisted-dip-machine converging-chest-press machine-chest-fly machine-chest-press machine-decline-chest-press machine-incline-chest-press pec-deck-fly plate-loaded-chest-press plate-loaded-incline-chest-press\nselectorized_machine|triceps: machine-triceps-dip\nsled|chest: sled-chest-press\nsmith_machine|chest: smith-machine-bench-press smith-machine-decline-bench-press smith-machine-incline-bench-press\nsuspension_trainer|chest: suspension-trainer-atomic-push-up suspension-trainer-chest-press suspension-trainer-push-up\n\n## Mobility\nbodyweight|hamstrings: foam-roll-hamstrings* hamstring-stretch* seated-hamstring-stretch*\nbodyweight|mobility: 90-90-hip-stretch* 90-90-hip-switch active-hang* ankle-car ankle-dorsiflexion-mobilization arm-circles breathing-drill-90-90* cartwheel cat-cow child-s-pose* cossack-mobility-drill couch-stretch* crocodile-breathing* cross-body-shoulder-stretch* dead-hang* dead-hang-mobility* doorway-chest-stretch* figure-four-stretch* foam-roll-calves* foam-roll-glutes* foam-roll-lats* foam-roll-quadriceps* foam-roll-upper-back* frog-stretch* half-kneeling-hip-flexor-stretch* hip-car inchworm knee-to-wall-ankle-mobilization lacrosse-ball-glute-release* lacrosse-ball-pec-release* lat-stretch-on-bench* neck-car pigeon-stretch* shoulder-car shoulder-rolls sleeper-stretch* standing-hip-flexor-stretch* standing-quad-stretch* supine-diaphragmatic-breathing* thoracic-extension-on-bench* thoracic-extension-on-foam-roller* thread-the-needle toe-touch wall-angel world-s-greatest-stretch wrist-car\nkettlebell|mobility: kettlebell-windmill\nresistance_band|mobility: band-shoulder-dislocate\n\n## Neck Isolation\nselectorized_machine|neck: machine-neck-lateral-flexion neck-extension-machine neck-flexion-machine\n\n## Other\nbodyweight|full_body: hip-airplane rope-climb sprawl\ncable|full_body: cable-sled-drag\ndumbbell|full_body: dumbbell-turkish-get-up^\nkettlebell|full_body: kettlebell-around-the-world kettlebell-figure-eight kettlebell-halo kettlebell-turkish-get-up^\nplyo_box|full_body: snap-down\nselectorized_machine|full_body: grip-machine\nsled|full_body: backward-sled-drag forward-sled-drag hand-over-hand-rope-pull heavy-sled-push lateral-sled-drag prowler-push sled-push sled-rope-pull\n\n## Power / Plyometric\nbarbell|front_deltoids: barbell-push-jerk barbell-split-jerk\nbarbell|glutes,front_deltoids: axle-clean-and-press barbell-clean-and-jerk^\nbarbell|glutes,traps: barbell-clean barbell-clean-pull barbell-hang-clean barbell-hang-snatch^ barbell-power-clean barbell-power-snatch^ barbell-snatch^ barbell-snatch-pull^\nbattle_rope|forearms: battle-rope-alternating-waves battle-rope-circles battle-rope-double-waves battle-rope-lateral-waves battle-rope-slams\nbodyweight|quadriceps: burpee\nbodyweight|quadriceps,glutes: bounding broad-jump countermovement-jump lateral-bound pogo-jump power-skip single-leg-broad-jump single-leg-hop single-leg-pogo-jump skater-jump standing-long-jump triple-hop tuck-jump\ndumbbell|glutes,traps: dumbbell-clean dumbbell-hang-clean single-arm-dumbbell-snatch^\ndumbbell|quadriceps: dumbbell-man-maker\nkettlebell|front_deltoids: kettlebell-jerk\nkettlebell|glutes,front_deltoids: kettlebell-clean-and-press\nkettlebell|glutes,traps: double-kettlebell-clean kettlebell-clean kettlebell-goblet-clean kettlebell-high-pull kettlebell-snatch^\nmedicine_ball|chest,triceps: medicine-ball-chest-pass\nmedicine_ball|glutes,hamstrings: slam-ball-over-shoulder-throw\nmedicine_ball|obliques: medicine-ball-rotational-throw\nmedicine_ball|obliques,front_deltoids: medicine-ball-shot-put-throw\nmedicine_ball|quadriceps: medicine-ball-burpee\nmedicine_ball|quadriceps,glutes: medicine-ball-wall-ball\nmedicine_ball|rectus_abdominis: medicine-ball-rainbow-slam medicine-ball-scoop-toss medicine-ball-side-slam medicine-ball-sit-up-throw medicine-ball-slam slam-ball-ground-to-shoulder\nmedicine_ball|rectus_abdominis,lats: medicine-ball-overhead-throw\nplyo_box|quadriceps,glutes: box-jump box-jump-over box-step-off-landing burpee-box-jump depth-drop depth-jump^ drop-to-sprint forward-hurdle-hop hurdle-jump lateral-hurdle-hop reactive-box-jump seated-box-jump\nsandbag|glutes,traps: sandbag-clean\nstrongman_implement|glutes,front_deltoids: log-clean-and-press\n\n## Shoulder Isolation\nbarbell|lateral_deltoids,traps: barbell-upright-row\nbarbell|traps: barbell-shrug\nbodyweight|rear_deltoids: scapular-wall-slide\ncable|front_deltoids: single-arm-cable-front-raise\ncable|lateral_deltoids: behind-the-back-cable-lateral-raise cable-lateral-raise\ncable|lateral_deltoids,traps: cable-upright-row\ncable|rear_deltoids: cable-rear-delt-fly cable-y-raise\ncable|rotator_cuff: cable-external-rotation cable-internal-rotation\ncable|traps: cable-shrug\ndumbbell|front_deltoids: dumbbell-front-raise\ndumbbell|lateral_deltoids: dumbbell-lateral-raise leaning-dumbbell-lateral-raise single-arm-dumbbell-lateral-raise\ndumbbell|lateral_deltoids,traps: dumbbell-upright-row\ndumbbell|rear_deltoids: dumbbell-rear-delt-fly incline-dumbbell-rear-delt-fly\ndumbbell|traps: dumbbell-shrug\nez_bar|lateral_deltoids,traps: ez-bar-upright-row\nresistance_band|front_deltoids: band-front-raise\nresistance_band|lateral_deltoids: band-lateral-raise\nresistance_band|lateral_deltoids,traps: band-upright-row\nresistance_band|rear_deltoids: band-pull-apart band-rear-delt-fly\nresistance_band|rotator_cuff: band-shoulder-external-rotation band-shoulder-internal-rotation\nresistance_band|traps: band-shrug\nselectorized_machine|lateral_deltoids: machine-lateral-raise\nselectorized_machine|lateral_deltoids,traps: machine-upright-row\nselectorized_machine|rear_deltoids: machine-rear-delt-fly reverse-pec-deck\nselectorized_machine|traps: machine-shrug\nsuspension_trainer|rear_deltoids: suspension-trainer-t-raise suspension-trainer-y-raise\n\n## Squat / Knee Dominant\nbarbell|quadriceps: barbell-back-squat barbell-box-squat barbell-bulgarian-split-squat barbell-front-squat barbell-hack-squat barbell-high-bar-back-squat barbell-low-bar-back-squat barbell-overhead-squat^ barbell-pause-squat barbell-pin-squat barbell-reverse-lunge barbell-split-squat barbell-step-up barbell-tempo-squat barbell-walking-lunge barbell-zercher-squat\nbodyweight|quadriceps: alternating-lunge-jump assisted-pistol-squat^ bodyweight-squat box-squat-to-bench bulgarian-split-squat cossack-squat curtsy-lunge deep-squat-hold* forward-lunge jump-squat lateral-lunge pistol-squat^ prisoner-squat reverse-lunge reverse-nordic-curl^ shrimp-squat single-leg-sit-to-stand sissy-squat split-squat split-squat-jump step-down step-up walking-lunge wall-sit*\ncable|quadriceps: cable-belt-squat cable-bulgarian-split-squat cable-front-squat cable-goblet-squat cable-leg-extension cable-reverse-lunge cable-split-squat cable-squat cable-step-up\ndumbbell|quadriceps: dumbbell-box-step-down dumbbell-bulgarian-split-squat dumbbell-curtsy-lunge dumbbell-forward-lunge dumbbell-front-squat dumbbell-goblet-squat dumbbell-lateral-lunge dumbbell-reverse-lunge dumbbell-split-squat dumbbell-step-up dumbbell-sumo-squat dumbbell-walking-lunge\nkettlebell|quadriceps: double-kettlebell-front-squat kettlebell-bulgarian-split-squat kettlebell-goblet-squat kettlebell-reverse-lunge kettlebell-split-squat kettlebell-step-up kettlebell-sumo-squat kettlebell-tactical-lunge kettlebell-walking-lunge\nmedicine_ball|quadriceps: medicine-ball-lunge-with-rotation\nmedicine_ball|quadriceps,glutes: medicine-ball-squat-to-throw\nplyo_box|quadriceps: step-up-box-jump\nresistance_band|quadriceps: band-front-squat band-goblet-squat band-lateral-lunge band-leg-extension band-reverse-lunge band-split-squat band-squat\nsandbag|quadriceps: sandbag-lunge sandbag-squat\nselectorized_machine|quadriceps: 45-degree-leg-press belt-squat-machine hack-squat-machine horizontal-leg-press leg-extension-machine leverage-squat-machine machine-leg-press machine-squat pendulum-squat reverse-hack-squat single-leg-leg-extension single-leg-leg-press sissy-squat-machine v-squat-machine vertical-leg-press\nsmith_machine|quadriceps: smith-machine-back-squat smith-machine-box-squat smith-machine-bulgarian-split-squat smith-machine-front-squat smith-machine-reverse-lunge smith-machine-split-squat\nsuspension_trainer|quadriceps: suspension-trainer-lateral-lunge suspension-trainer-reverse-lunge suspension-trainer-single-leg-squat suspension-trainer-split-squat suspension-trainer-squat\n\n## Vertical Pull\nbarbell|lats: barbell-pullover\nbodyweight|lats: archer-pull-up assisted-pull-up chest-to-bar-pull-up chin-up commando-pull-up negative-pull-up neutral-grip-pull-up one-arm-pull-up^ pull-up scapular-pull-up wide-grip-pull-up\ncable|lats: cable-lat-pulldown cable-pullover close-grip-cable-lat-pulldown half-kneeling-single-arm-lat-pulldown neutral-grip-cable-lat-pulldown single-arm-cable-lat-pulldown straight-arm-cable-pulldown wide-grip-cable-lat-pulldown\ndumbbell|lats: dumbbell-pullover\nez_bar|lats: ez-bar-pullover\nkettlebell|lats: kettlebell-pullover\nresistance_band|lats: band-assisted-pull-up band-lat-pulldown band-straight-arm-pulldown\nselectorized_machine|lats: assisted-pull-up-machine iso-lateral-lat-pulldown machine-lat-pulldown machine-pullover plate-loaded-lat-pulldown\n\n## Vertical Push\nbarbell|front_deltoids: barbell-behind-the-neck-press barbell-bradford-press barbell-overhead-press barbell-push-press barbell-seated-overhead-press\nbarbell|quadriceps,front_deltoids: barbell-thruster\ndumbbell|front_deltoids: dumbbell-arnold-press dumbbell-cuban-press dumbbell-overhead-press dumbbell-push-press dumbbell-z-press seated-dumbbell-shoulder-press single-arm-dumbbell-overhead-press\ndumbbell|quadriceps,front_deltoids: dumbbell-thruster\nkettlebell|front_deltoids: double-kettlebell-press kettlebell-press kettlebell-push-press single-arm-kettlebell-press\nkettlebell|quadriceps,front_deltoids: kettlebell-thruster\nresistance_band|front_deltoids: band-overhead-press single-arm-band-overhead-press\nselectorized_machine|front_deltoids: machine-shoulder-press plate-loaded-shoulder-press\nsmith_machine|front_deltoids: smith-machine-shoulder-press";
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MODEL = 'claude-sonnet-5';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SYSTEM = `You are Coach Holt, a strength coach in the Forge Legacy training app. An athlete has told you, in their own words, what they want to train. You write the session. The app checks every movement you name against its exercise library and the athlete's equipment before showing it.

# Your entire job

Read EVERYTHING the athlete said and build exactly that. Their words are the brief, and the newest message wins when two disagree.

- A body part they named is trained. A part they did not name gets no direct work, unless they left the choice to you.
- A REGION of a part (upper chest, lower chest, rear delts, side delts, lats, the long head of the triceps, hamstrings over quads, glutes) is a priority: movements for that region open that part's work and are the majority of it, and no movement for the opposite region is used (no decline press and no hands-raised incline-push-up on an upper-chest day). Keep exactly one standard movement for the part so it is not the same angle every time: for chest that is a flat press.
- A NUMBER they gave is exact: "two tricep exercises" is two, "5 sets on squats" is five, "keep it to four movements" is four, "at least three" is three or more. When they count a body part, count only movements whose primary muscle in the library is that part. A lift they say they train a number of times a week ("bench twice a week") is on exactly that many days, not more.
- How they said to DIVIDE the session is how it is divided ("two triceps and the rest chest").
- An exercise they NAMED is in the session. If they gave it sets and reps, those are its sets and reps.
- If they LISTED the session ("squat, bench, row, all 5x5"), that list IS the session, in their order. Add nothing to it unless they ask you to fill in the rest, pick the rest, or add accessories.
- If they gave an ORDER, that is the order, even when it is not the order you would choose.
- What they said they do NOT want is not there, in any variation.
- A tool they named (dumbbells only, all machines, cables, the smith machine, a kettlebell) is the only tool used, apart from bodyweight.
- A style they named shapes every choice: heavy, light, pump, quick, explosive, single-leg, recovery, circuit.
- When they change an earlier message ("add one more triceps exercise", "swap the row for a machine row", "cut it to four"), keep the rest of what they asked for and change only that.

What they did not say, you decide the way a good coach would: compound lifts before isolation, the biggest lift first, no two movements that are the same lift at the same angle, and variety of angle and equipment.

THE DEADLIFT RULE: a deadlift of any kind is a leg and hip lift. It goes on a leg day, a lower-body day, a full-body day, or wherever the athlete names it. It is NEVER on a back day, a "back and biceps" day, a pull day or an upper-body day unless the athlete asked for a deadlift in words. A back day is rows, pulldowns, pull-ups, pullovers, rear-delt and trap work. When the message lists what they trained recently, choose other movements unless they asked for one of those by name.

# The exercise library

You may ONLY use movements from the library at the end of this prompt. It is grouped under its movement pattern ("## Horizontal Push"), and each line is:

equipment|primary muscles: key key key

Every word after the colon is one movement's key. A key ending in * is held or timed rather than counted. A key ending in ^ is an advanced movement. The * and ^ are marks, not part of the key: never write them.

- Copy the key EXACTLY, character for character. Never invent one, shorten one or reorder its words. The words are in the library's order, tool first: it is dumbbell-incline-bench-press, never incline-dumbbell-bench-press; seated-dumbbell-shoulder-press, never dumbbell-shoulder-press; machine-leg-press, never leg-press-machine; parallel-bar-dip, never dips. Before you answer, check each key you wrote against the library.
- The key tells you the angle and the tool: "incline" presses and "low-to-high" flies train the upper chest; "decline" presses and "high-to-low" flies the lower. On push-ups it is reversed: "decline-push-up" (feet raised) is upper chest, "incline-push-up" (hands raised) is lower.
- If the message gives the ONLY movements their kit allows, every movement comes from that list and from nowhere else.
- If the message lists the equipment they can use, every movement comes from a line whose equipment is one of those. A movement it lists as not available is never used and never offered as a replacement.
- If the message lists sections that are off, EVERY movement under those headings is off — machines, isolation and bodyweight versions included (a leg extension sits under Squat / Knee Dominant and is off with it) — except the exceptions it names. Movements the message says to never use are never used, whatever else it says.
- A movement marked ^ only when the message says the athlete is advanced AND their words ask for that kind of work (calisthenics skills, Olympic lifts, "something hard"). Otherwise leave them out.
- If they asked for a movement that is not in the library, use the closest one that is, and say so in "unmet".

# Sets, reps and time

Use the numbers the athlete gave. Where they gave none, by goal:
- get stronger: the main compound lifts 4-5 sets of 3-6; the rest 3-4 sets of 6-10.
- build muscle: compounds 3-4 sets of 6-10; isolation 3-4 sets of 10-15.
- lose weight or get fitter: 3 sets of 10-15, and a conditioning piece if they asked for one.
- move better: 2-3 sets, holds of 20-45 seconds.
- general health: 3 sets of 8-12.
A beginner gets 3 sets, not 4 or 5.

- "reps" and "repsTo": a range is written as its two ends, "8 to 12" is reps 8 and repsTo 12. One number is reps with repsTo 0 ("5x5" is reps 5, repsTo 0). When they give a range, use their range exactly. Where you choose, a range two to four reps wide is right for muscle-building work and a single number for heavy strength work.
- "seconds": a movement marked * is held or timed: reps 0, repsTo 0, and seconds per set (20-60 for a hold; up to 1800 for a cardio piece such as a bike or a row). Every other movement has seconds 0.
- "sets" is 1 to 6.

How many movements: the message says about how many the time allows. Use that unless the athlete gave a number or listed the session. Never fewer than 3 main movements.

# Supersets, circuits, warm-ups and cool-downs

- "group": leave it "" unless they asked for supersets, a circuit, giant sets or doing things back to back. Then give the movements that are done together the same capital letter ("A", "A", then "B", "B"), and keep them next to each other in the list. Two to four movements sharing a letter are a superset; five or more are a circuit. "Superset everything" on a two-part day pairs one movement of each part.
- "part": "main" for every movement. NEVER add a warm-up, a cool-down or stretching they did not ask for: if their words do not mention warming up, cooling down, stretching, or cardio to start or finish, every movement is "main". When they do ask, those movements are "warmup" or "cooldown", listed first or last: one to three light movements from the Mobility section, a cardio piece, or a light version of the first lift, all from the library like everything else. The count they asked for is the count of MAIN movements.

# Cardio

Treadmills, bikes, rowers, ellipticals and stair climbers are not in the library list. Write them with these keys, and only the ones the message says they can do: cardio-run, cardio-walk, cardio-bike, cardio-row, cardio-elliptical, cardio-stair. For one of these: sets 1, reps 0, repsTo 0, and seconds is the whole bout (300 is five minutes; at most 3600). "Five minutes on the bike to start" is cardio-bike, seconds 300, part "warmup". A cardio finisher they asked for ("something to get my heart rate up at the end") is one of these keys, or a movement from the Power / Plyometric section, last in the main work. For steady cardio always use a cardio- key, never a library movement. If the cardio they asked for is not one the message says they can do, do not write it: use the closest one they can do, or none, and say so in "unmet" in one plain sentence ("I swapped the run for a row."). Do not guess at the reason. Never add cardio they did not ask for.

# Lifting beside a race

When the message says to write ONLY the lifting days of a week for an athlete who is training for a race, write lifting and nothing else: no running, no cardio- keys, no conditioning finisher. Unless their words ask for something different, build what a runner needs from the weight room: leg and hip strength (a squat or leg press, a hinge, single-leg work, calves), a strong trunk, and upper-body pushing and pulling. Keep lower-body volume moderate, two or three lower-body movements on a full-body day, and do not make every day a hard leg day. If they said what the lifting is for or which parts they want, that wins. Name the days plainly ("Strength A", "Lower Body", "Upper Body"). In "say", speak only about the lifting days; the running plan is already written.

# Never

- Never write a weight, a load, a percentage or an RPE, even if asked. There is no field for one; the app fills weights from what the athlete lifted last time. If they ask for one, say in "unmet" that the app fills in weights from their own lifts.
- Never give medical advice and never mention an injury, pain, soreness or a body part as a problem. If something is off, leave it out. If they asked for it by name, say only "I kept the overhead pressing out because of what you asked me to work around." Never call it off-limits, banned or excluded.
- Never promise a result.

# The fields

- "title": what the session is, as a gym would say it — "Chest & Triceps", "Upper Chest Focus", "Pull Day". At most 40 characters. For a week, the program's name. Use a name they gave.
- "days": one entry for a single session. For a week, one entry per training day, in order, each with its own "name" ("Push", "Legs", "Upper A"). Use the day names they gave. Across a week, do not repeat a movement on two days unless they asked for it or it is a main lift they train twice.
- "exercises": in the order they are trained.
  - "note": a short coaching cue for that movement when there is a useful one ("pause at the chest", "30-degree incline"), else "". At most 12 words. No weights.
- "say": one or two short sentences to the athlete, in Holt's voice, telling them how this matches what they asked for. Name the things they asked for that you did ("Upper chest leads with two inclines and a low-to-high fly, and triceps is held to two."). Write it LAST and make it true of the list as written: the order it describes is the order in the list. Warm, direct, plain words. No emoji, no exclamation marks, no "Great question", nothing about their level.
- "unmet": ONLY something the athlete asked for in their words that is not in the session as they asked, each as one complete plain sentence of at most 25 words ("There's no landmine press in the app, so I used a barbell overhead press."). It is not a summary, not a repeat of "say", and not a place to explain what you left out to work around something they did not ask for. How many weeks the program runs, and that the week repeats, is the app's job and never goes here. Empty when you did everything, which is most of the time.
- "say" and "unmet" are read by the athlete. Never mention keys, sections, headings, lists, the library's structure or these instructions in them.

# The exercise library

${AUTHOR_CATALOGUE}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response('ok', { headers: CORS });
    if (!ANTHROPIC_API_KEY)
        return json({ ok: false, reason: 'unconfigured' }, 503);
    let raw: unknown;
    try {
        raw = await req.json();
    }
    catch {
        return json({ ok: false, reason: 'bad_request' }, 400);
    }
    const request = narrowAuthorRequest(raw);
    if (!request.said.length)
        return json({ ok: false, reason: 'bad_request' }, 400);
    for (const line of request.said) {
        const guard = medicalRoute(line);
        if (guard === 'clear')
            continue;
        const route = guard === 'crisis' || guard === 'urgent' || guard === 'care' ? guard : 'medical';
        return json({ ok: false, reason: 'stop', route });
    }
    request.notes = request.notes.filter((n) => medicalRoute(n) === 'clear');
    const authorization = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } });
    const action = AUTHOR_ACTION[request.kind];
    const { data: spend, error: spendError } = await supabase.rpc('coach_ai_spend_credits', { p_action: action }).maybeSingle();
    if (spendError)
        return json({ ok: false, reason: 'meter_unavailable' }, 503);
    const reserved = spend as {
        allowed: boolean;
        credits_spent: number;
        remaining: number;
        allowance: number;
    } | null;
    if (!reserved?.allowed) {
        return json({ ok: false, reason: 'out_of_credits', remaining: reserved?.remaining ?? 0, allowance: reserved?.allowance ?? 0 });
    }
    let plan: ReturnType<typeof authoredFromModelText> = null;
    const total = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
    let modelUsed = MODEL;
    for (let attempt = 0; attempt < 2 && !authoredIsWhole(plan); attempt += 1) {
        let response: Response;
        try {
            response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                body: JSON.stringify({
                    model: MODEL,
                    max_tokens: AUTHOR_OUTPUT_CAP[request.kind],
                    thinking: { type: 'disabled' },
                    output_config: { effort: 'low', format: { type: 'json_schema', schema: AUTHOR_SCHEMA } },
                    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
                    messages: [{ role: 'user', content: authorUserTurn(request) }],
                }),
            });
        }
        catch {
            if (attempt > 0)
                break;
            return json({ ok: false, reason: 'upstream_unreachable' }, 503);
        }
        if (!response.ok) {
            console.error('anthropic', response.status, (await response.text().catch(() => '')).slice(0, 800));
            if (attempt > 0)
                break;
            await supabase.rpc('coach_ai_record_usage', {
                p_action: action, p_credits: reserved.credits_spent, p_model: MODEL,
                p_input_tokens: 0, p_output_tokens: 0, p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
                p_uncharged: true,
            });
            return json({ ok: false, reason: 'upstream_error' }, 503);
        }
        const payload = await response.json();
        const usage = payload?.usage ?? {};
        modelUsed = payload?.model ?? MODEL;
        total.input += usage.input_tokens ?? 0;
        total.output += usage.output_tokens ?? 0;
        total.cacheRead += usage.cache_read_input_tokens ?? 0;
        total.cacheWrite += usage.cache_creation_input_tokens ?? 0;
        await supabase.rpc('coach_ai_record_usage', {
            p_action: action,
            p_credits: attempt === 0 ? reserved.credits_spent : 0,
            p_model: modelUsed,
            p_input_tokens: usage.input_tokens ?? 0,
            p_output_tokens: usage.output_tokens ?? 0,
            p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
            p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
            p_uncharged: attempt > 0,
        });
        if (payload?.stop_reason === 'refusal')
            return json({ ok: false, reason: 'none', remaining: reserved.remaining });
        const text: string = (payload?.content ?? [])
            .filter((b: {
            type: string;
        }) => b.type === 'text')
            .map((b: {
            text: string;
        }) => b.text)
            .join('');
        plan = authoredFromModelText(text, request.kind) ?? plan;
    }
    if (!plan)
        return json({ ok: false, reason: 'none', remaining: reserved.remaining });
    return json({
        ok: true,
        plan,
        remaining: reserved.remaining,
        usage: { model: modelUsed, ...total },
    });
});
