import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { scheduleSlots } from '../../program/progress-core.ts';
import { destinationFor } from '../destination.ts';
import { NOTIF_DEFAULTS, NOTIF_SECTIONS } from '../../settings/notifications.ts';
import {
  BRIEFING_DEFAULT,
  BRIEFING_HOURS,
  describeDays,
  formatHour,
  sanitizeBriefing,
} from '../../settings/briefing.ts';

/**
 * The morning briefing (0159) — the first notification in this app that nobody causes.
 *
 * Two things here are not ordinary unit tests and are the reason the file exists.
 *
 * ⚠ ONE. `briefing_day` is a THIRD copy of a rule that already existed twice — `trainingDays()` in
 * TypeScript and the `sized` CTE in 0119's `program_slots`. The rule is that a day with no warmup, no
 * main and no cooldown is not a session you owe, so `day_index` indexes the FILTERED list. A resolver
 * that indexed the raw array would not throw; it would name the wrong workout, on the one screen the
 * athlete cannot check it against, and only for programs containing an empty day. The migration pins
 * itself against golden vectors at apply time; this parses those same vectors and runs the TypeScript
 * twin over them, so the two walkers are held to one set of numbers written once.
 *
 * ⚠ TWO. `briefing_lines` is the table a well-meaning edit puts "back at it!" into. DNA §10 bans "days
 * since workout" shame mechanics, `Calendar-System-Architecture-v1.0` CAL-D19 says the app "never
 * notifies about inactivity", and `Home-Screen-Wireframe-Spec-H1.md` fails H-1 when it "communicates what
 * the athlete has NOT done". None of those can be enforced by a type. This is the enforcement, and it
 * carries its own positive controls so it cannot rot into a regex that matches nothing.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SQL = readFileSync(resolve(ROOT, 'supabase/migrations/0159_training_briefing.sql'), 'utf8');
const SQL_0119 = readFileSync(resolve(ROOT, 'supabase/migrations/0119_program_session_log.sql'), 'utf8');

/** One SQL function body, comments stripped — a commented-out line must not read as present. */
function fnBody(name) {
  const start = SQL.indexOf(`function public.${name}(`);
  assert.notEqual(start, -1, `${name} is missing from 0159`);
  const open = SQL.indexOf('as $$', start);
  const close = SQL.indexOf('$$;', open);
  return SQL.slice(open, close)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, '');
}

// ── the day resolver agrees with the TypeScript it is a copy of ───────────────

test('the golden vectors in the migration are the ones scheduleSlots() produces', () => {
  const m = SQL.match(/v_cases jsonb := '([\s\S]*?)'::jsonb;/);
  assert.ok(m, "0159's golden-vector block is missing or no longer parseable — this test pins it");

  const cases = JSON.parse(m[1]);
  assert.ok(cases.length >= 5, 'the vector set has shrunk — an empty-day case must always be present');

  for (const c of cases) {
    const slot = scheduleSlots(c.structure).find((s) => s.weekIndex === c.week && s.dayIndex === c.day);
    assert.ok(slot, `no slot at week ${c.week}, day ${c.day} for ${JSON.stringify(c.structure)}`);
    assert.ok(slot.day, `slot at week ${c.week}, day ${c.day} has no day behind it`);

    const name = slot.day.name.trim() || `Day ${slot.day.letter}`;
    assert.equal(name, c.name, `scheduleSlots() names this session '${name}', the migration expects '${c.name}'`);
    assert.equal(
      slot.day.main.length,
      c.count,
      `scheduleSlots() counts ${slot.day.main.length} exercises, the migration expects ${c.count}`,
    );
  }
});

/**
 * At least one vector must be a program with an EMPTY DAY between two real ones.
 *
 * That is the only shape where indexing the raw array and indexing the filtered one give different
 * answers, so a vector set without it would pass against a resolver with the bug in it.
 */
