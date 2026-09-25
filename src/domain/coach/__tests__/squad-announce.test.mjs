/**
 * squad-announce.test.mjs — Holt says "your squad just got a notification" ONLY when it is true.
 *
 * PO, 2026-09-25. The server decides (0217 — `set_training_status` returns `{announced, squads,
 * teammates}`); this file holds the client to believing nothing else, and holds the copy to
 * Holt-Voice-Amendment-002: every variant names what was sent, at most one "!", and the start-of-session
 * energy it allows ("let's kill it today") stays inside this one table.
 *
 * The SQL half (fresh start only; resume → false; the three gates) is asserted by source in
 * `notifications/__tests__/push.test.mjs`, beside the rest of the presence function's tests.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseTrainingAnnouncement, squadAnnouncedLine } from '../squad-announce.ts';
import { SQUAD_ANNOUNCED_LINES, IN_WORKOUT_LINES } from '../rulebook/in-workout-voice.ts';
import { VOICE, resetVoice } from '../rulebook/voice.ts';

const first = () => 0;
const ANNOUNCED = { announced: true, squads: 1, teammates: 4 };

/*
 * HV-D2's list, minus nothing: "kill it" is NOT on it, and "killing it" / "crush it" / "beast" /
 * "let's gooo" / "no days off" / "champ" are, here as everywhere. HV-A2-D2 allows only the start energy.
 */
const CHEESE = /\b(crush(ing|ed)? it|beast( mode)?|let'?s go{3,}|no days off|champ|buddy|king|queen|killing it|slay(ing)?|rock ?star|superstar|legend|great question|you got this bro|grind never stops)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;

const allLines = () =>
  Object.entries(SQUAD_ANNOUNCED_LINES).flatMap(([register, t]) =>
    Object.entries(t).flatMap(([variant, lines]) => lines.map((line) => ({ register, variant, line }))),
  );

// ─────────────────────────────────────────────────────────────────────────────
// ONLY WHEN THE SERVER VOUCHES FOR IT
// ─────────────────────────────────────────────────────────────────────────────

test('a fresh start that notified the squad is announced', () => {
  assert.deepEqual(parseTrainingAnnouncement({ announced: true, squads: 2, teammates: 7 }), {
    announced: true,
    squads: 2,
    teammates: 7,
  });
});

test('a resume / re-assert (announced: false) says nothing', () => {
  const a = parseTrainingAnnouncement({ announced: false, squads: 0, teammates: 0 });
  assert.equal(a?.announced, false);
  resetVoice();
  assert.equal(squadAnnouncedLine({ announcement: a, session: 'Upper A', register: 'plain', slot: 's1' }), null);
});

test('an old server (void → null), an error, or a malformed answer says nothing', () => {
  for (const data of [null, undefined, '', 'true', 1, [], {}, { announced: 'true', squads: 1, teammates: 1 }]) {
    const a = parseTrainingAnnouncement(data);
    assert.equal(a, null, `${JSON.stringify(data)} must not parse`);
    assert.equal(squadAnnouncedLine({ announcement: a, session: 'Upper A', register: 'plain', slot: 's' }), null);
  }
});

test('"announced" to nobody is not an announcement, whatever the flag says', () => {
  assert.equal(parseTrainingAnnouncement({ announced: true, squads: 1, teammates: 0 })?.announced, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE LINE
// ─────────────────────────────────────────────────────────────────────────────

test('names the session when there is one, and reads whole when there is not', () => {
  resetVoice();
  const named = squadAnnouncedLine({ announcement: ANNOUNCED, session: 'Upper A', register: 'plain', slot: 'a' }, first);
  assert.equal(named, "Your squad just got a notification that you started Upper A. Let's get after it.");
  const unnamed = squadAnnouncedLine({ announcement: ANNOUNCED, session: '  ', register: 'plain', slot: 'b' }, first);
  assert.equal(unnamed, "Your squad just got a notification that you started training. Let's get after it.");
});

test('more than one squad reads "your squads"', () => {
  resetVoice();
  const line = squadAnnouncedLine(
    { announcement: { announced: true, squads: 3, teammates: 9 }, session: 'Upper A', register: 'plain', slot: 'c' },
    first,
  );
  assert.match(line, /^Your squads just got a notification/);
});

test('pinned to the start — the same slot keeps its wording across re-renders; the next start varies', () => {
  resetVoice();
  const input = { announcement: ANNOUNCED, session: 'Upper A', register: 'direct', slot: '2026-09-25T10:00:00Z' };
  const a = squadAnnouncedLine(input);
  for (let i = 0; i < 5; i++) assert.equal(squadAnnouncedLine(input), a);
  const b = squadAnnouncedLine({ ...input, slot: '2026-09-26T10:00:00Z' });
  assert.notEqual(b, a, 'the deck never deals the same line twice running');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE COPY — Holt-Voice-Amendment-002
// ─────────────────────────────────────────────────────────────────────────────

test('at least 8 variants, at least 4 per register and wording', () => {
  assert.ok(allLines().length >= 8);
  for (const [register, t] of Object.entries(SQUAD_ANNOUNCED_LINES)) {
    for (const [variant, lines] of Object.entries(t)) {
      assert.ok(lines.length >= 4, `${register}/${variant} has ${lines.length}`);
      assert.equal(new Set(lines).size, lines.length, `${register}/${variant} repeats a line`);
    }
  }
});

test('⭐ every variant names what was sent — the squad, and that it was told', () => {
  for (const { register, variant, line } of allLines()) {
    assert.match(line, /\{squad\}/, `${register}/${variant}: "${line}" does not name the squad`);
    assert.match(line, /notif|pinged|told|got word|heard/i, `${register}/${variant}: "${line}" does not say it was sent`);
  }
});

test('at most one "!", no cheese, no emoji, no grammar that breaks for "squads"', () => {
  for (const { register, variant, line } of allLines()) {
    assert.ok((line.match(/!/g) ?? []).length <= 1, `${register}/${variant} shouts: "${line}"`);
    assert.doesNotMatch(line, CHEESE, `${register}/${variant} is cheesy: "${line}"`);
    assert.doesNotMatch(line, EMOJI, `${register}/${variant}: "${line}"`);
    assert.doesNotMatch(line, /\{squad\} (is|was|has|knows|sees)\b/, `${register}/${variant}: "${line}" breaks for "your squads"`);
  }
});

test('named lines carry {session}; unnamed lines never do', () => {
  for (const { register, variant, line } of allLines()) {
    if (variant === 'named') assert.match(line, /\{session\}/, `${register}/named: "${line}"`);
    else assert.doesNotMatch(line, /\{session\}/, `${register}/unnamed: "${line}"`);
    assert.doesNotMatch(line.replace(/\{(squad|session)\}/g, ''), /[{}]/, `stray token in "${line}"`);
  }
});

test('⚠ the start-of-session energy stays in this table (HV-A2-D2 scope)', () => {
  const ENERGY = /\b(kill it|make them proud|get after it today)\b/i;
  for (const [key, table] of Object.entries(IN_WORKOUT_LINES)) {
    for (const lines of Object.values(table)) for (const l of lines) assert.doesNotMatch(l, ENERGY, `${key}: "${l}"`);
  }
  for (const [key, lines] of Object.entries(VOICE)) for (const l of lines) assert.doesNotMatch(l, ENERGY, `${key}: "${l}"`);
});
