import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * PO 2026-09-28: "I have a couple of people working out but I can only see one of them. It says '2 more from
 * da bois' — should I be able to click a see all button?" The Your Circle card draws one live person; the
 * "N more from …" line must open the list of everyone training (Training Now, each with Join).
 */
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CARD = read('../../components/forge/compositions/YourCircleCard/YourCircleCard.tsx');
const HOME = read('../(tabs)/index.tsx');

test('the "N more from …" line is a button when a see-all handler is given', () => {
  assert.match(CARD, /others && onSeeAllLive \?[\s\S]*?<Pressable\s+onPress=\{onSeeAllLive\}[\s\S]*?See everyone training/);
});

test('Home opens the Training Now list from it — the same sheet Train Together opens', () => {
  assert.match(HOME, /onSeeAllLive=\{\(\) => setFriendSheetOpen\(true\)\}/);
  assert.match(HOME, /<TrainingNowSheet\s+open=\{friendSheetOpen\}[\s\S]*?athletes=\{live\}/);
});
