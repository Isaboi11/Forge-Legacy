/**
 * MilestoneBand — the Rank Ascension artifact, as it appears in a feed.
 *
 * ══ IT IS AN OBJECT THE SYSTEM MADE, NOT AN IMAGE SOMEBODY ATTACHED ══
 *
 * PO, iteration 2: *"The giant rectangular image inside the post currently feels like an image
 * attachment. I'd instead make the rank experience feel like a native Forge Legacy object."* Right, and
 * the first pass got it wrong for a defensible reason that turned out not to apply.
 *
 * That pass made this a full-bleed BAND, on the grounds that `LedgerPost`'s one deliberate exception is
 * the media band and that a bordered panel would be the boxes-inside-boxes the ledger redesign deleted.
 * The second half of that is true of a MEMBER post. It is not true here, and the feed already had the
 * precedent: the Weekly Summary keeps its card because *"it is a system artifact rather than a member
 * post — the squad talking, not a person — and against a feed of hairline-separated rows the contrast is
 * now doing real work instead of competing with twenty other bordered boxes."*
 *
 * A rank ascension is exactly that. Nobody composed it; the Forge evaluated 28 rungs of a ladder and
 * said this one was cleared. So it is an inset, hairline-bronze object aligned to the post's own text
 * gutter — recognisable at a glance as a thing the system issued.
 *
 * ══ THE HIERARCHY, IN THE ORDER THE PO NUMBERED IT ══
 *
 *   1. the badge          — the hero, on a lit stage
 *   2. BUILDER I          — the name, large
 *   3. Foundation IV ↓    — the transition, small and above the hero, so it reads as "from → to"
 *   4. ◆ RANK ASCENDED    — the label, small enough to stop competing with the rank
 *   5. the line, the date — supporting
 *
 * The first pass ran 4 → 1 → 2 → everything else: the label was the loudest thing on the card and the
 * transition sat beside the hero at the same optical weight as the hero itself.
 *
 * ══ ⚠ THE STAGE EXISTS BECAUSE THE ARTWORK CANNOT CARRY THIS ALONE ══
 *
 * PO: *"the actual artwork is too dark and visually empty. The center is basically a dirt/stone
 * texture, so at a glance it doesn't immediately read as a prestigious rank emblem."* That is an
 * accurate reading of `builder-1.png`, and it is also, deliberately, what Builder I depicts: bare ground
 * with two sprouts, before anything has been built on it. The art gets richer up the ladder.
 *
 * Nothing drawn here can fix a flat master, and it does not pretend to. What it does is PRESENT it:
 * a warm radial behind the badge, two concentric hexagons echoing its own silhouette, a perimeter ring,
 * a scatter of embers, and a small contrast lift on the raster itself. A stronger Builder I master is an
 * art commission, not a layout change — see the note beside `ART_LIFT`.
 *
 * ══ ⚠ THE INTENSITY RISES WITH THE FAMILY, AND THAT IS THE WHOLE POINT ══
 *
 * PO: *"Don't make every rank post use the same exact composition… Each advancement should feel
 * increasingly significant. Especially Legend and Legacy."* `heat()` derives one 0→1 number from the
 * family's position in `RANK_FAMILIES`, and every ceremonial element scales off it: glow, ring opacity,
 * ember count, border strength. Foundation is nearly bare. Legacy is lit.
 *
 * One composition, seven intensities — rather than seven layouts, which would drift the moment one of
 * them was edited.
 *
 * ══ ⚠ IT RE-THEMES, AND IT FOLLOWS THE VIEWER — NOT THE AUTHOR ══
 *
 * The first two passes painted this card in fixed dark literals in both themes, arguing that a badge is
 * artwork and artwork does not re-theme (`foundation.paper.ts`'s `onMedia`: *"Same as Forge — a photo is
 * not a theme surface"*). PO, overruling it: *"be sure that we are doing this for light mode as well. If
 * someone is on light mode it should post it in light mode. If someone is on dark mode and posts it, it
 * should show up as the light mode for other people."*
 *
 * So the rule is **the reader's theme wins, always**, and nothing about the theme is stored on the post:
 * a `milestone-card` payload carries no palette, and it must never gain one. Two squadmates looking at
 * the same ascension see it in their own themes, which is how every other surface in this app already
 * behaves and is the only version that survives one of them switching.
 *
 * That is free, mechanically — `flColor` is a SELECTOR resolved once at module init, so a card built
 * out of role tokens is already the viewer's card (`foundation.ts`: *"nobody imports a theme, they
 * import `flColor` and get the right one"*). What it costs is judgement: the dark badge on cream, the
 * embers, the heat radial and the contrast lift each need a deliberate Alabaster answer rather than the
 * Forge one at a different opacity. Each is marked below.
 *
 * ⚠ MY EARLIER OBJECTION WAS ABOUT THE MASTERS, AND IT WAS OVERSTATED. Composited on the real Paper
 * plate, the dark bronze hexagon reads as a seal pressed into cream stone — better than predicted. The
 * one real artefact is the badges' alpha cut, which leaves a few light fringe pixels that are invisible
 * on near-black and faintly visible on cream. That is a cut to redo, not a reason to hold the theme.
 *
 * ══ THE GROUND IS THE HOME SCREEN'S OWN PLATE ══
 *
 * `SCREEN_BG.slate` over the same `rgba(5,5,5,0.15)` scrim Home passes, through `ScreenBackground` —
 * so the card is not a lookalike of the app's surface, it is the app's surface. That component already
 * owns the whole theme problem: it swaps to `forge-slate-paper.png`, and `themeScrim` flips the
 * darkening scrim to its lightening twin on Alabaster instead of painting near-black over cream.
 *
 * ⚠ `atmospheric`, NOT THE DEFAULT `functional`. `paper-scrim.ts` assigns the levels by surface —
 * functional is *"lists, feeds, forms"*, atmospheric is *"Chapter headers, Legacy, ceremonies… special
 * achievements."* The card sits in a feed but is not one, and the whole point is that it reads as a
 * different kind of object from the rows around it. Damping its texture to feed strength would spend
 * the one thing it is here to have.
 */

