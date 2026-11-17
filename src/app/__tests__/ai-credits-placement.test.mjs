// node --test src/app/__tests__/ai-credits-placement.test.mjs
//
// Credits you can see (AI Road to 10 Sprint 2 — UX-2; 0272) and thumbs on the last AI results (UX-4). The chip's
// words are unit-tested in src/domain/ai/__tests__/credits.test.mjs; these hold the component, its one read, its
// placements, and the copy that states a cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const CHIP = read('../../components/forge/AiCreditsChip.tsx');
const LIVE = read('../../data/ai-credits-live.ts');
const INVOKE = read('../../lib/ai-invoke.ts');
const CHAT = read('../../components/forge/CoachChatSheet.tsx');
const WRITE = read('../workout-write.tsx');
const RECIPES = read('../my-recipes.tsx');
const MEAL_PHOTO = read('../meal-photo.tsx');

test('the chip: Premium AI only, decided by itself; the server’s words; neutral unless warning; theme tokens only', () => {
  assert.match(CHIP, /const premiumAi = usePremiumAi\(\);/);
  assert.match(CHIP, /const chip = premiumAi \? aiCreditsChip\(read\) : null;\n\s+if \(!chip\) return short && premiumAi && read == null \? <View style=\{styles\.held\}/, 'no Premium AI, no read, a failed read → no words, never a 0');
  // In Holt's header it is a line: its height is held for Premium AI until the first read, so the thread never jumps.
  assert.match(CHIP, /held: \{ height: CHIP_HEIGHT \}/);
  assert.match(CHIP, /minHeight: CHIP_HEIGHT/);
  assert.match(CHIP, /accessibilityLabel=\{chip\.a11y\}/, 'VoiceOver hears the whole sentence, reset date included');
  assert.match(CHIP, /\{short \? chip\.short : chip\.label\}/);
  assert.doesNotMatch(CHIP, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'theme tokens, never a hard-coded colour');
  // Bronze is EARNED (Alabaster): a balance is information — divider edge, secondary ink. Only the warnings take red.
  assert.match(CHIP, /borderColor: flColor\.divider/);
  assert.match(CHIP, /color: flText\.secondary/);
  assert.doesNotMatch(CHIP.replace(/\/\*[\s\S]*?\*\//g, ''), /bronze|accentBorder|selectedFill/i);
  assert.match(CHIP, /out: \{ borderColor: flColor\.dangerBorder, backgroundColor: flColor\.dangerBg \}/);
  assert.doesNotMatch(CHIP, /useEffect|useRef/, 'state lives in the store; derived in render');
});

test('one read for the whole app, keyed by athlete, refreshed by each answer’s remaining — never a 0 from a failure', () => {
  assert.match(LIVE, /await supabase\.rpc\('coach_ai_credits'\);/);
  assert.match(LIVE, /await supabase\.rpc\('coach_ai_balance'\);/, 'a server before 0272 still answers');
  assert.match(LIVE, /return uid && s\.uid === uid \? s\.read : null;/, 'one athlete’s balance is never shown to another (two accounts, one phone)');
  assert.match(LIVE, /if \(read \|\| held\.uid !== uid\) \{/, 'a failed read keeps the last good one');
  assert.match(LIVE, /if \(n === 0 && held\.uid\) void refreshAiCredits\(held\.uid, next\.entitled, 0\);/, 'landing on 0 asks where the floor stands');
  assert.match(LIVE, /useSyncExternalStore\(subscribe, snapshot, snapshot\)/);
  assert.doesNotMatch(LIVE, /useState|useRef/);
  // Every non-chat AI answer passes through the wrapper, which hands its body to the store (after the race, so a
  // late answer still corrects the number) — the wrapper's own contract lines are unchanged.
  assert.match(INVOKE, /\}\)\(\)\.then\(noted\);/);
  assert.match(INVOKE, /function noted\(answer: AiAnswer\): AiAnswer \{\n\s+noteAiRemaining\(answer\.body\);\n\s+return answer;\n\}/);
  assert.match(INVOKE, /if \(!serverSaysNoConsent\(first\)\) return first;/);
});

test('Holt’s header carries the chip (short form), read again when a turn ends — one placement', () => {
  assert.equal((CHAT.match(/<AiCreditsChip /g) ?? []).length, 1);
  assert.match(CHAT, /<\/View>\n\s+<AiCreditsChip busy=\{busy != null\} short \/>\n\s+<\/View>/, 'its own line under READY, inside the header text');
  assert.match(CHAT, /import \{ AiCreditsChip \} from '@\/components\/forge\/AiCreditsChip';/);
});

test('every AI screen carries the chip in its app bar', () => {
  const screens = {
    'meal-photo.tsx': /<AppBar title="Log from Photo" transparent onBack=\{\(\) => router\.back\(\)\} actions=\{<AiCreditsChip \/>\} \/>/,
    'meal-plan.tsx': /<AppBar title="" transparent onBack=\{\(\) => router\.back\(\)\} actions=\{<AiCreditsChip \/>\} \/>/,
    'program-import.tsx': /\{mode === 'photo' \? <AiCreditsChip \/> : null\}/,
    'workout-write.tsx': /transparent onBack=\{\(\) => router\.back\(\)\} actions=\{<AiCreditsChip \/>\} \/>/,
    'form-check.tsx': /<AppBar title=\{title\} onClose=\{onClose\} actions=\{<AiCreditsChip \/>\} \/>/,
    'my-recipes.tsx': /onBack=\{\(\) => \(form \? closeForm\(\) : router\.back\(\)\)\} actions=\{<AiCreditsChip \/>\} \/>/,
  };
  for (const [file, re] of Object.entries(screens)) {
    const src = read(`../${file}`);
    assert.match(src, re, file);
    assert.match(src, /import \{ AiCreditsChip \} from '@\/components\/forge\/AiCreditsChip';/, file);
  }
});

test('thumbs on the card read and the typed tidy (workout-write): one output, one ref, made when the answer lands', () => {
  // A typed "Fix it with AI" is its own output; the photo's read and its tidy pass are ONE, so the photo's vote is
  // set after the pass and replaces the one the pass set.
  assert.match(WRITE, /setName\(null\);\n\s+setAiVote\(\{ feature: 'workout_tidy', ref: uuid\(\) \}\);\n\s+return;/);
  assert.match(WRITE, /else if \(call\.kind === 'rules'\) await tidy\(words, true\);\n(\s+\/\*[^*]*\*\/\n|\s+\/\*[\s\S]*?\*\/\n)\s+setAiVote\(\{ feature: 'import', ref: uuid\(\) \}\);/);
  assert.match(WRITE, /setAiVote\(null\);\n\s+setBusy\('Reading your photo…'\);/, 'a new photo takes the old control away');
  assert.match(WRITE, /setBeforeAi\(null\); setError\(null\); setAiVote\(null\); \}\}/, 'Clear takes it away');
  assert.match(WRITE, /\{aiVote && !busy \? <AiFeedback feature=\{aiVote\.feature\} aiRef=\{aiVote\.ref\} \/> : null\}/);
  const ok = WRITE.indexOf("if (r.kind !== 'ok') {\n        setError(withNotCharged(");
  assert.ok(ok > 0 && ok < WRITE.indexOf("setAiVote({ feature: 'import'"), 'only after a read that worked');
  assert.match(WRITE, /setBusy\('Tidying it up with AI…'\);\n\s+setError\(null\);\n\s+setAiVote\(null\);/, 'a new fix takes the old control away');
});