test('the vectors include the case that separates a filtered index from a raw one', () => {
  const cases = JSON.parse(SQL.match(/v_cases jsonb := '([\s\S]*?)'::jsonb;/)[1]);

  const trap = cases.find((c) => {
    const days = c.structure.days ?? [];
    const emptyAt = days.findIndex(
      (d) => (d.warmup ?? []).length + (d.main ?? []).length + (d.cooldown ?? []).length === 0,
    );
    return emptyAt !== -1 && emptyAt < days.length - 1;
  });
  assert.ok(trap, 'no vector has an empty day followed by a real one — the off-by-one would go unnoticed');

  // And prove it actually separates: the raw array at that index is a DIFFERENT day from the answer.
  const raw = trap.structure.days[trap.day];
  assert.notEqual(raw.name.trim() || `Day ${raw.letter}`, trap.name, 'the trap vector no longer traps anything');
});

test('the resolver filters on the same predicate 0119 counts on', () => {
  // Both files must agree on what an empty day is. Compared as normalised text: this is one rule living
  // in two places, and the only thing that keeps them together is that somebody notices.
  const squash = (s) => s.replace(/\s+/g, ' ');
  const predicate =
    "(case when jsonb_typeof(d.value->'warmup') = 'array' then jsonb_array_length(d.value->'warmup') else 0 end)";
  assert.ok(squash(fnBody('briefing_day')).includes(squash(predicate)), "briefing_day's filter has drifted");
  assert.ok(
    squash(SQL_0119).includes(squash("jsonb_typeof(d->'warmup')   = 'array' then jsonb_array_length(d->'warmup')")),
    '0119 no longer carries the predicate this was copied from — re-derive both together',
  );
});

// ── the copy can never comment on what was not done ───────────────────────────

/**
 * The words a briefing may not contain.
 *
 * Broad on purpose: every one of these is a way of saying "you did not train", and the failure mode is
 * somebody adding a line that feels encouraging in isolation ("Back at it!") without noticing it only
 * makes sense as a remark about an absence.
 */
const FORBIDDEN =
  /\b(still|again|finally|miss(ed|ing)?|skip(ped)?|haven'?t|hasn'?t|didn'?t|streak|since your|days? since|been a while|back at it|last (time|workout|session)|overdue|behind|lapsed|slacking|no excuses|come on)\b/i;

function briefingLines() {
  const block = SQL.slice(
    SQL.indexOf('insert into public.briefing_lines'),
    SQL.indexOf('on conflict (register, idx) do nothing'),
  );
  const out = [];
  for (const m of block.matchAll(/\('(plain|direct)',\s*\d+,\s*'((?:[^']|'')*)'\)/g)) {
    out.push({ register: m[1], text: m[2].replace(/''/g, "'") });
  }
  return out;
}

test('the guard catches the lines it exists to catch', () => {
  // Positive controls. Without these the regex could rot into one that matches nothing and every
  // assertion below would still pass — which is exactly how a guard stops guarding anything.
  for (const bad of [
    'Back at it — let’s go.',
    'It’s been a while. Time to train.',
    'You missed Monday, so start here.',
    'Keep your streak alive.',
    'Still waiting on that session.',
    'Day 4 since your last workout.',
  ]) {
    assert.match(bad, FORBIDDEN, `the shame guard no longer catches "${bad}"`);
  }
});

test('no briefing line refers to elapsed time or anything undone', () => {
  const lines = briefingLines();
  assert.equal(lines.length, 12, 'the copy table parsed short — the seed or this parser has drifted');

  for (const { register, text } of lines) {
    assert.doesNotMatch(
      text,
      FORBIDDEN,
      `"${text}" (${register}) comments on what the athlete has not done — CAL-D19 / DNA §10`,
    );
    // It also may not claim to know the date. There is no calendar in this app.
    assert.doesNotMatch(text, /\btoday\b|\btonight\b|\bthis morning\b/i, `"${text}" claims to know the day`);
  }
});

