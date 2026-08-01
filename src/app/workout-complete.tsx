import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/forge/composites/Button';
import { Card } from '@/components/forge/composites/Surface';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { saveWorkoutAsTemplate } from '@/data/templates-live';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { useUnits } from '@/lib/settings';
import { displayWeight } from '@/domain/settings/units';
import { getProgramDefinitions } from '@/domain/training/programs';
import { DEMO_ACTIVE_ID } from '@/domain/training/active-program-core';
import { fetchCompletion, saveReflection, type CompletionHero, type ExerciseDelta } from '@/data/workout-complete-live';
import { addSquadPost, recapSummaryFrom } from '@/data/squad-feed-live';
import { fetchMySquads, type SquadSummary } from '@/data/squad-live';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

type Step = 'seal' | 'record' | 'reflect' | 'share';

// "Under Iron" clock, mm:ss (h:mm:ss past an hour) — matches the design's 52:18.
function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}
// thousands separators without Intl (Hermes-safe) — matches "18,140".
function thousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
// One stable quote per session (design uses ForgeQuotes.random()); picked by workout id so a re-render won't reshuffle.
const QUOTES = [
  'History is permanent. Outcomes cannot change.',
  'The iron never lies. It only records.',
  'What you built today is already yours forever.',
  'Every session is a page. This one is written.',
  'Strength is a story told one rep at a time.',
];
function quoteFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return QUOTES[h % QUOTES.length];
}
// The next workout in the active program's sequence, after the one just finished (wraps at the end).
// Null if the completed workout isn't part of the active program (e.g. a freestyle session).
function nextWorkoutName(completed: string): string | null {
  const defs = getProgramDefinitions();
  const def = defs.find((d) => d.id === DEMO_ACTIVE_ID) ?? defs[0];
  if (!def) return null;
  const names = def.blocks.flatMap((b) => b.workouts.map((w) => w.name));
  if (names.length < 2) return null;
  const i = names.indexOf(completed);
  if (i < 0) return null;
  return names[(i + 1) % names.length];
}

/**
 * W-17 Workout Complete (minimal-real, 4-stage: Seal · Record · Reflect · Share). A separate route
 * reached by W-9 Finish (`router.replace('/workout-complete?id=…')`) — the workout is already durably
 * committed (seam (b)); this renders it back from the DB. The Reflect note is the one post-commit write
 * (optional, `workouts.reflection`). Deferred: honor hero moment, "How You Improved" deltas, resurfaced
 * memory (need the honor service / set-history). Primary path = Seal → hold → Legacy; the note lives on
 * the secondary "See the details → Reflect" branch, so most workouts intentionally carry no reflection.
 */
