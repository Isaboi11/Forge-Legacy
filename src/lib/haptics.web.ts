/**
 * The haptics layer — web.
 *
 * The native build resolves `haptics.ts` instead, which drives the Taptic Engine through
 * `expo-haptics`. Both expose exactly these three calls, so a screen never asks which platform it
 * is on. This is the sibling of `lib/ding.web` and is deliberately shaped the same way.
 *
 * ⚠ THIS IS A COURTESY, NOT A FEATURE. `navigator.vibrate` is unimplemented in every version of
 *   Safari, desktop and iOS alike, and Chrome ignores it until the page has been interacted with.
 *   The PO tests on the web preview, so the honest expectation is that these are no-ops there and
 *   the real thing only appears in a native build. Do not "fix" a silent web preview by reaching
 *   for a different API — there isn't one.
 */

function buzz(pattern: number | number[]): void {
  try {
    // `vibrate` is absent on Safari and typed as optional here for exactly that reason.
    (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(pattern);
  } catch {
    // best-effort
  }
}

/** A set was logged, a rep was counted — the everyday confirmation. */
export function tapLight(): void {
  buzz(10);
}

/** A heavier confirmation: finishing an exercise, committing a sheet. */
export function tapMedium(): void {
  buzz(18);
}

/** Something landed that the athlete earned — a PR, a completed workout, an honor. */
export function tapSuccess(): void {
  buzz([10, 28, 45]);
}
