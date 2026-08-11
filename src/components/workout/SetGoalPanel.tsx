import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { flColor, flFont, flRadius } from '@/constants/foundation';
import {
  applyRepGoal,
  applyTimeGoal,
  fmtGoalSec,
  goalModeOf,
  goalRepsOf,
  goalSecOf,
  parseGoalReps,
  parseGoalSec,
  stepReps,
  stepSec,
} from '@/domain/workout/set-goal';
import type { SessionExercise } from '@/domain/workout/types';

/**
 * THE GOAL — one row, opened from the Goal figure on the card above it.
 *
 * ══ ⚠ IT USED TO OPEN ITSELF, AND IT USED TO BE TWICE THIS SIZE ══
 *
 * PO: *"I don't like that right there. I want it to be after we click add exercise and then clicking the
 * card of the workout. Make it simple and not too crowded."*
 *
 * Two separate faults, and the second only mattered because of the first. It appeared UNBIDDEN on every
 * lift added from the Picker — so adding three exercises meant dismissing three forms before training —
 * and it carried a header row on top of its controls: a *"What's the goal?"* kicker, an "All 3 sets"
 * counter and a Done button, none of which were the control the athlete came for. Auto-opening made a
 * heavy panel feel like an obstruction rather than a tool.
 *
 * So: it opens on request, and it is ONE ROW — the chooser and the stepper, nothing else. The header is
 * gone entirely. The kicker was a question nobody was being asked any more, the set counter said what the
 * table directly underneath already shows, and Done duplicated the Goal figure that opened it (tapping
 * that again closes it, and the goal is already written by then — there was never anything to commit).
 *
 * ══ WHY IT IS ON THE CARD AND NOT A SHEET ══
 *
 * The goal applies to the sets in the table two inches below, and the Target column repaints as the
 * number changes — so the answer is visible in the same glance as the control. A sheet would cover the
 * thing it is describing and cost a second dismiss on a screen whose whole job is to stay out of the way.
 *
 * ══ THREE WAYS TO SET IT, ONE OF THEM ALWAYS FASTEST ══
 *
 * ± steps (a rep at a time, fifteen seconds at a time), and the value itself is a live TextInput — so
 * "12" is two taps and a keystroke rather than four presses of +.
 *
 * ⚠ THE VALUE IS AN ALWAYS-MOUNTED INPUT, NOT A `Text` THAT SWAPS TO ONE ON PRESS. The swap is the
 * pattern `CardioBlockCard` uses, and it needs `autoFocus` to raise the keyboard — a focus() issued after
 * mount, which is OUTSIDE the user-gesture call stack that iOS Safari requires before it will show a
 * keyboard at all (the same rule `workout.tsx`'s keyboard primer exists to work around). Tapping a field
 * that is already there focuses it inside the gesture, with nothing to work around.
 *
 * Every change writes STRAIGHT THROUGH to the session. There is no draft to lose and no Apply to forget.
 */
