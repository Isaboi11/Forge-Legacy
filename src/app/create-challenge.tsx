import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { fetchSquad } from '@/data/squad-live';
import { fetchFriendLists, type FriendSummary } from '@/data/friends-live';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ACTIVITY_KEYS, LIFT_KEYS, SCOPE_OF, createChallenge, isGainType, metricLabel, type ChallengeType } from '@/data/challenges-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Create Challenge (C-2) — built to `Forge Create Challenge.dc.html`.
 *
 * Faithful: the live preview seal that shrinks while you type (so the keyboard doesn't push the form
 * off-screen), the metric grid with its five-property selected flip, the scoring explainer that rewrites
 * per metric, the duration presets + custom-days + start chips + run line, the decorated Review block
 * with its flanked eyebrow and monumental tagline, and the commit bar whose button flips six properties
 * between enabled and disabled.
 *
 * FIVE METRICS, NOT ELEVEN. The design offers two families — Total (4) and Progression (7). CS-D9's
 * metric table locks exactly five ChallengeTypes, and there is no scoring definition anywhere for a
 * progression metric (start-vs-finish improvement is a different scoring model, not a variant of the
 * locked five). Shipping seven metrics the engine cannot compute would put standings on screen that
 * nothing could verify, so the Family control and the Progression family are out. Their sub-configs go
 * with them — "Which Lift" and "Which Movement" belong to metrics that aren't in CS-D9, and MAX_LIFT is
 * defined as the heaviest qualifying set, with no exercise selection.
 *
 * SQUAD SCOPE ONLY, for the same reason as C-1: FRIENDS needs a friends graph, COMMUNITY needs
 * communities. The Who Competes segmented control would have had one working option out of three.
 *
 * ALSO NOT BUILT, and each for a reason rather than for time:
 *   · Cover image — the design collects it and silently drops it (nothing reads the slot back). There is
 *     no challenge banner surface yet to show it on; it returns with C-3.
 *   · Visibility (Invite-only / Open to join) — meaningless in squad scope, where every member can
 *     already see and opt into their squad's challenges. It becomes real with FRIENDS.
 *   · Legacy Stakes (None / Winner / Podium honors) — CS-D24 defines challenge honors, but the Honor
 *     Catalog expansion is on hold, so there is no authored honor to award.
 *
 * The design's largest defect is fixed here: its `create()` writes a localStorage *invite* payload — the
 * same key an accepted invitation writes — so a created challenge was never persisted as an owned
 * entity, and nothing could tell "I made this" from "someone invited me". This writes a real row.
 */

const NAME_MAX = 34;
const MESSAGE_MAX = 160;

/**
 * MEASURE × MODE, not fourteen separate metrics.
 *
 * Half the catalogue is the same measurement aggregated differently — Volume and Volume Gain measure
 * the same thing. Modelling it as ten measures with a Total/Improvement mode collapses the choice from
 * a fourteen-card wall into one row plus a toggle, and it restores the design's own Family control with
 * something real behind it. A measure with no `gain` type simply doesn't appear in Improvement mode.
 */
interface Measure {
  key: string;
  title: string;
  desc: string;
  total: ChallengeType;
  gain?: ChallengeType;
  badge?: string;
}

const MEASURES: Measure[] = [
  { key: 'days', title: 'Days Trained', desc: 'Showing up beats going hard.', total: 'MOST_DAYS', badge: 'Recommended' },
  { key: 'workouts', title: 'Workouts', desc: 'Sessions logged.', total: 'MOST_WORKOUTS' },
  { key: 'volume', title: 'Volume', desc: 'Total weight moved.', total: 'MOST_VOLUME', gain: 'GAIN_VOLUME', badge: 'Popular' },
  { key: 'reps', title: 'Reps', desc: 'Weight ignored entirely.', total: 'MOST_REPS', gain: 'GAIN_REPS' },
  { key: 'lift', title: 'Max Lift', desc: 'Heaviest single set.', total: 'MAX_LIFT', gain: 'GAIN_MAX_LIFT' },
  { key: 'distance', title: 'Distance', desc: 'Miles covered.', total: 'DISTANCE_TOTAL', gain: 'GAIN_DISTANCE' },
  { key: 'duration', title: 'Time Trained', desc: 'Hours under the bar.', total: 'MOST_DURATION' },
  { key: 'prs', title: 'PRs', desc: 'Personal records set.', total: 'MOST_PRS' },
  { key: 'variety', title: 'Variety', desc: 'Different exercises tried.', total: 'MOST_VARIETY' },
  { key: 'early', title: 'Early Bird', desc: 'Sessions before 7am.', total: 'EARLY_BIRD' },
];

