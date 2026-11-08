import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/diagnostics';

/**
 * ══ THE LEGACY MOMENTS NOTHING EVER WROTE (PO 11-08 launch QA, H30) ══
 *
 * `CHAPTER_SEALED` and `GOAL_ACHIEVED` are in the 0001 enum, and the Legacy tab reads them — the Featured Legacy
 * Moment IS the latest seal, and the Timeline draws "Sealed…" and "Achieved…" rows — but no trigger and no client
 * path ever inserted one. Workouts and honors write theirs in SQL (0010, 0012); these two happen in the app
 * (`sealChapter`, `updateProgress` / `markAchieved`), so they are written here, right after the write they record.
 *
 * Best-effort and reported: the seal or the goal is the thing that matters and is already saved; a missing
 * timeline row costs a moment on the Legacy tab, never the action. `timeline_events_own` (0001) admits the owner.
 */
export async function recordTimelineEvent(e: {
  type: 'CHAPTER_SEALED' | 'GOAL_ACHIEVED';
  objectName: string;
  chapterId: string | null;
  sourceType: 'chapter' | 'goal';
  sourceId: string;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('timeline_events').insert({
      athlete_id: user.id,
      event_type: e.type,
      object_name: e.objectName.trim() || (e.type === 'CHAPTER_SEALED' ? 'Chapter' : 'Goal'),
      chapter_id: e.chapterId,
      source_entity_type: e.sourceType,
      source_entity_id: e.sourceId,
    });
    if (error) reportError(error, { screen: 'legacy.timeline-write' });
  } catch (err) {
    reportError(err, { screen: 'legacy.timeline-write' });
  }
}
