import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { flColor, flRadius, flText } from '@/constants/foundation';
import { rateAiOutput } from '@/data/ai-feedback-live';
import {
  AI_FEEDBACK_FAILED_LINE,
  AI_FEEDBACK_IDLE,
  AI_FEEDBACK_PROMPT,
  aiFeedbackA11y,
  aiFeedbackStep,
  aiFeedbackWrites,
  type AiFeedbackFeature,
  type AiFeedbackState,
  type AiRating,
} from '@/domain/ai/ai-feedback-core';

/**
 * ══ "WAS THIS HELPFUL?" UNDER AN AI ANSWER (AI Road to 10, Sprint 1 — PL-4; migration 0269 `ai_feedback`) ══
 *
 * Two quiet controls, Helpful / Not helpful, and a one-line prompt. Small on purpose: it sits under Holt's words,
 * under a plate of dishes, under an imported week — it must never compete with the answer or its buttons.
 *
 * ⚠ TEXT, NOT THUMBS. The engraved set (`EngravedIcon`, the app's only icon system) has no thumb glyph, and new UI
 *   never hand-draws one. The words are also exactly what VoiceOver reads — "Helpful", "Not helpful" — with the
 *   chosen one announced as selected and a sending one as busy.
 *
 * ⚠ ONE VOTE, CHANGED NEVER WITHDRAWN. A tap on the other control changes it; a second tap on the chosen one does
 *   nothing (the table has no delete). The chosen one shows at once (optimistic) and goes back if the write fails,
 *   with a line saying so — a vote that silently did not land would read as counted.
 *
 * ⚠ STATE BELONGS TO ONE OUTPUT. It is kept beside the `aiRef` it was made for and read back only while that ref
 *   is still the one on screen, so a screen that reads a second photo with the same control instance starts clean —
 *   derived in render, no effect (the strict hooks lint).
 *
 * Colour by role: idle = the plain card edge + tertiary ink; chosen = the earned `accentBorder` with the selected
 * fill and ink (bronze only where it is earned on Alabaster); failed = the functional red line.
 */
export function AiFeedback({
  feature,
  aiRef,
  model,
  compact = false,
  style,
}: {
  feature: AiFeedbackFeature;
  /** The output's stable id — a server id where one exists, else one made once for this answer. */
  aiRef: string;
  model?: string | null;
  /** The two controls without the prompt — for a chat, where it would repeat under every reply. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [held, setHeld] = useState<{ ref: string; state: AiFeedbackState }>({ ref: aiRef, state: AI_FEEDBACK_IDLE });
  const state = held.ref === aiRef ? held.state : AI_FEEDBACK_IDLE;

  const tap = (rating: AiRating) => {
    if (!aiFeedbackWrites(state, rating)) return;
    const ref = aiRef;
    setHeld({ ref, state: aiFeedbackStep(state, { type: 'tap', rating }) });
    void rateAiOutput({ feature, ref, rating, model }).then((ok) =>
      setHeld((h) => (h.ref === ref ? { ref, state: aiFeedbackStep(h.state, { type: ok ? 'saved' : 'failed', rating }) } : h)),
    );
  };

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        {compact ? null : (
          <Text style={styles.prompt}>{AI_FEEDBACK_PROMPT}</Text>
        )}
        {([1, -1] as const).map((rating) => {
          const a = aiFeedbackA11y(state, rating);
          return (
            <Pressable
              key={rating}
              onPress={() => tap(rating)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              accessibilityState={{ selected: a.selected, busy: a.busy }}
              style={({ pressed }) => [styles.pill, a.selected && styles.pillOn, pressed && styles.pillPressed]}
            >
              <Text style={[styles.pillText, a.selected && styles.pillTextOn]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {state.failed ? (
        <Text style={styles.failed} accessibilityLiveRegion="polite">
          {AI_FEEDBACK_FAILED_LINE}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  prompt: { color: flText.tertiary, fontSize: 11.5, marginRight: 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  pillOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.selectedFill },
  pillPressed: { opacity: 0.7 },
  pillText: { color: flText.tertiary, fontSize: 11.5, fontWeight: '600' },
  pillTextOn: { color: flColor.selectedInk },
  failed: { color: flColor.redMuted, fontSize: 11 },
});
