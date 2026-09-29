import test from 'node:test';
import assert from 'node:assert/strict';

import { contactsNote } from '../notes/contacts.ts';

test('overdue follow-ups and new testers', () => {
  assert.equal(
    contactsNote({ total: 64, due: [{ name: 'Iron Temple Gym', daysOver: 2 }, { name: 'Jo', daysOver: 0 }], openTasks: 3, newTesters7d: 2 }),
    '2 follow-ups are due; Iron Temple Gym is the oldest, 2 days overdue. 2 new testers came in from the waitlist in the last 7 days.',
  );
});

test('no contacts at all', () => {
  assert.equal(
    contactsNote({ total: 0, due: [], openTasks: 0, newTesters7d: 0 }),
    'No contacts yet. Testers from the website waitlist and trainer seats show up here on their own; add anyone else with New contact.',
  );
  assert.equal(contactsNote(null), null);
});

test('one follow-up due today, singular tester', () => {
  assert.equal(
    contactsNote({ total: 5, due: [{ name: 'Marcus Hale', daysOver: 0 }], openTasks: 0, newTesters7d: 1 }),
    'Your follow-up with Marcus Hale is due today. 1 new tester came in from the waitlist in the last 7 days.',
  );
});

test('nothing due but open tasks', () => {
  assert.equal(contactsNote({ total: 5, due: [], openTasks: 1, newTesters7d: 0 }), 'No follow-ups are due. 1 task is still open.');
});