import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { RankSeal } from '@/components/forge/RankSeal';
import { LEDGER_GUTTER } from '@/components/forge/compositions/LedgerPost';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, IS_PAPER } from '@/constants/foundation';
import { resolveRankBadge } from '@/domain/rank-artwork/badge-art';
import { RANK_FAMILIES, type RankFamily } from '@/domain/rank-artwork/resolver';
import { milestoneLabel, type MilestoneCard, type MilestoneRank } from '@/domain/share/milestone-card';

/**
 * The lit square the badge stands on. FIXED, not measured, and that is deliberate: everything inside is
 * drawn in SVG at known coordinates, so there is no percentage resolving against an indefinite parent —
 * the trap that makes an RN `Svg` render nothing at all.
 *
 * ⚠ IT GREW WITH THE BADGE, AND IT HAD TO. The PO asked for a 25% larger emblem; at the old stage of 208
 * a 188px badge overlaps BOTH rings — 5.6px through the inner one at the flats and 3.5px at the points —
 * because the rings are sized off the badge, not off the card. Scaling the stage with it keeps the
 * composition and restores the gaps (10.2px at the flats, 14.8px at the points, 12.5px between rings).
 *
 * ⚠ AND IT RAISED THE SCREEN-WIDTH FLOOR from about 316pt to 358. The card's content box is the screen
 * less 108 (the section's 20, the ledger gutter's 18 and the card's own 16, each side), so 250 fits from
 * a 360pt Android up. Below that the card's `overflow: hidden` clips the outer ring symmetrically, which
 * is a graceful failure rather than a broken layout — but it is the number to check if this grows again.
 */
