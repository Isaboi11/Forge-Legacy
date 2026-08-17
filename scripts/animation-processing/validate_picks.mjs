/**
 * Checks the replacement clips chosen in `alternates-review.html` BEFORE any of them is processed.
 *
 * WHY A PICK NEEDS CHECKING AT ALL: the picker shows two stills, and a still settles posture and
 * equipment but not the whole movement. A clean-and-press and a push-press look identical at the
 * top. A cable machine and a band both read as "a handle on a line" in one frame. So a pick can
 * carry the SAME class of error it was chosen to fix — and these rejections were mostly equipment
 * errors in the first place, which makes that the likely failure, not an unlikely one.
 *
 * This compares the chosen filename against the exercise NAME, the same way `audit_sources.mjs`
 * does, and additionally against the PO's own rejection note — the note says what was wrong, so a
 * replacement that still contradicts it is the one worth stopping on.
 *
 * It blocks nothing. It prints what to look at twice.
 *
 *   node scripts/animation-processing/validate_picks.mjs <alternate-picks.json>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const PICKS = process.argv[2] || path.join(HERE, 'alternate-picks.json');

const STOP = new Set(['the', 'a', 'with', 'to', 'and', 'of', 'on', 'in', 'male', 'female', 'fix',
                      'for', 'at', 'an', '', 'version', 'variation', 'gym', 'workout', 'home',
                      'library', 'database', 'mp4']);
const MUSCLE = new Set(['chest', 'back', 'shoulder', 'shoulders', 'thigh', 'thighs', 'hip', 'hips',
                        'waist', 'upper', 'arm', 'arms', 'calf', 'calve', 'calves', 'forearm',
                        'forearms', 'cardio', 'plyometric', 'plyometrics', 'stretching', 'stretch',
                        'weightlifting', 'weightlift']);

const toks = (s) => new Set(
  String(s || '').toLowerCase().replace(/&/g, 'and').split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => w.replace(/(?<=.{3})s$/, ''))
);

/** Equipment is the hard constraint: naming one and showing another is always wrong. */
const EQUIPMENT = ['cable', 'band', 'dumbbell', 'barbell', 'kettlebell', 'machine', 'lever',
                   'smith', 'trap', 'medicine', 'bodyweight'];
/** These change the movement even when the equipment is right. */
const MOVEMENT = ['clean', 'snatch', 'jerk', 'press', 'curl', 'row', 'fly', 'raise', 'squat',
                  'lunge', 'crunch', 'thrust', 'extension', 'pulldown', 'pullover', 'deadlift'];
const POSTURE = ['standing', 'seated', 'sitting', 'lying', 'kneeling', 'incline', 'decline', 'flat'];

const picks = JSON.parse(fs.readFileSync(PICKS, 'utf8'));
const alternates = JSON.parse(fs.readFileSync(path.join(HERE, 'alternates.json'), 'utf8'));
const byKey = new Map(alternates.map((a) => [a.key, a]));

