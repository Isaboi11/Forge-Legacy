import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchPlannedSession, fetchTemplates, templateSummary } from '@/data/templates-live';
import { fetchTrainingPartners, sendWorkoutInvite } from '@/data/train-together-live';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Ask someone to train (S-10) — the compose half of `Forge Workout Invite.dc.html`.
 *
 * The design draws only the RECEIVING screen; the invite arrives in its fixture already made. This is
 * where it comes from, built to the same language.
 *
 * THREE WAYS TO ANSWER "WHAT", one mechanism behind them: the session you already have planned today, a
 * saved template, or nothing — and nothing is a real answer (build it together as you go), not a missing
 * value. All three resolve to a name plus a SNAPSHOT of the shape.
 *
 * SNAPSHOTTED, NEVER REFERENCED (0093). Pointing at "my program's next session" fails twice over: the
 * person you ask may not own the program, and next-session resolves from each athlete's own completed
 * count — so one pointer would open a different workout for each of you, which is precisely not training
 * together. What you asked them to do is what they get, whatever your program does afterwards.
 *
 * WHO YOU CAN ASK is accepted friends and squad-mates — the people you actually train alongside — and it
 * is enforced by the insert policy (0092) rather than by this list, because a list is a suggestion.
 */

export default function TrainInviteScreen() {
  const router = useRouter();
  const { athlete } = useLocalSearchParams<{ athlete?: string }>();
  const preselected = typeof athlete === 'string' && athlete.length > 0 ? athlete : null;
  const { showToast } = useToast();

  const { data: partners, loading } = useQuery(fetchTrainingPartners, []);
  const { data: templates } = useQuery(fetchTemplates, []);
  const { data: planned } = useQuery(fetchPlannedSession, []);

  const [toId, setToId] = useState<string | null>(preselected);
  /* Three ways to answer "what": the session you already have planned, a saved template, or nothing —
     which is a real third option (build it as you go together), not a missing value. */
  const [source, setSource] = useState<'planned' | 'template' | 'free'>('free');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const chosen = useMemo(() => (partners ?? []).find((p) => p.id === toId) ?? null, [partners, toId]);
  const chosenTemplate = useMemo(() => (templates ?? []).find((t) => t.id === templateId) ?? null, [templates, templateId]);

  /* The source names the session unless they overrode it; a freestyle one they have to name themselves. */
  const sourceName = source === 'planned' ? (planned?.name ?? '') : source === 'template' ? (chosenTemplate?.name ?? '') : '';
  const resolvedName = name.trim() || sourceName;
  /* Snapshotted, never referenced — they may not own the program, and "next session" resolves per
     athlete, so a pointer would open a different workout for each of you (0093). */
  const shape = source === 'planned' ? (planned?.exercises ?? []) : source === 'template' ? (chosenTemplate?.exercises ?? []) : [];
  const canSend = !!toId && resolvedName.length > 0 && !sending;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const send = async () => {
    if (!canSend || !toId) return;
    setSending(true);
    try {
      await sendWorkoutInvite({
        toId,
        workoutName: resolvedName,
        templateId: source === 'template' ? templateId : null,
        exercises: shape,
        note,
      });
      showToast(`Invite sent to ${chosen?.name ?? 'them'}.`);
      close();
    } catch (e) {
      showToast(errorMessage(e));
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
        <AppBar title="Train Together" onClose={close} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  if ((partners ?? []).length === 0) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
        <AppBar title="Train Together" onClose={close} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nobody to ask yet</Text>
          <Text style={styles.emptyBody}>Add a friend or join a squad, and the people you train alongside show up here.</Text>
          <Pressable onPress={() => router.replace('/add-friend')} accessibilityRole="button" accessibilityLabel="Add friends" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Add Friends</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      <AppBar title="Train Together" onClose={close} />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.lede}>They’ll get their own copy to log. At the end you’re both credited for training together.</Text>

          <Text style={styles.fieldLabel}>Who</Text>
          <View style={styles.people}>
            {(partners ?? []).map((p) => {
              const on = toId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setToId(on ? null : p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={p.name}
                  style={({ pressed }) => [styles.person, on ? styles.personOn : null, pressed ? styles.pressed : null]}
                >
                  <Avatar name={p.name} src={p.avatarUrl ?? undefined} size={38} />
                  <View style={styles.personBody}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.personSub} numberOfLines={1}>
                      {p.squadName ?? (p.handle ? `@${p.handle}` : 'Friend')}
                    </Text>
                  </View>
                  {on ? <CheckGlyph /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, styles.fieldGap]}>What</Text>

          {planned ? (
            <Pressable
              onPress={() => setSource(source === 'planned' ? 'free' : 'planned')}
              accessibilityRole="button"
              accessibilityState={{ selected: source === 'planned' }}
              accessibilityLabel={`Today's workout: ${planned.name}`}
              style={({ pressed }) => [styles.option, source === 'planned' ? styles.optionOn : null, pressed ? styles.pressed : null]}
            >
              <View style={styles.optionBody}>
                <Text style={styles.optionTitle}>{planned.name}</Text>
                <Text style={styles.optionSub}>
                  Today’s workout · {planned.exercises.length} {planned.exercises.length === 1 ? 'lift' : 'lifts'}
                </Text>
              </View>
              {source === 'planned' ? <CheckGlyph /> : null}
            </Pressable>
          ) : null}

          {(templates ?? []).length > 0 ? (
            <>
              <Text style={styles.fieldHint}>Or a saved template.</Text>
              <View style={styles.chipRow}>
                {(templates ?? []).map((t) => {
                  const on = source === 'template' && templateId === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        if (on) {
                          setSource('free');
                          setTemplateId(null);
                        } else {
                          setSource('template');
                          setTemplateId(t.id);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${t.name}, ${templateSummary(t)}`}
                      style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, pressed ? styles.pressed : null]}
                    >
                      <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{t.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={styles.fieldHint}>
            {source === 'free' ? 'Or just name it and build it as you go together.' : 'Rename it if you want.'}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={sourceName || 'Legs, Push Day, whatever you’re calling it'}
            placeholderTextColor={flColor.gray600}
            style={styles.input}
            accessibilityLabel="Workout name"
            maxLength={60}
          />

          <Text style={[styles.fieldLabel, styles.fieldGap]}>A line, if you want</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Leg day together before the weekend?"
            placeholderTextColor={flColor.gray600}
            style={[styles.input, styles.inputMulti]}
            multiline
            accessibilityLabel="A note with the invite"
            maxLength={200}
          />

          <View style={styles.send}>
            <Button variant="primary" fullWidth onPress={send} disabled={!canSend} accessibilityLabel="Send the invite">
              {sending ? 'Sending…' : 'Send Invite'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function CheckGlyph({ size = 18, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  pressed: { opacity: 0.88 },

  scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40 },
  lede: { marginBottom: 22, fontSize: 13, lineHeight: 19, color: flColor.gray400 },

  fieldLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  fieldGap: { marginTop: 26 },
  fieldHint: { marginTop: 5, fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },

  people: { marginTop: 10, gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingHorizontal: 14, paddingVertical: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  optionOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  optionBody: { flex: 1, minWidth: 0 },
  optionTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  optionSub: { marginTop: 2, fontSize: 11.5, color: flColor.gray600 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  personOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  personBody: { flex: 1, minWidth: 0 },
  personName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  personSub: { marginTop: 2, fontSize: 11.5, color: flColor.gray600 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 12, fontWeight: '600', color: flColor.gray600 },
  chipTextOn: { color: flColor.bronze300 },

  input: { marginTop: 10, paddingHorizontal: 13, paddingVertical: 11, minHeight: 44, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 13.5, color: flColor.cream100 },
  inputMulti: { minHeight: 76, textAlignVertical: 'top' },

  send: { marginTop: 30 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 8, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
