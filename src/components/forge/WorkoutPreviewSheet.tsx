import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { blockRoundsText, deriveBlocks, isAmrap, schemeText, sessionSummary, supersetBlockLetters } from '@/domain/program/prescription';
import type { ProgramExercise } from '@/data/programs-live';

/**
 * "What am I actually about to do?" — the planned session, read before it is started.
 *
 * ══ WHY THIS EXISTS ══
 *
 * Home's hero card has carried an `onPreview` prop since it was built, and Home passed nothing into it:
 *
 *   // No `onPreview`: W-3 is unbuilt, and the card now renders as content rather than as a button to
 *   // nowhere when none is given.
 *
 * So the card correctly degraded to plain content — and the athlete's only way to see the day's
 * exercises was to START the workout, which writes a launch intent and opens the logger. Looking is not
 * committing, and it should not have cost a commitment.
 *
 * ⚠ It renders the SAME reading of a prescription the logger will use — `schemeText` and `deriveBlocks`
 * from the shared module — so the preview and the session can never describe the day differently. That
 * is the whole reason it is not a hand-rolled list: "4 × 8" here and "4 × 8-12" in the logger would be
 * two answers to one question. It is also why a per-side prescription reads "3 × 10 per leg" here from
 * the day this shipped — the same fix that put it in the logger put it here for free.
 *
 * ══ IT HAS EXACTLY ONE OPINION ══
 *
 * This is decision support before starting, not Workout Detail. It answers three questions and stops:
 * what am I doing, how big is it, do I want to start. So there are no thumbnails, no muscle diagrams,
 * no coaching notes — and, below, ONE primary action.
 *
 * The footer carried three peers: Start Workout, "Choose another", "Skip this one". Their consequences
 * are not peers. Start is the expected path; choosing another is a deviation from today's programming;
 * skipping WRITES to the program's schedule and carries the athlete a session further along it. Drawn as
 * three sibling buttons, an inspection sheet was asking for a scheduling decision. Start is now the
 * overwhelming action and deviating is one subdued line under it.
 *
 * ⚠ SKIP CURRENTLY HAS NOWHERE TO LIVE. It was dropped from here on the reasoning that `onChooseAnother`
 * landed on Program Detail, which lists every outstanding session with its own Train and Skip — so the
 * capability would be intact, one deliberate step away. Home has since repointed `onChooseAnother` at a
 * same-week swap picker that stays on Home and does not skip. The capability is not lost (the program
 * screen still has it) but the preview flow no longer reaches it, and this comment is here so the gap is
 * a recorded one rather than a thing somebody rediscovers.
 */
