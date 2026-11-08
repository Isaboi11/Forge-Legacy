/**
 * Launch QA 11-08 — H7 (Friends & Squad → Workout posted an empty discussion), H10 (Request to Join skipped the
 * Free squad cap), H23 (a sent program showed the recipient the sender's words to Holt), H36 (Delete Account did
 * not say an App Store subscription keeps billing).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('H7 — only a squad-only post offers the types the friends writer cannot carry', () => {
  assert.match(read('../squad-composer.tsx'), /\.filter\(\(t\) => audience === 'SQUAD' \|\| offeredToFriends\(t\.id\)\)/);
});

test('H10 — both Request to Join doors ask the squad cap first', () => {
  assert.match(read('../discover-squads.tsx'), /const onRequest = \(s: DiscoverSquad\) =>\n\s+guard\('squads'\) &&/);
  assert.match(read('../squad-preview.tsx'), /onPress: \(\) => \{\n\s+if \(!guard\('squads'\)\) return;\n\s+setNote\(''\);/);
});

test('H23 — a shared program carries no Holt note, on any day or week plan', async () => {
  const src = read('../../data/program-shares-live.ts');
  assert.match(src, /p_structure: shareableStructure\(structure\)/);
  const { withoutNote } = await import('../../domain/coach/holt-marks.ts');
  const day = { name: 'Legs', exercises: [], holtNote: { what: 'Swapped squats', asked: 'my knee hurts', was: { name: 'Legs', exercises: [] } } };
  assert.equal('holtNote' in withoutNote(day), false);
  assert.match(src, /weekPlans: structure\.weekPlans \? structure\.weekPlans\.map\(\(w\) => \(\{ \.\.\.w, days: w\.days\.map\(withoutNote\) \}\)\)/);
});

test('H36 — Delete Account says the App Store subscription is not cancelled by it', () => {
  const src = read('../account-settings.tsx');
  assert.match(src, /Deleting your account doesn’t cancel it/);
  assert.match(src, /https:\/\/apps\.apple\.com\/account\/subscriptions/);
});
