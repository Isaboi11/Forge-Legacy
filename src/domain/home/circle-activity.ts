/**
 * WHAT YOUR CIRCLE HAS BEEN DOING — the one friend-activity line on Home's Your Circle card.
 *
 * ══ WHY THIS EXISTS ══
 *
 * PO: *"Moses, a friend on the app, posted his workout. It showed up when I clicked on see your circle,
 * but shouldn't it show up in that card on the Home Screen?"*
 *
 * It should, and it could not. Home asked for the newest post whose BODY was non-empty and rendered it as
 * an italic quote — so the card could only ever show somebody's *words*. A shared workout has no words
 * unless a note was written, and until `body` was wired through the share sheet a recap's body was
 * ALWAYS empty, so no workout could appear there at all. Moses's post was skipped for having nothing to
 * quote, while `/friends` — which draws the post rather than a sentence about it — showed it fine.
 *
 * ══ A POST SPEAKS, OR IT DESCRIBES ITSELF ══
 *
 * Two kinds of line, and the difference is visible rather than cosmetic:
 *
 *   `quoted: true`  — the athlete's own words, rendered italic. Their sentence, unaltered.
 *   `quoted: false` — a line THIS FILE wrote about their session, rendered in normal type.
 *
 * Italic is the mark of a quotation, so a derived sentence must not wear it. Putting `Push Day · 12,400
 * lb` in the same slant as *"felt strong today"* tells the reader Moses said something he did not.
 *
 * ⚠ NOTHING IS INVENTED FOR A POST WITH NEITHER. A photo with no caption, or a recap from before the
 * summary column existed, returns null and the row is omitted — the card already has a quiet state for
 * "your circle has been quiet", and an activity row reading "Moses posted" is a row that says nothing
 * while occupying the space of something that did.
 *
 * Pure — no React, no supabase, no `@/` alias (a runtime alias import breaks `node --test`).
 */

/** The minimum of a feed post this rule reads. Kept structural so both feeds' rows satisfy it. */
export interface CircleCandidate {
  isMine: boolean;
  body: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  prValue: string | null;
  prExercise: string | null;
  prLabel: string | null;
  workoutSummary: { name?: string | null; volume: number; exercises: unknown[] } | null;
}

export interface CircleActivity {
  name: string;
  /** The line under their name. */
  quote: string;
  /** Their own words (italic) vs a sentence derived here (normal type). */
  quoted: boolean;
  avatarUrl: string | null;
}

/** `12400` → `12,400`. The value is already converted and unit-labelled by the caller. */
export function groupDigits(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The line for ONE post, or null when it has nothing to say.
 *
 * `volumeLabel` is injected rather than computed: the snapshot stores canonical pounds and every surface
 * converts at the moment of drawing, so the unit decision belongs to the screen that knows the athlete's
 * preference — not to a rule that would have to import the settings layer to guess it.
 */
export function activityFor(
  p: CircleCandidate,
  volumeLabel: (lb: number) => { value: number; unit: string },
): CircleActivity | null {
  const of = (quote: string, quoted: boolean): CircleActivity => ({
    name: p.authorName,
    quote,
    quoted,
    avatarUrl: p.authorAvatarUrl,
  });

  // Their own words win over anything derived — a note written about a session says more than its volume.
  const words = (p.body ?? '').trim();
  if (words) return of(words, true);

  const s = p.workoutSummary;
  if (s) {
    /*
     * The session and its headline number. Volume leads because it is the one figure that means the same
     * thing across every kind of strength session; the lift COUNT stands in when there is no volume at
     * all, which is what a bodyweight or cardio session snapshots.
     */
    const name = s.name?.trim() || 'a workout';
    if (s.volume > 0) {
      const v = volumeLabel(s.volume);
      return of(`${name} · ${groupDigits(v.value)} ${v.unit}`, false);
    }
    const n = s.exercises.length;
    return n > 0 ? of(`${name} · ${n} ${n === 1 ? 'lift' : 'lifts'}`, false) : of(name, false);
  }

  // A PR carries its own sentence in three columns, and it is the most worth surfacing of anything here.
  const pr = [p.prExercise?.trim(), p.prValue?.trim()].filter(Boolean).join(' · ');
  if (pr) return of(`${pr}${p.prLabel?.trim() ? ` · ${p.prLabel.trim()}` : ''}`, false);

  return null;
}

/**
 * The newest post from somebody else that has something to say.
 *
 * ⚠ IT WALKS THE LIST. Home used to fetch exactly ONE post and then filter it, so the row went blank
 * whenever the newest post in the whole feed happened to be the athlete's own or happened to have no
 * words — a card reporting an empty circle because of what the athlete themselves had just posted.
 */
export function circleActivity(
  posts: readonly CircleCandidate[],
  volumeLabel: (lb: number) => { value: number; unit: string },
): CircleActivity | null {
  for (const p of posts) {
    if (p.isMine) continue;
    const a = activityFor(p, volumeLabel);
    if (a) return a;
  }
  return null;
}
