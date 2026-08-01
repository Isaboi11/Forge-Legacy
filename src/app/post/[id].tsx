import { Redirect } from 'expo-router';

/**
 * Post Detail is DEFERRED. The real screen lives, non-routed, at `src/deferred/post-detail.tsx`.
 *
 * It was never a production surface — it read `post-placeholder`, a fixture of invented athletes and
 * invented squad records, and already redirected on `!__DEV__`. But that guard only stopped it
 * RENDERING. Metro does not tree-shake, and a file in `src/app/` is a route, so its static import of
 * `getPost` compiled the whole fixture chain — post-placeholder → squad-feed-placeholder →
 * community-placeholder — into the production web bundle, where the invented names were readable in
 * source. Gating a screen never tree-shakes a module; moving the file out of `src/app/` is what does.
 *
 * This stub keeps `/post/[id]` resolving so a stale link still lands on Home, which is exactly what
 * the old screen did in production anyway — same behaviour, none of the payload.
 *
 * Re-enabling: move `src/deferred/post-detail.tsx` back to `src/app/post/[id].tsx` and delete this
 * stub. Do that only once it reads a real feed; returning it as-is puts the fixtures back in the
 * bundle. The live post surface is `squad-post/[id]`, which renders real posts from 0040–0053.
 */
export default function PostDetailDeferred() {
  return <Redirect href="/" />;
}
