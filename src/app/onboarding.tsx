import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/forge/composites/Button';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ForgeBrandMark } from '@/components/forge/primitives/icons/HomeIcons';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { Field, Heading, ProgressHeader, SelectTile } from '@/components/onboarding/kit';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { completeOnboarding, isHandleAvailable } from '@/domain/onboarding/service';
import { CHAPTER_SUGGESTIONS, CHAPTER_TITLE_MAX, chapterNameFrom, DEFAULT_CHAPTER_I_TITLE } from '@/domain/legacy/chapter-name';
import { useProfile } from '@/lib/profile';
import { errorMessage } from '@/lib/useQuery';

/**
 * The onboarding route (session, not-onboarded) — a MINIMAL identity ramp (ONB-Amendment-002): Account →
 * Username → Transition, nothing else. Goals / Experience / Equipment / Schedule / Program / Athlete Type
 * are all deferred to opt-in, post-Home surfaces — you answer them only if you want a suggested program
 * (ONB-A2-D1). Answers accumulate in local `data`; nothing persists until "Enter Forge" runs the atomic
 * finish (`completeOnboarding`), which writes athlete_type = Hybrid (the default — type isn't asked) and
 * environment = null (unknown until a program-recommendation flow captures equipment). On success
 * `onboarded_at` flips and the boot router swaps to the app. Welcome/Create/Sign-In are the auth route.
 */
const SETUP: Step[] = ['account', 'username', 'chapter'];
type Step = 'account' | 'username' | 'chapter' | 'transition';
type UStatus = 'idle' | 'short' | 'checking' | 'available' | 'taken';

