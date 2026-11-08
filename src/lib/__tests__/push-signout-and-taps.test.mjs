/**
 * Launch QA 11-08 — H12 (a signed-out phone kept getting that account's pushes), H14 (a cold-start tap opened its
 * screen twice, and re-opened later), H16 (push-only kinds landed on an Inbox that could never hold them).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { destinationFor } from '../../domain/notifications/destination.ts';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('H12 — sign-out releases this phone\'s token BEFORE the session ends, capped so it never holds anyone in', () => {
  const auth = read('../auth.tsx');
  const out = auth.slice(auth.indexOf('const signOut = async'), auth.indexOf("await supabase.auth.signOut({ scope: 'local' })"));
  assert.match(out, /await releaseThisDevicesPushToken\(\);/);
  const live = read('../../data/push-live.ts');
  assert.match(live, /registeredToken = token;\n\s+return true;/);
  assert.match(live, /Promise\.race\(\[unregisterPushToken\(token\)\.catch\(\(\) => undefined\), new Promise<void>\(\(r\) => setTimeout\(r, 3000\)\)\]\)/);
});

test('H14 — a tap is routed once, by its notification id', () => {
  const push = read('../push.tsx');
  assert.match(push, /const handledTaps = new Set<string>\(\);/);
  assert.match(push, /if \(handledTaps\.has\(tapId\)\) return;\n\s+handledTaps\.add\(tapId\);/);
  assert.match(push, /addNotificationResponseReceivedListener\(\(r\) => \{\n\s+handledTaps\.add\(r\.notification\.request\.identifier\);/);
});

test('H16 — a cheer reply opens who replied; operator alerts open /admin', () => {
  assert.deepEqual(destinationFor({ kind: 'workout_cheer_reply', actorId: 'a1' }), { pathname: '/athlete/[id]', params: { id: 'a1' } });
  assert.equal(destinationFor({ kind: 'athlete_signup', actorId: 'a2' }), '/admin');
  assert.equal(destinationFor({ kind: 'feedback_filed' }), '/admin');
});