/** One sentence per scoring type, shown under the picker so the rule is never hidden behind a tap. */
const SCORE_TEXT: Record<ChallengeType, string> = {
  MOST_DAYS: 'Distinct days with a session — two workouts in one day still counts as one. Consistency wins this, not strength.',
  MOST_WORKOUTS: 'Every completed session counts as one. The highest count at the end wins.',
  MOST_VOLUME: 'Sets × reps × weight, summed across every session in the window.',
  MOST_REPS: 'Every rep counts the same whether it is loaded or bodyweight — the most honest metric for a mixed-ability squad.',
  MAX_LIFT: 'The heaviest qualifying set anyone logs in the window. One lift can win it.',
  DISTANCE_TOTAL: 'Distance logged in the window, summed.',
  MOST_DURATION: 'Total session time in the window, counted in hours.',
  MOST_PRS: 'Every PR recorded in the window counts as one.',
  MOST_VARIETY: 'Distinct exercises logged. Rewards curiosity rather than output — the strongest athlete rarely wins this one.',
  EARLY_BIRD: 'Any session started before 7am, in the timezone you create this in. No strength component — just who gets up.',
  GAIN_VOLUME: 'Volume during the challenge minus volume over the same length of time before it.',
  GAIN_REPS: 'Reps during the challenge minus reps before it. Weight is ignored throughout.',
  GAIN_MAX_LIFT: 'Your best lift during the challenge, minus your best before it. Whoever adds the most weight wins — not whoever lifts the most.',
  GAIN_DISTANCE: 'Distance during the challenge minus distance over the same length of time before it.',
};

const measureFor = (t: ChallengeType): Measure => MEASURES.find((m) => m.total === t || m.gain === t) ?? MEASURES[0];

const DURATIONS: { days: number; label: string; sub?: string }[] = [
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 28, label: '4 Weeks' },
  { days: 56, label: 'Season', sub: '8 wk' },
];

type StartWhen = 'now' | 'tmw' | 'mon';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d: Date): string => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

/** Next Monday — and when today IS Monday, that means a week out, not today. */
function startFor(when: StartWhen): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (when === 'tmw') d.setDate(d.getDate() + 1);
  if (when === 'mon') d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return d;
}

