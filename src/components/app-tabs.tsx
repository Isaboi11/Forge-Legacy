import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';

import { TabBar, TabBarButton } from '@/components/forge/composites/TabBar';
import { HomeTabIcon, LegacyTabIcon, SquadsTabIcon, WorkoutTabIcon } from '@/components/forge/primitives/icons/NavIcons';

/**
 * App shell — the Forge Legacy bronze TabBar (Claude Design's canonical
 * bottom nav) is the app-wide navigation standard. Built on `expo-router/ui`'s
 * headless Tabs/TabList/TabTrigger/TabSlot rather than `NativeTabs`: native
 * tab chrome can't render the bronze glow, the emphasized Legacy tile, or the
 * custom icon set. This one file now serves both web and native — there is
 * no `.web.tsx` override anymore, since `expo-router/ui` is cross-platform.
 *
 * Bottom nav is Home / Workout / Squads / Legacy. `/explore` (the stock Expo
 * demo screen) was dropped from the tab bar but the route itself is left in
 * place. `/workout` and `/squads` are placeholder screens pending their real
 * architecture; `/legacy-design-test` remains the emphasized Legacy tab.
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
          <TabTrigger name="workout" href="/workout" asChild>
            <TabBarButton label="Workout" renderIcon={(color) => <WorkoutTabIcon color={color} />} />
          </TabTrigger>
          <TabTrigger name="squads" href="/squads" asChild>
            <TabBarButton label="Squads" renderIcon={(color) => <SquadsTabIcon color={color} />} />
          </TabTrigger>
          <TabTrigger name="legacy" href="/legacy-design-test" asChild>
            <TabBarButton label="Legacy" emphasized renderIcon={(color) => <LegacyTabIcon color={color} />} />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}