const STAGE = 250;
/**
 * The two rings, as vertex radii in fractions of the stage — and the badge inside them.
 *
 * PO: *"Line, no filling, Line, no filling, badge."* So the three sizes are set by the two GAPS rather
 * than by the badge: at 188 in a 250 stage the art clears the inner ring by ~10px across the flats and
 * ~15px at the points, and the rings clear each other by ~12px. Sized any closer and the structure reads
 * as a border around the badge instead of two rings it stands inside.
 *
 * ⚠ THE FLATS ARE THE BINDING CONSTRAINT, NOT THE POINTS, and it is the widest family that sets it —
 * Builder at a 0.893 aspect, where every badge is `ART` tall but only some are nearly `ART` wide.
 *
 * ⚠ `OUTER_R` IS CAPPED BY THE STAGE, not by taste. A pointy-top hexagon's vertices are its tallest
 * points, so `OUTER_R` above 0.5 clips against the top and bottom of the 208px square.
 */
const OUTER_R = 0.485;
const INNER_R = 0.435;
/** The design's own artboard draws these at 240×268 — so at 188 the feed is now within a fifth of the
 *  size the badge was designed to be looked at. */
const ART = 188;

/**
 * A contrast adjustment on the raster, and nothing more.
 *
 * ⚠ IT DOES ALMOST NOTHING ON ALABASTER NOW, AND THAT IS THE POINT. This used to carry the whole
 * light-theme problem: the Forge masters were being drawn on cream, so the filter was trying to hold
 * back a badge whose blacks and whites were both wrong for the ground. Alabaster has its own masters
 * since the design’s Paper Mode badge delivery, so the badge already fits the page and the filter is
 * back to what its name says — a touch of separation from the cream, nothing more.
 *
 * ⚠ CAPPED IN BOTH DIRECTIONS, ON PURPOSE. Pushed harder the frame blooms and the centre goes muddy.
 * If Builder I still does not read as a rank emblem at a glance — the PO's original complaint — the
 * answer is a new master, not a bigger number here. Raising this is how a real art problem gets quietly
 * buried under a filter.
 */
const ART_LIFT = IS_PAPER ? 'contrast(1.05)' : 'brightness(1.09) contrast(1.07) saturate(1.1)';

/**
 * The stage's own palette — the few colours drawn INSIDE an SVG, which therefore cannot come from a
 * style sheet.
 *
 * ⚠ CHOSEN PER THEME HERE RATHER THAN FROM `flColor`, and that is not a re-litigation of the rule.
 * These are heat and metal filings on a stone plate — not text, not a border, not a surface, so none of
 * the roles `foundation.*` exports fit. `screen-background.tsx` picks its own `ATMO_RADIAL` and
 * `DEFAULT_BASE` exactly this way, for exactly this reason.
 *
 * ⚠ THE PAPER ALPHAS ARE HIGHER, NOT LOWER — the same counter-intuitive note `constants/backgrounds.ts`
 * carries about its own radials. There is less room between cream and a warm bronze than between
 * near-black and one, so a wash that reads on Forge vanishes on Alabaster.
 *
 * ⚠ AND THE EMBER CHANGES MATERIAL, NOT JUST ALPHA. A flame-orange spark on cream reads as a speck of
 * dirt on the page; a deep bronze fleck reads as metal in the stone. Same idea, inverted material —
 * which is the difference between designing the second theme and dimming the first one.
 */
