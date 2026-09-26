import test from 'node:test';
import assert from 'node:assert/strict';
import { switchProgramCopy } from '../switch-program.ts';

test('names the current program, its progress, and says plainly it ends it', () => {
  const c = switchProgramCopy('Strength Foundation I', { completed: 1, total: 18 }, 'Mobility Foundation');
  assert.equal(c.title, 'Switch programs?');
  assert.match(c.body, /“Strength Foundation I” · 1 of 18 sessions/);
  assert.match(c.body, /Starting “Mobility Foundation” ends it/);
  assert.match(c.body, /ended early/);
  assert.match(c.body, /can’t be undone/);
  assert.equal(c.confirm, 'End Current Program & Start New');
  assert.equal(c.cancel, 'Cancel');
});

test('singular session, and a nameless next program', () => {
  const c = switchProgramCopy('One Week', { completed: 0, total: 1 }, '  ');
  assert.match(c.body, /0 of 1 session\./);
  assert.match(c.body, /Starting this program ends it/);
});
