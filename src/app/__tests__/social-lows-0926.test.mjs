import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * The social low-severity pass (QA 09-26). The rules themselves are tested where they live
 * (`domain/text/__tests__/time-ago.test.mjs`, `domain/challenges/__tests__/season.test.mjs`); this pins the
 * wiring in route files `node --test` cannot load.
 */
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const SQUAD = read('../squad/[id].tsx');
const SETTINGS = read('../squad-settings.tsx');
const COMPOSER = read('../squad-composer.tsx');
const FRIENDS = read('../friends.tsx');
const CREATE = read('../create-challenge.tsx');
const LEDGER = read('../../components/forge/compositions/LedgerPost.tsx');

test('both doors to deleting a squad ask for DELETE to be typed (social-16)', () => {
  assert.match(SQUAD, /pathname: '\/squad-settings', params: \{ id: squad\.id, confirmDelete: '1' \}/);
  assert.doesNotMatch(SQUAD, /deleteSquad\(/, 'the squad page must not delete on its own one-tap confirm');
  assert.match(SETTINGS, /useState\(confirmDelete === '1'\)/);
});

test('Squad Settings uses the shared settings switch, not its own (visualB-19)', () => {
  assert.match(SETTINGS, /<SettingsToggle /);
  assert.doesNotMatch(SETTINGS, /swKnob/);
});

test('the squad page offers a competition you have not joined yet (social2-06)', () => {
  assert.match(SQUAD, /fetchSquadCompetitions\(squadId\)/);
  assert.match(SQUAD, /openChallenge \? \(/);
});

test('the composer names the Friends note for friends and gives each type its own mark (social-20, social2-16)', () => {
  assert.match(COMPOSER, /audience === 'FRIENDS' \? 'Note to your friends'/);
  assert.match(COMPOSER, /type === 'transformation'\s*\?\s*'transformation'/);
  assert.match(COMPOSER, /type === 'workout'\s*\?\s*'dumbbell'/);
  assert.doesNotMatch(COMPOSER, /<View style=\{styles\.authorDisc\} \/>/, 'the empty "You" ring is back');
});

test('your own Friends post draws your initials and the kind you chose (social2-17, social2-28)', () => {
  assert.match(FRIENDS, /avatarName=\{post\.authorName\}/);
  assert.match(FRIENDS, /ackKind=\{post\.myReaction \?\? undefined\}/);
  assert.match(LEDGER, /name=\{avatarName \?\? authorName\}/);
});

test('the athlete reads "Competition" on the create screen, like every other competition screen (B9)', () => {
  assert.match(CREATE, /<AppBar title="Create Competition"/);
  assert.match(CREATE, /useState<ChallengeType>\('MOST_DAYS'\)/, 'the default is the Recommended measure (social-32)');
  assert.match(CREATE, /router\.push\('\/add-friend'\)/, 'no friends is not a dead end (social-19)');
});
