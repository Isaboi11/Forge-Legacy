import { supabase } from '@/lib/supabase';
import { HONOR_CATEGORIES, categoryGlyph, categoryMeta, honorMeta, type HonorGlyphName } from '@/domain/honor/catalog';

/**
 * Grant the one-time "Initiative" honor — the fresh athlete's first-move honor, earned when they commit to a
 * starting program (built OR chose one). Mirrors the DB-side grant path of the workout honors
 * (`evaluate_honors`, migration 0012): the `claim_initiative_honor` RPC (migration 0014) does an idempotent
 * insert into `honor_instances`, guarded by the same `honor_once` unique index, so calling this on every
 * accept / build / re-pick can only ever grant one row. It writes the same live `HONOR_EARNED` timeline
 * event, and the Legacy Honors section reads it live like any other honor — no read-path change.
 *
 * Best-effort by design: callers fire-and-forget so a failed grant never blocks the Home un-gate; the next
 * accept/build re-attempts, and the DB dedupes. (Until migration 0014 is applied to the DB, the RPC 404s and
 * this throws — swallowed by the caller — so the on-ramp is unaffected.)
 */
/**
 * Grant "Initiative" if it isn't already held. Returns TRUE only when this call actually created it.
 *
 * The RPC already returns the newly-granted honors (an empty array when it was a no-op, thanks to the
 * `honor_once` index); the client used to discard that, which is why an athlete who earned Initiative
 * long ago could still be shown its ceremony again. The caller needs to know "was this a first" to
 * decide whether to celebrate.
 */
export async function claimInitiativeHonor(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('claim_initiative_honor');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export interface EarnedHonor {
  id: string;
  /** DB `honor_type` slug (→ `honorMeta` for category/glyph/trigger). */
  slug: string;
  /** Snapshotted display name. */
  name: string;
  /** ISO date (`date_earned`). */
  date: string;
}

/** Every honor the athlete has earned, newest first — the Honors Hub read (same source Legacy already uses). */
export async function fetchHonors(): Promise<EarnedHonor[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('honor_instances')
    .select('id, honor_type, display_name, date_earned')
    .eq('athlete_id', user.id)
    .order('date_earned', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.honor_type as string,
    name: r.display_name as string,
    date: r.date_earned as string,
  }));
}

// ── The catalog (migration 0077) ─────────────────────────────────────────────

export interface CatalogHonor {
  slug: string;
  name: string;
  category: string;
  metric: string;
  /** Narrows the metric to one lift or activity (0078). Null = unscoped. */
  metricKey: string | null;
  threshold: number;
  /** How to speak the threshold when the stored figure isn't the spoken one (0083). Null = say the number. */
  displayAmount: string | null;
  /** 'account' = once ever; 'chapter' = once per chapter. */
  scope: 'account' | 'chapter';
}

/**
 * Every honor that CAN be earned, whether or not this athlete has. Reference data, world-readable —
 * the catalog surfaces need to show a locked honor alongside an earned one, which is impossible from
 * `honor_instances` alone (it only ever holds what somebody already has).
 */
export async function fetchHonorCatalog(): Promise<CatalogHonor[]> {
  const { data, error } = await supabase
    .from('honor_catalog')
    .select('honor_type, display_name, category, metric, metric_key, threshold, scope, display_amount')
    .order('sort_order', { ascending: true });
  if (error) {
    /*
     * This guard used to catch PGRST205 (whole table absent) and return [] — an empty Honors screen.
     * It was pointed at the wrong failure. The break that actually happened was
     * `42703: column honor_catalog.display_amount does not exist` — a column added by 0083 while the
     * applied range stopped at 0081 — and `display_amount` is in the select above. A partly-applied
     * chain fails on a missing COLUMN, not a missing table, so the guard covered the case that could
     * not happen and let the one that did throw raw.
     *
     * Both are now named, and neither returns []. Silently rendering "no honors earned" to an athlete
     * who has earned some is the same class of lie as a chapter reporting zero (0098) — an empty
     * state is a claim, not a neutral fallback. A schema problem should say so.
     */
    const code = (error as { code?: string }).code;
    if (code === 'PGRST205') throw new Error('Honors aren’t available yet — migration 0077 hasn’t been applied.');
    if (code === '42703') {
      throw new Error(
        'The honors catalog is out of date — part of the 0077–0083 chain is missing. Run the rest of it, then reopen this screen.',
      );
    }
    throw error;
  }
  return (data ?? []).map((r) => ({
    slug: r.honor_type as string,
    name: r.display_name as string,
    category: r.category as string,
    metric: r.metric as string,
    metricKey: (r.metric_key as string) ?? null,
    threshold: Number(r.threshold),
    displayAmount: (r.display_amount as string) ?? null,
    scope: (r.scope === 'chapter' ? 'chapter' : 'account') as 'account' | 'chapter',
  }));
}

