/**
 * program-schedule-wiring.test.mjs — the schedule edits are wired to the safe paths, and stay wired.
 *
 * ══ WHY A SOURCE-READING TEST ══
 *
 * Everything asserted here is a WIRING fact: which function a screen calls, what a control is gated on,
 * where a gesture is attached. `tsc` cannot see any of it — every wrong version still compiles — and a
 * unit test cannot reach it without rendering the screen. The rules below are each one that was broken
 * once and cost something real, so they are worth a regex.
 *
 * Run:  node --test --experimental-strip-types src/app/__tests__/program-schedule-wiring.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const detail = read('../program/[id].tsx');
const home = read('../(tabs)/index.tsx');
const sheet = read('../../components/forge/ReorderWeekSheet.tsx');
const hook = read('../../hooks/useListReorder.ts');
const migration = read('../../../supabase/migrations/0198_unskip_program_session.sql');

// ── PROGRESS AND THE LOG READ THE MARKS ──────────────────────────────────────────────────────────────

/**
 * ⚠ P0-22. `computeProgress(structure, workouts.length)` could not see a skip — it writes no workout —
 * so a program graduated by skipping read a fraction of itself forever.
 */
test('Program Detail derives progress from the marks, never from the workout count', () => {
  assert.match(detail, /progressFromMarks\(structure,\s*marks\)/);
  assert.doesNotMatch(detail, /computeProgress\(/, 'the count-based helper is retired');
});

/** ⚠ P0-23. Filing by date order put every session after a skip under the wrong day. */
test('"Your Log" is built with the marks in hand', () => {
  assert.match(detail, /buildLog\(structure,\s*workouts,\s*loadCtx,\s*marks\)/);
});

/**
 * ⚠ P0-24. `slots[count]` names the (count+1)-th session, not the first OUTSTANDING one. One of these
 * four screens snapshots that name into a Train-Together invite, so the wrong answer sent two athletes
 * to a session one of them had already logged.
 */
test('every "next session" reader walks the schedule instead of counting', () => {
  for (const f of ['chapter-detail-live.ts', 'progress-hub-live.ts', 'templates-live.ts', 'workout-complete-live.ts']) {
    const src = read(`../../data/${f}`);
    assert.doesNotMatch(src, /\bnextSession\b/, `${f} still imports the count-based selector`);
    assert.match(src, /nextOpenSlot\(/, `${f} should resolve the first open slot`);
  }
});

// ── SKIP IS GUARDED, AND REVERSIBLE ──────────────────────────────────────────────────────────────────

/**
 * ⚠ Skipping WRITES to the schedule and counts toward finishing. It was one unguarded tap in a row of
 * four text buttons beside "Train this", and on the last outstanding session it graduates the program
 * permanently — five honors and a timeline event that Amendment-001 §1 gives no way to reverse.
 */
test('skip goes through a confirmation, and says something different on the last session', () => {
  assert.match(detail, /const askSkip = \(/, 'the button opens a confirmation rather than writing');
  assert.match(detail, /open=\{skipping != null\}/);
  assert.match(detail, /skipping\?\.last/, 'the last outstanding session gets its own copy');
  assert.match(detail, /cannot be undone/i);
  // The button hands the decision to `askSkip`; only the confirmed path may call the RPC.
  assert.match(detail, /onSkipDay=\{state === 'active' \? \(di, name\) => askSkip\(/);
});

test('a graduating skip re-reads the program, not only the marks', () => {
  assert.match(
    detail,
    /await skipProgramSession[\s\S]{0,400}fetchProgram\(program\.id\)/,
    'a skip can seal the program server-side; without this the screen keeps offering Train and Skip',
  );
});

test('a skipped session can be taken back', () => {
  assert.match(detail, /unskipProgramSession\(program\.id/);
  assert.match(detail, /Undo skip/);
  assert.match(detail, /onUnskipDay=\{state === 'active'/, 'never offered on a sealed program');
});

// ── THE IN-PROGRESS GUARD ────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ Reordering under an open workout files it against the wrong day, and sending the logger's resolved
 * slot does not fix it — the position is identical either way, and a slot touched in the meantime hits
 * `on conflict do nothing`, saving the workout with no mark at all.
 */
test('reorder and swap are both blocked while a workout for this program is open', () => {
  assert.ok(
    /hasLoggedWork\(session\)/.test(detail),
    'a started-but-empty session is not work worth protecting, so the guard must ask hasLoggedWork',
  );
  assert.match(detail, /const openReorder = \(weekIndex: number\) => \{[\s\S]{0,260}setBlocked\('reorder'\)/);
  assert.match(detail, /const openSwap = \([\s\S]{0,260}setBlocked\('swap'\)/);
  assert.match(detail, /open=\{blocked != null\}/);
});

test('Home withholds the swap options under the same condition', () => {
  assert.match(home, /if \(resumeProgramId && resumeProgramId === activeProgram\.id\) return \[\];/);
});

/**
 * Home's first paint budget: the marks arrive with the programs, never through a second read here.
 *
 * ⚠ Comments stripped, the same way `home-first-paint.test.mjs` does it — the prose on that screen names
 * `fetchProgramSessions(builtId)` in order to explain why it is not there any more.
 */
test('Home does not add a per-program session read', () => {
  const code = home.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /fetchProgramSessions\(/);
});

// ── THE REORDER SHEET ────────────────────────────────────────────────────────────────────────────────

/**
 * `browse-is-not-adopt.test.mjs` scans this file for `programId={` and requires a `program ?` guard
 * nearby — a preview has no row to write to. The reorder sheet takes no `programId`, but it is mounted
 * under the same rule for the same reason.
 */
test('the reorder sheet is mounted only on an ACTIVE program with a real row', () => {
  assert.match(detail, /\{reordering != null && program \? \(\s*<ReorderWeekSheet/);
  assert.match(detail, /onReorder=\{\s*state === 'active' &&/);
});

test('both save buttons commit, each with its own scope', () => {
  assert.match(sheet, /setPending\('rest_of_block'\)/);
  assert.match(sheet, /setPending\('this_week'\)/);
  assert.match(sheet, /onSave\(order, pending\)/);
  assert.match(detail, /onSave=\{\(order, scope\) => void doReorder\(reordering, order, scope\)\}/);
});

test('the confirmation names the weeks it will change', () => {
  assert.match(sheet, /targetsFor\('rest_of_block'\)/);
  assert.match(sheet, /keep their own order/, 'a week of a different shape is left alone, and says so');
});

test('Home hands off to the reorder sheet with the week it was showing', () => {
  assert.match(home, /params: \{ id: activeProgram\.id, reorder: String\(nextSlot\.weekIndex\) \}/);
  assert.match(detail, /reorderLinkUsed/, 'the deep link opens the sheet once, not on every focus');
});

/**
 * ⚠ A URL IS NOT A LESSER CALLER. On the web preview — which is where the PO tests — `?reorder=2` is the
 * athlete's back button and their reload, so it must clear the same gates the button does. The first
 * version called `setReordering` directly and raced an un-awaited `loadSession`, so the in-progress guard
 * could not have fired even if it had been asked.
 */
test('the ?reorder= link clears every gate the Reorder button clears', () => {
  assert.match(detail, /const weekIsReal = Number\.isInteger\(asked\) && asked >= 0 && asked < \(p\?\.structure\.weeks \?\? 0\)/);
  assert.match(detail, /if \(openFor && openFor === p\.id\) setBlocked\('reorder'\);/);
  assert.match(detail, /else if \(weekSessionCount\(p\.structure, asked\) >= 2\) setReordering\(asked\);/);
  assert.match(
    detail,
    /Promise\.all\(\[[\s\S]{0,220}loadSession\(\)\.catch/,
    'the session read is awaited with the rest, or the guard reads null and lets everything through',
  );
});

/**
 * ⚠ The log gives an unbuilt week `daysPerWeek` "Rest" rows, all of them outstanding. Gating on those
 * alone offered a reorder over rows with no session behind them, where Save wrote the structure back
 * unchanged and closed — a control whose only behaviour is not working.
 */
test('the Reorder control is gated on real sessions, not on log rows', () => {
  assert.match(detail, /weekSessionCount\(structure, wi\) >= 2 &&/);
});

/** A refusal the RPC is designed to return, and which carries no Postgres error to surface on its own. */
test('a refused un-skip is reported rather than swallowed', () => {
  assert.match(detail, /if \(!res\.ok\) \{/);
  assert.match(detail, /This program has finished/);
});

// ── THE DRAG ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ THE HANDLE, NEVER THE ROW. A responder on the row cannot tell "lift me" from "scroll the sheet" —
 * both are a vertical drag, and the scroller is the one that loses. `useSheetDrag`'s header records the
 * same lesson from the same defect.
 */
test('the pan handlers sit on the grab handle', () => {
  assert.match(sheet, /\{\.\.\.drag\.handlers\(pos\)\}[\s\S]{0,220}styles\.grip/);
  assert.doesNotMatch(sheet, /\{\.\.\.drag\.handlers\(pos\)\}[\s\S]{0,80}styles\.row\b/);
});

/** Web-only, and load-bearing there: a text selection under the cursor terminates the responder. */
test('the handle refuses text selection, and the responder refuses to be taken', () => {
  assert.match(sheet, /userSelect: 'none'/);
  assert.match(hook, /onPanResponderTerminationRequest: \(\) => false/);
});

/**
 * ⚠ The react-compiler lint ERRORS on a ref read during render, and `rowStyle` is read during render —
 * the same trade `useSheetDrag` makes.
 */
test('the animated values are held in state, not in a ref read during render', () => {
  assert.match(hook, /useState\(\(\) => new Animated\.Value\(0\)\)/);
});

/**
 * ⚠ `onPanResponderTerminationRequest: () => false` refuses to hand the RESPONDER over, but it cannot
 * stop another row's should-set callback from running — and that callback writes the shared `from` ref.
 * Brush a second grip mid-drag and the release commits a move on a session nobody picked up.
 */
test('a second touch cannot hijack a drag already in flight', () => {
  assert.match(hook, /const held = useRef\(false\)/);
  assert.match(hook, /if \(held\.current \|\| !live\.current\.canMove\(index\)\) return false;/);
  assert.match(hook, /held\.current = true;/, 'set on grant');
  assert.match(hook, /held\.current = false;/, 'and cleared by reset, which terminate also runs');
});

/**
 * ⚠ The first version keyed this off the ROWS — but the parent numbers rows by position, so the key was
 * always "0,1,…,n-1" and never changed. It would have kept a half-finished ordering from the previous
 * open and saved it. Keyed on the open transition, it holds whether the parent mounts the sheet
 * conditionally (it does) or keeps it mounted for the life of the screen.
 */
test('the reorder sheet re-seeds on open, keyed on the transition and not on the rows', () => {
  assert.match(sheet, /const \[wasOpen, setWasOpen\] = useState\(open\)/);
  assert.match(sheet, /if \(open !== wasOpen\) \{[\s\S]{0,200}setOrder\(rows\.map\(\(r\) => r\.dayIndex\)\)/);
  assert.doesNotMatch(sheet, /rows\.map\(\(r\) => r\.dayIndex\)\.join/, 'the row-identity key could never differ');
});

/** A responder built in a `useMemo` would otherwise commit against the ordering it captured. */
test('the drag reads live props through a ref rather than a stale closure', () => {
  assert.match(hook, /live\.current\.onMove\(start, end\)/);
  assert.match(hook, /live\.current = \{ rowHeight, count, canMove, onMove, haptics \}/);
});

test('chevrons exist beside the drag, and step over pinned rows exactly as it does', () => {
  assert.match(sheet, /Move \$\{row\.name\} earlier in the week/);
  assert.match(sheet, /Move \$\{row\.name\} later in the week/);
  assert.match(sheet, /function nearestFree\(/);
});

// ── THE MIGRATION ────────────────────────────────────────────────────────────────────────────────────

test('un-skip refuses anything but an active program, and only ever deletes a skip', () => {
  assert.match(migration, /create or replace function public\.unskip_program_session/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /if v_prog\.state is distinct from 'active' then/);
  assert.match(migration, /and state\s+= 'skipped';/, 'a completed mark is the record of a workout');
});

/**
 * ⚠ The RPC is the right door, but `for all` left another one open: the client could DELETE any of its
 * own marks — a `completed` one included — straight through PostgREST.
 */
test('the client may select and insert a session mark, and nothing else', () => {
  assert.match(migration, /create policy program_sessions_select_own[\s\S]{0,120}for select/);
  assert.match(migration, /create policy program_sessions_insert_own[\s\S]{0,120}for insert/);
  assert.doesNotMatch(migration, /create policy [\s\S]{0,120}for all/);
  // Both new policies are dropped first, or a second run fails with "policy already exists".
  assert.match(migration, /drop policy if exists program_sessions_select_own/);
  assert.match(migration, /drop policy if exists program_sessions_insert_own/);
});

/**
 * ⚠ The self-check asserts "no write door remains", not an exact policy list. An exact match would abort
 * this migration on replay the moment any later migration adds a policy to the table, turning a harmless
 * re-run into a failure that reads as though the guard caught something.
 */
test('the self-check survives a replay after a later migration adds a policy', () => {
  assert.doesNotMatch(migration, /is distinct from array\['a', 'r'\]/);
  assert.match(migration, /if 'w' = any\(v_policies\) or 'd' = any\(v_policies\) or '\*' = any\(v_policies\)/);
});

/**
 * ⚠ NEVER RETYPE AN EXISTING FUNCTION. `create or replace` rewrites the WHOLE body, and `save_workout`
 * is ~200 lines that records every workout in the app. 0123 §2 declined the same thing for the reason.
 */
test('the migration redeclares neither save_workout nor skip_program_session', () => {
  assert.doesNotMatch(migration, /create or replace function public\.save_workout/);
  assert.doesNotMatch(migration, /create or replace function public\.skip_program_session/);
});

test('it proves itself rather than trusting the run', () => {
  assert.match(migration, /raise exception '0198 self-check/);
});
