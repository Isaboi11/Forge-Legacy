/**
 * TourProvider — the first-time guidance host (Onboarding-Amendment-003). It owns two device-local
 * decisions and renders the app-level "first move" unlock ceremony above every route:
 *
 *   1. The GUIDED TOUR state machine — pending → running (step-by-step) → completed | skipped. The
 *      persisted flag (`tour.ts`) only ever records the terminal decision; `running`/`stepIndex` are
 *      transient in-memory, so quitting mid-tour re-prompts next launch.
 *   2. The FIRST-VISIT SEEN-SET (`screen-prompts.ts`) — which surfaces have shown their one-time tour.
 *
 * The entry point is the forged-medallion `HonorCeremony` (Forge First Honor Ceremony) — it fires once the
 * athlete makes their first move (program built or chosen, announced by Home via `requestPrompt`) carrying
 * the earned Initiative honor, and its "Keep Building" CTA hands straight to the guided 4-tab tour. There is
 * NO "skip the tour" choice; the tour just runs (mid-tour Skip remains as an escape hatch).
 *
 * Mounted INSIDE `CeremonyProvider` (so the unlock ceremony can defer to a live ceremony — Modal Library
 * "never stack") and above the boot router. It re-reads persisted state on mount and force-resets its
 * in-memory state whenever the auth user id changes, staying in step with `resetFirstRunFlags()`.
 *
 * This is the guided tour the locked ONB-D20/D21 Non-Behavior originally prohibited; Amendment-003
 * narrows that rule to admit it (one-time, dismissible, emits no progression event — ONB-D22 preserved).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router, type Href } from 'expo-router';

import { useCeremony } from '@/hooks/useCeremony';
import { useAuth } from '@/lib/auth';
import { HonorCeremony } from '@/components/ceremony/HonorCeremony';
import { HonorSymbol } from '@/components/ceremony/HonorSymbol';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont } from '@/constants/foundation';
import { getTourStatus, setTourStatus } from '@/lib/tour';
import { getSeenPrompts, markPromptSeen, type ScreenKey } from '@/lib/screen-prompts';

export interface TourStep {
  route: Href;
  title: string;
  body: string;
}

/** The v1 guided walk — one tab per step, in nav order (Home → Workouts → Legacy → Squads). */
export const TOUR_STEPS: TourStep[] = [
  {
    route: '/',
    title: 'Home',
    body: 'Your daily starting point — today’s workout, the chapter you’re writing, and the people training alongside you.',
  },
  {
    route: '/workouts',
    title: 'Workouts',
    body: 'Browse the program library, build your own, and start today’s session — all from here.',
  },
  {
    route: '/legacy',
    title: 'Legacy',
    body: 'Your permanent record — chapters, honors, and milestones that endure. History can’t be rewritten.',
  },
  {
    route: '/squads',
    title: 'Squads',
    body: 'Small, private groups that train together, follow each other’s progress, and keep each other honest.',
  },
];

/**
 * Surfaces a COMPLETED tour has already walked the athlete through — pre-marked as seen so a tour-taker
 * isn't immediately re-taught by the first-visit banners. A SKIPPED tour leaves these unseen on purpose:
 * skipping is the "explore on my own" path, which the per-screen prompts exist to guide.
 */
const TOUR_COVERED: ScreenKey[] = ['workouts', 'legacy', 'squads'];

// 'deferred' = the athlete tapped "View Honor" — the tour is owed but paused while they go look at the honor;
// it resumes into the guided walk the next time Home regains focus.
type UiStatus = 'loading' | 'pending' | 'deferred' | 'running' | 'completed' | 'skipped';

interface TourContextValue {
  status: UiStatus;
  stepIndex: number;
  currentStep: TourStep | null;
  /** Announce the athlete reached the open forge — shows the honor ceremony while the tour is `pending`. */
  requestPrompt: () => void;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
  /** Resume a tour deferred by "View Honor" — the Honors Hub calls this as it's left. */
  resumeTour: () => void;
  // first-visit seen-set (consumed by useScreenPrompt)
  seen: ScreenKey[];
  seenLoaded: boolean;
  markSeen: (key: ScreenKey) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { current: ceremony } = useCeremony();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [status, setStatus] = useState<UiStatus>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [requested, setRequested] = useState(false);
  const [seen, setSeen] = useState<ScreenKey[]>([]);
  const [seenLoaded, setSeenLoaded] = useState(false);

