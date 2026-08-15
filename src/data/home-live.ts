import { supabase } from '@/lib/supabase';

/**
 * The H-1 "awaiting first workout" check (ONB-D17, minimal). A just-onboarded athlete has one active
 * chapter with zero workouts — Home shows a purpose-built awaiting hero instead of the static content,
 * so a fresh user never lands on someone else's data or a blank screen. Returns null once they've trained.
 *
 * ══ ⚠ "A NEW CHAPTER" IS NOT "A NEW ATHLETE", AND THIS READ THEM AS THE SAME THING ══
 *
 * PO: *"What happened to my start workout card?"* — the Train Today hero vanished from Home after they
 * sealed Chapter I and began Chapter II.
 *
 * The test below is "the ACTIVE chapter has zero workouts", and the comment above says why that was
 * sound: a just-onboarded athlete has exactly one chapter and it is empty. That held for as long as an
 * athlete could only ever HAVE one chapter — which was true until chapter creation shipped and made a
 * second one reachable for the first time. From that moment a veteran starting a fresh chapter matched
 * the definition of a first-time user perfectly: active chapter, zero workouts.
 *
 * Downstream, `composeHome` reads this as `awaiting` and refuses to settle, and Home told someone with
 * two chapters and an eight-week program that this was "Your first chapter".
 *
 * ⚠ THE ORDINAL IS THE FIX, NOT THE WORKOUT COUNT. Counting lifetime workouts instead would still be
 * wrong for the athlete who has genuinely never trained but is on their second chapter, and it would
 * cost a second query to answer a question the chapter list already answers. Being the FIRST chapter is
 * what "just onboarded" actually means.
 */
export async function fetchAwaitingChapter(): Promise<{ chapterName: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  /* Ordered by start date and read whole: the active chapter's POSITION is the thing being tested, and
     `.eq('is_active', true).maybeSingle()` cannot see it. Same ordering as `fetchHomeChapter`, so the
     two cannot disagree about which chapter is the first — one of them saying "Chapter II" while the
     other says "your first" is exactly the state the PO was looking at. */
  const { data, error } = await supabase
    .from('chapters')
    .select('name, workout_count, is_active, start_date')
    .eq('athlete_id', user.id)
    .order('start_date', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as { name: string; workout_count: number | null; is_active: boolean }[];
  const idx = rows.findIndex((c) => c.is_active);
  if (idx !== 0) return null; // not their first chapter — whatever else they are, they are not new
  return (rows[0].workout_count ?? 0) === 0 ? { chapterName: rows[0].name } : null;
}

/**
 * The athlete's own chapter, for Home's title block.
 *
 * Home used to fall back to `HOME_CHAPTER` — the literal "Chapter III · The Rebuild · Week 6 · Day 2" —
 * for anybody past their first workout. Every athlete in the app was shown the same invented chapter,
 * ordinal and week, on the first screen they land on.
 *
 * The ordinal is COUNTED (chapters ordered by start date, this one's position), not stored, because there
 * is no chapter-number column and inventing one would be the same mistake at a different layer. Week and
 * day are elapsed time inside the chapter, which is a fact about it rather than a claim about progress.
 */
export interface HomeChapter {
  number: string;
  name: string;
  weekDay: string;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export async function fetchHomeChapter(): Promise<HomeChapter | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('chapters')
    .select('id, name, start_date, is_active')
    .eq('athlete_id', user.id)
    .order('start_date', { ascending: true });
  const rows = (data ?? []) as { id: string; name: string; start_date: string; is_active: boolean }[];
  const idx = rows.findIndex((c) => c.is_active);
  if (idx < 0) return null;
  const c = rows[idx];

  const days = Math.max(0, Math.floor((Date.now() - new Date(`${c.start_date}T00:00:00`).getTime()) / 86_400_000));
  const n = idx + 1;
  return {
    number: `Chapter ${ROMAN[n] ?? n}`,
    name: c.name,
    weekDay: `Week ${Math.floor(days / 7) + 1} · Day ${(days % 7) + 1}`,
  };
}
