import test from 'node:test';
import assert from 'node:assert/strict';
import { candidatesFromContent, canPinMore, isPinned, pinCountLabel, pinFor, PIN_CAP } from '../pins.ts';

const acc = (over = {}) => ({ id: 'a1', name: 'Marathon Finisher', date: '2026-06-14', chapterId: 'ch-3', featured: false, note: null, photoUrl: null, createdAt: '2026-06-14T10:00:00Z', ...over });
const content = {
  accomplishments: [acc(), acc({ id: 'a2', name: 'First 5K', date: null, chapterId: null })],
  honors: [{ id: 'h1', name: 'Unbroken', dateEarned: 'May 2026' }],
  chapters: [{ id: 'ch-3', name: 'Chapter III · The Rebuild', active: true, sealed: false }],
};

test('candidates span the live kinds, accomplishments first, each with a soft ref and glyph', () => {
  const c = candidatesFromContent(content);
  assert.deepEqual(c.map((x) => x.kind), ['accomplishment', 'accomplishment', 'honor', 'chapter']);
  assert.equal(c[0].refId, 'a1');
  assert.equal(c[0].subtitle, 'Jun 14, 2026 · Chapter III · The Rebuild');
  assert.equal(c[1].subtitle, 'Accomplishment', 'no date, no chapter — a kind label, never an empty line');
  assert.equal(c[2].icon, 'medal');
  assert.equal(c[3].subtitle, 'Active chapter');
});

test('pinned status matches on (kind, refId), not on the denormalized title', () => {
  const c = candidatesFromContent(content);
  const pins = [{ id: 'pin-1', kind: 'accomplishment', refId: 'a1' }];
  assert.equal(isPinned(c[0], pins), true, 'a1 is pinned');
  assert.equal(isPinned(c[1], pins), false, 'a2 is not');
  assert.equal(pinFor(c[0], pins).id, 'pin-1', 'resolves the pin row so it can be removed');

  // A stale pin whose title drifted from the accomplishment still matches by ref.
  const renamedContent = { ...content, accomplishments: [acc({ name: 'Renamed' }), content.accomplishments[1]] };
  assert.equal(isPinned(candidatesFromContent(renamedContent)[0], pins), true, 'ref survives a rename');
});

test('a cross-kind ref collision does not false-match', () => {
  const c = candidatesFromContent(content);
  const pins = [{ id: 'p', kind: 'honor', refId: 'a1' }]; // same id string, different kind
  assert.equal(isPinned(c[0], pins), false, 'accomplishment a1 is not the honor a1');
});

test('the cap makes six a real limit', () => {
  const five = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, kind: 'accomplishment', refId: `r${i}` }));
  assert.equal(canPinMore(five), true);
  assert.equal(pinCountLabel(five), '5 of 6 pinned');
  const six = [...five, { id: 'p5', kind: 'honor', refId: 'r5' }];
  assert.equal(canPinMore(six), false, 'no seventh');
  assert.equal(six.length, PIN_CAP);
});