  // Load persisted state on first mount; force in-memory defaults on any later account switch. The switch
  // path deliberately does NOT re-read storage (a race with `resetFirstRunFlags` clearing it) — it just
  // resets to the fresh-athlete defaults, which is exactly what the cleared flags would resolve to.
  const prevId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevId.current === undefined) {
      prevId.current = userId;
      let alive = true;
      void (async () => {
        const [persisted, seenList] = await Promise.all([getTourStatus(), getSeenPrompts()]);
        if (!alive) return;
        setStatus(persisted);
        setSeen(seenList);
        setSeenLoaded(true);
      })();
      return () => {
        alive = false;
      };
    }
    if (prevId.current !== userId) {
      prevId.current = userId;
      setStatus('pending');
      setStepIndex(0);
      setRequested(false);
      setSeen([]);
      setSeenLoaded(true);
    }
  }, [userId]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRequested(false);
    setStatus('running');
  }, []);

  // Called by Home once the athlete reaches the open forge — shows the honor ceremony (only while `pending`).
  // Stable identity on purpose: it must NOT react to the tour status, or setting `deferred` in `viewHonor`
  // would re-fire Home's focus effect and start the tour on Home before the hub even opens (the View Honor bug).
  const requestPrompt = useCallback(() => setRequested(true), []);

  const skipTour = useCallback(() => {
    setRequested(false);
    setStatus('skipped');
    void setTourStatus('skipped');
  }, []);

  // "View Honor" — the ceremony's secondary: go see the just-earned honor NOW and take the guided tour
  // AFTER. Defers the tour (hides the ceremony + suppresses the per-screen tours) and sends them to their
  // honors; the tour resumes the next time Home regains focus. Navigation uses expo-router's imperative
  // `router` because the provider sits above the navigator.
  const viewHonor = useCallback(() => {
    setRequested(false);
    setStatus('deferred');
    router.navigate('/honors');
  }, []);

  // Resume the deferred tour — called by the Honors Hub as the athlete LEAVES it (they've viewed the honor).
  // An explicit exit event, kept off Home's focus path so navigating to the hub can't race into the tour.
  const resumeTour = useCallback(() => {
    if (status === 'deferred') startTour();
  }, [status, startTour]);

  const nextStep = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      // Finish: record the terminal decision and pre-mark the covered surfaces as seen.
      setStatus('completed');
      void setTourStatus('completed');
      setSeen((prev) => Array.from(new Set([...prev, ...TOUR_COVERED])));
      void Promise.all(TOUR_COVERED.map((k) => markPromptSeen(k)));
    } else {
      setStepIndex(stepIndex + 1);
    }
  }, [stepIndex]);

  const markSeen = useCallback((key: ScreenKey) => {
    setSeen((prev) => (prev.includes(key) ? prev : [...prev, key]));
    void markPromptSeen(key);
  }, []);

  const currentStep = status === 'running' ? TOUR_STEPS[stepIndex] ?? null : null;

  const value = useMemo<TourContextValue>(
    () => ({ status, stepIndex, currentStep, requestPrompt, startTour, nextStep, skipTour, resumeTour, seen, seenLoaded, markSeen }),
    [status, stepIndex, currentStep, requestPrompt, startTour, nextStep, skipTour, resumeTour, seen, seenLoaded, markSeen],
  );

  // The "first move" unlock ceremony: only while the tour is still owed (`pending`), announced by Home once
  // a program exists, and no ceremony is showing (never stack over an earned moment — it re-appears after).
  // Its single "Keep Building" hands straight to the guided tour — there is no skip-the-tour choice.
  const showUnlock = requested && status === 'pending' && !ceremony;

  return (
    <TourContext.Provider value={value}>
      {children}
      <HonorCeremony
        open={showUnlock}
        honorName="Initiative"
        body="You made your first move. The hardest step is behind you — the full forge is open."
        symbol={<HonorSymbol honorName="Initiative" />}
        footer={
          <>
            <Button variant="primary" fullWidth onPress={startTour} accessibilityLabel="Keep Building — enter the forge">
              Keep Building
            </Button>
            {/* Centered tertiary — the Button `text` variant left-aligns (it's the "View all →" affordance),
                so render View Honor as its own centered pressable. */}
            <Pressable onPress={viewHonor} accessibilityRole="button" accessibilityLabel="View Honor — see it in your Legacy" style={styles.viewHonor}>
              <Text style={styles.viewHonorText}>View Honor</Text>
            </Pressable>
          </>
        }
        onRequestClose={startTour}
      />
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
}

/**
 * First-visit banner controller for one screen. Visibility is derived purely from the shared seen-set —
 * shown while the screen isn't yet seen, the state has loaded, and the tour flow isn't in the way.
 * `dismiss` marks the screen seen (an event-handler write), which updates that state and hides the banner —
 * and persists it, so it never returns on relaunch. No effect, no render-phase ref: the strict hooks rules
 * forbid both, and this needs neither.
 */
export function useScreenPrompt(key: ScreenKey): { shouldShow: boolean; dismiss: () => void } {
  const { seen, seenLoaded, markSeen, status } = useTour();
  const blocking = status === 'loading' || status === 'pending' || status === 'running' || status === 'deferred';
  const shouldShow = seenLoaded && !blocking && !seen.includes(key);
  const dismiss = useCallback(() => markSeen(key), [markSeen, key]);
  return { shouldShow, dismiss };
}

const styles = StyleSheet.create({
  viewHonor: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  viewHonorText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze400 },
});
