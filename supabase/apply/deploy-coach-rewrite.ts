// ===
// DASHBOARD PASTE COPY of supabase/functions/coach-rewrite/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/ modules (the rewriter's wire: schema, prompt, request, reading the
// answer; the exercise library; the medical guard; the meter; the model request), which the Supabase
// dashboard editor cannot reach. This copy inlines each in place of its import line; nothing else differs.
// Regenerate with `node scripts/build-coach-rewrite-deploy.mjs`.
//
// A NEW function: Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name
// it coach-rewrite -> replace the editor contents with this whole file -> Deploy (verify_jwt ON).
// ANTHROPIC_API_KEY is already set (coach-author uses the same secret).
// ! Apply supabase/apply/pending-0281.sql too - it puts coach-rewrite in coach_ai_reserve's function list
// and lets a change ride the chat turn that asked for it (1 credit, not 2). Without it a rewrite still
// works, charged its own 1 credit and ledgered as 'other'.
// ===

import { createClient } from 'jsr:@supabase/supabase-js@2';
export interface WireRow {
    key: string;
    part?: 'warmup' | 'main' | 'cooldown';
    sets?: number;
    reps?: number;
    repsTo?: number;
    seconds?: number;
    miles?: number;
    group?: string;
}
export const REWRITE_OUTPUT_CAP = 16000;
const ROW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['key', 'part', 'sets', 'reps', 'repsTo', 'seconds', 'miles', 'group'],
    properties: {
        key: { type: 'string' },
        part: { type: 'string', enum: ['warmup', 'main', 'cooldown'] },
        sets: { type: 'integer' },
        reps: { type: 'integer' },
        repsTo: { type: 'integer' },
        seconds: { type: 'integer' },
        miles: { type: 'number' },
        group: { type: 'string' },
    },
} as const;
export const REWRITE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['say', 'sessions', 'weeks', 'rest', 'unmet'],
    properties: {
        say: { type: 'string' },
        sessions: {
            type: 'array',
            items: { type: 'object', additionalProperties: false, required: ['name', 'rows'], properties: { name: { type: 'string' }, rows: { type: 'array', items: ROW_SCHEMA } } },
        },
        weeks: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['week', 'days'],
                properties: {
                    week: { type: 'integer' },
                    days: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['day', 'name', 'rows'],
                            properties: { day: { type: 'integer' }, name: { type: 'string' }, rows: { type: 'array', items: ROW_SCHEMA } },
                        },
                    },
                },
            },
        },
        rest: {
            type: 'array',
            items: { type: 'object', additionalProperties: false, required: ['week', 'day'], properties: { week: { type: 'integer' }, day: { type: 'integer' } } },
        },
        unmet: { type: 'array', items: { type: 'string' } },
    },
} as const;
export const rewriteSystem = (catalogue: string): string => `You are Coach Holt, a strength and endurance coach in the Forge Legacy training app. The athlete is partway through a program and has asked you to change it. You are given the weeks still ahead, exactly as they stand, and what the athlete asked. Rewrite those weeks so the program does what they asked. The app checks everything you return before the athlete sees it.

# What you return \u2014 only what changes

- sessions: a session you change, written ONCE by its exact name as given ("Pull", "Upper"). The app applies it to that session in every remaining week from the next one on \u2014 a session already trained THIS week still comes round again next week, so it is yours to change too; and each movement you keep keeps its own week-to-week sets and reps \u2014 so write the whole session as it should look from now on, with sets and reps for anything new.
- weeks: only what differs week by week \u2014 every run's new distance or time (week, day number, name and rows), or a one-off change to one week. Days are numbered from 1 as given.
- Leave out every session you do not change; it stays exactly as it is. A started program never changes its number of sessions: to give the athlete more rest, put that session in "rest" (week and day number) instead.
- For each session you write: its rows. A lifting row is { key: an exact key from the exercise library below, part: warmup, main or cooldown, sets, reps, repsTo (the top of a rep range, else 0), seconds (a timed hold, else 0), miles 0, group }. A run is { key: "cardio-run", miles (or seconds for a timed run), sets 1 }. Another cardio bout is { key: "cardio-bike" (or cardio-row, cardio-walk, cardio-elliptical, cardio-stair), seconds }. Rows that share a group letter ("A", "B") are a superset, done back to back; otherwise group is "".
- say: 2 to 4 short plain sentences in Holt's voice, to the athlete, saying what you changed and why \u2014 name the sessions and the movements ("On Pull and Upper I added face pulls and reverse cable flyes\u2026"). No markdown. Never claim it is done or saved: they confirm it on a card. Name movements the way a person says them ("cable face pulls", "an easy bike ride") \u2014 never a library key or code.
- unmet: anything they asked for that you could not do, in a few words each. Empty when everything landed.

# How you change it

- Change what they asked for, and what it takes to do it well. Keep everything else as it is: the same movements, order and prescription.
- Spread what they asked for sensibly across the week, on the sessions that already train that area ("more rear delts" \u2192 the back, pull, shoulder or upper sessions, at least twice a week \u2014 never a leg day; core can go anywhere). Swap out the least useful movements to make room rather than making sessions long.
- Use only movements their equipment allows (listed below). Never a movement from outside the library.
- Sets, reps and rest follow their goal and the program's existing pattern; carry the program's week-to-week progression and any deload week through.
- Never write a weight or a load of any kind. Weights come from the athlete's own logged lifts.
- On a run day, write only its runs ({ key: "cardio-run", miles or seconds }, in the order given); its warm-up, cool-down and notes stay as they are.
- Running: easing off is always fine. Never make a run more than about 10% longer than the same run in the plan, and leave the final week of a race plan as it is. Swap an easy run for "cardio-bike" when they want less impact.
- Nothing about pain, injury or a medical condition goes into the program. If they described an injury, change nothing and put "injury \u2014 see a doctor or physio" in unmet.

# Exercise library (key per movement, grouped by body part; first word is the equipment)

${catalogue}`;
export interface RewriteAthlete {
    goal: string | null;
    level: string;
    equipment: readonly string[];
    limitations: readonly string[];
}
export function rewriteUserTurn(args: RewriteRequest | {
    said: readonly string[];
    brief: string;
    athlete: RewriteAthlete;
    program: string;
    name: string;
}): string {
    return [
        `Program: ${args.name}`,
        `Athlete: goal ${args.athlete.goal ?? 'not set'}; level ${args.athlete.level}; equipment ${args.athlete.equipment.join(', ') || 'none (bodyweight)'}; work around ${args.athlete.limitations.join(', ') || 'nothing'}.`,
        'What the athlete said:',
        ...args.said.map((l) => `- "${l}"`),
        args.brief ? `Your plan from the conversation: ${args.brief}` : '',
        '',
        'The weeks still ahead:',
        args.program,
    ]
        .filter((l) => l !== '')
        .join('\n');
}
export interface RewriteRequest {
    said: string[];
    brief: string;
    athlete: RewriteAthlete;
    program: string;
    name: string;
}
export const REWRITE_LIMITS = { said: 6, line: 1500, brief: 800, program: 16000, name: 80, list: 40 } as const;
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
const strs = (v: unknown, n: number, max: number): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(-n).map((x) => x.slice(0, max)) : [];
export function narrowRewriteRequest(raw: unknown): RewriteRequest {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const a = (o.athlete && typeof o.athlete === 'object' ? o.athlete : {}) as Record<string, unknown>;
    return {
        said: strs(o.said, REWRITE_LIMITS.said, REWRITE_LIMITS.line),
        brief: str(o.brief, REWRITE_LIMITS.brief),
        athlete: {
            goal: typeof a.goal === 'string' ? a.goal.slice(0, 40) : null,
            level: str(a.level, 20) || 'intermediate',
            equipment: strs(a.equipment, REWRITE_LIMITS.list, 40),
            limitations: strs(a.limitations, 10, 40),
        },
        program: str(o.program, REWRITE_LIMITS.program),
        name: str(o.name, REWRITE_LIMITS.name),
    };
}
const pos = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);
const rowFrom = (r: Record<string, unknown>): WireRow => ({
    key: String(r.key),
    part: r.part === 'warmup' || r.part === 'cooldown' ? r.part : 'main',
    sets: pos(r.sets),
    reps: pos(r.reps),
    repsTo: pos(r.repsTo),
    seconds: pos(r.seconds),
    miles: pos(r.miles),
    group: typeof r.group === 'string' ? r.group : '',
});
const rowsFrom = (rows: unknown): WireRow[] => (Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []).filter((r) => typeof r.key === 'string' && r.key).map(rowFrom);
export interface ParsedRewrite {
    say: string;
    unmet: string[];
    sessions: {
        name: string;
        rows: WireRow[];
    }[];
    weeks: {
        week: number;
        days: {
            day: number;
            name: string;
            rows: WireRow[];
        }[];
    }[];
    rest: {
        week: number;
        day: number;
    }[];
}
export function rewriteFromModelText(text: string): ParsedRewrite | null {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    }
    catch {
        return null;
    }
    const o = raw as {
        say?: unknown;
        sessions?: unknown;
        weeks?: unknown;
        rest?: unknown;
        unmet?: unknown;
    };
    if (!Array.isArray(o.sessions) && !Array.isArray(o.weeks))
        return null;
    const sessions = (Array.isArray(o.sessions) ? (o.sessions as {
        name?: unknown;
        rows?: unknown;
    }[]) : [])
        .filter((x) => typeof x.name === 'string' && x.name)
        .map((x) => ({ name: x.name as string, rows: rowsFrom(x.rows) }));
    const weeks = (Array.isArray(o.weeks) ? (o.weeks as {
        week?: unknown;
        days?: unknown;
    }[]) : [])
        .filter((w) => typeof w.week === 'number' && Array.isArray(w.days))
        .map((w) => ({
        week: w.week as number,
        days: (w.days as {
            day?: unknown;
            name?: unknown;
            rows?: unknown;
        }[])
            .filter((d) => typeof d.day === 'number')
            .map((d) => ({ day: d.day as number, name: typeof d.name === 'string' ? d.name : '', rows: rowsFrom(d.rows) })),
    }));
    const rest = Array.isArray(o.rest)
        ? (o.rest as {
            week?: unknown;
            day?: unknown;
        }[]).filter((r) => typeof r.week === 'number' && typeof r.day === 'number').map((r) => ({ week: r.week as number, day: r.day as number }))
        : [];
    return {
        say: typeof o.say === 'string' ? o.say : '',
        unmet: Array.isArray(o.unmet) ? (o.unmet as unknown[]).filter((u): u is string => typeof u === 'string') : [],
        sessions,
        weeks,
        rest,
    };
}
export const AUTHOR_CATALOGUE_COUNT = 733;
export const AUTHOR_CATALOGUE = "## Calf / Ankle\nbarbell|calves: barbell-calf-raise\nbodyweight|calves: calf-raise calf-wall-stretch* single-leg-calf-raise\nbodyweight|tibialis_anterior: tibialis-raise\ncable|calves: cable-calf-raise\ndumbbell|calves: dumbbell-calf-raise single-leg-dumbbell-calf-raise\ndumbbell|tibialis_anterior: dumbbell-tibialis-raise\nresistance_band|calves: band-calf-raise\nselectorized_machine|calves: donkey-calf-raise-machine seated-calf-raise-machine standing-calf-raise-machine\nselectorized_machine|tibialis_anterior: tibialis-raise-machine\nsmith_machine|calves: smith-machine-calf-raise\n\n## Cardio / Locomotion\nbodyweight|cardiovascular: bear-crawl* crab-walk* wall-walk\ncardio|cardiovascular: arc-trainer boxing-mitt-work double-under heavy-bag-boxing hike jump-rope jump-rope-intervals kickboxing-bag-work ruck shadow-boxing ski-erg ski-erg-intervals\nselectorized_machine|cardiovascular: arm-ergometer jacobs-ladder versaclimber\nsled|cardiovascular: light-sled-sprint sled-bear-crawl-drag\n\n## Carry\nbarbell|forearms,traps: barbell-front-rack-carry* barbell-overhead-carry* trap-bar-farmer-carry*\ncable|forearms,traps: cable-bear-hug-carry*\ndumbbell|forearms,traps: dumbbell-farmer-carry* dumbbell-front-rack-carry* dumbbell-overhead-carry* dumbbell-suitcase-carry* dumbbell-waiter-carry* farmer-carry* suitcase-carry*\nkettlebell|forearms,traps: cross-body-carry* front-rack-carry* kettlebell-bottoms-up-carry* kettlebell-farmer-carry* kettlebell-front-rack-carry* kettlebell-overhead-carry* kettlebell-suitcase-carry* overhead-carry*\nmedicine_ball|forearms,traps: slam-ball-bear-hug-carry*\nsandbag|forearms,traps: sandbag-bear-hug-carry* sandbag-front-carry* sandbag-shoulder-carry*\n\n## Core\nbarbell|obliques: barbell-russian-twist\nbarbell|rectus_abdominis: barbell-rollout\nbodyweight|adductors,obliques: copenhagen-plank*\nbodyweight|obliques: bicycle-crunch cross-body-mountain-climber windshield-wiper\nbodyweight|rectus_abdominis: ab-wheel-rollout bird-dog bird-dog-mobility crunch dead-bug dragon-flag^ forearm-plank* hanging-knee-raise hanging-leg-raise hollow-body-hold* hollow-rock l-sit* mcgill-curl-up modified-side-plank* mountain-climber open-book-rotation plank* plank-shoulder-tap reverse-crunch reverse-plank* rkc-plank* side-plank* sit-up toes-to-bar v-sit v-up\ncable|obliques: cable-chop cable-lift cable-press-around cable-side-bend\ncable|rectus_abdominis: cable-anti-rotation-hold* cable-crunch cable-dead-bug cable-pallof-press cable-reverse-crunch cable-rotation cable-wood-chop half-kneeling-pallof-press high-to-low-cable-wood-chop kneeling-cable-crunch low-to-high-cable-wood-chop tall-kneeling-pallof-press\ndumbbell|obliques: dumbbell-russian-twist dumbbell-side-bend\ndumbbell|rectus_abdominis: dumbbell-dead-bug\nkettlebell|obliques: kettlebell-russian-twist\nmedicine_ball|obliques: medicine-ball-russian-twist\nmedicine_ball|rectus_abdominis: medicine-ball-dead-bug medicine-ball-mountain-climber medicine-ball-v-up-pass\nresistance_band|rectus_abdominis: band-anti-rotation-hold* band-dead-bug band-pallof-press band-wood-chop\nselectorized_machine|obliques: machine-rotary-torso\nselectorized_machine|rectus_abdominis: machine-abdominal-crunch\nsuspension_trainer|rectus_abdominis: suspension-trainer-fallout suspension-trainer-knee-tuck suspension-trainer-mountain-climber suspension-trainer-pike suspension-trainer-side-plank*\n\n## Elbow Extension\nbarbell|triceps: barbell-jm-press barbell-overhead-triceps-extension barbell-skull-crusher\nbodyweight|triceps: triceps-stretch*\ncable|triceps: cable-cross-body-triceps-extension cable-overhead-triceps-extension cable-rope-pushdown cable-skull-crusher cable-triceps-pushdown single-arm-cable-overhead-triceps-extension single-arm-cable-pushdown\ndumbbell|triceps: dumbbell-jm-press dumbbell-skull-crusher dumbbell-tate-press dumbbell-triceps-kickback single-arm-dumbbell-overhead-triceps-extension two-hand-dumbbell-overhead-triceps-extension\nez_bar|triceps: ez-bar-jm-press^ ez-bar-overhead-triceps-extension ez-bar-skull-crusher\nresistance_band|triceps: band-overhead-triceps-extension band-triceps-kickback band-triceps-pushdown\nselectorized_machine|triceps: machine-triceps-dip machine-triceps-extension machine-triceps-press\nsuspension_trainer|triceps: suspension-trainer-triceps-extension\n\n## Elbow Flexion\nbarbell|biceps: barbell-biceps-curl barbell-drag-curl barbell-preacher-curl barbell-reverse-curl\ncable|biceps: bayesian-cable-curl cable-biceps-curl cable-preacher-curl cable-reverse-curl cable-rope-hammer-curl cable-straight-bar-curl high-cable-curl single-arm-cable-curl\ndumbbell|biceps: alternating-dumbbell-curl cross-body-hammer-curl dumbbell-bayesian-curl dumbbell-biceps-curl dumbbell-concentration-curl dumbbell-drag-curl dumbbell-hammer-curl dumbbell-incline-curl dumbbell-preacher-curl dumbbell-reverse-curl dumbbell-spider-curl dumbbell-zottman-curl\nez_bar|biceps: ez-bar-biceps-curl ez-bar-drag-curl ez-bar-preacher-curl ez-bar-spider-curl\nez_bar|forearms: ez-bar-reverse-curl ez-bar-reverse-wrist-curl ez-bar-wrist-curl\nresistance_band|biceps: band-biceps-curl band-hammer-curl band-reverse-curl\nselectorized_machine|biceps: machine-biceps-curl machine-preacher-curl\nsuspension_trainer|biceps: suspension-trainer-biceps-curl\n\n## Hinge / Hip Dominant\nbarbell|glutes: axle-deadlift barbell-block-pull barbell-deadlift barbell-deficit-deadlift barbell-glute-bridge barbell-hip-thrust barbell-pause-deadlift barbell-rack-pull barbell-snatch-grip-deadlift^ barbell-sumo-deadlift barbell-tempo-deadlift\nbarbell|hamstrings: barbell-good-morning barbell-romanian-deadlift barbell-seated-good-morning barbell-stiff-leg-deadlift\nbodyweight|erector_spinae: back-extension superman-hold*\nbodyweight|glutes: glute-bridge glute-bridge-iso-hold* single-leg-glute-bridge\nbodyweight|hamstrings: assisted-nordic-curl^ bodyweight-good-morning nordic-hamstring-curl^ sliding-hamstring-curl\ncable|glutes: cable-hip-thrust cable-pull-through\ncable|hamstrings: cable-assisted-nordic-curl^ cable-romanian-deadlift cable-standing-leg-curl\ndumbbell|glutes: dumbbell-burpee-deadlift dumbbell-glute-bridge dumbbell-hip-thrust dumbbell-sumo-deadlift dumbbell-swing\ndumbbell|hamstrings: dumbbell-romanian-deadlift dumbbell-stiff-leg-deadlift single-leg-dumbbell-romanian-deadlift\nkettlebell|glutes: double-kettlebell-swing kettlebell-deadlift kettlebell-sumo-deadlift kettlebell-swing single-arm-kettlebell-swing\nkettlebell|hamstrings: kettlebell-romanian-deadlift single-leg-kettlebell-romanian-deadlift\nresistance_band|glutes: band-glute-bridge band-hip-thrust\nresistance_band|hamstrings: band-good-morning band-leg-curl band-romanian-deadlift\nselectorized_machine|erector_spinae: machine-back-extension roman-chair-back-extension\nselectorized_machine|glutes: hip-thrust-machine\nselectorized_machine|hamstrings: lying-leg-curl-machine nordic-curl-machine^ seated-leg-curl-machine single-leg-seated-leg-curl standing-leg-curl-machine\nselectorized_machine|hamstrings,glutes: glute-ham-developer-raise\nsmith_machine|glutes: smith-machine-deadlift smith-machine-hip-thrust\nsmith_machine|hamstrings: smith-machine-romanian-deadlift\nsuspension_trainer|glutes: suspension-trainer-glute-bridge\nsuspension_trainer|hamstrings: suspension-trainer-hamstring-curl\n\n## Hip Isolation\nbodyweight|adductors: adductor-rock-back\nbodyweight|glutes: frog-pump\ncable|abductors: cable-hip-abduction\ncable|adductors: cable-hip-adduction\ncable|glutes: cable-donkey-kick cable-glute-kickback\nresistance_band|abductors: band-clamshell band-hip-abduction band-lateral-walk band-monster-walk\nresistance_band|adductors: band-hip-adduction\nresistance_band|glutes: band-glute-kickback\nselectorized_machine|abductors: multi-hip-abduction-machine\nselectorized_machine|adductors: hip-adductor-machine multi-hip-adduction-machine\nselectorized_machine|glutes: glute-drive-machine glute-kickback-machine hip-abductor-machine multi-hip-extension-machine\nselectorized_machine|hip_flexors: multi-hip-flexion-machine\nsuspension_trainer|glutes: suspension-trainer-hip-press\n\n## Horizontal Pull\nbarbell|upper_back: barbell-bent-over-row barbell-meadows-row barbell-pendlay-row barbell-seal-row barbell-yates-row\nbodyweight|upper_back: bodyweight-row feet-elevated-inverted-row inverted-row underhand-inverted-row\ncable|rear_deltoids: cable-face-pull\ncable|upper_back: cable-seated-row close-grip-cable-seated-row high-cable-row low-cable-row single-arm-cable-row wide-grip-cable-seated-row\ndumbbell|lats: dumbbell-pullover-row\ndumbbell|upper_back: dumbbell-bent-over-row dumbbell-chest-supported-row dumbbell-gorilla-row dumbbell-incline-bench-row dumbbell-renegade-row dumbbell-seal-row single-arm-dumbbell-row\nkettlebell|upper_back: kettlebell-gorilla-row kettlebell-row renegade-kettlebell-row single-arm-kettlebell-row\nresistance_band|rear_deltoids: band-face-pull\nresistance_band|upper_back: band-seated-row single-arm-band-row\nselectorized_machine|upper_back: chest-supported-row-machine iso-lateral-row machine-high-row machine-low-row machine-seated-row machine-t-bar-row plate-loaded-seated-row\nsled|upper_back: sled-row\nsmith_machine|upper_back: smith-machine-bent-over-row\nsuspension_trainer|rear_deltoids: suspension-trainer-face-pull\nsuspension_trainer|upper_back: suspension-trainer-high-row suspension-trainer-low-row suspension-trainer-row suspension-trainer-single-arm-row\n\n## Horizontal Push\nbarbell|chest: barbell-bench-press barbell-board-press barbell-close-grip-bench-press barbell-decline-bench-press barbell-floor-press barbell-guillotine-press barbell-incline-bench-press barbell-larsen-press barbell-pin-press barbell-spoto-press\nbodyweight|chest: archer-push-up bench-dip clap-push-up close-grip-push-up decline-push-up deficit-push-up diamond-push-up dive-bomber-push-up explosive-push-up hindu-push-up incline-push-up knee-push-up parallel-bar-dip push-up ring-push-up scapular-push-up straight-bar-dip wide-push-up\ncable|chest: cable-chest-fly cable-chest-press cable-crossover cable-decline-chest-press cable-incline-chest-press high-to-low-cable-fly low-to-high-cable-fly single-arm-cable-chest-press single-arm-cable-fly\ndumbbell|chest: alternating-dumbbell-bench-press dumbbell-bench-press dumbbell-chest-fly dumbbell-decline-bench-press dumbbell-decline-chest-fly dumbbell-floor-press dumbbell-incline-bench-press dumbbell-incline-chest-fly dumbbell-neutral-grip-bench-press dumbbell-squeeze-press single-arm-dumbbell-bench-press single-arm-dumbbell-floor-press single-arm-dumbbell-incline-press\nkettlebell|chest: kettlebell-floor-press single-arm-kettlebell-floor-press\nresistance_band|chest: band-assisted-dip band-chest-fly band-chest-press band-push-up single-arm-band-chest-press\nselectorized_machine|chest: assisted-dip-machine converging-chest-press machine-chest-fly machine-chest-press machine-decline-chest-press machine-incline-chest-press pec-deck-fly plate-loaded-chest-press plate-loaded-incline-chest-press\nsled|chest: sled-chest-press\nsmith_machine|chest: smith-machine-bench-press smith-machine-decline-bench-press smith-machine-incline-bench-press\nsuspension_trainer|chest: suspension-trainer-atomic-push-up suspension-trainer-chest-press suspension-trainer-push-up\n\n## Mobility\nbodyweight|hamstrings: foam-roll-hamstrings* hamstring-stretch* seated-hamstring-stretch*\nbodyweight|mobility: 90-90-hip-stretch* 90-90-hip-switch active-hang* ankle-car ankle-dorsiflexion-mobilization arm-circles breathing-drill-90-90* cartwheel cat-cow child-s-pose* cossack-mobility-drill couch-stretch* crocodile-breathing* cross-body-shoulder-stretch* dead-hang* dead-hang-mobility* doorway-chest-stretch* figure-four-stretch* foam-roll-calves* foam-roll-glutes* foam-roll-lats* foam-roll-quadriceps* foam-roll-upper-back* frog-stretch* half-kneeling-hip-flexor-stretch* hip-car inchworm knee-to-wall-ankle-mobilization lacrosse-ball-glute-release* lacrosse-ball-pec-release* lat-stretch-on-bench* neck-car pigeon-stretch* shoulder-car shoulder-rolls sleeper-stretch* standing-hip-flexor-stretch* standing-quad-stretch* supine-diaphragmatic-breathing* thoracic-extension-on-bench* thoracic-extension-on-foam-roller* thread-the-needle toe-touch wall-angel world-s-greatest-stretch wrist-car\nkettlebell|mobility: kettlebell-windmill\nresistance_band|mobility: band-shoulder-dislocate\n\n## Neck Isolation\nselectorized_machine|neck: machine-neck-lateral-flexion neck-extension-machine neck-flexion-machine\n\n## Other\nbodyweight|full_body: hip-airplane rope-climb sprawl\ncable|full_body: cable-sled-drag\ndumbbell|full_body: dumbbell-turkish-get-up^\nkettlebell|full_body: kettlebell-around-the-world kettlebell-figure-eight kettlebell-halo kettlebell-turkish-get-up^\nplyo_box|full_body: snap-down\nselectorized_machine|full_body: grip-machine\nsled|full_body: backward-sled-drag forward-sled-drag hand-over-hand-rope-pull heavy-sled-push lateral-sled-drag prowler-push sled-push sled-rope-pull\n\n## Power / Plyometric\nbarbell|front_deltoids: barbell-push-jerk barbell-split-jerk\nbarbell|glutes,front_deltoids: axle-clean-and-press barbell-clean-and-jerk^\nbarbell|glutes,traps: barbell-clean barbell-clean-pull barbell-hang-clean barbell-hang-snatch^ barbell-power-clean barbell-power-snatch^ barbell-snatch^ barbell-snatch-pull^\nbattle_rope|forearms: battle-rope-alternating-waves battle-rope-circles battle-rope-double-waves battle-rope-lateral-waves battle-rope-slams\nbodyweight|quadriceps: burpee\nbodyweight|quadriceps,glutes: bounding broad-jump countermovement-jump lateral-bound pogo-jump power-skip single-leg-broad-jump single-leg-hop single-leg-pogo-jump skater-jump standing-long-jump triple-hop tuck-jump\ndumbbell|glutes,traps: dumbbell-clean dumbbell-hang-clean single-arm-dumbbell-snatch^\ndumbbell|quadriceps: dumbbell-man-maker\nkettlebell|front_deltoids: kettlebell-jerk\nkettlebell|glutes,front_deltoids: kettlebell-clean-and-press\nkettlebell|glutes,traps: double-kettlebell-clean kettlebell-clean kettlebell-goblet-clean kettlebell-high-pull kettlebell-snatch^\nmedicine_ball|chest,triceps: medicine-ball-chest-pass\nmedicine_ball|glutes,hamstrings: slam-ball-over-shoulder-throw\nmedicine_ball|obliques: medicine-ball-rotational-throw\nmedicine_ball|obliques,front_deltoids: medicine-ball-shot-put-throw\nmedicine_ball|quadriceps: medicine-ball-burpee\nmedicine_ball|quadriceps,glutes: medicine-ball-wall-ball\nmedicine_ball|rectus_abdominis: medicine-ball-rainbow-slam medicine-ball-scoop-toss medicine-ball-side-slam medicine-ball-sit-up-throw medicine-ball-slam slam-ball-ground-to-shoulder\nmedicine_ball|rectus_abdominis,lats: medicine-ball-overhead-throw\nplyo_box|quadriceps,glutes: box-jump box-jump-over box-step-off-landing burpee-box-jump depth-drop depth-jump^ drop-to-sprint forward-hurdle-hop hurdle-jump lateral-hurdle-hop reactive-box-jump seated-box-jump\nsandbag|glutes,traps: sandbag-clean\nstrongman_implement|glutes,front_deltoids: log-clean-and-press\n\n## Shoulder Isolation\nbarbell|lateral_deltoids,traps: barbell-upright-row\nbarbell|traps: barbell-shrug\nbodyweight|rear_deltoids: scapular-wall-slide\ncable|front_deltoids: single-arm-cable-front-raise\ncable|lateral_deltoids: behind-the-back-cable-lateral-raise cable-lateral-raise\ncable|lateral_deltoids,traps: cable-upright-row\ncable|rear_deltoids: cable-rear-delt-fly cable-y-raise\ncable|rotator_cuff: cable-external-rotation cable-internal-rotation\ncable|traps: cable-shrug\ndumbbell|front_deltoids: dumbbell-front-raise\ndumbbell|lateral_deltoids: dumbbell-lateral-raise leaning-dumbbell-lateral-raise single-arm-dumbbell-lateral-raise\ndumbbell|lateral_deltoids,traps: dumbbell-upright-row\ndumbbell|rear_deltoids: dumbbell-rear-delt-fly incline-dumbbell-rear-delt-fly\ndumbbell|traps: dumbbell-shrug\nez_bar|lateral_deltoids,traps: ez-bar-upright-row\nresistance_band|front_deltoids: band-front-raise\nresistance_band|lateral_deltoids: band-lateral-raise\nresistance_band|lateral_deltoids,traps: band-upright-row\nresistance_band|rear_deltoids: band-pull-apart band-rear-delt-fly\nresistance_band|rotator_cuff: band-shoulder-external-rotation band-shoulder-internal-rotation\nresistance_band|traps: band-shrug\nselectorized_machine|lateral_deltoids: machine-lateral-raise\nselectorized_machine|lateral_deltoids,traps: machine-upright-row\nselectorized_machine|rear_deltoids: machine-rear-delt-fly reverse-pec-deck\nselectorized_machine|traps: machine-shrug\nsuspension_trainer|rear_deltoids: suspension-trainer-t-raise suspension-trainer-y-raise\n\n## Squat / Knee Dominant\nbarbell|quadriceps: barbell-back-squat barbell-box-squat barbell-bulgarian-split-squat barbell-front-squat barbell-hack-squat barbell-high-bar-back-squat barbell-low-bar-back-squat barbell-overhead-squat^ barbell-pause-squat barbell-pin-squat barbell-reverse-lunge barbell-split-squat barbell-step-up barbell-tempo-squat barbell-walking-lunge barbell-zercher-squat\nbodyweight|quadriceps: alternating-lunge-jump assisted-pistol-squat^ bodyweight-squat box-squat-to-bench bulgarian-split-squat cossack-squat curtsy-lunge deep-squat-hold* forward-lunge jump-squat lateral-lunge pistol-squat^ prisoner-squat reverse-lunge reverse-nordic-curl^ shrimp-squat single-leg-sit-to-stand sissy-squat split-squat split-squat-jump step-down step-up walking-lunge wall-sit*\ncable|quadriceps: cable-belt-squat cable-bulgarian-split-squat cable-front-squat cable-goblet-squat cable-leg-extension cable-reverse-lunge cable-split-squat cable-squat cable-step-up\ndumbbell|quadriceps: dumbbell-box-step-down dumbbell-bulgarian-split-squat dumbbell-curtsy-lunge dumbbell-forward-lunge dumbbell-front-squat dumbbell-goblet-squat dumbbell-lateral-lunge dumbbell-reverse-lunge dumbbell-split-squat dumbbell-step-up dumbbell-sumo-squat dumbbell-walking-lunge\nkettlebell|quadriceps: double-kettlebell-front-squat kettlebell-bulgarian-split-squat kettlebell-goblet-squat kettlebell-reverse-lunge kettlebell-split-squat kettlebell-step-up kettlebell-sumo-squat kettlebell-tactical-lunge kettlebell-walking-lunge\nmedicine_ball|quadriceps: medicine-ball-lunge-with-rotation\nmedicine_ball|quadriceps,glutes: medicine-ball-squat-to-throw\nplyo_box|quadriceps: step-up-box-jump\nresistance_band|quadriceps: band-front-squat band-goblet-squat band-lateral-lunge band-leg-extension band-reverse-lunge band-split-squat band-squat\nsandbag|quadriceps: sandbag-lunge sandbag-squat\nselectorized_machine|quadriceps: 45-degree-leg-press belt-squat-machine hack-squat-machine horizontal-leg-press leg-extension-machine leverage-squat-machine machine-leg-press machine-squat pendulum-squat reverse-hack-squat single-leg-leg-extension single-leg-leg-press sissy-squat-machine v-squat-machine vertical-leg-press\nsmith_machine|quadriceps: smith-machine-back-squat smith-machine-box-squat smith-machine-bulgarian-split-squat smith-machine-front-squat smith-machine-reverse-lunge smith-machine-split-squat\nsuspension_trainer|quadriceps: suspension-trainer-lateral-lunge suspension-trainer-reverse-lunge suspension-trainer-single-leg-squat suspension-trainer-split-squat suspension-trainer-squat\n\n## Vertical Pull\nbarbell|lats: barbell-pullover\nbodyweight|lats: archer-pull-up assisted-pull-up chest-to-bar-pull-up chin-up commando-pull-up negative-pull-up neutral-grip-pull-up one-arm-pull-up^ pull-up scapular-pull-up wide-grip-pull-up\ncable|lats: cable-lat-pulldown cable-pullover close-grip-cable-lat-pulldown half-kneeling-single-arm-lat-pulldown neutral-grip-cable-lat-pulldown single-arm-cable-lat-pulldown straight-arm-cable-pulldown wide-grip-cable-lat-pulldown\ndumbbell|lats: dumbbell-pullover\nez_bar|lats: ez-bar-pullover\nkettlebell|lats: kettlebell-pullover\nresistance_band|lats: band-assisted-pull-up band-lat-pulldown band-straight-arm-pulldown\nselectorized_machine|lats: assisted-pull-up-machine iso-lateral-lat-pulldown machine-lat-pulldown machine-pullover plate-loaded-lat-pulldown\n\n## Vertical Push\nbarbell|front_deltoids: barbell-behind-the-neck-press barbell-bradford-press barbell-overhead-press barbell-push-press barbell-seated-overhead-press\nbarbell|quadriceps,front_deltoids: barbell-thruster\nbodyweight|front_deltoids: pike-push-up\ndumbbell|front_deltoids: dumbbell-arnold-press dumbbell-cuban-press dumbbell-overhead-press dumbbell-push-press dumbbell-z-press seated-dumbbell-shoulder-press single-arm-dumbbell-overhead-press\ndumbbell|quadriceps,front_deltoids: dumbbell-thruster\nkettlebell|front_deltoids: double-kettlebell-press kettlebell-press kettlebell-push-press single-arm-kettlebell-press\nkettlebell|quadriceps,front_deltoids: kettlebell-thruster\nresistance_band|front_deltoids: band-overhead-press single-arm-band-overhead-press\nselectorized_machine|front_deltoids: machine-shoulder-press plate-loaded-shoulder-press\nsmith_machine|front_deltoids: smith-machine-shoulder-press";
export const ACUTE = /\b(ruptur\w*|fractur\w*(?!\s+(my|the|our)\s+(schedule|week|plans?|routine|program|calendar))|surger\w*|operation|operated|post[-\s]?op|sprain\w*|dislocat\w*|physio\w*|physical\s+therap\w*|doctor|surgeon|orthopa?ed\w*|mri|x[-\s]?ray|numb(?!er)\w*|tingl\w*|pinched|shooting\s+pain|swell\w*|swollen|herniat\w*|bulging\s+disc|sciatic\w*|concussion|whiplash)\b/i;
export const CONDITION = /\b(tendinitis|tendonitis|tendinopathy|tendinosis|bursitis|fasciitis|epicondyl\w*|tennis\s+elbow|golfer'?s\s+elbow|jumper'?s\s+knee|runner'?s\s+knee|shin\s+splints?|it\s?band\s+syndrome|itbs|piriformis\s+syndrome|carpal\s+tunnel|frozen\s+shoulder|adhesive\s+capsulitis|costochondritis|compartment\s+syndrome|osgood[-\s]schlatter\w*|impinge(ment|d|s)?|labral\s+tear\w*|slap\s+tear\w*|(meniscus|meniscal)\s+tear\w*|rotator\s+cuff\s+(tear\w*|injur\w*|tendin\w*)|patellofemoral|chondromalacia|subluxat\w*|spondyl\w*|stenosis|trigger\s+finger|de\s+quervain\w*|achilles\s+tendin\w*)\b/i;
export const CRISIS = /\b(kill(ing)?\s+myself|kms|suicid\w*|end(ing)?\s+(it\s+all|my\s+life|it)\b(?!\s+(early|there|here|with|on|at))|want(ed)?\s+to\s+die|wanna\s+die|rather\s+(not\s+exist|be\s+dead)|(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|be\s+here\s+anymore)|hurt(ing)?\s+myself|harm(ing)?\s+myself|self[-\s]?harm\w*|cut(ting)?\s+myself|(hit|punch|punish)(ing)?\s+myself|no\s+reason\s+to\s+live|(till|until)\s+(they|it|i)\s+bleed|make\s+myself\s+bleed)\b/i;
export const URGENT = /\b(chest\s+(pain|pressure|tightness|is\s+tight|feels\s+tight|hurts)|pain\s+in\s+my\s+chest|(passed|pass(ing)?|blacked|black(ing)?)\s+out|faint(ed|ing)?\b|can'?t\s+(catch\s+my\s+)?breathe?|trouble\s+breathing|struggling\s+to\s+breathe|asthma\s+attack|heart\s+(is\s+|keeps\s+|won'?t\s+stop\s+)?(racing|pounding|skipping|fluttering)|(dark|brown|cola|tea)[-\s]colou?red\s+(pee|urine)|(pee|urine)\s+(is\s+|was\s+|looks\s+)?(dark|brown|cola|tea)\b|rhabdo\w*|worst\s+headache|severe\s+headache|thunderclap|face\s+(is\s+)?droop\w*|slurr\w*|seizure|can'?t\s+feel\s+my\s+(legs|arms|feet)|(low|crashing)\s+blood\s+sugar|blood\s+(sugar|glucose)\s+(is\s+|was\s+|keeps\s+|feels\s+|went\s+|just\s+)*(low|crash\w*|dropp\w*|tank\w*|plummet\w*)|hypoglyc\w*|dolor\s+de\s+pecho|duele\s+el\s+pecho|(lost|losing|lose|can'?t\s+control)\s+(my\s+)?(bladder|bowel)|throat\s+(is\s+)?(swelling|swollen|closing)|short(ness)?\s+of\s+breath|swollen\s+and\s+(hot|red)|(hot|red)\s+and\s+swollen)\b/i;
const AMBIGUOUS_DAMAGE = /\b(broke|broken|tear|tears|tearing|tore|torn|strained|strain|strains|snapped|popped|blew\s+out|went\s+pop)\b/i;
const BODY_PART = /\b(shoulder|shoulders|rotator\s+cuff|labrum|knee|knees|acl|mcl|meniscus|back|spine|disc|neck|hip|hips|ankle|ankles|wrist|wrists|elbow|elbows|arm|arms|leg|legs|foot|feet|hand|hands|rib|ribs|collarbone|clavicle|hamstring|hamstrings|quad|quads|calf|calves|groin|achilles|bicep|biceps|tricep|triceps|pec|pecs|chest|glute|glutes|femur|tibia|fibula|humerus|tendon|ligament|muscle|hammy|hammies|lat|lats|oblique|obliques|adductor|adductors|shin|shins|trap|traps)\b/i;
const WORDS = String.raw `(?:[\w'-]+\s+){0,4}`;
const DAMAGE_NEAR_BODY = new RegExp(String.raw `\b(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b` +
    `|` +
    String.raw `\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\b`, 'i');
