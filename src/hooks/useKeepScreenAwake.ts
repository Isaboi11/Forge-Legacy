import { useEffect } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

/**
 * Hold the screen on while something is genuinely in progress.
 *
 * Built for Active Run, where the tracker is foreground-only: the moment the screen sleeps, fixes stop
 * arriving and the route stops growing. Losing a run to a display timeout is the most ordinary way this
 * feature fails, and the athlete has no way to know it happened until they look.
 *
 * ══ WHY NOT `useKeepAwake()` ══
 *
 * The library's own hook activates for a component's lifetime, which would be right, except its WEB
 * implementation is a thin wrapper over `navigator.wakeLock.request('screen')` with no
 * `visibilitychange` handling. Browsers RELEASE a screen wake lock whenever the tab is hidden and do not
 * restore it on return — so switching apps for one notification and coming back would leave the screen
 * free to sleep for the rest of the run, silently. This re-takes the lock every time the page becomes
 * visible again.
 *
 * Failures are swallowed on purpose. A browser without the Wake Lock API, or a refused request, means
 * the screen may sleep — which is the behaviour without this hook at all. It must never take down a
 * session that is otherwise recording fine.
 */

const TAG = 'forge-active-session';

export function useKeepScreenAwake(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const acquire = () => {
      void activateKeepAwakeAsync(TAG).catch(() => {});
    };
    acquire();

    let onVisible: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisible = () => {
        if (document.visibilityState === 'visible') acquire();
      };
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      if (onVisible && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
      // Releasing matters as much as taking it: a lock that outlives the run holds the screen on for
      // whatever the athlete does next.
      try {
        deactivateKeepAwake(TAG);
      } catch {
        // Already released, or never acquired — nothing to undo either way.
      }
    };
  }, [active]);
}
