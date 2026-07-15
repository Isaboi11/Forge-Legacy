import AppTabs from '@/components/app-tabs';

/**
 * `(tabs)` group layout — the 4-tab bronze shell (expo-router/ui headless Tabs, in
 * `@/components/app-tabs`). The `(tabs)` group segment carries no URL, so the tab routes keep
 * their paths (`/`, `/workouts`, `/legacy`, `/squads`). Living inside this group (under the root
 * Stack) is what lets pushed detail routes — `post/[id]`, `squad/[id]`, `workout`,
 * `ceremony-harness` — present OVER the tabs with no tab bar. (Community is shelved until launch:
 * its screen is preserved at `src/deferred/community.tsx`, and `/community` redirects to Home.)
 */
export default function TabsLayout() {
  return <AppTabs />;
}