/**
 * ══ TWO RINGS, NEITHER OF THEM FILLED ══
 *
 * PO: *"The outside ring on the badge I don't like it filled in… It should be the same as the outside
 * one where it doesn't have a filling. So, Line, no filling, Line, no filling, badge."*
 *
 * The inner hexagon used to be a filled dark MOUNT, added so the badge — whose art is lit for a dark
 * ground — would not sit directly on cream. That fixed a real problem in the wrong way: a filled plate
 * inside a card is the nested container this whole component exists to avoid, and it hid the slate
 * texture that is the point of using the home screen's plate at all.
 *
 * So both hexagons are strokes now and the ground shows through everywhere.
 *
 * ⚠ THE FILL WAS HIDING AN ASSET PROBLEM, AND THAT PROBLEM IS NOW FIXED AT THE SOURCE. Removing it
 * exposed what the mount had been covering: the Forge masters are lit for a dark ground, so their
 * near-black frame rails read as stripes on cream and their machined highlights (1,671 opaque pixels
 * around rgb 188,169,147) read as white streaks. Alabaster has its own masters now —
 * `scripts/badges/`, selected in `badge-art.ts` — so there is nothing left for a
 * fill to hide. Two problems, one of them solved in the right layer.
 */
const RING = IS_PAPER
  ? { outer: '#8A6636', inner: '#A47A3D' }
  : { outer: '#BA8654', inner: '#C99767' };

const STAGE_PALETTE = IS_PAPER
  ? {
      heatCore: '#A06A2E',
      heatEdge: '#88683A',
      ember: '#8A6636',
      hexOuter: '#8A6636',
      heatBase: 0.15,
      heatGain: 0.2,
      edgeBase: 0.1,
      edgeGain: 0.12,
      lineGain: 1.6,
      emberGain: 1.3,
    }
  : {
      heatCore: '#E0913F',
      heatEdge: '#BA8654',
      ember: '#E0913F',
      hexOuter: '#BA8654',
      heatBase: 0.1,
      heatGain: 0.16,
      edgeBase: 0.07,
      edgeGain: 0.1,
      lineGain: 1,
      emberGain: 1,
    };

/**
 * The card's frame, per theme.
 *
 * Alabaster's border is stronger because it has to be: a 16%-alpha bronze hairline is a clear edge
 * against near-black and is nearly invisible against cream, and the edge is the entire reason this
 * reads as an object the system issued rather than a patch of texture.
 */
/**
 * The sweep's gradient, per theme.
 *
 * ⚠ IT INVERTS, IT DOES NOT DIM. On Forge the glint is LIGHT crossing a dark plate. On Alabaster a pale
 * glint over cream is invisible at any alpha, so the same gesture becomes a soft bronze SHADOW passing
 * over the stone. The thing that moves is the thing you notice — the direction the ground allows is the
 * only part that changes.
 */
const GLINT = IS_PAPER
  ? (['rgba(138,102,54,0)', 'rgba(120,88,46,0.13)', 'rgba(138,102,54,0)'] as const)
  : (['rgba(224,145,63,0)', 'rgba(240,200,150,0.16)', 'rgba(224,145,63,0)'] as const);

const borderFor = (t: number) =>
  IS_PAPER ? `rgba(164,122,61,${(0.34 + t * 0.24).toFixed(3)})` : `rgba(186,134,84,${(0.16 + t * 0.2).toFixed(3)})`;

/**
 * How ceremonial this family's ascension is, 0 (Foundation) → 1 (Legacy).
 *
 * An unknown family reads as 0 rather than throwing — a build that does not know a family should draw
 * the quietest version of the card, not crash a feed.
 */
function heat(family: RankFamily | undefined): number {
  const i = family ? RANK_FAMILIES.indexOf(family) : -1;
  return i < 0 ? 0 : i / (RANK_FAMILIES.length - 1);
}

/**
 * Embers — FIXED positions, never `Math.random()`.
 *
 * A random scatter re-rolls on every render, so the same post would rearrange itself while you scrolled
 * past it twice. Normalised to the stage; the tail of the list is trimmed off for the quieter families.
 *
 * ⚠ EVERY ONE OF THESE CLEARS THE INNER RING, and they were moved outward to do it. They belong in the
 * stone AROUND the seal rather than on it — an ember over the badge reads as a blemish on the emblem
 * rather than as heat in the ground. That was true when the inner hexagon was a filled mount and it is
 * still true now that it is a line.
 */
