// node --test src/app/__tests__/ai-feedback-placement.test.mjs
//
// "Was this helpful?" on every AI answer (AI Road to 10 Sprint 1, PL-4; 0269 `ai_feedback`). The control's states
// are unit-tested in src/domain/ai/__tests__/ai-feedback-core.test.mjs; these hold the component and its placements.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const COMPONENT = read('../../components/forge/AiFeedback.tsx');
const LIVE = read('../../data/ai-feedback-live.ts');
const CHAT = read('../../components/forge/CoachChatSheet.tsx');
const MEAL_PLAN = read('../meal-plan.tsx');
const MEAL_PHOTO = read('../meal-photo.tsx');
const FORM = read('../form-check.tsx');
const IMPORT = read('../program-import.tsx');

test('the component: Helpful / Not helpful for VoiceOver, selected and busy announced, quiet text — no hand-drawn glyph', () => {
  assert.match(COMPONENT, /accessibilityRole="button"/);
  assert.match(COMPONENT, /accessibilityLabel=\{a\.label\}/);
  assert.match(COMPONENT, /accessibilityState=\{\{ selected: a\.selected, busy: a\.busy \}\}/);
  assert.match(COMPONENT, /\(\[1, -1\] as const\)\.map/);
  assert.doesNotMatch(COMPONENT, /react-native-svg|<Path|<Svg|Feather/, 'the engraved set has no thumb; new UI never hand-draws one');
  assert.match(COMPONENT, /accessibilityLiveRegion="polite"/, 'a failed vote is said');
  // Chosen = the earned bronze edge on Alabaster; idle = the plain card edge.
  assert.match(COMPONENT, /pillOn: \{ borderColor: flColor\.accentBorder, backgroundColor: flColor\.selectedFill \}/);
  assert.match(COMPONENT, /borderColor: flColor\.bronzeBorderSubtle/);
  assert.doesNotMatch(COMPONENT, /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
});

test('the component: state belongs to one output, derived in render — no effect, no ref', () => {
  assert.match(COMPONENT, /const state = held\.ref === aiRef \? held\.state : AI_FEEDBACK_IDLE;/);
  assert.doesNotMatch(COMPONENT, /useEffect|useRef/);
  assert.match(COMPONENT, /if \(!aiFeedbackWrites\(state, rating\)\) return;/);
  assert.match(COMPONENT, /void rateAiOutput\(\{ feature, ref, rating, model \}\)/);
  // An answer for a ref that has left the screen is dropped.
  assert.match(COMPONENT, /setHeld\(\(h\) => \(h\.ref === ref \?/);
});

test('the write: an upsert on (athlete, feature, ref) that never sends the athlete and never throws', () => {
  assert.match(LIVE, /\.from\('ai_feedback'\)\.upsert\(/);
  assert.match(LIVE, /\{ onConflict: 'athlete_id,feature,ref' \}/);
  assert.doesNotMatch(LIVE, /athlete_id:/);
  assert.match(LIVE, /if \(!isAiRef\(v\.ref\)\) return false;/);
  assert.match(LIVE, /\} catch \{\s+return false;/);
  assert.doesNotMatch(LIVE, /ensureConsent|consentAllowsNow/, 'our own table, nothing to Anthropic: no AI-sharing consent asked');
});

test('chat: only a finished coach-ask reply, the kitchen’s dishes and a Holt-written card carry the control', () => {
  assert.match(CHAT, /if \(t\.sid != null && t\.streaming !== true\) \{\s+const ref = turnRef\('chat', t\.at\);/);
  assert.match(CHAT, /attached\.some\(\(x\) => x\.kind === 'dishes'\)/);
  assert.match(CHAT, /attached\.some\(\(x\) => \(x\.kind === 'program' \|\| x\.kind === 'day'\) && x\.authored === true\)/);
  assert.match(CHAT, /feedback: feedbackFor\(t, attached\)/);
  assert.match(CHAT, /feedback=\{b\.feedback\}/);
  assert.match(CHAT, /\{feedback\?\.after === 'words' \? <AiFeedback feature=\{feedback\.feature\} aiRef=\{feedback\.ref\} compact \/> : null\}/);
  assert.match(CHAT, /\{feedback\?\.after === 'attached' \? <AiFeedback/);
  // Authored is said where Holt's own plan is put on the table — the day, the program, and a race's lifting days.
  assert.match(CHAT, /\{ kind: 'day', card: dayCard, authored: true \}/);
  assert.match(CHAT, /\{ kind: 'program', card: programCard, authored: true \}/);
  assert.match(CHAT, /\{ kind: 'program', card: programCard, \.\.\.\(holt\.written \? \{ authored: true \} : \{\}\) \}/);
  assert.equal((CHAT.match(/authored: true/g) ?? []).length, 3);
});

test('kitchen in the meal plan, meal photo and photo import: a ref made once when the answer arrives', () => {
  assert.match(MEAL_PLAN, /setFill\(\{ phase: 'review', picks, ref: uuid\(\) \}\);/);
  assert.match(MEAL_PLAN, /<AiFeedback feature="kitchen" aiRef=\{fill\.ref\} \/>/);

  assert.match(MEAL_PHOTO, /setReadRef\(uuid\(\)\);\s+setStage\(\{ step: 'matching' \}\);/);
  assert.ok(MEAL_PHOTO.indexOf("if (r.kind !== 'ok')") < MEAL_PHOTO.indexOf('setReadRef(uuid())'), 'only after a read that worked');
  assert.match(MEAL_PHOTO, /<AiFeedback feature="meal_photo" aiRef=\{readRef\}/);

  assert.match(IMPORT, /setPhotoRef\(uuid\(\)\);\s+showPreview\(/);
  assert.match(IMPORT, /\{mode === 'photo' && photoRef \? <AiFeedback feature="import" aiRef=\{photoRef\}/, 'a paste is the parser, not the model');
});

test('form check keeps its designed Useful / Not useful and counts the same vote in ai_feedback', () => {
  assert.match(FORM, /ref: id \?\? uuid\(\),/);
  // Sprint 2 (UX-4): the vote runs on AiFeedback's own core — one vote, changed never withdrawn, a failed write said.
  assert.match(FORM, /void rateAiOutput\(\{ feature: 'form_check', ref: r\.ref, rating \}\)\.then\(\(ok\) =>/);
  assert.match(FORM, /if \(!aiFeedbackWrites\(vote, rating\)\) return;/);
  assert.match(FORM, /if \(r\.id\) void setFormUseful\(r\.id, v\);/, 'its own column is still written');
  // `\b`, like the count below: `useState<AiFeedbackState>` is the core's state, not a second control.
  assert.doesNotMatch(FORM, /<AiFeedback\b/, 'no second control on that screen');
});

test('the placements are exactly these', () => {
  const count = (src) => (src.match(/<AiFeedback\b/g) ?? []).length;
  assert.deepEqual([count(CHAT), count(MEAL_PLAN), count(MEAL_PHOTO), count(IMPORT), count(FORM)], [2, 1, 1, 1, 0]);
});
