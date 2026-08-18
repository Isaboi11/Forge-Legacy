import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * THE JOIN BUTTON AND THE TABLE MUST AGREE — and where they cannot, the app must say so in English.
 *
 * Every fault in this file is the same shape: a surface offers a Join that `challenge_participants_insert`
 * then refuses, and the athlete sees `new row violates row-level security policy … (42501)` in a toast.
 * There are two ways to get there and both have happened:
 *
 *   · THE POLICY DRIFTS AWAY FROM THE SURFACES — a migration rebuilds it from 0059's squad-only body.
 *     Guarded by the first three tests, statically, before anything is ever pasted.
 *   · THE LIST GOES STALE — the competition is called off (0067) or runs out while a screen sits open.
 *     UNAVOIDABLE and not a fault: the list is a snapshot and the policy is live. Reported 2026-08-17,
 *     against a CANCELLED competition. Guarded by the last two tests, which require the app to translate
 *     the refusal and to refresh the list that produced it.
 *
 *
 * ══ THE POLICY HALF ══
 *
 * ══ THE FAILURE THIS EXISTS FOR ══
 *
 * `0059_challenges.sql` shipped competitions as SQUAD-only. `0087_friend_challenges.sql` replaced four
 * objects with FRIENDS-aware versions. Both files are idempotent and both are still in the folder — and
 * re-pasting an old migration to recover a half-applied run is the documented recovery procedure here,
 * because there is no CLI and no service key.
 *
 * So the trap is: re-run 0059, and every friends competition in the database silently becomes
 * unjoinable. It presents as `42501` on Join — reported 2026-08-17 — and it presents WEIRDLY, because
 * `challenge_hub()` is SECURITY DEFINER and never consults these policies. The list keeps offering the
 * competition while the table refuses the insert. Nothing logs the disagreement.
 *
 * ══ WHAT THIS CAN AND CANNOT SEE ══
 *
 * It CANNOT see the live database — a re-paste happens in the SQL editor and leaves no trace in the
 * repo. `0165_challenge_policy_reassert.sql` §2 is the guard for that, and it asserts against
 * `pg_policies` at apply time.
 *
 * What this catches is the other half: a FUTURE migration rebuilding one of these from 0059's body,
 * which is the same mistake 0088, 0092 and 0106 each made with `notification_events_for` and which
 * `push.test.mjs` now guards there. Newest definition wins, so newest definition is what is checked.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const MIGRATIONS = resolve(ROOT, 'supabase/migrations');

const FILES = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .sort();

/** The last migration that defines `marker`, and the text of that definition. */
function newestDefinition(marker, terminator) {
  let found = null;
  for (const file of FILES) {
    const text = readFileSync(resolve(MIGRATIONS, file), 'utf8');
    const at = text.indexOf(marker);
    if (at === -1) continue;
    const end = text.indexOf(terminator, at);
    assert.notEqual(end, -1, `${file}: ${marker} has no ${terminator.trim()} terminator`);
    found = { file, body: text.slice(at, end) };
  }
  assert.ok(found, `no migration defines ${marker}`);
  return found;
}

const OBJECTS = [
  ['create policy challenges_select on public.challenges', '\n);'],
  ['create policy challenges_insert on public.challenges', '\n);'],
  ['create policy challenge_participants_insert on public.challenge_participants', '\n);'],
  ['create or replace function public.can_read_challenge', '$$;'],
];

test('the newest definition of every friends-competition object still knows FRIENDS exists', () => {
  for (const [marker, terminator] of OBJECTS) {
    const { file, body } = newestDefinition(marker, terminator);
    assert.ok(
      body.includes('FRIENDS'),
      `${file} holds the newest \`${marker}\` and it is SQUAD-only — that is 0059's body, and it makes every friends competition unjoinable while challenge_hub() keeps listing it`,
    );
  }
});

/**
 * And the insert policy keeps its late-join window.
 *
 * 0163 widened the two surfaces that OFFER a competition — the invite notification and the hub's "Open
 * to Join" row — from `ENROLLMENT` to `ENROLLMENT or ACTIVE`, on the grounds that this policy had
 * permitted a late join since 0087. Narrow the policy and those surfaces start offering a Join the
 * table refuses: the exact list-and-button disagreement above, arrived at from the other direction.
 */
