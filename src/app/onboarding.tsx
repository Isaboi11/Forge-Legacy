import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/forge/composites/Button';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Pill } from '@/components/forge/composites/Pill';
import { ForgeBrandMark } from '@/components/forge/primitives/icons/HomeIcons';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { Field, Heading, ProgressHeader, SelectTile } from '@/components/onboarding/kit';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import type { EquipmentId, GoalId } from '@/domain/onboarding/derive';
import { recommendProgram, type ProgramView } from '@/domain/onboarding/recommend';
import { completeOnboarding, isHandleAvailable } from '@/domain/onboarding/service';
import { useProfile } from '@/lib/profile';

/**
 * The onboarding route (session, not-onboarded) — the design `.dc`'s setup flow, Account → Transition.
 * Answers accumulate in local `data` (journey-state, ONB-D2); nothing persists until "Enter Forge" runs
 * the atomic finish (`completeOnboarding`). On success `onboarded_at` flips and the boot router swaps to
 * the app. The Welcome/Create-Account/Sign-In screens are the auth route, reached before this.
 */
const SETUP: Step[] = ['account', 'username', 'goals', 'experience', 'equipment', 'schedule', 'program'];
type Step = 'account' | 'username' | 'goals' | 'experience' | 'equipment' | 'schedule' | 'program' | 'transition';
type UStatus = 'idle' | 'short' | 'checking' | 'available' | 'taken';

const GOALS: { id: GoalId; label: string; desc: string }[] = [
  { id: 'muscle', label: 'Build Muscle', desc: 'Add visible size and shape.' },
  { id: 'strength', label: 'Get Stronger', desc: 'Move heavier weight. Build raw power.' },
  { id: 'fatloss', label: 'Lose Fat', desc: 'Lean out while keeping your strength.' },
  { id: 'endurance', label: 'Improve Endurance', desc: 'Go longer. Build your engine and stamina.' },
  { id: 'health', label: 'General Health', desc: 'Feel good, move well, stay strong for life.' },
  { id: 'athletic', label: 'Athletic Performance', desc: 'Power, speed, and conditioning together.' },
];
const EXPERIENCE = [
  { id: 'beginner', mark: 'I', label: 'Beginner', desc: 'New to training, or back after a long break.' },
  { id: 'intermediate', mark: 'II', label: 'Intermediate', desc: 'A year or two in. Comfortable under the bar.' },
  { id: 'advanced', mark: 'III', label: 'Advanced', desc: 'Years of consistent, structured training.' },
];
const EQUIPMENT: { id: EquipmentId; label: string; desc: string }[] = [
  { id: 'fullgym', label: 'Full Gym', desc: 'Barbells, machines, the full floor.' },
  { id: 'homegym', label: 'Home Gym', desc: 'A dedicated setup of your own.' },
  { id: 'dumbbells', label: 'Dumbbells', desc: 'A pair or an adjustable set.' },
  { id: 'bands', label: 'Bands', desc: 'Resistance bands, minimal space.' },
  { id: 'bodyweight', label: 'Bodyweight', desc: 'No equipment. Train anywhere.' },
];
const DAYS_COPY: Record<number, string> = {
  2: 'Two full-body sessions a week — the minimum that still moves the needle, with plenty of recovery.',
  3: 'Three days gives you real recovery while building genuine consistency.',
  4: 'Four days lets us split your training and push meaningful volume.',
  5: 'Five days is serious frequency — momentum you can feel.',
  6: 'Six days is high volume. Recovery becomes part of the discipline.',
};

