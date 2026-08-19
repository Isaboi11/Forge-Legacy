#!/usr/bin/env node
/**
 * PreToolUse guard: refuse to publish from a dirty working tree.
 *
 * `expo export` bundles the WORKING TREE, not HEAD. Uncommitted edits ship silently and then
 * look like a bug in whatever feature the pass was meant to release. This has happened.
 *
 * Fires only on eas deploy / eas update. Exit 2 blocks the call and hands the message back.
 * Override for a deliberate throwaway deploy:  $env:FL_ALLOW_DIRTY_PUBLISH = "1"
 */
import { execFileSync } from 'node:child_process';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

const read = () =>
  new Promise((resolve) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (raw += c));
    process.stdin.on('end', () => resolve(raw));
  });

const payload = await read();

let command = '';
try {
  command = JSON.parse(payload)?.tool_input?.command ?? '';
} catch {
  process.exit(0); // not a shape we understand — never block on our own parse failure
}

/**
 * Only the *executable* part of the command counts. Text that merely mentions publishing —
 * a commit message in a heredoc, a `--message` string, a doc edit — must not be blocked.
 * (This guard blocked its own commit before this existed.)
 */
const executablePart = (raw) => {
  // heredoc bodies: <<EOF ... EOF, <<'EOF' ... EOF, <<-EOF ... EOF
  let s = raw.replace(
    /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?^\s*\2\s*$/gm,
    ' ',
  );
  // an unterminated heredoc: drop everything from the marker on
  const dangling = s.search(/<<-?\s*['"]?[A-Za-z_]/);
  if (dangling !== -1) s = s.slice(0, dangling);
  // quoted arguments — a real publish still matches, its `eas … update` sits outside the quotes
  return s.replace(/'[^']*'/g, ' ').replace(/"[^"]*"/g, ' ');
};

// Matches `eas deploy`, `eas update`, `npx eas-cli@latest deploy`, `npx --yes eas-cli update`, ...
// The negative lookahead spares the read-only subcommands — `deploy:list`, `update:list`,
// `update:republish` — which publish nothing and must never be blocked.
const isPublish = /\beas(?:-cli)?(?:@[\w.]+)?\b[^\n|;&]*?\s(deploy|update)(?![:\w])/.test(
  executablePart(command),
);
if (!isPublish) process.exit(0);

if (process.env.FL_ALLOW_DIRTY_PUBLISH === '1') process.exit(0);

let dirty = '';
try {
  dirty = execFileSync('git', ['status', '--porcelain'], {
    cwd: PROJECT_DIR,
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
} catch {
  process.exit(0); // no git, no opinion
}

if (!dirty) process.exit(0);

const files = dirty.split(/\r?\n/);
const shown = files.slice(0, 20).join('\n');
const more = files.length > 20 ? `\n  ... and ${files.length - 20} more` : '';

process.stderr.write(
  `BLOCKED: publishing from a dirty working tree.\n\n` +
    `\`expo export\` bundles the working tree, not HEAD — these ${files.length} change(s) would ` +
    `ship with the build:\n\n${shown}${more}\n\n` +
    `Commit (or stash) first, then publish. If this is a deliberate throwaway deploy, set ` +
    `FL_ALLOW_DIRTY_PUBLISH=1 for that command — and do not hand the resulting URL to the PO.\n`,
);
process.exit(2);
