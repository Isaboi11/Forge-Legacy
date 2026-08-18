import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import {
  BODY_MAX,
  FEEDBACK_COPY,
  FEEDBACK_KINDS,
  feedbackProblem,
  feedbackProblemMessage,
  feedbackSendError,
  type FeedbackKind,
  type FeedbackProblem,
} from '@/domain/feedback/content';
import { submitFeedback } from '@/data/feedback-live';

/**
 * Send Feedback — the in-app half of the support obligation (migration 0167, `site/support.html`).
 *
 * ⚠ THIS IS A STORE REQUIREMENT, NOT A FEATURE. App Store Connect demands a Support URL and Apple
 *   rejects a bare `mailto:` as one. Before this screen the only support touchpoint in the entire
 *   binary was a sentence of copy inside the privacy sheet — unreachable by anyone looking for help.
 *
 * Everything shaped like a rule lives in `domain/feedback/content.ts`, pure and tested. This file is
 * the surface: pick a kind, type, send, and be told the truth about what happened.
 */

/** `?from=` lets any screen deep-link here carrying its own route, so a bug report names a screen.
 *  Unset from the Account Settings row — where "account-settings" would be the answer to a question
 *  nobody asked — and null is the honest value for that, not a guess. The body carries the story. */
export default function FeedbackRoute() {
  const params = useLocalSearchParams<{ from?: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [body, setBody] = useState('');
  const [contactOk, setContactOk] = useState(true);
  const [busy, setBusy] = useState(false);
  // Nothing is marked wrong until the athlete has tried once. Validating as they type turns an empty
  // form into a form covered in errors before they have done anything.
  const [tried, setTried] = useState(false);

  const draft = { kind, body, contactOk };
  const problem: FeedbackProblem | null = feedbackProblem(draft);
  const shownProblem = tried ? feedbackProblemMessage(problem) : null;
  const hint = FEEDBACK_KINDS.find((k) => k.key === kind)?.hint ?? null;

  const onSend = () => {
    setTried(true);
    if (problem != null || busy || kind == null) return;

    setBusy(true);
    submitFeedback({ kind, body, screen: params.from ?? null, contactOk }).then(
      () => {
        setBusy(false);
        showToast(FEEDBACK_COPY.sent);
        router.back();
      },
      (e: unknown) => {
        // ⚠ Never a silent failure and never a false success. The rate limit, an unapplied migration and
        // a dead connection each get their own sentence — see `feedbackSendError`.
        setBusy(false);
        showToast(feedbackSendError(e));
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />
      <AppBar title={FEEDBACK_COPY.title} serif onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>{FEEDBACK_COPY.intro}</Text>

        <View style={styles.kinds}>
          {FEEDBACK_KINDS.map((k) => {
            const on = k.key === kind;
            return (
              <Pressable
                key={k.key}
                onPress={() => setKind(k.key)}
                style={[styles.kind, on && styles.kindOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={k.label}
              >
                <View style={[styles.dot, on && styles.dotOn]}>{on ? <View style={styles.dotCore} /> : null}</View>
                <Text style={[styles.kindLabel, on && styles.kindLabelOn]}>{k.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>{FEEDBACK_COPY.bodyLabel}</Text>
        <View style={styles.well}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={hint ?? FEEDBACK_COPY.bodyPlaceholder}
            placeholderTextColor={flColor.gray600}
            multiline
            textAlignVertical="top"
            maxLength={BODY_MAX}
            autoCorrect
            accessibilityLabel={FEEDBACK_COPY.bodyLabel}
            style={styles.input}
          />
        </View>
        <View style={styles.underField}>
          {shownProblem ? (
            <Text style={styles.error}>{shownProblem}</Text>
          ) : (
            <Text style={styles.helper}>{FEEDBACK_COPY.attachNote}</Text>
          )}
          <Text style={[styles.count, body.length >= BODY_MAX && styles.countFull]}>
            {body.length}/{BODY_MAX}
          </Text>
        </View>

        <Pressable
          onPress={() => setContactOk((v) => !v)}
          style={styles.consent}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: contactOk }}
          accessibilityLabel={FEEDBACK_COPY.contactLabel}
        >
          <View style={[styles.box, contactOk && styles.boxOn]}>
            {contactOk ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <Text style={styles.consentLabel}>{FEEDBACK_COPY.contactLabel}</Text>
        </Pressable>

        <View style={styles.actions}>
          <Button
            variant="primary"
            fullWidth
            disabled={busy}
            onPress={onSend}
            accessibilityLabel={FEEDBACK_COPY.send}
          >
            {busy ? FEEDBACK_COPY.sending : FEEDBACK_COPY.send}
          </Button>
        </View>

        {/* Always a second route out. If the table is missing, the network is down, or they have hit the
            rate limit, the athlete still has somewhere to go — and this is the same address printed on
            forgelegacy.app/support. */}
        <Pressable
          onPress={() => Linking.openURL('mailto:support@forgelegacy.app')}
          accessibilityRole="link"
          accessibilityLabel={FEEDBACK_COPY.emailFallback}
        >
          <Text style={styles.email}>{FEEDBACK_COPY.emailFallback}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },
  intro: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400, marginBottom: 22 },

  kinds: { gap: 8, marginBottom: 24 },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.surfaceRecessed,
  },
  kindOn: { borderColor: flColor.bronze400 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: flRadius.round,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { borderColor: flColor.bronze400 },
  dotCore: { width: 8, height: 8, borderRadius: flRadius.round, backgroundColor: flColor.bronze400 },
  kindLabel: { fontSize: 14.5, color: flColor.gray400 },
  kindLabelOn: { color: flColor.cream100, fontWeight: '600' },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginBottom: 9,
  },
  well: {
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)',
  },
  input: {
    minHeight: 132,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    color: flColor.cream100,
    fontFamily: flFont.sans,
    fontSize: 15,
    lineHeight: 21,
  },
  underField: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8, marginBottom: 22 },
  helper: { flex: 1, fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },
  error: { flex: 1, fontSize: 11.5, lineHeight: 17, color: flColor.redMuted },
  count: { fontSize: 11.5, color: flColor.gray600 },
  countFull: { color: flColor.redMuted },

  consent: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 26 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { borderColor: flColor.bronze400, backgroundColor: 'rgba(201,151,103,0.14)' },
  tick: { fontSize: 12, lineHeight: 14, color: flColor.bronze300 },
  consentLabel: { flex: 1, fontSize: 13.5, color: flColor.gray400 },

  actions: { marginBottom: 18 },
  email: { textAlign: 'center', fontSize: 12.5, color: flColor.bronze400 },
});