const EMBERS: readonly { x: number; y: number; r: number; o: number }[] = [
  { x: 0.097, y: 0.253, r: 1.5, o: 0.55 },
  { x: 0.8564, y: 0.2192, r: 1.2, o: 0.42 },
  { x: 0.918, y: 0.652, r: 1.8, o: 0.5 },
  { x: 0.082, y: 0.632, r: 1.1, o: 0.36 },
  { x: 0.916, y: 0.7184, r: 1.4, o: 0.34 },
  { x: 0.296, y: 0.1328, r: 1.0, o: 0.44 },
  { x: 0.6272, y: 0.0866, r: 1.3, o: 0.3 },
  { x: 0.08, y: 0.44, r: 1.6, o: 0.28 },
  { x: 0.94, y: 0.44, r: 1.0, o: 0.26 },
  { x: 0.4384, y: 0.9466, r: 1.5, o: 0.32 },
  { x: 0.25, y: 0.85, r: 1.1, o: 0.24 },
  { x: 0.78, y: 0.87, r: 1.2, o: 0.22 },
];

/**
 * Which posts have already played their sweep, for this session.
 *
 * ⚠ THE SWEEP IS THE ONE THING I ARGUED AGAINST AND THE PO ASKED FOR TWICE, so it is built — and built
 * so the objection stops being true. Feed rows mount every time they scroll into view, so an unguarded
 * entrance animation replays on every pass and is wallpaper by the third. Keyed by post id, it plays
 * once: the first time you see that ascension, and never again in that session.
 *
 * Module-level rather than in state, because the component instance is exactly what does not survive
 * being scrolled off a list. Bounded in practice by the page size of a feed.
 */
const SWEPT = new Set<string>();

