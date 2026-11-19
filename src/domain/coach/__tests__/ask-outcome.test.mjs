/**
 * ask-outcome.test.mjs — which line Holt says when a typed ask does not end in an answer
 * (AI audit 2026-11-16 — C-D1 out of credits, C-D4 declined / ran long, C-D5 the outage card and Try again).
 *
 * The pure lines are walked directly. The sheet has no render harness, so its wiring is read from source,
 * the way `typing-premium.test.mjs` and `chat-sheet-stale.test.mjs` do.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/__tests__/ask-outcome.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { aiCreditsBackOn, aiCreditsBackOnLabel, askOfflineCard, outOfAiCreditsLine, takeBackReply, WITHOUT_AI_CREDITS } from '../ask-outcome.ts';
import { VOICE, resetVoice } from '../rulebook/voice.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const sheet = readFileSync(path.join(here, '../../../components/forge/CoachChatSheet.tsx'), 'utf8');
const between = (from, to) => {
  const a = sheet.indexOf(from);
  const b = sheet.indexOf(to, a + 1);
  assert.ok(a >= 0 && b > a, `${from} … ${to} not found`);
  return sheet.slice(a, b);
};

const NOV = '2026-11-01';
const MID_NOV = new Date(Date.UTC(2026, 10, 16, 12));
const FREE_BLOCK = VOICE.allowance_program;

// ─────────────────────────────────────────────────────────────────────────────
// C-D1 — OUT OF CREDITS IS THREE STATES
// ─────────────────────────────────────────────────────────────────────────────

test('the credits come back on the 1st of the month after the server’s month', () => {
  assert.equal(aiCreditsBackOnLabel(aiCreditsBackOn(NOV, MID_NOV)), 'December 1');
  assert.equal(aiCreditsBackOnLabel(aiCreditsBackOn('2026-12-01', MID_NOV)), 'January 1', 'December rolls into the new year');
  assert.equal(aiCreditsBackOn('2026-12-01').getUTCFullYear(), 2027);
});

test('without the server’s month, the device’s UTC month stands in — never an invalid date', () => {
  for (const bad of [null, undefined, '', 'soon', '2026-13-01']) {
    assert.equal(aiCreditsBackOnLabel(aiCreditsBackOn(bad, MID_NOV)), 'December 1', String(bad));
  }
  /* 11:30 pm on Nov 30 in Los Angeles is already December in UTC — the meter's clock, so January. */
  assert.equal(aiCreditsBackOnLabel(aiCreditsBackOn(null, new Date('2026-12-01T07:30:00Z'))), 'January 1');
});

test('⭐ a Premium AI athlete at the cap hears this month’s credits used, when they come back, and what still works', () => {
  resetVoice();
  for (let i = 0; i < VOICE.out_of_ai_credits.length * 2; i++) {
    const line = outOfAiCreditsLine({ remaining: 0, allowance: 150, period: NOV }, MID_NOV);
    assert.ok(VOICE.out_of_ai_credits.some((v) => line.startsWith(v)), line);
    assert.match(line, /They come back on December 1\./);
    assert.ok(line.endsWith(WITHOUT_AI_CREDITS), line);
    assert.match(line, /build from the taps/);
    assert.match(line, /logging/);
  }
});

test('⛔ never the Free plan’s "one block I write for free" line, in any credit state', () => {
  const states = [
    { remaining: 0, allowance: 150 },
    { remaining: 2, allowance: 150, web: true },
    { remaining: 1, allowance: 150 },
    { remaining: 0, allowance: 0 },
  ];
  for (const s of states) {
    for (let i = 0; i < 6; i++) {
      const line = outOfAiCreditsLine({ ...s, period: NOV }, MID_NOV);
      for (const free of FREE_BLOCK) assert.ok(!line.includes(free), `${JSON.stringify(s)} said "${free}"`);
      assert.doesNotMatch(line, /\bfree\b/i, line);
    }
  }
});

test('an online search with a few credits left says so — the search costs more, a question still fits', () => {
  const line = outOfAiCreditsLine({ remaining: 2, allowance: 150, web: true, period: NOV }, MID_NOV);
  assert.match(line, /^You have 2 Premium AI credits left this month, and an online search takes more than that\./);
  assert.match(line, /An ordinary question still fits, and they all come back on December 1\.$/);
  assert.match(outOfAiCreditsLine({ remaining: 1, allowance: 150, web: true, period: NOV }, MID_NOV), /You have 1 Premium AI credit left/);
});

