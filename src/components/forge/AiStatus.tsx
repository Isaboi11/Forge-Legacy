import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flRadius, flText } from '@/constants/foundation';
import { NOT_CHARGED } from '@/domain/ai/ai-failure';
import { aiStatusA11y, type AiStatus as AiStatusModel, type AiStepState } from '@/domain/ai/ai-status';

/**
 * ══ THE ONE LOOK FOR AN AI FEATURE'S STATE (AI Road to 10 Sprint 3, UX-1) ══
 *
 * Working (a spinner, the headline, what it is doing now, and a step row for a job in steps) · Failed (the line,
 * "Not charged." under it when the credit came back, Try again) · Out of credits · Offline. One voice comes from
 * `domain/ai/ai-status.ts`; this is the one look, built only from the shared tokens so both themes follow (layout
 * once, colour from the palette). No bronze: nothing here is earned (Alabaster rule) — working is neutral, a failure
 * is the danger tokens AiCreditsChip already uses.
 */
export function AiStatus({ status, onRetry, style }: { status: AiStatusModel; onRetry?: () => void; style?: StyleProp<ViewStyle> }) {
  const failed = status.kind === 'failed' || status.kind === 'out_of_credits';
  return (
    <View
      style={[styles.wrap, failed ? styles.wrapFailed : null, style]}
      accessible
      accessibilityRole={failed ? 'alert' : 'progressbar'}
      accessibilityLabel={aiStatusA11y(status)}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        {status.kind === 'working' ? <ActivityIndicator size="small" color={flText.secondary} /> : null}
        <View style={styles.words}>
          <Text style={[styles.headline, failed ? styles.headlineFailed : null]}>{status.headline}</Text>
          {status.detail ? <Text style={styles.detail}>{status.detail}</Text> : null}
          {status.kind === 'failed' && status.notCharged ? <Text style={styles.detail}>{NOT_CHARGED}</Text> : null}
        </View>
      </View>
      {status.kind === 'working' && status.steps?.length ? (
        <View style={styles.steps}>
          {status.steps.map((s) => (
            <View key={s.label} style={[styles.step, STEP_STYLE[s.state]]}>
              {/* Sprint 3b: the engraved set's check and close, not text glyphs. */}
              {s.state === 'done' ? <EngravedIcon name="check" size={11} color={flText.secondary} /> : null}
              {s.state === 'failed' ? <EngravedIcon name="close" size={11} color={flColor.dangerText} /> : null}
              <Text style={[styles.stepText, s.state === 'now' ? styles.stepTextNow : null]}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {(status.kind === 'failed' || status.kind === 'offline') && status.canRetry && onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" style={({ pressed }) => [styles.retry, pressed ? styles.retryPressed : null]}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, padding: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.divider },
  wrapFailed: { borderColor: flColor.dangerBorder, backgroundColor: flColor.dangerBg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  words: { flex: 1, gap: 2 },
  headline: { fontSize: 13.5, fontWeight: '600', color: flText.primary },
  headlineFailed: { color: flColor.dangerText },
  detail: { fontSize: 12, color: flText.secondary },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.divider },
  stepDone: { opacity: 0.75 },
  stepNow: { borderColor: flText.secondary },
  stepWaiting: { opacity: 0.5 },
  stepFailed: { borderColor: flColor.dangerBorder },
  stepText: { fontSize: 11.5, color: flText.secondary },
  stepTextNow: { color: flText.primary, fontWeight: '600' },
  retry: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.divider },
  retryPressed: { opacity: 0.7 },
  retryText: { fontSize: 12.5, fontWeight: '600', color: flText.primary },
});

const STEP_STYLE: Record<AiStepState, object> = {
  done: styles.stepDone,
  now: styles.stepNow,
  waiting: styles.stepWaiting,
  failed: styles.stepFailed,
};