export function MilestoneBand({ card, postId }: { card: MilestoneCard; postId?: string }) {
  const t = heat(card.rank?.family);
  /* ⚠ `useState`, NOT `useRef().current`. The react-compiler lint ERRORS on a ref read during render,
     and this repo runs it strict. A lazy `useState` initialiser is created exactly once for the same
     cost and is not a ref access. */
  const [sweep] = useState(() => new Animated.Value(0));
  const [swept, setSwept] = useState(false);

  // ① Decide whether this post's sweep is owed. Async, because reduced motion is a system query.
  useEffect(() => {
    // A card with no insignia has no stage to sweep across, and a post already seen keeps its stillness.
    if (!card.rank || !postId || SWEPT.has(postId)) return undefined;
    let alive = true;
    /* Reduced motion is honoured rather than assumed off. The card is complete without the sweep —
       nothing is communicated by it that the static composition does not already say. */
    AccessibilityInfo.isReduceMotionEnabled().then(
      (reduced) => {
        if (!alive || reduced) return;
        SWEPT.add(postId);
        setSwept(true);
      },
      () => {
        // A device that will not answer gets the still card. Never the other way round.
      },
    );
    return () => {
      alive = false;
    };
  }, [card.rank, postId]);

  /* ② Run it, in its own effect, AFTER the view it drives has mounted. Starting the timing in the same
     tick as `setSwept` would begin the clock before the Animated.View existed, and the opening frames —
     the only ones anybody sees on a 1.1s glint — would be dropped. */
  useEffect(() => {
    if (!swept) return;
    Animated.timing(sweep, {
      toValue: 1,
      duration: 1150,
      delay: 140,
      /* ⚠ EASING ON THE TIMING, NOT INSIDE `interpolate` — an `easing` passed to `interpolate` is
         silently dropped under the native driver, which is exactly how an animation ships looking
         linear and nobody can see why. */
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [swept, sweep]);

  return (
    <View
      style={[styles.card, { borderColor: borderFor(t) }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={milestoneLabel(card)}
    >
      {/*
        The home screen's own ground, not an imitation of it — `SCREEN_BG.slate` under the same
        `rgba(5,5,5,0.15)` scrim Home passes. `ScreenBackground` owns both themes already: it selects
        `forge-slate-paper.png` on Alabaster and `themeScrim` flips the darkening scrim to its
        lightening twin rather than painting near-black over cream.

        `atmospheric` because `paper-scrim.ts` assigns that level to *"ceremonies… special
        achievements"* — the card sits in a feed but is not one, and damping it to feed strength would
        spend the only thing it is here to have.
      */}
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} paperTexture="atmospheric" />

      {/* ── ④ the label. Small, and it stays small: it names the kind of post, it is not the post. ── */}
      <View style={styles.eyebrowRow}>
        <Diamond />
        {/* "Rank Ascended", not "Rank Ascension" — the ceremony modal and the share card both already
            say Ascended, and one thing carrying two names across three surfaces is how wording drifts. */}
        <Text style={styles.eyebrow}>{card.eyebrow.toUpperCase()}</Text>
      </View>

      {card.rank ? (
        <>
          {/* ── ③ where this came from. ABOVE the hero and pointing down at it, so the eye travels the
                 transition in the order it happened. Omitted whole when there is no previous rank. ── */}
          {card.previous ? (
            <View style={styles.from}>
              <Text style={styles.fromLabel} numberOfLines={2}>
                {card.previous.label}
              </Text>
              <Descend opacity={0.55 + t * 0.3} />
            </View>
          ) : null}

          {/* ── ① the hero, on its stage ── */}
          <View style={styles.stage}>
            <Svg width={STAGE} height={STAGE} style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id="mb-heat" cx="50%" cy="47%" rx="54%" ry="54%">
                  <Stop offset="0" stopColor={STAGE_PALETTE.heatCore} stopOpacity={STAGE_PALETTE.heatBase + t * STAGE_PALETTE.heatGain} />
                  <Stop offset="0.45" stopColor={STAGE_PALETTE.heatEdge} stopOpacity={STAGE_PALETTE.edgeBase + t * STAGE_PALETTE.edgeGain} />
                  <Stop offset="1" stopColor={STAGE_PALETTE.heatEdge} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x={0} y={0} width={STAGE} height={STAGE} fill="url(#mb-heat)" />

              {/* ── line · gap · line · gap · badge ──

                  The badge's own silhouette echoed twice outside it, both unfilled, so the slate reads
                  straight through to the emblem. The dashed circle that used to sit between them is
                  gone: at radius 0.47 it crossed outside the hexagon at the flats and inside at the
                  points, so it interleaved with the very structure it was decorating. */}
              <Polygon points={hexPoints(STAGE / 2, STAGE / 2, STAGE * OUTER_R)} fill="none" stroke={RING.outer} strokeWidth={0.75} opacity={(0.1 + t * 0.16) * STAGE_PALETTE.lineGain} />
              <Polygon points={hexPoints(STAGE / 2, STAGE / 2, STAGE * INNER_R)} fill="none" stroke={RING.inner} strokeWidth={1} opacity={(0.14 + t * 0.2) * STAGE_PALETTE.lineGain} />

              {/* Embers. Four at Foundation, all twelve at Legacy. */}
              {EMBERS.slice(0, 4 + Math.round(t * (EMBERS.length - 4))).map((e, i) => (
                <Circle key={i} cx={e.x * STAGE} cy={e.y * STAGE} r={e.r} fill={STAGE_PALETTE.ember} opacity={e.o * (0.4 + t * 0.6) * STAGE_PALETTE.emberGain} />
              ))}
            </Svg>

            <View style={styles.art}>
              <Seal rank={card.rank} size={ART} />
            </View>

            {/* The sweep. A single bronze glint crossing the stage once, clipped to it. */}
            {swept ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sweep,
                  {
                    opacity: sweep.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                    transform: [
                      { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-STAGE * 0.8, STAGE * 0.9] }) },
                      { rotate: '14deg' },
                    ],
                  },
                ]}
              >
                {/* ⚠ THE GLINT INVERTS. On Forge it is light passing over a dark plate. On Alabaster a
                    light glint over cream is invisible, so the same gesture becomes a soft bronze shadow
                    sweeping the stone — the moving thing you notice, in the direction the ground allows. */}
                <LinearGradient
                  colors={GLINT}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            ) : null}
          </View>
        </>
      ) : null}

      {/* ── ② the rank ── */}
      <Text style={[styles.headline, card.rank ? null : styles.headlineTypographic]} numberOfLines={2}>
        {card.headline.toUpperCase()}
      </Text>

      {/*
        ── ⑤ the rank's own words ──

        Set in the app's display face and in quotation marks, because it is a QUOTATION: RSA §2.2 defines
        these as *"self-descriptions the athlete should be able to say honestly when they reach the
        rank"*, so it is the athlete's sentence, not a caption the feed wrote about them.

        ⚠ IT IS PER FAMILY, NOT PER SUB-TIER, AND THAT IS LOCKED. The PO's iteration-2 note proposes a
        different phrase for each of Builder I–IV. RSA §13.1: *"Sub-tiers are NOT separate identities.
        Foundation · I and Foundation · IV share the identity 'I've started.' The progression from I to
        IV represents increasing depth of that identity — not a transition to a new one."* Writing four
        variants contradicts that clause and invents meaning the rank system explicitly says is not
        there. It is a good idea that needs an amendment first, not a code change — see `rank/identity.ts`.
      */}
      {card.line ? (
        <Text style={styles.line} numberOfLines={3}>
          {`“${card.line}”`}
        </Text>
      ) : null}

      {/* The date, quieted right down and put below a rule. PO: *"The accomplishment shouldn't need the
          date to give it importance."* It was previously large enough to read as part of the artwork. */}
      <View style={styles.rule} />
      <Text style={styles.date}>{card.date}</Text>
    </View>
  );
}

