/**
 * Launch QA 11-08 — Train Together: H1 (the yes only reached an asker whose wait screen was still open; Join again
 * made a duplicate), H3 (someone mid-workout could only drop the join or lose their sets), H4 ("Never Alone" fired a
 * workout late; a failed partner write vanished), H5 (one accepted ask tagged every workout for 12 hours).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unspentCredits } from '../../domain/workout/partner-credit.ts';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('H1 — one open ask per host, and coming back to them resumes it', () => {
  const live = read('../../data/train-together-live.ts');
  assert.match(live, /const open = await fetchMyOpenJoinRequest\(input\.hostId\);\n\s+if \(open\?\.status === 'PENDING'\) return open\.id;/);
  assert.match(read('../workout-join.tsx'), /if \(live && open\) setRequestId\(\(cur\) => cur \|\| open\.id\);/);
});

test('H3 — the resume prompt offers to save the open workout and start the new one', () => {
  const logger = read('../workout.tsx');
  assert.match(logger, /secondaryLabel=\{pendingLaunch \? 'Save this one & start the new one' : undefined\}/);
  assert.match(logger, /else await saveWorkout\(resumable, \[\], \[\], units\);/);
  assert.match(read('../../components/forge/WorkoutEntry.tsx'), /\{secondaryLabel && onSecondary \? \(/);
});

test('H4 — the partner write is checked, and honors are asked again once partners are on the row', () => {
  const save = read('../../domain/workout/save.ts');
  assert.match(save, /if \(annotationError\) reportError\(annotationError/);
  assert.match(save, /else if \(partners\.length\) \{\n\s+const \{ error: honorError \} = await supabase\.rpc\('claim_earned_honors'\);/);
});

test('H5 — an accept is spent by the first workout saved after it', () => {
  const at = '2026-11-08T08:00:00.000Z';
  const c = [{ athleteId: 's', acceptedAt: at }];
  assert.equal(unspentCredits(c, []).length, 1, 'nothing saved since: still owed');
  assert.equal(unspentCredits(c, [Date.parse('2026-11-08T07:00:00.000Z')]).length, 1, 'a workout BEFORE the accept spends nothing');
  assert.equal(unspentCredits(c, [Date.parse('2026-11-08T09:00:00.000Z')]).length, 0, 'the shared workout spent it');
  assert.match(read('../../data/train-together-live.ts'), /const unspent = unspentCredits\(others, savedAtMs\);/);
});
