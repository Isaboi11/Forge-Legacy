import type { useRouter } from 'expo-router';

/**
 * ══ WHERE A FOOD LOGGED FROM OUTSIDE THE NUTRITION TAB GOES BACK TO (PO 11-08 launch QA, H32) ══
 *
 * Food Detail, Create Food and Meal Photo all end a log with `dismissAll()` + `replace('/nutrition')` — right
 * from the diary, and wrong from Workout Complete's "Meal" tile: it popped the whole root stack, closed Workout
 * Complete, and dropped the share choices the athlete had not sent yet, so "Post what I ate?" could never be
 * ticked. The screen that opens Log Food from elsewhere names itself here; the screen that finishes the log
 * returns to it (`dismissTo`, which this app already uses) instead of to the diary.
 *
 * Module memory, one slot: an origin is set immediately before Log Food is pushed and cleared the moment the
 * origin is back in focus, so a later log from the tab itself can never be sent somewhere stale.
 */
type Router = ReturnType<typeof useRouter>;
type Origin = { pathname: '/workout-complete'; params: Record<string, string> };

let origin: Origin | null = null;

export function returnFoodLogTo(next: Origin | null): void {
  origin = next;
}

/** True when it navigated back to the origin; false means "do what the diary does". */
export function finishFoodLog(router: Router): boolean {
  const to = origin;
  origin = null;
  if (!to) return false;
  router.dismissTo(to);
  return true;
}