interface Data {
  name: string;
  sex: 'male' | 'female' | null;
  units: 'imperial' | 'metric';
  username: string;
  goals: GoalId[];
  primaryGoal: GoalId | null;
  experience: string | null;
  equipment: EquipmentId[];
  days: number;
  chosenProgramId: string | null;
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>('account');
  const [data, setData] = useState<Data>({
    name: '', sex: null, units: 'imperial', username: '', goals: [], primaryGoal: null,
    experience: null, equipment: [], days: 4, chosenProgramId: null,
  });
  const [uStatus, setUStatus] = useState<UStatus>('idle');
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refetch: refetchProfile } = useProfile();
  const patch = (p: Partial<Data>) => setData((d) => ({ ...d, ...p }));

  const idx = SETUP.indexOf(step);
  const next = () => setStep(step === 'program' ? 'transition' : SETUP[idx + 1]);
  const back = () => {
    setError(null);
    if (step === 'transition') setStep('program');
    else if (idx > 0) setStep(SETUP[idx - 1]);
  };

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

  const toggleGoal = (id: GoalId) => {
    setData((d) => {
      const has = d.goals.includes(id);
      if (has) {
        const goals = d.goals.filter((g) => g !== id);
        return { ...d, goals, primaryGoal: d.primaryGoal === id ? (goals[0] ?? null) : d.primaryGoal };
      }
      if (d.goals.length >= 3) return d; // cap at 3
      return { ...d, goals: [...d.goals, id], primaryGoal: d.primaryGoal ?? id };
    });
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
        primaryGoal: data.primaryGoal,
        equipment: data.equipment,
      });
      // Pull the new onboarded_at so the boot router swaps to the app (it fetched once per session and
      // would otherwise stay stale on this screen — the "stuck on Opening your forge" bug).
      refetchProfile();
    } catch (e) {
      setFinishing(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const rec: ProgramView | null = step === 'program' ? recommendProgram({ experience: data.experience }) : null;

  return (
    <View style={styles.root}>
      {/* Form screens: the shared slate base — the .dc device-frame texture (forge-slate.png darkened on
          #050505). The Transition keeps the atmospheric steel base — the .dc uses --fl-bg-atmospheric
          there (opaque steel, not slate), per your earlier transition=atmospheric ruling. */}
      {step === 'transition' ? (
        <ScreenBackground atmospheric />
      ) : (
        <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.3)' }} />
      )}
      {idx >= 0 ? <ProgressHeader step={idx + 1} total={SETUP.length} onBack={idx > 0 || step === 'transition' ? back : undefined} /> : null}

      {step === 'transition' ? (
        <View style={styles.transition}>
          <ForgeBrandMark glow={150} mark={74} />
          <Text style={styles.tEyebrow}>Your forge is ready</Text>
          <Text style={styles.tTitle}>Your next chapter{'\n'}begins now.</Text>
          <Text style={styles.tBody}>
            We&apos;ve opened <Text style={styles.tAccent}>Chapter I — Building Your Foundation</Text>. Every legacy begins with a single workout.
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
                  <SelectTile fill title="Imperial" selected={data.units === 'imperial'} onPress={() => patch({ units: 'imperial' })} />
                  <SelectTile fill title="Metric" selected={data.units === 'metric'} onPress={() => patch({ units: 'metric' })} />
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

          {step === 'goals' ? (
            <>
              <Heading title="What are you training for?" body="Choose up to three. Tap the star to set the one that matters most — your primary goal shapes what we recommend." />
              <View style={styles.stack}>
                {GOALS.map((g) => (
                  <SelectTile
                    key={g.id}
                    title={g.label}
                    desc={g.desc}
                    selected={data.goals.includes(g.id)}
                    onPress={() => toggleGoal(g.id)}
                    right={
                      data.goals.includes(g.id) ? (
                        <Pressable onPress={() => patch({ primaryGoal: g.id })} accessibilityRole="button" accessibilityLabel={`Set ${g.label} as primary`} hitSlop={8}>
                          <StarIcon filled={data.primaryGoal === g.id} />
                        </Pressable>
                      ) : undefined
                    }
                  />
                ))}
              </View>
              <Continue disabled={data.goals.length === 0} onPress={next} />
            </>
          ) : null}

          {step === 'experience' ? (
            <>
              <Heading title="How much have you trained?" body="This tunes your starting load and difficulty — nothing else. Everyone builds their legacy the same way." />
              <View style={styles.stack}>
                {EXPERIENCE.map((e) => (
                  <SelectTile key={e.id} mark={e.mark} title={e.label} desc={e.desc} selected={data.experience === e.id} onPress={() => patch({ experience: e.id })} />
                ))}
              </View>
              <Continue disabled={!data.experience} onPress={next} />
            </>
          ) : null}

          {step === 'equipment' ? (
            <>
              <Heading title="What can you train with?" body="Pick everything you have access to — we only program movements you can actually do." />
              <View style={styles.stack}>
                {EQUIPMENT.map((eq) => (
                  <SelectTile
                    key={eq.id}
                    title={eq.label}
                    desc={eq.desc}
                    selected={data.equipment.includes(eq.id)}
                    onPress={() =>
                      patch({ equipment: data.equipment.includes(eq.id) ? data.equipment.filter((x) => x !== eq.id) : [...data.equipment, eq.id] })
                    }
                  />
                ))}
              </View>
              <Continue disabled={data.equipment.length === 0} onPress={next} />
            </>
          ) : null}

          {step === 'schedule' ? (
            <>
              <Heading title="How many days a week?" body="Be honest about your week — consistency beats ambition. We build around it." />
              <View style={styles.daysRow}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <Pressable key={n} onPress={() => patch({ days: n })} accessibilityRole="button" accessibilityLabel={`${n} days`} style={[styles.dayTile, data.days === n && styles.dayTileOn]}>
                    <Text style={[styles.dayNum, data.days === n && styles.dayNumOn]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.daysHint}>{DAYS_COPY[data.days]}</Text>
              <Continue onPress={next} />
            </>
          ) : null}

          {step === 'program' && rec ? (
            <>
              <Heading eyebrow="Forge recommends" title="Where your legacy begins" body="Matched to your goal, experience, equipment, and schedule. It's a place to begin — never a cage." />
              <View style={styles.programCard}>
                <View style={styles.programPills}>
                  <Pill>{rec.family}</Pill>
                  <Pill>{rec.difficulty}</Pill>
                </View>
                <Text style={styles.programLabel}>Your starting program</Text>
                <Text style={styles.programName}>{rec.name}</Text>
                <Text style={styles.programDesc} numberOfLines={3}>
                  {rec.description}
                </Text>
                <View style={styles.programStats}>
                  <Stat n={rec.weeks} label="Weeks" />
                  <Stat n={`${rec.perWeek}×`} label="Per week" />
                  <Stat n={rec.workouts} label="Workouts" />
                </View>
              </View>
              <Text style={styles.changeHint}>You can change this any time.</Text>
              <Continue label={`Start ${rec.name.length <= 18 ? rec.name : 'this program'}`} onPress={next} />
              {/* Skip the recommendation — advances to the same finish (program is non-persisted), so this
                  lands on the identical Chapter I / awaiting-Home as Start. "Build your own" is deferred to
                  an awaiting-Home CTA (next unit). */}
              <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Skip for now" style={styles.skip}>
                <Text style={styles.skipText}>Skip for now</Text>
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
function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={filled ? flColor.bronze400 : 'none'} stroke={filled ? flColor.bronze400 : flColor.gray600} strokeWidth={1.6} strokeLinejoin="round">
      <Path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.4 6.2 21.4l1.1-6.5L2.6 9.8l6.5-.9z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 30, paddingTop: 4, paddingBottom: 40, gap: 22 },
  continue: { marginTop: 8 },

  avatarRow: { alignItems: 'center', gap: 10, paddingVertical: 6 },
  optional: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },

  group: { gap: 8 },
  groupLabel: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  groupHint: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },
  tileRow: { flexDirection: 'row', gap: 10 },
  stack: { gap: 10 },

  handleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  at: { fontFamily: flFont.display, fontSize: 20, color: flColor.bronze400, paddingBottom: 12 },
  uStatus: { fontFamily: flFont.sans, fontSize: 13 },
  uStatusGap: { height: 18 },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  previewName: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  previewHandle: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600, marginTop: 1 },
  skip: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },

  daysRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  dayTile: { flex: 1, aspectRatio: 1, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, alignItems: 'center', justifyContent: 'center' },
  dayTileOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  dayNum: { fontFamily: flFont.display, fontSize: 22, color: flColor.gray400 },
  dayNumOn: { color: flColor.cream100 },
  daysHint: { fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },

  programCard: { padding: 20, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, gap: 10 },
  programPills: { flexDirection: 'row', gap: 8 },
  programLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 2 },
  programName: { fontFamily: flFont.display, fontSize: 21, color: flColor.cream100 },
  programDesc: { fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 20, color: flColor.gray400 },
  programStats: { flexDirection: 'row', gap: 26, marginTop: 6 },
  stat: { gap: 2 },
  statN: { fontFamily: flFont.display, fontSize: 20, color: flColor.cream100 },
  statLabel: { fontFamily: flFont.sans, fontSize: 11, letterSpacing: 0.4, color: flColor.gray600 },
  changeHint: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600, textAlign: 'center' },

  transition: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, gap: 20 },
  tEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center' },
  tTitle: { fontFamily: flFont.display, fontSize: 34, fontWeight: '600', lineHeight: 40, color: flColor.cream100, textAlign: 'center' },
  tBody: { fontFamily: flFont.sans, fontSize: 15, lineHeight: 23, color: flColor.gray400, textAlign: 'center' },
  tAccent: { color: flColor.bronze400, fontWeight: '600' },
  tAction: { alignSelf: 'stretch', marginTop: 8 },

  err: { fontFamily: flFont.sans, fontSize: 13, color: flColor.redMuted },
});
