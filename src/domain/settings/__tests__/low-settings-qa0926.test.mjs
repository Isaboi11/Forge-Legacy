import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LEGAL, linkParts, settingsSections } from '../content.ts';
import { localStamp } from '../export-core.ts';

/*
 * QA 09-26 lows — settings, sign-in and the web stylesheet. Light guards on the causes, not the copy.
 */

const src = (p) => readFileSync(join(process.cwd(), p), 'utf8');

// ── library-24 / auth-18: the stylesheet never loaded ──────────────────────────────────────────────

test('library-24: global.css is imported by the root layout, so the browser actually gets it', () => {
  assert.match(src('src/app/_layout.tsx'), /^import '@\/global\.css';/m);
});

test('library-24: text fields get no browser ring; selection is bronze, not blue', () => {
  const css = src('src/global.css');
  assert.match(css, /input:focus-visible[\s\S]*?\{\s*outline:\s*none;/);
  assert.match(css, /::selection\s*\{[^}]*background-color/);
  // Buttons and rows keep the keyboard ring.
  assert.match(css, /:focus-visible\s*\{\s*outline:\s*2px solid var\(--fl-focus-ring\)/);
});

// ── auth-17: the legal sheet's addresses can be tapped ─────────────────────────────────────────────

test('auth-17: linkParts finds the email and the web address and gives the paragraph back whole', () => {
  for (const doc of Object.values(LEGAL)) {
    for (const p of doc.body) assert.equal(linkParts(p).map((x) => x.text).join(''), p);
  }
  const privacyLinks = LEGAL.privacy.body.flatMap(linkParts).filter((x) => x.href);
  assert.ok(privacyLinks.some((x) => x.href === 'mailto:support@forgelegacy.app'));
  assert.ok(privacyLinks.some((x) => x.href === 'https://forgelegacy.app/privacy'));
  // The full stop after an address stays outside the link.
  const parts = linkParts('See forgelegacy.app/terms.');
  assert.deepEqual(parts.at(-1), { text: '.' });
  assert.deepEqual(linkParts('no address here'), [{ text: 'no address here' }]);
});

test('auth-17: sign-in and Account Settings both use the one reading sheet, titled by the document', () => {
  for (const f of ['src/app/sign-in.tsx', 'src/app/account-settings.tsx']) {
    const s = src(f);
    assert.match(s, /<DocSheet/, `${f} opens the shared DocSheet`);
    assert.doesNotMatch(s, /title=\{[^}]*\.host/, `${f} must not title the sheet with a URL`);
  }
  assert.match(src('src/components/forge/DocSheet.tsx'), /Done/);
});

// ── auth-19: Enter in Email moves to Password ──────────────────────────────────────────────────────

test('auth-19: submitting the email field focuses the password field', () => {
  const s = src('src/app/sign-in.tsx');
  assert.match(s, /passwordRef\.current\?\.focus\(\)/);
  assert.match(s, /ref=\{passwordRef\}/);
});

// ── settings-18: switches say whether they are on, on web too ──────────────────────────────────────

test('settings-18: the shared toggles carry aria-checked (react-native-web drops accessibilityState)', () => {
  assert.match(src('src/components/forge/SettingsToggle.tsx'), /aria-checked=\{value\}/);
  assert.match(src('src/components/forge/inputs/ForgeToggle.tsx'), /aria-checked=\{value\}/);
});

// ── settings-28: the export is in local time ───────────────────────────────────────────────────────

test('settings-28: the CSV date is the athlete’s own clock, not UTC', () => {
  const evening = new Date(2026, 8, 4, 18, 5).toISOString();
  assert.equal(localStamp(evening), '2026-09-04 18:05');
  assert.equal(localStamp('not a date'), 'not a date');
});

// ── firstuser-21 / firstuser-15: help, and where Units live ────────────────────────────────────────

test('firstuser-21: Help & About can lead with Holt’s "How do I…?" — and only when asked for', () => {
  const on = settingsSections({ hasHoltHelp: true }).find((s) => s.key === 'about');
  assert.equal(on.rows[0].key, 'help');
  assert.deepEqual(on.rows[0].action, { type: 'holtHelp' });
  const off = settingsSections({}).find((s) => s.key === 'about');
  assert.ok(!off.rows.some((r) => r.key === 'help'));
});

test('firstuser-15: the Preferences row says Units are inside it', () => {
  const prefs = settingsSections({ hasPreferences: true }).flatMap((s) => s.rows).find((r) => r.key === 'prefs');
  assert.match(prefs.value ?? '', /units/i);
});

// ── settings-23: a handle cannot be cleared to nothing ─────────────────────────────────────────────

test('settings-23: a cleared handle does not count as a savable handle', () => {
  const s = src('src/app/edit-profile.tsx');
  const line = s.match(/const handleOk = ([^;]+);/)?.[1] ?? '';
  assert.ok(line.length > 0, 'handleOk is defined');
  assert.doesNotMatch(line, /'idle'/);
});
