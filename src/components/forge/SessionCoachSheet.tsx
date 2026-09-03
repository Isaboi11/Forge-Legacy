import { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Image } from 'expo-image';

import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { themeScrim } from '@/constants/theme-scrim';
import { HoltMark } from '@/components/forge/HoltMark';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { INTENSITY_LEVELS, type IntensityLevel } from '@/domain/coach/rulebook/intensity';
import type { IntensityProposal } from '@/domain/coach/intensity-learning';
import type { SuggestionGroup } from '@/domain/coach/session-suggest';

/**
 * Coach Holt, mid-set.
 *
 * ══ THE SAME HOLT AS THE HOME SCREEN, DELIBERATELY ══
 *
 * ⚠ THE FIRST VERSION WAS A GENERIC BOTTOM SHEET WITH ICON ROWS, and the PO's note was that it has to
 * look and feel like the coach on Home. That is not a polish request — it is the whole premise of the
 * character. A coach who presents as one thing on Home and another mid-workout is two features wearing
 * the same name, and the athlete has to learn each surface separately.
 *
 * So the shell is `CoachChatSheet`'s, element for element: the 24px top corners over a bronze-lit top
 * edge with the inset warm highlight, the grab handle, the header of mark + `HOLT` + a status line, and
 * decisions offered as bronze-edged pill CHIPS rather than as a menu of rows.
 *
 * ══ THE ONE DIFFERENCE, AND WHY ══
 *
 * Home's sheet pins to `top: 64` so it always fills the screen — right there, because the conversation
 * IS the task. Here the task is the set in front of you, and the sheet sizes to its content so the
 * exercise card stays visible behind it. Same sheet, less of it.
 *
 * ══ CHIPS, NOT A TEXT BOX ══
 *
 * One hand, possibly chalked, between sets. Every answer is a tap. Holt's standing instruction is to
 * stop asking people to type, and mid-workout is the strongest case for it in the app.
 *
 * ══ WHAT IT REFUSES TO DO ══
 *
 * · It never speaks unless tapped — no teaser on this screen. Mid-set, an unprompted line is an
 *   interruption of a working set.
 * · It never grades a set. The weight chips are instructions for the sets to come; nothing here reports
 *   how the last one went (W9-Amendment-005 D-3 lifted §6.2's ban for *coaching*, not for scoring).
 * · It offers no weight chip it cannot name a real number for — see `lighterTo` / `heavierTo`.
 */
/**
 * One word each, because this row is read between sets. The sentences live on `/preferences`, where
 * there is room for them and where nobody is holding a bar.
 */
const INTENSITY_CHIP: Record<IntensityLevel, string> = {
  reminders: 'Cues only',
  steady: 'Steady',
  push: 'Push me',
  drive: 'Drive me',
};

/**
 * A glyph per level, and the ONLY icons in the sheet.
 *
 * ⚠ THE PLAIN ROWS DELIBERATELY HAVE NONE (PO: *"don't add icons beside every row… icons would start
 * adding visual noise again. Keep the chevrons. Keep the typography. Let the hierarchy do the work."*).
 * These four earn theirs because the row is a SCALE — quiet to loud, left to right — and the glyphs
 * climb with it where four similar two-word labels do not. Same reason the balance row keeps its
 * scales: an icon is allowed where it carries meaning the text cannot.
 */
const INTENSITY_ICON: Record<IntensityLevel, React.ReactNode> = {
  reminders: (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 14a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
    </Svg>
  ),
  steady: (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 12c2.5-5 4.5-5 7 0s4.5 5 7 0" />
    </Svg>
  ),
  push: (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.emberFlame} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.4.6-2.6 1.6-3.8.7 1 1.4 1.5 2.1 1.5C10.4 8 11 5.6 12 3z" />
    </Svg>
  ),
  drive: (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.emberFlame} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L5 13h6l-1 9 8-11h-6z" />
    </Svg>
  ),
};