export default function WorkoutComplete() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { data, loading, error } = useQuery(() => fetchCompletion(String(id)), [id]);
  const { showToast } = useToast();
  // Volume is stored in lb; show it in the athlete's system. `fmt` re-expresses per-set strings.
  const { units, fmt } = useUnits();
  const [mySquads, setMySquads] = useState<SquadSummary[] | null>(null);
  const [squadPickerOpen, setSquadPickerOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const vol = (lb: number) => thousands(displayWeight(lb, units).value);
  const volUnit = displayWeight(0, units).unit;
  const [step, setStep] = useState<Step>('seal');
  /* Saving the day as a template. Offered on The Record and nowhere else — it belongs beside the shape it
     would keep, and the primary path (Seal → hold → Legacy) never sees it, which is the point. Most
     sessions should not be templates. */
  const [savedTemplate, setSavedTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  /* Naming happens at save time, not afterwards. A template called "Freestyle Workout" is one you have
     to open to identify, and by the time you notice you're on a different screen. */
  const [nameOpen, setNameOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [note, setNote] = useState('');
  const [sealed, setSealed] = useState(false);
  const [hold] = useState(() => new Animated.Value(0));
  const [holdPct, setHoldPct] = useState(0); // mirror of the hold value → "Keep holding…" + ink-flip past 55%
  // First-run "Chapter comes alive" reveal (ONB-D18) — a restrained bronze fade/scale-in on workout #1.
  const [reveal] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (data?.isFirstWorkout) Animated.timing(reveal, { toValue: 1, duration: 1100, useNativeDriver: true }).start();
  }, [data?.isFirstWorkout, reveal]);
  useEffect(() => {
    const listenerId = hold.addListener(({ value }) => setHoldPct(value));
    return () => hold.removeListener(listenerId);
  }, [hold]);

  const goHome = () => router.replace('/(tabs)/legacy');

  /** Opens the naming sheet, prefilled with what the session was called. */
  const openTemplateName = () => {
    if (!data || savingTemplate || savedTemplate) return;
    setTemplateName(data.workoutName ?? '');
    setNameOpen(true);
  };

  const keepAsTemplate = async () => {
    if (!data || savingTemplate || savedTemplate) return;
    setSavingTemplate(true);
    try {
      // Blank falls back to the database's own default (the session's name) rather than saving an
      // empty title — the sheet allows clearing the field, and that shouldn't produce a nameless row.
      const id = await saveWorkoutAsTemplate(data.workoutId, templateName.trim() || undefined);
      if (id) {
        setSavedTemplate(true);
        setNameOpen(false);
        showToast(`Saved “${templateName.trim() || data.workoutName}” to your templates.`);
      } else {
        // Nothing was logged, so there is no shape to keep — say that rather than claiming a success.
        setNameOpen(false);
        showToast('Nothing to save from this one.');
      }
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSavingTemplate(false);
    }
  };

  const startHold = () => {
    Animated.timing(hold, { toValue: 1, duration: 900, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        setSealed(true);
        const nav = typeof navigator !== 'undefined' ? (navigator as { vibrate?: (p: number[]) => void }) : null;
        nav?.vibrate?.([10, 28, 45]); // haptics (web only; no-ops on native)
        setTimeout(goHome, 650);
      }
    });
  };
  const cancelHold = () => {
    if (sealed) return;
    hold.stopAnimation();
    Animated.timing(hold, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const onSealNote = async () => {
    if (note.trim() && data) {
      try {
        await saveReflection(data.workoutId, note.trim());
      } catch {
        /* note is optional — never block the return home */
      }
    }
    goHome();
  };
  const onShare = () => {
    if (!data) return;
    void Share.share({ title: 'Forge Legacy', message: `${data.workoutName} — sealed. ${vol(data.volume)} ${volUnit} moved.` });
  };
  const postRecapTo = (squad: SquadSummary) => {
    if (!data || sharing) return;
    setSharing(true);
    addSquadPost({ squadId: squad.id, type: 'recap', body: '', workoutId: data.workoutId, workoutSummary: recapSummaryFrom(data) }).then(
      () => {
        setSharing(false);
        setSquadPickerOpen(false);
        showToast(`Shared to ${squad.name}`);
      },
      (e: unknown) => {
        setSharing(false);
        showToast(e instanceof Error ? e.message : 'Couldn’t share to your squad.');
      },
    );
  };
  const onShareToSquad = async () => {
    if (sharing) return;
    let squads = mySquads;
    if (!squads) {
      squads = await fetchMySquads().catch(() => [] as SquadSummary[]);
      setMySquads(squads);
    }
    if (!squads.length) {
      showToast('Create or join a squad first');
      return;
    }
    if (squads.length === 1) {
      postRecapTo(squads[0]);
      return;
    }
    setSquadPickerOpen(true);
  };

  if (loading || !data) {
    return (
      <Shell>
        <View style={styles.center}>{error ? <Text style={styles.err}>Couldn’t load your summary.</Text> : <ActivityIndicator color={flColor.bronze400} />}</View>
      </Shell>
    );
  }

  // ── Stage 1 · Seal ──
  if (step === 'seal') {
    const fillW = hold.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    // Prefer the real program's next session; fall back to the catalog sequence for demo/freestyle sessions.
    const nextName = data.nextWorkoutName ?? nextWorkoutName(data.workoutName);

    // First-run reveal (ONB-D18): the chapter comes alive on workout #1. Arrival, not achievement — no
    // reward/rank/honor/streak language (honest against D22; leaves the First-Honor check for ONB-D19).
    if (data.isFirstWorkout) {
      const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
      return (
        <Shell>
          <Pressable style={styles.shareIcon} onPress={() => setStep('share')} accessibilityRole="button" accessibilityLabel="Share">
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={6} cy={12} r={2.5} />
            <Circle cx={17} cy={6} r={2.5} />
            <Circle cx={17} cy={18} r={2.5} />
            <Path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6" />
            </Svg>
          </Pressable>
          <View style={styles.center}>
            <Text style={styles.firstEyebrow}>Your Chapter begins</Text>
            <Animated.View style={{ opacity: reveal, transform: [{ scale }] }}>
              <SealMedallion size={132} sealed={sealed} />
            </Animated.View>
            <Animated.Text style={[styles.revealChapter, { opacity: reveal, transform: [{ scale }] }]}>
              {data.chapterName ?? 'Your Chapter'}
            </Animated.Text>
            <Animated.Text style={[styles.revealLine, { opacity: reveal }]}>The first page is written.</Animated.Text>
            <View style={styles.sealStats}>
              <Stat n={fmtDuration(data.durationSec)} label="Under Iron" />
              <View style={styles.statDivider} />
              <Stat n={vol(data.volume)} label="Volume" />
            </View>
            {data.hero ? <Hero hero={data.hero} /> : null}
            <Pressable style={styles.holdBtn} onPressIn={startHold} onPressOut={cancelHold} accessibilityRole="button" accessibilityLabel="Press and hold to seal">
              <AnimatedGradient
              colors={flGradient.bronzeMetallic.colors}
              locations={flGradient.bronzeMetallic.locations}
              start={flGradient.bronzeMetallic.start}
              end={flGradient.bronzeMetallic.end}
              style={[styles.holdFill, { width: fillW }]}
            />
              <Text style={[styles.holdText, (sealed || holdPct > 0.55) && styles.holdTextDark]}>{sealed ? 'Sealed' : holdPct > 0 ? 'Keep holding…' : 'Hold to Seal'}</Text>
            </Pressable>
            <Pressable onPress={() => setStep('record')} accessibilityRole="button" accessibilityLabel="See the details" style={styles.textLink}>
              <Text style={styles.textLinkText}>See the details</Text>
            </Pressable>
          </View>
        </Shell>
      );
    }

    return (
      <Shell>
        <Pressable style={styles.shareIcon} onPress={() => setStep('share')} accessibilityRole="button" accessibilityLabel="Share">
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={6} cy={12} r={2.5} />
            <Circle cx={17} cy={6} r={2.5} />
            <Circle cx={17} cy={18} r={2.5} />
            <Path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6" />
          </Svg>
        </Pressable>
        <View style={styles.center}>
          {data.chapterName ? <Text style={styles.eyebrow}>{data.chapterName}</Text> : null}
          <SealMedallion size={132} sealed={sealed} />
          {/*
            Name the destination. "Session Sealed" tells the athlete something happened but not where it
            went — and the chapter card is the only place it lands, so say so.
          */}
          <Text style={[styles.sealStatus, sealed && styles.sealStatusSealed]}>
            {sealed ? (data.chapterName ? `Sealed to ${data.chapterName}` : 'Session Sealed') : 'Session Complete'}
          </Text>
          <Text style={styles.sealTitle}>{data.workoutName}</Text>
          {data.dateLabel ? <Text style={styles.sealSubtitle}>{data.dateLabel}</Text> : null}
          <View style={styles.sealStats}>
            <Stat n={fmtDuration(data.durationSec)} label="Under Iron" />
            <View style={styles.statDivider} />
            <Stat n={vol(data.volume)} label="Volume" />
          </View>
          {data.hero ? <Hero hero={data.hero} /> : null}
          {!data.hero || !data.hero.featured ? (
            <View style={styles.quoteRow}>
              <LinearGradient colors={[flColor.bronze400, 'rgba(0,0,0,0)']} style={styles.quoteRule} />
              <Text style={styles.quote}>{quoteFor(data.workoutId)}</Text>
            </View>
          ) : null}

          <View style={styles.sealBottom}>
            {nextName ? (
              <View style={styles.upNext}>
                <View style={styles.upNextDiamond} />
                <Text style={styles.upNextText}>Up next · {nextName}</Text>
              </View>
            ) : null}
            <Pressable
              style={[styles.holdBtn, styles.holdBtnInSection]}
              onPressIn={startHold}
              onPressOut={cancelHold}
              accessibilityRole="button"
              accessibilityLabel="Press and hold to seal"
            >
              <AnimatedGradient
                colors={flGradient.bronzeMetallic.colors}
                locations={flGradient.bronzeMetallic.locations}
                start={flGradient.bronzeMetallic.start}
                end={flGradient.bronzeMetallic.end}
                style={[styles.holdFill, { width: fillW }]}
              />
              <Text style={[styles.holdText, (sealed || holdPct > 0.55) && styles.holdTextDark]}>{sealed ? 'Sealed' : holdPct > 0 ? 'Keep holding…' : 'Hold to Seal'}</Text>
            </Pressable>
            <Pressable onPress={() => setStep('record')} accessibilityRole="button" accessibilityLabel="See the details" style={styles.textLink}>
              <Text style={styles.textLinkText}>See the details</Text>
            </Pressable>
          </View>
        </View>
      </Shell>
    );
  }

  // ── Stage 2 · Record — "See the details" ──
  if (step === 'record') {
    const volUp = data.volumeDelta != null && data.volumeDelta > 0;
    return (
      <Shell>
        <View style={styles.recHeader}>
          <Pressable onPress={() => setStep('seal')} accessibilityRole="button" accessibilityLabel="Back to the seal" style={styles.recBack}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 5l-7 7 7 7" />
            </Svg>
          </Pressable>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="square" strokeLinejoin="miter">
            <Path d="M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5" />
            <Path d="M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z" />
          </Svg>
          <Text style={styles.recHeaderTitle}>The Record</Text>
        </View>
        <ScrollView contentContainerStyle={styles.recScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.recEyebrow}>
            {data.workoutName}
            {data.dateLabel ? ` · Sealed ${data.dateLabel}` : ''}
          </Text>

          <View style={styles.recEvidence}>
            <View style={styles.recEvidenceLeft}>
              <Text style={styles.recVolume}>{vol(data.volume)}</Text>
              <Text style={styles.recVolumeLabel}>
                Total volume
                {data.volumeDelta != null ? (
                  <Text>
                    {' · '}
                    <Text style={volUp ? styles.deltaUp : styles.deltaFlat}>
                      {volUp ? '+' : ''}
                      {vol(data.volumeDelta)}
                    </Text>
                    {' vs last'}
                  </Text>
                ) : (
                  <Text>{` · ${volUnit}`}</Text>
                )}
              </Text>
            </View>
            <View style={styles.recEvidenceRight}>
              <Text style={styles.recDuration}>{fmtDuration(data.durationSec)}</Text>
              <Text style={styles.recDurationLabel}>Under Iron</Text>
            </View>
          </View>

          {volUp ? (
            <View style={styles.tangible}>
              <View style={styles.tangibleDiamond} />
              <Text style={styles.tangibleText}>Your heaviest {data.workoutName} in a while</Text>
            </View>
          ) : null}

          <Text style={styles.recHeading}>How You Improved</Text>
          <View style={styles.recTable}>
            {data.exercises.map((ex) => (
              <View key={ex.name} style={styles.recRow}>
                <View style={styles.recRowText}>
                  <View style={styles.recNameLine}>
                    <Text style={styles.recExName}>{ex.name}</Text>
                    {ex.isPR ? (
                      <View style={styles.prBadge}>
                        <Text style={styles.prBadgeText}>PR</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.recTop}>
                    {ex.sets} set{ex.sets === 1 ? '' : 's'}
                    {ex.topSet ? ` · top ${fmt(ex.topSet)}` : ''}
                  </Text>
                </View>
                {ex.delta ? <Text style={[styles.recDelta, ex.delta.kind === 'hold' ? styles.deltaFlat : styles.deltaUp]}>{deltaLabel(ex.delta, units)}</Text> : null}
              </View>
            ))}
          </View>

          {/* Quiet, and only here. A program day is already reusable BY its program; this is for the
              sessions with no home — one built as you went, or one reshaped past its program. */}
          <Pressable
            onPress={openTemplateName}
            disabled={savingTemplate || savedTemplate}
            accessibilityRole="button"
            accessibilityLabel={savedTemplate ? 'Saved to your templates' : 'Save this day as a template'}
            accessibilityState={{ disabled: savingTemplate || savedTemplate }}
            style={({ pressed }) => [styles.templateRow, pressed && !savedTemplate ? styles.templateRowPressed : null]}
          >
            {savedTemplate ? <CheckGlyph /> : <TemplateGlyph />}
            <Text style={[styles.templateText, savedTemplate ? styles.templateTextDone : null]}>
              {savedTemplate ? 'Saved to your templates' : savingTemplate ? 'Saving…' : 'Save this day as a template'}
            </Text>
          </Pressable>

          <View style={styles.longGameWrap}>
            <Text style={styles.longGameLabel}>The Long Game</Text>
            <Text style={styles.longGameCopy}>This session is now permanent — another entry in a chapter still being written.</Text>
            <View style={styles.chapterCard}>
              <View style={styles.chapterGlyph}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="square" strokeLinejoin="miter">
                  <Path d="M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5" />
                  <Path d="M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z" />
                </Svg>
              </View>
              <View style={styles.chapterText}>
                <Text style={styles.chapterName}>{data.chapterName ?? 'Your Chapter'}</Text>
                <Text style={styles.chapterSub}>{data.chapterOrdinal ? `Your ${ord(data.chapterOrdinal)} session in this chapter · ongoing` : 'ongoing'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.recAction}>
            <Button variant="primary" fullWidth onPress={() => setStep('reflect')} accessibilityLabel="Done">
              Done
            </Button>
          </View>
        </ScrollView>
      </Shell>
    );
  }

  // ── Stage 3 · Reflect ──
  if (step === 'reflect') {
    return (
      <Shell>
        <View style={styles.reflectWrap}>
          <Text style={styles.eyebrow}>One Last Thing</Text>
          <Text style={styles.reflectTitle}>A note for future you</Text>
          <Text style={styles.reflectSub}>One line. You’ll read it again someday.</Text>
          {data.pastReflection ? (
            <View style={styles.pastRef}>
              <Text style={styles.pastRefLabel}>{data.pastReflection.label}</Text>
              <Text style={styles.pastRefText}>“{data.pastReflection.text}”</Text>
            </View>
          ) : null}
          <TextInput
            style={styles.reflectInput}
            placeholder="Today I…"
            placeholderTextColor={flColor.gray600}
            multiline
            value={note}
            onChangeText={setNote}
            accessibilityLabel="Your reflection"
          />
          {/* A photo is never more available than right after the session that earned it. Routes to the
              shared capture flow against the ACTIVE chapter, which is the one this workout belongs to —
              creation stays a chapter action (L-15 arch §2), this is just the moment it is offered. */}
          <Pressable
            onPress={() => router.push('/add-photo')}
            accessibilityRole="button"
            accessibilityLabel="Add a photo or video to this chapter"
            style={({ pressed }) => [styles.addMedia, pressed ? styles.addMediaPressed : null]}
          >
            <CameraGlyph />
            <Text style={styles.addMediaLabel}>Add a Photo or Video</Text>
          </Pressable>

          <View style={styles.reflectActions}>
            <Button variant="primary" fullWidth onPress={onSealNote} accessibilityLabel="Seal the note">
              Seal the Note
            </Button>
            <Button variant="text" fullWidth onPress={goHome} accessibilityLabel="Skip for today">
              Skip for today
            </Button>
          </View>
        </View>
      </Shell>
    );
  }

  // ── Stage 4 · Share ──
  return (
    <Shell>
      <View style={styles.center}>
        <Card variant="hero" style={styles.shareCard}>
          <SealMedallion size={96} />
          <Text style={styles.shareSealed}>Session Sealed</Text>
          <Text style={styles.shareName}>{data.workoutName}</Text>
          {data.chapterName || data.dateLabel ? <Text style={styles.shareChapter}>{[data.chapterName, data.dateLabel].filter(Boolean).join(' · ')}</Text> : null}
          <View style={styles.shareDivider} />
          <View style={styles.sealStats}>
            <Stat n={vol(data.volume)} label="Volume" />
            <View style={styles.statDivider} />
            <Stat n={fmtDuration(data.durationSec)} label="Under Iron" />
          </View>
          <Text style={styles.shareWordmark}>FORGE LEGACY</Text>
          <Text style={styles.shareTagline}>Build your story.</Text>
        </Card>
        <View style={styles.shareActions}>
          <Button variant="primary" fullWidth onPress={onShare} accessibilityLabel="Share">
            Share
          </Button>
          <Button variant="secondary" fullWidth onPress={onShareToSquad} accessibilityLabel="Share to squad">
            {sharing ? 'Sharing…' : 'Share to Squad'}
          </Button>
          <Button variant="text" fullWidth onPress={() => setStep('seal')} accessibilityLabel="Back">
            Back
          </Button>
        </View>
      </View>

      <Modal visible={squadPickerOpen} transparent animationType="fade" onRequestClose={() => setSquadPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setSquadPickerOpen(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <Text style={styles.pickerTitle}>Share to which squad?</Text>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {(mySquads ?? []).map((s, i) => (
                <Pressable key={s.id} onPress={() => postRecapTo(s)} disabled={sharing} accessibilityRole="button" accessibilityLabel={`Share to ${s.name}`} style={[styles.pickerRow, i > 0 ? styles.pickerRowDiv : null]}>
                  <Text style={styles.pickerName} numberOfLines={1}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Name it here, while you still remember what it was. Prefilled with the session's own name so
          keeping that is one tap, and changing it is the same one tap it would have been later. */}
      <BottomSheet open={nameOpen} onClose={() => setNameOpen(false)} title="Name this template">
        <TextInput
          value={templateName}
          onChangeText={setTemplateName}
          placeholder="e.g. Push Day A"
          placeholderTextColor={flColor.gray600}
          style={styles.nameInput}
          accessibilityLabel="Template name"
          maxLength={60}
          autoFocus
          selectTextOnFocus
          returnKeyType="done"
          onSubmitEditing={() => void keepAsTemplate()}
        />
        <Text style={styles.nameHint}>You&apos;ll find it under Workouts → Templates.</Text>
        <View style={styles.nameActions}>
          <Button variant="secondary" fullWidth onPress={() => setNameOpen(false)} accessibilityLabel="Cancel">
            Cancel
          </Button>
          <Button variant="primary" fullWidth onPress={() => void keepAsTemplate()} accessibilityLabel="Save template">
            {savingTemplate ? 'Saving…' : 'Save Template'}
          </Button>
        </View>
      </BottomSheet>
    </Shell>
  );
}

// ── pieces ──
function Shell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.4)' }} />
      {children}
    </View>
  );
}
/** The design's flat forge-mark: three ascending pillars on a stepped plinth, filled (from forge-symbols.js). */
function ForgeMarkGlyph({ size = 66, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M10.9 3.2H13.1V15H10.9Z" fill={color} />
      <Path d="M7.6 7.1L9.6 5.8V15H7.6Z" fill={color} />
      <Path d="M16.4 7.1L14.4 5.8V15H16.4Z" fill={color} />
      <Path d="M6.8 15.4H17.2V16.2H6.8Z" fill={color} />
      <Path d="M5.6 16.6H18.4V17.4H5.6Z" fill={color} />
      <Path d="M4.4 17.8H19.6V18.6H4.4Z" fill={color} />
    </Svg>
  );
}

/**
 * The forged completion seal — layered exactly as the design: a breathing ember halo, a charcoal disc with
 * a bronze rim (glow-subtle + border-inset), an inner bronze-subtle ring, and the flat forge-mark in bronze,
 * with a stamp-ring that expands + fades on seal. Reduced-motion collapses the animations.
 */
function SealMedallion({ size = 132, sealed = false }: { size?: number; sealed?: boolean }) {
  const reduce = useReducedMotion();
  const [glow] = useState(() => new Animated.Value(0.6));
  const [stamp] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) {
      glow.setValue(0.65);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.9, duration: 1700, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 1700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, reduce]);
  useEffect(() => {
    if (sealed) Animated.timing(stamp, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [sealed, stamp]);
  const gs = size + 28;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -14, left: -14, opacity: glow }}>
        <Svg width={gs} height={gs}>
          <Defs>
            <RadialGradient id="sealGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#E0913F" stopOpacity={0.45} />
              <Stop offset="60%" stopColor="#C8853E" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#C8853E" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={gs} height={gs} fill="url(#sealGlow)" />
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: `${flShadow.glowSubtle}, ${flShadow.borderInset}` }} />
      <View style={{ position: 'absolute', top: 10, left: 10, width: size - 20, height: size - 20, borderRadius: (size - 20) / 2, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle }} />
      <View style={{ position: 'relative', zIndex: 1 }}>
        <ForgeMarkGlyph size={Math.round(size * 0.5)} />
      </View>
      {sealed ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -14,
            left: -14,
            width: gs,
            height: gs,
            borderRadius: gs / 2,
            borderWidth: 2,
            borderColor: flColor.bronze300,
            opacity: stamp.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
            transform: [{ scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] }) }],
          }}
        />
      ) : null}
    </View>
  );
}
function Stat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function ord(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
function deltaLabel(d: ExerciseDelta, units: import('@/domain/settings/units').UnitSystem): string {
  if (d.kind === 'hold') return 'Held';
  if (d.kind === 'reps') return `+${d.n} reps`;
  const w = displayWeight(d.n, units);
  return `+${w.value} ${w.unit}`;
}
// Exact forge-symbols glyphs: laurel (honor) · spark (pr) · medal (milestone) · flame (consistency).
const HERO_GLYPHS: Record<CompletionHero['kind'], ReactNode> = {
  honor: (
    <>
      <Path d="M10.61 19.17L9.91 19.00L9.24 18.76L8.59 18.45L7.97 18.09L7.40 17.67L6.87 17.19L6.38 16.66L5.95 16.09L5.58 15.48L5.27 14.83L5.03 14.16L4.85 13.47L4.74 12.76L4.70 12.05L4.73 11.33L4.83 10.63L5.00 9.93L5.24 9.26L5.54 8.61L5.90 7.99L6.32 7.41L6.80 6.88L7.32 6.40L7.89 5.96L8.50 5.59L9.15 5.28" />
      <Path d="M9.50 18.86Q7.63 18.13 6.21 19.09Q7.75 19.84 9.50 18.86Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M7.21 17.51Q5.50 15.95 3.58 16.40Q4.92 17.84 7.21 17.51Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M5.55 15.43Q4.49 13.31 2.48 13.03Q3.24 14.91 5.55 15.43Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M4.75 12.89Q4.52 10.59 2.80 9.63Q2.83 11.61 4.75 12.89Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M4.92 10.23Q5.46 8.24 4.33 6.89Q3.72 8.55 4.92 10.23Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M6.02 7.81Q7.06 6.39 6.57 4.97Q5.58 6.10 6.02 7.81Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M7.92 5.95Q9.10 5.19 9.14 4.00Q8.08 4.56 7.92 5.95Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M13.39 19.17L14.09 19.00L14.76 18.76L15.41 18.45L16.03 18.09L16.60 17.67L17.13 17.19L17.62 16.66L18.05 16.09L18.42 15.48L18.73 14.83L18.97 14.16L19.15 13.47L19.26 12.76L19.30 12.05L19.27 11.33L19.17 10.63L19.00 9.93L18.76 9.26L18.46 8.61L18.10 7.99L17.68 7.41L17.20 6.88L16.68 6.40L16.11 5.96L15.50 5.59L14.85 5.28" />
      <Path d="M14.50 18.86Q16.37 18.13 17.79 19.09Q16.25 19.84 14.50 18.86Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M16.79 17.51Q18.50 15.95 20.42 16.40Q19.08 17.84 16.79 17.51Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M18.45 15.43Q19.51 13.31 21.52 13.03Q20.76 14.91 18.45 15.43Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M19.25 12.89Q19.48 10.59 21.20 9.63Q21.17 11.61 19.25 12.89Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M19.08 10.23Q18.54 8.24 19.67 6.89Q20.28 8.55 19.08 10.23Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M17.98 7.81Q16.94 6.39 17.43 4.97Q18.42 6.10 17.98 7.81Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M16.08 5.95Q14.90 5.19 14.86 4.00Q15.92 4.56 16.08 5.95Z" fill={flColor.bronze300} stroke="none" />
      <Path d="M10.61 19.17L14.99 21.27" />
      <Path d="M13.39 19.17L9.01 21.27" />
    </>
  ),
  pr: (
    <>
      <Path d="M11 3c.4 3.4 1.6 4.6 5 5-3.4.4-4.6 1.6-5 5-.4-3.4-1.6-4.6-5-5 3.4-.4 4.6-1.6 5-5z" />
      <Path d="M18 13c.2 1.7.8 2.3 2.5 2.5-1.7.2-2.3.8-2.5 2.5-.2-1.7-.8-2.3-2.5-2.5 1.7-.2 2.3-.8 2.5-2.5z" />
    </>
  ),
  milestone: (
    <>
      <Circle cx={12} cy={14.5} r={4.8} />
      <Circle cx={12} cy={14.5} r={1.8} />
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
    </>
  ),
  consistency: <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />,
};
function HeroGlyph({ kind, size = 22 }: { kind: CompletionHero['kind']; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      {HERO_GLYPHS[kind]}
    </Svg>
  );
}
/** The "one true thing" — featured (honor/PR) dominates; standard (milestone/consistency) is a quiet line. */
function Hero({ hero }: { hero: CompletionHero }) {
  if (hero.featured) {
    return (
      <View style={styles.heroFeatured}>
        <HeroGlyph kind={hero.kind} size={26} />
        <View style={styles.heroTextF}>
          <Text style={styles.heroEyebrowF}>{hero.eyebrow}</Text>
          <Text style={styles.heroTitleF}>{hero.title}</Text>
          {hero.note ? <Text style={styles.heroNoteF}>{hero.note}</Text> : null}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.heroStandard}>
      <HeroGlyph kind={hero.kind} size={22} />
      <View style={styles.heroTextS}>
        <Text style={styles.heroEyebrowS}>{hero.eyebrow}</Text>
        <Text style={styles.heroTitleS}>{hero.title}</Text>
      </View>
    </View>
  );
}

function CameraGlyph({ size = 17, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <Path d="M15.2 13a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0z" />
    </Svg>
  );
}

function TemplateGlyph({ size = 15, color = flColor.bronze400 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 4h14v16H5zM8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
    </Svg>
  );
}
function CheckGlyph({ size = 15, color = '#8FB295' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  nameInput: { paddingHorizontal: 13, paddingVertical: 12, minHeight: 46, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 15, color: flColor.cream100 },
  nameHint: { marginTop: 8, fontSize: 12, color: flColor.gray600 },
  nameActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  templateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, paddingVertical: 12 },
  templateRowPressed: { opacity: 0.82 },
  templateText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },
  templateTextDone: { color: flColor.gray600 },
  addMedia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 18, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  addMediaPressed: { opacity: 0.88, borderColor: flColor.bronzeBorder },
  addMediaLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 12 },
  scroll: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  err: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15 },

  shareIcon: { position: 'absolute', top: 54, right: 22, zIndex: 2, padding: 6 },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 2.6, textTransform: 'uppercase', color: flColor.gray400 },

  quoteRow: { flexDirection: 'row', gap: 12, maxWidth: 300, marginTop: 22, alignSelf: 'center' },
  quoteRule: { width: 2, borderRadius: 1 },

  firstEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronze400 },
  revealChapter: { fontFamily: flFont.display, fontSize: 30, fontWeight: '600', color: flColor.cream100, textAlign: 'center', marginTop: 6, letterSpacing: -0.3 },
  revealLine: { fontFamily: flFont.sans, fontSize: 14.5, color: flColor.gray400, textAlign: 'center', marginTop: 4 },
  sealStatus: { fontSize: 12, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 12 },
  sealStatusSealed: { color: flColor.bronze300 },
  sealTitle: { fontFamily: flFont.display, fontSize: 38, fontWeight: '700', letterSpacing: 0.4, color: flColor.cream100, textAlign: 'center' },
  sealSubtitle: { fontFamily: flFont.sans, fontSize: 14, letterSpacing: 1, color: flColor.gray400, marginTop: 8 },
  sealStats: { flexDirection: 'row', marginTop: 22 },
  statDivider: { width: 1, backgroundColor: flColor.bronzeBorderSubtle },
  stat: { alignItems: 'center', gap: 3, paddingHorizontal: 18 },
  statN: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', color: flColor.cream100 },
  statLabel: { fontFamily: flFont.sans, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },

  honorHero: { alignItems: 'center', gap: 3, marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  honorKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  honorName: { fontFamily: flFont.display, fontSize: 17, color: flColor.cream100 },
  prCallout: { alignItems: 'center', gap: 3, marginTop: 8 },
  prKicker: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },
  prLine: { fontFamily: flFont.display, fontSize: 18, color: flColor.bronze400 },
  quote: { flex: 1, fontFamily: flFont.display, fontSize: 16, fontStyle: 'italic', lineHeight: 22, color: flColor.bronze300, textAlign: 'left' },

  holdBtn: { marginTop: 26, width: '100%', height: 54, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.borderInset },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  holdBtnInSection: { marginTop: 0 },
  sealBottom: { width: '100%', maxWidth: 320, marginTop: 32 },
  upNext: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 15 },
  upNextDiamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  upNextText: { fontSize: 12, color: flColor.gray600 },
  holdText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze300 },
  holdTextDark: { color: '#1A1206' },
  // alignSelf, not just textAlign: the Pressable would otherwise stretch to the column's full width and
  // sit its label on the left edge, off-axis from the medallion and the Hold-to-Seal button above it.
  textLink: { alignSelf: 'center', paddingVertical: 12 },
  textLinkText: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },

  back: { alignSelf: 'flex-start', marginBottom: 14 },
  backText: { fontFamily: flFont.sans, fontSize: 15, color: flColor.gray400 },
  recVolume: { fontFamily: flFont.display, fontSize: 46, fontWeight: '600', color: flColor.cream100 },
  recVolumeLabel: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray600, marginTop: -2 },
  recList: { marginTop: 26, gap: 2 },
  recHeading: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 28, marginBottom: 10 },
  recRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  recRowText: { gap: 2 },
  recExName: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  recTop: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  prBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: flRadius.sm, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronze400 },
  prBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: flColor.bronze400 },
  longGame: { marginTop: 26, gap: 8 },
  longGameCopy: { fontFamily: flFont.sans, fontSize: 14, lineHeight: 21, color: flColor.gray400 },
  longGameChapter: { fontFamily: flFont.display, fontSize: 15, color: flColor.bronze400 },
  recAction: { marginTop: 30 },

  reflectWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  reflectTitle: { fontFamily: flFont.display, fontSize: 30, fontWeight: '600', color: flColor.cream100 },
  reflectSub: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },
  reflectInput: {
    marginTop: 10, minHeight: 96, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900,
    borderRadius: flRadius.md, padding: 16, fontFamily: flFont.display, fontStyle: 'italic', fontSize: 17, color: flColor.cream100, textAlignVertical: 'top',
  },
  reflectActions: { marginTop: 14, gap: 4 },

  shareCard: { width: '100%', alignItems: 'center', gap: 8 },
  shareSealed: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 6 },
  shareName: { fontFamily: flFont.display, fontSize: 24, color: flColor.cream100 },
  shareChapter: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  shareDivider: { width: '60%', height: 1, backgroundColor: flColor.bronzeBorderSubtle, marginVertical: 10 },
  shareWordmark: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: flColor.bronze400, marginTop: 10 },
  shareActions: { width: '100%', gap: 4, marginTop: 24 },
  shareTagline: { fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginTop: 3 },

  // hero ladder
  heroFeatured: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', maxWidth: 312, marginTop: 24, paddingVertical: 16, paddingHorizontal: 18, borderRadius: flRadius.lg, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  heroTextF: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-start' },
  heroEyebrowF: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  heroTitleF: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, lineHeight: 22 },
  heroNoteF: { fontSize: 11.5, color: flColor.gray400 },
  heroStandard: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 290, marginTop: 22, paddingVertical: 12, paddingHorizontal: 15, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600 },
  heroTextS: { flex: 1, minWidth: 0, gap: 1, alignItems: 'flex-start' },
  heroEyebrowS: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.gray600 },
  heroTitleS: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100, lineHeight: 18 },

  // record
  recHeader: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6, paddingLeft: 6, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  recBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  recHeaderTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },
  recScroll: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 30 },
  recEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.gray600, marginBottom: 12 },
  recEvidence: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  recEvidenceLeft: { gap: 6, flexShrink: 1 },
  recEvidenceRight: { alignItems: 'flex-end', gap: 2, paddingBottom: 4 },
  recDuration: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.bronze300 },
  recDurationLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  deltaUp: { color: flColor.greenMuted, fontWeight: '600' },
  deltaFlat: { color: flColor.gray600 },
  tangible: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: flRadius.pill, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, alignSelf: 'flex-start' },
  tangibleDiamond: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400 },
  tangibleText: { fontSize: 12, fontWeight: '600', color: flColor.bronze300 },
  recTable: { borderWidth: 1, borderColor: flColor.charcoal600, borderRadius: flRadius.lg, overflow: 'hidden', backgroundColor: flColor.charcoal900 },
  recNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDelta: { fontSize: 12.5, fontWeight: '600' },
  longGameWrap: { marginTop: 32, paddingTop: 26, borderTopWidth: 1, borderTopColor: flColor.bronzeBorderSubtle },
  longGameLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 8 },
  chapterCard: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 4, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  chapterGlyph: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  chapterText: { flex: 1, minWidth: 0, gap: 2 },
  chapterName: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  chapterSub: { fontSize: 12, color: flColor.gray600 },

  // share-to-squad picker
  pickerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: flColor.overlayDark },
  pickerCard: { width: '100%', maxWidth: 320, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, paddingVertical: 20, paddingHorizontal: 20, boxShadow: flShadow.ambient },
  pickerTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100, marginBottom: 12 },
  pickerScroll: { maxHeight: 300 },
  pickerRow: { paddingVertical: 14 },
  pickerRowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  pickerName: { fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },

  // resurfaced memory
  pastRef: { width: '100%', maxWidth: 320, marginTop: 6, paddingVertical: 13, paddingHorizontal: 15, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600, borderLeftWidth: 2, borderLeftColor: flColor.bronze400, gap: 5 },
  pastRefLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.gray600 },
  pastRefText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14, lineHeight: 20, color: flColor.gray400 },
});
