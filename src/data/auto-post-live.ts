import { supabase } from '@/lib/supabase';
import { createFriendPost } from '@/data/friends-feed-live';
import { addSquadPost, buildWorkoutRecap } from '@/data/squad-feed-live';
import { fetchMySquads, type SquadSummary } from '@/data/squad-live';
import { autoPostOn, autoPostTargets, pruneAutoPost, sanitizeAutoPost, type AutoPostPref } from '@/domain/share/auto-post';
import { sanitizePrefs } from '@/domain/settings/preferences';
import type { PriorShare } from '@/domain/share/fanout';

/**
 * Auto-post's persistence and its one write path. The rules live in `domain/share/auto-post.ts`.
 *
 * ══ ⚠ THE WORKOUT IS THE RECORD; THE POST IS A SECOND THING ══
 *
 * Nothing here runs until `save_workout` has committed — the completion screen that calls it is only
 * ever reached with a saved workout id. So a failure here can never cost a set, a seal or a PR. It is
 * reported back as a result, never thrown, and the screen offers a retry.
 */

/**
 * Write the pref and nothing else.
 *
 * ⚠ READ-MODIFY-WRITE AGAINST THE SERVER, AND IT REFUSES TO GUESS. `fetchAppPrefs` answers DEFAULTS on
 * a failed read — correct for drawing a screen, and a data-loss trap for writing one key of a blob:
 * saving `{ ...defaults, autoPost }` would reset units, theme and the analytics opt-out with it (see
 * `lib/settings.tsx`, "it exists because that bug shipped"). So this reads the column itself and
 * throws if it cannot.
 */
export async function saveAutoPost(pref: AutoPostPref): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase.from('profiles').select('app_prefs').eq('id', user.id).single();
  if (error) throw error;
  const current = sanitizePrefs((data as { app_prefs: unknown } | null)?.app_prefs ?? null);
  const { error: werr } = await supabase
    .from('profiles')
    .update({ app_prefs: { ...current, autoPost: sanitizeAutoPost(pref) } })
    .eq('id', user.id);
  if (werr) throw werr;
}

/**
 * This athlete's posts of this workout — STRICT, unlike `fetchWorkoutShares`.
 *
 * `fetchWorkoutShares` never throws because a share sheet must open even when the read fails. Here the
 * same answer would be dangerous: an unreadable list read as "nothing posted yet" is how a retry posts
 * everything a second time. So a failed read fails the auto-post, and the retry asks again.
 */
async function priorPostsStrict(workoutId: string, uid: string): Promise<PriorShare[]> {
  const { data, error } = await supabase
    .from('squad_posts')
    .select('audience, squad_id')
    .eq('author_id', uid)
    .eq('workout_id', workoutId);
  if (error) throw error;
  return ((data ?? []) as { audience: string | null; squad_id: string | null }[]).map((r) => ({
    audience: r.audience === 'FRIENDS' || r.audience === 'BOTH' ? r.audience : 'SQUAD',
    squadId: r.squad_id,
  }));
}

export interface AutoPostResult {
  /** Squad names that received it on this run, in the order posted. */
  squadNames: string[];
  /** Friends received it on this run. */
  friends: boolean;
  /** The first post this run made that has a detail page — a squad or Both row. Null for friends-only. */
  squadPostId: string | null;
  /** Every destination this workout now has, for the screen's "already posted" state. */
  prior: PriorShare[];
  /** Why it did not finish, when it did not. Anything in `squadNames`/`friends` still landed. */
  error: string | null;
  /** The pref after pruning squads the athlete has left — the caller may have been holding a stale one. */
  pref: AutoPostPref;
}

/** A second identical auto row, refused by `squad_posts_auto_once`. It means "already there". */
const isDuplicate = (e: unknown) => (e as { code?: string } | null)?.code === '23505';

/*
 * One attempt per workout at a time. The completion screen can mount twice for one session (a reload,
 * a units-change refetch re-running its effect), and two overlapping runs would both read "nothing
 * posted" before either wrote. The index catches that too, but not racing is better than racing well.
 */
