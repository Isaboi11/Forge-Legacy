import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * A tester froze twice on seal → "Post and see your Legacy" (PO 10-01). That button toasts and leaves in one
 * tick, and the tab underneath can enqueue an honor ceremony while the full-screen summary is still closing.
 * Both are native Modals; iOS drops or orphans one presented mid-dismissal, leaving an invisible window
 * that takes every tap. These hold the guard in place by source, since the failure only exists on a device.
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const provider = read('../../hooks/useCeremony.tsx');
const summary = read('../workout-complete.tsx');

test('leaving the summary holds overlays BEFORE it dismisses', () => {
  const go = summary.slice(summary.indexOf('const goHome = () => {'));
  const hold = go.indexOf('holdOverlays(');
  const dismiss = go.indexOf('router.dismissAll()');
  const replace = go.indexOf("router.replace('/(tabs)/legacy')");
  assert.ok(hold > -1, 'goHome never holds overlays');
  assert.ok(hold < dismiss && hold < replace, 'the hold must come before the screen starts closing');
});

test('the provider keeps BOTH the ceremony and the toast off screen while held', () => {
  assert.match(provider, /\{current && copy && !holding \? \(/, 'a ceremony can present mid-close');
  assert.match(provider, /<Toast open=\{toast != null && !holding\}/, 'a toast can present mid-close');
});

test('a hold delays, it never drops: the queue and the toast message are untouched by it', () => {
  const body = provider.slice(provider.indexOf('holdListener = (ms) => {'), provider.indexOf('holdListener = null'));
  assert.ok(!/setQueue|setToast/.test(body), 'holding must not clear what is waiting to be shown');
});
