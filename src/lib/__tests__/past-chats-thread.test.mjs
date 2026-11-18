/**
 * past-chats-thread.test.mjs — the device half of past chats (AI Road to 10 Sprint 4b §1.5).
 *
 *   · the chat id is minted at the first athlete line, kept with the place, and forgotten with the thread;
 *   · nothing gets an id once the conversation has been ended (the write gate);
 *   · the end hands the past-chat sync the turns, the place (chat id) and the summariser's outcome;
 *   · `readThreadPlace` keeps a continued chat's head only with its chat id; `withHeldPlace` never drops them;
 *   · ⛔ sign-out (and Delete Account, which comes through it) clears the thread — silently.
 *
 * `coach-thread.ts` loads under node (AsyncStorage's calls throw there and are swallowed, as on a broken device),
 * so its module state can be driven directly.
 *
 * Run:  node --test src/lib/__tests__/past-chats-thread.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as ct from '../coach-thread.ts';
import { readThreadPlace, withHeldPlace } from '../../domain/coach/thread-lifecycle.ts';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const said = [{ kind: 'me', text: 'Build me a week' }, { kind: 'holt', text: 'Here it is.' }];

test('the chat id: none before an athlete line, one at it, the same one after, gone with the thread', async () => {
  await ct.loadThread(); // opens the gate, forgets any held place
  assert.equal(ct.ensureChatId([{ kind: 'holt', text: "I'm Holt." }]), null, 'the introduction is not a chat');
  const id = ct.ensureChatId(said);
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(ct.ensureChatId([...said, { kind: 'me', text: 'more' }]), id);
  await ct.saveThread(said, { mode: null, constraints: {} });
  assert.equal(ct.heldPlace().chatId, id);
  await ct.clearThread();
  assert.equal(ct.heldPlace(), null);
  assert.equal(ct.ensureChatId(said), null, 'an ended conversation gets no new id (the write gate)');
  await ct.loadThread();
  assert.notEqual(ct.ensureChatId(said), id, 'the next conversation is a new row');
  await ct.clearThread();
});

test('the end hands the past-chat sync the turns, the chat id, and the summariser\'s outcome', async () => {
  await ct.loadThread();
  await ct.saveThread(said, { mode: null, constraints: {} });
  const id = ct.heldPlace().chatId;
  let ended = null;
  ct.whenThreadEnds(() => Promise.resolve({ summary: 'Wants a 4 day week.', kept: 1 }));
  ct.afterThreadEnds((e) => {
    ended = e;
  });
  await ct.endThread();
  assert.equal(ended.place.chatId, id);
  assert.deepEqual(ended.turns.map((t) => t.text), ['Build me a week', 'Here it is.']);
  assert.deepEqual(await ended.outcome, { summary: 'Wants a 4 day week.', kept: 1 });

  // A summariser that throws or rejects never stops the end, and the outcome never rejects.
  await ct.loadThread();
  await ct.saveThread(said, { mode: null, constraints: {} });
  ct.whenThreadEnds(() => Promise.reject(new Error('down')));
  await ct.endThread();
  assert.equal(await ended.outcome, undefined);
  ct.whenThreadEnds(null);
  ct.afterThreadEnds(null);
});

test('nothing is handed over when there was no conversation', async () => {
  await ct.loadThread();
  let called = false;
  ct.afterThreadEnds(() => {
    called = true;
  });
  await ct.endThread();
  assert.equal(called, false);
  ct.afterThreadEnds(null);
});

test('readThreadPlace keeps a continued chat\'s head only with its chat id, and only well-formed lines', () => {
  const head = [{ role: 'athlete', text: 'A' }, { role: 'note', text: '[x]' }, { role: 'system', text: 'no' }, { role: 'holt' }];
  const p = readThreadPlace(JSON.stringify({ mode: null, constraints: {}, chatId: 'c1', continued: { head } }));
  assert.deepEqual(p.continued, { head: [{ role: 'athlete', text: 'A' }, { role: 'note', text: '[x]' }] });
  assert.equal(readThreadPlace(JSON.stringify({ mode: null, constraints: {}, continued: { head } })).continued, undefined);
  assert.equal(readThreadPlace(JSON.stringify({ mode: null, constraints: {}, chatId: 'c1', continued: 'x' })).continued, undefined);
});

test('withHeldPlace: the sheet\'s { mode, constraints } can never drop the chat id, the recap or the head', () => {
  const held = { chatId: 'c1', recap: { text: 'R', through: 4 }, continued: { head: [{ role: 'athlete', text: 'A' }] } };
  assert.deepEqual(withHeldPlace({ mode: 'day', constraints: {} }, held), { mode: 'day', constraints: {}, ...held });
  // What the caller passed wins (lane A may pass its recap).
  assert.deepEqual(withHeldPlace({ mode: null, constraints: {}, recap: { text: 'New', through: 8 } }, held).recap, { text: 'New', through: 8 });
  // A head never rides with a different chat.
  assert.equal(withHeldPlace({ mode: null, constraints: {}, chatId: 'c2' }, held).continued, undefined);
  assert.deepEqual(withHeldPlace({ mode: null, constraints: {} }, null), { mode: null, constraints: {} });
});

test('⛔ sign-out clears Holt\'s thread on this phone — clearThread, never endThread — and Delete Account comes through it', () => {
  const auth = read('../auth.tsx');
  const out = auth.slice(auth.indexOf('const signOut = async'), auth.indexOf("await supabase.auth.signOut({ scope: 'local' })"));
  assert.match(out, /await clearThread\(\);/);
  assert.ok(!/\bendThread\(/.test(out), 'signing out must not summarise or save a chat on the way out');
  assert.match(auth, /import \{ clearThread \} from '\.\/coach-thread';/);
  const settings = read('../../app/account-settings.tsx');
  const del = settings.slice(settings.indexOf('deleteMyAccount(),'), settings.indexOf('deleteMyAccount(),') + 600);
  assert.match(del, /await signOut\(\);/, 'Delete Account signs out, which clears the thread');
  // …and the other device handover path still clears it too.
  assert.match(read('../first-run.ts'), /\n\s+clearThread\(\),/);
});

test('clearThread forgets the place as well as the words', () => {
  const src = read('../coach-thread.ts');
  const fn = src.slice(src.indexOf('export async function clearThread'), src.indexOf('export async function clearThread') + 500);
  assert.match(fn, /held = null;/);
  assert.match(fn, /multiRemove\(\[KEY, PLACE_KEY\]\)/);
});