/**
 * Award anything already earned but never granted.
 *
 * Honors are evaluated when a workout is saved, so every threshold added to the catalog after an athlete
 * passed it would otherwise sit unawarded until they happened to train again — they would have to earn
 * "100 Workouts Logged" by logging their 101st. This closes that gap on demand.
 *
 * Idempotent (grant-once is enforced by the unique indexes) and SILENT: it runs with `source = 'import'`,
 * so no timeline event is written. The moment those honors were earned has already passed, and stamping
 * them with today's date would be a small lie in a permanent record.
 *
 * Returns how many were newly granted, so a caller can decide whether it's worth mentioning.
 */
export async function claimEarnedHonors(): Promise<number> {
  const { data, error } = await supabase.rpc('claim_earned_honors');
  if (error) {
    /*
     * Was `return 0` on PGRST202 — indistinguishable from "nothing to grant". If this RPC's signature
     * ever drifts, honors stop being granted and every caller is told, truthfully-looking, that zero
     * were earned. A backfill that silently does nothing is worse than one that fails.
     */
    if ((error as { code?: string }).code === 'PGRST202') {
      throw new Error('Honors can’t be claimed yet — migration 0077 hasn’t been applied.');
    }
    throw error;
  }
  return Array.isArray(data) ? data.length : 0;
}

// ── The Hub read (L-10) ──────────────────────────────────────────────────────


/** DB category names → the code catalog's category ids, for glyphs and ordering. */
const CATEGORY_ID: Record<string, string> = {
  Origin: 'origin',
  Training: 'training',
  Chapters: 'chapters',
  Goals: 'goals',
  Strength: 'strength',
  'Relative Strength': 'strength',
  Competition: 'competition',
  Endurance: 'endurance',
  Partnership: 'partnership',
  Longevity: 'longevity',
  Programs: 'programs',
  Communities: 'communities',
  Squad: 'squad',
  Prestige: 'prestige',
  Hidden: 'hidden',
};

const LIFT_LABEL: Record<string, string> = {
  'barbell-bench-press': 'Bench',
  'barbell-back-squat': 'Squat',
  'barbell-deadlift': 'Deadlift',
  'barbell-overhead-press': 'Overhead press',
};

const ACTIVITY_LABEL: Record<string, string> = {
  running: 'Run',
  walking: 'Walk',
  cycling: 'Ride',
  swimming: 'Swim',
  rowing: 'Row',
};

const num = (n: number): string => n.toLocaleString('en-US');

/**
 * How an honor is earned, in a sentence — DERIVED from the metric and threshold rather than stored.
 *
 * The design ships a hand-written `trigger` string per honor. Prose can drift from the rule it describes
 * (a threshold changes, the sentence doesn't), and with 131 honors nobody would catch it. Generating it
 * from the same numbers the evaluator tests means the description is wrong only if the rule is.
 */
