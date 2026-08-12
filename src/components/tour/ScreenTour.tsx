/**
 * ScreenTour — the auto per-surface walkthrough (Onboarding-Amendment-003 / ONB-A3-D2). The first time an
 * athlete lands on a surface, a short spotlit overlay fires and walks its real controls, once.
 *
 * RENDERED BY THE SCREEN ITSELF, AND THAT IS THE POINT. Program Builder, the live session and the picker
 * are Stack screens presented OVER the tab shell — an overlay hosted up in the shell would draw behind
 * them. A screen that renders its own `SpotlightStage` is always correctly layered, and the same component
 * therefore serves the four tabs and the branched screens without a special case.
 *
 * Visibility is derived from `useScreenPrompt` (the shared seen-set + the "global run isn't in the way"
 * guard), so it never stacks over the guided tour and is suppressed on tabs a completed tabs leg already
 * walked. Finishing or skipping marks the surface seen — it won't fire again.
 *
 * SO DOES ADVANCING PAST THE FIRST STEP, and that is the case the seen-set used to miss. Finishing and
 * skipping are both deliberate exits; simply LEAVING is neither, and it is what athletes actually do —
 * tap a card, hit back, switch tabs. Every one of those left the surface owed, so the walkthrough
 * reappeared on the next visit, and the next, reading as a tutorial that would not go away.
 *
 * The line is drawn at engagement rather than at display. Marking a surface seen the instant its overlay
 * draws would burn a walkthrough on an athlete who was already mid-tap when it appeared; requiring the
 * final step means an interruption costs them the whole thing. **Reaching step two is the smallest
 * unambiguous signal that the athlete read the first one and chose to continue** — from there it counts as
 * delivered however they leave. Bailing on step one keeps it owed, which is the accidental-dismissal case.
 *
 * It is recorded at the moment of that step, not on unmount, so it survives the app closing — and `started`
 * latches the overlay open, so marking it seen mid-walkthrough doesn't pull it out from under the athlete
 * who is still reading it.
 *
 * A step whose anchor isn't mounted is DROPPED, exactly as in the guided run: the resolve happens once, on
 * the render that first shows the tour, so a surface in a state that lacks a card never rings an empty
 * rectangle or counts a step it can't show.
 */

import { useEffect, useMemo, useState } from 'react';

import { SpotlightStage, type SpotlightStep } from '@/components/tour/SpotlightStage';
import { useScreenPrompt } from '@/hooks/useTour';
import { track } from '@/lib/analytics';
import { useTourAnchors } from '@/hooks/useTourAnchors';
import type { ScreenKey } from '@/lib/screen-prompts';

export function ScreenTour({
  screenKey,
  /**
   * Hold the walkthrough back until the screen has something to walk. A surface whose cards arrive with a
   * query would otherwise resolve its steps against an empty screen and drop every one of them.
   */
  ready = true,
  restingBottom,
}: {
  screenKey: ScreenKey;
  ready?: boolean;
  restingBottom?: number;
}) {
  const { shouldShow, dismiss, steps: unlocked } = useScreenPrompt(screenKey);
  const { registeredAnchors } = useTourAnchors();
  const [stepIndex, setStepIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  /** Latched once the athlete engages. Keeps the overlay live after it has recorded itself as seen —
   *  without it, `shouldShow` goes false the moment the seen-set updates and the walkthrough vanishes
   *  between step one and step two. */
  const [started, setStarted] = useState(false);

  const live = (shouldShow || started) && ready && !closed;

  // Resolved once the tour goes live, then frozen: re-resolving as cards mount and unmount mid-walkthrough
  // would renumber the steps under the athlete ("2 of 5" becoming "2 of 4" between taps).
  const steps = useMemo<SpotlightStep[]>(() => {
    if (!live) return [];
    const mounted = registeredAnchors();
    /* ⚠ `unlocked`, NOT `SCREEN_TOURS[screenKey]`. The phase decides how much of a surface fires on this
       visit — two steps on the first, the rest once the athlete has trained enough to have a reason to
       care. Reading the full list here would draw the whole walkthrough and mark only the phase seen. */
    return unlocked.filter((s) => !s.anchor || mounted.includes(s.anchor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, screenKey, unlocked]);

  return <ScreenTourStage screenKey={screenKey} live={live} steps={steps} stepIndex={stepIndex} setStepIndex={setStepIndex} setStarted={setStarted} started={started} setClosed={setClosed} dismiss={dismiss} restingBottom={restingBottom} />;
}

/**
 * Split out so the effects below can run unconditionally — a hook after an early `return null` is a
 * hook that fires in some renders and not others, which React forbids outright.
 */
function ScreenTourStage({ screenKey, live, steps, stepIndex, setStepIndex, started, setStarted, setClosed, dismiss, restingBottom }: {
  screenKey: ScreenKey;
  live: boolean;
  steps: SpotlightStep[];
  stepIndex: number;
  setStepIndex: (fn: (i: number) => number) => void;
  started: boolean;
  setStarted: (v: boolean) => void;
  setClosed: (v: boolean) => void;
  dismiss: () => void;
  restingBottom?: number;
}) {
  const showing = live && steps.length > 0;

  /* One event when a surface starts teaching, one per step after that. `screenKey` rides `section`,
     which is an allow-listed enum-shaped prop — no athlete text reaches this. */
  useEffect(() => {
    if (showing) track('screen_tour_started', { section: screenKey, total: steps.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showing, screenKey]);

  useEffect(() => {
    if (showing) track('tour_step_shown', { section: screenKey, step: stepIndex, total: steps.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showing, screenKey, stepIndex]);

  if (!showing) return null;

  const finish = () => {
    track('tour_skipped', { section: screenKey, step: stepIndex, total: steps.length });
    setClosed(true); // hide immediately…
    dismiss(); // …and mark this surface seen so it won't fire again (idempotent if already recorded)
  };
  const isLast = stepIndex >= steps.length - 1;

  /** Next — and, on the first press, the engagement that retires this surface for good. */
  const advance = () => {
    if (!started) {
      setStarted(true);
      dismiss();
    }
    if (isLast) setClosed(true);
    else setStepIndex((i) => i + 1);
  };

  return (
    <SpotlightStage
      steps={steps}
      index={stepIndex}
      onNext={advance}
      onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
      onSkip={finish}
      restingBottom={restingBottom}
    />
  );
}
