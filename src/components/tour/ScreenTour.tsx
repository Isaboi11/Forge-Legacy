/**
 * ScreenTour — the auto per-tab walkthrough (Onboarding-Amendment-003). The first time an athlete lands
 * on a major surface (and hasn't taken / been covered by the global tour), a short card-by-card overlay
 * fires automatically and describes that tab's key sections, with Next / Got it / Skip.
 *
 * Visibility is derived from `useScreenPrompt` (the shared seen-set + the "tour flow isn't in the way"
 * guard), so it never stacks over the global tour and is suppressed on tabs a completed global tour
 * already walked. Finishing or skipping marks the surface seen — it won't auto-fire again after that.
 *
 * v1 is card-based (no element spotlight yet): each step names its section in copy so a later pass can
 * anchor a real spotlight to it. It deliberately overrides the "explore on my own" default for the dense
 * tabs — a decision the amendment owns explicitly (still one-time, dismissible, emits no progression event).
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useScreenPrompt } from '@/hooks/useTour';
import type { ScreenKey } from '@/lib/screen-prompts';

interface TourCard {
  title: string;
  body: string;
}

/** Per-tab walkthrough copy — kept short (2–3 steps). Home has no per-tab tour (it owns the global prompt
 *  + the Explore Forge grid). Each step names a real section so a v2 pass can spotlight it. */
const SCREEN_TOURS: Record<ScreenKey, TourCard[]> = {
  home: [],
  workouts: [
    {
      title: 'My Programs',
      body: 'Your active program lives here — start today’s session in a tap. Templates, the exercise library, and your full history sit under Library.',
    },
    {
      title: 'Discover & Build',
      body: 'Browse the program catalog by family, or build your own from scratch.',
    },
  ],
  legacy: [
    {
      title: 'Your identity',
      body: 'Your rank, your standard, and the chapter you’re currently writing sit up top.',
    },
    {
      title: 'Pinned Legacy',
      body: 'Pin your proudest moments to your museum, with a featured moment just below.',
    },
    {
      title: 'What endures',
      body: 'Sealed chapters, your timeline, photos, and honors — the permanent record of everything you build.',
    },
  ],
  squads: [
    {
      title: 'Your squads',
      body: 'Small, private groups that train together. Favorite the ones you check most to keep them up top.',
    },
    {
      title: 'Create or discover',
      body: 'Start your own squad, or find one to join — from the buttons up top.',
    },
  ],
  friends: [
    {
      title: 'Your circle',
      body: 'Moments your friends chose to share. Nothing posts automatically — the wall is theirs to build.',
    },
    {
      title: 'Follow along',
      body: 'Tap a post to see the full moment, or open a friend’s profile from their name.',
    },
  ],
};

export function ScreenTour({ screenKey }: { screenKey: ScreenKey }) {
  const steps = SCREEN_TOURS[screenKey];
  const { shouldShow, dismiss } = useScreenPrompt(screenKey);
  const [stepIndex, setStepIndex] = useState(0);
  const [closed, setClosed] = useState(false);

  if (steps.length === 0 || !shouldShow || closed) return null;

  const clamped = Math.min(stepIndex, steps.length - 1);
  const step = steps[clamped];
  const isLast = clamped >= steps.length - 1;
  const advance = () => setStepIndex((i) => i + 1);
  const finish = () => {
    setClosed(true); // hide immediately…
    dismiss(); // …and mark this surface seen so it won't auto-fire again
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* soft scrim — captures stray taps so the athlete advances via the buttons, not the content behind */}
      <View style={styles.scrim} pointerEvents="auto" />

      <View style={styles.cardWrap} pointerEvents="box-none">
        <View style={styles.card}>
          {steps.length > 1 ? (
            <Text style={styles.step}>
              Step {clamped + 1} of {steps.length}
            </Text>
          ) : null}
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.actions}>
            <Button
              variant="primary"
              fullWidth
              onPress={isLast ? finish : advance}
              accessibilityLabel={isLast ? 'Got it — close this walkthrough' : 'Next step'}
            >
              {isLast ? 'Got it' : 'Next'}
            </Button>
            {!isLast ? (
              <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip this walkthrough" style={styles.skip}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,6,0.55)',
  },
  cardWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 28,
  },
  card: {
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 8,
    boxShadow: flShadow.ambient,
  },
  step: {
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  title: {
    fontFamily: flFont.display,
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 27,
    color: flColor.cream100,
  },
  body: {
    fontFamily: flFont.sans,
    fontSize: 14,
    lineHeight: 21,
    color: flColor.gray400,
  },
  actions: { marginTop: 12, gap: 8 },
  skip: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
});