export function triggerText(metric: string, threshold: number, metricKey: string | null, displayAmount?: string | null): string {
  const lift = metricKey ? (LIFT_LABEL[metricKey] ?? metricKey) : '';
  const act = metricKey ? (ACTIVITY_LABEL[metricKey] ?? metricKey) : '';
  /** The spoken amount: a display override when the stored figure isn't the one people say (0083). */
  const amt = (unit: string) => displayAmount ?? `${num(threshold)} ${unit}${threshold === 1 ? '' : 's'}`;
  const times = (n: number) => (n === 1 ? 'once' : `${num(n)} times`);

  switch (metric) {
    case 'workouts_total':
      if (threshold <= 1) return 'Log your first workout.';
      // "Log 2 workouts" is technically right and says nothing. The honor is about returning.
      if (threshold === 2) return 'Come back and log a second workout.';
      return `Log ${num(threshold)} workouts.`;
    case 'hours_forged':
      return `Spend ${num(threshold)} hours training.`;
    case 'active_weeks':
      return `Train in ${num(threshold)} separate weeks.`;
    case 'chapters_sealed':
      return threshold <= 1 ? 'Seal your first chapter.' : `Seal ${num(threshold)} chapters.`;
    case 'chapter_workouts':
      return `Log ${num(threshold)} workouts inside a single chapter.`;
    case 'chapter_days':
      return `Keep one chapter open for ${num(threshold)} days.`;
    case 'goals_achieved':
      return threshold <= 1 ? 'Achieve your first goal.' : `Achieve ${num(threshold)} goals.`;

    case 'lift_max':
      return `${lift} ${num(threshold)} lb.`;
    case 'combined_lifts':
      return `Bench, squat and deadlift totalling ${num(threshold)} lb.`;
    case 'lift_ratio':
      return threshold === 1 ? `${lift} your full bodyweight.` : `${lift} ${threshold}× your bodyweight.`;
    case 'lifetime_volume':
      return `Move ${num(threshold)} lb in total, across every set you've logged.`;

    case 'challenges_won':
      return threshold <= 1 ? 'Win a competition.' : `Win ${num(threshold)} competitions.`;
    case 'challenges_entered':
      return threshold <= 1 ? 'Enter a competition.' : `Enter ${num(threshold)} competitions.`;

    case 'session_distance':
      return `${act} ${amt('mile')} in a single session.`;
    case 'lifetime_distance':
      return `${act} ${amt('mile')} in total.`;

    case 'partnered_sessions':
      return threshold <= 1 ? 'Log a workout alongside someone.' : `Log ${num(threshold)} workouts alongside someone.`;
    case 'same_partner_max':
      return `Train with the same person ${times(threshold)}.`;
    case 'distinct_partners':
      return `Train with ${num(threshold)} different people.`;
    case 'comeback_days':
      return `Come back and train again after ${num(threshold)} days away.`;

    // ── Origin. These had no case at all and fell through to a useless default. ──
    case 'prs_recorded':
      return threshold <= 1 ? 'Set your first personal record.' : `Set ${num(threshold)} personal records.`;
    case 'goals_set':
      return threshold <= 1 ? 'Set your first goal.' : `Set ${num(threshold)} goals.`;
    case 'connections':
      return 'Join a squad, or add your first friend.';
    case 'captures_recorded':
      return threshold <= 1 ? 'Add your first progress capture.' : `Add ${num(threshold)} progress captures.`;
    case 'reflections_written':
      return threshold <= 1
        ? 'Write your first reflection — on a chapter, or on something you accomplished.'
        : `Write ${num(threshold)} reflections.`;
    case 'has_standard':
      return 'Write your Standard — what you hold yourself to.';
    case 'best_week_sessions':
      return `Train ${num(threshold)} times inside any seven days.`;

    // ── Programs ──
    case 'programs_graduated':
      return threshold <= 1 ? 'Finish a program you started.' : `Finish ${num(threshold)} programs.`;

    // ── Longevity as TENURE. Spoken in the unit the honor is named in — "Forge for 1,095 days" is a
    //    number nobody counts, and the honor is called 3 Years Forging. ──
    case 'account_days':
      return threshold < 365
        ? `Keep forging for ${num(threshold)} days.`
        : `Keep forging for ${num(Math.round(threshold / 365))} year${threshold >= 730 ? 's' : ''}.`;

    // ── Squad ──
    case 'squads_founded':
      return 'Start a squad of your own.';
    case 'squad_checkins_logged':
      return `Check in with your squad ${num(threshold)} times.`;
    case 'squad_workouts':
      return `Your squads log ${num(threshold)} sessions between them.`;
    case 'perfect_weeks':
      // The bar is the squad's own weekly standard, not seven days — rest days are training, and an
      // honor nobody can earn without skipping theirs is an honor worth not having.
      return threshold <= 1
        ? 'A week where every member of your squad met its standard.'
        : `${num(threshold)} weeks where every member of your squad met its standard.`;
    case 'squad_goals_completed':
      return threshold <= 1
        ? 'Finish a goal your squad set together.'
        : `Finish ${num(threshold)} goals your squad set together.`;
    case 'max_squad_streak':
      return `Keep half your squad training, every day, for ${num(threshold)} days.`;
    case 'everyone_finished_program':
      return 'Every member of your squad finishes the same program.';

    // ── Prestige ──
    case 'categories_topped':
      return threshold >= 7
        ? 'Reach the top of every path a person can walk alone.'
        : `Reach the top of ${num(threshold)} different paths.`;

    // ── Hidden. These are only ever READ once earned — the catalog row is unreadable until then
    //    (0099 row-level policy) — so they are written in the past tense, as a record of the thing
    //    that happened rather than an instruction for how to get it. ──
    case 'sessions_before_6am':
      return 'You trained before the sun was up.';
    case 'sessions_midnight_3am':
      return 'You trained in the smallest hours of the morning.';
    case 'sessions_new_years':
      return 'You trained on the first day of the year.';
    case 'sessions_leap_day':
      return 'You trained on a day that only exists every four years.';
    case 'sessions_full_circle':
      return 'You trained on the anniversary of the day you started.';
    case 'never':
      return 'Three kinds of honor, all at once.';
    case 'always':
      return 'A rare combination of everything below.';

    default:
      return 'Earned through training.';
  }
}