export function SessionCoachSheet({
  onClose,
  exerciseName,
  message,
  basis,
  unit,
  weight,
  reps,
  onUseWeight,
  artwork,
  lighterTo,
  heavierTo,
  onSetLoad,
  canSuperset,
  isSuperset,
  supersetWithName,
  onSwap,
  onSuperset,
  onBreakSuperset,
  onAdd,
  onSkip,
  onRemove,
  canRemove,
  swapPicks,
  addPicks,
  onPick,
  intensity,
  onSetIntensity,
  proposal,
  onAcceptProposal,
  onDismissProposal,
}: {
  onClose: () => void;
  exerciseName: string;
  /**
   * Holt's reasoning, one sentence. Lives behind "Why this weight?" rather than above the fold —
   * it restates the number the card already shows in 38pt, and reading it every visit is the tax the
   * old layout charged.
   */
  message: string | null;
  /** The evidence: "You completed 45 lb × 8, 8, 8 last time." Shown, never hidden. */
  basis: string | null;
  unit: string;
  /**
   * ⭐ THE NUMBER HOLT IS RECOMMENDING — his `suggestedWeight` when he has one, otherwise the bar as it
   * is. Null on a lift that names no weight at all (a run, a plank), which removes the card entirely.
   *
   * ⚠ `lighterTo` / `heavierTo` ARE DERIVED FROM THIS SAME NUMBER upstream, and they have to be. The
   * card states it in 38pt and the two pills read as corrections to it, so a pill computed from a
   * different anchor produces the defect this design was drafted with: 50 stated, 47.5 offered as "too
   * easy" — tapping up moving you down. `weight-bracket.test.mjs` is the guard.
   */
  weight: number | null;
  /** The rep target beside it — "50 LB × 8". Null when the prescription names no reps. */
  reps: number | null;
  /**
   * Accept the recommendation in one tap, or null when there is nothing to accept.
   *
   * ⚠ NULL IS THE COMMON ANSWER AND MUST STAY MEANINGFUL. `/workout` passes a function only when the
   * recommended weight differs from what the sets already carry; rendering the button unconditionally
   * would make the most prominent control in the sheet a no-op most of the time.
   */
  onUseWeight: (() => void) | null;
  /** The engraved family figure for this lift, resolved through the artwork manifest. */
  artwork: number | undefined;
  lighterTo: number | null;
  heavierTo: number | null;
  onSetLoad: (to: number) => void;
  /**
   * How hard Holt is pushing right now, and how to change it.
   *
   * ⚠ THIS MATTERS MORE THAN THE SETTINGS SCREEN. The moment an athlete notices the dial is wrong is
   * the moment he says something they did not want, and that moment is in a gym with one hand free —
   * not in Account Settings two days later. Same value, same store; this is just the door that is
   * actually near the problem.
   */
  intensity: IntensityLevel;
  onSetIntensity: (level: IntensityLevel) => void;
  /**
   * What the recent record suggests, or null — which is the common answer.
   *
   * ⚠ SHOWN ONLY HERE, IN A SHEET THE ATHLETE TAPPED. This file's own rule is that Holt never speaks
   * unprompted, and a question about coaching style arriving unbidden between sets is precisely the
   * interruption the intensity dial exists to give people control over.
   */
  proposal: IntensityProposal | null;
  onAcceptProposal: () => void;
  onDismissProposal: () => void;
  canSuperset: boolean;
  isSuperset: boolean;
  supersetWithName: string | null;
  onSwap: () => void;
  onSuperset: () => void;
  onBreakSuperset: () => void;
  onAdd: () => void;
  onSkip: () => void;
  /**
   * Take this exercise OUT of the session — not the same thing as `onSkip`, and the difference is the
   * whole reason it is a second row. Skipping leaves the lift in the plan and in the record; removing
   * says today's session does not contain it. The screen owns the guards and the confirmation.
   */
  onRemove: () => void;
  /** False when this is the last exercise standing — an empty session has no way out. */
  canRemove: boolean;
  /**
   * What Holt would put here instead — the authored relationship graph, filtered to the catalogue the
   * athlete can actually reach. Null when he has nothing worth naming.
   */
  swapPicks: SuggestionGroup | null;
  /** The gap in today's session, and the movements that fill it. Null when there is no gap. */
  addPicks: SuggestionGroup | null;
  /**
   * Apply a named suggestion. `mode` decides whether it REPLACES the current lift or is appended.
   *
   * ⚠ ONE CALLBACK, NOT TWO, because the two lists are the same gesture from the athlete's side:
   * "put this in my workout". The screen owns the difference between replacing and appending, which is
   * where the session lives.
   */
  onPick: (mode: 'swap' | 'add', key: string, name: string) => void;
}) {
  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };

  /**
   * Holt's reasoning, opened deliberately.
   *
   * ⚠ NOT PERSISTED, AND THAT IS THE POINT. "Why this weight?" is a question about THIS set; a sheet
   * that remembered you once asked it would answer a question nobody repeated, and the paragraph would
   * be back above the fold on every visit — which is the thing this pass removed.
   */
  const [whyOpen, setWhyOpen] = useState(false);
  /**
   * The workout-balance suggestion, closed until asked for.
   *
   * ⚠ CLOSED IS THE CORRECT DEFAULT even though the intelligence is good. An athlete adjusting a
   * triceps movement should not be shown three rows of rows; naming the gap in one line is the whole
   * message, and the movements that fill it are the answer to a question they have not asked yet.
   */
  const [balanceOpen, setBalanceOpen] = useState(false);
  /* The card is built around a NUMBER. With no load to name — a run, a plank, a set to failure — there
     is no card to build, and Holt's line falls back to plain text at the left margin, as it was. */
  const hasCard = weight != null;

  /*
   * ══ THE GRABBER GRABS HERE TOO ══
   *
   * PO (2026-08-28): *"The line at the top in the middle is an indicator that you can drag that page
   * down and gone. But the only way to get out right now is with the x."* This sheet drew the handle
   * and had no gesture behind it — the shared `BottomSheet` composite got one on 2026-08-25 and this
   * one, which rolls its own overlay, was missed. Same hook, same distance, same fling.
   *
   * ⚠ THE PAN COVERS THE GRABBER AND THE WHOLE HEADER (mark, name, status) — a 4px bar is a picture,
   *   not a target. The close × inside it still works: a responder only claims a MOVE, never a tap.
   *   The body below is a ScrollView and stays out of it, for the reason `useSheetDrag` gives.
   */
  const drag = useSheetDrag({ onClose });

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View onLayout={drag.onLayout} style={[styles.sheet, drag.style]}>
        <View {...drag.panHandlers}>
        <View style={styles.grabWrap}>
          <View style={styles.grab} />
        </View>

        {/* Home's header, unchanged: the mark, the name in wide bronze caps, and a status line that says
            what he is looking at rather than a greeting. */}
        <View style={styles.header}>
          <View style={styles.mark}>
            <HoltMark size={34} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>HOLT</Text>
            <Text style={styles.headerStatus} numberOfLines={1}>
              {exerciseName}
            </Text>
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round">
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
        </View>
        </View>

        <ScrollView style={styles.thread} contentContainerStyle={styles.threadInner} showsVerticalScrollIndicator={false}>
          {/*
            ══ 1 · THE ADAPTATION, WHEN THERE IS ONE — AND IT SITS ABOVE THE CARD ══

            ⚠ FIRST, BECAUSE IT EXPLAINS WHY THE CARD BELOW SAYS WHAT IT SAYS. It used to render at the
            bottom, under every chip in the sheet, where an athlete who had just been eased down would
            read the new number first and the reason for it last — if they scrolled.

            ⚠ THE ASYMMETRY IS THE DESIGN (CL-D3). An UP proposal is an OFFER — a coach that quietly
            gets louder leaves the athlete experiencing a pushier app with no name for what changed. A
            DOWN has already applied itself and this is the notice plus the undo, because easing off is
            the direction `progression.ts` already prefers and asking permission to be gentler is its
            own small unkindness.

            ⚠ THE SENTENCE IS SHOWN, NEVER COLLAPSED (CL-D2). "Why this weight?" hides Holt's routine
            reasoning one card down; it may never hide THIS one. An adaptation you cannot see the reason
            for is indistinguishable from a bug, and that clause is locked.
          */}
          {proposal ? (
            <View style={styles.notice}>
              <Text style={styles.noticeLabel}>{proposal.direction === 'up' ? 'A THOUGHT' : 'EASING OFF'}</Text>
              <Text style={styles.holtText}>{proposal.sentence}</Text>
              <View style={styles.chipRow}>
                {proposal.direction === 'up' ? (
                  <>
                    <Chip label="Push me harder" on onPress={onAcceptProposal} />
                    <Chip label="I'm good" onPress={onDismissProposal} />
                  </>
                ) : (
                  <Chip label="Keep pushing me" onPress={onDismissProposal} />
                )}
              </View>
            </View>
          ) : null}

          {/*
            ══ 2 · THE STATEMENT. TREATMENT ONE OF THREE. ══

            PO: *"it feels really busy… every function is being presented at the same visual level."*
            That was literally true — every group in this sheet was a label over a row of identical
            pills, so the coach's actual recommendation had exactly the weight of "Move past this".

            ⚠ IT STATES, IT DOES NOT ASK. There is no "Use 65 lb" button here and there must not be:
            `currentLoad` IS the prescription — the weight the set is already carrying — so a button
            confirming it would be the most prominent control in the sheet and would do nothing. The
            number, the verdict and the evidence do the coaching; the two pills below are the only
            actions, and they are corrections TO this, which is what makes it read as a coach's call
            rather than as one option among several.
          */}
          {hasCard ? (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>HOLT RECOMMENDS</Text>
              <View style={styles.card}>
                {/* ⚠ BEHIND THE TEXT, AND CLIPPED BY THE CARD'S OWN RADIUS. `pointerEvents="none"` so it
                    cannot eat the tap meant for "Use" — an image that swallows a button is the exact
                    bug an absolutely-positioned decoration invites. */}
                {artwork ? (
                  <Image source={artwork} style={styles.cardArt} contentFit="cover" pointerEvents="none" />
                ) : null}
                <View style={styles.cardTop}>
                  <Text style={styles.cardNumber}>{weight}</Text>
                  <Text style={styles.cardUnit}>{unit.toUpperCase()}</Text>
                  {reps != null ? <Text style={styles.cardReps}>&times; {reps}</Text> : null}
                </View>
                {basis ? <Text style={styles.cardBasis}>{basis}</Text> : null}

                {/* The card's own footer, under a hairline: the question on the left, the accept on the
                    right. Both are optional and the rule differs — see each. */}
                {message || onUseWeight ? (
                  <View style={styles.cardFoot}>
                    {message ? (
                      <Pressable
                        onPress={() => setWhyOpen((v) => !v)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: whyOpen }}
                        accessibilityLabel={`Why ${weight} ${unit}?`}
                        hitSlop={8}
                        style={styles.whyRow}
                      >
                        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round">
                          <Circle cx={12} cy={12} r={9} />
                          <Path d="M12 11v5" />
                          <Path d="M12 7.6v.6" />
                        </Svg>
                        <Text style={styles.whyText}>
                          Why {weight} {unit}?
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.grow} />
                    )}
                    {onUseWeight ? (
                      <Pressable
                        onPress={run(onUseWeight)}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${weight} ${unit}`}
                        style={({ pressed }) => [styles.use, pressed && styles.usePressed]}
                      >
                        <Text style={styles.useText}>
                          Use {weight} {unit}
                        </Text>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.cream100} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M5 12h13" />
                          <Path d="M13 6l6 6-6 6" />
                        </Svg>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {whyOpen && message ? <Text style={styles.why}>{message}</Text> : null}
              </View>
            </View>
          ) : (
            <>
              {/* No number to build a card around. Holt's line at the left margin, as Home gives it. */}
              {message ? <Text style={styles.holtText}>{message}</Text> : null}
              {basis ? <Text style={styles.basis}>{basis}</Text> : null}
            </>
          )}

          {/*
            ══ 3 · PILLS. TREATMENT TWO — kept for the one shape they suit. ══

            A small closed set of alternatives to what Holt just said. Every weight chip names the number
            it will put on the bar: "Lighter" alone asks the athlete to trust an amount they cannot see,
            and the amount is the entire question.
          */}
          {lighterTo != null || heavierTo != null ? (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>IF I HAVE IT WRONG</Text>
              <View style={styles.chipRow}>
                {lighterTo != null ? (
                  <Chip label={`Too heavy — ${lighterTo} ${unit}`} onPress={run(() => onSetLoad(lighterTo))} />
                ) : null}
                {heavierTo != null ? (
                  <Chip label={`Too easy — ${heavierTo} ${unit}`} onPress={run(() => onSetLoad(heavierTo))} />
                ) : null}
              </View>
            </View>
          ) : null}

          {/*
            ══ 4 · ROWS. TREATMENT THREE — and where most of the noise went. ══

            PO: *"you currently have pills inside pills inside sections of pills. Because every item has
            a border, every item demands attention."* A named movement is not a decision waiting to be
            weighed against three others; it is one thing to apply. A hairline under it is enough.

            ⚠ THE HEADING IS STATIC, AND THIS REVERSES AN EARLIER DECISION IN THIS FILE. It used to
            render `swapPicks.reason` — "Instead of Alternating Dumbbell Curl" — on the theory that
            Holt's own words beat a label. On screen it read as long and robotic, and the context was
            already unmissable: the sheet's own header names the exercise two inches above. `reason` is
            still what `session-suggest` returns and still what the balance row below shows, where it
            carries information the header does not.

            ⚠ STILL ONE TAP. These stayed at the top level rather than moving behind a disclosure: the
            value of a named suggestion is applying it standing at a rack with one hand free, and a tap
            spent opening a list is the tap that made the Exercise Picker the wrong answer.
          */}
          {swapPicks ? (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>SWAP MOVEMENT</Text>
              <View style={styles.rows}>
                {swapPicks.picks.map((p) => (
                  <Row key={p.key} label={p.name} onPress={run(() => onPick('swap', p.key, p.name))} />
                ))}
                <Row label="See all alternatives" accent onPress={run(onSwap)} />
              </View>
            </View>
          ) : null}

          {/*
            ══ 5 · THE BALANCE SUGGESTION, COLLAPSED ══

            PO: *"I like this feature. I don't like it being permanently exposed here… a user trying to
            adjust a triceps exercise suddenly sees Band Seated Row, Band Upright Row, Barbell
            Bent-Over Row. That's cognitively jarring."*

            So the gap is NAMED in one line and the movements that fill it wait behind it. The line is
            the message; the list is the answer to a question the athlete has not asked yet.

            ⚠ IT RENDERS ONLY WHEN THERE IS A GAP. `session-suggest.ts` returns null rather than an
            empty list precisely so this can be a truthful check — an "everything is covered" row would
            be a row that exists to say nothing.
          */}
          {addPicks ? (
            <View style={styles.balanceWrap}>
              {/* ⚠ THE ONE GREEN THING IN THE SHEET, and it is green because it is the only line here
                  that is an OBSERVATION rather than an instruction. Bronze is what Holt says to do;
                  this is what he noticed. `greenMuted` at 7% — a tint, not a status banner. */}
              <Pressable
                onPress={() => setBalanceOpen((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: balanceOpen }}
                accessibilityLabel={`Balance today's workout. ${addPicks.reason}`}
                style={({ pressed }) => [styles.balance, pressed && styles.rowPressed]}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.greenMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 4v16" />
                  <Path d="M7 8h10" />
                  <Path d="M7 8l-3 6h6z" />
                  <Path d="M17 8l3 6h-6z" />
                </Svg>
                <View style={styles.grow}>
                  <Text style={styles.rowLabel}>Balance today&rsquo;s workout</Text>
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {addPicks.reason}
                  </Text>
                </View>
                <Svg
                  width={17}
                  height={17}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={flColor.gray600}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={balanceOpen ? styles.chevOpen : undefined}
                >
                  <Path d="M9 5l7 7-7 7" />
                </Svg>
              </Pressable>
              {balanceOpen ? (
                <View style={styles.balanceOpen}>
                  {addPicks.picks.map((p, i) => (
                    <Row
                      key={p.key}
                      label={p.name}
                      last={i === addPicks.picks.length - 1}
                      onPress={run(() => onPick('add', p.key, p.name))}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/*
            ══ 6 · CHANGE THE PLAN ══

            PO: *"'Adjust today' isn't quite the right category… 'Change the plan' sounds more like
            you're talking to a coach rather than operating workout software."*

            ⚠ THE CONTAINER IS THE THIRD ZONE, AND IT IS DOING REAL WORK. The sheet now reads as what
            Holt THINKS (the tinted card, the tinted observation), what this EXERCISE could be (bare
            rows, no container), and what you can do to the WORKOUT (these, boxed). Same row component
            throughout; the enclosure is what says these are utilities rather than coaching.

            ⚠ EVERY ROW HERE IS CONDITIONAL EXCEPT THREE. The superset row has three states — offer it,
            offer to break it, or say nothing — and the escape reads "Can't do this one" when Holt had
            no alternatives to name and "Something else…" when he did, because in the second case the
            athlete has already been given answers and this is the way past them.

            ⚠ AND THE THIRD SUPERSET STATE — SAYING NOTHING — IS ONLY CORRECT ON THE LAST EXERCISE.
            `canSuperset` is `!isLastEx` at the call site, because a superset is formed with the NEXT
            exercise and the last one has no next. That is a real constraint, not a gap: if an athlete
            reports the option missing and they were on the final lift, this is why.
          */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>CHANGE THE PLAN</Text>
            <View style={styles.planBox}>
              {swapPicks ? null : <Row label="Can't do this one" onPress={run(onSwap)} />}
              {swapPicks ? <Row label="Something else…" onPress={run(onSwap)} /> : null}
              {/*
                ⚠ IT SAYS "SUPERSET". IT USED TO SAY "SHORT ON TIME".
                PO: *"I'd add it in the holt chat and make it obvious super sets."*

                The row was named after the REASON you might want one rather than the thing itself, and
                an athlete looking for supersets scanned straight past it — the feature read as missing
                when it had been here the whole time. The reason still earns its place, but in the
                sub-line, under the name.

                The pair is deliberately symmetrical: whichever state you are in, the word "superset" is
                on screen, so the way out is as findable as the way in.
              */}
              {isSuperset ? (
                <Row label="Break the superset" sub="Back to one at a time, with rest between" onPress={run(onBreakSuperset)} />
              ) : canSuperset && supersetWithName ? (
                <Row
                  label={`Superset with ${supersetWithName}`}
                  sub="Back to back, no rest between — good when you're short on time"
                  onPress={run(onSuperset)}
                />
              ) : null}
              <Row label="Add a movement" onPress={run(onAdd)} />
              {/* `last` follows whichever of the two actually ends the box — the hairline would otherwise
                  double the enclosure's own border on a session with one exercise left. */}
              <Row label="Move past this" sub="Keep it in the session, come back to it" last={!canRemove} onPress={run(onSkip)} />
              {/*
                ⚠ TWO ROWS THAT SOUND ALIKE AND ARE NOT, so both now say which is which. "Move past this"
                leaves the lift in the plan and in the finished record — the honest note that it was
                prescribed and not reached. "Take it out" says the session does not contain it. Sitting
                unlabelled next to each other, the pair was the kind of choice you get wrong once and
                cannot undo, so each carries the consequence in its sub-line.

                Hidden rather than disabled on the last exercise: a greyed row invites a tap and answers
                with a refusal. See `canRemove` at the call site.
              */}
              {canRemove ? <Row label="Take it out" sub="Remove it from today’s session" last onPress={run(onRemove)} /> : null}
            </View>
          </View>

          {/*
            HOW HARD HE PUSHES — the same dial as Preferences, put where it gets noticed. Pills, because
            it is a scale with four positions and the current one has to be visible.

            ⚠ IT DOES NOT CLOSE THE SHEET. Every other control here is an action on the workout and
            leaving is the right ending for those; this one is a correction to the thing the athlete is
            reading, and closing on it would hide whether it worked. Tapping again moves it again.
          */}
          <View style={styles.group}>
            <Text style={styles.groupLabel}>HOW HARD I PUSH</Text>
            <View style={styles.chipRow}>
              {INTENSITY_LEVELS.map((level) => (
                <Chip
                  key={level}
                  label={INTENSITY_CHIP[level]}
                  icon={INTENSITY_ICON[level]}
                  on={intensity === level}
                  onPress={() => onSetIntensity(level)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/**
 * Treatment three: a row.
 *
 * ⚠ THE POINT IS WHAT IT DOES NOT HAVE. No border, no fill, no pill — a hairline underneath and a
 * chevron, and that is the whole difference between a sheet that reads as a coach and one that reads as
 * a settings panel. A `Chip` says "weigh me against my neighbours"; a row says "this is one thing you
 * can do", which is true of every movement name and every action in this sheet.
 *
 * ⚠ 56pt MINIMUM, NOT 44. The chips are 44 because they sit in pairs with space around them; these
 * stack directly against each other with a 1px divider, so the extra 12 is what keeps a thumb from
 * hitting the row above the one it aimed at. This is a gym screen.
 */
function Row({
  label,
  sub,
  accent,
  inset,
  expanded,
  last,
  onPress,
}: {
  label: string;
  sub?: string;
  /** Bronze rather than cream — the way OUT of a named list, not another member of it. */
  accent?: boolean;
  /** Indented under the row that revealed it. */
  inset?: boolean;
  /** Present → this row opens something rather than leaving, and the chevron turns to say so. */
  expanded?: boolean;
  /** Last in an ENCLOSED list — drops the hairline, which would otherwise double the box's border. */
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityState={expanded == null ? undefined : { expanded }}
      style={({ pressed }) => [styles.row, inset && styles.rowInset, last && styles.rowLast, pressed && styles.rowPressed]}
    >
      <View style={styles.grow}>
        <Text style={[styles.rowLabel, accent && styles.rowLabelAccent]} numberOfLines={2}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {/* Down when it is open, right when it leads away. One glyph rotated, so the two can never
          disagree about which direction the row goes. */}
      <Svg
        width={17}
        height={17}
        viewBox="0 0 24 24"
        fill="none"
        stroke={accent ? flColor.bronze400 : flColor.gray600}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={expanded ? styles.chevOpen : undefined}
      >
        <Path d="M9 5l7 7-7 7" />
      </Svg>
    </Pressable>
  );
}

function Chip({
  label,
  on,
  icon,
  onPress,
}: {
  label: string;
  on?: boolean;
  /** Optional and rare — see `INTENSITY_ICON` for the only place it is used and why. */
  icon?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.chipPressed]}
    >
      {icon}
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

/** The backdrop's Forge value, named so the gate below can hand back the identical string. */
const SCRIM = 'rgba(3,5,7,0.66)';

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 60 },
  /*
   * ⚠ THE SAME `rgba(3,5,7,0.66)` `CoachChatSheet` USES, NOW PUT THROUGH THE FLIP. Holt's in-session
   *   sheet hand-rolled the literal and never lightened it, so he dropped a near-black curtain over a
   *   cream app while his chat sheet — the same coach, one tap away — lightened correctly.
   *
   * ⚠ `themeScrim`, NOT `paperScrim`. The pure function has no idea which palette is live and flips
   *   any near-black rgba to cream in EITHER theme — which is what 14 screens were doing. The themed
   *   wrapper hands Forge its string back untouched. See `@/constants/theme-scrim`.
   */
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: themeScrim(SCRIM),
  },
  /* `CoachChatSheet`'s shell exactly — 24px corners (wider than the token, on purpose), a BRONZE top
     border and the inset warm highlight, which together are what make it read as raised metal rather
     than as a grey panel. `maxHeight` rather than Home's `top: 64` inset: see the header. */
  sheet: {
    maxHeight: '78%',
    backgroundColor: flColor.charcoal900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    /* ⚠ WAS A COPY OF `flShadow.sheet`, NOT A USE OF IT — the literal here is Forge's token to the
       byte, which is exactly why it could fall out of step: Paper's `sheet` is a warm lift with a white
       top rim, and this one stayed a black one. Same defect `CoachSays`' bubble gradient had. */
    boxShadow: flShadow.sheet,
  },
  grabWrap: { alignItems: 'center', paddingTop: 9, paddingBottom: 4 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: flColor.charcoal500 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
  },
  headerText: { flex: 1, gap: 2 },
  headerName: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, color: flColor.bronze400 },
  headerStatus: { fontSize: 12.5, color: flColor.gray400 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  thread: { flexGrow: 0 },
  threadInner: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26, gap: 14 },
  // 15.5/24 cream at the left margin — Home's voice, character for character.
  holtText: { fontSize: 15.5, lineHeight: 24, color: flColor.cream100, maxWidth: '92%' },
  /* The evidence under the instruction, quieter than it. "Because you did this" is what separates a
     coach from an assertion, and it must never outweigh the thing it is supporting. */
  basis: { fontSize: 12.5, lineHeight: 19, color: flColor.gray600 },

  grow: { flex: 1, minWidth: 0 },

  /* ── TREATMENT ONE: the statement card. One per sheet, and the only bronze-tinted surface in it —
     which is what makes it the thing the eye lands on without needing to be bigger than everything. */
  card: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.bronzeTint,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 14,
    gap: 9,
    // Required — `cardArt` bleeds past every edge and this is what turns that into a crop.
    overflow: 'hidden',
  },
  /* ⚠ CLIPPED BY THE CARD, WHICH IS WHY THE CARD CARRIES `overflow: 'hidden'`. The figure bleeds off
     the right edge deliberately — a fully contained illustration reads as a sticker, and this one is
     meant to be the card's material rather than a picture placed on it. Low opacity because it sits
     under 38pt type and must never compete with it. */
  cardArt: {
    position: 'absolute',
    right: -18,
    top: -10,
    bottom: -10,
    width: 190,
    opacity: 0.5,
  },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  cardReps: { fontSize: 19, fontWeight: '600', color: flColor.bronze400, letterSpacing: 0.2 },
  /* Cream rather than the gray `basis` used elsewhere — inside the card it is the coach's own sentence,
     and at 40% grey over an illustration it stopped being readable. */
  cardBasis: { fontSize: 13, lineHeight: 19, color: flColor.gray400, maxWidth: '78%' },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 3,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: flColor.bronzeBorderSubtle,
  },
  /* The accept. The only filled control in the sheet — nothing else may take this treatment, or it
     stops meaning "this is the thing Holt is asking you to do". */
  use: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeDark,
  },
  usePressed: { opacity: 0.82 },
  useText: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  /* Playfair, as every number the app treats as an achievement is set. `lineHeight` pinned to the size
     so the baseline row does not gain the font's own leading and push the card open. */
  cardNumber: {
    fontFamily: flFont.display,
    fontSize: 38,
    lineHeight: 38,
    color: flColor.cream100,
    letterSpacing: -0.4,
  },
  cardUnit: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4, color: flColor.bronze400 },
  cardVerdict: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: flColor.gray600 },
  /* The disclosure, not a button — it carries no border because it is a question, not a decision. */
  whyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2, minHeight: 22 },
  whyText: { fontSize: 12.5, color: flColor.bronze400 },
  why: { fontSize: 14, lineHeight: 21, color: flColor.gray400 },

  /* An adaptation. Charcoal rather than bronze-tinted so it cannot be mistaken for the card, and a
     full bronze border rather than the subtle one because it is the one thing here Holt did unasked. */
  notice: {
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal800,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  noticeLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: flColor.bronze400 },

  /* ── TREATMENT THREE: rows. The divider is on the row, so the last one in a list has one too —
     which is correct here: every list in this sheet is followed by another group, never by the edge. */
  rows: { flexDirection: 'column' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  rowInset: { paddingLeft: 14 },
  rowLast: { borderBottomWidth: 0 },

  /* Zone two of three: the observation. Green, and the only green in the sheet — see the row itself. */
  balanceWrap: { borderWidth: 1, borderColor: 'rgba(90,158,104,0.26)', borderRadius: flRadius.md, backgroundColor: 'rgba(90,158,104,0.07)', overflow: 'hidden' },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 14, paddingVertical: 10 },
  /* The revealed movements, divided off the observation that named them. */
  balanceOpen: { paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: 'rgba(90,158,104,0.20)' },

  /* Zone three: utilities, enclosed. `paddingHorizontal` on the box rather than on each row so the
     dividers run the full width of the container the way a grouped list does. */
  planBox: { borderWidth: 1, borderColor: flColor.charcoal600, borderRadius: flRadius.md, paddingHorizontal: 14, backgroundColor: flColor.charcoal900 },
  rowPressed: { opacity: 0.6 },
  rowLabel: { fontSize: 14.5, lineHeight: 19, color: flColor.cream100 },
  rowLabelAccent: { fontSize: 13.5, color: flColor.bronze400 },
  rowSub: { fontSize: 12, lineHeight: 16, color: flColor.gray600, marginTop: 2 },
  chevOpen: { transform: [{ rotate: '90deg' }] },

  group: { gap: 9 },
  groupLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: flColor.gray600 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    // Bronze-edged, not charcoal — a chip is a decision waiting to be made (§8.2).
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal800,
    minHeight: 44,
    // Row + center: a chip may now carry a leading glyph, and the default column would stack it.
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipPressed: { opacity: 0.82 },
  chipText: { fontSize: 13.5, fontWeight: '500', color: flColor.cream100 },
});
