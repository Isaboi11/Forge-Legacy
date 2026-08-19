import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * A COMPETITION MUST BE ABLE TO START, AND IT MUST BE ABLE TO FINISH.
 *
 * ══ THE FAILURE THIS EXISTS FOR ══
 *
 * PO, 2026-08-19: *"look at my competition with @kingmo. It doesn't look like the days have progressed
 * and it should've been done by now from when it started."*
 *
 * There is no scheduler. `advance_challenges()` is the entire lifecycle — ENROLLMENT → ACTIVE when the
 * start time passes, ACTIVE → COMPLETED (writing `challenge_results`, which is what crowns a winner)
 * when the end time does — and it runs only when a screen calls it. Three separate things could each
 * stop a season dead, and all three were true at once:
 *
 *   1. `advance_challenges` is one of SIX objects `0059_challenges.sql` and `0087_friend_challenges.sql`
 *      both define, and 0059's is SQUAD-ONLY. Re-pasting 0059 — the documented recovery procedure in
 *      this project, because there is no CLI and no service key — reverts it, and every friends
 *      competition then sits at its start date forever. `0165` hardened FOUR of the six and its header
 *      says "four objects"; `advance_challenges` and `challenge_hub` were the two it missed, and they
 *      are the two that decide whether a competition moves at all. 0168 closes them.
 *
 *   2. Only `/competitions` and the Trophy Case called it. `challenge_hub()` lists competitions you have
 *      NOT joined (ENROLLMENT or ACTIVE) and ones you HAVE (ACTIVE only) — so a competition you joined
 *      that is stuck in ENROLLMENT appears in NEITHER, and the hub is not reachable from it. The routes
 *      that survive are the inbox row and the push, and both open `/challenge/<id>`, which did not
 *      advance anything. The one screen a stuck season was reachable from could not un-stick it.
 *
 *   3. The call discarded its result. `await supabase.rpc('advance_challenges', …)` — supabase-js
 *      REJECTS NOTHING, it resolves `{ data, error }`. Every failure above rendered as a healthy screen.
 *
 * ══ WHAT THIS CAN AND CANNOT SEE ══
 *
 * It cannot see the live database — a re-paste happens in the SQL editor and leaves no trace in the repo;
 * `0168` §2 is the guard for that and asserts against `pg_proc` at apply time. What this catches is the
 * repo half: a future migration rebuilding the lifecycle from 0059's body, and any screen quietly going
 * back to advancing nothing or to swallowing the answer.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const MIGRATIONS = resolve(ROOT, 'supabase/migrations');

const FILES = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .sort();

/** The last migration that defines `marker`, and the text of that definition. Newest wins in Postgres. */
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

/* ══ THE MIGRATION HALF — the two objects 0165 did not cover ══ */

/**
 * Positive tell. 0087's body scopes on "a competition I can read"; 0059's does not have the call at all.
 */
test('the newest advance_challenges scopes on can_read_challenge, not on squad membership', () => {
  const { file, body } = newestDefinition('create or replace function public.advance_challenges', '$$;');
  assert.match(
    body,
    /can_read_challenge/,
    `${file} holds the newest \`advance_challenges\` and it never calls can_read_challenge — that is 0059's SQUAD-only body, and no friends competition will ever start or finish under it`,
  );
});

/**
 * Negative tell, and it is a SEPARATE assertion on purpose. A body could plausibly gain a
 * `can_read_challenge` call while keeping 0059's squad gate beside it, which would pass the test above
 * and still exclude every friends competition. 0160's lesson, one table over: a check that only tests
 * what must be present cannot see what was left behind.
 */
test('the newest advance_challenges does not still gate on is_squad_member', () => {
  const { file, body } = newestDefinition('create or replace function public.advance_challenges', '$$;');
  assert.doesNotMatch(
    body,
    /is_squad_member/,
    `${file}: advance_challenges still carries 0059's \`context = 'SQUAD' and is_squad_member(...)\` gate — a friends competition cannot start or finish`,
  );
});

/** Both clauses matter, and only one of them is the one people think about. */
test('advance_challenges both starts a due competition and finishes an ended one', () => {
  const { file, body } = newestDefinition('create or replace function public.advance_challenges', '$$;');
  assert.match(body, /state = 'ENROLLMENT' and ch\.start_at <= now\(\)/, `${file}: the ENROLLMENT → ACTIVE promotion is gone — competitions would never start`);
  assert.match(body, /state = 'ACTIVE' and ch\.end_at <= now\(\)/, `${file}: the ACTIVE → COMPLETED close is gone — competitions would never end`);
  assert.match(body, /insert into public\.challenge_results/, `${file}: nothing writes challenge_results — a season would close with no winner, and the podium would have nothing to play`);
});

