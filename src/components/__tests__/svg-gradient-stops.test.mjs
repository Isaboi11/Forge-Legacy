import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

/**
 * A source guard, because this one is invisible until it is on a phone.
 *
 * `stopColor="rgba(r,g,b,a)"` is valid CSS and a browser honours the alpha, so a soft radial glow looks
 * right in every web preview. `react-native-svg` takes the colour and the alpha as SEPARATE props and
 * drops the alpha out of an rgba string — so the same gradient paints as a fully opaque rectangle on
 * device. The Welcome screen shipped to TestFlight with two solid bronze boxes stacked behind the logo.
 *
 * Nothing in tsc, eslint or a web export can see this. The rule is the only thing that can.
 *
 * ══ WHY THIS FILE EXCLUDES ITSELF ══
 *
 * `git grep` searches TRACKED files. When this guard was written the file was still untracked, so the
 * search could not see it and the suite was green. Committing it made it tracked — and the doc comment
 * above contains the very literal it searches for, so from `157bf34` onward it matched ITSELF and failed
 * on every run since, reporting its own explanation as a defect.
 *
 * The pathspec below excludes this one file. The alternative — rewriting the comment so it never spells
 * out the bad pattern — would trade a working guard for an unreadable one, and the whole value of this
 * test is that someone who trips it can read what they did wrong.
 *
 * A source guard that greps for a string it must also SAY is a shape worth recognising: any test written
 * this way has to exclude itself, or it is born failing the moment it lands.
 */
test('no SVG gradient stop carries its alpha inside an rgba() string', () => {
  let hits = '';
  try {
    // git grep exits 1 when there are no matches, which is the passing case.
    hits = execSync(
      'git grep -n "stopColor=\\"rgba(" -- src ":!src/components/__tests__/svg-gradient-stops.test.mjs"',
      { maxBuffer: 1e8 },
    )
      .toString()
      .trim();
  } catch {
    hits = '';
  }

  assert.equal(
    hits,
    '',
    'react-native-svg ignores the alpha in an rgba() stopColor, so these render opaque on device.\n' +
      'Use stopColor="rgb(r,g,b)" with a separate stopOpacity={a}:\n\n' +
      hits,
  );
});
