import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
 * AI re-audit 11-20: a saved form check's marked frame (`form-frames/<uid>/<id>.jpg`, a picture of the athlete)
 * outlived the account — account deletion removed only `avatars` and `media`. These hold the three things the
 * removal depends on: the bucket is in the delete pass, the frames are keyed flat under the athlete's id (so a
 * one-level list by prefix finds them), and the owner may delete them (0221).
 */
const read = (rel) => readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

test('account deletion removes the athlete\'s form-check frames', () => {
  const src = read('src/data/account-live.ts');
  const m = src.match(/const OWNED_PREFIX_BUCKETS = \[([^\]]*)\]/);
  assert.ok(m, 'OWNED_PREFIX_BUCKETS is there');
  assert.match(m[1], /'form-frames'/);
});

test('form frames are keyed flat under the athlete\'s id, so the prefix pass finds every one', () => {
  const src = read('src/data/form-history-live.ts');
  assert.match(src, /form-frames\/<uid>\/<id>\.jpg/);
});

test('0221 lets the owner delete their own form frames', () => {
  const sql = read('supabase/migrations/0221_form_checks.sql');
  assert.match(sql, /create policy "form_frames_own_delete" on storage\.objects\s+for delete to authenticated/);
});