export function SetGoalPanel({
  exercise,
  onChange,
}: {
  exercise: SessionExercise;
  onChange: (next: SessionExercise) => void;
}) {
  /**
   * What is in the box WHILE they are typing, and only then.
   *
   * `null` means "show the committed value", which is what a stepper tap must go back to. Held as a
   * string because a half-typed "1:" is a real state that no number can hold — and rejecting it outright
   * would make the colon impossible to type.
   */
  const [draft, setDraft] = useState<string | null>(null);

  const mode = goalModeOf(exercise);
  const reps = goalRepsOf(exercise);
  const sec = goalSecOf(exercise);

  const commitReps = (n: number) => onChange(applyRepGoal(exercise, n));
  const commitSec = (n: number) => onChange(applyTimeGoal(exercise, n));

  /** A stepper tap abandons the draft: the field must show the number the button just produced. */
  const step = (dir: 1 | -1) => {
    setDraft(null);
    if (mode === 'reps') commitReps(stepReps(reps, dir));
    else commitSec(stepSec(sec, dir));
  };

  const typed = (t: string) => {
    // Reps take digits; a clock takes digits and one colon. Filtered rather than validated so the field
    // never fights the thumb — what it cannot parse yet simply does not commit.
    const clean = mode === 'reps' ? t.replace(/[^0-9]/g, '').slice(0, 3) : t.replace(/[^0-9:]/g, '').slice(0, 5);
    setDraft(clean);
    const n = mode === 'reps' ? parseGoalReps(clean) : parseGoalSec(clean);
    if (n != null) {
      if (mode === 'reps') commitReps(n);
      else commitSec(n);
    }
  };

  const display = mode === 'reps' ? String(reps) : fmtGoalSec(sec);

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        {/* Reps or a clock. Tapping either writes the goal immediately — the Target column below is the
            confirmation, so there is nothing to preview. */}
        <View style={styles.seg}>
          <Pressable
            onPress={() => {
              setDraft(null);
              commitReps(reps);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'reps' }}
            accessibilityLabel="Count reps"
            style={[styles.segBtn, mode === 'reps' && styles.segBtnOn]}
          >
            <Text style={[styles.segText, mode === 'reps' && styles.segTextOn]}>Reps</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setDraft(null);
              commitSec(sec);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'time' }}
            accessibilityLabel="Work for time"
            style={[styles.segBtn, mode === 'time' && styles.segBtnOn]}
          >
            <Text style={[styles.segText, mode === 'time' && styles.segTextOn]}>Time</Text>
          </Pressable>
        </View>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => step(-1)}
            accessibilityRole="button"
            accessibilityLabel={mode === 'reps' ? 'One rep fewer' : 'Fifteen seconds less'}
            hitSlop={4}
            style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
          >
            <Text style={styles.stepGlyph}>−</Text>
          </Pressable>

          <View style={styles.valueWrap}>
            <TextInput
              value={draft ?? display}
              onChangeText={typed}
              onBlur={() => setDraft(null)}
              onSubmitEditing={() => setDraft(null)}
              selectTextOnFocus
              keyboardType={mode === 'reps' ? 'number-pad' : 'numbers-and-punctuation'}
              returnKeyType="done"
              selectionColor={flColor.bronze300}
              underlineColorAndroid="transparent"
              accessibilityLabel={mode === 'reps' ? 'Rep goal — type a number' : 'Time goal — type minutes and seconds'}
              style={styles.value}
            />
            <Text style={styles.unit}>{mode === 'reps' ? 'Reps' : 'Min:Sec'}</Text>
          </View>

          <Pressable
            onPress={() => step(1)}
            accessibilityRole="button"
            accessibilityLabel={mode === 'reps' ? 'One rep more' : 'Fifteen seconds more'}
            hitSlop={4}
            style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
          >
            <Text style={styles.stepGlyph}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* SOLID, and a step lighter than the two cards it sits between.
     The bronze *tint* the circuit banner uses is 5% over whatever is behind it, which works where a banner
     sits against the screen background — here, wedged between the hero and the table (both solid
     charcoal900), it would read as a warm hole in the stack rather than a panel on it. So: charcoal800 to
     lift it off them, a bronze border and a bronze kicker to say it is asking for something, and the
     controls inside recessed back to charcoal900. */
  panel: {
    /* One row now, so the vertical padding comes down with it — the old 11pt was breathing room for a
       header that no longer exists, and keeping it would leave the panel the same height with less in it. */
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
  },

  /* Wraps rather than clips. At the largest OS text size the chooser and the stepper no longer fit on one
     line of a 360dp screen, and a row that overflows would put the + button off the edge of the card. */
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 10, rowGap: 10 },

  seg: { flexDirection: 'row', gap: 2, padding: 2, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.charcoal600 },
  segBtn: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: flRadius.pill },
  segBtnOn: { backgroundColor: flColor.bronze400 },
  segText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, color: flColor.gray400 },
  segTextOn: { color: flColor.charcoal900 },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 21, lineHeight: 24, color: flColor.bronze300 },
  pressed: { opacity: 0.85 },

  valueWrap: { alignItems: 'center', minWidth: 62 },
  /* `outlineWidth: 0` for the same reason as the Set Input Sheet's fields: react-native-web's TextInput
     reset does not cover `outline`, so the browser would paint a blue focus ring over the bronze.
     The dotted underline is the app's own "you can type in here" mark (cf. `fieldValueTypeable`). */
  value: {
    fontFamily: flFont.display,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: flColor.cream100,
    textAlign: 'center',
    minWidth: 62,
    paddingVertical: 1,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.bronzeBorder,
    borderStyle: 'dotted',
    outlineWidth: 0,
  },
  unit: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600, marginTop: 3 },
});
