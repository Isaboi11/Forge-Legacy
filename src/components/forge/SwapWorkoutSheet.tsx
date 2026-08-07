import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/** One workout in the week that the current one could trade places with. */
export interface SwapOption {
  dayIndex: number;
  name: string;
  /** Its position in the week, 1-based — what the athlete sees on the schedule. */
  position: number;
}

/**
 * "Choose another workout" — swap the session you were offered with another from the SAME week.
 *
 * ══ WHY THE WEEK, AND WHY ONLY SOME OF IT ══
 *
 * The week is the unit an athlete actually reorders within: the rack is busy today, so do Thursday's
 * pull day now and the squat day later in the same week. Reaching across weeks would be rescheduling
 * the program rather than rearranging a week, and nobody asked for that.
 *
 * ⚠ Only OUTSTANDING workouts are listed, and that is correctness rather than tidiness. A completed or
 * skipped session has a `program_sessions` row keyed by its POSITION, so moving it would leave that
 * record pointing at a different workout — the app would then claim a session nobody did. They are left
 * out rather than shown greyed, because a disabled row invites the tap that cannot be honoured.
 *
 * ══ ONE SHEET, TWO FACES ══
 *
 * The confirmation replaces the list inside this sheet instead of opening a second one. Not a style
 * preference: iOS refuses to present a view controller while another is on screen, which is exactly how
 * "Choose from library" silently did nothing until it was fixed. A modal opened from inside a modal is
 * the same bug waiting to happen.
 */
export function SwapWorkoutSheet({
  open,
  onClose,
  weekNumber,
  currentName,
  options,
  busy,
  onSwap,
}: {
  open: boolean;
  onClose: () => void;
  /** 1-based, as the athlete counts weeks. */
  weekNumber: number;
  /** The workout being moved — the one Home is currently offering. */
  currentName: string;
  options: readonly SwapOption[];
  busy?: boolean;
  onSwap: (dayIndex: number) => void;
}) {
  const [pending, setPending] = useState<SwapOption | null>(null);

  const close = () => {
    setPending(null);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={pending ? 'Swap these two?' : `Week ${weekNumber}`}
    >
      {pending ? (
        <View style={styles.confirm}>
          {/* Both names, in the order they will end up. "Are you sure?" over two unnamed workouts asks
              the athlete to remember what they tapped. */}
          <Text style={styles.confirmText}>
            <Text style={styles.strong}>{currentName}</Text> moves to position {pending.position}, and{' '}
            <Text style={styles.strong}>{pending.name}</Text> becomes your next workout.
          </Text>
          <Text style={styles.note}>Only this week changes. The rest of the program keeps its order.</Text>
          <View style={styles.confirmActions}>
            <View style={styles.half}>
              <Button variant="secondary" fullWidth onPress={() => setPending(null)} accessibilityLabel="Cancel the swap">
                Cancel
              </Button>
            </View>
            <View style={styles.half}>
              <Button
                variant="primary"
                fullWidth
                disabled={busy}
                onPress={() => onSwap(pending.dayIndex)}
                accessibilityLabel={`Swap ${currentName} with ${pending.name}`}
              >
                {busy ? 'Swapping…' : 'Swap'}
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {options.length === 0 ? (
            <Text style={styles.note}>
              Nothing else in this week is still to do — the rest are already trained or skipped, and moving
              those would rewrite what you did.
            </Text>
          ) : (
            <>
              <Text style={styles.note}>Swap {currentName} with one of these.</Text>
              {options.map((o) => (
                <View key={o.dayIndex} style={styles.row}>
                  <View style={styles.num}>
                    <Text style={styles.numText}>{o.position}</Text>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>
                    {o.name}
                  </Text>
                  <Pressable
                    onPress={() => setPending(o)}
                    accessibilityRole="button"
                    accessibilityLabel={`Swap with ${o.name}`}
                    style={styles.pill}
                  >
                    <Text style={styles.pillText}>Swap</Text>
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  note: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal800,
  },
  num: {
    width: 26,
    height: 26,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  numText: { fontFamily: flFont.display, fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  name: { flex: 1, fontSize: 15, color: flColor.cream100 },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  pillText: { fontSize: 12.5, fontWeight: '700', color: flColor.bronze300 },

  confirm: { gap: 14 },
  confirmText: { fontSize: 14.5, lineHeight: 21, color: flColor.cream100 },
  strong: { fontWeight: '700', color: flColor.bronze300 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
