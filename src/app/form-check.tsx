import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { CRISIS_KICKER, CRISIS_STOP, CARE_KICKER, CARE_STOP, MEDICAL_STOP, STOP_KICKER, URGENT_KICKER, URGENT_STOP } from '@/domain/coach/chat-core';
import { FORM_CLIP_SECONDS, FORM_NO_READ, formCheckSummary, type FormRead } from '@/domain/coach/form-check';
import { formCheck, formCheckAvailable, framesFromVideo, pickFormVideo } from '@/data/form-check-live';
import { usePremiumAi } from '@/lib/entitlement';
import { callerModalGone, useMediaPicker } from '@/lib/useMediaPicker';

/**
 * FORM CHECK — film a set, Holt reads the frames, and says one thing to change.
 *
 * ══ WHY A SCREEN AND NOT A TURN IN THE CHAT ══
 *
 * The clip goes through `useMediaPicker`, the app's one camera-or-library path, and iOS refuses to present
 * a picker over a modal that is still dismissing (`project_media_capture_picker`). Holt's chat IS a sheet,
 * so opening the camera from inside it means closing him first and coming back to a conversation the
 * athlete did not end. A screen sidesteps that entirely, and it is also where somebody standing in a gym
 * with their phone already out wants to be: one button, one lift, one answer.
 *
 * ══ ⚠ WHAT HOLT MAY SAY ABOUT A VIDEO OF A HUMAN BEING (PO, 2026-09-22) ══
 *
 * *"Stay away from anything that would get us into legal trouble."* Technique only: bar path, brace,
 * depth, timing, tempo. Never pain, never injury, never a judgement about the body in the frame, never
 * "safe" or "dangerous". That is enforced in two places that cannot be talked out of it — `medicalRoute`
 * before the model (a note mentioning pain stops the whole thing, unspent) and `sanitizeFormRead` after
 * it, which drops any sentence that strays. This screen only draws what survives both.
 */

/** The lifts people film. Anything else is typed — the model reads the name, it is not a catalogue key. */
const COMMON = ['Back Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Front Squat', 'Romanian Deadlift'];

type Stage =
  | { step: 'lift' }
  | { step: 'working'; label: string }
  | { step: 'read'; lines: string[]; read: FormRead | null }
  | { step: 'stopped'; kicker: string; text: string }
  | { step: 'problem'; text: string; sub: string };

