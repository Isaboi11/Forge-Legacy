/**
 * TourOverlay — the GUIDED RUN's host (Onboarding-Amendment-003): the tabs leg on the gated Home, and the
 * seven-step Home leg once it un-gates. Mounted INSIDE the tab shell (`app-tabs.tsx`) so its `useRouter()`
 * sits unambiguously within the navigator, which is also all it does that `ScreenTour` doesn't — drive the
 * tab for each step.
 *
 * The coach mark itself — measuring, scrolling, ringing, placing the card — lives in `SpotlightStage`,
 * shared with the per-surface walkthroughs. This file is the run's navigation and nothing else.
 */

import { useEffect } from 'react';
import { useRouter, type Href } from 'expo-router';

import { SpotlightStage } from '@/components/tour/SpotlightStage';
import { useTour } from '@/hooks/useTour';

/** Clears the tab bar the tabs leg is describing. */
const TAB_BAR_CLEARANCE = 108;

export function TourOverlay() {
  const router = useRouter();
  const { status, steps, stepIndex, currentStep, nextStep, prevStep, skipTour } = useTour();
  const running = status === 'running' && !!currentStep;

  // Drive the tab for the active step. currentStep is null unless running, so this is inert otherwise.
  useEffect(() => {
    if (running && currentStep) router.navigate(currentStep.route as Href);
  }, [running, currentStep, router]);

  if (!running) return null;

  const isLast = stepIndex >= steps.length - 1;
  const finish = () => {
    // Finishing lands back on Home — the screen the walkthrough just explained, with the Start button on it.
    router.navigate('/');
    nextStep();
  };

  return (
    <SpotlightStage
      steps={steps}
      index={stepIndex}
      onNext={isLast ? finish : nextStep}
      onPrev={prevStep}
      onSkip={skipTour}
      doneLabel="Start training"
      restingBottom={TAB_BAR_CLEARANCE}
    />
  );
}
