import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { flColor, flRadius } from '@/constants/foundation';

/**
 * "Start Strength" — the three ways into a lifting session, from `Forge Strength Start.dc.html`.
 *
 * ══ THE PROBLEM IT SOLVES ══
 *
 * Every freestyle entry point in the app dropped the athlete straight into an EMPTY session: Home's
 * hero, Home's path card, the Workouts `+`, "Build a Workout", and Templates' own "New". Build-as-you-go
 * is one of three legitimate answers and it was being applied as though it were the only one — so a
 * saved template was reachable only by remembering that Workouts → Templates exists, and planning a
 * session in advance was not reachable at all.
 *
 * The copy is the design's, verbatim. The order is too: template first, because the most likely thing
 * an athlete wants is a session they have already decided is good.
 *
 * ⚠ HOME NO LONGER OPENS THIS SHEET (W25-A1-D9). Home's "Start a Workout" sheet carries the strength
 * rows itself, beside cardio, so "Strength" is no longer a tap that only unlocks another menu. The rows
 * are the same component (`StartOptionRow`) and the same copy, so the two sheets cannot drift apart.
 */

export interface StartStrengthSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * What "Build as you go" does. Every caller already has its own version of this — the Workouts tab
   * marks the global session started, Home writes a launch context and pushes — so the sheet asks for it
   * rather than guessing which of those a given screen needs.
   */
  onFreestyle: () => void;
}

/** The option glyphs, shared with Home's Start a Workout sheet so one door never wears two icons. */
export const START_ICON = {
  template: <Path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5" />,
  buildFirst: <Path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11M3 6.5h.01M3 12h.01M3 17.5h.01M20 4v5M22.5 6.5h-5" />,
  buildAsYouGo: <Path d="M12 3l2.2 5.9L20 11l-5.8 2.1L12 19l-2.2-5.9L4 11l5.8-2.1z" />,
  cardio: (
    <Path d="M2.5 17.5h19M3 17.5v-3.2c0-.6.4-1 1-1.1l3.6-.6 2.6-4.1 2 1 1.6-1.1c.9 2.3 3 3.6 5.6 4.1.9.2 1.6 1 1.6 1.9v3.1M9 11.3l1.6.9M10.4 9.6l1.5.9" />
  ),
};

/** The copy both sheets say, so Home's rows and this sheet's rows are one sentence each, not two. */
export const START_COPY = {
  template: { title: 'From a template', sub: 'Start a workout you’ve saved — or one built by Forge.' },
  buildFirst: { title: 'Build it first', sub: 'Plan every exercise, then start the session.' },
  buildAsYouGo: { title: 'Build as you go', sub: 'Pick your first move, then add more as you lift.' },
};

export function StartStrengthSheet({ open, onClose, onFreestyle }: StartStrengthSheetProps) {
  const router = useRouter();

  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Start Strength">
      <View style={styles.stack}>
        <StartOptionRow {...START_COPY.template} icon={START_ICON.template} onPress={go(() => router.push('/templates'))} />
        <StartOptionRow {...START_COPY.buildFirst} icon={START_ICON.buildFirst} onPress={go(() => router.push('/workout-builder'))} />
        <StartOptionRow {...START_COPY.buildAsYouGo} icon={START_ICON.buildAsYouGo} onPress={go(onFreestyle)} />
      </View>
    </BottomSheet>
  );
}

/**
 * One way to start: a bronze glyph in a ring, a title, one line of why, a chevron.
 *
 * ⚠ THE EDGE IS A NEUTRAL HAIRLINE, NOT BRONZE. These rows wore `bronzeBorder` at 40% plus a bronze rim
 * shadow, so a sheet of three read as a form of three outlined fields — and bronze on every edge stops
 * being an accent (PO rule, 2026-08-24: *"bronze is not a border colour"*). The bronze now lives in the
 * glyph and the chevron, which is where the eye should land; the pressed state is what warms the edge.
 */
export function StartOptionRow({ title, sub, icon, onPress }: { title: string; sub: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.ring}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </Svg>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 6l6 6-6 6" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  rowPressed: { opacity: 0.88, borderColor: flColor.bronzeBorder },
  ring: {
    width: 42,
    height: 42,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  sub: { fontSize: 12, lineHeight: 17, color: flColor.gray400 },
});
