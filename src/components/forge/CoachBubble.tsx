import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flColor, flFont, flShadow } from '@/constants/foundation';
import { useCeremony } from '@/hooks/useCeremony';
import { useTour } from '@/hooks/useTour';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';

/**
 * The coach, one tap from anywhere.
 *
 * ══ WHY A FLOATING BUBBLE AND NOT A TAB OR A CARD ══
 *
 * The coach answers a question that arrives at an unpredictable moment — standing in a gym that turned
 * out to be busier than expected, or on a Sunday deciding what the week looks like. Anything that lives
 * on one screen can only be found by someone who already went looking. This is deliberately everywhere,
 * and deliberately small.
 *
 * ⚠ IT ALSO STAYS OFF THE ONBOARDING FLOW ENTIRELY, which is a governance point rather than a layout one.
 * `ONB-D13` (LOCKED) requires the first-run program recommendation to be *"rule-based and deterministic…
 * not AI, never presented as AI"*. This engine is rule-based and deterministic, so it satisfies that on
 * the merits — but the recommendation the spec governs is a specific surface, and quietly putting a
 * second recommender on top of it would be answering a question the spec already answered. The bubble
 * appears once an athlete is in the app proper; onboarding is untouched.
 *
 * ══ WHEN IT HIDES ══
 *
 * Four states own the whole screen and must not have a button floating over them: a live workout (you are
 * mid-set), a ceremony (an earned moment, and the one thing this app refuses to interrupt), the guided
 * tour (a spotlight with an uninvited bubble in the corner is a bug report), and anything outside the
 * signed-in app. It also hides on its own route, because a button that reopens the screen you are looking
 * at is furniture.
 */
export function CoachBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session } = useWorkoutSession();
  const { current: ceremony } = useCeremony();
  const { status: tourStatus } = useTour();

  if (session) return null;
  if (ceremony) return null;
  if (tourStatus === 'running') return null;
  if (pathname === '/coach') return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: 96 + insets.bottom, right: 16 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open the coach"
        onPress={() => router.push('/coach')}
        style={({ pressed }) => [styles.bubble, pressed && styles.pressed]}
      >
        <Text style={styles.glyph}>C</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /* `box-none` on the wrapper, so the empty space around the bubble stays tappable by whatever is under
     it. A full-width absolute container that swallowed touches would make the bottom of every scroll
     view dead, which is the classic way a floating button breaks a screen it was only meant to sit on. */
  wrap: { position: 'absolute', zIndex: 40 },
  bubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronze400,
    borderWidth: 1,
    borderColor: flColor.bronzeMetalBorder,
    boxShadow: flShadow.elevated,
  },
  pressed: { opacity: 0.86 },
  glyph: { fontFamily: flFont.display, fontSize: 22, lineHeight: 26, color: flColor.base },
});