test('the newest challenge_hub still knows FRIENDS exists', () => {
  const { file, body } = newestDefinition('create or replace function public.challenge_hub', '$$;');
  assert.match(
    body,
    /FRIENDS/,
    `${file} holds the newest \`challenge_hub\` and it is SQUAD-only — that is 0059's body, and every friends competition disappears from C-1`,
  );
});

/**
 * And the guard itself has to keep guarding. 0165 asserted four objects and its own header said "four";
 * the count was the bug. 0168 exists to name the other two, so it must keep naming both.
 */
test('0168 asserts the two lifecycle objects 0165 left unguarded', () => {
  const text = readFileSync(resolve(MIGRATIONS, '0168_challenge_lifecycle_reassert.sql'), 'utf8');
  const at = text.indexOf('2 · THE ASSERTIONS 0165 SHOULD HAVE CARRIED');
  assert.notEqual(at, -1, '0168 lost its assertion section');
  const guard = text.slice(at);
  assert.match(guard, /advance_challenges is on 0059/, '0168 must raise when advance_challenges is on 0059’s body');
  assert.match(guard, /challenge_hub is on 0059/, '0168 must raise when challenge_hub is on 0059’s body');
});

/* ══ THE CLIENT HALF ══ */

const CHALLENGES_LIVE = readFileSync(resolve(ROOT, 'src/data/challenges-live.ts'), 'utf8');

/** The body of a top-level exported function in `challenges-live.ts`. */
function fn(name) {
  const at = CHALLENGES_LIVE.indexOf(`export async function ${name}`);
  assert.notEqual(at, -1, `${name} is gone from challenges-live.ts`);
  const end = CHALLENGES_LIVE.indexOf('\n}', at);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  return CHALLENGES_LIVE.slice(at, end);
}

/**
 * THE ONE THAT WOULD HAVE CAUGHT THE REPORT.
 *
 * A competition stuck in ENROLLMENT is on neither of the hub's two lists, so the hub cannot be the only
 * place that advances it. `/challenge/<id>` is where the invite, the push and the inbox row all land,
 * and it is the last surface a stuck season is reachable from.
 */
test('opening a competition advances its lifecycle', () => {
  assert.match(
    fn('fetchChallengeDetail'),
    /advanceChallenges\(\)/,
    'fetchChallengeDetail no longer advances the lifecycle — a competition stuck in ENROLLMENT is on neither hub list, so this screen is the only place left that can start it',
  );
});

test('the hub still advances the lifecycle', () => {
  assert.match(fn('fetchChallengeHub'), /advanceChallenges\(\)/, 'fetchChallengeHub no longer advances the lifecycle');
});

/**
 * And the answer is never thrown away. This is the assertion that would have turned six weeks of "it
 * looks fine" into one sentence on screen.
 */