test('no allowance at all is Premium AI not being on — not "used", and no reset date', () => {
  resetVoice();
  const line = outOfAiCreditsLine({ remaining: 0, allowance: 0, period: NOV }, MID_NOV);
  assert.ok(VOICE.ai_not_on.some((v) => line.startsWith(v)), line);
  assert.doesNotMatch(line, /come back|used/);
  assert.match(line, /Every tap in here still works\.$/);
});

test('⚠ the sheet answers out_of_credits with the credit line in BOTH AI paths, and the Free line only at the gate', () => {
  const ask = between('const askAloud = async', 'const onChip = (chip');
  // respondTo is the engine's since Holt Listens HL-10 S3 (the sheet's creditsLine arrives as a hook).
  const turn = readFileSync(path.join(here, '../engine/turn.ts'), 'utf8');
  const respond = turn.slice(turn.indexOf('export async function respondTo('), turn.indexOf('export function buildingLine('));
  for (const [name, src] of [['askAloud', ask], ['respondTo', respond]]) {
    assert.match(src, /case 'out_of_credits':[\s\S]{0,200}await (hooks\.)?creditsLine\(r, /, `${name} must use the credit line`);
    assert.doesNotMatch(src, /pick\('allowance_program'\)/, `${name} must not say the free-block line`);
  }
  // A tapped search is weighed as a search.
  assert.match(ask, /creditsLine\(r, opts\.allowWeb === true\)/);
  // The server's month, from the balance, with a deadline — and no balance read when there is no allowance.
  // (Sprint 2: the floor's read runs beside it, inside the same allowance check.)
  assert.match(sheet, /r\.allowance > 0\s*\?\s*await Promise\.all\(\[\s*within\(AI_BALANCE_LOOKUP_MS, fetchCoachAiBalance\(\), null\),/);
  assert.match(sheet, /\]\)\s*:\s*\[null, null\];/);
  // The Free plan's one-block line still answers the Free plan's block door.
  const door = between('const blockDoorRefuses = ', 'return true;');
  assert.match(door, /pick\(key === 'short_programs' \? 'allowance_week' : 'allowance_program'\)/);
});

test('the balance read hands back the server’s month', () => {
  const live = readFileSync(path.join(here, '../../../data/coach-interpret-live.ts'), 'utf8');
  assert.match(live, /period: typeof d\.period === 'string' \? d\.period : null/);
});

// ─────────────────────────────────────────────────────────────────────────────
// C-D4 — DECLINED, AND RAN LONG
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a declined question is Holt’s line, never the red card — the words taken back and the line kept out of history', () => {
  const ask = between('const askAloud = async', 'const onChip = (chip');
  const refused = ask.slice(ask.indexOf("case 'refused':"), ask.indexOf("case 'offline':"));
  assert.match(refused, /setThread\(\(t\) => markStopped\(takeBackReply\(t, sid\), text\)\)/);
  assert.match(refused, /say\(\{ kind: 'holt', text: pick\('declined_question'\) \}\)/);
  assert.doesNotMatch(refused, /kind: 'error'/);
  assert.doesNotMatch(refused, /retryChip/, 'a decision is not retried');
});

