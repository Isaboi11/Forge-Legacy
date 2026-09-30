// social2-28 (QA 09-26): the inbox drew a heart for every reaction; the kind is read from squad_post_reactions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');
const LIVE = fs.readFileSync(path.join(SRC, 'data/notifications-live.ts'), 'utf8');
const INBOX = fs.readFileSync(path.join(SRC, 'app/inbox.tsx'), 'utf8');

test('the feed reads each reaction kind by post + reactor, and a failed read falls back quietly', () => {
  assert.match(LIVE, /await attachReactionKinds\(out\)/);
  assert.match(LIVE, /\.from\('squad_post_reactions'\)\s*\.select\('post_id, user_id, kind'\)/);
  assert.match(LIVE, /if \(error \|\| !data\) return;/);
});

test('the inbox draws the kind with the same glyph the post uses, and names it', () => {
  assert.match(INBOX, /n\.kind === 'post_reaction' && n\.reactionKind \? <AckGlyph kind=\{n\.reactionKind\}/);
  assert.match(INBOX, /gave your post \$\{ACK_LABEL\[n\.reactionKind\]\}/);
});
