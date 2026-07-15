import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';

import { TabBar, TabBarButton } from '@/components/forge/composites/TabBar';
import {
  HomeTabIcon,
  LegacyTabIcon,
  SquadsTabIcon,
  WorkoutsTabIcon,
} from '@/components/forge/primitives/icons/NavIcons';

/**
 * App shell — the Forge Legacy bronze TabBar (Claude Design's canonical bottom
 * nav), built on `expo-router/ui`'s headless Tabs/TabList/TabTrigger/TabSlot.
 *
 * Four tabs, in order — Home · Workouts · Legacy · Squads — with "Workouts" plural,
 * Legacy the emphasized bronze tile in the centre, and the icons ported 1:1 from the
 * dc `ForgeSymbols` glyphs. This matches the design system's finalized 4-tab TabBar.
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
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
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
            <TabBarButton label="Squads" renderIcon={(color) => <SquadsTabIcon color={color} />} />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}