/** The six vertices of a pointy-top hexagon — the badge's own shape. */
function hexPoints(cx: number, cy: number, r: number): string {
  const w = r * 0.866;
  return [
    [cx, cy - r],
    [cx + w, cy - r / 2],
    [cx + w, cy + r / 2],
    [cx, cy + r],
    [cx - w, cy + r / 2],
    [cx - w, cy - r / 2],
  ]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

/**
 * One seal. The raster badge when the family has one — which is all seven — and the vector `RankSeal`
 * as the defensive null arm `resolveRankBadge` documents itself for.
 *
 * Exactly the resolution the M-1 ceremony does, `sex` included, so the badge in the feed and the badge
 * at the ceremony can never disagree about the same ascension.
 *
 * ⚠ THE BOX IS SQUARE, THE ART IS NOT. The masters are portrait — 445×540 for Foundation, 482×540 for
 * Builder — and the seven families do not share one ratio, so `contain` inside a square box is the only
 * rule that is correct for all of them. Each simply letterboxes itself.
 */
function Seal({ rank, size }: { rank: MilestoneRank; size: number }) {
  const art = resolveRankBadge({ family: rank.family, level: rank.level, sex: rank.sex });
  if (art == null) return <RankSeal family={rank.family} level={rank.level} size={size} />;
  /* The lift goes on a wrapping View: `filter` is a view style, and expo-image's `ImageStyle` does not
     accept it. Same pixels, and it keeps the cast out of the file. */
  return (
    <View style={{ filter: ART_LIFT }}>
      <Image source={art} style={{ width: size, height: size }} contentFit="contain" />
    </View>
  );
}

/** The eyebrow's diamond — the ◆ the design uses as its milestone tick. */
function Diamond() {
  return (
    <Svg width={7.5} height={7.5} viewBox="0 0 10 10">
      <Path d="M5 0.6 9.4 5 5 9.4 0.6 5Z" fill="none" stroke={flColor.bronzeInk} strokeWidth={1.5} />
    </Svg>
  );
}

/** The line that drops from the rank left behind to the one earned. Vertical, because the eye reads the
 *  transition top-to-bottom here rather than left-to-right. */
function Descend({ opacity }: { opacity: number }) {
  return (
    <Svg width={12} height={26} viewBox="0 0 12 26" style={styles.descend}>
      <Path d="M6 0 V19" stroke={flColor.bronze400} strokeWidth={1} strokeLinecap="round" opacity={opacity * 0.8} />
      <Path d="M2.6 15.4 6 19.2 9.4 15.4" fill="none" stroke={flColor.bronzeInk} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  /*
   * An inset object, not a bleed. Aligned to `LEDGER_GUTTER` so its edges sit on the same column as the
   * post's own copy — which is what makes it read as issued rather than pasted in.
   *
   * ⚠ THE SCREENS MUST PASS `bleed={0}` FOR A MILESTONE POST. `LedgerPost` applies `-bleed` to every
   * custom band to pull photographic content to the card edge; left at 20 it would drag this object's
   * border out past the copy it is meant to align with.
   */
  card: {
    position: 'relative',
    marginTop: 16,
    marginHorizontal: LEDGER_GUTTER,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    paddingTop: 15,
    paddingBottom: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  /* `bronzeInk`, not `bronze400`: it is the palette's TEXT-safe bronze in both themes — 4.51:1 on
     Alabaster's base, where `bronze400` measures 3.40:1 and sits under the bar. */
  eyebrow: { fontSize: 8.5, fontWeight: '700', letterSpacing: 2.4, color: flColor.bronzeInk },

  from: { alignItems: 'center', marginTop: 14 },
  /* ⚠ SECONDARY, NOT TERTIARY. This was `gray600` — Alabaster's #8B8377, which measures about 2.9:1 on
     the cream plate for a 9.5px uppercase label. It names the rank the athlete came from; it is the one
     piece of the transition a reader cannot get from the picture, so it has to be readable. `gray400`
     (#6E6860 on Paper, #9E9890 on Forge) clears the bar in both. */
  fromLabel: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 1.9,
    textTransform: 'uppercase',
    color: flColor.gray400,
    textAlign: 'center',
  },
  descend: { marginTop: 3 },

  stage: { width: STAGE, height: STAGE, marginTop: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  art: { alignItems: 'center', justifyContent: 'center' },
  sweep: { position: 'absolute', top: -STAGE * 0.25, bottom: -STAGE * 0.25, width: STAGE * 0.42 },

  headline: {
    marginTop: 6,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    /* The palette's PRIMARY TEXT role. On Forge that is cream on near-black; on Alabaster `cream100` is
       #28231D — the darkest value in the file, and a role rather than a colour name. */
    color: flColor.cream100,
  },
  /* No seal to lead with, so the type carries the whole card — the Share Card Renderer's
     "typographic-first" principle, and the reason an honor post is not given invented artwork. */
  headlineTypographic: { marginTop: 20, fontSize: 22, letterSpacing: 2.6 },

  line: {
    marginTop: 10,
    fontFamily: flFont.displayMedium,
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    color: flColor.gray400,
  },

  rule: { width: 54, height: StyleSheet.hairlineWidth, backgroundColor: flColor.bronzeBorder, marginTop: 16 },
  date: {
    marginTop: 10,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.gray600,
    /* ⚠ THE SOFTENING IS FORGE-ONLY. `gray600` is already the muted role in both palettes; knocking a
       further 25% off it on cream took a 9px date to roughly 2.2:1 and it stopped being readable at
       arm's length. Alabaster takes the token as it stands. */
    opacity: IS_PAPER ? 1 : 0.75,
  },
});
