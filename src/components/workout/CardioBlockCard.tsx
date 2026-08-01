import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useWallClockTimer } from '@/hooks/useWallClockTimer';
import { useKeepScreenAwake } from '@/hooks/useKeepScreenAwake';
import { useReduceMotion } from '@/lib/settings';
import {
  activitySymbol,
  avgPaceSec,
  fmtClock,
  fmtPace,
  isLogged,
  parseDistance,
  usesSpeed,
  VERB,
  type CardioActivity,
  type CardioResult,
  type Modality,
} from '@/domain/workout/conditioning';
import { distanceLabel as unitLabel, toDistance, toPace, toSpeed, type UnitSystem } from '@/domain/run/run-core';
import type { SessionExercise } from '@/domain/workout/types';

/**
 * The cardio block card — what stands where the exercise hero and the set table would.
 *
 * ══ THE GOVERNING RULE ══
 *
 * Outdoor runs have GPS; treadmill runs have only a clock. The card must never draw a route, a map or an
 * incline history for a treadmill session, and must never show a distance the app did not measure. Every
 * branch below is that rule applied once more.
 *
 * ══ loggedModality, NOT modality ══
 *
 * `modality` is the live toggle: which LAYOUT you're looking at. `cardio.loggedModality` is how the bout
 * was actually recorded, written once at log time. Flipping the toggle after a treadmill run must not
 * repaint it as a traced GPS route, so every "was this really outdoors" question below reads
 * `loggedModality` and never `modality`.
 */

const BAND_H = 140;

interface Draft {
  distanceMi: number;
  timeSec: number;
  inclinePct: number;
  /** Frozen when the form opens. A toggle flipped mid-edit must not change the form's shape. */
  hasIncline: boolean;
  modality: Modality;
}

interface Props {
  exercise: SessionExercise;
  index: number;
  units: UnitSystem;
  onSetModality: (m: Modality) => void;
  onSave: (r: { distanceMi: number; timeSec: number; inclinePct: number | null; modality: Modality }) => void;
  onStartOutdoor: () => void;
}

