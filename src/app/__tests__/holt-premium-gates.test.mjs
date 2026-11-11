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
  assert.match(chat, /setBusy\('building'\);[\s\S]{0,1400}const spend = await consumeHoltAllowance\(kind\);/);
  assert.match(chat, /if \(mode_ === 'day' && !\(await payHolt\('day'\)\)\) return;/);
  const build = wizard.slice(wizard.indexOf('async function build() {'), wizard.indexOf('async function build() {') + 1400);
  assert.match(build, /const spend = await consumeHoltAllowance\(kind\);/);
  assert.match(build, /if \(mode === 'day' && !\(await pay\('day'\)\)\) \{\n\s+setBusy\(false\);/);
});

test('G4 — an unreadable spend answer stops a capped athlete with a retry, in the chat and in the wizard', () => {
  const pay = chat.slice(chat.indexOf('const payHolt = async'), chat.indexOf('const payHolt = async') + 900);
  assert.match(pay, /const verdict = holtSpendVerdict\(spend, gates\(kind === 'day' \? 'holt_days_per_month' : 'holt_programs'\)\);\n\s+if \(verdict === 'build'\) return true;/);
  assert.match(pay, /if \(verdict === 'retry'\) \{\n\s+say\(\{ kind: 'holt', text: PLAN_UNCHECKED \}\);\n\s+return false;/);
  assert.doesNotMatch(pay, /if \(!spend \|\| spend\.allowed\) return true;/, 'a null building anyway was the bug');
  const build = wizard.slice(wizard.indexOf('async function build() {'), wizard.indexOf('async function build() {') + 1400);
  assert.match(build, /if \(verdict === 'retry'\) setError\(ENTITLEMENT_RETRY_MESSAGE\);/);
  assert.doesNotMatch(build, /if \(!spend \|\| spend\.allowed\) return true;/);
});

test('P6 (MA4-D5) — a block spends the Holt program only at four weeks or more, in the chat and in the wizard', () => {
  assert.match(chat, /const payForBlock = async \(structure: ProgramStructure\): Promise<boolean> => \{\n\s+if \(!earnsStructuredDevelopmentCredit\(structure\)\) return true;/);
  // Both chat paths pay before the draft is saved: the block he wrote and the rulebook's.
  assert.equal(chat.match(/if \(!\(await payForBlock\(structure\)\)\) return;/g)?.length, 2);
  assert.doesNotMatch(chat, /consumeHoltAllowance\(mode_ === 'day' \? 'day' : 'program'\)/, 'every non-day build spending the program was the bug');
  assert.match(wizard, /if \(earnsStructuredDevelopmentCredit\(structure\) && !\(await pay\('program'\)\)\) return;/);
  // The three block doors ask by length, never the Holt program outright.
  assert.equal(chat.match(/blockDoorRefuses\(/g)?.length, 3, 'its three doors');
  assert.doesNotMatch(chat, /guard\('holt_programs'\)/);
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