test('thumbs on the Kitchen’s dish and a recipe read from a picture (my-recipes); a page or a paste is the parser', () => {
  assert.match(RECIPES, /seed != null \? \{ feature: 'kitchen', ref: uuid\(\) \} : null,/);
  assert.match(RECIPES, /setDraftVote\(from === 'picture' \? \{ feature: 'recipe_photo', ref: uuid\(\) \} : null\);/);
  assert.match(RECIPES, /\{draftVote && !form\.editId && \(importedFrom === 'picture' \|\| \(!importedFrom && fromHolt\)\) \? \(\n\s+<AiFeedback feature=\{draftVote\.feature\} aiRef=\{draftVote\.ref\} \/>/);
});

test('a meal photo refused on the floor says today, not the month', () => {
  assert.match(MEAL_PHOTO, /const floor = r\.kind === 'out_of_credits' \? aiFloorUsedLine\(aiCreditsNow\(session\?\.user\.id \?\? null\)\) : null;/);
  assert.match(MEAL_PHOTO, /text: floor \? withNotCharged\(`\$\{floor\} You can still search for the food\.`, r\.refunded\) : withNotCharged\(mealPhotoError\(r\), r\.refunded\)/);
});

test('no copy in the app states a credit weight — the server is the only place one lives (MA3-D16, 0272)', () => {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (name === '__tests__' || name === 'node_modules') continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) {
        const src = readFileSync(p, 'utf8');
        // String literals and JSX text only — a weight in a code comment is not something a phone shows.
        for (const m of src.matchAll(/(['"`])(?:(?!\1)[^\\\n]|\\.)*?\b(?:[1-9]|one|two|three|six) (?:Premium AI |AI )?credits?\b(?:(?!\1)[^\\\n]|\\.)*\1/gi)) {
          hits.push(`${p.slice(root.length)}: ${m[0].slice(0, 80)}`);
        }
      }
    }
  };
  walk(root);
  assert.deepEqual(hits, []);
});
