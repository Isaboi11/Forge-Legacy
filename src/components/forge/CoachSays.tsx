import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { flColor, flRadius, flShadow } from '@/constants/foundation';
import { BUBBLE_SHADOW, BUBBLE_SIZE, HoltMark } from '@/components/forge/HoltMark';

/**
 * THE COIN IS THE COACH — one mark, one bubble, everywhere Holt speaks.
 *
 * ══ WHAT THIS FIXES ══
 *
 * PO: *"With whatever the coach says, it should come from the coach coin in the bottom right. So if a
 * coach wrote something in the workout for that exercise a bubble or something tied directly to him
 * should appear with what he wrote. Same with when he says something mid set. And then you can click on
 * him to reply or choose some other options."*
 *
 * Holt was saying useful things and hiding them. The Active Workout put the author's cue in a card
 * titled THE PLAN SAYS and his own progression line in one titled HOLT SAYS — **both inside the exercise
 * hero, which auto-collapses the first time a set resolves.** So the coach spoke before set one and then
 * vanished for the rest of the session, while a medallion sat in the corner that opened a sheet and
 * volunteered nothing. Two cards attributed to a plan and a name, and a mark attributed to neither.
 *
 * Now there is ONE object. The line comes out of the coin, points back at it, and tapping either the
 * line or the coin opens the same sheet — so "who said that" and "how do I answer" have the same answer
 * everywhere in the app.
 *
 * ══ WHY IT IS A COMPONENT AND NOT A SCREEN'S OWN VIEW ══
 *
 * There are two mounts and there have to be. `CoachBubble` renders OUTSIDE the navigator so it can float
 * over the tabs; the Active Workout mounts its own copy because a bubble a level up cannot see the set
 * sheet and would sit on the number pad mid-set. Two mounts, one appearance — this file is the shared
 * half, so the introduction on Home and a mid-set line in the gym are visibly the same object rather
 * than two things that happen to be bronze.
 *
 * ⚠ THE CALLER OWNS VISIBILITY. This renders whatever it is given. The Active Workout's fourteen-
 * condition `holtHidden` list and `CoachBubble`'s allow-list both stay where they are: knowing when a
 * ceremony owns the screen is screen knowledge, and pulling it in here is how a shared component starts
 * making decisions it has no information for.
 */

export interface CoachSaysProps {
  /** The line, or null for the mark alone. Never an empty string — nothing is a real answer. */
  line?: string | null;
  /**
   * The introduction — the one line that has to be noticed.
   *
   * ⚠ IT NO LONGER CONTROLS ATTRIBUTION. Every line now carries the `HOLT` eyebrow, because an
   * unattributed sentence in the corner of a gym screen is a sentence from nobody. What this still
   * buys is EMPHASIS: a bronze edge on the first line an athlete ever sees from him, competing with
   * an eye that has learned that corner holds nothing.
   */
  named?: boolean;
  /** Opens the reply/options surface — `SessionCoachSheet` in a session, the chat sheet elsewhere. */
  onPress: () => void;
  /** What the sheet is called, for screen readers. */
  openLabel: string;
  /** Absolute placement, owned by the caller — the tab bar and the action bar sit at different heights. */
  style?: object;
}

export function CoachSays({ line, named = false, onPress, openLabel, style }: CoachSaysProps) {
  const said = line?.trim() || null;

  return (
    /* `box-none` on the wrapper so the empty space around the mark stays tappable by whatever is under
       it. A full-width absolute container that swallowed touches would make the bottom of every scroll
       view dead, which is the classic way a floating button breaks a screen it was only meant to sit on. */
    <View pointerEvents="box-none" style={[styles.wrap, style]}>
      {said ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Coach Holt — ${said}`}
          style={[styles.bubble, named && styles.bubbleNamed]}
        >
          <LinearGradient colors={SURFACE_ELEVATED} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.bubbleInner}>
            {/*
              ⚠ **THE EYEBROW, ALWAYS, NOT A NAME ON THE FIRST LINE ONLY** (Coach Holt Chat v2 §5).
              The chat marks every one of his turns `HOLT` in bronze at 9.5/700/2.4, and that is now
              what identifies him here too — so the sentence over the set table and the sentence in the
              conversation are visibly the same person speaking, rather than two bronze things.

              It also finishes the job the `named` flag started. That flag showed a serif "Coach Holt"
              exactly once, on the introduction, on the reasoning that every later line is from someone
              you have met — which is true of the CHAT, where the thread is right there. In the gym,
              five sets later, an unattributed sentence in the corner is a sentence from nobody.
            */}
            <Text style={styles.eyebrow}>HOLT</Text>
            {/*
              ⚠ THREE LINES, THEN TAP. A progression sentence runs to about ninety characters ("You hit
              3 × 10 at 185 lb on Barbell Bench Press — go to 190 lb and start back at 8") and a cue is
              allowed two hundred; unbounded, that is a five-line panel hanging over the set table, which
              is the "it blocks things on screens" complaint that shrank the coach's reach in the first
              place. Nothing is lost by clipping: the sheet this opens shows the same sentence in full.
            */}
            <Text style={styles.text} numberOfLines={3}>
              {said}
            </Text>
          </LinearGradient>
        </Pressable>
      ) : null}
      {/* ⚠ THE MARK, NOT A LETTER. `coach-holt-mark.png` cover-filled — the struck bronze medallion IS
          the feature's identity, and a "C" in a circle was standing in for it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={openLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.mark, pressed && styles.markPressed]}
      >
        <HoltMark size={BUBBLE_SIZE} />
      </Pressable>
    </View>
  );
}

/** `--fl-surface-elevated`, the same material the chat's artifact card is cut from. */
const SURFACE_ELEVATED = ['#1F2024', flColor.charcoal700] as const;

const styles = StyleSheet.create({
  /* ⚠ 12, MATCHING THE CHAT'S HOLT ROW GAP (v2 §5). It was 10 — near enough to look like a mistake
     rather than a system, which is exactly what the PO meant by "spacing too". */
  wrap: { position: 'absolute', zIndex: 40, alignItems: 'flex-end', gap: 12 },
  bubble: {
    /* Wider than the 236 it was, because the type inside grew to the chat's scale and a 90-character
       progression sentence at 15px in a 236pt box is four lines of two words. */
    maxWidth: 268,
    // The flat corner points down-right, at the mark it came from — the athlete's own bubble in the
    // chat does the mirror of this, and for the same reason.
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    /* ⚠ `overflow: hidden` IS LOAD-BEARING with a gradient child — without it the fill squares off the
       corners this container just rounded. */
    overflow: 'hidden',
    boxShadow: flShadow.trainTogetherCard,
  },
  /* v2 §5's content column: eyebrow over text at gap 7, and the same 15px/16px gutter the cards use. */
  bubbleInner: { paddingHorizontal: 15, paddingVertical: 11, gap: 7 },
  eyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 2.4, color: flColor.bronze400 },
  /* Was 12.5/18 in `gray400` — a caption. The chat sets Holt's live line at 16.5/24 in `cream100`; this
     is that voice stepped down one notch for a floating overlay, not a different one. */
  text: { fontSize: 15, lineHeight: 21.5, color: flColor.cream100 },
  /* The introduction still has to be NOTICED — it competes with an eye that has learned this corner of
     the screen holds nothing. It earns the bronze edge; every later line wears the card's own. */
  bubbleNamed: { borderColor: flColor.bronzeBorder },
  mark: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    // A dark rim to lift it off whatever it floats over, the badge glow, then the float shadow.
    boxShadow: BUBBLE_SHADOW,
  },
  markPressed: { opacity: 0.86 },
});
