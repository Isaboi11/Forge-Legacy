import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { flColor, flRadius } from '@/constants/foundation';
import { HoltMark } from '@/components/forge/HoltMark';
import { INTENSITY_LEVELS, type IntensityLevel } from '@/domain/coach/rulebook/intensity';

/**
 * Coach Holt, mid-set.
 *
 * ══ THE SAME HOLT AS THE HOME SCREEN, DELIBERATELY ══
 *
 * ⚠ THE FIRST VERSION WAS A GENERIC BOTTOM SHEET WITH ICON ROWS, and the PO's note was that it has to
 * look and feel like the coach on Home. That is not a polish request — it is the whole premise of the
 * character. A coach who presents as one thing on Home and another mid-workout is two features wearing
 * the same name, and the athlete has to learn each surface separately.
 *
 * So the shell is `CoachChatSheet`'s, element for element: the 24px top corners over a bronze-lit top
 * edge with the inset warm highlight, the grab handle, the header of mark + `HOLT` + a status line, and
 * decisions offered as bronze-edged pill CHIPS rather than as a menu of rows.
 *
 * ══ THE ONE DIFFERENCE, AND WHY ══
 *
 * Home's sheet pins to `top: 64` so it always fills the screen — right there, because the conversation
 * IS the task. Here the task is the set in front of you, and the sheet sizes to its content so the
 * exercise card stays visible behind it. Same sheet, less of it.
 *
 * ══ CHIPS, NOT A TEXT BOX ══
 *
 * One hand, possibly chalked, between sets. Every answer is a tap. Holt's standing instruction is to
 * stop asking people to type, and mid-workout is the strongest case for it in the app.
 *
 * ══ WHAT IT REFUSES TO DO ══
 *
 * · It never speaks unless tapped — no teaser on this screen. Mid-set, an unprompted line is an
 *   interruption of a working set.
 * · It never grades a set. The weight chips are instructions for the sets to come; nothing here reports
 *   how the last one went (W9-Amendment-005 D-3 lifted §6.2's ban for *coaching*, not for scoring).
 * · It offers no weight chip it cannot name a real number for — see `lighterTo` / `heavierTo`.
 */
/**
 * One word each, because this row is read between sets. The sentences live on `/preferences`, where
 * there is room for them and where nobody is holding a bar.
 */
const INTENSITY_CHIP: Record<IntensityLevel, string> = {
  reminders: 'Cues only',
  steady: 'Steady',
  push: 'Push me',
  drive: 'Drive me',
};