const inFlight = new Map<string, Promise<AutoPostResult>>();

export function runAutoPost(workoutId: string, pref: AutoPostPref): Promise<AutoPostResult> {
  const running = inFlight.get(workoutId);
  if (running) return running;
  const p = attempt(workoutId, pref).finally(() => inFlight.delete(workoutId));
  inFlight.set(workoutId, p);
  return p;
}

/*
 * ══ ONE DECISION PER WORKOUT PER APP SESSION ══
 *
 * The completion screen's effect re-runs whenever its inputs change — including when the athlete turns
 * auto-post ON from that very screen. Deciding again then would post the session they just declined to
 * post by hand, or re-post one they just posted. So the first decision (post, or don't) is remembered
 * and every later call gets the same answer. A retry is explicit, through `runAutoPost`.
 *
 * A reload clears this and decides again — harmless, because `autoPostTargets` skips any destination
 * that already has the workout.
 */
const decided = new Map<string, Promise<AutoPostResult | null>>();

export function autoPostOnArrival(workoutId: string, pref: AutoPostPref, eligible: boolean): Promise<AutoPostResult | null> {
  const known = decided.get(workoutId);
  if (known) return known;
  const p = eligible && autoPostOn(pref) ? runAutoPost(workoutId, pref) : Promise.resolve(null);
  decided.set(workoutId, p);
  return p;
}

async function attempt(workoutId: string, pref: AutoPostPref): Promise<AutoPostResult> {
  const out: AutoPostResult = { squadNames: [], friends: false, squadPostId: null, prior: [], error: null, pref };
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    /* Membership first: a squad the athlete has left is not a destination, and a pref that still names
       one is corrected on the server so the settings row stops promising it. */
    const squads: SquadSummary[] = await fetchMySquads();
    const memberIds = squads.map((s) => s.id);
    const live = pruneAutoPost(pref, memberIds);
    if (live !== pref) {
      out.pref = live;
      void saveAutoPost(live).catch(() => {
        // Best effort — the next run prunes again. Posting correctly does not depend on this write.
      });
    }
    if (!autoPostOn(live)) return out;

    const prior = await priorPostsStrict(workoutId, user.id);
    out.prior = prior;
    const targets = autoPostTargets(live, memberIds, prior);
    if (!targets.length) return out;

    const recap = await buildWorkoutRecap(workoutId);
    if (!recap) throw new Error('Couldn’t read the workout to post it.');
    const post = {
      type: 'recap' as const,
      /* No caption and no media — see the header of `domain/share/auto-post.ts`. The map is forced off
         (D-RS-3): only a person ticking the box on one post may publish a route. */
      body: '',
      media: [],
      workoutId,
      /* Food is never auto-posted either — it is a tick box on a manual post (PO 2026-09-28). */
      workoutSummary: { ...recap.summary, shareRoute: false, food: null, auto: true },
    };

    for (const t of targets) {
      let id: string | null = null;
      try {
        id =
          t.audience === 'SQUAD' && t.squadId
            ? await addSquadPost({ squadId: t.squadId, ...post })
            : await createFriendPost({ ...post, audience: t.audience, squadId: t.squadId });
      } catch (e) {
        if (!isDuplicate(e)) throw e;
        // Already there from an earlier attempt — count it as landed, post nothing.
      }
      out.prior = [...out.prior, { audience: t.audience, squadId: t.squadId }];
      if (t.audience !== 'SQUAD') out.friends = true;
      if (t.squadId) {
        const name = squads.find((s) => s.id === t.squadId)?.name;
        if (name) out.squadNames.push(name);
        if (id && !out.squadPostId) out.squadPostId = id;
      }
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : 'Couldn’t post your workout.';
  }
  return out;
}

/** The newest squad-visible post of this workout by this athlete — what "View post" opens. */
export async function fetchWorkoutPostId(workoutId: string): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('squad_posts')
      .select('id')
      .eq('author_id', user.id)
      .eq('workout_id', workoutId)
      .not('squad_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}
