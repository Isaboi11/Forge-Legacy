import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accSubline,
  canToggleFeatured,
  featuredAccomplishments,
  featuredCount,
  formatAccDate,
  FEATURED_MAX,
  sortAccomplishments,
  validateForm,
} from '../accomplishments.ts';

const ac = (over = {}) => ({
  id: 'a1',
  name: 'Marathon Finisher',
  date: '2026-06-14',
  chapterId: 'ch-3',
  featured: false,
  note: null,
  photoUrl: null,
  createdAt: '2026-06-14T10:00:00Z',
  ...over,
});

// ── ordering ──────────────────────────────────────────────────────────────────

test('accomplishments list most-recent first', () => {
  const list = [
    ac({ id: 'old', createdAt: '2024-01-01T00:00:00Z' }),
    ac({ id: 'new', createdAt: '2026-06-14T10:00:00Z' }),
    ac({ id: 'mid', createdAt: '2025-08-20T00:00:00Z' }),
  ];
  assert.deepEqual(sortAccomplishments(list).map((a) => a.id), ['new', 'mid', 'old']);
});

// ── featured: the top-3 cap is a real limit ─────────────────────────────────────

test('featured returns the starred set, most-recent first, never over the cap', () => {
  const list = [
    ac({ id: 'f1', featured: true, createdAt: '2026-01-01T00:00:00Z' }),
    ac({ id: 'plain', featured: false }),
    ac({ id: 'f2', featured: true, createdAt: '2026-03-01T00:00:00Z' }),
    ac({ id: 'f3', featured: true, createdAt: '2026-02-01T00:00:00Z' }),
    ac({ id: 'f4', featured: true, createdAt: '2026-04-01T00:00:00Z' }),
  ];
  const f = featuredAccomplishments(list);
  assert.equal(f.length, FEATURED_MAX, 'never more than three surface');
  assert.deepEqual(f.map((a) => a.id), ['f4', 'f2', 'f3'], 'the three newest featured, in order');
});

test('you cannot feature a fourth, but can always un-feature or re-feature an existing one', () => {
  const three = [ac({ id: 'f1', featured: true }), ac({ id: 'f2', featured: true }), ac({ id: 'f3', featured: true }), ac({ id: 'p', featured: false })];
  assert.equal(featuredCount(three), 3);
  assert.equal(canToggleFeatured(three, 'p', true), false, 'a fourth star is refused');
  assert.equal(canToggleFeatured(three, 'f1', false), true, 'un-featuring is always allowed');
  assert.equal(canToggleFeatured(three, 'f1', true), true, 'an already-featured item toggling on is a no-op');

  const two = [ac({ id: 'f1', featured: true }), ac({ id: 'f2', featured: true }), ac({ id: 'p', featured: false })];
  assert.equal(canToggleFeatured(two, 'p', true), true, 'a third is fine');
});

// ── form validation ─────────────────────────────────────────────────────────────

test('a name is the only requirement; everything else is optional', () => {
  assert.equal(validateForm({ name: 'Ran first 5K' }).ok, true);
  assert.equal(validateForm({ name: '' }).ok, false);
  assert.equal(validateForm({ name: '   ' }).ok, false, 'whitespace is not a name');
  assert.equal(validateForm({ name: 'x'.repeat(61) }).ok, false, 'over the 60-char cap');
  assert.equal(validateForm({ name: 'ok', note: 'x'.repeat(151) }).ok, false, 'over the 150-char note cap');
  assert.equal(validateForm({ name: 'ok', note: 'a short why' }).ok, true);
});

// ── display ───────────────────────────────────────────────────────────────────

test('the date reads as a plain calendar date, never shifted by a timezone', () => {
  assert.equal(formatAccDate('2026-06-14'), 'Jun 14, 2026');
  assert.equal(formatAccDate('2025-08-20'), 'Aug 20, 2025');
  assert.equal(formatAccDate(null), '', 'an undated milestone shows no date');
  assert.equal(formatAccDate('garbage'), '');
});

test('the sub-line joins date and chapter, dropping whichever is missing', () => {
  const label = (id) => (id === 'ch-3' ? 'Chapter III · The Rebuild' : null);
  assert.equal(accSubline(ac(), label), 'Jun 14, 2026 · Chapter III · The Rebuild');
  assert.equal(accSubline(ac({ chapterId: null }), label), 'Jun 14, 2026', 'no chapter — no trailing dot');
  assert.equal(accSubline(ac({ date: null }), label), 'Chapter III · The Rebuild', 'no date — chapter alone');
  assert.equal(accSubline(ac({ date: null, chapterId: null }), label), '', 'neither — empty, not " · "');
});
