import { createFriendPost, uploadFeedImageData } from '@/data/friends-feed-live';
import { addSquadPost, type WorkoutSummary } from '@/data/squad-feed-live';
import type { StoryDrawing } from '@/domain/share/story-card';
import type { PriorShare, ShareTarget } from '@/domain/share/fanout';
import { renderStoryImage } from '@/lib/story-image';

/**
 * POSTING ONE FINISHED SESSION — the one write path a person's tap goes through.
 *
 * ══ WHY THIS IS NOT INSIDE A SHEET ANY MORE ══
 *
 * It lived in `ShareSessionSheet`, which was the only place a session could be posted by hand. Workout
 * Complete now chooses its destinations on the screen itself (Friends · Squads, PO 2026-10-02) and posts
 * from its own button — so the loop, the overlay picture and the partial-failure bookkeeping moved here,
 * where both callers reach the same code rather than two copies of the audience rules.
 *
 * Auto-post keeps its own path (`auto-post-live.ts`): it carries no photos, no food, no map and an
 * `auto` flag the database de-duplicates on. A person pressing a button is a different post.
 *
 * ══ IT REPORTS, IT NEVER THROWS ══
 *
 * Every insert is one deliberate post to one place, made in order, so a failure halfway is reportable as
 * "these landed, that one didn't". `done` names what exists after the call whatever happened, and the
 * caller must record it — that is what stops a retry posting the landed half a second time.
 */

export interface WorkoutPostInput {
  workoutId: string;
  /** The post's words. Trimmed by the feeds; empty is a recap with no caption. */
  body: string;
  /** What was added on the screen that offered it — see `ShareSessionSheet`'s `media` prop. */
  media: { url: string; kind: 'image' | 'video' }[];
  /** The snapshot as it should be kept forever: lead, `shareRoute` and `food` already decided. */
  summary: WorkoutSummary;
  /** From `shareTargets` — never built by hand (the BOTH row rule lives there). */
  targets: ShareTarget[];
  /** For naming what landed. */
  squads: readonly { id: string; name: string }[];
  /** Stats ON the photo (PO 2026-10-02). Absent: the photo posts with the strip under it. */
  photoOverlay?: { photoUri: string; compose: (showRoute: boolean) => StoryDrawing } | null;
}

export interface WorkoutPostResult {
  /** Squad names that received it, in the order posted. */
  landed: string[];
  /** Friends received it on this call. */
  friends: boolean;
  /** Every row this call inserted — record these even on failure. */
  done: PriorShare[];
  /** The first post with a page of its own (a squad or BOTH row). */
  firstSquadPost: string | null;
  /** The overlay picture could not be built, so the photo went with its strip instead. */
  pictureFailed: boolean;
  /** Why it stopped, when it did. Anything in `landed`/`friends` still landed. */
  error: unknown;
}

export async function postWorkoutRecap(input: WorkoutPostInput): Promise<WorkoutPostResult> {
  const { workoutId, body, media, summary, targets, squads, photoOverlay } = input;
  const out: WorkoutPostResult = { landed: [], friends: false, done: [], firstSquadPost: null, pictureFailed: false, error: null };
  if (!targets.length) return out;

  /*
   * The whole post, built once so the squad and friends paths cannot carry different things.
   *
   * `body` and `media` were once the literals `''` and `[]`, which is why a session shared with a note and
   * a photo arrived as a bare stat strip. The playlist rides inside `summary` — see `recapSummaryFrom` —
   * and the caller is responsible for that snapshot being current.
   */
  const recap = { type: 'recap' as const, body, workoutId, workoutSummary: summary, media };
  const withRoute = summary.shareRoute === true;

  /*
   * The overlay picture, drawn and uploaded ONCE before any row is written, so every squad and the
   * friends row carry the same image. If it cannot be built the post goes out the old way — the photo
   * with its strip — and says so, rather than posting nothing or a picture missing its photo.
   */
  let sent = recap;
  if (photoOverlay && media.some((m) => m.url === photoOverlay.photoUri)) {
    const pic = await renderStoryImage(photoOverlay.compose(withRoute), photoOverlay.photoUri).catch(() => null);
    const url = pic ? await uploadFeedImageData(pic.base64, pic.mime).catch(() => null) : null;
    if (url) {
      sent = {
        ...recap,
        media: [{ url, kind: 'image' as const }, ...media.filter((m) => m.url !== photoOverlay.photoUri)],
        workoutSummary: { ...recap.workoutSummary, photoLook: 'overlay' as const },
      };
    } else {
      out.pictureFailed = true;
    }
  }

  try {
    for (const t of targets) {
      const id =
        t.audience === 'SQUAD' && t.squadId
          ? await addSquadPost({ squadId: t.squadId, ...sent })
          : await createFriendPost({ ...sent, audience: t.audience, squadId: t.squadId });
      if (t.squadId && !out.firstSquadPost) out.firstSquadPost = id;
      out.done.push({ audience: t.audience, squadId: t.squadId });
      if (t.audience !== 'SQUAD') out.friends = true;
      const name = squads.find((s) => s.id === t.squadId)?.name;
      if (name) out.landed.push(name);
    }
  } catch (e) {
    out.error = e;
  }
  return out;
}
