// PO 2026-09-28: "When I'm filling some pages out, either I'm done using the keyboard and need an 'enter'
// button to get rid of the keyboard, or if I press a button (like on onboarding the lbs button) that
// doesn't need the keyboard the keyboard should disappear. There are also some times when the keyboard goes
// up and it covers the bottom question or the next question. We need to make sure this is fixed throughout
// the app."
//
// Three app-wide rules, each guarded here so a new screen cannot quietly ship without it:
//
//   1. A way out of every keyboard. Every single-line field names a `returnKeyType`. On a text keyboard that
//      is the Done key; on a number/decimal pad — which has NO return key — React Native (iOS) adds a native
//      toolbar with a Done button whenever `returnKeyType` is set (`setDefaultInputAccessoryView` in
//      RCTTextInputComponentView). A multiline field is exempt: its return key types a new line.
//   2. Tapping anything that is not a field closes it — ONE watcher at the root (`KeyboardTapAway`).
//   3. The keyboard never covers the field being typed in — every scroller declares
//      `automaticallyAdjustKeyboardInsets` (iOS scrolls the focused field above the keyboard). A scroller
//      inside a panel that already rides the keyboard (BottomSheet, Holt's thread, comments) says `{false}`
//      explicitly, because insetting a panel that has already moved double-counts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');

function tsxFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : tsxFiles(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

/** The JSX open tag starting at `i`, brace-aware (a `>` inside `{a > b}` is not the end). */
function openTag(text, i) {
  let depth = 0;
  for (let j = i + 1; j < text.length; j++) {
    const c = text[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return text.slice(i, j + 1);
  }
  return text.slice(i);
}

const lineOf = (text, i) => text.slice(0, i).split('\n').length;

test('⭐ every single-line text field names a return key (Done on a number pad comes from this)', () => {
  const missing = [];
  for (const file of tsxFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    // `<TextInput` followed by whitespace — a JSX tag, not a `useRef<TextInput | null>` generic.
    for (const m of text.matchAll(/<TextInput(?=\s)(?!\s*[|>,)])/g)) {
      // A mention in a comment ("swapped to a `<TextInput autoFocus>`") is not a field.
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      if (/^\s*(\*|\/\/|\/\*)/.test(text.slice(lineStart, m.index))) continue;
      const tag = openTag(text, m.index);
      if (/\breturnKeyType=/.test(tag)) continue;
      if (/\bmultiline\b/.test(tag)) continue;
      missing.push(`${path.relative(SRC, file)}:${lineOf(text, m.index)}`);
    }
  }
  assert.deepEqual(missing, [], 'add returnKeyType="done" (or "search", "next", …) as the FIRST attribute so a later spread can override it');
});

test('⭐ every scroll container decides whether iOS scrolls the focused field above the keyboard', () => {
  const TAG = /(?<![\w.])<(ScrollView|FlatList|SectionList|Animated\.ScrollView|Animated\.FlatList|Reanimated\.ScrollView|Reanimated\.FlatList|BottomSheetScrollView)(?=[\s>/])/g;
  const missing = [];
  for (const file of tsxFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(TAG)) {
      if (!openTag(text, m.index).includes('automaticallyAdjustKeyboardInsets')) missing.push(`${path.relative(SRC, file)}:${lineOf(text, m.index)} <${m[1]}>`);
    }
  }
  assert.deepEqual(missing, [], 'add automaticallyAdjustKeyboardInsets (or ={false} inside a panel that already rides the keyboard)');
});

test('the panels that already ride the keyboard do not ALSO inset (it double-counts)', () => {
  const coach = fs.readFileSync(path.join(SRC, 'components/forge/CoachChatSheet.tsx'), 'utf8');
  assert.match(coach, /<Reanimated\.ScrollView keyboardDismissMode=\{KEYBOARD_DISMISS_MODE\} automaticallyAdjustKeyboardInsets=\{false\}/);
  const post = fs.readFileSync(path.join(SRC, 'app/squad-post/[id].tsx'), 'utf8');
  assert.match(post, /automaticallyAdjustKeyboardInsets=\{false\} style=\{styles\.flex\}/);
});

test('⭐ tap-away is mounted once, at the root, around everything', () => {
  const layout = fs.readFileSync(path.join(SRC, 'app/_layout.tsx'), 'utf8');
  const open = layout.indexOf('<KeyboardTapAway>');
  assert.ok(open > 0, 'KeyboardTapAway missing from the root layout');
  assert.ok(open < layout.indexOf('<ThemeProvider'), 'it must wrap the whole tree, so Modals and sheets bubble through it');
  const lib = fs.readFileSync(path.join(SRC, 'components/KeyboardTapAway.tsx'), 'utf8');
  // Deferred past touch-end: dismissing mid-press is the "Log Set needs two taps" bug.
  assert.match(lib, /setTimeout\(/);
  assert.match(lib, /now === t\.field/, 'only dismiss when focus did not move to another field');
});

test('send / clear / show-password keep the keyboard up', () => {
  for (const rel of [
    'components/forge/CoachChatSheet.tsx',
    'app/squad-post/[id].tsx',
    'app/friends.tsx',
    'components/forge/inputs/ForgePasswordInput.tsx',
    'components/forge/inputs/ForgeSearchInput.tsx',
  ]) {
    assert.match(fs.readFileSync(path.join(SRC, rel), 'utf8'), /\{\.\.\.KEEP_KEYBOARD\}/, rel);
  }
});
