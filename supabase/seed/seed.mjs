// Seed the demo user's SPINE from the Legacy fixtures (profile · chapters · PRs · timeline).
// Writes as the signed-in demo user — every row is self-owned, so it runs under the same RLS the
// app uses (which also proves the policies permit self-writes). Idempotent: clears first.
// Run: SB_EMAIL=... SB_PASS=... node supabase/seed/seed.mjs
//
// PERSONA (Phase 3 follow-up): defaults to the FIXTURE identity "Ada Ridge", but every field is
// env-overridable so the demo can become the REAL subject WITHOUT hardcoding anyone's identity here.
// To go real, reseed with e.g.:
//   SB_NAME="Jane Doe" SB_FIRST="Jane" SB_HANDLE="jane.forged" SB_INITIALS="JD" SB_SEX="female" \
//   SB_EMAIL=… SB_PASS=… node supabase/seed/seed.mjs
// The avatar is NOT set here — `upload-avatar.mjs` owns `avatar_url`, so a reseed never wipes the photo.
// Likewise pin media lives in the `pins` table via `seed-media.mjs`, untouched by this baseline reseed.
import { signedInClient } from './_client.mjs';

const persona = {
  name: process.env.SB_NAME ?? 'Ada Ridge',
  first_name: process.env.SB_FIRST ?? 'Ada',
  handle: process.env.SB_HANDLE ?? 'ada.forged',
  initials: process.env.SB_INITIALS ?? 'AR',
  sex: process.env.SB_SEX ?? 'unspecified',
};

const { sb, uid } = await signedInClient();
console.log('seeding as', uid);

// idempotent clear (timeline FKs chapters, so delete it first)
await sb.from('timeline_events').delete().eq('athlete_id', uid);
await sb.from('personal_records').delete().eq('athlete_id', uid);
await sb.from('chapters').delete().eq('athlete_id', uid);

// profile — fill in the trigger-created bare row with the persona identity (env-overridable).
// The demo athlete is fully set up → mark onboarded so the boot router sends them to the app, not the
// first-time journey (a fresh signup has onboarded_at null → onboarding).
const { error: pe } = await sb.from('profiles').update({
  ...persona,
  standard: 'Show up when it’s hard. The work is the promise I keep to myself.',
  rank_family: 'established', rank_level: 3,
  environment: 'commercial_gym', onboarded_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}).eq('id', uid);
if (pe) throw new Error('profile: ' + pe.message);

// chapters — exactly one active (Into the Iron). Counts + end dates mirror the L-1 fixture (LEGACY_DATA)
// so the live render matches it; sealed end dates are chosen so the computed compact spans equal the
// fixture's (Power Block 110d, Foundations 71d). Only `dayCount` is intentionally live-derived (days
// since the active chapter's start) and therefore differs from the fixture's stale hardcode.
const chapters = [
  { name: 'Into the Iron', start_date: '2026-04-06', end_date: null, sealed_at: null, is_active: true, workout_count: 47, honor_count: 5, reflection: null },
  { name: 'Road to 405', start_date: '2026-01-15', end_date: '2026-04-04', sealed_at: '2026-06-27T00:00:00Z', is_active: false, workout_count: 47, honor_count: 3, reflection: 'I proved to myself that consistency over six weeks beats intensity over one.' },
  { name: 'Power Block', start_date: '2025-11-01', end_date: '2026-02-19', sealed_at: '2026-02-28T00:00:00Z', is_active: false, workout_count: 62, honor_count: 7, reflection: null },
  { name: 'Foundations', start_date: '2025-07-01', end_date: '2025-09-10', sealed_at: '2025-09-10T00:00:00Z', is_active: false, workout_count: 38, honor_count: 4, reflection: null },
].map((c) => ({ ...c, athlete_id: uid }));
const { data: chRows, error: ce } = await sb.from('chapters').insert(chapters).select('id,name');
if (ce) throw new Error('chapters: ' + ce.message);
const chId = Object.fromEntries(chRows.map((r) => [r.name, r.id]));

// personal records (mirror fixture accomplishments/goals)
const prs = [
  { exercise: 'Back Squat', achieved_on: '2026-05-15', measure_kind: 'load', load_value: 315, load_unit: 'lb' },
  { exercise: 'Deadlift', achieved_on: '2026-02-20', measure_kind: 'load', load_value: 485, load_unit: 'lb' },
  { exercise: '5K', achieved_on: '2026-03-10', measure_kind: 'time', time_seconds: 1470 },
].map((p) => ({ ...p, athlete_id: uid }));
const { error: pre } = await sb.from('personal_records').insert(prs);
if (pre) throw new Error('prs: ' + pre.message);

// timeline (canonical FLM events; RANK_UP is standalone/null-chapter)
const tl = [
  { t: 'RANK_UP', o: 'Apprentice · II', c: null, at: '2026-05-15T00:00:00Z', src: 'rank' },
  { t: 'CHAPTER_SEALED', o: 'Road to 405', c: 'Road to 405', at: '2026-06-27T00:00:00Z', src: 'chapter' },
  { t: 'GOAL_ACHIEVED', o: 'Squat 405 lbs', c: 'Road to 405', at: '2026-04-04T00:00:00Z', src: 'goal' },
  { t: 'HONOR_EARNED', o: '10 Workouts in Chapter', c: 'Road to 405', at: '2026-06-20T00:00:00Z', src: 'honor' },
  { t: 'PROGRAM_GRADUATED', o: 'Strength Foundation II', c: 'Road to 405', at: '2026-06-14T00:00:00Z', src: 'program' },
  { t: 'CHAPTER_SEALED', o: 'Power Block', c: 'Power Block', at: '2026-02-28T00:00:00Z', src: 'chapter' },
  { t: 'GOAL_ACHIEVED', o: 'Deadlift 4 plates', c: 'Power Block', at: '2026-02-20T00:00:00Z', src: 'goal' },
  { t: 'CHAPTER_SEALED', o: 'Foundations', c: 'Foundations', at: '2025-09-10T00:00:00Z', src: 'chapter' },
].map((e) => ({ athlete_id: uid, event_type: e.t, object_name: e.o, chapter_id: e.c ? chId[e.c] : null, occurred_at: e.at, source_entity_type: e.src }));
const { error: te } = await sb.from('timeline_events').insert(tl);
if (te) throw new Error('timeline: ' + te.message);

console.log(`✓ profile: ${persona.name} · Established III`);
console.log(`✓ chapters: ${chRows.length} (1 active + 3 sealed) · PRs: ${prs.length} · timeline: ${tl.length}`);
