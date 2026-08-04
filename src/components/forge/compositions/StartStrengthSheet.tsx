import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { flColor, flRadius, flShadow } from '@/constants/foundation';

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
 */

export interface StartStrengthSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * What "Build as you go" does. Every caller already has its own version of this — Home writes a launch
   * context and pushes, the Workouts tab also marks the global session started — so the sheet asks for it
   * rather than guessing which of those a given screen needs.
   */
  onFreestyle: () => void;
}

export function StartStrengthSheet({ open, onClose, onFreestyle }: StartStrengthSheetProps) {
  const router = useRouter();

  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Start Strength">
      <View style={styles.stack}>
        <Row
          title="From a template"
          sub="Start a workout you’ve saved — or one built by Forge."
          icon={<Path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5" />}
          onPress={go(() => router.push('/templates'))}
        />
        <Row
          title="Build it first"
          sub="Plan every exercise, then start the session."
          icon={<Path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11M3 6.5h.01M3 12h.01M3 17.5h.01M20 4v5M22.5 6.5h-5" />}
          onPress={go(() => router.push('/workout-builder'))}
        />
        <Row
          title="Build as you go"
          sub="Pick your first move, then add more as you lift."
          icon={<Path d="M12 3l2.2 5.9L20 11l-5.8 2.1L12 19l-2.2-5.9L4 11l5.8-2.1z" />}
          onPress={go(onFreestyle)}
        />
      </View>
    </BottomSheet>
  );
}

function Row({ title, sub, icon, onPress }: { title: string; sub: string; icon: React.ReactNode; onPress: () => void }) {
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
    padding: 16,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.trainTogetherCard,
  },
  rowPressed: { opacity: 0.85 },
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
