import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flColor, flFont, flRadius } from '@/constants/foundation';
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
   * Names him above the line. The introduction only.
   *
   * The whole complaint was that nobody knows who the medallion is, and a line in his voice with no
   * name on it does not answer that. Every later line is from someone the athlete has already met.
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
          accessibilityLabel={named ? `Coach Holt — ${said}` : said}
          style={[styles.bubble, named && styles.bubbleNamed]}
        >
          {named ? <Text style={styles.name}>Coach Holt</Text> : null}
          {/*
            ⚠ THREE LINES, THEN TAP. A progression sentence runs to about ninety characters ("You hit
            3 × 10 at 185 lb on Barbell Bench Press — go to 190 lb and start back at 8") and a cue is
            allowed two hundred; unbounded, that is a five-line panel hanging over the set table, which
            is the "it blocks things on screens" complaint that shrank the coach's reach in the first
            place. Nothing is lost by clipping: the sheet this opens shows the same sentence in full.
          */}
          <Text style={[styles.text, named && styles.textNamed]} numberOfLines={3}>
            {said}
          </Text>
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

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 40, alignItems: 'flex-end', gap: 10 },
  bubble: {
    maxWidth: 236,
    paddingHorizontal: 13,
    paddingVertical: 9,
    // The flat corner points down-right, at the mark it came from.
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
    backgroundColor: flColor.charcoal700,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  text: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  /* The introduction is the one line that has to be NOTICED — it competes with an athlete's eye going
     straight past a corner of the screen they have learned holds nothing. Bronze edge and tint, the same
     language the mark itself wears, so it reads as coming FROM the medallion. */
  bubbleNamed: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800 },
  name: { fontFamily: flFont.display, fontSize: 13.5, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze400, marginBottom: 2 },
  textNamed: { color: flColor.cream100 },
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