export default function FormCheckScreen() {
  const router = useRouter();
  const premiumAi = usePremiumAi();
  const { pick, mediaPickerSheet } = useMediaPicker();
  const [lift, setLift] = useState('');
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<Stage>({ step: 'lift' });
  const [notice, setNotice] = useState<string | null>(null);

  const canRead = formCheckAvailable();

  const run = async (named: string) => {
    const chosen = named.trim();
    if (!chosen) return;
    setNotice(null);
    /* The chooser sheet has to be gone before the system picker opens — iOS drops it otherwise. */
    await callerModalGone();
    const video = await pickFormVideo(pick);
    if (video.kind === 'cancelled') return;
    if (video.kind === 'unavailable') {
      setStage({ step: 'problem', text: 'This version of the app cannot read a video yet.', sub: 'It arrives with the next build. Everything else Holt does still works.' });
      return;
    }
    if (video.kind === 'not_a_video') {
      setStage({ step: 'problem', text: 'That was a photo, not a clip.', sub: `Film the set — ${FORM_CLIP_SECONDS} seconds is plenty — and I'll look at it.` });
      return;
    }
    setNotice(video.notice);

    setStage({ step: 'working', label: 'Reading the clip' });
    const frames = await framesFromVideo(video.uri, undefined, video.durationMs ?? undefined);
    if (frames.length === 0) {
      setStage({ step: 'problem', text: "I couldn't get any frames out of that.", sub: 'Try a clip filmed from the side with your whole body in shot.' });
      return;
    }

    setStage({ step: 'working', label: `Watching your ${chosen.toLowerCase()}` });
    const res = await formCheck(chosen, frames, note);
    switch (res.kind) {
      case 'ok':
        return setStage({ step: 'read', lines: formCheckSummary(res.read), read: res.read });
      case 'unreadable':
        return setStage({ step: 'read', lines: [FORM_NO_READ], read: null });
      case 'stopped':
        return setStage({
          step: 'stopped',
          kicker: res.route === 'crisis' ? CRISIS_KICKER : res.route === 'urgent' ? URGENT_KICKER : res.route === 'care' ? CARE_KICKER : STOP_KICKER,
          text: res.route === 'crisis' ? CRISIS_STOP : res.route === 'urgent' ? URGENT_STOP : res.route === 'care' ? CARE_STOP : MEDICAL_STOP,
        });
      case 'out_of_credits':
        return setStage({ step: 'problem', text: "That's this month's AI used up.", sub: 'It resets with your next cycle.' });
      case 'not_entitled':
        return setStage({ step: 'problem', text: 'Form check is part of Premium AI.', sub: 'Turn it on in Settings → Subscription.' });
      case 'bad_frames':
        return setStage({ step: 'problem', text: 'That clip was too big to send.', sub: 'A shorter one, filmed from the side, works best.' });
      case 'unavailable_here':
        return setStage({ step: 'problem', text: 'This version of the app cannot read a video yet.', sub: 'It arrives with the next build.' });
      case 'unavailable':
        return setStage({ step: 'problem', text: 'That broke on my end.', sub: 'Nothing was charged. Try again in a moment.' });
      case 'offline':
        return setStage({ step: 'problem', text: "I couldn't reach my notes just then.", sub: 'Check your connection and send it again.' });
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      <AppBar title="Form Check" onClose={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!premiumAi ? (
          <Text style={styles.lede}>Form check is part of Premium AI. Turn it on in Settings → Subscription and film a set.</Text>
        ) : !canRead ? (
          <Text style={styles.lede}>Reading a clip arrives with the next build of the app. Everything else Holt does works today.</Text>
        ) : (
          <>
            <Text style={styles.lede}>
              Film one set from the side, whole body in frame. {FORM_CLIP_SECONDS} seconds is plenty. Holt looks at the movement —
              nothing about you, and nothing medical.
            </Text>

            {stage.step === 'working' ? (
              <View style={styles.working}>
                <ActivityIndicator color={flColor.bronze400} />
                <Text style={styles.workingText}>{stage.label}…</Text>
              </View>
            ) : null}

            {stage.step === 'read' ? (
              <View style={styles.read}>
                {stage.lines.map((l, i) => (
                  <Text key={i} style={i === 0 ? styles.readLead : styles.readLine}>
                    {l}
                  </Text>
                ))}
              </View>
            ) : null}

            {stage.step === 'stopped' ? (
              <View style={styles.stop}>
                <Text style={styles.stopKicker}>{stage.kicker}</Text>
                <Text style={styles.stopText}>{stage.text}</Text>
              </View>
            ) : null}

            {stage.step === 'problem' ? (
              <View style={styles.problem}>
                <Text style={styles.problemText}>{stage.text}</Text>
                <Text style={styles.problemSub}>{stage.sub}</Text>
              </View>
            ) : null}

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            <Text style={styles.label}>WHICH LIFT</Text>
            <View style={styles.chips}>
              {COMMON.map((l) => (
                <Pressable
                  key={l}
                  onPress={() => {
                    setLift(l);
                    void run(l);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Film a ${l}`}
                  disabled={stage.step === 'working'}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipOn]}
                >
                  <Text style={styles.chipText}>{l}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>OR NAME IT</Text>
            <TextInput
              value={lift}
              onChangeText={setLift}
              placeholder="Hip thrust, clean, lunge…"
              placeholderTextColor={flColor.gray600}
              style={styles.input}
              maxLength={60}
              accessibilityLabel="Which lift"
            />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Anything to look at? (optional)"
              placeholderTextColor={flColor.gray600}
              style={styles.input}
              maxLength={300}
              accessibilityLabel="Anything to look at"
            />
            <Button variant="primary" fullWidth onPress={() => void run(lift)} accessibilityLabel="Film or choose a clip">
              {stage.step === 'read' || stage.step === 'problem' ? 'Try another clip' : 'Film or choose a clip'}
            </Button>
          </>
        )}
      </ScrollView>
      {mediaPickerSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  lede: { color: flColor.gray400, fontSize: 15, lineHeight: 22 },
  label: { color: flColor.gray600, fontSize: 11, letterSpacing: 1.2, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, borderRadius: flRadius.pill, paddingVertical: 10, paddingHorizontal: 14 },
  chipOn: { borderColor: flColor.bronze400 },
  chipText: { color: flColor.cream100, fontSize: 14 },
  input: { borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, borderRadius: flRadius.md, color: flColor.cream100, padding: 12, fontSize: 15 },
  working: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  workingText: { color: flColor.gray400, fontSize: 14 },
  read: { backgroundColor: flColor.charcoal800, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, padding: 16, gap: 8 },
  readLead: { color: flColor.cream100, fontSize: 16, lineHeight: 23, fontFamily: flFont.display },
  readLine: { color: flColor.gray400, fontSize: 15, lineHeight: 22 },
  stop: { backgroundColor: flColor.charcoal800, borderRadius: flRadius.lg, padding: 16, gap: 6 },
  stopKicker: { color: flColor.gray600, fontSize: 11, letterSpacing: 1.2 },
  stopText: { color: flColor.cream100, fontSize: 15, lineHeight: 22 },
  problem: { backgroundColor: flColor.charcoal800, borderRadius: flRadius.lg, padding: 16, gap: 4 },
  problemText: { color: flColor.cream100, fontSize: 15 },
  problemSub: { color: flColor.gray600, fontSize: 13, lineHeight: 19 },
  notice: { color: flColor.gray600, fontSize: 13 },
});