export default function CreateChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const squadId = String(id ?? '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { data: squadData } = useQuery(() => (squadId ? fetchSquad(squadId) : Promise.resolve(null)), [squadId]);
  /* No squad id means FRIENDS context (0087, CS-D1's second roster source). Friends are not a group —
     there is no "my friends" object to point at, only a graph of pairs — so this competition names who
     it is for, and the picker below is that naming. */
  /* Entering from a squad no longer DECIDES the roster — it only preselects it. "Who Competes" is a
     choice between the squad you came from and specific friends, because arriving from a squad page is
     not the same as wanting to compete against all of it. With no squad in context there is nothing to
     choose and it is friends outright. */
  const [scope, setScope] = useState<'squad' | 'friends'>(squadId ? 'squad' : 'friends');
  const friendsMode = scope === 'friends';
  const { data: friendLists } = useQuery(fetchFriendLists, []);
  const myFriends: FriendSummary[] = friendLists?.friends ?? [];
  /* Arriving from a profile preselects them — the picker is still there to add more. */
  const { athlete } = useLocalSearchParams<{ athlete?: string }>();
  const [invited, setInvited] = useState<string[]>(typeof athlete === 'string' && athlete ? [athlete] : []);
  const toggleFriend = (id: string) => setInvited((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [metric, setMetric] = useState<ChallengeType>('MOST_WORKOUTS');
  // The narrowing (0061): an exercise for lift metrics, an activity for session metrics. Null = all.
  const [metricKey, setMetricKey] = useState<string | null>(null);
  const [preset, setPreset] = useState<number | 'custom'>(28);
  const [customDays, setCustomDays] = useState('21');
  const [startWhen, setStartWhen] = useState<StartWhen>('now');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  // The seal shrinks while a field is focused so the keyboard doesn't push the form off-screen.
  // Debounced blur so moving between fields doesn't flicker it — the design's focusin/focusout trick.
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFieldFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setEditing(true);
  };
  const onFieldBlur = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setEditing(false), 140);
  };
  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  const squad = squadData?.squad ?? null;
  const memberCount = squadData?.members.length ?? 0;

  // Clamped on read, so a half-typed or emptied field can never produce an invalid window. The design
  // let state hold 0 while the run line said 3 — the field and the summary disagreed.
  const durationDays = preset === 'custom' ? Math.min(180, Math.max(3, parseInt(customDays, 10) || 0)) : preset;
  const start = startFor(startWhen);
  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const measure = measureFor(metric);
  const mode: 'total' | 'gain' = isGainType(metric) ? 'gain' : 'total';
  const scopeKind = SCOPE_OF[metric];
  const isGain = isGainType(metric);
  // The baseline window a progression challenge is measured against — the same length, immediately
  // before it. Showing the actual dates is the difference between "improvement" meaning something and
  // being a word on a card.
  const baselineStart = new Date(start.getTime() - durationDays * 24 * 60 * 60 * 1000);
  const scopedLabel = metricLabel(metric, metricKey);
  const trimmedName = name.trim();
  const nameOk = trimmedName.length >= 2;
  const canCreate = nameOk && !busy && (friendsMode ? invited.length > 0 : !!squad);

  const onCreate = () => {
    if (!canCreate) return;
    setBusy(true);
    createChallenge({
      squadId: friendsMode ? null : squad?.id,
      invitedIds: friendsMode ? invited : null,
      name,
      description: message,
      type: metric,
      metricKey,
      durationDays,
      startAt: start,
    }).then(
      () => {
        showToast(
          friendsMode
            ? `${trimmedName} is open — ${invited.length === 1 ? 'they' : 'they'} can opt in now.`
            : `${trimmedName} is open — your squad can opt in now.`,
        );
        router.replace(friendsMode ? { pathname: '/competitions' } : { pathname: '/competitions', params: { id: squad!.id } });
      },
      (e: unknown) => {
        setBusy(false);
        showToast(errorMessage(e));
      },
    );
  };

  const startLabel = startWhen === 'now' ? 'today' : fmtDate(start);

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.34)' }} />
      <AppBar title="Create Challenge" serif onBack={() => router.back()} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* ── Live preview seal ── */}
          <View style={styles.hero}>
            <View style={[styles.seal, editing && styles.sealSmall]}>
              <LinearGradient colors={['#40301f', '#17130f'] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
              <SwordsGlyph size={editing ? 24 : 28} color={flColor.bronze300} />
            </View>
            <Text style={[styles.heroTitle, editing && styles.heroTitleSmall, !trimmedName && styles.heroTitleMuted]} numberOfLines={3}>
              {trimmedName || 'Name Your Challenge'}
            </Text>
            {!trimmedName ? <Text style={styles.heroIntro}>{friendsMode ? 'Set the terms. They opt in.' : 'Set the terms. Your squad opts in.'}</Text> : null}

            {trimmedName ? (
              <View style={styles.pillRow}>
                <View style={[styles.pill, styles.pillBronze]}>
                  <Text style={[styles.pillText, styles.pillTextBronze]}>{scopedLabel}</Text>
                </View>
                <View style={styles.pill}>
                  <ClockGlyph size={11} color={flColor.bronze400} />
                  <Text style={styles.pillText}>{durationDays} days</Text>
                </View>
                {squad ? (
                  <View style={styles.pill}>
                    <PeopleGlyph size={11} color={flColor.bronze400} />
                    <Text style={styles.pillText}>{squad.name}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* ── What Counts ── one row, not a wall of cards. The full set lives in a sheet. */}
          <Text style={styles.sectionLabel}>What Counts</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Scoring: ${scopedLabel}. Change`}
            style={({ pressed }) => [styles.pickerRow, pressed ? styles.pickerRowPressed : null]}
          >
            <View style={styles.pickerIcon}>
              <TypeGlyph type={metric} size={18} />
            </View>
            <View style={styles.pickerBody}>
              <Text style={styles.pickerValue} numberOfLines={1}>
                {scopedLabel}
              </Text>
              <Text style={styles.pickerHint}>{mode === 'gain' ? 'Improvement' : 'Total'} · tap to change</Text>
            </View>
            <ChevronGlyph />
          </Pressable>

          {scopeKind ? (
            <View style={styles.scopeCard}>
              <Text style={styles.subLabel}>{scopeKind === 'exercise' ? 'Which Lift' : 'Which Activity'}</Text>
              <View style={styles.chipWrap}>
                <Pressable onPress={() => setMetricKey(null)} accessibilityRole="button" accessibilityState={{ selected: metricKey === null }} style={[styles.chip, metricKey === null ? styles.chipOn : null]}>
                  <Text style={[styles.chipText, metricKey === null ? styles.chipTextOn : null]}>{scopeKind === 'exercise' ? 'Any lift' : 'Any activity'}</Text>
                </Pressable>
                {(scopeKind === 'exercise' ? LIFT_KEYS : ACTIVITY_KEYS).map((o) => {
                  const on = metricKey === o.key;
                  return (
                    <Pressable key={o.key} onPress={() => setMetricKey(o.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on ? styles.chipOn : null]}>
                      <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.scoreCard}>
            <View style={styles.scoreIcon}>
              <PodiumGlyph />
            </View>
            <View style={styles.scoreBody}>
              <Text style={styles.scoreText}>{SCORE_TEXT[metric]}</Text>
              {isGain ? (
                <Text style={styles.baselineText}>
                  Measured against {fmtDate(baselineStart)} – {fmtDate(start)}. No prior training in that window means everything you log counts as gain.
                </Text>
              ) : null}
            </View>
          </View>

          {/* ── Details ── */}
          <Text style={styles.sectionLabel}>Details</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <View style={styles.fieldHead}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Challenge Name</Text>
                  {nameOk ? <CheckGlyph size={12} color="#6E8E74" /> : <Text style={styles.reqMark}>∗</Text>}
                </View>
                <Text style={[styles.count, name.length >= NAME_MAX - 4 && styles.countNear]}>
                  {name.length}/{NAME_MAX}
                </Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. The March Grind"
                placeholderTextColor={flColor.gray600}
                maxLength={NAME_MAX}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.fieldHead}>
                <Text style={styles.fieldLabel}>Challenge Message</Text>
                <Text style={[styles.count, message.length >= MESSAGE_MAX - 8 && styles.countNear]}>
                  {message.length}/{MESSAGE_MAX}
                </Text>
              </View>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Say why this one matters. (Optional)"
                placeholderTextColor={flColor.gray600}
                maxLength={MESSAGE_MAX}
                multiline
                textAlignVertical="top"
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                style={[styles.input, styles.inputMulti]}
              />
            </View>
          </View>

          {/* ── Duration ── */}
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.card}>
            <View style={styles.chipWrap}>
              {DURATIONS.map((d) => {
                const on = preset === d.days;
                return (
                  <Pressable key={d.days} onPress={() => setPreset(d.days)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on ? styles.chipOn : null]}>
                    <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{d.label}</Text>
                    {d.sub ? <Text style={[styles.chipSub, on ? styles.chipSubOn : null]}>{d.sub}</Text> : null}
                  </Pressable>
                );
              })}
              <Pressable onPress={() => setPreset('custom')} accessibilityRole="button" accessibilityState={{ selected: preset === 'custom' }} style={[styles.chip, preset === 'custom' ? styles.chipOn : null]}>
                <Text style={[styles.chipText, preset === 'custom' ? styles.chipTextOn : null]}>Custom</Text>
              </Pressable>
            </View>

            {preset === 'custom' ? (
              <View style={styles.customRow}>
                <Text style={styles.customLabel}>Runs for</Text>
                <TextInput
                  value={customDays}
                  onChangeText={(v) => setCustomDays(v.replace(/[^0-9]/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  style={[styles.input, styles.numInput]}
                />
                <Text style={styles.customLabel}>days</Text>
                <Text style={styles.customHint}>3–180</Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.subLabel}>Starts</Text>
            <View style={styles.chipWrap}>
              {([
                { v: 'now' as const, label: 'Today' },
                { v: 'tmw' as const, label: 'Tomorrow' },
                { v: 'mon' as const, label: 'Next Monday' },
              ]).map((o) => {
                const on = startWhen === o.v;
                return (
                  <Pressable key={o.v} onPress={() => setStartWhen(o.v)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on ? styles.chipOn : null]}>
                    <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.runLine}>
              <CalendarGlyph />
              <Text style={styles.runText}>
                Runs {durationDays} days · starts {startLabel} · ends {fmtDate(end)}
              </Text>
            </View>
          </View>

          {/* ── Who Competes ── a squad STATES its roster; friends have to be named. */}
          <Text style={styles.sectionLabel}>Who Competes</Text>
          <View style={styles.card}>
            {squadId ? (
              <View style={styles.scopeToggle}>
                {(['squad', 'friends'] as const).map((k) => {
                  const on = scope === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setScope(k)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={k === 'squad' ? 'Compete with your squad' : 'Compete with specific friends'}
                      style={({ pressed }) => [styles.scopeTab, on ? styles.scopeTabOn : null, pressed ? styles.friendRowPressed : null]}
                    >
                      <Text style={[styles.scopeTabText, on ? styles.scopeTabTextOn : null]}>
                        {k === 'squad' ? (squad?.name ?? 'My Squad') : 'Friends'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {friendsMode ? (
              myFriends.length === 0 ? (
                <View style={styles.scopeStrip}>
                  <View style={styles.scopeIcon}>
                    <PeopleGlyph size={18} color={flColor.bronze300} />
                  </View>
                  <View style={styles.scopeBody}>
                    <Text style={styles.scopeName}>No friends yet</Text>
                    <Text style={styles.scopeSub}>Add someone by handle first, then you can compete against them.</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.friendList}>
                  {myFriends.map((f) => {
                    const on = invited.includes(f.id);
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => toggleFriend(f.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={f.name}
                        style={({ pressed }) => [styles.friendRow, on ? styles.friendRowOn : null, pressed ? styles.friendRowPressed : null]}
                      >
                        <Avatar name={f.name} src={f.avatarUrl ?? undefined} size={34} />
                        <View style={styles.friendBody}>
                          <Text style={styles.friendName} numberOfLines={1}>
                            {f.name}
                          </Text>
                          {f.handle ? <Text style={styles.friendHandle}>@{f.handle}</Text> : null}
                        </View>
                        <View style={[styles.tick, on ? styles.tickOn : null]}>{on ? <TickGlyph /> : null}</View>
                      </Pressable>
                    );
                  })}
                </View>
              )
            ) : (
              <View style={styles.scopeStrip}>
                <View style={styles.scopeIcon}>
                  <PeopleGlyph size={18} color={flColor.bronze300} />
                </View>
                <View style={styles.scopeBody}>
                  <Text style={styles.scopeName}>{squad?.name ?? 'Your squad'}</Text>
                  <Text style={styles.scopeSub}>
                    {memberCount === 1 ? 'You’re the only member so far.' : `All ${memberCount} members can opt in.`}
                  </Text>
                </View>
              </View>
            )}
            <Text style={styles.optInHint}>
              {friendsMode
                ? 'They get a notification and opt in themselves — being named isn’t being entered.'
                : 'No one is entered until they opt in — a challenge nobody joins simply never starts.'}
            </Text>
          </View>

          {/* ── Review ── */}
          <View style={styles.review}>
            <LinearGradient colors={['rgba(186, 134, 84,0.12)', 'transparent'] as const} locations={[0, 0.46] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowRule} />
              <SwordsGlyph size={11} color={flColor.bronze400} />
              <Text style={styles.eyebrow}>THE CHALLENGE</Text>
              <View style={styles.eyebrowRule} />
            </View>
            <Text style={[styles.reviewName, !trimmedName && styles.reviewNameMuted]} numberOfLines={2}>
              {trimmedName || 'Untitled Challenge'}
            </Text>
            <Text style={styles.reviewTagline}>
              {scopedLabel}   ·   {fmtDate(start)} – {fmtDate(end)}   ·   {friendsMode ? 'Friends' : (squad?.name ?? 'Squad')}
            </Text>

            <View style={styles.reviewRule} />

            <ReviewRow label="Scoring" value={scopedLabel} />
            <ReviewRow label="Runs" value={`${durationDays} days`} />
            <ReviewRow label="Starts" value={startWhen === 'now' ? 'Today' : fmtDate(start)} />
            <ReviewRow
              label="Competing"
              value={
                friendsMode
                  ? invited.length === 0
                    ? 'Pick at least one friend'
                    : `You + ${invited.length} ${invited.length === 1 ? 'friend' : 'friends'}`
                  : squad
                    ? `${squad.name} · ${memberCount} eligible`
                    : '—'
              }
            />
            <ReviewRow label="Entry" value="Opt-in" last />
          </View>
        </ScrollView>

        {/* ── Scoring picker ── mode first, then a compact list. Measures with no gain type
             simply aren't offered in Improvement, so the mode never leads anywhere empty. */}
        <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="What Counts">
          <View style={styles.sheetBody}>
            <View style={styles.segTrack}>
              {([
                { v: 'total' as const, label: 'Total' },
                { v: 'gain' as const, label: 'Improvement' },
              ]).map((o) => {
                const on = mode === o.v;
                return (
                  <Pressable
                    key={o.v}
                    onPress={() => {
                      if (o.v === mode) return;
                      // Keep the measure if it supports the new mode; otherwise land on the first that does.
                      const next = o.v === 'gain' ? measure.gain ?? MEASURES.find((m) => m.gain)!.gain! : measure.total;
                      setMetric(next);
                      setMetricKey(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={styles.segBtn}
                  >
                    {on ? <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} /> : null}
                    <Text style={[styles.segLabel, on ? styles.segLabelOn : null]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modeHint}>
              {mode === 'gain'
                ? 'Scores the change, not the total — measured against the same length of time before the challenge.'
                : 'Scores the total over the challenge window.'}
            </Text>

            <View style={styles.measureList}>
              {MEASURES.filter((m) => (mode === 'gain' ? !!m.gain : true)).map((m, i) => {
                const type = (mode === 'gain' ? m.gain! : m.total);
                const on = metric === type;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      setMetric(type);
                      setMetricKey(null);
                      setPickerOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.measureRow, i > 0 ? styles.measureRowDivided : null, on ? styles.measureRowOn : null]}
                  >
                    <View style={[styles.measureIcon, on ? styles.measureIconOn : null]}>
                      <TypeGlyph type={type} size={16} color={on ? flColor.bronze300 : flColor.gray400} />
                    </View>
                    <View style={styles.measureBody}>
                      <View style={styles.measureTitleRow}>
                        <Text style={[styles.measureTitle, on ? styles.measureTitleOn : null]}>{m.title}</Text>
                        {m.badge && mode === 'total' ? (
                          <View style={[styles.badge, m.badge === 'Recommended' ? styles.badgeRec : styles.badgePop]}>
                            <Text style={[styles.badgeText, m.badge === 'Recommended' ? styles.badgeTextRec : null]}>{m.badge}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.measureDesc}>{m.desc}</Text>
                    </View>
                    {on ? <CheckGlyph size={15} color={flColor.bronze300} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </BottomSheet>

        {/* ── Commit ── */}
        <LinearGradient colors={['rgba(9,9,9,0.4)', 'rgba(9,9,9,0.72)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.commitBar, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable onPress={onCreate} disabled={!canCreate} accessibilityRole="button" accessibilityState={{ disabled: !canCreate }} accessibilityLabel="Create challenge">
            {canCreate ? (
              <View style={[styles.commitBtn, styles.commitBtnOn]}>
                <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={StyleSheet.absoluteFill} />
                <SwordsGlyph size={17} color="#F7F5F1" />
                <Text style={styles.commitLabel}>{busy ? 'Creating…' : 'Create Challenge'}</Text>
              </View>
            ) : (
              <View style={[styles.commitBtn, styles.commitBtnOff]}>
                <SwordsGlyph size={17} color={flColor.gray600} />
                <Text style={styles.commitLabelOff}>{busy ? 'Creating…' : 'Create Challenge'}</Text>
              </View>
            )}
          </Pressable>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

function ReviewRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.reviewRow, last ? null : styles.reviewRowDivided]}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ── glyphs ──
function TypeGlyph({ type, size = 16, color = flColor.bronze300 }: { type: ChallengeType; size?: number; color?: string }) {
  const paths: Record<ChallengeType, string[]> = {
    MOST_WORKOUTS: ['M6.5 9v6', 'M17.5 9v6', 'M4 10.5v3', 'M20 10.5v3', 'M6.5 12h11'],
    MOST_VOLUME: ['M4 20V10', 'M9 20V4', 'M14 20v-8', 'M19 20v-5'],
    MOST_DURATION: ['M12 7v5l3.5 2'],
    MAX_LIFT: ['M12 20V6', 'M6 12l6-6 6 6'],
    MOST_PRS: ['M12 3.4l2.1 4.7 5.1.5-3.8 3.4 1.1 5L12 14l-4.6 2.4 1.1-5-3.8-3.4 5.1-.5z'],
    DISTANCE_TOTAL: ['M3 15.6v-3c0-.5.4-.8.9-.6l3.3.8 2.6-2.9c.4-.5 1.2-.4 1.5.2l.7 1.5 6 1.7c1.2.3 2 1.1 2 2.4v.7c0 .4-.3.7-.7.7H4c-.6 0-1-.5-1-1z'],
    MOST_DAYS: ['M4 6.5h16v14H4zM4 10.5h16M8 3.5v3M16 3.5v3', 'M8.5 15l2 2 4-4'],
    MOST_REPS: ['M4 12h3M17 12h3', 'M9 8.5v7M15 8.5v7', 'M9 12h6'],
    EARLY_BIRD: ['M12 17.5a5.5 5.5 0 0 1 0-11', 'M3.5 20h17', 'M12 3.5v1.5M5 6.5l1 1M19 6.5l-1 1'],
    MOST_VARIETY: ['M5 5.5h5v5H5zM14 5.5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z'],
    GAIN_MAX_LIFT: ['M4 18l5-5 3.5 3.5L20 8', 'M15 8h5v5'],
    GAIN_VOLUME: ['M4 18l5-5 3.5 3.5L20 8', 'M15 8h5v5'],
    GAIN_REPS: ['M4 18l5-5 3.5 3.5L20 8', 'M15 8h5v5'],
    GAIN_DISTANCE: ['M4 18l5-5 3.5 3.5L20 8', 'M15 8h5v5'],
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {type === 'MOST_DURATION' ? <Circle cx={12} cy={12} r={8.5} /> : null}
      {paths[type].map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
function SwordsGlyph({ size = 17, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 17.5 L3 6 L3 3 L6 3 L17.5 14.5" />
      <Path d="M13 19 L19 13" />
      <Path d="M14.5 6.5 L18 3 L21 3 L21 6 L17.5 9.5" />
      <Path d="M5 14 L9 18" />
    </Svg>
  );
}
function PodiumGlyph({ size = 15, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 20V10h6v10" />
      <Path d="M3 20v-6h6M15 20v-8h6v8" />
    </Svg>
  );
}
function ClockGlyph({ size = 11, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}
function PeopleGlyph({ size = 11, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
      <Path d="M16 5.3a3.2 3.2 0 0 1 0 5.4" />
      <Path d="M18.2 19a5.6 5.6 0 0 0-3-4.9" />
    </Svg>
  );
}
function CalendarGlyph({ size = 14, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 6.5h16v14H4zM4 10.5h16M8 3.5v3M16 3.5v3" />
    </Svg>
  );
}
function ChevronGlyph({ size = 17, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}
function CheckGlyph({ size = 12, color = '#6E8E74' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}

function TickGlyph() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#1A1206" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  scopeToggle: { flexDirection: 'row', gap: 6, marginBottom: 12, padding: 4, borderRadius: flRadius.md, backgroundColor: flColor.surfaceRecessed },
  scopeTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: flRadius.sm },
  scopeTabOn: { backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorder },
  scopeTabText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
  scopeTabTextOn: { color: flColor.bronze300 },
  friendList: { gap: 8 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, paddingVertical: 9, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  friendRowOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  friendRowPressed: { opacity: 0.88 },
  friendBody: { flex: 1, minWidth: 0 },
  friendName: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  friendHandle: { marginTop: 1, fontSize: 11, color: flColor.gray600 },
  tick: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, borderColor: flColor.charcoal600 },
  tickOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronze300 },
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },

  // hero seal
  hero: { alignItems: 'center', paddingTop: 4 },
  seal: {
    width: 66,
    height: 66,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 2px ${flColor.bronze400}, 0 8px 18px rgba(0,0,0,0.6), 0 0 16px rgba(186, 134, 84,0.3)`,
  },
  sealSmall: { width: 54, height: 54 },
  heroTitle: { marginTop: 13, maxWidth: 320, fontFamily: flFont.display, fontSize: 27, fontWeight: '600', letterSpacing: -0.3, lineHeight: 32, textAlign: 'center', color: flColor.cream100 },
  heroTitleSmall: { fontSize: 22, lineHeight: 26 },
  heroTitleMuted: { color: flColor.charcoal500 },
  heroIntro: { marginTop: 8, fontSize: 12.5, color: flColor.gray600 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600 },
  pillBronze: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorderSubtle },
  pillText: { fontSize: 11, fontWeight: '600', color: flColor.gray400 },
  pillTextBronze: { color: flColor.bronze300 },

  // sections
  sectionLabel: { marginTop: 26, marginBottom: 12, marginLeft: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  card: { backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, padding: 15, gap: 16, boxShadow: flShadow.card },

  // badges — still used by the measure rows in the picker sheet
  badge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: flRadius.pill, borderWidth: 1 },
  badgeRec: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorderSubtle },
  badgePop: { backgroundColor: flColor.charcoal700, borderColor: flColor.charcoal600 },
  badgeText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5, color: flColor.gray600 },
  badgeTextRec: { color: flColor.bronze300 },

  // scoring picker
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  pickerRowPressed: { transform: [{ scale: 0.995 }], opacity: 0.9 },
  pickerIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  pickerBody: { flex: 1, minWidth: 0, gap: 3 },
  pickerValue: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  pickerHint: { fontSize: 11.5, color: flColor.gray600 },

  // picker sheet
  sheetBody: { gap: 14 },
  segTrack: { flexDirection: 'row', gap: 5, padding: 3, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800 },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.pill, overflow: 'hidden' },
  segLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  segLabelOn: { color: '#1A1206' },
  modeHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },
  measureList: { overflow: 'hidden', borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  measureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 12 },
  measureRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  measureRowOn: { backgroundColor: flColor.bronzeTint },
  measureIcon: { width: 32, height: 32, flexShrink: 0, borderRadius: flRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600 },
  measureIconOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  measureBody: { flex: 1, minWidth: 0, gap: 2 },
  measureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  measureTitle: { fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  measureTitleOn: { color: flColor.cream100 },
  measureDesc: { fontSize: 11, color: flColor.gray600 },


  scopeCard: { marginTop: 12, padding: 14, borderRadius: flRadius.lg, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, gap: 11 },
  scoreCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12, padding: 14, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal700 },
  scoreIcon: { width: 30, height: 30, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint },
  scoreBody: { flex: 1, gap: 8 },
  scoreText: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400 },
  baselineText: { fontSize: 11.5, lineHeight: 17, color: flColor.bronze400 },

  // fields
  field: { gap: 7 },
  fieldHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  reqMark: { fontSize: 12, fontWeight: '700', color: flColor.bronze400, lineHeight: 12 },
  count: { fontSize: 11, color: flColor.gray600, fontVariant: ['tabular-nums'] },
  countNear: { color: flColor.bronze400 },
  input: {
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14.5,
    color: flColor.cream100,
  },
  inputMulti: { minHeight: 78, lineHeight: 21 },
  numInput: { width: 74, textAlign: 'center', paddingVertical: 9 },

  // duration
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  chipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.bronze300 },
  chipSub: { fontSize: 10, color: flColor.gray600, opacity: 0.6 },
  chipSubOn: { color: flColor.bronze400 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customLabel: { fontSize: 13, color: flColor.gray400 },
  customHint: { marginLeft: 'auto', fontSize: 11, color: flColor.gray600 },
  divider: { height: 1, backgroundColor: flColor.charcoal700 },
  subLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  runLine: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 11, borderRadius: flRadius.md, backgroundColor: flColor.charcoal900 },
  runText: { flex: 1, fontSize: 12, color: flColor.gray400 },

  // scope
  scopeStrip: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scopeIcon: { width: 40, height: 40, borderRadius: flRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  scopeBody: { flex: 1, minWidth: 0, gap: 3 },
  scopeName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  scopeSub: { fontSize: 11.5, color: flColor.gray600 },
  optInHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  // review
  review: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 26,
    padding: 18,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  eyebrowRule: { width: 16, height: 1, backgroundColor: flColor.bronzeBorder },
  eyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 2, color: flColor.bronze400 },
  reviewName: { marginTop: 10, fontFamily: flFont.display, fontSize: 26, fontWeight: '700', textAlign: 'center', color: flColor.cream100, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 },
  reviewNameMuted: { color: flColor.charcoal500 },
  reviewTagline: { marginTop: 7, fontSize: 11.5, textAlign: 'center', color: flColor.gray600 },
  reviewRule: { height: 1, marginTop: 16, marginBottom: 4, backgroundColor: flColor.bronzeBorderSubtle },
  reviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  reviewRowDivided: { borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  reviewLabel: { width: 92, fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  reviewValue: { flex: 1, fontSize: 13, color: flColor.cream100 },

  // commit
  commitBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  commitBtn: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1 },
  commitBtnOn: { borderColor: flColor.bronzeMetalBorder, boxShadow: `${flShadow.bronzeMetalTopRim}, ${flShadow.card}` },
  commitBtnOff: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600, opacity: 0.75 },
  commitLabel: { fontSize: 15, fontWeight: '700', color: '#F7F5F1', textShadowColor: 'rgba(8,5,2,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  commitLabelOff: { fontSize: 15, fontWeight: '600', color: flColor.gray600 },
});
