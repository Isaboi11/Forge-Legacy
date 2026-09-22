import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { usePathname } from 'expo-router';

import { TabBar, TabBarButton } from '@/components/forge/composites/TabBar';
import { TourOverlay } from '@/components/tour/TourOverlay';
import { fetchOwnedPendingCounts } from '@/data/squad-discover-live';
import { useNutritionAccess } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';
import {
  HomeTabIcon,
  LegacyTabIcon,
  NutritionTabIcon,
  SquadsTabIcon,
  WorkoutsTabIcon,
} from '@/components/forge/primitives/icons/NavIcons';

/**
 * App shell — the Forge Legacy bronze TabBar (Claude Design's canonical bottom
 * nav), built on `expo-router/ui`'s headless Tabs/TabList/TabTrigger/TabSlot.
 *
 * Four tabs — Home · Workouts · Legacy · Squads — plus **Nutrition, which only the preview allowlist
 * sees** (see below), with "Workouts" plural, Legacy the emphasized bronze tile in the centre, and the
 * icons ported 1:1 from the dc `ForgeSymbols` glyphs.
 *
 * ⚠ NUTRITION TOOK THE FIFTH SLOT, NOT COMMUNITIES. `Community-Architecture-Amendment-002` reserved it
 * for Communities; `Nutrition-Architecture-v1.0` NUT-D1 (PO, 2026-09-21: *"farthest right"*) gives it to
 * Nutrition and leaves Communities without a tab. Legacy stays the centre tile — which is why Nutrition
 * is appended rather than inserted, per `Nutrition Home.dc.html`'s own `tabItems`.
 *
 * ══ ⚠ THE NUTRITION TAB IS BEHIND A PREVIEW ALLOWLIST (0206) ══
 *
 * PO, 2026-09-22: *"It's not done yet so I don't want people using it. Me and the claudetest account."*
 * So Nutrition renders only for accounts in `nutrition_preview`. Two consequences worth knowing:
 *
 *   1. **Appending it is what makes hiding it free.** Legacy is asserted to be the emphasized tile at
 *      index 2, and it is index 2 of four as well as of five — so dropping the last tab returns the bar
 *      to exactly the shape it shipped with before Nutrition existed. Had Nutrition been inserted
 *      anywhere else, hiding it would have moved the centre tile.
 *   2. **This is not the gate.** 0206's RLS on all seven nutrition tables and the `food-search` 403 are
 *      the gate; a hidden tab is only the courtesy of not advertising an unfinished feature. Anyone who
 *      types `/nutrition` still reaches the route — and finds a screen the server will not fill.
 *
 * `useNutritionAccess()` fails closed, so the tab is absent while entitlement loads and appears a beat
 * after launch for the two accounts that have it. Remove the condition (and 0206's gate) when Nutrition
 * ships publicly.
 *
 * Community is a fifth surface that is SHELVED until launch: its tab is intentionally
 * omitted here, its screen is preserved (non-routed) at `src/deferred/community.tsx`,
 * and `/community` soft-redirects to Home (`app/community.tsx`). The shared feed engine
 * it converged onto (FeedPostCard / FeedPost model / getCommunityFeed + goldens) stays
 * live for Friends + Squad. Re-enabling = restore the screen + re-add its TabTrigger.
 *
 * Route distinctness: the tab root is `/workouts` (Programs Catalog / W-2 in
 * Phase 3); the ACTIVE workout session lives at `/workout` (singular), which Home's
 * "Start Workout" pushes to — the two are deliberately separate. `/workouts` and
 * `/legacy` are placeholder "coming in Phase 3" screens for now.
 */
export default function AppTabs() {
  // Athletes waiting on YOU — pending join requests across every squad you own, on the Squads tab.
  // Keyed on the pathname rather than polled: any navigation (including coming back from approving
  // someone) re-reads it, so the badge self-corrects without a timer.
  const pathname = usePathname();
  const { data: pendingCounts } = useQuery(fetchOwnedPendingCounts, [pathname]);
  const pendingRequests = Object.values(pendingCounts ?? {}).reduce((sum, n) => sum + n, 0);
  // 0206 — the Nutrition preview allowlist. Fails closed, so absent while loading. See the header.
  const mayUseNutrition = useNutritionAccess();

  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      {/* First-time guided tour — a shell-level overlay (valid router context) that steps across the tabs. */}
      <TourOverlay />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="home" href="/" asChild>
            <TabBarButton label="Home" renderIcon={(color) => <HomeTabIcon color={color} />} />
          </TabTrigger>
          <TabTrigger name="workouts" href="/workouts" asChild>
            <TabBarButton label="Workouts" renderIcon={(color) => <WorkoutsTabIcon color={color} />} />
          </TabTrigger>
          <TabTrigger name="legacy" href="/legacy" asChild>
            <TabBarButton label="Legacy" emphasized renderIcon={(color) => <LegacyTabIcon color={color} />} />
          </TabTrigger>
          <TabTrigger name="squads" href="/squads" asChild>
            <TabBarButton label="Squads" badge={pendingRequests} renderIcon={(color) => <SquadsTabIcon color={color} />} />
          </TabTrigger>
          {/* 0206 — preview allowlist only. See the header: appended, so its absence restores the
              pre-Nutrition four-tab bar exactly, centre tile included. */}
          {mayUseNutrition ? (
            <TabTrigger name="nutrition" href="/nutrition" asChild>
              <TabBarButton label="Nutrition" renderIcon={(color) => <NutritionTabIcon color={color} />} />
            </TabTrigger>
          ) : null}
        </TabBar>
      </TabList>
    </Tabs>
  );
}
