import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * PO 2026-09-27 (Squatober): "calculate and gray the number into the amount of weight, but they can change it at any
 * time … they should be able to change their max anything at any time … the timer realistically should
 * automatically do that." The rules are tested in `domain/workout/__tests__/posted-prescription.test.mjs` and the
 * data road in `data/__tests__/posted-workout-live.test.mjs`; this pins the wiring, which lives in route files that
 * `node --test` cannot load.
 */
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const WORKOUT = read('../workout.tsx');
const HOME = read('../(tabs)/index.tsx');
const POST = read('../squad-post/[id].tsx');
const FEED = read('../squad/[id].tsx');
const COMPOSER = read('../squad-composer.tsx');
const TEMPLATES = read('../../data/templates-live.ts');

test('a prescribed template row builds its sets through prescribedSets (gray weights, %, rest) — and only such rows', () => {
  const fn = WORKOUT.match(/function templateToSessionExercises\([\s\S]*?\n}\r?\n/)?.[0] ?? '';
  assert.match(fn, /load\?: LoadContext/);
  assert.match(fn, /const prescribed = hasPrescription\(e\);/);
  assert.match(fn, /sets: prescribed\s*\?\s*prescribedSets\(e, load\)/);
  assert.match(fn, /maxKey: maxKeyOf\(e\)/);
  assert.match(fn, /targetReps: e\.targetDurationSec != null \? 0 : e\.targetReps \|\| 8/, 'every other template builds exactly as before');
});

test('the planned (Home / squad) and template launches read the maxes, build with them, and ask for them', () => {
  assert.equal((WORKOUT.match(/const prescribed = await prescribedStart\(/g) ?? []).length, 2);
  assert.match(WORKOUT, /templateToSessionExercises\(shape, prescribed\.load\)/);
  assert.match(WORKOUT, /templateToSessionExercises\(t\.exercises, prescribed\.load\)/);
  assert.equal((WORKOUT.match(/prescribed\.ask\(\);/g) ?? []).length, 2);
  assert.match(WORKOUT, /brief: launch\.brief/);
  assert.match(HOME, /writeWorkoutLaunch\(\{ exercises: planned\.exercises, workoutName: planned\.name, brief: planned\.brief \}\)/);
});

test('a prescribed rest starts the clock by itself, on its own seconds; a superset waits for the end of the round', () => {
  const fn = WORKOUT.match(/const completeSet = [\s\S]*?\n  };\r?\n/)?.[0] ?? '';
  assert.match(fn, /const prescribedRest = Math\.max\(0, \.\.\.members\.map\(\(e2\) => e2\.sets\[si\]\?\.restSec \?\? 0\)\);/);
  assert.match(fn, /if \(!holdRest && prescribedRest > 0\) startRestFor\(prescribedRest\);/);
  assert.match(fn, /else if \(restMode === 'auto' && !holdRest\) startRest\(\);/, "the athlete's own setting still runs everything else");
  assert.match(WORKOUT, /const startRest = useCallback\(\(\) => startRestFor\(restSec\), \[startRestFor, restSec\]\);/);
});

test('a ramp never carries the last rung\'s weight — both the tick and the box follow the set\'s own %', () => {
  assert.match(WORKOUT, /earlier\.find\(\(s\) => s\.done && s\.weight != null && \(set\.targetPct == null \|\| s\.targetPct === set\.targetPct\)\)\?\.weight/);
  assert.match(WORKOUT, /if \(own\?\.targetPct != null\) \{[\s\S]{0,300}if \(own\.targetWeight != null\) return String\(own\.targetWeight\);/);
});

test('the maxes chip and sheet: changeable any time, saved to the athlete, redrawing with withMaxes', () => {
  assert.match(WORKOUT, /<LiftMaxSheet\s+open\s+onClose=\{\(\) => setMaxesOpen\(false\)\}\s+programId=\{null\}/);
  assert.match(WORKOUT, /mutate\(\(s\) => \(\{ \.\.\.s, exercises: withMaxes\(s\.exercises, load\) \}\)\)/);
  assert.match(WORKOUT, /onPress=\{\(\) => void openMaxes\(\)\}/);
  assert.match(WORKOUT, /accessibilityLabel="How this workout works"/);
});

test('the post opens in full; the feed card opens it; the composer can post a written one with its notes', () => {
  assert.match(POST, /isPostedWorkout\(post\.layout\) \? \(\s*\/\*[\s\S]*?\*\/\s*<PostedWorkoutPanel card=\{post\.layout\} postId=\{post\.id\} \/>/);
  assert.match(FEED, /onTake=\{\(\) => onTake\(posted\)\} onOpen=\{onOpen\}/);
  assert.match(COMPOSER, /router\.push\('\/workout-write'\)/);
  assert.match(COMPOSER, /\.\.\.\(writtenDraft\?\.how \? \{ how: writtenDraft\.how \} : null\)/);
  assert.match(COMPOSER, /clearWrittenDraft\(\);/);
});

test('templates keep the prescription through their read whitelist', () => {
  assert.match(TEMPLATES, /\.\.\.prescriptionOf\(e\),/);
  assert.match(TEMPLATES, /export interface TemplateExercise extends TemplatePrescription/);
});

const WRITE = read('../workout-write.tsx');

test('pinned posts sit above the feed, are drawn once, with the same card (0230)', () => {
  assert.match(FEED, /const \{ data: pinnedData, refetch: refetchPinned \} = useQuery\(\(\) => fetchPinnedSquadPosts\(squadId\), \[squadId\]\);/);
  assert.match(FEED, /\.filter\(\(p\) => !pinnedPosts\.some\(\(q\) => q\.id === p\.id\)\)/);
  assert.match(FEED, /<Text style=\{styles\.pinnedLabel\}>Pinned<\/Text>\s*\{feedCard\(p, i\)\}/);
  assert.match(FEED, /\{feedPosts\.map\(\(p, i\) => feedCard\(p, i\)\)\}/);
});

test('the owner pins; the author edits; nothing is offered before 0230', () => {
  assert.match(POST, /const canPin = isOwner && !!marks\?\.supported;/);
  assert.match(POST, /const canEdit = !!post && !!myId && post\.authorId === myId && !!marks\?\.supported;/);
  assert.match(POST, /router\.push\(\{ pathname: '\/workout-write', params: \{ edit: post\.id \} \}\)/);
  assert.match(POST, /marks\?\.editedAt \? ' · Edited' : ''/);
});

test('a posted workout reopens as words only when they read back identical, and saves through edit_squad_post', () => {
  assert.match(WRITE, /return roundTrips\(w, resolveKey\) \? rowsToWrittenText\(w\) : '';/);
  assert.match(WRITE, /await editSquadPost\(editId, editPost\.body \?\? '', \{ kind: 'posted-workout'/);
});
