import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ForgeBrandMark } from '@/components/forge/primitives/icons/HomeIcons';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { Field, Heading, ProgressHeader, SelectTile } from '@/components/onboarding/kit';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { completeOnboarding, isHandleAvailable } from '@/domain/onboarding/service';
import type { EquipmentId, GoalId } from '@/domain/onboarding/derive';
import type { Experience } from '@/domain/coach/constraints';
import { HOME_GYM_EQUIPMENT, HOME_GYM_GROUPS } from '@/domain/home-gym/equipment';
import { CHAPTER_SUGGESTIONS, CHAPTER_TITLE_MAX, chapterNameFrom, DEFAULT_CHAPTER_I_TITLE } from '@/domain/legacy/chapter-name';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { errorMessage } from '@/lib/useQuery';

/**
 * The onboarding route (session, not-onboarded): Account → Username → Goal → Experience → Equipment
 * (→ Gear) → Chapter → Transition.
 *
 * ══ WHY THE THREE TRAINING QUESTIONS CAME BACK ══
 *
 * ONB-Amendment-002 stripped this to an identity ramp and deferred Goal / Experience / Equipment to
 * opt-in, post-Home surfaces. Those surfaces were built — `lib/home-level.ts` and `lib/home-intake.ts` —
 * and the deferral cost more than it saved, in three compounding ways:
 *
 *  1. **Both stores are AsyncStorage and write nothing to Supabase.** Whatever the athlete answered did
 *     not survive a reinstall or reach a second device.
 *  2. **Coach Holt cannot read either of them.** `app/coach.tsx` reads the Home Gym profile, lift history
 *     and learned preferences — nothing else — so it asked experience and equipment on every build even
 *     when the athlete had already answered both.
 *  3. **They sit on the demoted path.** The level/equipment stepper lives behind the quiet link under the
 *     three doors, so anyone taking the RECOMMENDED door ("Build it with me") never saw it at all.
 *
 * Meanwhile `domain/coach/constraints.ts` has said since it was written that *"goal and experience come
 * from onboarding, equipment from the Home Gym profile"*, and `missingFor()` was built to ask only for
 * what is left. The engine was waiting for data nothing sent it.
 *
 * ⚠ THE COST OF ASKING IS REAL AND IS THE REASON THE LIST IS SHORT. Three questions, no schedule step,
 * no split style, no limitations — those stay with Holt, who needs them per-build rather than per-athlete
 * (a shoulder that hurts this week is not a profile field). Each of the three earns its place by removing
 * at least one question from every future build, permanently.
 *
 * Answers accumulate in local `data`; nothing persists until "Enter Forge" runs the atomic finish
 * (`completeOnboarding`). On success `onboarded_at` flips and the boot router swaps to the app.
 * Welcome/Create/Sign-In are the auth route.
 */
const BASE_SETUP: Step[] = ['account', 'username', 'goal', 'experience', 'equipment', 'chapter'];

/** The 6 goals from the design `.dc` Goals screen, in its order. */
const GOAL_OPTIONS: { id: GoalId; title: string; desc: string }[] = [
  { id: 'strength', title: 'Get stronger', desc: 'Move heavier weight on the big lifts.' },
  { id: 'muscle', title: 'Build muscle', desc: 'Add size, shape and definition.' },
  { id: 'fatloss', title: 'Lose fat', desc: 'Lean out while holding onto strength.' },
  { id: 'endurance', title: 'Go further', desc: 'Running, riding, rowing — distance and stamina.' },
  { id: 'athletic', title: 'Perform better', desc: 'Power, speed and conditioning for sport.' },
  { id: 'health', title: 'Feel better', desc: 'Move well, stay healthy, build the habit.' },
];

/**
 * ⚠ THE COPY DESCRIBES WHAT THEY CAN DO, NOT WHAT THEY KNOW.
 *
 * "Beginner / Intermediate / Advanced" asks the athlete to rank themselves against a scale nobody defines,
 * and the honest ones undersell — which lands a capable lifter in beginner progressions. Every option here
 * is a concrete, checkable statement about their own history instead.
 */
const EXPERIENCE_OPTIONS: { id: Experience; title: string; desc: string }[] = [
  { id: 'beginner', title: 'I’m starting out', desc: 'New to training, or coming back after a long break.' },
  { id: 'intermediate', title: 'I’ve been training a while', desc: 'Comfortable in a gym. I know what a hard set feels like.' },
  { id: 'advanced', title: 'I’ve trained for years', desc: 'I know my lifts, my numbers and how I respond.' },
];

