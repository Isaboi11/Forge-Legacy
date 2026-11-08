/**
 * Launch QA 11-08 — H18 (Holt's Free allowance was never spent, so "1 program, 2 days a month" never ran out) and
 * H19 (Holt changing your program for you is Premium AI, MA8 — and was open to every account).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const chat = read('../../components/forge/CoachChatSheet.tsx');
const wizard = read('../coach.tsx');
const detail = read('../program/[id].tsx');

test('H18 — the allowance is spent when he builds, in the chat and in the wizard, and a refusal stops the build', () => {
  assert.match(chat, /setBusy\('building'\);[\s\S]{0,900}const spend = await consumeHoltAllowance\(mode_ === 'day' \? 'day' : 'program'\);\n\s+if \(spend && !spend\.allowed\) \{/);
  const build = wizard.slice(wizard.indexOf('async function build() {'), wizard.indexOf('async function build() {') + 900);
  assert.match(build, /const spend = await consumeHoltAllowance\(mode === 'day' \? 'day' : 'program'\);\n\s+if \(spend && !spend\.allowed\) \{\n\s+setBusy\(false\);/);
});

test('H19 — every chat door to an edit lands in beginEdit, and beginEdit asks Premium AI first', () => {
  const begin = chat.slice(chat.indexOf('const beginEdit = async () => {'), chat.indexOf("setBusy('thinking');", chat.indexOf('const beginEdit = async () => {')));
  assert.match(begin, /if \(!premiumAi\) \{/);
  assert.match(begin, /goTo: '\/subscription\?from=gate'/);
  assert.match(begin, /entitlementStatus === 'ready'/, 'an unverified read is not a no');
});

test('H19 — Program Detail\'s Ask Holt opens the plans without Premium AI', () => {
  assert.match(detail, /premiumAi \? setAsking\(\{ weekIndex: wi, dayIndex: di, name \}\) : router\.push\('\/subscription\?from=gate'/);
});
