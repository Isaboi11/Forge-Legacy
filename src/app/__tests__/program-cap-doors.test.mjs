/**
 * Launch QA 11-08, B5 — at the Free program limit, every door that creates a program asks FIRST and opens the
 * upgrade sheet, and the cap trigger's own text ("The pre-action check that should have shown M-7 is missing")
 * never reaches an athlete. Live the day `entitlement_config.default_tier` flips to FREE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('program detail: Start, Add to Planned and Run it again ask the cap before a row exists', () => {
  const src = read('../program/[id].tsx');
  assert.match(src, /const onAddToPlanned = async \(\) => \{\n\s+if \(busy \|\| program\) return;\n\s+if \(!guard\(programCap\(structure\)\)\) return;/);
  assert.match(src, /if \(state !== 'active' && \(terminal \|\| !program\) && !guard\(programCap\(structure\)\)\) return;/);
  assert.match(src, /earnsStructuredDevelopmentCredit\(st\) \? \('programs' as const\) : \('short_programs' as const\)/);
});

test('Build Program, Holt\'s Start and a week duplicate ask too', () => {
  assert.match(read('../program-guided.tsx'), /if \(!guard\(earnsStructuredDevelopmentCredit\(structure\) \? 'programs' : 'short_programs'\)\) return;/);
  assert.match(read('../../components/forge/CoachChatSheet.tsx'), /built\.kind === 'program' && !guard\(earnsStructuredDevelopmentCredit\(built\.structure\)/);
  assert.match(read('../week-template/[id].tsx'), /if \(!guard\('short_programs'\)\) return;/);
});

test('the cap trigger\'s refusal is replaced, not read aloud — in plainError and in Holt', async () => {
  const { plainError, PLAIN } = await import('../../lib/plain-error.ts');
  const raw = { code: 'P0001', message: 'Program limit reached: 3 of 3 used. The pre-action check that should have shown M-7 is missing at this call site.' };
  assert.equal(plainError(raw), PLAIN.capReached);
  assert.doesNotMatch(plainError(raw), /pre-action|M-7|call site/);
  // Any other P0001 keeps its athlete-written sentence.
  assert.match(plainError({ code: 'P0001', message: 'That workout closed more than an hour ago' }), /closed more than an hour ago/);
  assert.match(read('../../components/forge/CoachChatSheet.tsx'), /const errorText = \(e: unknown\): string => plainError\(e\);/);
});
