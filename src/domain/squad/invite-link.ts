/**
 * The squad code carried by an incoming link — parsed, and nothing else.
 *
 * ══ THE DEFECT THIS EXISTS TO CLOSE ══
 *
 * `squad-invite.tsx` builds `https://forgelegacy.expo.app/join-squad?code=IRON-4F2A`, which is correct:
 * `join-squad` is a STATIC route, so it survives the static export that makes every `[id]` route 404 on a
 * pasted URL.
 *
 * But a stranger has no session. `routeFor` returns `'auth'`, and `_layout.tsx` then declares ONLY
 * `sign-in` — expo-router builds its route tree from what is declared, so `join-squad` is stripped out
 * and the `?code=` goes with it. They sign up, complete onboarding, and land on Home in no squad, with
 * nothing anywhere in the app still holding the code. A repo-wide search for any deferred-link mechanism
 * (`pendingInvite`, `returnTo`, `redirectTo`, a stashed param) returned nothing, and neither `sign-in`
 * nor `onboarding` reads a param.
 *
 * The whole year-one plan is 20 testers inviting five people each, and the funnel being instrumented
 * (sent → accepted → installed → converted) could not structurally complete: every invite to somebody who
 * did not already have the app ended on Home.
 *
 * ══ WHY THE PARSING IS ITS OWN PURE MODULE ══
 *
 * The capture has to happen OUTSIDE the router — the route that would have read the param does not exist
 * at that moment — so it reads the raw URL from `expo-linking`. Raw URL handling is exactly where edge
 * cases live (two schemes, a trailing slash, a fragment, an absent code, a code that is really a hash
 * fragment on web), and `src/domain` is where `node --test` can reach them.
 */

/** Normalised to the shape `join-squad` expects: upper case, trimmed. */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * The squad code in an incoming URL, or null.
 *
 * Accepts both forms the invite carries (`squad-invite.tsx:52`, `:64`):
 *   · `https://forgelegacy.expo.app/join-squad?code=IRON-4F2A` — anyone, including a laptop
 *   · `forgelegacy://join-squad?code=IRON-4F2A`                — a phone that already has the app
 *
 * ⚠ THE PATH IS CHECKED, NOT JUST THE PARAM. A bare `?code=` on some other route is not an invite, and
 *   treating it as one would hijack a link that meant something else. Only `join-squad` counts.
 */
export function inviteCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    // A custom scheme (`forgelegacy://join-squad?code=X`) has no `//host`, so the path lands in different
    // places across parsers. Matching the segment directly is the one reading that holds for both.
    if (!/[/:]join-squad(?:[/?#]|$)/i.test(url)) return null;

    const q = url.indexOf('?');
    if (q < 0) return null;
    // Stop at a fragment: `?code=X#/something` must not fold the fragment into the value.
    const query = url.slice(q + 1).split('#')[0];

    for (const pair of query.split('&')) {
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      if (pair.slice(0, eq).toLowerCase() !== 'code') continue;
      const value = normalizeInviteCode(decodeURIComponent(pair.slice(eq + 1)));
      // A code is 4+ characters — the same floor `join-squad.tsx` uses to enable Continue. An empty or
      // stub `?code=` is not worth stashing and would strand the athlete on a screen that cannot resolve.
      return value.length >= 4 ? value : null;
    }
    return null;
  } catch {
    return null; // a malformed URL is not an invite
  }
}