/** The 5 buckets from the design `.dc` Equipment screen. `homegym` is the one that opens the gear grid. */
const EQUIPMENT_OPTIONS: { id: EquipmentId; title: string; desc: string }[] = [
  { id: 'fullgym', title: 'A full gym', desc: 'Barbells, racks, machines, cables.' },
  { id: 'homegym', title: 'A home setup', desc: 'Tell me what’s in it on the next screen.' },
  { id: 'dumbbells', title: 'Dumbbells', desc: 'A pair or a rack, and not much else.' },
  { id: 'bands', title: 'Resistance bands', desc: 'Bands and bodyweight.' },
  { id: 'bodyweight', title: 'Nothing yet', desc: 'Just me and the floor. That’s a real answer.' },
];
type Step = 'account' | 'username' | 'goal' | 'experience' | 'equipment' | 'gear' | 'chapter' | 'transition';
type UStatus = 'idle' | 'short' | 'checking' | 'available' | 'taken';

interface Data {
  name: string;
  sex: 'male' | 'female' | null;
  units: 'imperial' | 'metric';
  username: string;
  /**
   * Up to 3, and **the first one tapped is the primary** — the same rule `lib/home-intake.ts` already
   * stores (`primaryGoal = goals[0]`), so the two never need reconciling. The primary is what derives
   * Athlete Type and what Coach Holt prefills.
   */
  goals: GoalId[];
  experience: Experience | null;
  equipment: EquipmentId[];
  /**
   * The gear grid's answer, asked only when "A home setup" is chosen.
   *
   * `null` ≠ `[]`, exactly as `profiles.home_gym_equipment` keeps them apart (0021): null is "never
   * asked", `[]` is "asked, and I own nothing". De-selecting the home-setup bucket clears it back to
   * null rather than to empty, so backing out of the question is not mistaken for answering it.
   */
  gear: string[] | null;
  /** The TITLE half of Chapter I. Blank means "skipped", which writes the default. */
  chapterTitle: string;
  /** A local file URI until "Enter Forge" uploads it. Null = they never added one, which is fine. */
  photoUri: string | null;
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>('account');
  const [data, setData] = useState<Data>({
    name: '', sex: null, units: 'imperial', username: '', goals: [], experience: null,
    equipment: [], gear: null, chapterTitle: '', photoUri: null,
  });
  const [uStatus, setUStatus] = useState<UStatus>('idle');
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refetch: refetchProfile } = useProfile();
  /*
   * ══ ⚠ THE WAY OUT ══
   *
   * `routeFor` sends every signed-in athlete with a null `onboarded_at` here, and this screen is the
   * only thing that ever clears it. Before this, that made onboarding a one-way door: no sign-out, no
   * account switch, and `Back` hidden on the first step. Anyone who stopped partway was returned here
   * on every launch with no error and nothing to read, which **presents as a frozen app** — reported as
   * exactly that by a tester who held two accounts and had signed into the wrong one.
   *
   * ⚠ THE CONFIRM IS NOT CEREMONY. Nothing on this screen is persisted until `complete_onboarding`
   * runs at the very end — the RPC writes the profile, Chapter I and `onboarded_at` in one transaction
   * — so signing out discards every answer typed so far, silently and irrecoverably. A stuck athlete
   * needs the door; an athlete four questions deep needs to not fall through it.
   */
  const { signOut } = useAuth();
  const [exitOpen, setExitOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const onExitConfirmed = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      await signOut();
      // No navigation here, deliberately. Clearing the session moves `routeFor` to `'auth'` on its own,
      // and pushing a route as well would race the guard that is already doing it.
    } catch {
      // Even a failed sign-out must not strand them on a dead sheet with a spinner.
      setExiting(false);
      setExitOpen(false);
    }
  };
  /*
   * ⚠ THE AVATAR ON STEP ONE USED TO BE A PICTURE OF A BUTTON.
   *
   * It was drawn under the words "Add a photo — optional", wrapped in a plain `View`, with
   * `photoUri: null` hard-coded at the finish and a comment calling the picker "a fast-follow". Everybody
   * taps the circle first, and nothing was listening. The parenthetical "(add it later in Profile)" was
   * carrying the whole explanation and losing.
   *
   * `useMediaPicker` is the one camera-or-library path in the app — a screen must never reach for
   * `ImagePicker.launch*` itself — and it is what Edit Profile already uses for exactly this job.
   */
  const { pick, mediaPickerSheet } = useMediaPicker();
  const patch = (p: Partial<Data>) => setData((d) => ({ ...d, ...p }));

  const choosePhoto = async () => {
    const asset = await pick({ kind: 'images', title: 'Profile photo', quality: 0.92 });
    if (asset?.uri) patch({ photoUri: asset.uri });
  };

  /*
   * ⚠ THE STEP LIST IS DERIVED, NOT A CONSTANT, because one step is conditional.
   *
   * The gear grid only exists once the athlete has said they train on a home setup. Inserting it straight
   * after `equipment` means answering that question walks onto it and changing the answer walks back off,
   * with no index bookkeeping either way — the same shape `app/coach.tsx` uses for its own `gearStep`,
   * and for the same reason. The progress counter follows automatically because it reads this array's
   * length rather than a hard-coded total.
   */
  const setup: Step[] = data.equipment.includes('homegym')
    ? [...BASE_SETUP.slice(0, 5), 'gear', ...BASE_SETUP.slice(5)]
    : BASE_SETUP;

  const idx = setup.indexOf(step);
  const next = () => setStep(step === 'chapter' ? 'transition' : setup[idx + 1]);
  const back = () => {
    setError(null);
    if (step === 'transition') setStep('chapter');
    else if (idx > 0) setStep(setup[idx - 1]);
  };

  /**
   * Tap to select, up to three, first one wins the primary slot.
   *
   * ⚠ DE-SELECTING THE PRIMARY PROMOTES THE NEXT ONE rather than leaving the athlete with two chosen
   * goals and no primary — `goals[0]` IS the primary, so the array order is the whole mechanism and
   * filtering preserves it.
   */
  const toggleGoal = (id: GoalId) =>
    setData((d) => ({
      ...d,
      goals: d.goals.includes(id)
        ? d.goals.filter((g) => g !== id)
        : d.goals.length >= 3
          ? d.goals
          : [...d.goals, id],
    }));

  /**
   * ⚠ CLEARING `gear` BACK TO `null` ON DE-SELECT IS LOAD-BEARING. Someone who picks the home setup,
   * fills the grid, then changes to "A full gym" must not leave a stale owned-equipment list behind to be
   * written to their profile — and `null` (never asked) is the honest state to return to, not `[]`
   * (asked, owns nothing).
   */
  const toggleEquipment = (id: EquipmentId) =>
    setData((d) => {
      const on = d.equipment.includes(id);
      const equipment = on ? d.equipment.filter((e) => e !== id) : [...d.equipment, id];
      return { ...d, equipment, gear: equipment.includes('homegym') ? d.gear : null };
    });

  const toggleGear = (id: string) =>
    setData((d) => {
      const cur = d.gear ?? [];
      return { ...d, gear: cur.includes(id) ? cur.filter((g) => g !== id) : [...cur, id] };
    });

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
        // Uploaded inside `completeOnboarding` before the atomic RPC. Null when they skipped it, which
        // is the same path this always took — the difference is that choosing one now works.
        photoUri: data.photoUri,
        chapterTitle: data.chapterTitle,
        // Asked on the Account step since onboarding was built, and discarded until now.
        units: data.units,
        /* The three training answers. `service.ts` derives athlete_type and environment from them for
           the RPC, and writes experience + home_gym_equipment alongside it — so athlete_type stops being
           the hard-coded 'Hybrid' that Rank has been reading for every athlete in the app. */
        goals: data.goals,
        experience: data.experience,
        equipment: data.equipment,
        gear: data.gear,
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
      {/*
        ⚠ THE TRANSITION STEP GETS A HEADER TOO, AND UNTIL NOW IT COULD NOT.
        This read `idx >= 0`, and `idx` is `setup.indexOf('transition')` — which is `-1`. So the header
        did not render on the final screen at all, and the `step === 'transition'` branch inside its own
        `onBack` was unreachable code: somebody meant for Back to work there and it never once did.
        The result was a one-way door — "Enter Forge" with no way back to rename Chapter I, on the last
        screen before the app, where changing your mind is most likely.
        The bar stays full (`step` is clamped to `total`) rather than showing a fourth segment: the
        transition is the finish line, not a fourth question.
      */}
      <ProgressHeader
        step={idx >= 0 ? idx + 1 : setup.length}
        total={setup.length}
        onBack={idx > 0 || step === 'transition' ? back : undefined}
        /* ⚠ EVERY STEP, INCLUDING THE FIRST — where `onBack` is deliberately absent and there was
           therefore no control on the screen at all. That first step is where a wrong-account athlete
           lands on every launch, so it is the one that most needs a door. */
        onExit={finishing ? undefined : () => setExitOpen(true)}
      />

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
                <Pressable
                  onPress={() => void choosePhoto()}
                  accessibilityRole="button"
                  accessibilityLabel={data.photoUri ? 'Change your profile photo' : 'Add a profile photo'}
                  hitSlop={8}
                  style={({ pressed }) => (pressed ? styles.avatarPressed : null)}
                >
                  <Avatar src={data.photoUri ?? undefined} name={data.name || '  '} size="profile" ring />
                </Pressable>
                <Text style={styles.optional}>
                  {data.photoUri ? 'Tap to change — optional' : 'Tap to add a photo — optional'}
                </Text>
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
              {/*
                ⚠ THE SKIP NOW SAYS WHAT IT COSTS.
                Handle search is the ONLY way another athlete can add you (SOC-D15) — skip this and you
                are invisible to Friends, tagging and every social surface in the app, while the link
                read as a neutral convenience. The sentence is not new: Edit Profile has always said it,
                months later, to somebody who had already hit the problem. It belongs at the decision.
              */}
              <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Skip for now — nobody will be able to find you by search" style={styles.skip}>
                <Text style={styles.skipText}>Skip for now</Text>
                <Text style={styles.skipCost}>Without a handle, nobody can find you by search. You can add one any time in Profile.</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'goal' ? (
            <>
              <Heading
                eyebrow="What you're here for"
                title="What are you working toward?"
                body="Pick up to three. The first one you choose is the one everything gets built around — you can change it any time."
              />
              <View style={styles.tileStack}>
                {GOAL_OPTIONS.map((g) => {
                  const rank = data.goals.indexOf(g.id);
                  return (
                    <SelectTile
                      key={g.id}
                      title={g.title}
                      desc={g.desc}
                      selected={rank >= 0}
                      onPress={() => toggleGoal(g.id)}
                      /* The primary is NAMED rather than merely first in a list the athlete cannot see
                         the order of. Without this, "the first one you choose" is a rule stated in the
                         body copy and nowhere confirmed on screen. */
                      right={rank === 0 ? <Text style={styles.primaryTag}>PRIMARY</Text> : null}
                    />
                  );
                })}
              </View>
              <Continue disabled={data.goals.length === 0} onPress={next} />
            </>
          ) : null}

          {step === 'experience' ? (
            <>
              <Heading
                eyebrow="Where you're starting"
                title="How long have you been training?"
                body="This sets where your first program starts — not a label you have to live up to."
              />
              <View style={styles.tileStack}>
                {EXPERIENCE_OPTIONS.map((e) => (
                  <SelectTile
                    key={e.id}
                    title={e.title}
                    desc={e.desc}
                    selected={data.experience === e.id}
                    onPress={() => patch({ experience: e.id })}
                  />
                ))}
              </View>
              <Continue disabled={!data.experience} onPress={next} />
            </>
          ) : null}

          {step === 'equipment' ? (
            <>
              <Heading
                eyebrow="What you've got"
                title="Where will you be training?"
                body="Pick everything that applies. Nothing gets prescribed that you can't actually do."
              />
              <View style={styles.tileStack}>
                {EQUIPMENT_OPTIONS.map((e) => (
                  <SelectTile
                    key={e.id}
                    title={e.title}
                    desc={e.desc}
                    selected={data.equipment.includes(e.id)}
                    onPress={() => toggleEquipment(e.id)}
                  />
                ))}
              </View>
              <Continue disabled={data.equipment.length === 0} onPress={next} />
            </>
          ) : null}

          {step === 'gear' ? (
            <>
              <Heading
                eyebrow="Your home setup"
                title="What's in it?"
                body="Everything you can reach. Bodyweight is assumed — no need to say it."
              />
              {HOME_GYM_GROUPS.map((group) => {
                const items = HOME_GYM_EQUIPMENT.filter((e) => e.group === group);
                if (items.length === 0) return null;
                return (
                  <Group key={group} label={group.toUpperCase()}>
                    <View style={styles.chipWrap}>
                      {items.map((e) => {
                        const on = (data.gear ?? []).includes(e.id);
                        return (
                          <Pressable
                            key={e.id}
                            onPress={() => toggleGear(e.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            style={[styles.gearChip, on ? styles.gearChipOn : null]}
                          >
                            <Text style={[styles.gearChipText, on ? styles.gearChipTextOn : null]}>{e.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Group>
                );
              })}
              {/*
                ⚠ NOT DISABLED ON AN EMPTY LIST, unlike every other step here. An empty grid is a real
                answer — "nothing but me and the floor" — and it is stored as `[]` rather than `null`
                precisely so the coach can tell it apart from never having asked. Blocking Continue would
                make the one honest answer the only unreachable one.
              */}
              <Continue
                onPress={next}
                label={
                  (data.gear ?? []).length > 0
                    ? `Continue — ${(data.gear ?? []).length} ${(data.gear ?? []).length === 1 ? 'thing' : 'things'}`
                    : 'Nothing but me and the floor'
                }
              />
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
      {/* The camera-or-library chooser. Rendered once at the root so it presents over whichever step is
          on screen, which today is only the Account step's avatar. */}
      {mediaPickerSheet}

      {/* ⚠ A SHEET RATHER THAN `Alert.alert`, WHICH IS INERT ON WEB — and the deployed web preview is
          where the athletes actually test. An Alert here would silently do nothing on the exact surface
          this fix was written for. */}
      <BottomSheet
        open={exitOpen}
        onClose={() => (exiting ? undefined : setExitOpen(false))}
        title="Sign out?"
      >
        <View style={styles.exitSheet}>
          <Text style={styles.exitBody}>
            You haven&rsquo;t finished setting up, so nothing has been saved yet — signing out now discards
            what you&rsquo;ve filled in so far and returns you to the sign-in screen.
            {'\n\n'}
            If you have more than one account, this is how you switch to the other one.
          </Text>
          <Button variant="primary" fullWidth disabled={exiting} onPress={() => void onExitConfirmed()}>
            {exiting ? 'Signing out…' : 'Sign out'}
          </Button>
          <Button variant="secondary" fullWidth disabled={exiting} onPress={() => setExitOpen(false)}>
            Keep setting up
          </Button>
        </View>
      </BottomSheet>
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
  exitSheet: { gap: 10, paddingBottom: 4 },
  exitBody: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 20, color: flColor.gray400, marginBottom: 4 },

  root: { flex: 1 },
  scroll: { paddingHorizontal: 30, paddingTop: 4, paddingBottom: 40, gap: 22 },
  continue: { marginTop: 8 },

  avatarRow: { alignItems: 'center', gap: 10, paddingVertical: 6 },
  avatarPressed: { opacity: 0.7 },
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

  // Goal / Experience / Equipment: one column of full-width tiles, unlike the 2-across Sex/Units rows —
  // every option here carries a description line, and two of those side by side is four lines of nothing.
  tileStack: { gap: 10 },
  primaryTag: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, color: flColor.bronze400 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  gearChip: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.surfaceRecessed },
  gearChipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  gearChipText: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  gearChipTextOn: { color: flColor.bronze300, fontWeight: '600' },

  handleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  at: { fontFamily: flFont.display, fontSize: 20, color: flColor.bronze400, paddingBottom: 12 },
  uStatus: { fontFamily: flFont.sans, fontSize: 13 },
  uStatusGap: { height: 18 },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  previewName: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  previewHandle: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600, marginTop: 1 },
  skip: { alignItems: 'center', paddingVertical: 10, gap: 5 },
  skipText: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },
  skipCost: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 17, color: flColor.gray600, textAlign: 'center', maxWidth: 300 },

  transition: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, gap: 20 },
  tEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center' },
  tTitle: { fontFamily: flFont.display, fontSize: 34, fontWeight: '600', lineHeight: 40, color: flColor.cream100, textAlign: 'center' },
  tBody: { fontFamily: flFont.sans, fontSize: 15, lineHeight: 23, color: flColor.gray400, textAlign: 'center' },
  tAccent: { color: flColor.bronze400, fontWeight: '600' },
  tAction: { alignSelf: 'stretch', marginTop: 8 },

  err: { fontFamily: flFont.sans, fontSize: 13, color: flColor.redMuted },
});
