// node --experimental-strip-types --test src/domain/ai/__tests__/ai-status-rollout.test.mjs
//
// UX-1 rollout (AI Road to 10 Sprint 3b, lane C): 3a's one AI state kit on workout write (the card read + its tidy
// pass, and "Fix it with AI"), Holt's chat failure card, and the Kitchen's failure in the chat. Form check is not here
// (another session owns it). The screens are too big to render in node, so their wiring is pinned by source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { aiProblem, aiStatusA11y, cardReadProgress, chatFailure, TIDY_WORKING } from '../ai-status.ts';
import { NOT_CHARGED } from '../ai-failure.ts';
import { askOfflineCard } from '../../coach/ask-outcome.ts';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const KIT = src('../../../components/forge/AiStatus.tsx');
const WRITE = src('../../../app/workout-write.tsx');
const SHEET = src('../../../components/forge/CoachChatSheet.tsx');

/* ── the model ─────────────────────────────────────────────────────────────────────────────────────────── */

test('a workout card from a photo: two steps as they happen; the one tidy has no step row', () => {
  assert.deepEqual(cardReadProgress('reading').steps.map((s) => `${s.label}:${s.state}`), ['Read the card:now', 'Lay it out:waiting']);
  assert.deepEqual(cardReadProgress('layout').steps.map((s) => `${s.label}:${s.state}`), ['Read the card:done', 'Lay it out:now']);
  assert.equal(cardReadProgress('reading').headline, 'Reading your photo…');
  assert.equal(TIDY_WORKING.kind, 'working');
  assert.equal(TIDY_WORKING.steps, undefined);
});

test('a failure sorts into the kit: out of credits is its own state with no Try again; the rest say "Not charged." once', () => {
  const out = aiProblem('You’re out of Premium AI credits for this month. Fix the lines below by hand instead.', { outOfCredits: true, canRetry: true });
  assert.equal(out.kind, 'out_of_credits');
  assert.equal('canRetry' in out, false);
  const refunded = aiProblem('Couldn’t reach AI just now. Not charged.', { refunded: true, canRetry: true });
  assert.deepEqual(refunded, { kind: 'failed', headline: 'Couldn’t reach AI just now.', notCharged: true, canRetry: true });
  assert.equal(aiStatusA11y(refunded), `Couldn’t reach AI just now. ${NOT_CHARGED}`);
  assert.equal(aiProblem('AI didn’t find a workout in that.').canRetry, false, 'no Try again unless the screen says so');
});

test('Holt’s chat failure card: its line, then what happened and what to do, then "Not charged." once — flag or words', () => {
  const card = chatFailure(askOfflineCard({ started: false, timedOut: true, refunded: true }));
  assert.equal(card.kind, 'failed');
  assert.equal(card.headline, "I couldn't reach my notes just then.");
  assert.equal(card.detail, 'Nothing came back in time, so I stopped waiting. Ask me again in a moment.');
  assert.equal(card.notCharged, true);
  assert.equal(card.canRetry, false, 'the Try again chip under the card is the retry (C-D5)');
  // The author's outage line carries "Not charged." in its sub (withNotCharged) — said once, not twice.
  const words = chatFailure({ text: "I couldn't reach my notes just then.", sub: `The connection dropped before I heard back. ${NOT_CHARGED}`, action: 'Try again.' });
  assert.equal(words.notCharged, true);
  assert.doesNotMatch(words.detail, /Not charged/);
  assert.equal(aiStatusA11y(words).match(/Not charged/g).length, 1);
  // Not refunded → never promised.
  assert.equal(chatFailure(askOfflineCard({ started: true, timedOut: false })).notCharged, false);
  // A kitchen failure has no sub or action: just the line.
  assert.equal(chatFailure({ text: "The kitchen's not working right now. Try again in a bit.", sub: '', action: '' }).detail, null);
});

/* ── the look ──────────────────────────────────────────────────────────────────────────────────────────── */

test('the kit: engraved icons for a done or failed step (no text glyphs), the detail line on every state, tokens only', () => {
  assert.match(KIT, /<EngravedIcon name="check" size=\{11\} color=\{flText\.secondary\} \/>/);
  assert.match(KIT, /<EngravedIcon name="close" size=\{11\} color=\{flColor\.dangerText\} \/>/);
  assert.doesNotMatch(KIT, /[✓✕✔✗]/);
  assert.match(KIT, /\{status\.detail \? <Text style=\{styles\.detail\}>\{status\.detail\}<\/Text> : null\}/);
  // Both themes come from the tokens; nothing earned here, so no bronze (Alabaster rule).
  assert.doesNotMatch(KIT, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(KIT.slice(KIT.indexOf('export function AiStatus')), /bronze/i);
});

/* ── the placements ────────────────────────────────────────────────────────────────────────────────────── */

test('workout write: the photo shows its two steps, "Fix it with AI" its one; a failure is the kit with Try again', () => {
  assert.match(WRITE, /setBusy\(cardReadProgress\('reading'\)\);/);
  assert.match(WRITE, /setBusy\(viaPhoto \? cardReadProgress\('layout'\) : TIDY_WORKING\);/);
  assert.match(WRITE, /if \(call\.kind === 'ai'\) await tidy\(words, false, true\);\n\s*else if \(call\.kind === 'rules'\) await tidy\(words, true, true\);/);
  assert.match(WRITE, /\{busy \? <AiStatus status=\{busy\} \/> : null\}/);
  assert.match(WRITE, /\{failed && !busy \? <AiStatus status=\{failed\.status\} onRetry=\{failed\.retry === 'photo' \? \(\) => void fromPhoto\(\) : \(\) => void tidy\(text\)\} \/> : null\}/);
  // Out of credits is its own state; Premium AI or credits as the reason → no "another photo".
  assert.equal((WRITE.match(/outOfCredits: r\.kind === 'out_of_credits'/g) ?? []).length, 2);
  assert.match(WRITE, /const noAi = r\.kind === 'not_entitled' \|\| r\.kind === 'out_of_credits';/);
  // A plain note (consent "Not now", a photo that would not open) is not an AI failure and keeps its plain line.
  assert.match(WRITE, /setError\(AI_DECLINED_LINE\);/);
  assert.doesNotMatch(WRITE, /ActivityIndicator/);
});

test('Holt’s chat: every failure card is drawn by the kit; the kitchen failing is that card, with Try again under it', () => {
  assert.match(SHEET, /case 'error':[\s\S]{0,700}?return <AiStatus status=\{chatFailure\(turn\)\} \/>;/);
  assert.doesNotMatch(SHEET, /styles\.errorFoot|styles\.errorTitle/);
  assert.match(
    SHEET,
    /if \(r\.kind === 'unavailable' \|\| r\.kind === 'offline'\) \{\n\s*return void say\(\n\s*\{ kind: 'error', text: kitchenError\(r\),[^\n]*\n\s*\{ kind: 'chips', chips: \[\{ label: 'Try again', patch: \{\}, kitchen: 'go' \}\] \},/,
  );
  // Holt DECIDING (no dish he'd stand behind) stays in his voice — not the failure card.
  assert.match(SHEET, /if \(!cards\.length\) return void say\(\{ kind: 'holt', text: kitchenError\(\{ kind: 'none' \}\) \}\);/);
});

test('⛔ form check is not touched by this rollout', () => {
  assert.doesNotMatch(src('../../../app/form-check.tsx'), /chatFailure|cardReadProgress|aiProblem/);
});