test('joining a competition that has already started stays legal at the table', () => {
  const { file, body } = newestDefinition(
    'create policy challenge_participants_insert on public.challenge_participants',
    '\n);',
  );
  assert.match(
    body,
    /c\.state in \('ENROLLMENT', 'ACTIVE'\)/,
    `${file}: the insert policy must keep allowing an ACTIVE competition — 0163's Join row depends on it`,
  );
});

/**
 * 0059 must carry the warning, because the warning is the only thing standing between the next
 * half-applied run and a silent reversion. A comment is a weak guard; it is also the only one that
 * reaches somebody about to paste a file into a SQL editor.
 */
test('0059 warns that it is superseded', () => {
  const text = readFileSync(resolve(MIGRATIONS, '0059_challenges.sql'), 'utf8');
  assert.match(text, /DO NOT RE-RUN THIS FILE/, '0059 lost its supersession warning');
  assert.match(text, /0165_challenge_policy_reassert/, '0059 must name the file that repairs a re-run');
});

/*
 * ══ THE STALE-LIST HALF ══
 *
 * Source-level, like `push.test.mjs`'s SQL assertions, because `challenges-live.ts` constructs the
 * Supabase client at import and cannot be loaded under `node --test`.
 */

/**
 * A refused join must not reach the athlete as a Postgres error code.
 *
 * `42501` is what the table says when the competition is no longer in ENROLLMENT or ACTIVE — called off,
 * finished, archived — and it went to the PO's screen verbatim on 2026-08-17. `23505` is the same race
 * from the other side: the row is already there, from a double tap or a join that landed. Both are
 * ordinary answers to a question that had gone stale, and neither is a fault worth showing raw.
 *
 * Translated in `joinChallenge` rather than at the call sites, so every surface that can join agrees.
 */
test('a refused join is explained in English, not in error codes', () => {
  const src = readFileSync(resolve(ROOT, 'src/data/challenges-live.ts'), 'utf8');
  const at = src.indexOf('export async function joinChallenge');
  assert.notEqual(at, -1, 'joinChallenge is gone');
  const body = src.slice(at, src.indexOf('\n}', at));

  assert.match(body, /'42501'/, "joinChallenge must translate 42501 — it is what a called-off competition returns, and it reached a PO's toast raw");
  assert.match(body, /'23505'/, 'joinChallenge must translate 23505 — a double tap is not an error worth a code');
  /* Line by line, not a slice from the code onwards. A fixed-length slice from `'42501'` runs into the
     `'23505'` arm below it, so rewriting the first one to `throw error` left this green — found by
     mutation, which is the only way that particular hole is ever visible. */
  for (const code of ['42501', '23505']) {
    const arm = body.split('\n').find((l) => l.includes(`'${code}'`));
    assert.ok(arm, `no line handles ${code}`);
    assert.match(arm, /throw new Error\('[^']{15,}'\)/, `the ${code} arm must throw a sentence of its own, not rethrow the raw error`);
  }
});

/**
 * And the screen that offered the Join must refresh when it is refused.
 *
 * Explaining the failure and leaving the dead row on screen with its button still lit invites the same
 * tap again — the athlete is told "this isn't open any more" by a control that is still offering it. The
 * refetch is part of the answer, not cleanup after it. Both Join surfaces, because 0163 gave the hub row
 * a sibling on C-3 and a fix applied to one of them is a fix applied to half the product.
 */
test('a refused join refreshes the list that offered it', () => {
  for (const [file, handler] of [
    ['src/app/competitions.tsx', 'const onJoin'],
    ['src/app/challenge/[id].tsx', 'const onJoin'],
  ]) {
    const src = readFileSync(resolve(ROOT, file), 'utf8');
    const at = src.indexOf(handler);
    assert.notEqual(at, -1, `${file}: no onJoin handler`);
    const body = src.slice(at, src.indexOf('\n  };', at));
    const rejection = body.slice(body.indexOf('(e: unknown)'));
    assert.ok(rejection.length > 0, `${file}: onJoin has no rejection arm at all`);
    assert.match(rejection, /refetch\(\)/, `${file}: a refused join must refetch, or the button that just failed stays on screen offering the same tap`);
  }
});
