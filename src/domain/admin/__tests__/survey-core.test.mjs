// node --test src/domain/admin/__tests__/survey-core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { OTHER, formScript, matches, questionList, resultsBrief, summarize, topLine, writeIns } from '../survey-core.ts';

// The live form's shape (forms.gle/BukyU3tJE6HsXcAP9), as its Apps Script sends it.
const QUESTIONS = [
  { title: 'How do you mostly train?', type: 'CHECKBOX', choices: ['Lifting / weights', 'Running', 'Sports'] },
  { title: 'Age range', type: 'MULTIPLE_CHOICE', choices: ['18–24', '25–34', '35–44'] },
  { title: 'What do you wish a workout app did that none do?', type: 'PARAGRAPH_TEXT', choices: [] },
  { title: 'Want early access when we launch? Leave your email', type: 'TEXT', choices: [] },
];

const row = (id, train, age, wish, email = null) => ({
  id,
  submitted_at: `2026-09-2${id}T12:00:00Z`,
  email,
  answers: [
    { q: 'How do you mostly train?', a: train },
    { q: 'Age range', a: age },
    ...(wish ? [{ q: 'What do you wish a workout app did that none do?', a: wish }] : []),
    ...(email ? [{ q: 'Want early access when we launch? Leave your email', a: email }] : []),
  ],
});

const ROWS = [
  row('1', ['Lifting / weights', 'Running'], '25–34', 'Plan my week for me', 'a@b.co'),
  row('2', ['Running', 'Pilates'], '25–34', null),
  row('3', ['Lifting / weights'], '35–44', 'Stop charging for basics'),
  row('4', ['Running'], '18–24', null),
];

test('choice questions count in form order; shares are of the people who answered', () => {
  const [train, age] = summarize(QUESTIONS, ROWS);
  assert.equal(train.kind, 'choice');
  assert.equal(train.multi, true);
  assert.equal(train.answered, 4);
  assert.deepEqual(
    train.options.map((o) => [o.label, o.n]),
    [['Lifting / weights', 2], ['Running', 3], ['Sports', 0], [OTHER, 1]],
  );
  assert.equal(train.options[1].share, 0.75);
  assert.deepEqual(train.other, ['Pilates']);
  assert.deepEqual(age.options.map((o) => o.n), [1, 2, 1]);
  assert.equal(topLine(age), 'Most picked: 25–34 (50%)');
});

test('a tie has no "most picked"; repeated write-ins read once with a count', () => {
  const tie = { kind: 'choice', title: 't', multi: false, answered: 4, other: [], options: [{ label: 'A', n: 2, share: 0.5 }, { label: 'B', n: 2, share: 0.5 }] };
  assert.equal(topLine(tie), null);
  assert.equal(writeIns(['Pilates', 'yoga', 'pilates', 'Pilates']), '“Pilates” ×3 · “yoga”');
});

test('the email question is never listed as a result', () => {
  const titles = summarize(QUESTIONS, ROWS).map((r) => r.title);
  assert.equal(titles.length, 3);
  assert.ok(!titles.some((t) => /email/i.test(t)));
});

test('text answers keep only the people who wrote something', () => {
  const wish = summarize(QUESTIONS, ROWS)[2];
  assert.equal(wish.kind, 'text');
  assert.equal(wish.answered, 2);
  assert.deepEqual(wish.answers.map((a) => a.text), ['Plan my week for me', 'Stop charging for basics']);
});

test('the filter narrows every question to the people who gave that answer, including write-ins', () => {
  const f = { q: 'Age range', a: '25–34' };
  const narrowed = ROWS.filter((r) => matches(r, f, QUESTIONS));
  assert.deepEqual(narrowed.map((r) => r.id), ['1', '2']);
  const other = ROWS.filter((r) => matches(r, { q: 'How do you mostly train?', a: OTHER }, QUESTIONS));
  assert.deepEqual(other.map((r) => r.id), ['2']);
  assert.equal(ROWS.filter((r) => matches(r, null, QUESTIONS)).length, 4);
});

test('before the form has sent its questions, they come from the answers (arrays read as choices)', () => {
  const qs = questionList([], ROWS);
  assert.equal(qs[0].type, 'CHECKBOX');
  assert.equal(qs[1].type, 'TEXT');
  const [train] = summarize([], ROWS);
  assert.equal(train.kind, 'choice');
  assert.equal(train.options[0].label, 'Running'); // most picked first when there is no fixed list
});

test('Copy results carries every number and every written answer', () => {
  const text = resultsBrief('Workout apps', summarize(QUESTIONS, ROWS), 4, null);
  assert.match(text, /4 responses/);
  assert.match(text, /- Running: 3 \(75%\)/);
  assert.match(text, /Other, written in: “Pilates”/);
  assert.match(text, /"Stop charging for basics"/);
  assert.doesNotMatch(text, /a@b\.co/);
});

test('the setup script is valid JavaScript and calls survey_intake with the token', () => {
  const src = formScript({ supabaseUrl: 'https://x.supabase.co/', anonKey: 'sb_publishable_k', token: 'f'.repeat(64) });
  assert.doesNotThrow(() => new Function(src));
  assert.match(src, /const CRM_URL = 'https:\/\/x\.supabase\.co\/rest\/v1\/rpc\/survey_intake';/);
  assert.match(src, /p_token: SURVEY_TOKEN/);
  assert.match(src, /onFormSubmit\(\)/);
});

// ── Migration 0243 tripwires ──

const MIGRATION = readFileSync(new URL('../../../../supabase/migrations/0243_crm_surveys.sql', import.meta.url), 'utf8');
const BUNDLE = readFileSync(new URL('../../../../supabase/apply/pending-0243.sql', import.meta.url), 'utf8');

test('0243: the paste bundle carries the migration byte-for-byte', () => {
  assert.ok(BUNDLE.replace(/\r\n/g, '\n').includes(MIGRATION.replace(/\r\n/g, '\n')));
});

test('0243: every admin_ function opens with admin_guard(); only survey_intake is granted to anon', () => {
  const fns = [...MIGRATION.matchAll(/create or replace function public\.(\w+)\s*\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g)];
  const admin = fns.filter((m) => m[1].startsWith('admin_'));
  assert.equal(admin.length, 5);
  for (const m of admin) {
    const first = m[3].replace(/^[\s\S]*?\bbegin\b/i, '').trim().split(';')[0].trim();
    assert.equal(first, 'perform public.admin_guard()', m[1]);
  }
  const anon = [...MIGRATION.matchAll(/grant execute on function public\.(\w+)\([^)]*\) to anon/g)].map((m) => m[1]);
  assert.deepEqual(anon, ['survey_intake']);
});

test('0243: both tables are RLS-on with no policies, and 0238’s contact functions are not restated', () => {
  for (const t of ['ops_surveys', 'ops_survey_responses']) {
    assert.match(MIGRATION, new RegExp(`alter table public\\.${t} enable row level security;`));
    assert.doesNotMatch(MIGRATION, new RegExp(`create policy[^;]*on public\\.${t}\\b`));
  }
  assert.doesNotMatch(MIGRATION, /function public\.admin_contact/);
});
