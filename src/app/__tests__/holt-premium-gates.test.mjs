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

/* The build moved into the engine (Holt Listens HL-10 S4b) — same code; `say`/`setBusy` are the sink, data calls the
   port, `gates`/`closeSignal` the hooks. The sheet keeps thin wrappers. */
const engineBuild = read('../../domain/coach/engine/build.ts');
/** `advance` — the chat's build — from its declaration to the end of the module. */
const advance = engineBuild.slice(engineBuild.indexOf('export async function advance('));
const payHoltSrc = engineBuild.slice(engineBuild.indexOf('export async function payHolt('), engineBuild.indexOf('export async function advance('));
/** One top-level chat function, from its declaration to the next one. */
const fn = (head) => {
  const at = chat.indexOf(head);
  assert.ok(at > 0, `${head} not found`);
  return chat.slice(at, chat.indexOf('\n  const ', at + head.length));
};

test('H18 — the allowance is spent by one payer, in the chat and in the wizard, and a refusal stops the build', () => {
  assert.match(payHoltSrc, /export async function payHolt\(port: EnginePort, sink: EngineSink, hooks: BuildHooks, kind: 'day' \| 'program', offerWeek = false\): Promise<boolean> \{\n\s+const spend = await port\.build\.spend\(kind\);/);
  assert.equal(engineBuild.match(/port\.build\.spend\(/g)?.length, 1, 'one spend in the chat, through payHolt');
  assert.equal(chat.match(/consumeHoltAllowance\(/g)?.length ?? 0, 0, 'the sheet never spends on its own');
  const build = wizard.slice(wizard.indexOf('async function build() {'), wizard.indexOf('async function build() {') + 1400);
  assert.match(build, /const spend = await consumeHoltAllowance\(kind\);/);
});

test('B-D4 — a day pays once it EXISTS: never before the build, never for one he could not put together', () => {
  // The chat: both day paths — the one he wrote from their words and the rulebook's — pay before the draft.
  assert.equal(advance.match(/if \(!\(await payHolt\(port, sink, hooks, 'day'\)\)\) return;/g)?.length, 2);
  assert.doesNotMatch(advance, /mode_ === 'day' && !\(await payHolt\(/, 'paying before the build was the bug');
  const written = advance.slice(advance.indexOf("if (written && mode_ === 'day') {"));
  assert.ok(written.indexOf("if (!(await payHolt(port, sink, hooks, 'day'))) return;") < written.indexOf('await port.drafts.saveWorkout('));
  const rulebook = advance.slice(advance.indexOf('const r = buildDayWorkout(dayReq'));
  const thin = rulebook.indexOf('if (thin) {');
  const pays = rulebook.indexOf("if (!(await payHolt(port, sink, hooks, 'day'))) return;");
  assert.ok(thin > 0 && thin < pays, 'a thin day is answered before anything is spent');
  assert.ok(pays < rulebook.indexOf('await port.drafts.saveWorkout('));
  // The wizard: after the empty-day refusal, before the card.
  const wbuild = wizard.slice(wizard.indexOf('async function build() {'), wizard.indexOf('const onApply = async'));
  assert.doesNotMatch(wbuild, /mode === 'day' && !\(await pay\('day'\)\)/);
  const day = wbuild.slice(wbuild.indexOf('const res = buildDayWorkout('));
  assert.ok(day.indexOf('if (res.day.main.length === 0) {') < day.indexOf("if (!(await pay('day'))) return;"));
  assert.ok(day.indexOf("if (!(await pay('day'))) return;") < day.indexOf("kind: 'day',"));
});

test('G4 — an unreadable spend answer stops a capped athlete with a retry, in the chat and in the wizard', () => {
  const pay = payHoltSrc;
  assert.match(pay, /const verdict = holtSpendVerdict\(spend, hooks\.gates\(kind === 'day' \? 'holt_days_per_month' : 'holt_programs'\)\);\n\s+if \(verdict === 'build'\) return true;\n\s+sayHoltRefused\(port, sink, hooks, kind, verdict, offerWeek\);\n\s+return false;/);
  const refused = engineBuild.slice(engineBuild.indexOf('export function sayHoltRefused('), engineBuild.indexOf('export async function payHolt('));
  assert.match(refused, /if \(verdict === 'retry'\) \{\n\s+sink\.say\(\{ kind: 'holt', text: PLAN_UNCHECKED \}\);\n\s+return;/);
  assert.doesNotMatch(pay, /if \(!spend \|\| spend\.allowed\) return true;/, 'a null building anyway was the bug');
  // A block's keep (0270) reads its answer through the same rule, and says the same lines.
  const keep = fn('const keepAsProgram = ');
  assert.match(keep, /const verdict = holtKeepVerdict\(keep, gates\('holt_programs'\)\);/);
  assert.match(keep, /sayHoltRefused\('program', verdict === 'used_up' \? 'used_up' : 'retry', offerWeek\);\n\s+return null;/);
  const build = wizard.slice(wizard.indexOf('async function build() {'), wizard.indexOf('async function build() {') + 1400);
  assert.match(build, /if \(verdict === 'retry'\) setError\(ENTITLEMENT_RETRY_MESSAGE\);/);
  assert.doesNotMatch(build, /if \(!spend \|\| spend\.allowed\) return true;/);
});

test('P6 (MA4-D5) — a block spends the Holt program only at four weeks or more, in the chat and in the wizard', () => {
  // Only four weeks or more is KEPT as the Holt program; shorter is written as before and spends short_programs.
  // `programDraft` since Sprint 2 (C-I7): `draft` is the composer's text in the sheet, and no name shadows another.
  assert.match(fn('const keepInBuilder = '), /if \(!earnsStructuredDevelopmentCredit\(built\.structure\)\) \{\n\s+const programDraft = draftFromStructure\(built\.structure\);/);
  assert.match(fn('const reallyStart = '), /const id = earnsStructuredDevelopmentCredit\(built\.structure\) \? await keepAsProgram\(\) : \(await createProgram\(built\.structure\)\)\.id;/);
  assert.doesNotMatch(chat, /consumeHoltAllowance\(mode_ === 'day' \? 'day' : 'program'\)/, 'every non-day build spending the program was the bug');
  assert.match(wizard, /if \(!earnsStructuredDevelopmentCredit\(structure\)\) \{\n\s+await saveProgramDraft\(draftFromStructure\(structure\)\);\n\s+router\.replace\('\/program-builder'\);\n\s+return;/);
  // The block doors ask by length, never the Holt program outright. Four since Holt Listens HL-1d (11-18): "Build the
  // new one" from the Adjust door or a typed "replace my program" is the BUILD door's request and pays what it pays.
  // Three in the sheet, one in the typed turn (engine/turn.ts since HL-10 S3, through the sheet's hook).
  const turn = read('../../domain/coach/engine/turn.ts');
  assert.equal((chat.match(/blockDoorRefuses\(/g)?.length ?? 0) + (turn.match(/hooks\.blockDoorRefuses\(/g)?.length ?? 0), 4, 'its four doors');
  assert.doesNotMatch(chat, /guard\('holt_programs'\)/);
});

test('B-D1 — a Holt block is paid for when it is KEPT, before anything is written, never when he builds it', () => {
  // Building spends nothing — so "Ask me again", which only builds again, spends nothing either.
  assert.doesNotMatch(advance, /payHolt\(port, sink, hooks, 'program'/, 'a build that spends the program is how a rebuild burned it');
  assert.doesNotMatch(advance, /payForBlock/);
  assert.doesNotMatch(fn('const rebuild = '), /payHolt|keepAsProgram|keepHoltProgram|consumeHoltAllowance/);
  // At the build, the Builder draft is written only when keeping it owes nothing more (else it was a free copy).
  assert.equal(advance.match(/port\.drafts\.saveProgram\(/g)?.length, 2);
  assert.equal(advance.match(/if \(draftNow\(structure\)\)/g)?.length, 2, 'both build paths stage the draft through draftNow');
  assert.match(advance, /const draftNow = \(structure: ProgramStructure\): boolean =>\n\s+!earnsStructuredDevelopmentCredit\(structure\) \|\| holtUncapped\(hooks\.gates\('holt_programs'\)\);/);
  // 0270: every keep of a 4+-week block is ONE server step — the spend and the row together — through the ledger,
  // so the same build is kept once, as one program.
  const keep = fn('const keepAsProgram = ');
  assert.match(keep, /return keepOnce\(structure, async \(\) => \{\n\s+const keep = await keepHoltProgram\(structure\);/);
  assert.match(keep, /if \(keep\.kind === 'kept'\) return keep\.programId;/);
  assert.doesNotMatch(keep, /consumeHoltAllowance|payHolt/, 'never a separate spend before the write');
  const start = fn('const reallyStart = ');
  assert.ok(start.indexOf('await keepAsProgram()') > 0, 'Start keeps');
  assert.ok(start.indexOf('if (!id) return;') < start.indexOf('await startProgram(id)'), 'and starts only what was kept');
  assert.doesNotMatch(start, /payToKeep/);
  const builder = fn('const keepInBuilder = ');
  assert.ok(builder.indexOf('const kept = await keepAsProgram();') > 0, 'Save to the Builder keeps');
  assert.ok(builder.indexOf('if (!kept) return;') < builder.indexOf("mode: 'edit' as const, editId: kept, srcId: kept"), 'and opens the Builder ON the kept program');
  assert.match(builder, /openBuilder\(kept\);/);
  assert.match(fn('const openBuilder = '), /router\.push\(\{ pathname: '\/program-builder', params: \{ o: 'edit', id: kept \} \}\);/);
  const later = fn('const saveForLater = ');
  assert.match(later, /if \(built\.kind === 'program' && earnsStructuredDevelopmentCredit\(built\.structure\) && !guard\('programs'\)\) return;/, 'a kept block is a row: the slot is asked first');
  assert.match(later, /if \(built\.kind === 'program'\) \{\n\s+await keepInBuilder\(\);/);
  // The preview's "Final touches" is the same keep, not a second door straight into the Builder.
  assert.match(chat, /if \(built\?\.kind === 'program'\) \{\n\s+saveForLater\(\);\n\s+return;\n\s+\}\n\s+handOff\(\);\n\s+router\.push\(built\?\.kind === 'day' \? '\/workout-builder' : '\/program-builder'\);/);
  // The wizard: back-and-build costs nothing; Final touches keeps (one step), then opens the Builder on the program.
  const wbuild = wizard.slice(wizard.indexOf('async function build() {'), wizard.indexOf('const onApply = async'));
  assert.doesNotMatch(wbuild.replace(/apply: async \(\) => \{[\s\S]*?\n {10}\},/g, ''), /keepHoltProgram|pay\('program'\)/, 'only `apply` keeps a block');
  assert.doesNotMatch(wbuild, /pay\('program'\)/, 'never a separate spend for a block');
  const apply = wbuild.slice(wbuild.indexOf("kind: 'program',"));
  assert.ok(apply.indexOf("if (!guard('programs')) {") < apply.indexOf('await keepOnce(structure'), 'the slot is asked first');
  assert.ok(apply.indexOf('const keep = await keepHoltProgram(structure);') > 0);
  assert.ok(apply.indexOf('if (!kept) {') < apply.indexOf("await saveProgramDraft({ ...draftFromStructure(structure), mode: 'edit', editId: kept, srcId: kept });"));
  assert.match(apply, /router\.replace\(\{ pathname: '\/program-builder', params: \{ o: 'edit', id: kept \} \}\);/);
});

test('H19 — every chat door to an edit lands in beginEdit, and beginEdit asks Premium AI first', () => {
  // The edit flow is the engine's since Holt Listens HL-10 S2; the sheet hands it the live Premium AI read.
  const engineEdit = read('../../domain/coach/engine/edit.ts');
  const start = engineEdit.indexOf('export async function beginEdit(');
  const begin = engineEdit.slice(start, engineEdit.indexOf("sink.busy('thinking');", start));
  assert.match(begin, /if \(!hooks\.premiumAi\) \{/);
  assert.match(begin, /goTo: '\/subscription\?from=gate'/);
  assert.match(begin, /hooks\.entitlementStatus === 'ready'/, 'an unverified read is not a no');
  assert.match(chat, /const editHooks = \(\): EditHooks => \(\{ premiumAi, entitlementStatus, ctx: editCtx, buildTheNewOne \}\);/);
  assert.match(chat, /const beginEdit = \(\) => engineBeginEdit\(engine\.current, port, sink, editHooks\(\)\);/);
});

test('H19 — Program Detail\'s Ask Holt opens the plans without Premium AI — through the door that checks the read (G5)', () => {
  assert.match(detail, /premiumAi \? setAsking\(\{ weekIndex: wi, dayIndex: di, name \}\) : void openPlans\('\/subscription\?from=gate'\)/);
  assert.doesNotMatch(detail, /router\.push\('\/subscription/, 'a bare push upsells while the plan is still loading');
});

test('G5 — every direct plan-screen tap goes through usePlansDoor: verified plan only, never mid-workout', () => {
  const gate = read('../../hooks/usePremiumGate.ts');
  const door = gate.slice(gate.indexOf('export function usePlansDoor'));
  assert.match(door, /const inWorkout = session != null;/);
  // Mid-workout first, then the unread plan — and only then the push.
  const workout = door.indexOf('if (inWorkout) {');
  const unread = door.indexOf("if (status !== 'ready') {");
  const push = door.indexOf('router.push(href');
  assert.ok(workout > 0 && workout < unread && unread < push);
  assert.match(door, /showToast\(ENTITLEMENT_RETRY_MESSAGE\);\s*\/\/[^\n]*\n\s*if \(status === 'unknown'\) refetch\(\);\s*return false;/);
  for (const [file, uses] of [
    ['../(tabs)/nutrition.tsx', 2],
    ['../../components/forge/NutritionPlannerGate.tsx', 1],
    ['../form-check.tsx', 2],
  ]) {
    const src = read(file);
    assert.match(src, /const openPlans = usePlansDoor\(\);/, file);
    assert.equal(src.match(/openPlans\(\)/g)?.length, uses, file);
    assert.doesNotMatch(src, /'\/subscription'/, `${file} still pushes the plans directly`);
  }
});
