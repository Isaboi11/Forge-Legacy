/**
 * TourOverlay — the guided-tour overlay (Onboarding-Amendment-003). Mounted INSIDE the tab shell
 * (`app-tabs.tsx`) so its `useRouter()` sits unambiguously within the navigator: on each `running` step
 * it drives the tab (`router.navigate(step.route)`) and lays a fixed coach card over the screen with a
 * Next / Skip control.
 *
 * v1 is deliberately simple — sequential navigate-to-route + an overlay card. Element-level spotlighting
 * (highlighting the specific control a step describes) is a v2 concern, noted in the amendment.
 */

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { TOUR_STEPS, useTour } from '@/hooks/useTour';

export function TourOverlay() {
  const router = useRouter();
  const { status, currentStep, stepIndex, nextStep, skipTour } = useTour();

  // Drive the tab for the active step. currentStep is null unless running, so this is inert otherwise.
  useEffect(() => {
    if (status === 'running' && currentStep) {
      router.navigate(currentStep.route);
    }
  }, [status, currentStep, router]);

  if (status !== 'running' || !currentStep) return null;

  const isLast = stepIndex >= TOUR_STEPS.length - 1;
  // Finishing lands back on Home, then records completion (nextStep on the last step completes the tour).
  const finish = () => {
    router.navigate('/');
    nextStep();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* soft scrim — captures stray taps so the athlete advances via Next / Skip (no accidental nav) */}
      <View style={styles.scrim} pointerEvents="auto" />

      <View style={styles.cardWrap} pointerEvents="box-none">
        <View style={styles.card}>
          <Text style={styles.step}>
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </Text>
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.body}>{currentStep.body}</Text>

          <View style={styles.actions}>
            <Button
              variant="primary"
              fullWidth
              onPress={isLast ? finish : nextStep}
              accessibilityLabel={isLast ? 'Finish the tour' : 'Next step'}
            >
              {isLast ? 'Finish' : 'Next'}
            </Button>
            <Pressable onPress={skipTour} accessibilityRole="button" accessibilityLabel="Skip the tour" style={styles.skip}>
              <Text style={styles.skipText}>Skip tour</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    bottom: 108,
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
