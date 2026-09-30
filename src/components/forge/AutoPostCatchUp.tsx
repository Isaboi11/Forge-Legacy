import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';

import { resumePendingAutoPost } from '@/data/auto-post-live';
import { useAuth } from '@/lib/auth';
import { useAppPrefs } from '@/lib/settings';

/**
 * Posts the session the athlete closed the app on, once per launch.
 *
 * Auto-post fires when they LEAVE the completion screen (so the note and the playlist can go with it),
 * and closing the app is a way of leaving that runs no code. The screen leaves a marker; this finds it.
 * Renders nothing. See `resumePendingAutoPost`.
 */
export function AutoPostCatchUp() {
  const { session } = useAuth();
  const { prefs, loaded } = useAppPrefs();
  const pathname = usePathname();
  const userId = session?.user?.id ?? null;
  /* Once per user per launch. The effect also re-runs when the pref changes — including when it is
     switched on FROM the completion screen, whose own marker this must not pick up and post early. */
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !loaded || ranFor.current === userId) return;
    ranFor.current = userId;
    /* A reload that lands back on the completion screen: the screen is open and owns this one. */
    if (pathname.startsWith('/workout-complete')) return;
    void resumePendingAutoPost(prefs.autoPost);
  }, [userId, loaded, pathname, prefs.autoPost]);

  return null;
}
