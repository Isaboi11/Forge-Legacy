/**
 * TodaysWorkoutCard — the Home "Today's Workout" hero.
 * Source of truth: Forge Home.dc.html (§ Today's Workout, lines 112–140).
 *
 * Consumes ONLY the resolved artwork object from the Home Workout Artwork Resolver
 * (`src/domain/home-artwork`) plus display strings — it holds NO classification logic
 * (resolver spec principle). The faint top-right art is the resolver's choice for
 * *today's* session; RN has no mix-blend/mask, so it's approximated with opacity + a
 * LinearGradient edge-fade (accepted platform delta). If the art isn't registered,
 * the card degrades to its bronze wash + icon — never a crash, never a broken image.
 */

import React, { useRef, useState } from 'react'
import { Image } from 'expo-image'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { HeroSurface } from '@/components/forge/HeroSurface'
import { BottomSheet } from '@/components/forge/composites/BottomSheet'
import { EngravedIcon } from '../../primitives/icons/EngravedIcon'
import { flColor, flFont, flGradient, flRadius, flShadow, flType } from '@/constants/foundation'
import type { ResolvedArtwork } from '@/domain/home-artwork/types'
import { resolveArtworkSource } from '@/domain/home-artwork/artwork-source'
import { Button } from '../../composites/Button'
import { BarbellIcon, ChevronRightIcon, FlameIcon } from '../../primitives/icons/HomeIcons'

export interface TodaysWorkoutCardProps {
  resolved: ResolvedArtwork
  title: string
  focus?: string
  /**
   * The kicker above the title. Defaults to "Today's Workout" — the program day this card was built for.
   *
   * It became a prop when the card started serving athletes who have no program: "Today's Workout" over a
   * half-finished session the athlete abandoned yesterday is a small lie, and over a blank slate with
   * nothing planned it is a larger one. One card telling the truth in three modes beats three cards.
   */
  eyebrow?: string
  /**
   * How many exercises are in the session — OMITTED ENTIRELY when there is no session to count.
   *
   * Optional rather than defaulting to 0 on purpose. An athlete about to build their day as they go has no
   * exercise count; "0 Exercises" is not that fact, it is a confident claim of emptiness, and the card
   * drops the whole meta row rather than make it.
   */
  exerciseCount?: number
  /**
   * "~45 min" beside the count (PO 2026-09-30). The two things an athlete needs before committing are what
   * they are doing and how long it takes; the count alone answered only the first. Omitted with the count.
   */
  minutes?: number
  onStart?: () => void
  /**
   * Unfinished work waiting in local storage, as "N sets logged" — or null when there is none.
   *
   * The session was ALREADY being autosaved on every set and the logger already offered to resume it.
   * Nothing on Home said so, so the only way to discover your workout survived a crashed tab was to
   * navigate back into the logger and find out. The recovery existed; the sentence announcing it did not.
   */
  resumeSets?: number | null
  onPreview?: () => void
  /**
   * "Not today's" — starts a one-off instead. The hero is where the planned session is proposed, so it
   * is the only place the question "what if I don't want that" actually gets asked.
   */
  onFreestyle?: () => void
  /**
   * Overrides the primary button's label. The `open` face says "Start a Workout" — "Start Workout" implied
   * a workout existed, and "Start Freestyle Workout" named only one of the sheet's rows (W25-A1-D9).
   */
  startLabel?: string
  /**
   * "Build for later" — plan a one-off now and leave it on this card until you train it (0136).
   *
   * Sits under the primary as a quiet second door, the same shape as `onFreestyle`, because building in
   * advance is the rarer intent and should not compete with the button that just starts.
   */
  onBuildLater?: () => void
  /**
   * Give back what is in the one-off slot (SQ-A5-D4) — the workout they built for later, or the one
   * they took off a squad post.
   *
   * ⚠ THIS IS LOAD-BEARING, NOT A COURTESY. Since `Squad-Architecture-Amendment-005` §3 the occupied
   * slot OUTRANKS the program day, so without a way out an athlete who takes a workout and changes
   * their mind is looking at it instead of their own training with no route back. The slot used to
   * empty only by being STARTED.
   *
   * Behind the "•••" menu, not on the card (PO 2026-09-30). It was a third line of text under Start, which
   * made the least likely choice one of the three most visible things on Home. One tap further away is the
   * right distance for a way out — it is still always there.
   */
  onDiscard?: () => void
}

