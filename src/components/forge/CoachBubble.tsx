import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flColor } from '@/constants/foundation';
import { loadProgramDraft } from '@/lib/program-draft';
import { useCeremony } from '@/hooks/useCeremony';
import { useTour } from '@/hooks/useTour';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { CoachChatSheet } from '@/components/forge/CoachChatSheet';
import { BUBBLE_SHADOW, BUBBLE_SIZE, HoltMark } from '@/components/forge/HoltMark';

/**
 * The four surfaces the coach belongs on, and nowhere else.
 *
 * ⚠ IT USED TO BE EVERYWHERE, which is what the PO reported: "sometimes it blocks things on screens and
 * it just doesn't need to be there." Both halves of that are right. A floating button over a detail
 * screen is in the way of the thing you opened, and a coach offering to build you a program while you are
 * reading an exercise's coaching notes is answering a question nobody asked.
 *
 * The tabs are where you are DECIDING — what to train, what the week looks like, where you are up to.
 * That is the moment the coach is worth having one tap away. Everywhere else you have already decided and
 * gone somewhere specific, and the useful thing the app can do is get out of the way.
 */
const HOME_SURFACES = new Set(['/', '/workouts', '/legacy', '/squads']);

/**
 * The coach, one tap from anywhere.
 *
 * ══ WHY A FLOATING BUBBLE AND NOT A TAB OR A CARD ══
 *
 * The coach answers a question that arrives at an unpredictable moment — standing in a gym that turned
 * out to be busier than expected, or on a Sunday deciding what the week looks like. Anything that lives
 * on one screen can only be found by someone who already went looking.
 *
 * ⚠ IT USED TO SAY "deliberately everywhere" HERE, and that was the bug. Everywhere includes over the
 * thing you just opened. It now lives on the four tab surfaces — see `HOME_SURFACES` above — which is
 * still one tap from wherever you are without standing in front of anything.
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
 * It is an ALLOW-LIST, not a block-list, and that is the change: the old version tried to enumerate every
 * screen the coach should stay off and inevitably missed some — including `/sign-in` and onboarding,
 * where `ONB-D13` is explicit that a second recommender must not appear. Listing where it belongs cannot
 * have that failure mode.
 *
 * Three states hide it even on those four surfaces, because each owns the whole screen: a live workout
 * (you are mid-set), a ceremony (an earned moment, and the one thing this app refuses to interrupt), and
 * the guided tour (a spotlight with an uninvited bubble in the corner is a bug report). Its own route is
 * excluded by simply not being in the list.
 */
export function CoachBubble() {
  const pathname = usePathname();
  /*
   * ⚠ THE BUBBLE GROWS INTO THE SHEET — it does not push a route, and that was the design's call over
   * the brief's. `Coach Holt Chat.dc.html`: *"tapping it grows the mark into the sheet rather than
   * pushing a new screen."* The coach answers a question that arrived while you were doing something
   * else, and taking the something-else off the screen to answer it is the wrong shape.
   *
   * `/coach` still exists and is untouched — it is the wizard, and the tap-through path for anyone who
   * would rather not type.
   */
  const [open, setOpen] = useState(false);

  /*
   * §3.4–3.5 — the teaser, and the rule that governs it: "only appears when there is a real, specific
   * thing to say. It is never generic and never a nag. If you have no line, show no teaser."
   *
   * ⚠ SO IT HAS EXACTLY ONE TRIGGER, and it is a fact rather than a prompt: there is an unsaved program
   * sitting in the Builder. That is the athlete's own unfinished action, it is true or it is not, and
   * picking the thread back up is a service. "Ready to train?" or "Need a program?" would be the app
   * talking to fill a silence, which is precisely what this rule exists to prevent.
   */
  const [teaser, setTeaser] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void loadProgramDraft().then((d) => {
      if (!alive || !d) return;
      const hasContent = d.days?.some((day) => day.main.length > 0) ?? false;
      if (hasContent && d.name) setTeaser(`${d.name} is still sitting in the builder.`);
    });
    return () => {
      alive = false;
    };
  }, []);
  const insets = useSafeAreaInsets();
  const { session } = useWorkoutSession();
  const { current: ceremony } = useCeremony();
  const { status: tourStatus } = useTour();

  if (session) return null;
  if (ceremony) return null;
  if (tourStatus === 'running') return null;
  /*
   * ⚠ THIS ALSO CLOSES A REAL DEFECT. The header above has always claimed the bubble hides on "the
   * signed-out routes", and it did not — nothing here ever checked. It rendered over `/sign-in` and over
   * onboarding, which is the one place `ONB-D13` is explicit that a second recommender must not appear.
   * The claim was mine and it was wrong; the allow-list makes it true rather than restating it.
   */
  if (!HOME_SURFACES.has(pathname)) return null;

  if (open) return <CoachChatSheet onClose={() => setOpen(false)} />;

  return (
    <View
      pointerEvents="box-none"
      // 18px above the tab bar, 20 from the right edge (PROMPT §3.1).
      style={[styles.wrap, { bottom: 96 + insets.bottom, right: 20 }]}
    >
      {teaser ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={teaser}
          style={styles.teaser}
        >
          <Text style={styles.teaserText}>{teaser}</Text>
        </Pressable>
      ) : null}
      {/* ⚠ THE MARK, NOT A LETTER. `coach-holt-mark.png` cover-filled, per PROMPT §3.2 — the struck
          bronze medallion IS the feature's identity, and a "C" in a circle was standing in for it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Coach Holt"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.bubble, pressed && styles.pressed]}
      >
        <HoltMark size={BUBBLE_SIZE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /* `box-none` on the wrapper, so the empty space around the bubble stays tappable by whatever is under
     it. A full-width absolute container that swallowed touches would make the bottom of every scroll
     view dead, which is the classic way a floating button breaks a screen it was only meant to sit on. */
  wrap: { position: 'absolute', zIndex: 40, alignItems: 'flex-end', gap: 10 },
  teaser: {
    maxWidth: 200,
    paddingHorizontal: 13,
    paddingVertical: 9,
    // The flat corner points down-right, at the mark it came from.
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  teaserText: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    // A dark rim to lift it off whatever it floats over, the badge glow, then the float shadow (§3.3).
    boxShadow: BUBBLE_SHADOW,
  },
  pressed: { opacity: 0.86 },
});
