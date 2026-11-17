/**
 * links.test.mjs — the links in what Holt says become tappable, and nothing else does (AI audit 2026-11-16, C-D3).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/__tests__/links.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { isOpenableLink, splitLinks } from '../links.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const T = (text) => ({ kind: 'text', text });
const L = (text, url = text) => ({ kind: 'link', text, url });
/** Every part joined back — the words on screen must be the words he said, nothing lost or doubled. */
const rejoin = (parts) => parts.map((p) => p.text).join('');

test('text with no link is one plain run, and empty text is nothing', () => {
  assert.deepEqual(splitLinks('Three sets of eight, then rest.'), [T('Three sets of eight, then rest.')]);
  assert.deepEqual(splitLinks(''), []);
});

test('⭐ the web-search answer: the site named, the link tappable', () => {
  const said = 'BBC Good Food has a good one: https://www.bbcgoodfood.com/recipes/chicken-chilli — about 40 minutes.';
  assert.deepEqual(splitLinks(said), [
    T('BBC Good Food has a good one: '),
    L('https://www.bbcgoodfood.com/recipes/chicken-chilli'),
    T(' — about 40 minutes.'),
  ]);
});

test('sentence punctuation after a link stays text', () => {
  assert.deepEqual(splitLinks('See https://example.com/a.'), [T('See '), L('https://example.com/a'), T('.')]);
  assert.deepEqual(splitLinks('Try https://example.com/a, or https://example.com/b!'), [
    T('Try '),
    L('https://example.com/a'),
    T(', or '),
    L('https://example.com/b'),
    T('!'),
  ]);
  assert.deepEqual(splitLinks('"https://example.com/q?x=1&y=2"'), [T('"'), L('https://example.com/q?x=1&y=2'), T('"')]);
});

test('a closing bracket the link never opened stays text; one it did open stays in the link', () => {
  assert.deepEqual(splitLinks('(from https://example.com/recipe)'), [T('(from '), L('https://example.com/recipe'), T(')')]);
  assert.deepEqual(splitLinks('https://en.wikipedia.org/wiki/Squat_(exercise)'), [L('https://en.wikipedia.org/wiki/Squat_(exercise)')]);
});

test('a markdown link shows its title, linked', () => {
  assert.deepEqual(splitLinks('Here: [Serious Eats chili](https://www.seriouseats.com/chili) is the one.'), [
    T('Here: '),
    L('Serious Eats chili', 'https://www.seriouseats.com/chili'),
    T(' is the one.'),
  ]);
});

test('⛔ only http and https — no other scheme becomes something the phone opens', () => {
  for (const said of [
    'call tel:+15555550100 now',
    'mailto:someone@example.com',
    'javascript:alert(1)',
    'open forgelegacy://admin',
    'www.example.com has it',
    'ftp://example.com/file',
    '[click](javascript:alert(1))',
    '[call](tel:911)',
    'https:// nothing after the scheme',
  ]) {
    const parts = splitLinks(said);
    assert.ok(parts.every((p) => p.kind === 'text'), `${said} → ${JSON.stringify(parts)}`);
    assert.equal(rejoin(parts), said, 'and the words are unchanged');
  }
  assert.equal(isOpenableLink('https://example.com'), true);
  assert.equal(isOpenableLink('HTTP://EXAMPLE.COM/x'), true);
  for (const bad of ['javascript:alert(1)', 'tel:911', 'https://', 'https:///x', ' https://example.com', 'example.com']) assert.equal(isOpenableLink(bad), false, bad);
});

test('the words on screen are the words he said — every split rejoins to the original', () => {
  for (const said of [
    'See https://example.com/a. Then https://example.com/b, and (https://example.com/c).',
    'Bold **https://example.com/x** and _https://example.com/y_ too',
    'Two in a row https://a.example https://b.example',
    'Mid-stream half a link https://www.bbcgood',
  ]) {
    assert.equal(rejoin(splitLinks(said)), said, said);
  }
});

test('splitting is stable when called again (no regex state leaks between calls)', () => {
  const said = 'one https://example.com/1 two https://example.com/2';
  assert.deepEqual(splitLinks(said), splitLinks(said));
});

test('⚠ the sheet draws every Holt line through HoltWords — selectable, links opened only if http(s)', () => {
  const sheet = readFileSync(path.join(here, '../../../components/forge/CoachChatSheet.tsx'), 'utf8');
  assert.match(sheet, /<HoltWords text=\{text\} style=\{\[styles\.holtText, !live && styles\.holtTextPast\]\} \/>/);
  assert.match(sheet, /return <HoltWords text=\{text\} style=\{styles\.holtText\} \/>;/);
  const words = readFileSync(path.join(here, '../../../components/forge/HoltWords.tsx'), 'utf8');
  assert.match(words, /<Text style=\{style\} selectable>/);
  assert.match(words, /if \(isOpenableLink\(p\.url\)\) void Linking\.openURL\(p\.url\)\.catch\(\(\) => undefined\);/);
  assert.match(words, /accessibilityRole="link"/);
  // A token, so each theme draws its own link colour; no raw colour value in the component.
  assert.match(words, /color: flColor\.bronzeInk/);
  assert.doesNotMatch(words, /#[0-9a-f]{3,8}\b|rgba?\(/i);
});
