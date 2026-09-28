import { useCallback, useState } from 'react';

import { saveAutoPost } from '@/data/auto-post-live';
import type { AutoPostPref } from '@/domain/share/auto-post';
import { useAppPrefs } from '@/lib/settings';

/**
 * The athlete's auto-post preference, and the one way to change it.
 *
 * Reads the app-wide prefs (`SettingsProvider`), so every surface — the completion screen's row, the
 * first-post prompt, Profile Visibility — shows the same answer. A change shows at once (optimistic),
 * rolls back if the server refuses it, and refetches the shared prefs when it lands so the other
 * surfaces catch up.
 *
 * `loaded` is false until the server read lands. Until then `pref` is the default (OFF), which is right
 * for drawing a row and wrong for deciding to post — callers that ACT on the pref must check it.
 */
export function useAutoPost(): {
  pref: AutoPostPref;
  loaded: boolean;
  save: (next: AutoPostPref) => Promise<void>;
} {
  const { prefs, loaded, refetch } = useAppPrefs();
  const [override, setOverride] = useState<AutoPostPref | null>(null);
  const pref = override ?? prefs.autoPost;

  const save = useCallback(
    async (next: AutoPostPref) => {
      setOverride(next);
      try {
        await saveAutoPost(next);
        refetch();
      } catch (e) {
        setOverride(null);
        throw e;
      }
    },
    [refetch],
  );

  return { pref, loaded, save };
}
