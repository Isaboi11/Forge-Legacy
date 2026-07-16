import { LEGACY_DATA } from './legacy-placeholder';
import type { Accomplishment, Goal, Honor, LegacyPhoto } from '@/types/legacy';

/**
 * ⚠ THE TRANSITIONAL HALF OF LEGACY — the ONLY parts still seeded, not live.
 *
 * Everything else on Legacy (rank · standard · chapters · timeline · featured moment) reads live from
 * Supabase. These sections stay on the fixture because their tables are in
 * `supabase/design/0002_full_model.sql` and NOT applied yet (spine-only through Phase 3). This is a
 * KNOWN transitional state, not fabrication — kept in ONE clearly-named place so it's never ambiguous
 * which half of the screen is real. When a table below is applied, delete its entry here and read it
 * live. Logged in Docs/Supabase-Data-Model-v1.0.md §11 + FORGE_DELTAS.
 */
export const LEGACY_FIXTURE_PENDING: {
  photos: LegacyPhoto[];
  totalPhotoCount: number;
  accomplishments: Accomplishment[];
  totalAccomplishmentCount: number;
  honors: Honor[];
  totalHonorCount: number;
} = {
  // FIXTURE until media_assets + chapter_photos land
  photos: LEGACY_DATA.photos,
  totalPhotoCount: LEGACY_DATA.totalPhotoCount,
  // FIXTURE until an accomplishments table lands
  accomplishments: LEGACY_DATA.accomplishments,
  totalAccomplishmentCount: LEGACY_DATA.totalAccomplishmentCount,
  // FIXTURE until honor_instances lands
  honors: LEGACY_DATA.honors,
  totalHonorCount: LEGACY_DATA.totalHonorCount,
};

/**
 * FIXTURE until the goals table lands — chapter goals keyed by chapter name. The spine chapters ARE
 * live; only the embedded `goal` is transitional (the goals table isn't applied). Merged onto each
 * live chapter by name in legacy-live.
 */
export const CHAPTER_GOALS_PENDING: Record<string, Goal> = {
  'Into the Iron': { kind: 'quantifiable', name: 'Squat 315 lbs', progress: 73, achieved: false },
  'Road to 405': { kind: 'quantifiable', name: 'Squat 405 lbs', progress: 100, achieved: true },
  'Power Block': { kind: 'quantifiable', name: 'Deadlift 4 plates', progress: 100, achieved: true },
  Foundations: { kind: 'narrative', name: 'Build the habit', achieved: true },
};
