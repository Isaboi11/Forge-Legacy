import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { forgeOr } from '@/constants/theme-scrim';
import { APP_STORE_URL, inviteHandoff, isIosBrowser, type InviteHandoff } from '@/domain/squad/open-in-app';

/**
 * "Open in Forge Legacy" — a squad invite opened in an iPhone's browser (PO 2026-11-12).
 *
 * ══ WHAT IT SOLVES ══
 *
 * Tapping `https://forgelegacy.expo.app/join-squad?code=…` on an iPhone opens Safari, even with the app
 * installed — the app does not claim the domain until universal links ship in a new build. A signed-out
 * visitor then met the web SIGN-IN screen, which reads as "make an account", the opposite of what
 * somebody who already has the app needs. This screen comes first and offers the hand-off:
 *
 *   · Open in Forge Legacy  → `forgelegacy://join-squad?code=…&ref=…` — every installed build handles it
 *   · Download on the App Store → for someone who does not have the app yet
 *   · Continue in browser   → the web flow exactly as before (it already holds the code through sign-up)
 *
 * iPhone and iPad only — see `isIosBrowser` for why Android waits for its Play listing.
 *
 * ══ ⚠ THE URL IS READ AT MODULE LOAD, NOT IN RENDER OR AN EFFECT ══
 *
 * A signed-out visitor's route tree declares only `sign-in`, and expo-router rewrites the address bar to
 * match once the navigator mounts. Read any later than bundle evaluation and the `?code=` may already be
 * gone. Module scope runs before React renders anything.
 *
 * ══ ⚠ `useSyncExternalStore`, WITH A SERVER SNAPSHOT OF NULL ══
 *
 * The page is statically exported, so the server render has no URL and shows nothing. The server snapshot
 * keeps hydration matching that; the client snapshot then shows the card. No effect, no setState-in-effect.
 */

let handoff: InviteHandoff | null = (() => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  try {
    if (!isIosBrowser(navigator.userAgent, navigator.maxTouchPoints)) return null;
    return inviteHandoff(window.location.href);
  } catch {
    return null; // a browser that cannot tell us where it is gets the ordinary web page
  }
})();

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const getSnapshot = () => handoff;
const getServerSnapshot = (): InviteHandoff | null => null;

/** "Continue in browser" — the card goes for this page load; the web join flow underneath carries on. */
function dismiss() {
  handoff = null;
  listeners.forEach((fn) => fn());
}

export function OpenInAppInvite() {
  const invite = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!invite) return null;

  // Same tab for both. Safari asks "Open in Forge Legacy?" for the scheme, and hands an App Store link
  // to the App Store app — in both cases this page stays put, so "come back and tap Open" still works.
  const openApp = () => {
    window.location.href = invite.appUrl;
  };
  const getApp = () => {
    window.location.href = APP_STORE_URL;
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />

      <View style={styles.body}>
        <View style={styles.crest}>
          <EngravedIcon name="ticket" size={34} />
        </View>
        <Text style={styles.headline}>You’re invited to a squad</Text>
        <Text style={styles.sub}>Open the invite in the Forge Legacy app to join.</Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>INVITE CODE</Text>
          <Text style={styles.code} selectable>
            {invite.code}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button variant="primary" fullWidth onPress={openApp} accessibilityLabel="Open in Forge Legacy">
            Open in Forge Legacy
          </Button>
          <Button variant="secondary" fullWidth onPress={getApp} accessibilityLabel="Download on the App Store">
            Download on the App Store
          </Button>
        </View>

        <Text style={styles.hint}>
          New to Forge Legacy? Download it, then come back to this page and tap Open in Forge Legacy.
        </Text>

        {/* Centred by a wrapper: the text button sizes itself `alignSelf: 'flex-start'`. */}
        <View style={styles.continue}>
          <Button variant="text" onPress={dismiss} accessibilityLabel="Continue in browser">
            Continue in browser
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // `fixed` so it covers the page whatever the page scrolled to; above the coach bubble and every sheet.
  root: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    backgroundColor: flColor.base,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingTop: 72,
    alignItems: 'center',
  },
  crest: {
    width: 78,
    height: 78,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    backgroundColor: forgeOr('#1b130b', flColor.iconContainerBg),
    borderWidth: 1.5,
    borderColor: flColor.bronze400,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 1px rgba(201, 151, 103,0.25), 0 0 22px rgba(186, 134, 84,0.42), inset 0 1px 0 rgba(201, 151, 103,0.14), inset 0 0 28px rgba(0,0,0,0.6)',
  },
  headline: { marginTop: 22, textAlign: 'center', fontFamily: flFont.display, fontSize: 24, fontWeight: '600', lineHeight: 30, letterSpacing: -0.2, color: flColor.cream100 },
  sub: { marginTop: 10, textAlign: 'center', fontSize: 14, lineHeight: 21, color: flColor.gray400, maxWidth: 300 },
  codeBox: {
    alignSelf: 'stretch',
    marginTop: 26,
    paddingVertical: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    alignItems: 'center',
  },
  codeLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6, color: flColor.gray600 },
  code: { marginTop: 6, fontSize: 22, fontWeight: '700', letterSpacing: 2, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  actions: { alignSelf: 'stretch', marginTop: 24, gap: 12 },
  hint: { marginTop: 18, marginBottom: 6, textAlign: 'center', fontSize: 12.5, lineHeight: 19, color: flColor.gray400, maxWidth: 300 },
  continue: { alignSelf: 'center' },
});