interface Data {
  name: string;
  sex: 'male' | 'female' | null;
  units: 'imperial' | 'metric';
  username: string;
  /** The TITLE half of Chapter I. Blank means "skipped", which writes the default. */
  chapterTitle: string;
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>('account');
  const [data, setData] = useState<Data>({
    name: '', sex: null, units: 'imperial', username: '', chapterTitle: '',
  });
  const [uStatus, setUStatus] = useState<UStatus>('idle');
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refetch: refetchProfile } = useProfile();
  const patch = (p: Partial<Data>) => setData((d) => ({ ...d, ...p }));

  const idx = SETUP.indexOf(step);
  const next = () => setStep(step === 'chapter' ? 'transition' : SETUP[idx + 1]);
  const back = () => {
    setError(null);
    if (step === 'transition') setStep('chapter');
    else if (idx > 0) setStep(SETUP[idx - 1]);
  };

  /** What Chapter I will be called — one derivation, used by the step, the transition and the finish. */
  const chapterName = chapterNameFrom(data.chapterTitle);

  // ── username availability (debounced live query) ──
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUsername = (raw: string) => {
    const clean = raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    patch({ username: clean });
    if (timer.current) clearTimeout(timer.current);
    if (clean.length < 3) {
      setUStatus(clean.length === 0 ? 'idle' : 'short');
      return;
    }
    setUStatus('checking');
    timer.current = setTimeout(() => {
      isHandleAvailable(clean).then(
        (ok) => setUStatus(ok ? 'available' : 'taken'),
        () => setUStatus('idle'),
      );
    }, 450);
  };

  const onFinish = async () => {
    setFinishing(true);
    setError(null);
    try {
      await completeOnboarding({
        name: data.name,
        handle: data.username.length >= 3 ? data.username : null,
        sex: data.sex ?? 'male',
        photoUri: null, // optional photo picker is a fast-follow
        chapterTitle: data.chapterTitle,
        // Asked on the Account step since onboarding was built, and discarded until now.
        units: data.units,
        // athlete_type defaults to Hybrid (type isn't asked) and environment is null (unknown) — both are
        // deferred to opt-in, post-Home surfaces per ONB-Amendment-002 (ONB-A2-D1).
      });
      // Pull the new onboarded_at so the boot router swaps to the app (it fetched once per session and
      // would otherwise stay stale on this screen — the "stuck on Opening your forge" bug).
      refetchProfile();
    } catch (e) {
      setFinishing(false);
      setError(errorMessage(e));
    }
  };

  return (
    <View style={styles.root}>
      {/* The SAME background as the Home screen — SCREEN_BG.slate + flat rgba(5,5,5,0.15) — across the
          WHOLE onboarding flow, Transition included (supersedes the earlier atmospheric-transition). */}
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />
      {idx >= 0 ? <ProgressHeader step={idx + 1} total={SETUP.length} onBack={idx > 0 || step === 'transition' ? back : undefined} /> : null}

      {step === 'transition' ? (
        <View style={styles.transition}>
          <ForgeBrandMark glow={150} mark={74} />
          <Text style={styles.tEyebrow}>Your forge is ready</Text>
          <Text style={styles.tTitle}>Your next chapter{'\n'}begins now.</Text>
          {/* The athlete's own name for it — this line used to hard-code the string a second time,
              which is how the constant and the copy could ever have disagreed. */}
          <Text style={styles.tBody}>
            We&apos;ve opened <Text style={styles.tAccent}>{chapterName}</Text>. Every legacy begins with a single workout.
          </Text>
          {error ? <Text style={styles.err}>Couldn&apos;t finish — {error}. Try again.</Text> : null}
          <View style={styles.tAction}>
            <Button variant="primary" fullWidth disabled={finishing} onPress={onFinish} accessibilityLabel="Enter Forge">
              {finishing ? 'Opening your forge…' : 'Enter Forge'}
            </Button>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 'account' ? (
            <>
              <Heading eyebrow="Create your account" title="Claim your name" body="This is the name on your record and above every honor you earn." />
              <View style={styles.avatarRow}>
                <Avatar name={data.name || '  '} size="profile" ring />
                <Text style={styles.optional}>Add a photo — optional (add it later in Profile)</Text>
              </View>
              <Field label="Your name" placeholder="e.g. Marcus Vale" maxLength={24} showCount value={data.name} onChangeText={(t) => patch({ name: t.replace(/^\s+/, '') })} />
              <Group label="Sex" hint="Used to tailor your starting training load.">
                <View style={styles.tileRow}>
                  <SelectTile fill title="Male" selected={data.sex === 'male'} onPress={() => patch({ sex: 'male' })} />
                  <SelectTile fill title="Female" selected={data.sex === 'female'} onPress={() => patch({ sex: 'female' })} />
                </View>
              </Group>
              <Group label="Units" hint="Weights, distance and pace across the app — change anytime in Settings.">
                <View style={styles.tileRow}>
                  <SelectTile fill title="Lbs" selected={data.units === 'imperial'} onPress={() => patch({ units: 'imperial' })} />
                  <SelectTile fill title="Kgs" selected={data.units === 'metric'} onPress={() => patch({ units: 'metric' })} />
                </View>
              </Group>
              <Continue disabled={!(data.name.trim() && data.sex)} onPress={next} />
            </>
          ) : null}

          {step === 'username' ? (
            <>
              <Heading eyebrow="Create your account" title="Claim your handle" body="Your name is what people see. Your handle is how they find and tag you across Forge — it's yours alone." />
              <View style={styles.handleRow}>
                <Text style={styles.at}>@</Text>
                <Field label="Username" placeholder="marcusvale" autoCapitalize="none" autoCorrect={false} value={data.username} onChangeText={onUsername} />
              </View>
              <UsernameStatus status={uStatus} username={data.username} />
              <View style={styles.previewCard}>
                <Avatar name={data.name || '  '} size="listRow" />
                <View>
                  <Text style={styles.previewName}>{data.name || 'Your name'}</Text>
                  <Text style={styles.previewHandle}>@{data.username || 'yourhandle'}</Text>
                </View>
              </View>
              <Continue disabled={uStatus !== 'available'} onPress={next} />
              <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Skip for now" style={styles.skip}>
                <Text style={styles.skipText}>Skip for now</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'chapter' ? (
            <>
              <Heading
                eyebrow="Your first chapter"
                title="Name this season"
                body="A chapter is a stretch of training you'll one day seal and look back on — a few months, a comeback, a year. Everything you log lands inside the one that's open. Give this one a name that means something to you."
              />
              <Field
                label="Chapter I"
                placeholder={DEFAULT_CHAPTER_I_TITLE}
                maxLength={CHAPTER_TITLE_MAX}
                showCount
                value={data.chapterTitle}
                onChangeText={(t) => patch({ chapterTitle: t.replace(/^\s+/, '') })}
              />
              <Group label="Or start from one of these">
                <View style={styles.suggestRow}>
                  {CHAPTER_SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => patch({ chapterTitle: s })}
                      accessibilityRole="button"
                      accessibilityLabel={`Use "${s}"`}
                      style={({ pressed }) => [styles.suggestChip, data.chapterTitle === s ? styles.suggestChipOn : null, pressed ? styles.suggestChipPressed : null]}
                    >
                      <Text style={[styles.suggestText, data.chapterTitle === s ? styles.suggestTextOn : null]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </Group>
              {/* Shown assembled, because "Chapter I — " is prepended for them and they should see it
                  before committing rather than discover it on the Home hero. */}
              <View style={styles.chapterPreview}>
                <Text style={styles.chapterPreviewLabel}>Your record will open with</Text>
                <Text style={styles.chapterPreviewName}>{chapterName}</Text>
              </View>
              <Continue onPress={next} />
              <Pressable onPress={() => { patch({ chapterTitle: '' }); next(); }} accessibilityRole="button" accessibilityLabel="Skip and use the default name" style={styles.skip}>
                <Text style={styles.skipText}>Skip — you can rename it any time</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

// ── local pieces ──
function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.groupHint}>{hint}</Text> : null}
    </View>
  );
}
function Continue({ disabled, onPress, label }: { disabled?: boolean; onPress: () => void; label?: string }) {
  return (
    <View style={styles.continue}>
      <Button variant="primary" fullWidth disabled={disabled} onPress={onPress} accessibilityLabel={label ?? 'Continue'}>
        {label ?? 'Continue'}
      </Button>
    </View>
  );
}
function UsernameStatus({ status, username }: { status: UStatus; username: string }) {
  const map: Record<UStatus, { text: string; color: string }> = {
    idle: { text: '', color: flColor.gray600 },
    short: { text: 'At least 3 characters.', color: flColor.gray400 },
    checking: { text: 'Checking availability…', color: flColor.gray400 },
    available: { text: `@${username} is available.`, color: flColor.greenMuted },
    taken: { text: `@${username} is already taken.`, color: flColor.redMuted },
  };
  const m = map[status];
  return m.text ? <Text style={[styles.uStatus, { color: m.color }]}>{m.text}</Text> : <View style={styles.uStatusGap} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 30, paddingTop: 4, paddingBottom: 40, gap: 22 },
  continue: { marginTop: 8 },

  avatarRow: { alignItems: 'center', gap: 10, paddingVertical: 6 },
  optional: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },

  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed },
  suggestChipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  suggestChipPressed: { opacity: 0.7 },
  suggestText: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  suggestTextOn: { color: flColor.bronze300, fontWeight: '600' },
  chapterPreview: { gap: 6, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  chapterPreviewLabel: { fontFamily: flFont.sans, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  chapterPreviewName: { fontFamily: flFont.display, fontSize: 18, lineHeight: 24, color: flColor.cream100 },

  group: { gap: 8 },
  groupLabel: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  groupHint: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },
  tileRow: { flexDirection: 'row', gap: 10 },

  handleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  at: { fontFamily: flFont.display, fontSize: 20, color: flColor.bronze400, paddingBottom: 12 },
  uStatus: { fontFamily: flFont.sans, fontSize: 13 },
  uStatusGap: { height: 18 },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  previewName: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  previewHandle: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600, marginTop: 1 },
  skip: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },

  transition: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, gap: 20 },
  tEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center' },
  tTitle: { fontFamily: flFont.display, fontSize: 34, fontWeight: '600', lineHeight: 40, color: flColor.cream100, textAlign: 'center' },
  tBody: { fontFamily: flFont.sans, fontSize: 15, lineHeight: 23, color: flColor.gray400, textAlign: 'center' },
  tAccent: { color: flColor.bronze400, fontWeight: '600' },
  tAction: { alignSelf: 'stretch', marginTop: 8 },

  err: { fontFamily: flFont.sans, fontSize: 13, color: flColor.redMuted },
});