export function CardioBlockCard({ exercise, index, units, onSetModality, onSave, onStartOutdoor }: Props) {
  const activity: CardioActivity = exercise.activity ?? 'run';
  const modality: Modality = exercise.modality ?? 'outdoor';
  const treadmill = modality === 'indoor';
  const result: CardioResult | undefined = exercise.cardio;
  const logged = isLogged(result);
  /** How it was RECORDED. Everything visual keys off this, never off the live toggle. */
  const lm = result?.loggedModality ?? null;
  const traced = logged && lm === 'outdoor';
  const loggedIndoors = logged && lm === 'indoor';

  const [draft, setDraft] = useState<Draft | null>(null);
  const [distanceText, setDistanceText] = useState('');
  const reduceMotion = useReduceMotion();

  const timer = useWallClockTimer(logged ? null : `forge_cardio_timer_v1:${index}`);
  useKeepScreenAwake(timer.running);

  const dU = unitLabel(units);
  const d1 = (mi: number | null | undefined) => toDistance(mi ?? 0, units).toFixed(1);
  const speed = usesSpeed(activity);
  const hasTarget = exercise.targetMi != null;

  // ── the belt, only while the timer runs ───────────────────────────────────
  // The hatch scrolls downward, toward the runner, 28px per 900ms. Started in an EFFECT, not in render:
  // kicking an animation off during render is a side effect, and it would restart on every re-render —
  // which, with a clock ticking once a second, is every second.
  const [belt] = useState(() => new Animated.Value(0));
  const beltRunning = timer.running && !reduceMotion;
  useEffect(() => {
    if (!beltRunning) return;
    const loop = Animated.loop(
      Animated.timing(belt, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => {
      loop.stop();
      belt.setValue(0);
    };
  }, [beltRunning, belt]);

  const openLog = () => {
    // The form's shape is decided ONCE, here, from how the bout was (or will be) recorded — not from
    // whatever the toggle says later. Otherwise editing an outdoor-toggled treadmill run drops its incline.
    const formTreadmill = logged && lm ? lm === 'indoor' : treadmill;
    const target = exercise.targetMi ?? 1;
    const pace = exercise.targetPaceSec ?? 540;
    setDraft({
      distanceMi: result?.distanceMi ?? target,
      timeSec: result?.timeSec ?? (timer.elapsedSec || Math.round(target * pace)),
      inclinePct: result?.inclinePct ?? (formTreadmill ? 1 : 0),
      hasIncline: formTreadmill,
      modality: formTreadmill ? 'indoor' : 'outdoor',
    });
    setDistanceText(toDistance(result?.distanceMi ?? target, units).toFixed(2));
  };

  const adj = (field: 'distanceMi' | 'timeSec' | 'inclinePct', delta: number) =>
    setDraft((d) => {
      if (!d) return d;
      if (field === 'distanceMi') {
        const next = Math.max(0, Math.round((d.distanceMi + delta) * 10) / 10);
        setDistanceText(toDistance(next, units).toFixed(2));
        return { ...d, distanceMi: next };
      }
      if (field === 'timeSec') return { ...d, timeSec: Math.max(0, d.timeSec + delta) };
      return { ...d, inclinePct: Math.max(0, Math.min(15, Math.round((d.inclinePct + delta) * 2) / 2)) };
    });

  const draftPace = draft ? avgPaceSec(draft.distanceMi, draft.timeSec) : null;

  return (
    <View style={styles.card}>
      {/* ── TERRAIN BAND ─────────────────────────────────────────────────── */}
      <View style={[styles.band, treadmill ? styles.bandIndoor : styles.bandOutdoor]}>
        {treadmill ? (
          <>
            {/* A treadmill reports elapsed time and nothing more, so the band shows exactly that. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.belt,
                { transform: [{ translateY: belt.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) }] },
              ]}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={[styles.beltLine, { top: i * 28 }]} />
              ))}
            </Animated.View>
            <View style={styles.bandCentre}>
              <Text style={[styles.bandClock, timer.running ? styles.bandClockLive : null]}>
                {fmtClock(logged ? result?.timeSec : timer.elapsedSec)}
              </Text>
              <View style={styles.bandStatus}>
                {timer.running ? <View style={styles.liveDot} /> : null}
                <Text style={styles.bandStatusText}>
                  {logged
                    ? loggedIndoors
                      ? `${d1(result?.distanceMi)} ${dU} ON THE BELT`
                      : `${d1(result?.distanceMi)} ${dU} LOGGED OUTDOORS`
                    : timer.running
                      ? 'BELT RUNNING'
                      : timer.elapsedSec > 0
                        ? 'PAUSED'
                        : 'TIME ONLY · NO GPS INDOORS'}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Svg width="100%" height={BAND_H} viewBox="0 0 372 126" pointerEvents="none">
              <Defs>
                <RadialGradient id="cbg" cx="50%" cy="12%" r="130%">
                  <Stop offset="0" stopColor="#131A20" />
                  <Stop offset="1" stopColor="#080C10" />
                </RadialGradient>
                <LinearGradient id="cscrim" x1="0" y1="1" x2="0" y2="0">
                  <Stop offset="0" stopColor="#080C10" stopOpacity={0.9} />
                  <Stop offset="1" stopColor="#080C10" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={372} height={126} fill="url(#cbg)" />
              {/* A faint bronze map grid, drawn rather than tiled — no map library, no imagery. */}
              {Array.from({ length: 5 }, (_, i) => (
                <Rect key={`h${i}`} x={0} y={i * 30} width={372} height={1} fill="rgba(191,143,79,0.045)" />
              ))}
              {Array.from({ length: 13 }, (_, i) => (
                <Rect key={`v${i}`} x={i * 30} y={0} width={1} height={126} fill="rgba(191,143,79,0.045)" />
              ))}
              {/* Dashed until it has been run, solid once it has. That change, plus the start marker
                  filling in, is the entire tell — and it is driven by loggedModality, never by "is
                  logged", so a treadmill run flipped to Outdoor stays a ghost. */}
              <Path
                d="M44 100 C 28 70 70 66 72 46 C 74 24 42 20 66 12 C 92 4 152 14 172 44 C 194 78 262 70 278 40 C 288 22 318 30 320 52"
                fill="none"
                stroke={traced ? flColor.bronze300 : flColor.bronzeBorder}
                strokeWidth={traced ? 3 : 2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={traced ? undefined : '5 8'}
                opacity={traced ? 0.95 : loggedIndoors ? 0.28 : 0.45}
              />
              <Circle cx={44} cy={100} r={5} fill={traced ? flColor.bronze300 : 'none'} stroke={flColor.bronze400} strokeWidth={2} opacity={0.85} />
              <Circle cx={320} cy={52} r={5} fill="none" stroke={flColor.bronze400} strokeWidth={2} opacity={0.7} />
              <Rect x={0} y={74} width={372} height={52} fill="url(#cscrim)" />
            </Svg>
            <Text style={styles.bandCaption}>
              {traced
                ? `${d1(result?.distanceMi)} ${dU} · ${fmtClock(result?.timeSec)}`
                : loggedIndoors
                  ? 'Logged on a treadmill · no route'
                  : 'Your route traces as you run'}
            </Text>
          </>
        )}

        <View style={styles.bandLabel} pointerEvents="none">
          <Glyph name={activitySymbol(activity)} size={12} color={flColor.bronze400} />
          <Text style={styles.bandLabelText}>CARDIO BLOCK</Text>
        </View>

        {logged ? (
          <View style={styles.loggedBadge}>
            <Svg width={10} height={10} viewBox="0 0 24 24">
              <Path d="M20 6L9 17l-5-5" fill="none" stroke={flColor.greenMuted} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.loggedBadgeText}>LOGGED</Text>
          </View>
        ) : null}
      </View>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <View style={styles.nameText}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.prescription}>
              {hasTarget ? `Hold ${fmtPace(toPace(exercise.targetPaceSec ?? 0, units))} or better` : 'No distance target — run what you’ve got'}
            </Text>
          </View>
          {/* Decorative: the toggle and the name already say the modality. */}
          <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Glyph name={treadmill ? 'stopwatch' : activitySymbol(activity)} size={17} color={flColor.bronze400} />
          </View>
        </View>

        <View style={styles.segment}>
          {(['outdoor', 'indoor'] as Modality[]).map((m) => {
            const on = modality === m;
            const label = m === 'outdoor' ? 'Outdoor' : activity === 'bike' ? 'Indoor' : 'Treadmill';
            return (
              <Pressable
                key={m}
                onPress={() => onSetModality(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label}
                style={[styles.seg, on ? styles.segOn : null]}
              >
                <Glyph name={m === 'outdoor' ? activitySymbol(activity) : 'stopwatch'} size={17} color={on ? flColor.bronze300 : flColor.gray400} />
                <Text style={[styles.segText, on ? styles.segTextOn : null]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Read-only. The strength logger above establishes the rule: Target comes from the program and
            does not move; Actual is what you log. An editable prescription would be the one place in a
            workout where you can quietly rewrite the program, and it would destroy the comparison. */}
        <View style={styles.strip}>
          <StripCell
            label={hasTarget ? 'TARGET' : 'DISTANCE'}
            value={hasTarget ? `${d1(exercise.targetMi)} ${dU}` : 'Open'}
            big
            accent
            first
          />
          {speed
            ? exercise.targetSpdMph != null && (
                <StripCell label="TARGET SPEED" value={`${toSpeed(exercise.targetSpdMph, units).toFixed(1)}`} />
              )
            : exercise.targetPaceSec != null && (
                <StripCell label="TARGET PACE" value={`${fmtPace(toPace(exercise.targetPaceSec, units))} /${dU}`} />
              )}
          <StripCell label="LAST" value="—" />
        </View>

        {/* ── STATE C · the log form ─────────────────────────────────────── */}
        {draft ? (
          <View style={styles.form}>
            <Field
              label="DISTANCE"
              hint={draft.hasIncline ? 'Read it off the console' : ''}
              value={`${toDistance(draft.distanceMi, units).toFixed(1)} ${dU}`}
              onDec={() => adj('distanceMi', -0.1)}
              onInc={() => adj('distanceMi', 0.1)}
              decLabel="Less distance"
              incLabel="More distance"
            />
            <Field
              label="TIME"
              hint={draft.hasIncline && timer.elapsedSec > 0 ? 'From your timer' : ''}
              value={fmtClock(draft.timeSec)}
              onDec={() => adj('timeSec', -15)}
              onInc={() => adj('timeSec', 15)}
              decLabel="Less time"
              incLabel="More time"
            />
            {draft.hasIncline ? (
              <Field
                label="INCLINE"
                hint=""
                value={`${draft.inclinePct.toFixed(1)}%`}
                onDec={() => adj('inclinePct', -0.5)}
                onInc={() => adj('inclinePct', 0.5)}
                decLabel="Lower incline"
                incLabel="Higher incline"
              />
            ) : null}
            <View style={styles.computed}>
              <Text style={styles.computedLabel}>{speed ? 'AVG SPEED' : 'AVG PACE'}</Text>
              <Text style={styles.computedValue}>
                {draftPace == null ? '—' : speed ? `${toSpeed(3600 / draftPace, units).toFixed(1)}` : `${fmtPace(toPace(draftPace, units))} /${dU}`}
              </Text>
            </View>
            <View style={styles.formActions}>
              <Pressable onPress={() => setDraft(null)} accessibilityRole="button" accessibilityLabel="Cancel" style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const typed = parseDistance(distanceText);
                  const mi = typed == null ? draft.distanceMi : units === 'metric' ? typed / 1.609344 : typed;
                  onSave({ distanceMi: +mi.toFixed(2), timeSec: draft.timeSec, inclinePct: draft.hasIncline ? draft.inclinePct : null, modality: draft.modality });
                  setDraft(null);
                  timer.reset();
                }}
                accessibilityRole="button"
                accessibilityLabel="Save run"
                style={({ pressed }) => [styles.primary, styles.saveBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.primaryText}>Save {VERB[activity]}</Text>
              </Pressable>
            </View>
          </View>
        ) : logged ? (
          /* ── STATE D · logged ─────────────────────────────────────────── */
          <View style={styles.form}>
            <View style={styles.resultRow}>
              <ResultCell value={d1(result?.distanceMi)} label={dU.toUpperCase()} first />
              <ResultCell value={fmtClock(result?.timeSec)} label="TIME" />
              <ResultCell
                value={(() => {
                  const p = avgPaceSec(result?.distanceMi, result?.timeSec);
                  return p == null ? '—' : speed ? toSpeed(3600 / p, units).toFixed(1) : fmtPace(toPace(p, units));
                })()}
                label={speed ? 'AVG' : `AVG /${dU.toUpperCase()}`}
                accent
              />
              {/* Incline is a treadmill fact. It shows only when the bout was RECORDED indoors — not
                  when the toggle happens to be sitting there now. */}
              {loggedIndoors && result?.inclinePct != null ? (
                <ResultCell value={`${result.inclinePct.toFixed(1)}%`} label="INCLINE" />
              ) : null}
            </View>
            <Pressable onPress={openLog} accessibilityRole="button" accessibilityLabel="Edit these numbers" style={styles.textBtn}>
              <Text style={styles.textBtnText}>Edit these numbers</Text>
            </Pressable>
          </View>
        ) : treadmill ? (
          /* ── STATE B · treadmill, not yet run ─────────────────────────── */
          <View style={styles.form}>
            <View style={styles.formActions}>
              <Pressable
                onPress={timer.running ? timer.pause : timer.elapsedSec > 0 ? timer.resume : timer.start}
                accessibilityRole="button"
                accessibilityLabel={timer.running ? 'Pause the timer' : timer.elapsedSec > 0 ? 'Resume the timer' : 'Start the timer'}
                style={({ pressed }) => [timer.elapsedSec > 0 || timer.running ? styles.secondary : styles.primary, pressed ? styles.pressed : null]}
              >
                <Text style={timer.elapsedSec > 0 || timer.running ? styles.secondaryText : styles.primaryText}>
                  {timer.running ? 'Pause' : timer.elapsedSec > 0 ? 'Resume' : 'Start Timer'}
                </Text>
              </Pressable>
              {timer.elapsedSec > 0 ? (
                <Pressable onPress={openLog} accessibilityRole="button" accessibilityLabel="Log run" style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}>
                  <Text style={styles.primaryText}>Log {VERB[activity]}</Text>
                </Pressable>
              ) : null}
            </View>
            {timer.elapsedSec === 0 && !timer.running ? (
              <Pressable onPress={openLog} accessibilityRole="button" accessibilityLabel="Skip the timer and enter it myself" style={styles.textBtn}>
                <Text style={styles.textBtnText}>Skip timer · enter it myself</Text>
              </Pressable>
            ) : null}
            <Text style={styles.note}>
              A treadmill only gives us time. You&apos;ll read the distance off the console when you log it.
            </Text>
            <Text style={styles.note}>
              The clock reads the time of day, so it stays right even if your screen sleeps.
            </Text>
          </View>
        ) : (
          /* ── STATE A · outdoor, not yet run ───────────────────────────── */
          <View style={styles.form}>
            <Pressable onPress={onStartOutdoor} accessibilityRole="button" accessibilityLabel={`Start ${VERB[activity].toLowerCase()}`} style={({ pressed }) => [styles.primary, styles.tall, pressed ? styles.pressed : null]}>
              <Text style={styles.primaryText}>Start {VERB[activity]}</Text>
            </Pressable>
            <Pressable onPress={openLog} accessibilityRole="button" accessibilityLabel="Already did it — log manually" style={styles.textBtn}>
              <Text style={styles.textBtnText}>Already did it · log manually</Text>
            </Pressable>
            <Text style={styles.note}>Tracking opens full screen. You&apos;ll come straight back here when you finish.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── pieces ────────────────────────────────────────────────────────────────

function StripCell({ label, value, big, accent, first }: { label: string; value: string; big?: boolean; accent?: boolean; first?: boolean }) {
  return (
    <View style={[styles.stripCell, first ? styles.stripCellFirst : null]}>
      <Text style={[styles.stripLabel, accent ? styles.stripLabelAccent : null]}>{label}</Text>
      <Text style={[styles.stripValue, big ? styles.stripValueBig : null, accent ? styles.stripValueAccent : null]}>{value}</Text>
    </View>
  );
}

function ResultCell({ value, label, accent, first }: { value: string; label: string; accent?: boolean; first?: boolean }) {
  return (
    <View style={[styles.resultCell, first ? null : styles.resultCellDiv]}>
      <Text style={[styles.resultValue, accent ? styles.resultValueAccent : null]}>{value}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
    </View>
  );
}

function Field({ label, hint, value, onDec, onInc, decLabel, incLabel }: { label: string; hint: string; value: string; onDec: () => void; onInc: () => void; decLabel: string; incLabel: string }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldText}>
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
        </View>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
      <View style={styles.fieldBtns}>
        <Pressable onPress={onDec} accessibilityRole="button" accessibilityLabel={decLabel} style={({ pressed }) => [styles.stepBtn, pressed ? styles.pressed : null]}>
          <Text style={styles.stepGlyph}>−</Text>
        </Pressable>
        <Pressable onPress={onInc} accessibilityRole="button" accessibilityLabel={incLabel} style={({ pressed }) => [styles.stepBtn, pressed ? styles.pressed : null]}>
          <Text style={styles.stepGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The shared symbol set, drawn locally — same paths as `forge-symbols.js`. */
function Glyph({ name, size, color }: { name: string; size: number; color: string }) {
  const p = { fill: 'none' as const, stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'bicycle') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={5.5} cy={15.5} r={3.2} {...p} /><Circle cx={18.5} cy={15.5} r={3.2} {...p} />
        <Path d="M5.5 15.5l4-7h6M9.5 8.5l3 7M18.5 15.5l-3-7" {...p} />
      </Svg>
    );
  }
  if (name === 'footprints') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M8 4.5c1.4 0 2.2 1.5 2.2 3.3 0 1.4-.6 2.7-2.2 2.7s-2.2-1.3-2.2-2.7C5.6 6 6.6 4.5 8 4.5z" {...p} />
        <Path d="M16 8.5c1.4 0 2.2 1.5 2.2 3.3 0 1.4-.6 2.7-2.2 2.7s-2.2-1.3-2.2-2.7C13.8 10 14.6 8.5 16 8.5z" {...p} />
      </Svg>
    );
  }
  if (name === 'stopwatch') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={13.5} r={7} {...p} /><Path d="M12 6.5V4M9.8 3.5h4.4M12 13.5l3-2.4" {...p} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 15.6v-3c0-.5.4-.8.9-.6l3.3.8 2.6-2.9c.4-.5 1.2-.4 1.5.2l.7 1.5 6 1.7c1.2.3 2 1.1 2 2.4v.7c0 .4-.3.7-.7.7H4c-.6 0-1-.5-1-1z" {...p} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  /**
   * `flex: none` is LOAD-BEARING. The scroll body is a column flex container, so children default to
   * shrinking — and because this card clips (for the rounded band) a shrunk card silently clips its own
   * content while the parent never overflows, putting the clipped region out of reach rather than merely
   * below the fold. The strength cards don't expose this because they don't clip.
   */
  card: { flexGrow: 0, flexShrink: 0, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: '#0D1116', overflow: 'hidden', boxShadow: flShadow.card },

  band: { height: BAND_H, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700, position: 'relative', justifyContent: 'center' },
  bandOutdoor: { backgroundColor: '#080C10' },
  bandIndoor: { backgroundColor: '#0A0E13' },
  belt: { position: 'absolute', top: -28, left: 0, right: 0, bottom: -28 },
  beltLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(191,143,79,0.085)' },
  bandCentre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 7 },
  bandClock: { fontFamily: flFont.display, fontSize: 46, lineHeight: 48, fontWeight: '600', letterSpacing: 1, color: flColor.cream100 },
  bandClockLive: { color: flColor.bronze300 },
  bandStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandStatusText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: flColor.gray600 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: flColor.greenMuted },
  bandCaption: { position: 'absolute', bottom: 11, right: 14, fontSize: 11, fontWeight: '600', letterSpacing: 0.2, color: flColor.gray400 },
  bandLabel: { position: 'absolute', top: 11, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  bandLabelText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: flColor.bronze400 },
  loggedBadge: { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(90,158,104,0.34)', backgroundColor: 'rgba(90,158,104,0.12)' },
  loggedBadgeText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1, color: flColor.greenMuted },

  body: { padding: 15, paddingBottom: 16, gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  nameText: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: flFont.display, fontSize: 24, lineHeight: 26, fontWeight: '600', color: flColor.cream100 },
  prescription: { fontSize: 11.5, color: flColor.gray600 },
  mark: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800, alignItems: 'center', justifyContent: 'center' },

  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600 },
  seg: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: flRadius.md },
  segOn: { backgroundColor: flColor.bronzeTint },
  segText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  segTextOn: { color: flColor.bronze300 },

  strip: { flexDirection: 'row', paddingVertical: 12, borderTopWidth: 1, borderTopColor: flColor.charcoal700, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  stripCell: { flex: 1, minWidth: 0, gap: 3, paddingHorizontal: 12, borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  stripCellFirst: { paddingLeft: 0, borderLeftWidth: 0 },
  stripLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, color: flColor.gray600 },
  stripLabelAccent: { fontWeight: '700', color: flColor.bronze400 },
  stripValue: { fontFamily: flFont.display, fontSize: 16, lineHeight: 18, fontWeight: '600', color: flColor.cream100 },
  stripValueBig: { fontSize: 20, lineHeight: 23 },
  stripValueAccent: { color: flColor.bronze300 },

  form: { gap: 12 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal500, backgroundColor: flColor.charcoal800 },
  fieldText: { gap: 2, minWidth: 0 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fieldLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, color: flColor.gray600 },
  fieldHint: { fontSize: 9, fontWeight: '600', letterSpacing: 0.6, color: flColor.bronze400 },
  fieldValue: { fontFamily: flFont.display, fontSize: 22, lineHeight: 24, fontWeight: '600', color: flColor.cream100 },
  fieldBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal900, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontSize: 22, lineHeight: 26, color: flColor.bronze300 },
  computed: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 2 },
  computedLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, color: flColor.bronze400 },
  computedValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', color: flColor.bronze300 },
  formActions: { flexDirection: 'row', gap: 9 },
  saveBtn: { flex: 1.15 },

  resultRow: { flexDirection: 'row', paddingVertical: 14, borderRadius: flRadius.lg, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: 'rgba(90,158,104,0.24)' },
  resultCell: { flex: 1, alignItems: 'center', gap: 4 },
  resultCellDiv: { borderLeftWidth: 1, borderLeftColor: flColor.bronzeBorderSubtle },
  resultValue: { fontFamily: flFont.display, fontSize: 24, lineHeight: 25, fontWeight: '600', color: flColor.cream100 },
  resultValueAccent: { color: flColor.bronze300 },
  resultLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 1.2, color: flColor.gray600 },

  primary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeMetalBorder, backgroundColor: flColor.bronze600 },
  tall: { paddingVertical: 17 },
  primaryText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: flColor.cream100 },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  secondaryText: { fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  textBtn: { alignItems: 'center', paddingVertical: 9 },
  textBtnText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  note: { fontSize: 11, lineHeight: 17, color: flColor.gray600, textAlign: 'center' },
  pressed: { opacity: 0.85 },
});