export function TodaysWorkoutCard({ resolved, title, focus, eyebrow, exerciseCount, minutes, onStart, resumeSets, onPreview, onFreestyle, startLabel, onBuildLater, onDiscard }: TodaysWorkoutCardProps) {
  const artSource = resolveArtworkSource(resolved.assetPath)
  const kicker = eyebrow ?? 'Today’s Workout'
  const [menuOpen, setMenuOpen] = useState(false)
  /*
   * ⚠ PREVIEW OPENS A SECOND SHEET, AND iOS WILL NOT PRESENT ONE WHILE THE MENU IS STILL LEAVING — the tap
   * is silently dropped. So a menu choice runs on the menu's `onDismiss` (iOS), with a timer as the fallback
   * for the platforms that never fire it. Web has no such limit. Same rule as Program Detail's session menu.
   */
  const afterMenu = useRef<(() => void) | null>(null)
  const pick = (fn: () => void) => {
    setMenuOpen(false)
    if (Platform.OS === 'web') return fn()
    let done = false
    const once = () => {
      if (done) return
      done = true
      afterMenu.current = null
      fn()
    }
    afterMenu.current = once
    setTimeout(once, Platform.OS === 'ios' ? 900 : 400)
  }
  // "1 Exercises" was unreachable while this card only ever drew program days. A one-block cardio resume
  // makes it reachable immediately, so the plural is decided rather than assumed.
  const countLabel =
    exerciseCount == null ? null : `${exerciseCount} Exercise${exerciseCount === 1 ? '' : 's'}${minutes ? ` · ~${minutes} min` : ''}`

  /*
   * ONE ROW UNDER START, NOT A STACK OF LINKS (PO 2026-09-30).
   *
   * "Something else today?" and "Discard this workout" were two centred lines with a tall gap between them —
   * the card's bottom third was mostly air, and discarding read as a peer of choosing something else. Now the
   * alternative is one row (the question, then the answer as the tappable line) and anything rarer lives in
   * the "•••" menu at its end. Build for later wears the same row on the open face, so the card has one shape.
   *
   * ⚠ A LAYOUT CHANGE ONLY — NO NEW COLOURS (PO 2026-09-30: "just do a layout change and don't really touch
   * the color"). Every colour below is one this card or the preview sheet already used: the rings and rule
   * are the meta divider's `bronzeBorderSubtle`, chevrons are the old meta chevron's `gray600`, and Discard
   * keeps the `gray400` it had as a link (the quieter-choice grey Program Detail's Skip uses, not red).
   */
  const alt = onFreestyle
    ? { icon: 'swap' as const, ask: 'Something else today?', act: 'Choose another', onPress: onFreestyle, label: 'Do something else today — start a one-off workout' }
    : onBuildLater
      ? { icon: 'calendar' as const, ask: 'Planning ahead?', act: 'Build for later', onPress: onBuildLater, label: 'Build a workout for later' }
      : null
  const menuItems = onDiscard
    ? [
        ...(onPreview ? [{ key: 'preview', icon: 'eye' as const, text: 'Preview workout', onPress: onPreview, danger: false }] : []),
        { key: 'discard', icon: 'trash' as const, text: 'Discard this workout', onPress: onDiscard, danger: true },
      ]
    : []

  return (
    <View style={styles.card}>
      {/* The hero tier. Paper only — in Forge this is a null and the card is unchanged. Sits UNDER the
          warm wash so the wash reads as a tint on the hero rather than replacing it. */}
      <HeroSurface />

      {/* faint warm wash */}
      <LinearGradient
        pointerEvents="none"
        colors={flGradient.missionCardWash.colors}
        locations={flGradient.missionCardWash.locations}
        start={flGradient.missionCardWash.start}
        end={flGradient.missionCardWash.end}
        style={StyleSheet.absoluteFill}
      />

      {/* resolved workout art — a figure bleeding from the top-right. The assets are pre-processed to
          TRANSPARENT backgrounds (dark → alpha via luminance), so the figure lands directly on the card
          with no panel, edge line, fade, blend, or crop — and it's uniform for every asset shape. */}
      {artSource != null ? (
        <View pointerEvents="none" style={styles.artLayer}>
          <Image tintColor={flColor.artworkTint ?? undefined} source={artSource} style={styles.art} contentFit="contain" contentPosition="top right" />
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Pressable only when there is somewhere to go. Home passes a handler for the PROGRAM face —
            which opens the session preview — and none for `resume` (the logger is already the view of
            that session) or `open` (nothing is planned to preview). */}
        <Pressable
          onPress={onPreview}
          disabled={!onPreview}
          accessibilityRole={onPreview ? 'button' : undefined}
          accessibilityLabel={[
            `${kicker}: ${title}.`,
            focus,
            countLabel != null ? `${countLabel}.` : null,
            onPreview ? 'Double-tap to preview.' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          style={styles.previewRow}
        >
          <View style={styles.iconChip}>
            <BarbellIcon size={24} />
          </View>
          <View style={styles.headText}>
            <Text style={flType.missionEyebrowMuted}>{kicker}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {focus ? <Text style={styles.focus}>{focus}</Text> : null}
          </View>
        </Pressable>

        {/* No count, no row. See `exerciseCount` — an unplanned session has nothing to state here, and a
            divider over "0 Exercises" would state it anyway. */}
        {countLabel != null ? (
          <View style={styles.metaBlock}>
            <View style={styles.metaDivider} />
            {/*
              ⚠ THE ROW IS THE BUTTON, not just the chevron's neighbour.
              This was a plain `View`, so the chevron — the one thing on the card that LOOKS like it
              opens something — did nothing at all. The only tappable area was the title above it, which
              carries no affordance. Reported as "the arrow isn't currently working", and it never was:
              it was drawn as a control and mounted as decoration.
            */}
            <Pressable
              onPress={onPreview}
              disabled={!onPreview}
              accessibilityRole={onPreview ? 'button' : undefined}
              accessibilityLabel={onPreview ? `${countLabel}. Double-tap to preview the workout.` : undefined}
              style={styles.metaRow}
            >
              <BarbellIcon size={16} color={flColor.bronze400} />
              <Text style={styles.metaText}>{countLabel}</Text>
              {/* The word, not just the chevron: a bare arrow at the end of a stat line reads as decoration,
                  and "can I see it first?" is a question the card has to answer at a glance. */}
              {onPreview ? (
                <View style={styles.metaChevron}>
                  <Text style={styles.previewText}>Preview</Text>
                  <ChevronRightIcon size={13} color={flColor.gray600} />
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}

        <Button
          variant="primary"
          fullWidth
          onPress={onStart}
          icon={<FlameIcon />}
          accessibilityLabel={resumeSets ? `Continue workout — ${resumeSets} sets already logged` : (startLabel ?? 'Start workout')}
        >
          {resumeSets ? 'Continue Workout' : (startLabel ?? 'Start Workout')}
        </Button>
        {/* The count is the reassurance. "Continue" alone still leaves you wondering what survived. */}
        {resumeSets ? (
          <Text style={styles.resumeNote}>
            {resumeSets} set{resumeSets === 1 ? '' : 's'} logged — pick up where you left off
          </Text>
        ) : null}

        {alt || menuItems.length > 0 ? (
          <View style={styles.altRow}>
            {alt ? (
              <Pressable
                onPress={alt.onPress}
                accessibilityRole="button"
                accessibilityLabel={alt.label}
                style={({ pressed }) => [styles.altMain, pressed ? styles.pressed : null]}
              >
                <View style={styles.altIcon}>
                  <EngravedIcon name={alt.icon} size={18} color={flColor.gray400} />
                </View>
                <View style={styles.altText}>
                  <Text style={styles.altAsk}>{alt.ask}</Text>
                  <View style={styles.altActLine}>
                    <Text style={styles.altAct}>{alt.act}</Text>
                    <ChevronRightIcon size={13} color={flColor.gray600} />
                  </View>
                </View>
              </Pressable>
            ) : (
              <View style={styles.altMain} />
            )}
            {menuItems.length > 0 ? (
              <Pressable
                onPress={() => setMenuOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`More options for ${title}`}
                hitSlop={6}
                style={({ pressed }) => [styles.moreBtn, pressed ? styles.pressed : null]}
              >
                <EngravedIcon name="more" size={20} color={flColor.gray400} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {menuItems.length > 0 ? (
        <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} onDismiss={() => afterMenu.current?.()} title={title}>
          <View style={styles.menu}>
            {menuItems.map((it) => (
              <Pressable
                key={it.key}
                onPress={() => pick(it.onPress)}
                accessibilityRole="button"
                accessibilityLabel={it.key === 'discard' ? `Discard ${title} and go back to your program` : `Preview ${title}`}
                style={({ pressed }) => [styles.menuRow, pressed ? styles.pressed : null]}
              >
                <EngravedIcon name={it.icon} size={20} color={flColor.gray400} />
                <Text style={[styles.menuText, it.danger ? styles.menuDanger : null]}>{it.text}</Text>
              </Pressable>
            ))}
          </View>
        </BottomSheet>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  resumeNote: { marginTop: -8, textAlign: 'center', fontSize: 12.5, color: flColor.gray600 },
  pressed: { opacity: 0.7 },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: flColor.bronzeBorderSubtle,
  },
  altMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  altIcon: {
    width: 38,
    height: 38,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altText: { flex: 1, gap: 2 },
  altAsk: { fontSize: 12.5, color: flColor.gray400 },
  altActLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  altAct: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  moreBtn: {
    width: 52,
    height: 38,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: { paddingBottom: 8 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: flColor.charcoal500,
  },
  menuText: { fontSize: 15.5, color: flColor.cream100 },
  menuDanger: { color: flColor.gray400 },
  previewText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.missionCard,
  },
  artLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  art: {
    position: 'absolute',
    top: -18,
    right: -24,
    bottom: -18,
    width: '62%',
    opacity: 1,
  },
  content: {
    padding: 22,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    maxWidth: '78%',
  },
  iconChip: {
    width: 52,
    height: 52,
    marginTop: 4,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  headText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    fontFamily: flFont.display,
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 32,
    color: flColor.cream100,
  },
  focus: {
    fontSize: 14,
    color: flColor.gray400,
  },
  metaBlock: {
    gap: 9,
  },
  metaDivider: {
    height: 1,
    maxWidth: 150,
    backgroundColor: flColor.bronzeBorderSubtle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  metaChevron: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
})