export interface HubHonor {
  slug: string;
  name: string;
  /** ISO date; null when this honor is in the catalog but not yet earned. */
  date: string | null;
  categoryId: string;
  categoryName: string;
  glyph: HonorGlyphName;
  trigger: string;
  /** Position within its own ladder, e.g. 2 of 4 bench tiers. Null when it stands alone. */
  tier: { step: number; of: number } | null;
}

export interface HonorCategoryGroup {
  id: string;
  name: string;
  glyph: HonorGlyphName;
  honors: HubHonor[];
}

export interface HonorsHub {
  earned: HubHonor[];
  recent: HubHonor[];
  categories: HonorCategoryGroup[];
  earnedCount: number;
  catalogCount: number;
}

/**
 * Everything L-10 renders. Earned honors are joined to the catalog so each one knows how it was earned
 * and where it sits in its ladder — the design's detail sheet shows only "Category", which is the same
 * word already printed directly above it.
 */
export async function fetchHonorsHub(): Promise<HonorsHub> {
  const [earnedRows, catalog] = await Promise.all([fetchHonors(), fetchHonorCatalog()]);
  const bySlug = new Map(catalog.map((c) => [c.slug, c]));

  // Ladder position: honors sharing a metric + key form a tier list, ordered by threshold.
  const ladders = new Map<string, CatalogHonor[]>();
  for (const c of catalog) {
    const key = `${c.metric}|${c.metricKey ?? ''}`;
    const list = ladders.get(key);
    if (list) list.push(c);
    else ladders.set(key, [c]);
  }
  for (const list of ladders.values()) list.sort((a, b) => a.threshold - b.threshold);

  const toHub = (slug: string, name: string, date: string | null): HubHonor => {
    const c = bySlug.get(slug);

    /**
     * Not every earned honor is a catalog row. `initiative` is granted by its own RPC (0014) and has no
     * metric or threshold, so it will never appear in `honor_catalog` — and falling through to a generic
     * "Training" default put it in the wrong category with the wrong mark, while Legacy (which already
     * falls back to the code catalog) showed it correctly as Origin. Same fallback here, so one honor
     * reads the same on both screens.
     */
    const code = c ? null : honorMeta(slug, name);
    const categoryId = c ? (CATEGORY_ID[c.category] ?? 'training') : (code?.category ?? 'training');
    const categoryName = c?.category ?? categoryMeta(categoryId)?.name ?? 'Training';

    const ladder = c ? (ladders.get(`${c.metric}|${c.metricKey ?? ''}`) ?? []) : [];
    const step = c ? ladder.findIndex((x) => x.slug === slug) + 1 : 0;
    return {
      slug,
      name,
      date,
      categoryId,
      categoryName,
      glyph: categoryGlyph(categoryId),
      trigger: c ? triggerText(c.metric, c.threshold, c.metricKey, c.displayAmount) : (code?.trigger || 'A permanent part of your legacy.'),
      tier: ladder.length > 1 && step > 0 ? { step, of: ladder.length } : null,
    };
  };

  const earned = earnedRows.map((r) => toHub(r.slug, r.name, r.date));

  // Non-mutating sort, newest first.
  const recent = [...earned]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 5);

  // Canonical category order, empty categories dropped.
  // Canonical order from the code catalog (Origin first), so a category the DB catalog never names —
  // Origin, whose only member is `initiative` — still has a slot to render in.
  const order = HONOR_CATEGORIES.map((c) => c.id);
  const categories: HonorCategoryGroup[] = [];
  for (const id of order) {
    const honors = earned.filter((h) => h.categoryId === id);
    if (honors.length === 0) continue;
    categories.push({ id, name: categoryMeta(id)?.name ?? honors[0].categoryName, glyph: categoryGlyph(id), honors });
  }

  return { earned, recent, categories, earnedCount: earned.length, catalogCount: catalog.length };
}

/**
 * Record which clock the athlete lives by.
 *
 * `workouts.started_at` is a timestamptz — an absolute instant with no local offset kept — so the app
 * cannot tell whether a session started at 5 AM or 5 PM for the person who did it. Three of the Hidden
 * honors turn on exactly that (0099), and the column has NO default on purpose: assuming UTC would award
 * "Midnight Forge" to someone in Denver who trained after dinner, which is a claim about their life that
 * never happened. Null means those honors simply do not evaluate — the honest failure.
 *
 * Written once per launch rather than per save. Somebody who moves timezones is right from their next
 * launch, and honors are permanent once granted, so the worst a stale value can do is delay one.
 *
 * Best-effort throughout: a profile write must never be able to stop somebody using the app.
 */
export async function syncAthleteTimezone(): Promise<void> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ tz }).eq('id', user.id);
  } catch {
    // A missing `tz` column (0099 not yet applied) lands here, as does an offline launch. Both mean the
    // local-time honors stay unevaluated, which is the same as before this existed.
  }
}
