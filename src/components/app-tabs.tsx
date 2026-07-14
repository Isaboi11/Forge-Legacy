import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';

import { TabBar, TabBarButton } from '@/components/forge/composites/TabBar';
import {
  CommunityTabIcon,
  HomeTabIcon,
  LegacyTabIcon,
  SquadsTabIcon,
  WorkoutsTabIcon,
} from '@/components/forge/primitives/icons/NavIcons';

/**
 * App shell — the Forge Legacy bronze TabBar (Claude Design's canonical bottom
 * nav), built on `expo-router/ui`'s headless Tabs/TabList/TabTrigger/TabSlot.
 *
 * Matches `Forge Home.dc.html` `tabItems` (line 371) EXACTLY: five tabs in order
 * — Home · Workouts · Legacy · Squads · Community — with "Workouts" plural, Legacy
 * the emphasized bronze tile in the centre, and the icons ported 1:1 from the dc
 * `ForgeSymbols` glyphs. (Supersedes the earlier 4-tab shell; the Forge DS guide's
 * "4 tabs" is superseded by the screen + Community-Architecture-Amendment-002.)
 *
 * Route distinctness: the tab root is `/workouts` (Programs Catalog / W-2 in
 * Phase 3); the ACTIVE workout session lives at `/workout` (singular), which Home's
 * "Start Workout" pushes to — the two are deliberately separate. `/workouts`,
 * `/legacy`, and `/community` are placeholder "coming in Phase 3" screens for now;
 * `/explore` (stock Expo demo) remains a route but is not in the tab bar.
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
          <TabTrigger name="community" href="/community" asChild>
            <TabBarButton label="Community" renderIcon={(color) => <CommunityTabIcon color={color} />} />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}
