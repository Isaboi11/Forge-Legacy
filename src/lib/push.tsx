import { useEffect, useRef} from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { registerPushToken } from '@/data/push-live';
import { destinationFor, type NotificationTarget } from '@/domain/notifications/destination';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { routeFor } from '@/lib/route-for';

/**
 * Push registration and tap-through (migration 0120).
 *
 * ══ WHY THIS IS A NATIVE CHANGE ══
 *
 * `expo-notifications` shifts the runtime fingerprint, so nothing in this file reaches a tester over the
 * air. It needs a new `eas build` + `eas submit`; an `eas update` cannot deliver it. See
 * `Docs/Release-And-OTA-Runbook.md`.
 *
 * ══ WEB ══
 *
 * The PO reviews the web preview, and there is no push there. Every entry point below returns early on
 * web rather than throwing — the preview must keep working exactly as it did, and a screen that reviews
 * fine but cannot get a token is the expected state, not a failure to report.
 */

// Module scope, once, per the SDK 56 docs. Foreground pushes show as a banner but stay silent: the
// athlete is already looking at the app, so a sound would be telling them something they can see.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Permission, then token. Returns null for every ordinary reason a device has no token — web, a
 * simulator, a declined prompt — and only those; none of them is an error worth surfacing.
 *
 * The prompt is only raised when iOS says it can still be asked. Once an athlete has said no, asking
 * again does nothing at the OS level, and re-requesting on every launch would be pure noise.
 */
export async function ensurePushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null; // a simulator cannot hold an APNs token

  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;

    if (status !== 'granted' && current.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      status = asked.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Forge Legacy',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data ?? null;
  } catch (e) {
    console.warn('[push] could not obtain a token', e);
    return null;
  }
}

/** The ids the sender puts in `data`, read back defensively — this crosses a network boundary. */
function targetFrom(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.kind !== 'string') return null;
  const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
  return {
    kind: d.kind,
    squadId: str(d.squadId),
    actorId: str(d.actorId),
    challengeId: str(d.challengeId),
    inviteId: str(d.inviteId),
    shareId: str(d.shareId),
    // 0135. Both are needed together: the id says WHICH post, the audience says which feed holds it.
    postId: str(d.postId),
    postAudience: str(d.postAudience),
  };
}

/**
 * Registers the device once a session exists, and routes taps.
 *
 * Registration is keyed on the user id, so signing in as somebody else re-registers and the token
 * follows the new athlete — matching `push_register_token`, which reassigns a token's owner on conflict
 * rather than refusing it. A shared phone must never deliver one athlete's notifications to another.
 */
export function PushProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const router = useRouter();
  const userId = session?.user?.id ?? null;

  /*
   * ══ WHERE THE TAP-THROUGH USED TO BREAK ══
   *
   * The same decision the navigator makes. `RootNavigator` returns `BootLoading` — declaring NO screens —
   * until this resolves to 'app', and a screen in this app is reachable only by being DECLARED
   * (`route-guard.test.mjs`). Navigating before then targets a route that is not in the tree.
   *
   * The old code fired the moment a SESSION existed, which is strictly earlier: the profile read is still
   * in flight. On a cold start from a notification that is exactly the window you land in, so tapping a
   * push reliably failed while tapping the same row in the inbox — by which time the app had long since
   * booted — worked perfectly. That asymmetry is why it read as "push is broken" rather than "navigation
   * is early".
   */
  const route = routeFor({
    authLoading,
    hasSession: !!session,
    profileLoading,
    onboardedAt: profile?.onboardedAt,
  });
  const ready = route === 'app';

  /* A tap that arrived before the tree did. Held, not dropped — the athlete tapped it deliberately, and
     silently landing them on Home instead is the app deciding their tap did not count. */
  const pending = useRef<NotificationTarget | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      const token = await ensurePushToken();
      if (cancelled || !token) return;
      await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'web' || !userId) return;

    const go = (response: Notifications.NotificationResponse | null) => {
      const target = targetFrom(response?.notification.request.content.data);
      if (!target) return;
      if (!ready) {
        pending.current = target;
        return;
      }
      router.push(destinationFor(target));
    };

    // A tap that launched the app cold is not delivered to the listener — it is waiting here instead.
    let cancelled = false;
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (!cancelled) go(r);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router, userId, ready]);

  /* And the held tap, once the tree is real. Cleared before navigating so a re-render cannot fire it
     twice and stack the same screen on itself. */
  useEffect(() => {
    if (!ready) return;
    const target = pending.current;
    if (!target) return;
    pending.current = null;
    router.push(destinationFor(target));
  }, [ready, router]);

  return <>{children}</>;
}
