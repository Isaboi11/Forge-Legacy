// node --experimental-strip-types --test src/lib/__tests__/form-clip-any-length.test.mjs
//
// PO 11-17: "won't let me put a clip more than a minute long in there". Form check's library button went through the
// app's one picker, which hands the iOS library `videoMaxDuration` for EVERY pick, so a long gym video could not be
// chosen at all, though the trim screen exists to cut a set out of one. Form check only reads frames on the phone
// and never uploads the clip, so it asks for `localOnly`: no length cap from the library, no transcode. Source pins:
// the picker launch needs a phone to run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const picker = fs.readFileSync(new URL('../useMediaPicker.tsx', import.meta.url), 'utf8');
const form = fs.readFileSync(new URL('../../data/form-check-live.ts', import.meta.url), 'utf8');

test('a localOnly LIBRARY pick has no length cap; the camera keeps it', () => {
  assert.match(picker, /config\.localOnly && source === 'library'\s*\?\s*0\s*:/);
  assert.match(picker, /Math\.min\(config\.videoMaxDuration, MAX_VIDEO_SECONDS\)/);
});

test('a localOnly video is not transcoded', () => {
  assert.match(picker, /if \(asset\.type !== 'video' \|\| config\.localOnly\) \{/);
});

test('form check asks for localOnly, and nothing that uploads does', () => {
  assert.match(form, /videoMaxDuration: FORM_CLIP_SECONDS,\s*localOnly: true,/);
  const src = new URL('../../', import.meta.url);
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      const p = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && /localOnly:\s*true/.test(fs.readFileSync(p, 'utf8'))) hits.push(e.name);
    }
  };
  walk(src);
  assert.deepEqual(hits, ['form-check-live.ts']);
});
