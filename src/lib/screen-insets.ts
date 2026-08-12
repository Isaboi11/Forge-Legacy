import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * HOW FAR A CONTROL SITS FROM THE EDGE OF THE SCREEN — one answer, not one per screen.
 *
 * ══ THE COMPLAINT ══
 *
 * PO: *"Bottom buttons hug the bottom too much. That's kind of with all the buttons. A lot of them hug
 * the sides and the bottoms."*
 *
 * Two separate faults sat under that one sentence.
 *
 * ⚠ **NO BOTTOM-ANCHORED ACTION BAR APPLIED A SAFE-AREA INSET.** Eight screens pin a bar to `bottom: 0`
 * and not one of them read `useSafeAreaInsets()`. On a phone with a home indicator the system draws a
 * grab bar across the bottom ~34 pt, so those buttons were not merely close to the edge — they were
 * partly UNDER the indicator, which is both an aesthetic problem and a tap-target one.
 *
 * ⚠ **AND THE PADDING WAS INVENTED PER SCREEN.** The logger's bar used 14, the picker's 18, the workout
 * builder's 26. Nobody chose those numbers against each other; each was chosen against the screen it
 * was on, which is exactly how a product ends up feeling unevenly built.
 *
 * ══ WHY A FLOOR RATHER THAN THE RAW INSET ══
 *
 * `insets.bottom` is 0 on a home-button phone and on the web preview, so using it alone would fix the
 * indicator and leave the original complaint untouched everywhere else. The floor is the breathing room
 * a button wants regardless; the inset is the hardware on top of it, and the answer is whichever is
 * larger — never the sum, which double-counts on the phones that need it least.
 */

/**
 * The side gutter for screen-level content and action bars.
 *
 * 20 because it is already the most common value in the app by a wide margin, so this standardises
 * toward what most screens do rather than moving everything at once.
 *
 * ⚠ NOT FOR INNER COMPONENTS. A chip, a pill or a list row has its own padding for its own reasons;
 * this is the distance from the EDGE OF THE SCREEN, and pushing it into nested components would inflate
 * every card in the app.
 */
export const SCREEN_GUTTER = 20;

/** The smallest gap between a bottom-anchored control and the edge, before hardware is considered. */
export const BAR_BOTTOM_MIN = 20;

/**
 * Bottom padding for a control anchored to the foot of the screen.
 *
 * ⚠ `Math.max`, NOT ADDITION. Adding the inset to the floor gives a home-indicator phone 54 pt of dead
 * space under a button while a home-button phone gets 20 — the two would visibly disagree about how the
 * app is built. The larger of the two is the honest answer: the floor is what the design wants, the
 * inset is what the hardware demands, and satisfying both means satisfying whichever is bigger.
 */
export function useBarBottom(min: number = BAR_BOTTOM_MIN): number {
  const insets = useSafeAreaInsets();
  return Math.max(min, insets.bottom);
}
