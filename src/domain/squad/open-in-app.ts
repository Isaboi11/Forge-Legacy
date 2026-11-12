/**
 * "Open in Forge Legacy" for a squad invite opened in a phone's browser — the pure half.
 *
 * ══ WHY THIS EXISTS (PO 2026-11-12) ══
 *
 * An invite is shared as `https://forgelegacy.expo.app/join-squad?code=TILV-JYFN&ref=53ZQRGBV`. On an
 * iPhone that link opens SAFARI, not the app, because the app does not claim the domain yet — that is a
 * universal link, which needs `ios.associatedDomains` signed into a new build. Until that build exists,
 * the web page offers the hand-off itself: a button that opens the same invite through the app's own
 * `forgelegacy://` scheme, which every installed build already registers.
 *
 * The app needs nothing new to receive it: `lib/pending-invite.tsx` and `join-squad.tsx` already read
 * `forgelegacy://join-squad?code=…&ref=…`, cold or warm, signed in or not.
 */

// ⚠ Explicit `.ts`: `node --test` resolves these at runtime (same convention as `referral-link.ts`).
import { inviteCodeFromUrl } from './invite-link.ts';
import { referralCodeFromUrl } from '../referral/referral-link.ts';

/** Forge Legacy on the App Store (`eas.json` → `ascAppId`). */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6798436104';

export interface InviteHandoff {
  /** The squad code, normalised the way `join-squad` expects it. */
  code: string;
  /** The same invite as an app link — the squad code AND the referral, so attribution survives the hop. */
  appUrl: string;
}

/**
 * The app link for an invite URL, or null when the URL is not a squad invite.
 *
 * ⚠ THE REFERRAL RIDES ALONG. Dropping `ref` here would make every invite opened through this button
 *   arrive unattributed — the funnel would still look like it worked, it would just credit nobody.
 */
export function inviteHandoff(url: string | null | undefined): InviteHandoff | null {
  const code = inviteCodeFromUrl(url);
  if (!code) return null;
  const ref = referralCodeFromUrl(url);
  const appUrl =
    `forgelegacy://join-squad?code=${encodeURIComponent(code)}` + (ref ? `&ref=${encodeURIComponent(ref)}` : '');
  return { code, appUrl };
}

/**
 * Is this browser on an iPhone or iPad — the only place the app can be installed today?
 *
 * Android is left out on purpose until the Play listing is live: the button would open nothing for
 * almost everyone, and there is no store page yet to send them to instead.
 *
 * ⚠ iPadOS asks for the desktop site and reports itself as a Mac. A touch screen is what gives it away.
 */
export function isIosBrowser(userAgent: string | null | undefined, maxTouchPoints = 0): boolean {
  const ua = userAgent ?? '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && maxTouchPoints > 1;
}