test('every declined line offers the way forward and none reads as an error', () => {
  for (const l of VOICE.declined_question) {
    assert.match(l, /training|food|plan|program/, l);
    assert.doesNotMatch(l, /couldn't|connection|error|try again/i, l);
  }
});

test('a reply cut at the length cap keeps its words and he says it ran long', () => {
  const ask = between('const askAloud = async', 'const onChip = (chip');
  assert.match(ask, /if \(r\.cut\) say\(\{ kind: 'holt', text: pick\('reply_ran_long'\) \}\);/);
  for (const l of VOICE.reply_ran_long) assert.match(l, /keep going|carry on|the rest/i, l);
});

test('takeBackReply removes every word of that one reply, and nothing else', () => {
  const t = [
    { kind: 'me', text: 'q' },
    { kind: 'holt', text: 'Here is how', sid: 3, streaming: true },
    { kind: 'holt', text: 'Another answer', sid: 4 },
  ];
  assert.deepEqual(takeBackReply(t, 3), [t[0], t[2]]);
  assert.deepEqual(takeBackReply(t, 9), t);
});

// ─────────────────────────────────────────────────────────────────────────────
// C-D5 — THE OUTAGE CARD SAYS WHAT HAPPENED, AND TRY AGAIN SENDS IT AGAIN
// ─────────────────────────────────────────────────────────────────────────────

test('the sub-line matches what happened: dropped mid-reply, never got through, or nothing back in time', () => {
  assert.deepEqual(askOfflineCard({ started: true, timedOut: false }), {
    text: 'I lost the line partway through.',
    sub: 'The connection dropped before I finished.',
    action: 'Ask me again in a moment.',
  });
  const never = askOfflineCard({ started: false, timedOut: false });
  assert.equal(never.text, "I couldn't reach my notes just then.");
  assert.equal(never.sub, "Your question didn't get through.");
  assert.doesNotMatch(never.sub, /before I finished/, 'nothing had started');
  assert.equal(askOfflineCard({ started: false, timedOut: true }).sub, 'Nothing came back in time, so I stopped waiting.');
});

test('Sprint 1 (P-D2): "Not charged." only when coach-ask SAID it refunded — never on a guess', () => {
  assert.equal(askOfflineCard({ started: false, timedOut: false, refunded: true }).notCharged, true);
  assert.equal(askOfflineCard({ started: true, timedOut: false, refunded: true }).notCharged, true);
  for (const refunded of [false, undefined]) {
    assert.equal('notCharged' in askOfflineCard({ started: false, timedOut: true, refunded }), false);
  }
  // Both outage cards in askAloud pass the server's word through; the card renders NOT_CHARGED under itself.
  const ask = between('const askAloud = async', 'const onChip = (chip');
  assert.equal((ask.match(/askOfflineCard\(\{[^)]*refunded: r\.refunded \}\)/g) ?? []).length, 2);
  // UX-1 (Sprint 3b): the card is the AI state kit, which draws NOT_CHARGED on its own line from the flag (ai-status.test).
  assert.match(sheet, /return <AiStatus status=\{chatFailure\(turn\)\} \/>;/);
  assert.match(sheet, /import \{ chatFailure \} from '@\/domain\/ai\/ai-status';/);
});

test('Sprint 1 (C-G5): the waiting bubble says the lookup — only before the first word, only this ask’s', () => {
  const ask = between('const askAloud = async', 'const onChip = (chip');
  // CH-6 counts lookups and names the tools (telemetry); Sprint 4a: a detail line repeats its table line, counted once.
  assert.match(ask, /onStatus: \(line, detail\) => \{[^}]*if \(!detail\) lookups \+= 1;\s*statusLines\.push\(line\);\s*if \(!started\) setAskStatus\(\{ sid, text: line, detail: detail \?\? null \}\);\s*\}/);
  // The first word clears it; the ask ending clears it only if it is still this ask's line.
  assert.match(ask, /setBusy\(null\);\s*setAskStatus\(null\);\s*say\(\{ kind: 'holt', text: acc, streaming: true, sid \}\);/);
  assert.match(ask, /setAskStatus\(\(s\) => \(s\?\.sid === sid \? null : s\)\);/);
  assert.match(sheet, /<Waiting kind=\{waiting\} status=\{waiting === 'thinking' \? askStatus\?\.text \?\? null : null\} detail=\{waiting === 'thinking' \? askStatus\?\.detail \?\? null : null\} \/>/);
  // Sprint 4a: lane C's HoltStatusLine draws the line (its templates, else the table line).
  assert.match(sheet, /<HoltStatusLine status=\{status\} detail=\{detail\} \/>/);
  // Secondary ink from the theme tokens, never bronze (Alabaster: bronze is earned).
  assert.match(sheet, /typingStatus: \{[^}]*color: flColor\.gray400 \}/);
  assert.doesNotMatch(sheet, /typingStatus: \{[^}]*bronze/);
});

test('⚠ every outage card in askAloud carries Try again; the sheet closing says nothing', () => {
  const ask = between('const askAloud = async', 'const onChip = (chip');
  const cards = ask.match(/say\(\{ kind: 'error', \.\.\.askOfflineCard\([^)]*\) \}, retryChip\(\{ text, history, q, opts \}\)\)/g) ?? [];
  assert.equal(cards.length, 2, 'the cut-off answer and the outage both offer Try again');
  assert.doesNotMatch(ask, /sub: 'The connection dropped before I finished\.'/, 'the card copy lives in askOfflineCard');
  const offline = ask.slice(ask.indexOf("case 'offline':"));
  assert.ok(offline.indexOf('if (r.aborted) return;') < offline.indexOf('askOfflineCard'), 'an aborted ask is silent');
});

