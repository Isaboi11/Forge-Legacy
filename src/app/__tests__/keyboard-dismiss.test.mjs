// PO 2026-09-26: "I need to be able to swipe down on the keyboard to make it disappear. Nowhere does it
// do that now." Every scrolling surface dismisses the keyboard on drag, so a new screen can't quietly
// ship without it.
//
// PO 2026-09-26, later: "It doesn't feel very smooth … the same way it is in the iPhone texting." The mode
// is now ONE shared constant (`@/lib/keyboard-dismiss`: `interactive` on iOS, `on-drag` elsewhere), so a
// container must name the constant — a string literal would quietly opt a screen out of the iOS drag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');
const TAG = /(?<![\w.])<(ScrollView|FlatList|SectionList|Animated\.ScrollView|Animated\.FlatList|Reanimated\.ScrollView|Reanimated\.FlatList|BottomSheetScrollView)(?=[\s>/])/g;

function tsxFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : tsxFiles(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

test('every scroll container dismisses the keyboard on drag', () => {
  const missing = [];
  for (const file of tsxFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(TAG)) {
      const openTag = text.slice(m.index, text.indexOf('>', m.index) + 1);
      if (!openTag.includes('keyboardDismissMode={KEYBOARD_DISMISS_MODE}')) {
        const line = text.slice(0, m.index).split('\n').length;
        missing.push(`${path.relative(SRC, file)}:${line} <${m[1]}>`);
      }
    }
  }
  assert.deepEqual(missing, [], 'add keyboardDismissMode={KEYBOARD_DISMISS_MODE} (from @/lib/keyboard-dismiss) to these scroll containers');
});

test('every file that uses the shared dismiss mode imports it', () => {
  const unimported = [];
  for (const file of tsxFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('{KEYBOARD_DISMISS_MODE}') && !/import\s*\{[^}]*\bKEYBOARD_DISMISS_MODE\b[^}]*\}\s*from\s*'@\/lib\/keyboard-dismiss'/.test(text)) {
      unimported.push(path.relative(SRC, file));
    }
  }
  assert.deepEqual(unimported, []);
});

test('the shared mode is interactive on iOS, none on web, on-drag on Android', () => {
  const lib = fs.readFileSync(path.join(SRC, 'lib', 'keyboard-dismiss.ts'), 'utf8');
  assert.match(lib, /Platform\.OS === 'ios' \? 'interactive' : Platform\.OS === 'web' \? 'none' : 'on-drag'/);
});

// PO 2026-10-08: typing in the exercise picker's search closed the keyboard mid-word on web. react-native-web's
// `on-drag` blurs on EVERY scroll event — and a list shortening under the search clamps the scroll position,
// which is one. So web never hands the scroller that mode, and the finger-drag dismissal lives in the root
// watcher instead.
test('web: scrolling alone never closes the keyboard; a real finger drag does', () => {
  const rnw = fs.readFileSync(path.resolve(SRC, '..', 'node_modules/react-native-web/dist/exports/ScrollView/index.js'), 'utf8');
  assert.match(rnw, /keyboardDismissMode === 'on-drag'\) \{\s*dismissKeyboard\(\)/, 'react-native-web changed how on-drag works — re-check this fix');
  const tap = fs.readFileSync(path.join(SRC, 'components/KeyboardTapAway.tsx'), 'utf8');
  const move = tap.slice(tap.indexOf('const onTouchMove'), tap.indexOf('const onTouchEnd'));
  assert.match(move, /Platform\.OS === 'web' && !t\.onField/);
  assert.match(move, /focusedField\(\) === t\.field\) blur\(t\.field\)/);
});

// The other half of `interactive`: a panel pinned above the keyboard must follow it per frame on iOS,
// or the keyboard slides away under a panel that then jumps. Every pinned panel goes through
// `useKeyboardLift`, and each spreads its touch handlers — the hold that keeps Log Set a one-tap button.
test('every panel pinned above the keyboard rides it through useKeyboardLift, with the press hold', () => {
  const PANELS = {
    'components/forge/composites/BottomSheet/BottomSheet.tsx': 1,
    'components/forge/CoachChatSheet.tsx': 1,
    'app/squad-post/[id].tsx': 1,
    'app/workout.tsx': 3,
  };
  for (const [rel, holds] of Object.entries(PANELS)) {
    const text = fs.readFileSync(path.join(SRC, rel), 'utf8');
    assert.match(text, /= useKeyboardLift\(\)/, `${rel} no longer follows the keyboard per frame`);
    const spreads = (text.match(/\{\.\.\.(kbTouch|touchHandlers)\}/g) ?? []).length;
    assert.equal(spreads, holds, `${rel}: every lifted panel needs the press hold (two-tap bug)`);
  }
  const users = tsxFiles(SRC).filter((f) => /from '@\/lib\/useKeyboardInset'/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(users.map((f) => path.relative(SRC, f)), [], 'use useKeyboardLift, not useKeyboardInset, for a pinned panel');
});

test('Holt keeps his thread on its newest line while the keyboard moves (iOS)', () => {
  const text = fs.readFileSync(path.join(SRC, 'components/forge/CoachChatSheet.tsx'), 'utf8');
  assert.match(text, /useKeyboardAnchoredScroll\(kbLift, scroller\)/);
  assert.match(text, /onScroll=\{FOLLOWS_KEYBOARD_PER_FRAME \? anchorScroll : undefined\}/);
});
