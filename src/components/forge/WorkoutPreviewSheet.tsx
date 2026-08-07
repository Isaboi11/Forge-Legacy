import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { blockRoundsText, deriveBlocks, isAmrap, plannedSetCount, schemeText } from '@/domain/program/prescription';
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
 */
export function WorkoutPreviewSheet({
  open,
  onClose,
  title,
  focus,
  warmup,
  main,
  onStart,
  onSkip,
  onChooseAnother,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  focus?: string;
  /** Freeform prep, as authored. Empty for a MOBILITY program, which is MAIN-only by PAS-D9. */
  warmup?: readonly ProgramExercise[];
  main: readonly ProgramExercise[];
  onStart: () => void;
  /**
   * Pass over this session. Absent when there is nothing to skip — a freestyle or resumed session
   * belongs to no schedule, so skipping it would be skipping nothing.
   */
  onSkip?: () => void;
  /** Open the program's full schedule, where any outstanding session can be picked instead. */
  onChooseAnother?: () => void;
}) {
  const blocks = deriveBlocks(main);
  const setTotal = plannedSetCount(main);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      scroll
      footer={
        /*
          Deciding NOT to do this one belongs here, beside deciding to do it. The preview is where the
          athlete finds out the day is a squat day and their legs are wrecked — making them back out,
          find the program, and hunt the same session down a list is asking them to navigate to a
          decision they have already made.
        */
        <>
          <Button variant="primary" fullWidth onPress={onStart} accessibilityLabel={`Start ${title}`}>
            Start Workout
          </Button>
          {onSkip || onChooseAnother ? (
            <View style={styles.altRow}>
              {onChooseAnother ? (
                <Pressable
                  onPress={onChooseAnother}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a different workout from this program"
                  style={styles.altBtn}
                >
                  <Text style={styles.altText}>Choose another</Text>
                </Pressable>
              ) : null}
              {onSkip ? (
                <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel={`Skip ${title}`} style={styles.altBtn}>
                  <Text style={styles.altSkip}>Skip this one</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </>
      }
    >
      <View style={styles.body}>
        {focus ? <Text style={styles.focus}>{focus}</Text> : null}

        {/* The session's size, stated once. `plannedSetCount` counts a circuit's ROUNDS, so a finisher
            run four times reads as the twelve sets it is rather than the three rows it looks like. */}
        <Text style={styles.meta}>
          {main.length} {main.length === 1 ? 'exercise' : 'exercises'}
          {setTotal > 0 ? ` · ${setTotal} sets` : ''}
        </Text>

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
                  <Text style={styles.blockName}>{b.name ?? (b.kind === 'superset' ? 'Superset' : 'Circuit')}</Text>
                  <Text style={styles.blockRounds}>
                    {isAmrap(b) ? `AMRAP ${blockRoundsText(b)}` : blockRoundsText(b) ? `⟳ ${blockRoundsText(b)}` : ''}
                  </Text>
                </View>
                {b.items.map((ex, i) => (
                  <View key={`b${bi}i${i}`} style={styles.row}>
                    <Text style={styles.rowName} numberOfLines={2}>
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
  altRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  altBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  altText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  altSkip: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  body: { gap: 4, paddingBottom: 4 },
  focus: { fontSize: 13, color: flColor.gray400, marginBottom: 2 },
  meta: {
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
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
