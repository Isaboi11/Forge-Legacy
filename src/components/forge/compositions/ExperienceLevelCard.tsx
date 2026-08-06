import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/forge/composites/Button';
import { BarbellIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { programGymCoverage, recommendProgramOptions, type ProgramView } from '@/domain/onboarding/recommend';
import type { GoalId, EquipmentId } from '@/domain/onboarding/derive';
import type { HomeLevel } from '@/lib/home-level';
import type { HomeIntake } from '@/lib/home-intake';
import { quickPickItems } from '@/domain/home-gym/equipment';

/**
 * ExperienceLevelCard — the opt-in personalization on-ramp on Home (ONB-Amendment-002). ONE card, rendered
 * ALONE (Home never stacks it with FirstSessionCard). Built to `Forge Starting Point Card.dc.html`
 * (Design b029488a): the forged hero shell + engraved 76px medallion + recessed rows.
 *
 *  • mode="collect" — a local 3-step intake stepper: LEVEL → GOALS (≤3, one primary) → EQUIPMENT (multi).
 *    All state is component-local; nothing persists until the final "See my program" → onComplete.
 *  • mode="suggested" — the recommended starting program for the collected intake (via `recommendProgram`),
 *    a Start Training primary, an "Explore everything" exit, and a quiet "Change" (re-ask).
 *
 * Honest notes: with only SF I + SF II authored, most intakes resolve to one of those two — the goal ×
 * experience × equipment mechanism is real (see recommend-core.ts), the catalog is thin. "Start Training"
 * runs the existing demo logger (no per-program enrollment — W-3/BU-1 deferred).
 */

export type IntakeResult = {
  level: HomeLevel;
  goals: GoalId[];
  primaryGoal: GoalId | null;
  equipment: EquipmentId[];
  /** Quick-picked Home Gym seed — only present when they said "Home Gym" and didn't skip the step. */
  homeGym?: string[];
};

const LEVELS: HomeLevel[] = ['new', 'training', 'experienced'];

const LEVEL_META: Record<HomeLevel, { mark: string; title: string; subtitle: string; because: string }> = {
  new: { mark: 'I', title: 'New to this', subtitle: 'New to training, or coming back.', because: "you're new to this" },
  training: { mark: 'II', title: 'Been training a while', subtitle: 'Comfortable and consistent.', because: "you've been training a while" },
  experienced: { mark: 'III', title: 'Very experienced', subtitle: 'Years of structured training.', because: "you're very experienced" },
};

/** The Home level ids map onto `recommendProgram`'s experience ids. */
export const EXPERIENCE_FOR: Record<HomeLevel, 'beginner' | 'intermediate' | 'advanced'> = {
  new: 'beginner',
  training: 'intermediate',
  experienced: 'advanced',
};

/** Goal + equipment copy — verbatim from the design's Onboarding `.dc` Goals/Equipment screens. */
const GOALS: { id: GoalId; title: string; subtitle: string }[] = [
  { id: 'muscle', title: 'Build Muscle', subtitle: 'Add visible size and shape.' },
  { id: 'strength', title: 'Get Stronger', subtitle: 'Move heavier weight. Build raw power.' },
  { id: 'fatloss', title: 'Lose Fat', subtitle: 'Lean out while keeping your strength.' },
  { id: 'endurance', title: 'Improve Endurance', subtitle: 'Go longer. Build your engine and stamina.' },
  { id: 'health', title: 'General Health', subtitle: 'Feel good, move well, stay strong for life.' },
  { id: 'athletic', title: 'Athletic Performance', subtitle: 'Power, speed, and conditioning together.' },
];
const EQUIPMENT: { id: EquipmentId; title: string; subtitle: string }[] = [
  { id: 'fullgym', title: 'Full Gym', subtitle: 'Barbells, machines, the full floor.' },
  { id: 'homegym', title: 'Home Gym', subtitle: 'A dedicated setup of your own.' },
  { id: 'dumbbells', title: 'Dumbbells', subtitle: 'A pair or an adjustable set.' },
  { id: 'bands', title: 'Bands', subtitle: 'Resistance bands, minimal space.' },
  { id: 'bodyweight', title: 'Bodyweight', subtitle: 'No equipment. Train anywhere.' },
];

/** The forged hero shell — charcoal-900 + bronze border + radial card-hero wash + hero shadow. */
function HeroShell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="spc-wash" cx="50%" cy="0%" rx="120%" ry="90%">
            <Stop offset="0" stopColor="rgb(186,134,84)" stopOpacity={0.16} />
            <Stop offset="0.62" stopColor="rgb(186,134,84)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#spc-wash)" />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/** The engraved 76px medallion — bronze-metallic ring → recessed inner → dumbbell (mirrors FirstProgramCard). */
function Medallion() {
  return (
    <LinearGradient
      colors={flGradient.bronzeMetallic.colors}
      locations={flGradient.bronzeMetallic.locations}
      start={flGradient.bronzeMetallic.start}
      end={flGradient.bronzeMetallic.end}
      style={styles.medallionRing}
    >
      <View style={styles.medallionInner}>
        <BarbellIcon size={32} color={flColor.bronze300} />
      </View>
    </LinearGradient>
  );
}

/** Compact "Step N of M" + back chevron. M is 4 only when the home-gym quick-picker is in play. */
function StepHeader({ step, total = 3, onBack }: { step: number; total?: number; onBack: () => void }) {
  return (
    <View style={styles.stepHeader}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M15 18l-6-6 6-6" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <Text style={styles.stepLabel}>Step {step} of {total}</Text>
    </View>
  );
}

/** A recessed level row — roman numeral · title · subtitle · chevron (tap advances). */
function LevelRow({ mark, title, subtitle, onPress }: { mark: string; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={styles.rowOuter}>
      <View style={styles.romanSlot}>
        <Text style={styles.roman}>{mark}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** A recessed multi-select row (goals/equipment) — bronze edge when selected + a right indicator. */
function OptionRow({ title, subtitle, selected, onPress, right }: { title: string; subtitle: string; selected: boolean; onPress: () => void; right?: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={[styles.rowOuter, selected && styles.rowOuterSel]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      {right ?? <View style={styles.rightSlot} />}
    </Pressable>
  );
}

/** Primary-goal star — filled bronze on the primary, outline on other selected goals. */
function StarButton({ filled, onPress }: { filled: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={filled ? 'Main focus' : 'Make main focus'} style={styles.rightSlot}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill={filled ? flColor.bronze300 : 'none'} stroke={filled ? flColor.bronze300 : flColor.gray400} strokeWidth={1.5} strokeLinejoin="round">
        <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </Svg>
    </Pressable>
  );
}

/** Equipment multi-select checkbox. */
function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? (
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
          <Path d="M20 6L9 17l-5-5" stroke={flColor.base} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

type Props =
  | { mode: 'collect'; onComplete: (r: IntakeResult) => void; onBuild: () => void }
  | {
      mode: 'suggested';
      level: HomeLevel;
      intake: HomeIntake | null;
      /** The athlete's Home Gym, when they've built one — refines the tier and shows real coverage. */
      homeGym?: readonly string[] | null;
      /** Receives the chosen program's catalog id — the recommendation OR an alternate. */
      onStart: (programId: string) => void;
      onExplore: () => void;
      onChange: () => void;
    };

export function ExperienceLevelCard(props: Props) {
  if (props.mode === 'collect') return <IntakeStepper onComplete={props.onComplete} onBuild={props.onBuild} />;
  return <SuggestedFace level={props.level} intake={props.intake} homeGym={props.homeGym ?? null} onStart={props.onStart} onExplore={props.onExplore} onChange={props.onChange} />;
}

/** The level → goals → equipment stepper (component-local state; persists only at the end). */
function IntakeStepper({ onComplete, onBuild }: { onComplete: (r: IntakeResult) => void; onBuild: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [level, setLevel] = useState<HomeLevel | null>(null);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState<GoalId | null>(null);
  const [equipment, setEquipment] = useState<EquipmentId[]>([]);
  const [gym, setGym] = useState<string[]>([]);

  // Anyone NOT training in a full commercial gym is training on their own equipment — dumbbells, bands
  // and bodyweight are home setups too, and a pull-up bar changes what a bodyweight athlete can be
  // prescribed. Gating this on the exact "Home Gym" answer meant most athletes never got asked.
  // Only someone with a full gym skips it: their access isn't described by what they own.
  const wantsGym = equipment.length > 0 && !equipment.includes('fullgym');
  const totalSteps = wantsGym ? 4 : 3;
  const finish = (homeGym?: string[]) => {
    if (level) onComplete({ level, goals, primaryGoal, equipment, ...(homeGym ? { homeGym } : {}) });
  };

  const pickLevel = (l: HomeLevel) => {
    setLevel(l);
    setStep(1);
  };

  const toggleGoal = (g: GoalId) => {
    if (goals.includes(g)) {
      const next = goals.filter((x) => x !== g);
      setGoals(next);
      if (primaryGoal === g) setPrimaryGoal(next[0] ?? null);
    } else if (goals.length < 3) {
      setGoals([...goals, g]);
      if (primaryGoal === null) setPrimaryGoal(g);
    }
    // a 4th pick is silently refused (≤3)
  };

  const toggleEquip = (e: EquipmentId) => {
    setEquipment(equipment.includes(e) ? equipment.filter((x) => x !== e) : [...equipment, e]);
  };

  // ── step 1: level (the approved Starting Point Card) ──
  if (step === 0) {
    return (
      <HeroShell>
        <Medallion />
        <Text style={styles.title}>Want us to point you somewhere?</Text>
        <Text style={styles.subline}>
          Tell us roughly where you&apos;re at and we&apos;ll suggest a starting program — change it anytime.
        </Text>
        <View style={styles.rows}>
          {LEVELS.map((l) => (
            <LevelRow key={l} mark={LEVEL_META[l].mark} title={LEVEL_META[l].title} subtitle={LEVEL_META[l].subtitle} onPress={() => pickLevel(l)} />
          ))}
        </View>
        <View style={styles.buttonWrap}>
          <Button variant="secondary" fullWidth onPress={onBuild} accessibilityLabel="Build my own program">
            Build my own program
          </Button>
        </View>
      </HeroShell>
    );
  }

  // ── step 2: goals (≤3, one primary) ──
  if (step === 1) {
    return (
      <HeroShell>
        <StepHeader step={2} onBack={() => setStep(0)} />
        <Medallion />
        <Text style={styles.title}>What are you working toward?</Text>
        <Text style={styles.subline}>Pick up to three. Your first is your main focus — tap a star to change it.</Text>
        <View style={styles.rows}>
          {GOALS.map((g) => {
            const selected = goals.includes(g.id);
            return (
              <OptionRow
                key={g.id}
                title={g.title}
                subtitle={g.subtitle}
                selected={selected}
                onPress={() => toggleGoal(g.id)}
                right={selected ? <StarButton filled={primaryGoal === g.id} onPress={() => setPrimaryGoal(g.id)} /> : undefined}
              />
            );
          })}
        </View>
        <View style={styles.buttonWrap}>
          <Button variant="primary" fullWidth disabled={goals.length === 0} onPress={() => setStep(2)} accessibilityLabel="Continue to equipment">
            Continue
          </Button>
        </View>
      </HeroShell>
    );
  }

  // ── step 4: the home-gym quick-picker (only when they said "Home Gym") ──
  // Ten common items, not the full 32. The copy has to say that out loud: an athlete who thinks this
  // is the whole vocabulary will assume the app has never heard of their trap bar. Skipping leaves the
  // profile UNSET rather than empty — "I didn't answer" and "I own nothing" are different answers.
  if (step === 3) {
    return (
      <HeroShell>
        <StepHeader step={4} total={4} onBack={() => setStep(2)} />
        <Medallion />
        <Text style={styles.title}>What do you own?</Text>
        <Text style={styles.subline}>
          Just the big pieces for now — you can add the rest anytime in Settings. Bodyweight is always
          included, so it&apos;s fine to skip.
        </Text>
        <View style={styles.rows}>
          {quickPickItems().map((item) => {
            const selected = gym.includes(item.id);
            return (
              <OptionRow
                key={item.id}
                title={item.label}
                subtitle={item.hint}
                selected={selected}
                onPress={() => setGym(selected ? gym.filter((x) => x !== item.id) : [...gym, item.id])}
                right={<CheckBox checked={selected} />}
              />
            );
          })}
        </View>
        <View style={styles.buttonWrap}>
          <Button variant="primary" fullWidth disabled={level === null} onPress={() => finish(gym)} accessibilityLabel="See my program">
            See my program
          </Button>
          <Pressable onPress={() => finish()} accessibilityRole="button" accessibilityLabel="Skip for now" style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </HeroShell>
    );
  }

  // ── step 3: equipment (multi) ──
  return (
    <HeroShell>
      <StepHeader step={3} total={totalSteps} onBack={() => setStep(1)} />
      <Medallion />
      <Text style={styles.title}>What do you train with?</Text>
      <Text style={styles.subline}>Select everything you can use — we&apos;ll match a program to it.</Text>
      <View style={styles.rows}>
        {EQUIPMENT.map((e) => {
          const selected = equipment.includes(e.id);
          return (
            <OptionRow key={e.id} title={e.title} subtitle={e.subtitle} selected={selected} onPress={() => toggleEquip(e.id)} right={<CheckBox checked={selected} />} />
          );
        })}
      </View>
      <View style={styles.buttonWrap}>
        <Button
          variant="primary"
          fullWidth
          disabled={equipment.length === 0 || level === null}
          onPress={() => (wantsGym ? setStep(3) : finish())}
          accessibilityLabel={wantsGym ? 'Continue to your gym' : 'See my program'}
        >
          {wantsGym ? 'Continue' : 'See my program'}
        </Button>
      </View>
    </HeroShell>
  );
}

/** The recommended-program face for the collected intake. */
function SuggestedFace({
  level,
  intake,
  homeGym,
  onStart,
  onExplore,
  onChange,
}: {
  level: HomeLevel;
  intake: HomeIntake | null;
  homeGym: readonly string[] | null;
  onStart: (programId: string) => void;
  onExplore: () => void;
  onChange: () => void;
}) {
  const meta = LEVEL_META[level];
  const options = recommendProgramOptions({
    experience: EXPERIENCE_FOR[level],
    primaryGoal: intake?.primaryGoal ?? null,
    equipment: intake?.equipment ?? [],
    homeGym,
  });
  const [rec, ...alternates] = options;
  // Only shown when there's a real profile AND something is genuinely missing. "You can train all of
  // it" is the expected case, and saying so every time is noise dressed up as reassurance.
  const cov = programGymCoverage(rec.id, homeGym);
  const gap = cov && cov.total > 0 && cov.doable < cov.total ? cov : null;
  const line = (p: ProgramView) => [p.family, p.difficulty, p.weeks ? `${p.weeks} weeks` : null].filter(Boolean).join(' · ');

  return (
    <HeroShell>
      <Medallion />
      <Text style={styles.eyebrow}>Suggested for you</Text>
      <Text style={styles.progName}>{rec.name}</Text>
      {line(rec) ? <Text style={styles.metaLine}>{line(rec)}</Text> : null}
      <Text style={styles.because}>Because {meta.because}.</Text>
      {gap ? (
        <Text style={styles.gymGap}>
          Your gym covers {gap.doable} of {gap.total} movements — you&apos;ll need to swap{' '}
          {gap.missing.slice(0, 2).join(' and ')}
          {gap.missing.length > 2 ? ` and ${gap.missing.length - 2} more` : ''}.
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button variant="primary" fullWidth onPress={() => onStart(rec.id)} accessibilityLabel={`Start ${rec.name}`}>
          Start Training
        </Button>

        {/* Alternates are offered, not ranked — see `recommendProgramOptions`. Starting one is the same
            commitment as starting the recommendation, so they get the same weight of control. */}
        {alternates.length > 0 ? (
          <View style={styles.alternates}>
            <Text style={styles.alternatesLabel}>Or start one of these</Text>
            {alternates.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onStart(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`Start ${p.name}`}
                style={styles.altRow}
              >
                <View style={styles.altText}>
                  <Text style={styles.altName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.altMeta} numberOfLines={1}>{line(p)}</Text>
                </View>
                <Text style={styles.altStart}>Start</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Button variant="secondary" fullWidth onPress={onExplore} accessibilityLabel="Explore everything — see all programs">
          Explore everything
        </Button>
        <Pressable onPress={onChange} accessibilityRole="button" accessibilityLabel="Change your answers" style={styles.change}>
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      </View>
    </HeroShell>
  );
}

const styles = StyleSheet.create({
  // forged hero shell — mirrors FirstProgramCard / TodaysWorkoutCard
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.missionCard,
    paddingTop: 30,
    paddingHorizontal: 26,
    paddingBottom: 26,
  },
  content: { position: 'relative', zIndex: 1 },

  gymGap: { fontSize: 12, lineHeight: 18, color: flColor.gray400, textAlign: 'center', marginTop: 8 },

  skipBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  skipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },

  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },

  // engraved medallion (76px)
  medallionRing: {
    alignSelf: 'flex-start',
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `${flShadow.borderInset}, ${flShadow.shadowImage}, ${flShadow.glowBadge}`,
  },
  medallionInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
    boxShadow: 'inset 0 2px 7px rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { marginTop: 22, fontFamily: flFont.display, fontSize: 27, fontWeight: '600', letterSpacing: -0.4, lineHeight: 30, color: flColor.cream100 },
  subline: { marginTop: 11, maxWidth: 320, fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },

  rows: { marginTop: 24, gap: 12 },
  rowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    boxShadow: flShadow.borderInset,
  },
  rowOuterSel: { borderColor: flColor.bronze400, backgroundColor: 'rgba(186, 134, 84,0.08)' },
  romanSlot: { width: 28, alignItems: 'center', justifyContent: 'center' },
  roman: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', letterSpacing: 1, lineHeight: 16, color: flColor.gray600 },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  rowSub: { fontFamily: flFont.sans, fontSize: 12.5, lineHeight: 16, color: flColor.gray400 },
  rightSlot: { width: 24, alignItems: 'center', justifyContent: 'center' },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: flColor.bronze400, borderColor: flColor.bronze400 },

  buttonWrap: { marginTop: 18 },

  // suggested face
  eyebrow: { marginTop: 22, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  progName: { marginTop: 6, fontFamily: flFont.display, fontSize: 26, fontWeight: '600', letterSpacing: -0.3, lineHeight: 30, color: flColor.cream100 },
  metaLine: { marginTop: 6, fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  because: { marginTop: 6, fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600 },
  actions: { marginTop: 22, gap: 10 },
  alternates: { marginTop: 4, gap: 8 },
  alternatesLabel: {
    fontFamily: flFont.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 2,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  altText: { flex: 1, minWidth: 0 },
  altName: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  altMeta: { fontFamily: flFont.sans, fontSize: 11.5, color: flColor.gray600, marginTop: 1 },
  altStart: { fontFamily: flFont.sans, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },
  change: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 2 },
  changeText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
});
