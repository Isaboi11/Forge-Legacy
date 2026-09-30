import { NotFoundScreen } from '@/components/forge/NotFound';

/**
 * Any URL that matches no screen (QA 09-26, B2).
 *
 * Without this file expo-router draws its own "Unmatched Route" page — white, off-brand, and carrying a
 * public "Sitemap" link that lists every route file in the app, `admin` and the dev harnesses included
 * (auth-08). This is the app's own page instead: one sentence and a way out, in whichever theme the
 * athlete is on, signed in or not.
 *
 * ⚠ It is deliberately OUTSIDE the auth guard (not declared in `_layout`): a mistyped link has to say so
 * to a signed-out visitor too. It reads nothing and shows nothing but the sentence — see
 * `__tests__/route-guard.test.mjs`.
 *
 * ⚠ THIS FILE IS ALSO WHAT ENDS "REACT ERROR #418" ON A SHARED LINK. `web.output` is "static", and the host
 * has no page for `/program/<id>`, `/squad/<id>` … so it serves `+not-found.html`. With expo-router's own
 * not-found route that file's `#root` was an EMPTY div, unlike every other page's, and React failed to
 * hydrate the real screen against it. Rendered through our layout like every other route, the exported
 * `+not-found.html` shell is now byte-identical to theirs (checked on a local `expo export`, 09-30), so the
 * screen hydrates cleanly. The host still answers those URLs with HTTP 404 — only the page is fixed.
 */
export default function NotFoundRoute() {
  return <NotFoundScreen title="This page isn’t here." reason="The link may be old, or it was mistyped." />;
}