test('a refused lifecycle advance is reported, not discarded', () => {
  const body = fn('advanceChallenges');
  assert.match(body, /const \{ error \} = await supabase\.rpc\('advance_challenges'/, 'advanceChallenges must destructure the error — supabase-js resolves {data, error} and rejects nothing');
  assert.match(body, /return errorMessage\(error\)/, 'advanceChallenges must return the failure so a screen can say it');

  assert.doesNotMatch(
    CHALLENGES_LIVE,
    /^\s*await supabase\.rpc\('advance_challenges'/m,
    'a bare `await supabase.rpc(\'advance_challenges\')` is back — that call resolves {data, error} and discards every failure, which is exactly how a competition sat at its start date with every screen looking healthy',
  );

  const trophy = readFileSync(resolve(ROOT, 'src/data/trophy-case-live.ts'), 'utf8');
  assert.doesNotMatch(trophy, /supabase\.rpc\('advance_challenges'/, 'the Trophy Case must go through the shared advanceChallenges, not its own bare RPC');
});

/** Both screens carry the failure, so it cannot be reported by the data layer into nothing. */
test('both competition screens surface a refused advance', () => {
  for (const path of ['src/app/competitions.tsx', 'src/app/challenge/[id].tsx']) {
    const src = readFileSync(resolve(ROOT, path), 'utf8');
    assert.match(src, /advanceError/, `${path} no longer renders advanceError — the data layer would be reporting the failure to nobody`);
  }
});

/**
 * THE CORONATION FIRES FROM THE SCREEN THAT CLOSES THE SEASON.
 *
 * Because C-3 now advances on the way in, C-3 is very often the screen that actually completes a
 * competition — an invited friend arrives from the inbox and the season ends as they land. If only the
 * hub could open the ceremony, the athlete who caused the completion would be handed a static button and
 * the coronation would wait for a screen they had no reason to visit.
 */
test('a finished competition opens its podium from the competition screen', () => {
  const src = readFileSync(resolve(ROOT, 'src/app/challenge/[id].tsx'), 'utf8');
  assert.match(src, /getSeenPodiums/, 'C-3 must consult the played-ceremony set — otherwise the podium replays on every open');
  assert.match(src, /pathname: '\/podium\/\[id\]'/, 'C-3 no longer opens the podium for a finished season — the winner is never crowned from the screen that closed it');
});

test('the hub still opens the podium for a season that just closed', () => {
  const src = readFileSync(resolve(ROOT, 'src/app/competitions.tsx'), 'utf8');
  assert.match(src, /pathname: '\/podium\/\[id\]'/, 'the hub no longer opens the podium');
  assert.match(src, /podiumIsFresh/, 'the hub must keep its freshness gate — a LIST must not ambush an athlete with a season that closed last month');
});

/* ══ THE CREATION HALF — a competition must be the length you asked for ══ */

/**
 * PO, 2026-08-19: *"I made a 2 day competition for me and king mo."* The row says **three** days, and
 * that is why it had not finished when it should have. `Math.max(3, …)` in Create Challenge's custom
 * field moved it, left the `2` sitting in the input, and said nothing — the field and the run summary
 * below it disagreed, which is the precise split that clamp was written to close.
 *
 * ⛔ AND 3 WAS NEVER THE RULE. `Create-Challenge-Wireframe-Spec-C2` §4.3 says the custom range must be
 *   ≥ 1 day and leads its presets with **Daily**; `challenges` only constrains `end_at > start_at`.
 */
test('a competition can be as short as the spec says it can', () => {
  const spec = readFileSync(resolve(ROOT, 'Docs/Create-Challenge-Wireframe-Spec-C2.md'), 'utf8');
  assert.match(spec, /Custom range must be ≥ 1 day/, 'C-2’s minimum-duration rule moved — the floor in the screen is derived from it, so revisit both together');

  const src = readFileSync(resolve(ROOT, 'src/app/create-challenge.tsx'), 'utf8');
  assert.match(src, /const MIN_DAYS = 1;/, 'the custom-duration floor is no longer 1 day — a 2-day competition silently became a 3-day one the last time this was wrong');
  assert.match(src, /\{ days: 1, label: 'Daily'/, 'the Daily preset is gone — a short competition then has to go through the custom field and its floor');

  /* The clamp expression itself, not the file — the prose above this test quotes `Math.max(3, …)` while
     explaining the defect, and a bare search for it matches the explanation as readily as a relapse. */
  const clamp = src.split('\n').find((l) => l.includes('const durationDays ='));
  assert.ok(clamp, 'the durationDays clamp is gone');
  assert.match(clamp, /Math\.max\(MIN_DAYS, parseInt\(customDays/, `the floor is a literal again, not MIN_DAYS: ${clamp.trim()}`);
  assert.match(clamp, /Math\.min\(MAX_DAYS,/, `the ceiling is a literal again, not MAX_DAYS: ${clamp.trim()}`);
});

/** A clamp that rewrites what somebody typed has to say so where they typed it. */
test('a clamped duration is stated, not applied behind the field', () => {
  const src = readFileSync(resolve(ROOT, 'src/app/create-challenge.tsx'), 'utf8');
  assert.match(src, /const clamped = preset === 'custom'/, 'nothing detects that the entered duration was overridden');
  assert.match(src, /A competition runs at least \$\{MIN_DAYS\} day/, 'the athlete is not told their duration was changed');
});

/**
 * The hero's arithmetic stays in `domain/challenges/season.ts`, where it is unit-tested against the real
 * dates of the competition that produced the report (`season.test.mjs`). Inlining it back into the screen
 * is how it got to be wrong in three ways at once with nothing able to see it — the screen cannot be
 * loaded under `node --test`.
 */
test('the season maths is not re-inlined into the screen', () => {
  const src = readFileSync(resolve(ROOT, 'src/app/challenge/[id].tsx'), 'utf8');
  assert.match(src, /seasonClock\(c\.startAt, c\.endAt, c\.state, now\)/, 'C-3 must get its season clock from the tested domain module');
  assert.doesNotMatch(
    src,
    /Math\.ceil\(totalDays \/ 7\)/,
    'the week-grid segment count is back in the screen — it draws a 3-day competition as one bar that can never pass 43%, which is the 2026-08-19 report verbatim',
  );
});