test('the quiet register has no lines at all', () => {
  // CI-D5: `reminders` is the facts and nothing else. A row here would be a hype line delivered to the
  // one athlete who explicitly asked not to receive them.
  assert.equal(briefingLines().filter((l) => l.register === 'quiet').length, 0);
  assert.match(SQL, /check \(register in \('plain', 'direct'\)\)/, 'the table must refuse a quiet row');
});

// ── the sender's own invariants ───────────────────────────────────────────────

/**
 * ⚠ THE QUIET RULE MUST BE A `continue`, NEVER A DIFFERENT MESSAGE.
 *
 * This is the single line separating a briefing from an inactivity notification. `last_count` exists so
 * the sender can STOP; the moment it instead selects different copy ("still waiting on this one"), the
 * feature has become the thing CAL-D19 forbids, and it would look like a thoughtful touch in review.
 */
test('an un-trained session makes the briefing go quiet, never change its tune', () => {
  const body = fnBody('briefing_send');
  assert.match(body, /if r\.last_key is not distinct from v\.item_key and r\.last_count >= 2 then continue; end if;/);

  /*
   * `last_count` may appear in exactly four places, and naming them is the point: the cursor's select,
   * the guard above, the SET target, and the increment. A fifth is the one that would matter — the count
   * reaching the wording — so this goes red on the change worth catching rather than on tidying.
   */
  const reads = [...body.matchAll(/last_count/g)].length;
  assert.equal(reads, 4, `last_count appears ${reads} times — it may only be selected, gate the continue, and increment`);

  /*
   * And the sender cannot word anything at all: it files `v.title` / `v.body` exactly as `briefing_body`
   * returned them. No concatenation, no CASE over the copy — so there is nowhere for a "still waiting on
   * this one" variant to live even if somebody wanted one.
   */
  assert.equal([...body.matchAll(/insert into public\.push_outbox/g)].length, 1);
  assert.match(body, /v\.title,\s*\n\s*v\.body,/, 'the wording must pass through untouched');
  assert.doesNotMatch(body, /\|\|/, 'briefing_send builds a string — all wording belongs to briefing_body');
});

test('the sender refuses every athlete it cannot safely reach', () => {
  const body = fnBody('briefing_send');
  assert.match(body, /p\.tz is not null/, 'a guessed timezone fires at 7am in the wrong city');
  assert.match(body, /push_tokens t\s*\n?\s*where t\.user_id = b\.athlete_id and t\.disabled_at is null/);
  assert.match(body, /push_prefs_allows\(r\.prefs, 'training_briefing'\)/, 'the master toggle must gate the send');
  assert.match(body, /if r\.last_sent_on is not distinct from v_date then continue; end if;/, 'daily, not quarter-hourly');
  assert.match(body, /exception when others then\s*continue;/, 'one bad tz must not stop the run for everyone');
});

