import { Redirect } from 'expo-router';

/**
 * Community is SHELVED until launch (we hide the surface until there's a user base). The tab is
 * removed from `@/components/app-tabs`, and the real screen lives, non-routed, at
 * `src/deferred/community.tsx`. This root-level stub keeps `/community` resolvable so any stale
 * link (bookmark, old deep link) soft-redirects to Home instead of hitting +not-found.
 *
 * The shared feed engine is deliberately preserved and still exercised by Friends + Squad and by
 * the community golden tests — FeedPostCard, the FeedPost/PostContent union (incl. the community
 * origin branch), origin-config, and getCommunityFeed() are untouched. Re-enabling Community =
 * move the screen back to `app/(tabs)/community.tsx` + re-add the tab trigger; delete this stub.
 */
export default function CommunityShelved() {
  return <Redirect href="/" />;
}