export const SEEKING_ADVICE = /\b(what('?s| is)\s+wrong|why\s+does\s+(it|my)|should\s+i\s+(see\s+(a|someone|somebody|the|my)|go\s+to\s+(a|the)\s+(doctor|er|hospital|clinic)|worry|rest\s+(it|my|this|that)\b|stop\s+(training|lifting|running)\s+(on|with|because)|ice|stretch\s+(it|my|this|that)\b)|is\s+(it|this|that)\s+(ok|okay|serious|bad|normal|fine)(?!\s+(to|if|for)\b)|do\s+i\s+need\s+(a\s+(brace|scan|doctor|cast|splint|x[-\s]?ray|mri)|to\s+(see|get\s+it\s+(checked|looked\s+at)))|how\s+do\s+i\s+(fix|heal|treat|rehab)\s+(it|this|that|my)\b|diagnos\w*|what\s+(should|do)\s+i\s+do\s+about|will\s+it\s+heal)\b/i;
export const DISORDERED_EATING = /\b(purg(e|es|ed|ing)|(throw(ing|n)?|threw)\s+up\s+after\s+(i\s+eat|eating|meals?|food)|make\s+myself\s+(throw\s+up|sick|puke)|starv(e|ing)\s+myself|laxatives?\s+(to|for)\s+(lose|drop|cut)|(eat|eating)\s+(only\s+)?([1-7]\d{2}|[1-9]\d)\s+cal\w*\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)))|stop(ped)?\s+eating\s+(to|so)\b|(vomit\w*|puk(e|es|ed|ing)|barf\w*|(throw(s|ing|n)?|threw)\s+up)\s+(\w+\s+){0,3}(after|when)\s+(i\s+)?(eat\w*|ate|meals?|food|dinner|lunch|breakfast|snacks?|bing\w*)|(vomit\w*|puk(e|es|ed|ing)|sick|(throw(s|ing|n)?|threw)\s+up)\s+(\w+\s+){0,4}on\s+purpose|self[-\s]induced\s+vomit\w*|(made|making|makes)\s+my\s?self\s+(throw\s+up|puke|vomit\w*|barf\w*)|(made|making|makes)\s+my\s?self\s+sick\s+(\w+\s+){0,3}(after|when)\s+(i\s+)?(eat\w*|ate|meals?|food|dinner|lunch|breakfast|snacks?|bing\w*)|\b(ate|eat|eating|binged?|binging)\b[^.!?]{0,60}?\b(then|and)\s+(made|make|making)\s+my\s?self\s+sick|(threw|throw(s|ing|n)?)\s+(it|that|them|everything|it\s+all|all\s+of\s+it)\s+(back\s+)?up\s+(\w+\s+){0,4}on\s+purpose)/i;
const FEW_DAYS = String.raw `(\d+([-/]\d+)?|two|three|four|five|six|seven|(a\s+)?few|(a\s+)?couple(\s+of)?|several)\s+days`;
const EVERY_FEW_DAYS = String.raw `(other\s+day|${FEW_DAYS})`;
export const SPARSE_EATING = new RegExp(String.raw `\b(` +
    [
        String.raw `chew(s|ed|ing)?[-\s]*(and|n'?|&|\+|then)[-\s]*(then\s+)?spit\w*`,
        String.raw `chew(s|ed|ing)?\s+(my\s+|the\s+|your\s+|up\s+)?(food|it|meals?|snacks?|dinner|lunch|breakfast|treats?|candy|sweets|chips|pizza|cake|cookies)\s+(and|then|&)\s+(then\s+)?spit\w*`,
        String.raw `spit(s|ting)?\s+(my\s+|the\s+)?(food|it|everything|them)\s+out\s+(\w+\s+){0,5}(calories|cals?|swallow\w*|weight)`,
        String.raw `(one|1|a\s+single|only\s+one)\s+meal\s+(every|each|per|in)\s+${EVERY_FEW_DAYS}`,
        String.raw `eat(s|ing)?\s+(only\s+)?(once|one\s+time|1x)\s+(every|each|per|in)\s+${EVERY_FEW_DAYS}`,
        String.raw `eat(s|ing)?\s+(only\s+)?every\s+${EVERY_FEW_DAYS}`,
        String.raw `skip(s|ping|ped)?\s+(whole\s+|entire\s+|full\s+)?days\s+(of\s+)?(eating|food|meals)`,
        String.raw `go(es|ing)?\s+${FEW_DAYS}\s+(without|between)\s+(eating|food|meals?)`,
    ].join('|') +
    String.raw `)\b`, 'i');