test('⚠ Try again sends that ask once, and never on top of one still running', () => {
  const chip = between('const onChip = (chip', 'if (!chip.webSearch) return tapChip(chip);');
  const retry = chip.slice(chip.indexOf('if (chip.retryAsk != null)'));
  const guard = retry.indexOf('if (holding || asking.current.size > 0) return;');
  const take = retry.indexOf('retryAsks.current.delete(chip.retryAsk);');
  const send = retry.indexOf('void askAloud(again.text, again.history, again.q, again.opts);');
  assert.ok(guard > 0 && take > guard && send > take, 'guard, then take it out, then send');
  /* The chip is the kitchen's pattern: its label, an echo, and a serialisable id rather than the ask itself. */
  assert.match(sheet, /chips: \[\{ label: ASK_RETRY_LABEL, patch: \{\}, retryAsk: id \}\]/);
  assert.match(retry, /say\(\{ kind: 'me', text: chip\.label \}\);/);
});

test('a used Try again reads as answered — a chip row under a card takes the reply after it', () => {
  assert.match(sheet, /answer: t\.kind === 'chips' && after\?\.kind === 'me' \? after\.text : null/);
  assert.match(sheet, /<TurnView turn=\{b\.turn\} answer=\{b\.answer\} onChip=\{onChip\} handoff=\{handoff\} \/>/);
});

// ─────────────────────────────────────────────────────────────────────────────
// C-D2 — THE SHEET'S HALF: ONE CONTROLLER PER ASK, ABORTED ON THE WAY OUT
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ every ask has a controller, the sheet going away aborts it, and busy always lets go', () => {
  const ask = between('const askAloud = async', 'const onChip = (chip');
  assert.match(ask, /const ctl = new AbortController\(\);\s*asking\.current\.add\(ctl\);/);
  assert.match(ask, /\{\s*allowWeb: opts\.allowWeb,\s*recipes,\s*signal: ctl\.signal,/);
  // Released, then busy cleared, then this stream's flag — before any ending is handled.
  const after = ask.slice(ask.indexOf('asking.current.delete(ctl);'));
  assert.ok(after.indexOf('setBusy(null);') < after.indexOf('switch (r.kind)'));
  assert.ok(after.indexOf('setThread((t) => streamEnded(t, sid));') < after.indexOf('switch (r.kind)'));
  // The unmount cleanup aborts whatever is still running.
  assert.match(sheet, /const live = asking\.current;\s*return \(\) => \{\s*for \(const c of live\) c\.abort\(\);/);
  // The lookups before the ask are bounded as a whole, and so is the gaps answer.
  assert.match(ask, /await within\(ASK_CONTEXT_MS, Promise\.all\(\[/);
  assert.match(ask, /const reply = await within\(ASK_CONTEXT_MS, gapReplyLive\(\), null\);/);
});

test('the soft floor (0272, MA12): a refused chat says today, not "nothing until the 1st"', () => {
  const used = outOfAiCreditsLine({ remaining: 0, allowance: 150, period: NOV, floor: { perDay: 5, leftToday: 0 } }, MID_NOV);
  assert.equal(used, "That's today's 5 chats and meal photos. More tomorrow, and your Premium AI credits come back on December 1.");
  // Room left on the floor: the refused ask was one the floor does not cover.
  const web = outOfAiCreditsLine({ remaining: 0, allowance: 150, web: true, period: NOV, floor: { perDay: 5, leftToday: 3 } }, MID_NOV);
  assert.equal(web, "An online search needs Premium AI credits, and this month's are used. Ordinary questions and meal photos still work (3 more today), and your credits come back on December 1.");
  const build = outOfAiCreditsLine({ remaining: 0, allowance: 150, period: NOV, floor: { perDay: 5, leftToday: null } }, MID_NOV);
  assert.equal(build, "That one needs Premium AI credits, and this month's are used. Ordinary questions and meal photos still work, 5 a day, and your credits come back on December 1.");
  // Before 0272 is pasted there is no floor: the month-only line stands, word for word.
  // (`pick` rotates its phrasings, so two calls are compared by what they promise, not word for word.)
  for (const floor of [null, undefined, { perDay: 0, leftToday: null }]) {
    const before = outOfAiCreditsLine({ remaining: 0, allowance: 150, period: NOV, floor }, MID_NOV);
    assert.match(before, /They come back on December 1\. Until then I'll still build from the taps/);
    assert.ok(!/today|tomorrow/.test(before), before);
  }
  // The chat reads the floor fresh, in parallel with the month, both bounded.
  assert.match(sheet, /within\(AI_BALANCE_LOOKUP_MS, fetchAiCredits\(true\), null\)/);
});