const chosen = [], none = [], concerns = [], renames = [];
for (const [key, p] of Object.entries(picks)) {
  if (p.none || !p.file) { none.push(key); continue; }
  chosen.push(key);

  const row = byKey.get(key);
  const name = row?.name || p.id;
  const note = row?.note || '';
  const want = toks(name);
  const got = new Set([...toks(p.file.replace(/\.mp4$/i, ''))].filter((w) => !MUSCLE.has(w)));
  const noteT = toks(note);

  const issues = [];

  // Equipment named by the exercise but absent from the pick — and something else present instead.
  const wantEq = EQUIPMENT.filter((e) => want.has(e));
  const gotEq = EQUIPMENT.filter((e) => got.has(e));
  for (const e of wantEq) {
    if (!got.has(e)) {
      const instead = gotEq.filter((g) => g !== e);
      // `machine` and `lever` are the same thing in this library's naming.
      const equivalent = (e === 'machine' && got.has('lever')) || (e === 'lever' && got.has('machine'));
      if (!equivalent) issues.push(`wants ${e.toUpperCase()}, pick is ${instead.length ? instead.join('/').toUpperCase() : 'not equipment-named'}`);
    }
  }

  // A movement word in the pick that the exercise never asked for (clean-and-press vs push press).
  const extraMove = MOVEMENT.filter((m) => got.has(m) && !want.has(m));
  if (extraMove.length) issues.push(`pick adds movement "${extraMove.join(' ')}"`);

  /**
   * The note said what was wrong; does the pick still contradict it? Read it with the negation
   * intact — "standing cable chest fly. Not sitting" names BOTH postures, and a checker that only
   * counts words concludes the note asked for sitting. Words after a negation are what the PO does
   * NOT want, and must be subtracted before anything is required.
   */
  const negated = new Set();
  for (const m of note.matchAll(/\bnot\s+((?:\w+\s*){1,3})/gi)) for (const w of toks(m[1])) negated.add(w);
  const asks = (w) => noteT.has(w) && !negated.has(w);

  for (const w of POSTURE.filter(asks)) {
    const opposite = { standing: ['seated', 'sitting', 'lying'], seated: ['standing'], sitting: ['standing'],
                       lying: ['standing'], flat: ['incline', 'decline'] }[w] || [];
    if (!got.has(w) && opposite.some((o) => got.has(o))) issues.push(`note asks for "${w}", pick is ${opposite.filter((o) => got.has(o)).join('/')}`);
  }
  for (const w of POSTURE.filter((w) => negated.has(w))) {
    if (got.has(w)) issues.push(`note says NOT "${w}", pick is ${w}`);
  }
  for (const e of EQUIPMENT.filter(asks)) {
    if (!got.has(e) && !(e === 'machine' && got.has('lever'))) issues.push(`note asks for "${e}", pick does not name it`);
  }

  // "Single arm" is a different exercise from the two-arm version, in both directions — unless the
  // PO's note explicitly asked for the single-arm take, which makes it the intended answer and the
  // catalog NAME the thing that is out of step.
  const wantsSingle = want.has('single') || want.has('one');
  const noteWantsSingle = asks('single') || asks('one');
  const gotSingle = got.has('single') || got.has('one') || got.has('half');
  if (wantsSingle && !gotSingle) issues.push('wants SINGLE-arm/leg, pick is not');
  if (!wantsSingle && gotSingle && !noteWantsSingle) issues.push('pick is SINGLE-arm/leg, exercise is not');
  if (!wantsSingle && gotSingle && noteWantsSingle) {
    renames.push({ key, name, file: p.file, why: 'your note asked for the single-arm take — the clip is right, the catalog name is not' });
  }

  if (issues.length) concerns.push({ key, name, note, file: p.file, issues });
}

const undecided = alternates.filter((a) => !picks[a.key]);

console.log(`picks file: ${path.relative(ROOT, PICKS)}`);
console.log(`  replacement chosen : ${chosen.length}`);
console.log(`  marked no option   : ${none.length}`);
console.log(`  not yet decided    : ${undecided.length}`);
console.log(`  LOOK AGAIN         : ${concerns.length}\n`);

if (concerns.length) {
  console.log(`── worth a second look before processing ──`);
  for (const c of concerns) {
    console.log(`\n  ${c.key}   (${c.name})`);
    if (c.note) console.log(`     your note : "${c.note}"`);
    console.log(`     picked    : ${c.file}`);
    for (const i of c.issues) console.log(`     ⚠ ${i}`);
  }
}

if (renames.length) {
  console.log(`\n── the clip is right, the catalog entry is what disagrees (${renames.length}) ──`);
  for (const r of renames) {
    console.log(`  ${r.key}   (${r.name})`);
    console.log(`     ${r.file}`);
    console.log(`     ${r.why}`);
  }
}

if (undecided.length) {
  console.log(`\n── not yet decided (${undecided.length}) ──`);
  for (const u of undecided) console.log(`  ${u.key}  ${u.candidates.length ? `(${u.candidates.length} candidates)` : '(no candidates)'}`);
}

const clean = chosen.filter((k) => !concerns.some((c) => c.key === k));
fs.writeFileSync(path.join(HERE, 'picks-validated.json'), JSON.stringify({ clean, concerns, none, undecided: undecided.map((u) => u.key) }, null, 2));
console.log(`\nclean and ready to process: ${clean.length}`);
console.log(`-> ${path.relative(ROOT, path.join(HERE, 'picks-validated.json'))}`);
