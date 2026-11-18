// node --experimental-strip-types --test src/domain/coach/__tests__/chat-tools-and-web-cost.test.mjs
//
// CH-6 (AI Road to 10 Sprint 3b): the chat's ended event says which tools an ask used (names only, from fixed
// tables), and "Find one online" says what a web search costs before the tap — the SERVER's number
// (`coach_ai_quote('web')`), never one typed into the app.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { askToolsUsed, TOOLS_MAX_CHARS, WEB_SEARCH_ACTION, webSearchCostFrom, withCreditCost } from '../chat-basics.ts';
import { ASK_STATUS_PHRASES } from '../ask-wire.ts';
import { sanitizeProps, ALLOWED_PROP_KEYS, MAX_STRING } from '../../analytics/props-core.ts';

const SHEET = readFileSync(new URL('../../../components/forge/CoachChatSheet.tsx', import.meta.url), 'utf8');
const LIVE = readFileSync(new URL('../../../data/coach-ask-live.ts', import.meta.url), 'utf8');

/* ── tools (C-G7) ───────────────────────────────────────────────────────────────────────────────────────── */

test('tools: the status lines and actions an ask saw, as tool names — each once, in the order used', () => {
  const lines = [ASK_STATUS_PHRASES.get_lift_history, ASK_STATUS_PHRASES.web_search, ASK_STATUS_PHRASES.get_lift_history];
  assert.equal(askToolsUsed(lines, ['offer_online_recipe_search']), 'get_lift_history,web_search,offer_online_recipe_search');
  assert.equal(askToolsUsed([], []), 'none');
});

test('⛔ tools: a line or a name not in the fixed tables never reaches the event', () => {
  assert.equal(askToolsUsed(['my shoulder hurts', 'Searching online for knee pain…'], ['delete_everything', 'a b']), 'none');
  assert.equal(askToolsUsed([ASK_STATUS_PHRASES.get_goals], ['get_goals; drop table']), 'get_goals');
});

test('tools: whole names only, inside the analytics string cap — and it survives the sanitiser as it is', () => {
  const every = askToolsUsed(Object.values(ASK_STATUS_PHRASES), []);
  assert.ok(every.length <= TOOLS_MAX_CHARS && TOOLS_MAX_CHARS <= MAX_STRING);
  for (const n of every.split(',')) assert.ok(Object.hasOwn(ASK_STATUS_PHRASES, n), `${n} is a whole tool name`);
  assert.ok(ALLOWED_PROP_KEYS.has('tools'));
  assert.deepEqual(sanitizeProps({ tools: every }), { tools: every });
});

test('the sheet sends tools on BOTH ended events, built by askToolsUsed (never the lines themselves)', () => {
  const ended = [...SHEET.matchAll(/track\('holt_ask_ended', \{([^}]*)\}\)/g)].map((m) => m[1]);
  assert.equal(ended.length, 2);
  for (const body of ended) assert.match(body, /\btools\b/);
  assert.match(SHEET, /const tools = askToolsUsed\(statusLines, r\.kind === 'answer' \? r\.actions\.map\(\(a\) => a\.name\) : \[\]\);/);
  assert.match(SHEET, /statusLines\.push\(line\);/);
});

/* ── web search cost before the tap (C-G6) ─────────────────────────────────────────────────────────────── */

test('the cost is the quote row\'s, or nothing — a failed read, an older server or no Premium AI shows no number', () => {
  assert.equal(webSearchCostFrom([{ allowed: true, cost: 2, remaining: 148, allowance: 150 }]), 2);
  assert.equal(webSearchCostFrom({ allowed: false, cost: 2, remaining: 0, allowance: 150 }), 2, 'out of credits still says the price');
  // coach_ai_quote's own "not entitled" / "unpriced action" answers: cost 0.
  assert.equal(webSearchCostFrom([{ allowed: false, cost: 0, remaining: 0, allowance: 0 }]), null);
  assert.equal(webSearchCostFrom(null), null);
  assert.equal(webSearchCostFrom([]), null);
  assert.equal(webSearchCostFrom([{ cost: '2' }]), null);
  assert.equal(webSearchCostFrom([{ cost: 2.5 }]), null);
});

test('the chip as shown: "Find one online · 2 credits"; unknown cost → the label as it always was', () => {
  assert.equal(withCreditCost('Find one online', 2), 'Find one online · 2 credits');
  assert.equal(withCreditCost('Find one online', 1), 'Find one online · 1 credit');
  assert.equal(withCreditCost('Find one online', null), 'Find one online');
  assert.equal(withCreditCost('Find one online', 0), 'Find one online');
});

test('⛔ the number is read from the server (coach_ai_quote, action "web") — the app types none of its own', () => {
  assert.equal(WEB_SEARCH_ACTION, 'web');
  assert.match(LIVE, /rpc\('coach_ai_quote', \{ p_action: WEB_SEARCH_ACTION \}\)/);
  assert.doesNotMatch(SHEET, /withCreditCost\([^)]*,\s*\d/);
  assert.doesNotMatch(SHEET, /Find one online · \d/);
  // Only the web chip gets the number, and the transcript line stays the chip's own label.
  assert.match(SHEET, /const shown = c\.webSearch \? withCreditCost\(c\.label, webCost\) : c\.label;/);
  assert.match(SHEET, /if \(!chip\.webSearch\) return tapChip\(chip\);\n\s*say\(\{ kind: 'me', text: chip\.label \}\);/);
});

test('old client: a phone without this code sends no tools key and reads the chip as before — nothing the server sends changed', () => {
  // The server is untouched (coach_ai_quote is live since 0221; coach-ask's wire is the same), so an older app is
  // unaffected by construction. What this pins: the older event shape still sanitises the same way.
  assert.deepEqual(sanitizeProps({ source: 'web', result: 'answer', ms: 900, count: 1, success: true }), { source: 'web', result: 'answer', ms: 900, count: 1, success: true });
  // The names come from tables every shipped app already reads: status lines (Sprint 1) and action names (Sprint 0).
  assert.match(LIVE, /from '@\/domain\/coach\/chat-basics'/);
});
