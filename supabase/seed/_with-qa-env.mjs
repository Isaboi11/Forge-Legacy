// Run any script in this folder with the credentials from `.env.qa.local` already in `process.env`.
//
//   node supabase/seed/_with-qa-env.mjs reviewer-verify.mjs
//
// ══ WHY ══
//
// Every script here takes SB_EMAIL / SB_PASS from the environment, which normally means typing them on
// the command line. A password containing `&` — as these do — cannot be `source`d by a POSIX shell and
// is awkward to quote correctly in every shell that might run it; getting that wrong silently runs the
// script with NO credentials, which reads as a sign-in failure rather than a quoting mistake. Loading
// the gitignored file in Node sidesteps the shell entirely, and keeps the secret out of shell history.

import { readFileSync } from 'node:fs';

const target = process.argv[2];
if (!target) {
  console.error('usage: node supabase/seed/_with-qa-env.mjs <script.mjs> [args…]');
  process.exit(2);
}

try {
  const text = readFileSync(new URL('../../.env.qa.local', import.meta.url), 'utf8');
  for (const line of text.split('\n')) {
    if (!line.includes('=') || line.trimStart().startsWith('#')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    // Existing environment wins, so a one-off override on the command line still works.
    if (!process.env[key]) process.env[key] = line.slice(i + 1).trim();
  }
} catch {
  console.error('No .env.qa.local at the repo root. Create it with SB_EMAIL / SB_PASS / SB2_EMAIL / SB2_PASS.');
  process.exit(2);
}

// Arguments after the script name are forwarded, so flags like `--keep` still reach it.
process.argv = [process.argv[0], new URL(target, import.meta.url).pathname, ...process.argv.slice(3)];
await import(new URL(target, import.meta.url));