export const EATING_DISORDER_NAMED = /\b(anorexi\w*|anorectic|bulimi\w*|eating\s+disorder\w*|binge[-\s]eating|arfid|orthorexi\w*|ednos)\b/i;
const RECOVERY = /\b(recover(y|ing|ed)|in\s+treatment|my\s+(therapist|treatment\s+team))\b/i;
export const DIET_DRUG = /\b(appetite\s+(suppress\w*|blocker\w*|killer\w*)|fat[-\s]?burners?|diet\s+(pills?|drugs?|tea)|slimming\s+(pills?|tea|drops)|weight[-\s]?loss\s+(pills?|drugs?|meds?|medications?|injections?|shots?|tea|supplements?)|phentermine|adipex|qsymia|contrave|orlistat|xenical|clenbuterol|clen|dnp|ephedrine|ephedra|garcinia|hydroxycut|lipozene|sibutramine)\b/i;
export const MEDICAL_CONTEXT = /\b(pregnan\w*|postpartum|post-partum|breastfeed\w*|breast-feed\w*|c-?section|miscarriage|epilep\w*|diabet\w*|insulin|heart\s+(condition|disease|murmur|attack|problem|issue)s?|arrhythmia|a-?fib|pacemaker|blood\s+pressure|hypertension|asthma|copd|cancer|chemo\w*|osteopor\w*|arthritis|ssris?|antidepressant\w*|medications?|prescription|cortisone|steroid\s+shot|kidney\s+(disease|stones?|failure|function|problems?|issues?|condition|transplant|damage|infection)|ckd|liver\s+(disease|condition)|hernia|cleared\s+(me|by)|got\s+clearance|ibuprofen|advil|motrin|nurofen|aleve|naproxen|tylenol|acetaminophen|paracetamol|panadol|aspirin|nsaids?|pain\s?killers?|pain\s+(meds?|relievers?|pills?)|muscle\s+relaxants?|antihistamines?|benadryl|antibiotics?|anti[-\s]?inflammatories|anti[-\s]?inflammatory\s+(meds?|medications?|pills?|drugs?)|lactating|lactation|breast\s*milk|milk\s+supply|pumping\s+(breast\s*)?milk|(i'?m|i\s+am|im|currently|still|been|while|when|and)\s+(\w+\s+)?nursing\b(?!\s+(a|an|my|the|this|that|his|her|student|school|home|degree|shift|job|injur\w*|hangover))|nursing\s+((a|my|the|our)\s+)?(mom|mother|mum|baby|son|daughter|newborn|infant|twins))\b/i;
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
export const DOSE = /(\b\d+(\.\d+)?\s*(mg|mcg|milligrams?|grams?|g|iu|scoops?)\b[^.?!]{0,30}\b(caffeine|creatine|pre-?workout|supplements?|beta-?alanine|melatonin|vitamin|ashwagandha|stims?)\b|\bhow\s+(much|many\s+(mg|milligrams|scoops))\s+(of\s+)?(caffeine|creatine|pre-?workout|melatonin|beta-?alanine|ashwagandha|vitamin\s*d?)\b|\b(caffeine|creatine|pre-?workout|melatonin)\s+(dose|dosage|dosing)\b|\b\d+\s*(pills?|tablets?|capsules?|caplets?|softgels?)\b)/i;
const SYMPTOM_QUESTION = new RegExp(SYMPTOM_QUESTION_SOURCE(), 'i');
export const mentionsDiscomfort = (text: string): boolean => /\b(hurt\w*|pain\w*|ach(e|es|ing|y)|sore\w*|injur\w*|tweak(ed|ing)?|strain\w*|niggl\w*|uncomfortable|discomfort|stiff\w*|flare[-\s]?up|twinge)\b/i.test(text ?? '');
export type MedicalRoute = 'clear' | 'crisis' | 'urgent' | 'care' | 'acute' | 'advice';
export function medicalRoute(text: string): MedicalRoute {
    const t = (text ?? '')
        .replace(/[\u2018\u2019\u02bc]/g, "'")
        .replace(/\b(?:band|pvc|stick|dowel|broom(?:stick)?)[-\s]+(?:shoulder[-\s]+)?dislocates?\b/gi, 'shoulder pass-throughs')
        .trim();
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
    if (DISORDERED_EATING.test(t) || SPARSE_EATING.test(t) || RESTRICTION.test(t) || isCrashCut(t) || DIET_DRUG.test(t))
        return 'care';
    if (EATING_DISORDER_NAMED.test(t))
        return RECOVERY.test(t) ? 'advice' : 'care';
    if (MINOR_AGE.test(t) && MINOR_TOPIC.test(t))
        return 'care';
    if (DOSE.test(t))
        return 'care';
    if (ACUTE.test(t) || CONDITION.test(t))
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
export type SettleOutcome = 'ok' | 'upstream_error' | 'upstream_unreachable' | 'timeout' | 'refusal' | 'truncated' | 'not_a_program' | 'unreadable' | 'bad_output' | 'cancelled' | 'guarded';
export const UPSTREAM_ABORT_MS: Readonly<Record<string, number>> = {
    'meal-photo-read': 75000,
    'recipe-photo-read': 75000,
    'program-photo-read': 75000,
    'workout-card-read': 75000,
    'coach-form-check': 75000,
    'coach-kitchen': 45000,
    'coach-interpret': 45000,
    'workout-tidy': 45000,
    'coach-author': 25000,
};
export interface ModelUsage {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
}
export interface ModelPayload {
    content?: {
        type: string;
        text: string;
    }[];
    stop_reason?: string;
    model?: string;
    usage?: ModelUsage;
}
export type ModelCall = {
    kind: 'ok';
    payload: ModelPayload;
    latencyMs: number;
} | {
    kind: 'upstream_error';
    status: number;
    latencyMs: number;
} | {
    kind: 'upstream_unreachable';
    latencyMs: number;
} | {
    kind: 'timeout';
    latencyMs: number;
};
export type MeterReserve = {
    ok: true;
    id: string;
    credits: number;
    remaining: number;
    allowance: number;
    ageYears: number | null;
    minor: boolean;
} | {
    ok: false;
    reason: 'not_entitled' | 'no_consent' | 'out_of_credits' | 'meter_unavailable';
    remaining: number;
    allowance: number;
};
export interface Settled {
    settled: boolean;
    refunded: boolean;
    remaining: number | null;
}
export interface CallFacts {
    model: string;
    usage?: ModelUsage | null;
    latencyMs?: number | null;
}
const meterInt = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
export function reserveFrom(data: unknown, error: unknown): MeterReserve {
    if (error || !data || typeof data !== 'object')
        return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
    const d = data as Record<string, unknown>;
    if (d.allowed === true) {
        if (typeof d.reservation_id !== 'string' || !d.reservation_id)
            return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
        return {
            ok: true,
            id: d.reservation_id,
            credits: meterInt(d.credits_spent),
            remaining: meterInt(d.remaining),
            allowance: meterInt(d.allowance),
            ageYears: typeof d.age_years === 'number' && Number.isFinite(d.age_years) ? d.age_years : null,
            minor: d.minor === true,
        };
    }
    const reason = d.reason === 'not_entitled' || d.reason === 'no_consent' ? d.reason : 'out_of_credits';
    return { ok: false, reason, remaining: meterInt(d.remaining), allowance: meterInt(d.allowance) };
}
export async function timedModelCall(send: (signal: AbortSignal) => Promise<Response>, abortMs: number): Promise<ModelCall> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, Math.max(0, abortMs));
    const started = Date.now();
    const took = () => Date.now() - started;
    try {
        const response = await send(controller.signal);
        if (!response.ok) {
            const said = await response.text().catch(() => '');
            console.error('anthropic', response.status, said.slice(0, 800));
            return { kind: 'upstream_error', status: response.status, latencyMs: took() };
        }
        try {
            return { kind: 'ok', payload: (await response.json()) as ModelPayload, latencyMs: took() };
        }
        catch {
            return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_error', status: response.status, latencyMs: took() };
        }
    }
    catch {
        return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_unreachable', latencyMs: took() };
    }
    finally {
        clearTimeout(timer);
    }
}
export function failedCallReply(kind: 'upstream_error' | 'upstream_unreachable' | 'timeout'): {
    reason: 'upstream_error' | 'upstream_unreachable';
    upstream?: 'timeout';
} {
    if (kind === 'timeout')
        return { reason: 'upstream_error', upstream: 'timeout' };
    return { reason: kind };
}
export function callFacts(call: ModelCall, fallbackModel: string): CallFacts {
    if (call.kind !== 'ok')
        return { model: fallbackModel, usage: null, latencyMs: call.latencyMs };
    return {
        model: typeof call.payload.model === 'string' && call.payload.model ? call.payload.model : fallbackModel,
        usage: call.payload.usage ?? null,
        latencyMs: call.latencyMs,
    };
}
export function settleArgs(reservation: string, outcome: SettleOutcome, facts: CallFacts): Record<string, unknown> {
    const u = facts.usage ?? {};
    return {
        p_reservation: reservation,
        p_outcome: outcome,
        p_model: facts.model,
        p_input_tokens: meterInt(u.input_tokens),
        p_output_tokens: meterInt(u.output_tokens),
        p_cache_read_input_tokens: meterInt(u.cache_read_input_tokens),
        p_cache_creation_input_tokens: meterInt(u.cache_creation_input_tokens),
        p_latency_ms: facts.latencyMs == null ? null : meterInt(facts.latencyMs),
        p_refund: outcome !== 'ok',
    };
}
export function settledFrom(data: unknown, error: unknown): Settled {
    if (error || !data || typeof data !== 'object')
        return { settled: false, refunded: false, remaining: null };
    const d = data as Record<string, unknown>;
    return {
        settled: d.settled === true,
        refunded: d.settled === true && d.refunded === true,
        remaining: typeof d.remaining === 'number' && Number.isFinite(d.remaining) ? d.remaining : null,
    };
}
export function settledTail(s: Settled, reservedRemaining: number): {
    remaining: number;
    refunded?: true;
} {
    const remaining = s.remaining ?? reservedRemaining;
    return s.refunded ? { remaining, refunded: true } : { remaining };
}
export function ageLine(ageYears: number | null, minor: boolean): string | null {
    if (minor) {
        const age = ageYears != null && ageYears <= 18 ? `${ageYears}, under 18` : 'under 18';
        return `Athlete's age, from their profile: ${age}. Keep every suggestion conservative and right for supervised training: no maximal-effort sets or max attempts, and nothing about losing weight.`;
    }
    return ageYears == null ? null : `Athlete's age, from their profile: ${ageYears}.`;
}
export function withAgeLine(turn: string, ageYears: number | null, minor: boolean): string {
    const line = ageLine(ageYears, minor);
    return line ? `${turn}\n\n${line}` : turn;
}
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
export const KNOWN_MODELS = ['claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-opus-5'] as const;
export const RETIRED_MODELS = ['claude-haiku-4-5'] as const;
export type KnownModel = (typeof KNOWN_MODELS)[number] | (typeof RETIRED_MODELS)[number];
export interface ModelRule {
    off: {
        type: 'disabled';
    } | {
        type: 'between_tools';
    } | null;
    offMaxEffort: Effort | null;
    effort: boolean;
    adaptive: boolean;
    fallbacks: boolean;
    webSearch: boolean;
}
export const MODEL_RULES: Readonly<Record<KnownModel | 'unknown', ModelRule>> = {
    'claude-sonnet-5': { off: { type: 'disabled' }, offMaxEffort: 'max', effort: true, adaptive: true, fallbacks: false, webSearch: true },
    'claude-sonnet-5-5': { off: { type: 'between_tools' }, offMaxEffort: 'high', effort: true, adaptive: true, fallbacks: true, webSearch: true },
    'claude-haiku-5-5': { off: { type: 'disabled' }, offMaxEffort: 'high', effort: true, adaptive: true, fallbacks: false, webSearch: false },
    'claude-opus-5-5': { off: null, offMaxEffort: null, effort: true, adaptive: true, fallbacks: true, webSearch: true },
    'claude-opus-5': { off: { type: 'disabled' }, offMaxEffort: 'high', effort: true, adaptive: true, fallbacks: true, webSearch: true },
    'claude-haiku-4-5': { off: null, offMaxEffort: null, effort: false, adaptive: false, fallbacks: false, webSearch: false },
    unknown: { off: null, offMaxEffort: null, effort: false, adaptive: false, fallbacks: false, webSearch: false },
};
export function modelFamily(model: unknown): KnownModel | 'unknown' {
    const m = typeof model === 'string' ? model : '';
    let best: KnownModel | null = null;
    for (const k of [...KNOWN_MODELS, ...RETIRED_MODELS]) {
        if (m === k)
            return k;
        if (m.startsWith(`${k}-`) && (best == null || k.length > best.length))
            best = k;
    }
    return best ?? 'unknown';
}
export const isKnownModel = (model: unknown): boolean => typeof model === 'string' && (KNOWN_MODELS as readonly string[]).includes(model);
export const isEffort = (e: unknown): e is Effort => typeof e === 'string' && (EFFORTS as readonly string[]).includes(e);
export interface RequestKnobs {
    thinkingOff?: boolean;
    adaptive?: boolean;
    effort?: Effort | null;
    format?: unknown;
    fallback?: boolean;
}
export interface RequestFields {
    thinking?: {
        type: 'disabled' | 'between_tools' | 'adaptive';
    };
    output_config?: {
        effort?: Effort;
        format?: unknown;
    };
    fallbacks?: 'default';
}
const effortRank = (e: Effort) => EFFORTS.indexOf(e);
export function requestFields(model: unknown, knobs: RequestKnobs = {}): RequestFields {
    const rule = MODEL_RULES[modelFamily(model)];
    const effort = rule.effort && isEffort(knobs.effort) ? knobs.effort : null;
    const out: RequestFields = {};
    if (knobs.thinkingOff) {
        const offOk = rule.off != null && (effort == null || rule.offMaxEffort == null || effortRank(effort) <= effortRank(rule.offMaxEffort));
        if (offOk && rule.off)
            out.thinking = { ...rule.off };
    }
    else if (knobs.adaptive && rule.adaptive) {
        out.thinking = { type: 'adaptive' };
    }
    const oc: {
        effort?: Effort;
        format?: unknown;
    } = {};
    if (effort)
        oc.effort = effort;
    if (knobs.format !== undefined && knobs.format !== null)
        oc.format = knobs.format;
    if (Object.keys(oc).length)
        out.output_config = oc;
    if (knobs.fallback !== false && rule.fallbacks)
        out.fallbacks = 'default';
    return out;
}
export const takesWebSearch = (model: unknown): boolean => MODEL_RULES[modelFamily(model)].webSearch;
export function requestBetas(fields: RequestFields): string[] {
    return fields.fallbacks ? [FALLBACK_BETA] : [];
}
export function anthropicHeaders(apiKey: string, fields: RequestFields): Record<string, string> {
    const h: Record<string, string> = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
    const betas = requestBetas(fields);
    if (betas.length)
        h['anthropic-beta'] = betas.join(',');
    return h;
}
export function answeredBy(payload: unknown, requested: string): string {
    const m = (payload as {
        model?: unknown;
    } | null | undefined)?.model;
    return typeof m === 'string' && m ? m : requested;
}
export function fellBack(payload: unknown): boolean {
    const it = (payload as {
        usage?: {
            iterations?: unknown;
        };
    } | null | undefined)?.usage?.iterations;
    return Array.isArray(it) && it.some((e) => (e as {
        type?: unknown;
    } | null)?.type === 'fallback_message');
}
export interface ModelChoice {
    model: string;
    effort: string | null;
    canary: boolean;
    source: 'config' | 'default' | 'default_no_row' | 'default_read_failed' | 'default_invalid';
}
export interface ModelDefault {
    model: string;
    effort: string | null;
}
export interface ModelConfigDeps {
    url: string | undefined;
    serviceKey: string | undefined;
    fetch: (input: string, init: Record<string, unknown>) => Promise<{
        ok: boolean;
        json: () => Promise<unknown>;
    }>;
    now?: () => number;
    ttlMs?: number;
    timeoutMs?: number;
    known: readonly string[];
    efforts: readonly string[];
}
export const MODEL_CONFIG_TTL_MS = 60000;
export const MODEL_CONFIG_FAIL_TTL_MS = 10000;
export const MODEL_CONFIG_TIMEOUT_MS = 1500;
const MODEL_CONFIG_CACHE_MAX = 500;
export function uidFromAuthorization(authorization: string | null | undefined): string | null {
    try {
        const jwt = String(authorization ?? '').replace(/^Bearer\s+/i, '');
        const part = jwt.split('.')[1];
        if (!part)
            return null;
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
        const sub = json?.sub;
        return typeof sub === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub) ? sub : null;
    }
    catch {
        return null;
    }
}
export function choiceFromRow(row: unknown, dflt: ModelDefault, deps: Pick<ModelConfigDeps, 'known' | 'efforts'>): ModelChoice {
    const r = (Array.isArray(row) ? row[0] : row) as {
        model?: unknown;
        effort?: unknown;
        canary?: unknown;
    } | null | undefined;
    if (!r || typeof r !== 'object' || r.model == null)
        return { ...dflt, canary: false, source: 'default_no_row' };
    if (typeof r.model !== 'string' || !deps.known.includes(r.model))
        return { ...dflt, canary: false, source: 'default_invalid' };
    if (r.effort != null && (typeof r.effort !== 'string' || !deps.efforts.includes(r.effort)))
        return { ...dflt, canary: false, source: 'default_invalid' };
    return { model: r.model, effort: (r.effort as string | null) ?? null, canary: r.canary === true, source: 'config' };
}
export function modelConfigReader(deps: ModelConfigDeps) {
    const now = deps.now ?? (() => Date.now());
    const ttl = deps.ttlMs ?? MODEL_CONFIG_TTL_MS;
    const cache = new Map<string, {
        at: number;
        ttl: number;
        choice: ModelChoice;
    }>();
    async function read(fn: string, uid: string | null, dflt: ModelDefault): Promise<{
        choice: ModelChoice;
        ttl: number;
    }> {
        if (!deps.url || !deps.serviceKey)
            return { choice: { ...dflt, canary: false, source: 'default' }, ttl };
        let timer: ReturnType<typeof setTimeout> | null = null;
        try {
            const ctl = new AbortController();
            timer = setTimeout(() => ctl.abort(), deps.timeoutMs ?? MODEL_CONFIG_TIMEOUT_MS);
            const res = await deps.fetch(`${deps.url}/rest/v1/rpc/coach_ai_model_pick`, {
                method: 'POST',
                signal: ctl.signal,
                headers: { apikey: deps.serviceKey, Authorization: `Bearer ${deps.serviceKey}`, 'content-type': 'application/json' },
                body: JSON.stringify({ p_fn: fn, p_uid: uid }),
            });
            if (!res.ok)
                return { choice: { ...dflt, canary: false, source: 'default_read_failed' }, ttl: MODEL_CONFIG_FAIL_TTL_MS };
            return { choice: choiceFromRow(await res.json(), dflt, deps), ttl };
        }
        catch {
            return { choice: { ...dflt, canary: false, source: 'default_read_failed' }, ttl: MODEL_CONFIG_FAIL_TTL_MS };
        }
        finally {
            if (timer != null)
                clearTimeout(timer);
        }
    }
    return {
        async pick(fn: string, uid: string | null, dflt: ModelDefault): Promise<ModelChoice> {
            const key = `${fn}|${uid ?? ''}`;
            const hit = cache.get(key);
            if (hit && now() - hit.at < hit.ttl)
                return hit.choice;
            const { choice, ttl: keep } = await read(fn, uid, dflt);
            if (cache.size >= MODEL_CONFIG_CACHE_MAX)
                cache.delete(cache.keys().next().value as string);
            cache.set(key, { at: now(), ttl: keep, choice });
            return choice;
        },
        size: () => cache.size,
    };
}
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const FN = 'coach-rewrite';
const UPSTREAM_MS = 75000;
const REWRITE_SYSTEM = rewriteSystem(AUTHOR_CATALOGUE);
const MODEL = 'claude-sonnet-5';
const EFFORT = 'low';
const modelConfig = modelConfigReader({
    url: SUPABASE_URL,
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    fetch: (u, init) => fetch(u, init),
    known: KNOWN_MODELS,
    efforts: EFFORTS,
});
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
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
    const request = narrowRewriteRequest(raw);
    if (!request.said.length || !request.program)
        return json({ ok: false, reason: 'bad_request' }, 400);
    for (const line of [...request.said, request.brief]) {
        const guard = medicalRoute(line);
        if (guard === 'clear')
            continue;
        const route = guard === 'crisis' || guard === 'urgent' || guard === 'care' ? guard : 'medical';
        return json({ ok: false, reason: 'stop', route });
    }
    const authorization = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } });
    const { data: reservedRow, error: reserveError } = await supabase.rpc('coach_ai_reserve', { p_action: 'program', p_fn: FN }).maybeSingle();
    const meter = reserveFrom(reservedRow, reserveError);
    if (!meter.ok) {
        if (meter.reason === 'meter_unavailable')
            return json({ ok: false, reason: 'meter_unavailable' }, 503);
        if (meter.reason === 'no_consent')
            return json({ ok: false, reason: 'no_consent' }, 403);
        return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
    }
    const choice = await modelConfig.pick(FN, uidFromAuthorization(authorization), { model: MODEL, effort: EFFORT });
    const model = choice.model;
    const modelFields = requestFields(model, { thinkingOff: true, effort: choice.effort ?? EFFORT, format: { type: 'json_schema', schema: REWRITE_SCHEMA } });
    const turn = withAgeLine(rewriteUserTurn(request), meter.ageYears, meter.minor);
    const call = await timedModelCall((signal) => fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: anthropicHeaders(ANTHROPIC_API_KEY!, modelFields),
        body: JSON.stringify({
            model,
            max_tokens: REWRITE_OUTPUT_CAP,
            ...modelFields,
            system: [{ type: 'text', text: REWRITE_SYSTEM, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: turn }],
        }),
    }), UPSTREAM_MS);
    let modelUsed = model;
    const total = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
    const settle = async (outcome: SettleOutcome) => {
        const usage = { input_tokens: total.input, output_tokens: total.output, cache_read_input_tokens: total.cacheRead, cache_creation_input_tokens: total.cacheWrite };
        const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, { model: modelUsed, usage, latencyMs: call.latencyMs })).maybeSingle();
        return settledTail(settledFrom(data, error), meter.remaining);
    };
    if (call.kind !== 'ok')
        return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind)) }, 503);
    const payload = call.payload;
    const usage = payload?.usage ?? {};
    modelUsed = answeredBy(payload, model);
    total.input += usage.input_tokens ?? 0;
    total.output += usage.output_tokens ?? 0;
    total.cacheRead += usage.cache_read_input_tokens ?? 0;
    total.cacheWrite += usage.cache_creation_input_tokens ?? 0;
    if (payload?.stop_reason === 'refusal')
        return json({ ok: false, reason: 'none', ...(await settle('refusal')) });
    const text: string = (payload?.content ?? []).filter((b: {
        type: string;
    }) => b.type === 'text').map((b: {
        text: string;
    }) => b.text).join('');
    if (!rewriteFromModelText(text)) {
        return json({ ok: false, reason: 'none', ...(await settle(payload?.stop_reason === 'max_tokens' ? 'truncated' : 'bad_output')) });
    }
    return json({ ok: true, text, ...(await settle('ok')), usage: { model: modelUsed, ...total } });
});
