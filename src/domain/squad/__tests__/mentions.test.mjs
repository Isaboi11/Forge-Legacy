import test from 'node:test';
import assert from 'node:assert/strict';

import { activeMentionQuery, insertMention, matchMentionables, mentionSuggestions, pickedIn, splitMentions } from '../mentions.ts';

/**
 * Tagging squad-mates (0265). PO 2026-11-13: "if I put their @ or name … it'll come up to click".
 * The cases below are the two ways in ("@" and a bare name), the replace, and what counts as still tagged.
 */

const people = [
  { id: 'b', name: 'Brady Altamirano', avatarUrl: null },
  { id: 'j', name: 'Jake Moreno', avatarUrl: null },
  { id: 'a', name: 'Ann Lee', avatarUrl: null },
  { id: 'n', name: 'Annabel Cruz', avatarUrl: null },
  { id: 't', name: 'Theo Park', avatarUrl: null },
];
const names = (r) => (r ? r.matches.map((p) => p.id) : []);

test('a bare "@" opens the whole squad, alphabetically', () => {
  const r = mentionSuggestions('Great lift @', 12, people);
  assert.deepEqual(names(r), ['a', 'n', 'b', 'j', 't']);
  assert.equal(r.query.start, 11);
  assert.equal(r.query.viaAt, true);
});

test('"@" narrows by first name, last name, or the full name with its space', () => {
  assert.deepEqual(names(mentionSuggestions('@br', 3, people)), ['b']);
  assert.deepEqual(names(mentionSuggestions('@mor', 4, people)), ['j']);
  assert.deepEqual(names(mentionSuggestions('@Brady ', 7, people)), ['b']);
  assert.deepEqual(names(mentionSuggestions('@Brady Al', 9, people)), ['b']);
  assert.deepEqual(names(mentionSuggestions('@ann', 4, people)), ['a', 'n']);
});

test('an "@" inside a word (an email) is not a tag', () => {
  assert.equal(activeMentionQuery('mail me at x@br', 15), null);
});

test('a bare name opens the list only when capitalised, 3+ letters, and someone has that name', () => {
  assert.deepEqual(names(mentionSuggestions('nice one Bra', 12, people)), ['b']);
  assert.equal(mentionSuggestions('nice one Br', 11, people), null, 'two letters is not enough');
  assert.equal(mentionSuggestions('nice one bra', 12, people), null, 'lowercase words never pull the list up');
  assert.equal(mentionSuggestions('Great', 5, people), null, 'a capitalised word that is nobody shows nothing');
});

test('a finished tag stops searching, and a name typed after it is offered on its own', () => {
  assert.equal(mentionSuggestions('@Brady Altamirano great job', 27, people), null);
  assert.deepEqual(names(mentionSuggestions('@Brady Altamirano Jak', 21, people)), ['j']);
});

test('only text before the cursor counts — a tag can go mid-sentence', () => {
  const text = 'thanks @ja for the spot';
  assert.deepEqual(names(mentionSuggestions(text, 10, people)), ['j']);
});

test('picking replaces the query with "@Full Name " and puts the cursor after it', () => {
  const q = activeMentionQuery('Great lift @bra', 15);
  const r = insertMention('Great lift @bra', q, 'Brady Altamirano');
  assert.equal(r.text, 'Great lift @Brady Altamirano ');
  assert.equal(r.cursor, r.text.length);

  const mid = 'thanks @ja for the spot';
  const q2 = activeMentionQuery(mid, 10);
  const r2 = insertMention(mid, q2, 'Jake Moreno');
  assert.equal(r2.text, 'thanks @Jake Moreno for the spot', 'no double space before existing text');

  const bare = 'nice one Bra';
  const q3 = activeMentionQuery(bare, 12);
  assert.equal(q3.viaAt, false);
  assert.deepEqual(matchMentionables(people, q3).map((p) => p.id), ['b']);
  const r3 = insertMention(bare, q3, 'Brady Altamirano');
  assert.equal(r3.text, 'nice one @Brady Altamirano ', 'a bare name becomes a tag too');
});

test('only picks still whole in the text are tagged, once each', () => {
  const picked = [
    { id: 'b', name: 'Brady Altamirano' },
    { id: 'j', name: 'Jake Moreno' },
    { id: 'b', name: 'Brady Altamirano' },
  ];
  assert.deepEqual(pickedIn('@Brady Altamirano and @Jake Moreno', picked), ['b', 'j']);
  assert.deepEqual(pickedIn('@Brady Altamirano and Jake', picked), ['b'], 'the @ was deleted — not tagged');
  assert.deepEqual(pickedIn('@Brady Altamiranos', picked), [], 'an edited name is not the tag');
  assert.deepEqual(pickedIn('(@Brady Altamirano)', picked), ['b']);
});

test('drawing: tagged names become their own segments; untagged "@" text stays plain', () => {
  const segs = splitMentions('Big PR @Ann Lee and @Annabel Cruz, @Nobody', [
    { id: 'a', name: 'Ann Lee' },
    { id: 'n', name: 'Annabel Cruz' },
  ]);
  assert.deepEqual(segs, [
    { text: 'Big PR ' },
    { text: '@Ann Lee', id: 'a' },
    { text: ' and ' },
    { text: '@Annabel Cruz', id: 'n' },
    { text: ', @Nobody' },
  ]);
  assert.deepEqual(splitMentions('no tags here', []), [{ text: 'no tags here' }]);
  assert.deepEqual(splitMentions('@Ann Leeway', [{ id: 'a', name: 'Ann Lee' }]), [{ text: '@Ann Leeway' }]);
});