test('nothing is sent when there is nothing to say', () => {
  const body = fnBody('briefing_body');
  // The early return, and no fallback copy after it.
  assert.match(body, /if v_facts is null then\s*return;\s*end if;/);
  /*
   * ⚠ SCOPED TO THE STRINGS THAT CAN REACH A LOCK SCREEN, which is `briefing_body`'s literals plus the
   * `briefing_lines` rows (asserted above) — and nothing else.
   *
   * Two wider versions were tried and both are wrong. Scanning the whole FILE goes red on the migration's
   * own header, which quotes the sentence it refuses to send ("Nothing planned — get after it") as the
   * example of the rule. Scanning the whole comment-stripped CODE still goes red, on "…has no day object
   * behind it" inside a `comment on function` doc string — `behind` is a shame word in copy and an
   * ordinary preposition in prose.
   *
   * Neither is a bug, and a guard that cries wolf gets loosened until it catches nothing. The literals in
   * the function that does the wording are the honest boundary.
   */
  const literals = [...body.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
  assert.ok(literals.includes('Next up'), 'the title literal is missing — this parser has drifted');

  for (const lit of literals) {
    assert.doesNotMatch(lit, FORBIDDEN, `briefing_body words "${lit}", which comments on an absence`);
    assert.doesNotMatch(lit, /nothing planned/i, 'an empty schedule is silence, never a prompt to fill it');
    // And it may never claim to know the date — see the migration header. There is no calendar.
    assert.doesNotMatch(lit, /\btoday'?s?\b/i, `briefing_body words "${lit}", which claims to know the day`);
  }
});

test('the briefing is worded from coachIntensity and never from experience', () => {
  const body = fnBody('briefing_body');
  assert.match(body, /app_prefs->>'coachIntensity'/);
  // CI-D8: experience is device-local, so the server resolves the `beginner` row — `push` speaks in
  // `plain`, never `direct`. A mapping that promoted `push` would be louder than the dial has earned.
  assert.match(body, /when 'reminders' then 'quiet'/);
  assert.match(body, /when 'drive'\s+then 'direct'/);
  assert.match(body, /else 'plain'/);
});

test('the push is deduplicated on the athlete’s own day, not on now()', () => {
  const body = fnBody('briefing_send');
  // 0120's `push_outbox_event_uk` keys on (user, kind, event_at, id) — a local-midnight stamp makes a
  // second run of the same day collapse rather than double-send.
  assert.match(body, /date_trunc\('day', v_local\) at time zone r\.tz/);
  assert.match(body, /on conflict do nothing/);
});

// ── the client agrees ─────────────────────────────────────────────────────────

test('a tapped briefing opens Home rather than the workout it named', () => {
  assert.equal(destinationFor({ kind: 'training_briefing' }), '/');
  assert.match(fnBody('briefing_send'), /'\/'\s*\n?\s*\)/, "the sender's route must be Home too");
});

test('the briefing defaults off, like every other ambient category', () => {
  assert.equal(NOTIF_DEFAULTS.training_briefing, false);
  const section = NOTIF_SECTIONS.find((s) => s.key === 'briefing');
  assert.ok(section, 'the Morning Briefing section is missing from the settings screen');
  assert.equal(section.toggles.length, 1);
});

// ── the schedule shape ────────────────────────────────────────────────────────

test('a stored schedule is read back against the current shape', () => {
  assert.deepEqual(sanitizeBriefing(null), BRIEFING_DEFAULT);
  assert.deepEqual(sanitizeBriefing({ days: [3, 1, 1, 9, 0], hour: 6 }), { days: [1, 3], hour: 6 });
  // Out-of-range and junk fall to the default rather than to silence.
  assert.deepEqual(sanitizeBriefing({ days: [], hour: 99 }), BRIEFING_DEFAULT);
  assert.deepEqual(sanitizeBriefing({ days: 'monday', hour: '7' }), BRIEFING_DEFAULT);
  // Days always come back in week order, whatever order they were stored in.
  assert.deepEqual(sanitizeBriefing({ days: [7, 2, 5] }).days, [2, 5, 7]);
});

test('the default schedule is every day, which the quiet rule makes reasonable', () => {
  assert.deepEqual(BRIEFING_DEFAULT.days, [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(BRIEFING_HOURS.includes(BRIEFING_DEFAULT.hour), 'the default hour must be offered by the picker');
  // Mornings only — the feature is a morning briefing and an evening option would be a different one.
  assert.ok(Math.max(...BRIEFING_HOURS) < 12);
});

test('the schedule reads back as a sentence', () => {
  assert.equal(describeDays([1, 2, 3, 4, 5, 6, 7]), 'Every day');
  assert.equal(describeDays([1, 2, 3, 4, 5]), 'Weekdays');
  assert.equal(describeDays([6, 7]), 'Weekends');
  assert.equal(describeDays([1, 3, 5]), 'Mon, Wed, Fri');
  assert.equal(formatHour(7), '7:00 AM');
  assert.equal(formatHour(0), '12:00 AM');
  assert.equal(formatHour(12), '12:00 PM');
  assert.equal(formatHour(13), '1:00 PM');
});
