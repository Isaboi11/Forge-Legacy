import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spokenAgoAt, timeAgoAt } from '../time-ago.ts';
import { fitWordFontSize } from '../fit-word.ts';

const NOW = Date.parse('2026-09-30T18:00:00Z');
const ago = (ms) => new Date(NOW - ms).toISOString();

test('under a minute is "Just now" — never "0m" (social-24: two posts of one age read differently)', () => {
  assert.equal(timeAgoAt(ago(10_000), NOW), 'Just now');
  assert.equal(timeAgoAt(ago(50_000), NOW), 'Just now', '45–59 s printed "0m" before');
  assert.equal(timeAgoAt(ago(61_000), NOW), '1m');
  assert.equal(timeAgoAt(ago(3 * 3600_000), NOW), '3h');
  assert.equal(timeAgoAt(ago(2 * 86400_000), NOW), '2d');
});

test('the spoken form counts properly (social2-23: "started 1 minutes ago")', () => {
  assert.equal(spokenAgoAt(ago(20_000), NOW), 'just now');
  assert.equal(spokenAgoAt(ago(60_000), NOW), '1 minute ago');
  assert.equal(spokenAgoAt(ago(5 * 60_000), NOW), '5 minutes ago');
  assert.equal(spokenAgoAt(ago(3600_000), NOW), '1 hour ago');
  assert.equal(spokenAgoAt(ago(86400_000), NOW), '1 day ago');
});

test('a heading shrinks only as far as its longest word needs (social2-20: "Alternatin / g")', () => {
  // The iPhone 14 name column is ~117pt; "Alternating" at 25pt did not fit it.
  const size = fitWordFontSize('Alternating Dumbbell Bench Press', 117, 25, 16);
  assert.ok(size < 25 && size >= 16, `got ${size}`);
  assert.ok(11 * 0.5 * size <= 117, 'the longest word fits at the chosen size');
  // Short words keep the full display size — wrapping between words is fine.
  assert.equal(fitWordFontSize('Back Squat', 117, 25, 16), 25);
  // Never below the floor, however long the word.
  assert.equal(fitWordFontSize('Supercalifragilisticexpialidocious', 90, 25, 16), 16);
});