export function WorkoutPreviewSheet({
  open,
  onClose,
  title,
  focus,
  warmup,
  main,
  onStart,
  onChooseAnother,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /**
   * A SUBTITLE, and only when it says something the title does not.
   *
   * Home fed this the program day's own name, so the sheet opened "Squat & Sled" over "Squat & Sled"
   * over the meta line. Fixed at the source; the guard below stays because this component cannot know
   * what a future caller will hand it, and a title printed twice is worse than no subtitle at all.
   */
  focus?: string;
  /** Freeform prep, as authored. Empty for a MOBILITY program, which is MAIN-only by PAS-D9. */
  warmup?: readonly ProgramExercise[];
  main: readonly ProgramExercise[];
  onStart: () => void;
  /**
   * Open the program's full schedule, where any outstanding session can be trained or skipped instead.
   * Absent when there is no schedule to open — a freestyle or resumed session belongs to none.
   */
  onChooseAnother?: () => void;
}) {
  const blocks = deriveBlocks(main);
  /* "A", then "B" — the letter belongs to the BLOCK, so it is resolved across the whole session rather
     than inside one block's own map. Same rule as the logger and both builders (`supersetLabels`). */
  const ssLetters = supersetBlockLetters(blocks);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      scroll
      footer={
        <>
          <Button variant="primary" fullWidth onPress={onStart} accessibilityLabel={`Start ${title}`}>
            Start Workout
          </Button>
          {/* Borderless and full width, deliberately: a second bordered pill beside the primary is a
              second button, and the whole point is that there is one. */}
          {onChooseAnother ? (
            <Pressable
              onPress={onChooseAnother}
              accessibilityRole="button"
              accessibilityLabel="Choose a different workout from this program"
              style={styles.altBtn}
            >
              <Text style={styles.altText}>Choose another workout</Text>
            </Pressable>
          ) : null}
        </>
      }
    >
      <View style={styles.body}>
        {focus && focus !== title ? <Text style={styles.focus}>{focus}</Text> : null}

        {/* The session's size, stated once — and stated as the sheet DRAWS it. See `SessionSize`: a
            circuit is one finisher here, not three exercises and nine sets scattered across two totals. */}
        <Text style={styles.meta}>{sessionSummary(warmup, main)}</Text>

        {warmup && warmup.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Warm-Up</Text>
            {warmup.map((ex, i) => (
              <View key={`w${i}`} style={styles.row}>
                <Text style={styles.rowName} numberOfLines={2}>
                  {ex.name}
                </Text>
                <Text style={styles.rowScheme}>{schemeText(ex)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          {/* Only labelled when there is a warm-up above it to be distinguished from. A single
              unlabelled list is not a section, it is the session. */}
          {warmup && warmup.length > 0 ? <Text style={styles.sectionLabel}>Main</Text> : null}

          {blocks.map((b, bi) =>
            b.groupId ? (
              /* A circuit or superset is drawn as the ONE block the athlete performs, with its round
                 count — the same shape the logger draws, derived by the same adjacency rule. */
              <View key={`b${bi}`} style={styles.block}>
                <View style={styles.blockHead}>
                  {/* Lettered so two supersets in one session are told apart, and only on the DEFAULT
                      name — a block the author called "Chest Finisher" already is. */}
                  <Text style={styles.blockName}>
                    {b.name ?? (b.kind === 'superset' ? `Superset${ssLetters[bi] ? ` ${ssLetters[bi]}` : ''}` : 'Circuit')}
                  </Text>
                  <Text style={styles.blockRounds}>
                    {isAmrap(b) ? `AMRAP ${blockRoundsText(b)}` : blockRoundsText(b) ? `⟳ ${blockRoundsText(b)}` : ''}
                  </Text>
                </View>
                {b.items.map((ex, i) => (
                  <View key={`b${bi}i${i}`} style={styles.row}>
                    <Text style={styles.rowName} numberOfLines={2}>
                      {ssLetters[bi] ? `${ssLetters[bi]}${i + 1}  ` : ''}
                      {ex.name}
                    </Text>
                    <Text style={styles.rowScheme}>{schemeText(ex)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              b.items.map((ex, i) => (
                <View key={`b${bi}i${i}`} style={styles.row}>
                  <Text style={styles.rowName} numberOfLines={2}>
                    {ex.name}
                  </Text>
                  <Text style={styles.rowScheme}>{schemeText(ex)}</Text>
                </View>
              ))
            ),
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  altBtn: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10 },
  altText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  body: { gap: 4, paddingBottom: 4 },
  focus: { fontSize: 13, color: flColor.gray400, marginBottom: 2 },
  meta: {
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    lineHeight: 16,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginBottom: 10,
  },
  section: { marginTop: 6 },
  sectionLabel: {
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: flColor.charcoal500,
  },
  rowName: { flex: 1, fontSize: 15, color: flColor.cream100 },
  rowScheme: { fontFamily: flFont.display, fontSize: 14, fontWeight: '600', color: flColor.bronze300 },
  block: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    borderRadius: flRadius.md,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
    marginVertical: 8,
  },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  blockName: {
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  blockRounds: { fontFamily: flFont.display, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
});
