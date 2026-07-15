import AppTabs from '@/components/app-tabs';

/**
 * `(tabs)` group layout — the 5-tab bronze shell (expo-router/ui headless Tabs, in
 * `@/components/app-tabs`). The `(tabs)` group segment carries no URL, so the tab routes keep
 * their paths (`/`, `/workouts`, `/legacy`, `/squads`, `/community`). Living inside this group
 * (under the root Stack) is what lets pushed detail routes — `post/[id]`, `workout`,
 * `ceremony-harness` — present OVER the tabs with no tab bar.
 */
export default function TabsLayout() {
  return <AppTabs />;
}
