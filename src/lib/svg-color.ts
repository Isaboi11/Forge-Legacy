/**
 * Splitting a CSS colour into the two props `react-native-svg` actually wants.
 *
 * ══ THE BUG THIS EXISTS TO MAKE UNWRITEABLE ══
 *
 * `<Stop stopColor="rgba(88,124,160,0.06)" />` is valid CSS and a browser honours the alpha, so a 6%
 * steel haze looks right in every web preview. **`react-native-svg` takes the colour and the alpha as
 * SEPARATE props and drops the alpha out of an rgba string**, so on a phone that stop resolves FULLY
 * OPAQUE — a soft radial glow paints as a solid slab of colour.
 *
 * It shipped to TestFlight once already, as two opaque bronze rectangles behind the Welcome logo
 * (`157bf34`). That pass fixed 24 stops across 5 files and added a source guard — and the guard greps
 * for the LITERAL `stopColor="rgba(`, so it could not see `stopColor={r.color}` where the rgba string
 * arrives in a variable. `ScreenBackground` did exactly that, and every screen-level radial in the app
 * was painting at full strength on device while looking correct on the web preview.
 *
 * Pure and dependency-free so `node --test` can load it.
 */

/** A colour split into what `<Stop>` needs: an alpha-free colour, and the alpha as a number. */
export interface SvgStop {
  color: string;
  opacity: number;
}

/**
 * `rgba(88,124,160,0.06)` → `{ color: 'rgb(88,124,160)', opacity: 0.06 }`.
 *
 * Anything already alpha-free — a hex, a plain `rgb()`, a named colour — passes through at opacity 1,
 * so this is safe to wrap around every stop colour rather than only the ones known to carry alpha.
 * An unparseable string is returned untouched at opacity 1: the failure mode is the colour the author
 * wrote, never a silently blank gradient.
 */
export function svgStop(css: string): SvgStop {
  const m = /^\s*rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)\s*$/i.exec(css ?? '');
  if (!m) return { color: css, opacity: 1 };
  const a = Number(m[4]);
  return {
    color: `rgb(${m[1]},${m[2]},${m[3]})`,
    // A malformed alpha reads as fully opaque rather than invisible — the same posture as the fallback
    // above. Clamped, because `rgba(…, 1.5)` is something a hand-transcribed `.dc` can contain.
    opacity: Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1,
  };
}
