import { flColor, flRadius, flShadow } from './foundation';

/**
 * ══ THE THREE SURFACES — one language for "what kind of thing is this?" ══
 *
 * PO design review, 2026-08-25: *"Your surfaces aren't quite speaking the same language yet. Some cards
 * have relatively prominent bronze borders, some have shadows, some are border-only, some blend almost
 * entirely into the parchment, some have noticeably different corner radii. That's okay when intentional,
 * but right now it feels about 10% inconsistent."*
 *
 * Three treatments, and nothing else:
 *
 *   · **`primary`**   — a slight lift, a hairline bronze edge, an extremely soft shadow.
 *   · **`secondary`** — translucent, a subtle border, no meaningful shadow.
 *   · **`editorial`** — NO CONTAINER AT ALL. Typography, spacing, and a divider.
 *
 * ══ ⚠ WHICH ONE SOMETHING GETS IS NOT A QUESTION OF IMPORTANCE ══
 *
 * The PO's own rule, locked 2026-08-24 and unchanged by this: **cards are for things you act INSIDE of.
 * Information gets a section label, not a card.** Two card tiers is permission to reach for a card, so
 * the tiers are gated on that rule and not on prominence:
 *
 *   1. *Do I act inside this?* — press it, type in it, toggle something within it.
 *      **No** → `editorial`, however important it is. A rank, a statement, a hero, a summary: all
 *      editorial. This is the answer more often than it feels like it should be.
 *   2. **Yes** → is it the thing this screen is FOR, or one of a list of peers?
 *      The thing the screen is for → `primary`. One of many → `secondary`.
 *
 * A screen should hold **at most one** `primary`. Two primaries is two answers to "what is this screen
 * for", which is the flatness the review describes from the other direction.
 *
 * ══ BOTH THEMES, AUTOMATICALLY ══
 *
 * Every value below is a token, so Forge and Alabaster each get their own rendering with no branch here.
 * This module is SHAPE — radii, borders, elevation — which under Design System §2.0 belongs to both
 * themes; the colour half is already answered by the palettes.
 */

/** At most one per screen: the thing the screen is for, and you act inside it. */
export const surfacePrimary = {
  borderRadius: flRadius.xl,
  borderWidth: 1,
  borderColor: flColor.bronzeBorderSubtle,
  backgroundColor: flColor.charcoal800,
  boxShadow: flShadow.card,
} as const;

/** One of a list of peers you act inside — a template row, a program row, an option. */
export const surfaceSecondary = {
  borderRadius: flRadius.lg,
  borderWidth: 1,
  borderColor: flColor.charcoal600,
  backgroundColor: flColor.surfaceRecessed,
} as const;

/**
 * Not a container. Use this for the SPACING around an editorial block, and let type and a divider do
 * the rest.
 *
 * ⚠ IT DELIBERATELY SETS NO BACKGROUND, NO BORDER AND NO RADIUS. If you find yourself adding one back,
 * the block is either something you act inside (use `surfaceSecondary`) or it wanted a section label —
 * see the gate above. Adding a border here is how the ten-percent-inconsistent feeling comes back.
 */
export const surfaceEditorial = {
  paddingVertical: 4,
  gap: 10,
} as const;

/**
 * The hairline under an editorial block. One weight, one colour, everywhere.
 *
 * ⚠ `charcoal600`, WHICH THE PALETTES THEMSELVES LABEL "border / divider" — not `charcoal700`, which
 * they label "elevated / sheet". That distinction is invisible in Forge, where both are dark and either
 * reads as a line, and decisive in Alabaster, where `charcoal700` is a light SURFACE (#F1EBDD) that
 * measures **1.04:1** against the page. A separator nobody can see is the reason the PO described the
 * squad feed as *"a lot of uninterrupted parchment"* — the rules were already there.
 *
 *   Alabaster: 1.04:1 → **1.62:1**   ·   Forge: 1.16:1 → 1.30:1
 */
export const editorialRule = {
  height: 1,
  backgroundColor: flColor.charcoal600,
} as const;