export function SessionCoachSheet({
  onClose,
  exerciseName,
  message,
  basis,
  unit,
  /** Null = do not offer it. Never a chip that says "lighter" without saying how much lighter. */
  currentLoad,
  lighterTo,
  heavierTo,
  onSetLoad,
  canSuperset,
  isSuperset,
  supersetWithName,
  onSwap,
  onSuperset,
  onBreakSuperset,
  onAdd,
  onSkip,
  intensity,
  onSetIntensity,
}: {
  onClose: () => void;
  exerciseName: string;
  message: string | null;
  basis: string | null;
  unit: string;
  currentLoad: number | null;
  lighterTo: number | null;
  heavierTo: number | null;
  onSetLoad: (to: number) => void;
  /**
   * How hard Holt is pushing right now, and how to change it.
   *
   * ⚠ THIS MATTERS MORE THAN THE SETTINGS SCREEN. The moment an athlete notices the dial is wrong is
   * the moment he says something they did not want, and that moment is in a gym with one hand free —
   * not in Account Settings two days later. Same value, same store; this is just the door that is
   * actually near the problem.
   */
  intensity: IntensityLevel;
  onSetIntensity: (level: IntensityLevel) => void;
  canSuperset: boolean;
  isSuperset: boolean;
  supersetWithName: string | null;
  onSwap: () => void;
  onSuperset: () => void;
  onBreakSuperset: () => void;
  onAdd: () => void;
  onSkip: () => void;
}) {
  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.grabWrap}>
          <View style={styles.grab} />
        </View>

        {/* Home's header, unchanged: the mark, the name in wide bronze caps, and a status line that says
            what he is looking at rather than a greeting. */}
        <View style={styles.header}>
          <View style={styles.mark}>
            <HoltMark size={34} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>HOLT</Text>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {exerciseName}
            </Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round">
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
        </View>

        <ScrollView style={styles.thread} contentContainerStyle={styles.threadInner} showsVerticalScrollIndicator={false}>
          {/* His line, as plain text at the left margin — Home gives Holt no bubble, and giving him one
              here would make him read as a notification instead of as someone talking. */}
          {message ? <Text style={styles.holtText}>{message}</Text> : null}
          {basis ? <Text style={styles.basis}>{basis}</Text> : null}

          {lighterTo != null || heavierTo != null ? (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>
                THE WEIGHT{currentLoad != null ? ` · ON ${currentLoad} ${unit.toUpperCase()}` : ''}
              </Text>
              <View style={styles.chipRow}>
                {/* Every weight chip names the number it will put on the bar. "Lighter" alone asks the
                    athlete to trust an amount they cannot see, and the amount is the entire question. */}
                {lighterTo != null ? (
                  <Chip label={`Too heavy — ${lighterTo} ${unit}`} onPress={run(() => onSetLoad(lighterTo))} />
                ) : null}
                {heavierTo != null ? (
                  <Chip label={`Too easy — ${heavierTo} ${unit}`} on onPress={run(() => onSetLoad(heavierTo))} />
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.group}>
            <Text style={styles.groupLabel}>THE PLAN</Text>
            <View style={styles.chipRow}>
              <Chip label="Can't do this one" onPress={run(onSwap)} />
              {isSuperset ? (
                <Chip label="Stop pairing these" onPress={run(onBreakSuperset)} />
              ) : canSuperset && supersetWithName ? (
                <Chip label={`Short on time — pair with ${supersetWithName}`} onPress={run(onSuperset)} />
              ) : null}
              <Chip label="Add a movement" onPress={run(onAdd)} />
              <Chip label="Move past this" onPress={run(onSkip)} />
            </View>
          </View>

          {/*
            HOW HARD HE PUSHES — the same dial as Preferences, put where it gets noticed.

            ⚠ IT DOES NOT CLOSE THE SHEET. Every other chip here is an action on the workout and leaving
            is the right ending for those; this one is a correction to the thing the athlete is reading,
            and closing on it would hide whether it worked. Tapping again moves it again.
          */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>HOW HARD I PUSH</Text>
            <View style={styles.chipRow}>
              {INTENSITY_LEVELS.map((level) => (
                <Chip
                  key={level}
                  label={INTENSITY_CHIP[level]}
                  on={intensity === level}
                  onPress={() => onSetIntensity(level)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.chipPressed]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 60 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(3,5,7,0.66)' },
  /* `CoachChatSheet`'s shell exactly — 24px corners (wider than the token, on purpose), a BRONZE top
     border and the inset warm highlight, which together are what make it read as raised metal rather
     than as a grey panel. `maxHeight` rather than Home's `top: 64` inset: see the header. */
  sheet: {
    maxHeight: '78%',
    backgroundColor: flColor.charcoal900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    boxShadow: '0 -18px 44px rgba(0,0,0,0.7), inset 0 1px 0 rgba(198,156,100,0.22)',
  },
  grabWrap: { alignItems: 'center', paddingTop: 9, paddingBottom: 4 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: flColor.charcoal500 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  headerText: { flex: 1, gap: 2 },
  headerName: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, color: flColor.bronze400 },
  headerStatus: { fontSize: 12.5, color: flColor.gray400 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  thread: { flexGrow: 0 },
  threadInner: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26, gap: 14 },
  // 15.5/24 cream at the left margin — Home's voice, character for character.
  holtText: { fontSize: 15.5, lineHeight: 24, color: flColor.cream100, maxWidth: '92%' },
  /* The evidence under the instruction, quieter than it. "Because you did this" is what separates a
     coach from an assertion, and it must never outweigh the thing it is supporting. */
  basis: { fontSize: 12.5, lineHeight: 19, color: flColor.gray600 },

  group: { gap: 9 },
  groupLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: flColor.gray600 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    // Bronze-edged, not charcoal — a chip is a decision waiting to be made (§8.2).
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipPressed: { opacity: 0.82 },
  chipText: { fontSize: 13.5, fontWeight: '500', color: flColor.cream100 },
});
