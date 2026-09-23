import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { Pill } from '@/components/forge/composites/Pill';
import { LogWeightSheet } from '@/components/forge/LogWeightSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { grouped, type Targets } from '@/domain/nutrition/day';
import {
  ACTIVITY_LEVELS,
  activityByKey,
  ageFrom,
  basisLine,
  blockerFor,
  burnFor,
  checkManual,
  heldLine,
  historyRows,
  macroSumLine,
  maxPace,
  methodRows,
  paceLabel,
  paceOptions,
  recommend,
  sameAsCurrent,
  saveNote,
  weightDrift,
  type ActivityLevel,
  type AthleteFacts,
  type AthleteSex,
  type Goal,
} from '@/domain/nutrition/targets';
import { fetchBodyEntries, latestBodyReading } from '@/data/body-metrics-live';
import { fetchNutritionProfile, fetchTargetHistory, saveNutritionProfile, saveTargets } from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { useProfile } from '@/lib/profile';
import { useUnits } from '@/lib/settings';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Nutrition Targets — built to `Nutrition Targets.dc.html`, wired to `nutrition_targets` (0205 §4) and
 * the three profile facts `0205` §5 added for exactly this and nothing has ever written.
 *
 * ⚠ **THIS SCREEN EXISTS TO SAY NO WELL.** Every limit is in `domain/nutrition/targets.ts` and tested:
 * nothing recommended under 18, nothing below 1,500 / 1,200 kcal, no deficit past 1% of bodyweight a
 * week. This file positions those refusals; it never computes or softens one.
 *
 * ⚠ **A HELD TARGET IS NEVER SILENT.** When a pace is clamped the card says which limit bound and what
 * the athlete will actually get. Quietly changing someone's number while letting them believe they
 * chose it is the failure mode the shield note prevents.
 *
 * ⚠ **AND THE `.dc` HAS TWO STATES REAL DATA ADDS.** Its fixture always knows sex and weight. `profiles.sex`
 * DEFAULTS to `unspecified` and Mifflin–St Jeor carries a sex term with no neutral value, and an athlete
 * may never have logged a weigh-in — so both get a real state that offers the fix, rather than a
 * recommendation built on a guess about someone's body.
 *
 * Faithful to the `.dc`: the Recommended / Manual tabs, the weight-moved banner, the "Based on" summary
 * that opens into About you, the goal row with its pace stepper and sheet, the result card with its
 * basis line and "How we calculated this", Manual's floor note with a one-tap fix, and the target
 * history that shows every old target still standing.
 */
export default function NutritionTargetsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile } = useProfile();
  const { units } = useUnits();

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [reloads, setReloads] = useState(0);

  const { data: nutritionProfile } = useQuery(fetchNutritionProfile, [reloads]);
  const { data: history } = useQuery(useCallback(() => fetchTargetHistory(todayIso), [todayIso]), [todayIso, reloads]);
  const { data: bodyEntries } = useQuery(fetchBodyEntries, [reloads]);

  const [mode, setMode] = useState<'recommended' | 'manual'>('recommended');
  const [editingProfile, setEditingProfile] = useState(false);
  const [sheet, setSheet] = useState<'pace' | 'method' | null>(null);
  const [weighInOpen, setWeighInOpen] = useState(false);
  const [goal, setGoal] = useState<Goal>('lose');
  const [rate, setRate] = useState(1);
  const [saving, setSaving] = useState(false);
  /* Dismissed for this visit only — the prompt is about the target, not about a preference. */
  const [reviewed, setReviewed] = useState(false);

  /* Typed values take over from the loaded ones; null means "not touched yet". */
  const [byText, setByText] = useState<string | null>(null);
  const [ftText, setFtText] = useState<string | null>(null);
  const [inText, setInText] = useState<string | null>(null);
  const [activityKey, setActivityKey] = useState<string | null>(null);
  const [manual, setManual] = useState<Record<string, string> | null>(null);

  const weightLb = useMemo(() => latestBodyReading(bodyEntries ?? [], 'weight'), [bodyEntries]);
  const sex = (profile?.sex ?? 'unspecified') as AthleteSex;

  const storedHeight = nutritionProfile?.heightIn ?? null;
  const by = byText ?? (nutritionProfile?.birthYear != null ? String(nutritionProfile.birthYear) : '');
  const ft = ftText ?? (storedHeight != null ? String(Math.floor(storedHeight / 12)) : '');
  const inch = inText ?? (storedHeight != null ? String(Math.round(storedHeight % 12)) : '');
  const activity: ActivityLevel | null = activityByKey(activityKey ?? nutritionProfile?.activityLevel);

  const birthYear = /^\d{4}$/.test(by) ? Number(by) : null;
  const feet = Number(ft);
  const inches = Number(inch || '0');
  const heightIn = feet >= 3 && feet <= 7 && inches >= 0 && inches < 12 ? feet * 12 + inches : null;

  const facts: AthleteFacts = { sex, weightLb, birthYear, heightIn, activity };
  const blocker = blockerFor(facts, todayIso);
  const burn = burnFor(facts, todayIso);
  const rec = burn ? recommend(facts, burn, goal, rate, todayIso) : null;

  const rows = useMemo(() => historyRows(history ?? [], todayIso), [history, todayIso]);
  const currentRow = history?.length ? history[history.length - 1] : null;
  const current: Targets | null = currentRow?.targets ?? null;
  const currentFrom = currentRow?.from ?? null;

  /**
   * ⚠ The comparison is against the weight RECORDED WITH THE TARGET (0209), never against the oldest
   * weigh-in on file — that answers a different question — and never against the latest, which is the
   * other half of the sentence. Null until the migration is pasted, and the banner simply does not
   * appear rather than claiming a change it cannot evidence.
   */
  const drift = weightDrift({
    now: weightLb,
    atTarget: currentRow?.weightLb ?? null,
    targetFrom: currentFrom,
    todayIso,
  });

  /* Manual opens on whatever is in force, then the athlete's typing takes over. */
  const man = manual ?? {
    kcal: current ? String(current.kcal) : '',
    protein: current ? String(current.protein) : '',
    carb: current ? String(current.carb) : '',
    fat: current ? String(current.fat) : '',
  };
  const setMan = (key: string) => (v: string) => setManual({ ...man, [key]: v.replace(/[^0-9]/g, '').slice(0, 5) });
  const manKcal = man.kcal ? Number(man.kcal) : null;
  const manualCheck = checkManual(manKcal, facts, burn);
  const macroLine = macroSumLine(manKcal, Number(man.protein || 0), Number(man.carb || 0), Number(man.fat || 0));

  /* What pressing Save would write, and why it might not be allowed to. */
  let proposed: Targets | null = null;
  let blocked: string | null = null;
  if (mode === 'recommended') {
    if (blocker?.kind === 'under-age') blocked = 'Recommended targets start at 18.';
    else if (blocker) blocked = 'Add the details above to see a target.';
    else if (rec) proposed = { kcal: rec.kcal, protein: rec.protein, carb: rec.carb, fat: rec.fat };
  } else if (!manKcal) blocked = 'Enter a calorie target.';
  else if (manualCheck.tooLow) blocked = `The lowest target Forge will set for you is ${grouped(manualCheck.minimum)}.`;
  else {
    proposed = {
      kcal: manKcal,
      protein: Number(man.protein || 0),
      carb: Number(man.carb || 0),
      fat: Number(man.fat || 0),
    };
  }

  const same = sameAsCurrent(proposed, current);
  const note = saveNote({ blocked, same, replacesToday: currentFrom === todayIso });
  const canSave = !!proposed && !same && !saving;

  const profileComplete = !blocker;
  const showFields = blocker?.kind !== 'under-age' && (editingProfile || (!profileComplete && blocker?.kind === 'incomplete'));

  const save = async () => {
    if (!proposed || !canSave) return;
    setSaving(true);
    try {
      /* The three facts were supplied in order to get a target, so they are kept with it. */
      if (mode === 'recommended' && profileComplete) {
        await saveNutritionProfile({ birthYear, heightIn, activityLevel: activity?.key ?? null });
      }
      /* The weight rides along so this target can be reviewed when the body moves (0209). */
      await saveTargets(proposed, mode === 'recommended' ? 'recommended' : 'manual', weightLb);
      setReloads((n) => n + 1);
      setEditingProfile(false);
      setReviewed(false);
      showToast(`New target from today · ${grouped(proposed.kcal)} cal`);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const age = ageFrom(birthYear, todayIso);

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="" transparent onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Text style={styles.eyebrow}>Nutrition</Text>
          <Text style={styles.title}>Daily targets</Text>
        </View>

        {drift && !reviewed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review your targets: your weight has changed since they were set"
            style={styles.reviewBanner}
            onPress={() => {
              setReviewed(true);
              setMode('recommended');
              setEditingProfile(false);
            }}
          >
            <View style={styles.reviewText}>
              <Text style={styles.reviewLine}>Your weight has changed since these targets were set.</Text>
              <Text style={styles.reviewDelta}>{drift.detail}</Text>
            </View>
            <Text style={styles.linkText}>Review</Text>
          </Pressable>
        ) : null}

        {/* mode */}
        <View style={styles.tabs}>
          {(['recommended', 'manual'] as const).map((key) => {
            const on = mode === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.tab, on && styles.tabOn]}
                onPress={() => setMode(key)}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>
                  {key === 'recommended' ? 'Recommended' : 'Manual'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'recommended' ? (
          <>
            {/* ⛔ THE GATE. Nothing else renders under it — an offer to complete a profile below this
                card would read as a way around a door that does not open. */}
            {blocker?.kind === 'under-age' ? (
              <View style={styles.gateCard}>
                {blocker.unlockYear ? <Text style={styles.eyebrow}>{`From ${blocker.unlockYear}`}</Text> : null}
                <Text style={styles.gateHeadline}>Recommended targets start at 18.</Text>
                <Text style={styles.gateBody}>
                  Forge doesn’t calculate calorie targets for anyone under 18. Bodies that are still growing
                  need more than a formula. If a doctor or dietitian has given you numbers, you can enter
                  them in Manual.
                </Text>
                <View style={styles.gateActions}>
                  <Button variant="secondary" fullWidth onPress={() => setMode('manual')}>
                    Enter targets I’ve been given
                  </Button>
                  <View style={styles.gateFoot}>
                    <Text style={styles.gateFootText}>{`Birth year ${by}.`}</Text>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => {
                        setByText('');
                        setEditingProfile(true);
                      }}
                    >
                      <Text style={styles.linkText}>Not right?</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : blocker?.kind === 'no-sex' ? (
              /* ⚠ Not in the `.dc`. Mifflin–St Jeor has a sex term with no neutral value, and
                 `profiles.sex` defaults to `unspecified`, so this is an ordinary state. */
              <MissingCard
                headline="Forge needs one more thing"
                body="The equation behind a calorie target uses your sex. It’s set in Account Settings, and it’s the same setting that picks your exercise artwork."
                action="Open Account Settings"
                onPress={() => router.push('/account-settings')}
              />
            ) : blocker?.kind === 'no-weight' ? (
              <MissingCard
                headline="Log a weigh-in first"
                body="A target is built from what you weigh now. One weigh-in is enough to start, and Forge will ask you to review the target when it moves."
                action="Log a weigh-in"
                onPress={() => setWeighInOpen(true)}
              />
            ) : (
              <>
                {/* about you */}
                {profileComplete && !editingProfile ? (
                  <>
                    <Text style={[styles.sectionLabel, styles.sectionSolo]}>Based on</Text>
                    <Pressable accessibilityRole="button" style={styles.basedOn} onPress={() => setEditingProfile(true)}>
                      <View style={styles.basedOnText}>
                        <Text style={styles.basedOnLine}>
                          {`${age} · ${Math.floor((heightIn as number) / 12)}′${(heightIn as number) % 12}″ · ${activity?.label}`}
                        </Text>
                        <Text style={styles.basedOnSub}>{`${weightLb} lb from your latest weigh-in`}</Text>
                      </View>
                      <Text style={styles.linkText}>Edit</Text>
                    </Pressable>
                  </>
                ) : null}

                {showFields ? (
                  <>
                    <View style={styles.fieldsHead}>
                      <Text style={styles.sectionLabel}>About you</Text>
                      <Text style={styles.fieldsIntro}>
                        {profileComplete
                          ? 'Changes here update your recommendation and are saved to your profile when you set it.'
                          : 'Three things Forge needs to calculate a target. Asked once, and kept only for this.'}
                      </Text>
                    </View>
                    <View style={styles.fields}>
                      <InputField
                        label="Birth year"
                        value={by}
                        onChange={(v) => setByText(v.replace(/[^0-9]/g, '').slice(0, 4))}
                        placeholder="YYYY"
                        keyboardType="number-pad"
                        maxLength={4}
                        error={by.length === 4 && birthYear == null ? 'Enter a four-digit year.' : undefined}
                        helper="Used for your age. Never shown on your profile."
                      />
                      <View style={styles.heightRow}>
                        <View style={styles.heightCell}>
                          <InputField
                            label="Height · ft"
                            value={ft}
                            onChange={(v) => setFtText(v.replace(/[^0-9]/g, '').slice(0, 1))}
                            placeholder="5"
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={styles.heightCell}>
                          <InputField
                            label="in"
                            value={inch}
                            onChange={(v) => setInText(v.replace(/[^0-9]/g, '').slice(0, 2))}
                            placeholder="10"
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>

                      <View style={styles.activityBlock}>
                        <Text style={styles.activityLabel}>A normal week</Text>
                        <View style={styles.activityList}>
                          {ACTIVITY_LEVELS.map((level, i) => {
                            const on = activity?.key === level.key;
                            return (
                              <Pressable
                                key={level.key}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: on }}
                                style={[styles.activityRow, i > 0 && styles.activityDivider, on && styles.activityRowOn]}
                                onPress={() => setActivityKey(level.key)}
                              >
                                <View style={styles.activityText}>
                                  <Text style={[styles.activityName, on && styles.activityNameOn]}>{level.label}</Text>
                                  <Text style={styles.activityDetail}>{level.detail}</Text>
                                </View>
                                <Radio on={on} />
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      {editingProfile && profileComplete ? (
                        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setEditingProfile(false)}>
                          <Text style={styles.linkText}>Done</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                ) : null}

                {/* goal */}
                <Text style={[styles.sectionLabel, styles.sectionSolo]}>Goal</Text>
                <View style={styles.goalRow}>
                  {(['lose', 'maintain', 'gain'] as const).map((key) => {
                    const on = goal === key;
                    return (
                      <Pressable
                        key={key}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.goalButton, on && styles.goalButtonOn]}
                        onPress={() => {
                          setGoal(key);
                          if (key === 'gain') setRate((r) => Math.min(r, 0.5));
                        }}
                      >
                        <Text style={[styles.goalText, on && styles.goalTextOn]}>
                          {key === 'lose' ? 'Lose' : key === 'maintain' ? 'Maintain' : 'Gain'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {goal !== 'maintain' ? (
                  <View style={styles.paceRow}>
                    <Text style={styles.paceLabel}>Pace</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Slower"
                      disabled={rate <= 0.25}
                      style={styles.paceStep}
                      onPress={() => setRate((r) => Math.max(0.25, r - 0.25))}
                    >
                      <Glyph kind="minus" dim={rate <= 0.25} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Choose pace" style={styles.paceValue} onPress={() => setSheet('pace')}>
                      <Text style={styles.paceValueText}>{paceLabel(rate)}</Text>
                      <Chevron />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Faster"
                      disabled={rate >= maxPace(goal)}
                      style={styles.paceStep}
                      onPress={() => setRate((r) => Math.min(maxPace(goal), r + 0.25))}
                    >
                      <Glyph kind="plus" dim={rate >= maxPace(goal)} />
                    </Pressable>
                  </View>
                ) : null}

                {/* the number */}
                {rec ? (
                  <>
                    <View style={styles.resultCard}>
                      <View style={styles.resultHead}>
                        <View>
                          <Text style={styles.resultCal}>{grouped(rec.kcal)}</Text>
                          <Text style={styles.eyebrow}>Calories / day</Text>
                        </View>
                        <Text style={styles.resultVs}>
                          {current
                            ? rec.kcal === current.kcal
                              ? 'Same as current target'
                              : `${grouped(Math.abs(rec.kcal - current.kcal))} cal ${rec.kcal > current.kcal ? 'above' : 'below'} current target`
                            : 'No target set yet'}
                        </Text>
                      </View>
                      <View style={styles.resultMacros}>
                        {[
                          { v: `${rec.protein} g`, label: 'Protein' },
                          { v: `${rec.carb} g`, label: 'Carbs' },
                          { v: `${rec.fat} g`, label: 'Fat' },
                        ].map((m) => (
                          <View key={m.label} style={styles.resultMacro}>
                            <Text style={styles.resultMacroValue}>{m.v}</Text>
                            <Text style={styles.resultMacroLabel}>{m.label}</Text>
                          </View>
                        ))}
                      </View>
                      <View>
                        <Text style={styles.basis}>{basisLine(rec)}</Text>
                        <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setSheet('method')}>
                          <Text style={styles.linkText}>How we calculated this ›</Text>
                        </Pressable>
                      </View>
                      {heldLine(rec, sex) ? (
                        <View style={styles.shield}>
                          <ShieldGlyph />
                          <Text style={styles.shieldText}>{heldLine(rec, sex)}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => {
                        setManual({
                          kcal: String(rec.kcal),
                          protein: String(rec.protein),
                          carb: String(rec.carb),
                          fat: String(rec.fat),
                        });
                        setMode('manual');
                      }}
                    >
                      <Text style={[styles.linkText, styles.adjustLink]}>Adjust these in Manual</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.pending}>
                    <Text style={styles.pendingText}>
                      Your target appears here once birth year, height and a normal week are in.
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          /* manual */
          <View style={styles.manualBlock}>
            <InputField label="Calories / day" value={man.kcal} onChange={setMan('kcal')} keyboardType="number-pad" maxLength={5} />
            {manualCheck.message ? (
              <View style={styles.shield}>
                <ShieldGlyph />
                <View style={styles.shieldBody}>
                  <Text style={styles.shieldText}>{manualCheck.message}</Text>
                  <Pressable accessibilityRole="button" hitSlop={6} onPress={() => setManual({ ...man, kcal: String(manualCheck.minimum) })}>
                    <Text style={styles.linkText}>{manualCheck.useLabel}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            <View style={styles.manualMacros}>
              <View style={styles.manualCell}>
                <InputField label="Protein g" value={man.protein} onChange={setMan('protein')} keyboardType="number-pad" maxLength={3} />
              </View>
              <View style={styles.manualCell}>
                <InputField label="Carbs g" value={man.carb} onChange={setMan('carb')} keyboardType="number-pad" maxLength={3} />
              </View>
              <View style={styles.manualCell}>
                <InputField label="Fat g" value={man.fat} onChange={setMan('fat')} keyboardType="number-pad" maxLength={3} />
              </View>
            </View>
            <Text style={[styles.macroSum, macroLine.off && styles.macroSumOff]}>{macroLine.text}</Text>
          </View>
        )}

        {/* history */}
        <View style={styles.historyHead}>
          <Text style={styles.sectionLabel}>Target history</Text>
          <Text style={styles.historyIntro}>A change starts today. Earlier days stay judged by the target they had.</Text>
        </View>
        {rows.length ? (
          <View>
            {rows.map((row) => (
              <View key={row.from} style={styles.historyRow}>
                <View style={styles.historyText}>
                  <Text style={[styles.historyRange, row.current && styles.historyRangeOn]}>{row.range}</Text>
                  <Text style={styles.historyMacros}>{row.macros}</Text>
                </View>
                {row.current ? <Pill>In effect</Pill> : null}
                <Text style={[styles.historyCal, row.current && styles.historyCalOn]}>{row.kcal}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.historyEmpty}>No targets set yet. The first one you save starts here.</Text>
        )}
      </ScrollView>

      {/* commit */}
      <View style={styles.footer}>
        <Button variant="primary" fullWidth disabled={!canSave} onPress={save}>
          Use these targets
        </Button>
        <Text style={styles.saveNote}>{note}</Text>
      </View>

      <BottomSheet open={sheet === 'pace'} onClose={() => setSheet(null)} title="Pace">
        <View style={styles.sheetBody}>
          {paceOptions(goal).map((option) => {
            const on = Math.abs(rate - option) < 0.01;
            const preview = burn ? recommend(facts, burn, goal, option, todayIso) : null;
            let sub = preview ? `${grouped(preview.kcal)} cal / day` : '';
            if (preview?.held === 'cap') sub += ` · held at ${preview.burn.lossCap.toFixed(1)} lb, 1% of bodyweight`;
            if (preview?.held === 'floor') sub += ` · held at the ${grouped(preview.floor)} floor`;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={styles.sheetRow}
                onPress={() => {
                  setRate(option);
                  setSheet(null);
                }}
              >
                <View style={styles.sheetRowText}>
                  <Text style={[styles.sheetRowLabel, on && styles.sheetRowLabelOn]}>{paceLabel(option)}</Text>
                  {sub ? <Text style={styles.sheetRowSub}>{sub}</Text> : null}
                </View>
                <Radio on={on} />
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet open={sheet === 'method'} onClose={() => setSheet(null)} title="How we calculated this" scroll>
        <View style={styles.sheetBody}>
          {rec
            ? methodRows(rec, facts, sex).map((row) => (
                <View key={row.label} style={styles.methodRow}>
                  <View style={styles.methodHead}>
                    <Text style={styles.methodLabel}>{row.label}</Text>
                    <Text style={styles.methodValue}>{row.value}</Text>
                  </View>
                  <Text style={styles.methodNote}>{row.note}</Text>
                </View>
              ))
            : null}
          <Text style={styles.methodFoot}>
            Targets don’t change on their own. If your weight moves, Forge will ask you to review them.
          </Text>
        </View>
      </BottomSheet>

      <LogWeightSheet
        open={weighInOpen}
        units={units}
        onClose={() => setWeighInOpen(false)}
        onSaved={() => {
          setWeighInOpen(false);
          setReloads((n) => n + 1);
        }}
      />
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

/** A fact Forge needs before it may calculate anything, with the one place to supply it. */
function MissingCard({
  headline,
  body,
  action,
  onPress,
}: {
  headline: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.gateCard}>
      <Text style={styles.gateHeadline}>{headline}</Text>
      <Text style={styles.gateBody}>{body}</Text>
      <View style={styles.gateActions}>
        <Button variant="secondary" fullWidth onPress={onPress}>
          {action}
        </Button>
      </View>
    </View>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <View style={[styles.radio, on && styles.radioOn]}>
      <View style={[styles.radioDot, on && styles.radioDotOn]} />
    </View>
  );
}

function Chevron() {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

function Glyph({ kind, dim }: { kind: 'plus' | 'minus'; dim: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={dim ? flColor.charcoal500 : flColor.gray400} strokeWidth={2.4} strokeLinecap="round">
      <Path d={kind === 'plus' ? 'M12 5v14M5 12h14' : 'M5 12h14'} />
    </Svg>
  );
}

function ShieldGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={styles.shieldIcon}>
      <Path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },

  identity: { gap: 6, paddingHorizontal: 2, paddingBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400 },
  title: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, letterSpacing: -0.3, lineHeight: 34 },

  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: flRadius.pill, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal600 },
  tab: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.pill, borderWidth: 1, borderColor: 'transparent' },
  tabOn: { backgroundColor: flColor.charcoal700, borderColor: flColor.charcoal500 },
  tabText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray600 },
  tabTextOn: { color: flColor.cream100 },

  gateCard: {
    gap: 14,
    marginTop: 22,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  gateHeadline: { fontFamily: flFont.display, fontSize: 24, lineHeight: 29, color: flColor.cream100 },
  gateBody: { fontSize: 14, lineHeight: 22, color: flColor.gray400 },
  gateActions: { gap: 10, paddingTop: 8 },
  gateFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  gateFootText: { fontSize: 12.5, color: flColor.gray600 },
  linkText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    backgroundColor: 'rgba(191,143,79,0.07)',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  reviewText: { flex: 1, minWidth: 0, gap: 3 },
  reviewLine: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  reviewDelta: { fontSize: 12, color: flColor.gray600 },
  adjustLink: { paddingVertical: 12, paddingHorizontal: 2, fontSize: 13 },

  sectionLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },
  sectionSolo: { paddingTop: 30, paddingBottom: 12, paddingHorizontal: 2 },

  basedOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  basedOnText: { flex: 1, minWidth: 0, gap: 3 },
  basedOnLine: { fontSize: 14, color: flColor.cream100 },
  basedOnSub: { fontSize: 12, color: flColor.gray600 },

  fieldsHead: { gap: 6, paddingTop: 30, paddingBottom: 18, paddingHorizontal: 2 },
  fieldsIntro: { fontSize: 13, lineHeight: 20, color: flColor.gray400 },
  fields: { gap: 18 },
  heightRow: { flexDirection: 'row', gap: 12 },
  heightCell: { flex: 1, minWidth: 0 },

  activityBlock: { gap: 9 },
  activityLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400 },
  activityList: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, overflow: 'hidden' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 9, paddingHorizontal: 16 },
  activityRowOn: { backgroundColor: 'rgba(191,143,79,0.06)' },
  activityDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  activityText: { flex: 1, minWidth: 0, gap: 2 },
  activityName: { fontSize: 14, color: flColor.gray400 },
  activityNameOn: { color: flColor.cream100 },
  activityDetail: { fontSize: 12, color: flColor.gray600 },

  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: flColor.bronze400 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent' },
  radioDotOn: { backgroundColor: flColor.bronze400 },

  goalRow: { flexDirection: 'row', gap: 8 },
  goalButton: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  goalButtonOn: { backgroundColor: 'rgba(191,143,79,0.08)', borderColor: flColor.bronzeBorder },
  goalText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  goalTextOn: { color: flColor.bronze300 },

  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    minHeight: 56,
    paddingVertical: 6,
    paddingRight: 6,
    paddingLeft: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  paceLabel: { flex: 1, fontSize: 13, color: flColor.gray400 },
  paceStep: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.md },
  paceValue: {
    minWidth: 112,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  paceValueText: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },

  resultCard: {
    gap: 16,
    marginTop: 22,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    boxShadow: flShadow.card,
  },
  resultHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  resultCal: { fontFamily: flFont.display, fontSize: 48, color: flColor.cream100, letterSpacing: -0.8, lineHeight: 48, marginBottom: 8 },
  resultVs: { maxWidth: 130, paddingBottom: 2, fontSize: 12.5, lineHeight: 17, color: flColor.gray600, textAlign: 'right' },
  resultMacros: { flexDirection: 'row', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  resultMacro: { flex: 1, gap: 3 },
  resultMacroValue: { fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  resultMacroLabel: { fontSize: 11.5, color: flColor.gray600 },
  basis: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600 },

  shield: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    backgroundColor: 'rgba(191,143,79,0.07)',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  shieldIcon: { marginTop: 1 },
  shieldBody: { flex: 1, minWidth: 0, gap: 4 },
  shieldText: { flex: 1, fontSize: 13, lineHeight: 20, color: flColor.gray400 },

  pending: {
    marginTop: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: flColor.charcoal500,
  },
  pendingText: { fontSize: 13, lineHeight: 20, color: flColor.gray600, textAlign: 'center' },

  manualBlock: { gap: 18, paddingTop: 26 },
  manualMacros: { flexDirection: 'row', gap: 10 },
  manualCell: { flex: 1, minWidth: 0 },
  macroSum: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600 },
  macroSumOff: { color: flColor.gray400 },

  historyHead: { gap: 6, paddingTop: 38, paddingBottom: 12, paddingHorizontal: 2 },
  historyIntro: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  historyText: { flex: 1, minWidth: 0, gap: 3 },
  historyRange: { fontSize: 13.5, color: flColor.gray400 },
  historyRangeOn: { color: flColor.cream100 },
  historyMacros: { fontSize: 12, color: flColor.gray600 },
  historyCal: { minWidth: 64, textAlign: 'right', fontSize: 15, fontWeight: '600', color: flColor.gray600, fontVariant: ['tabular-nums'] },
  historyCalOn: { color: flColor.cream100 },
  historyEmpty: { paddingHorizontal: 2, fontSize: 13, lineHeight: 20, color: flColor.gray600 },

  footer: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  saveNote: { textAlign: 'center', fontSize: 12, lineHeight: 17, color: flColor.gray600 },

  sheetBody: { paddingBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  sheetRowText: { flex: 1, minWidth: 0, gap: 2 },
  sheetRowLabel: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  sheetRowLabelOn: { color: flColor.bronze300 },
  sheetRowSub: { fontSize: 12, color: flColor.gray600 },

  methodRow: { gap: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  methodHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  methodLabel: { fontSize: 13.5, color: flColor.cream100 },
  methodValue: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  methodNote: { fontSize: 12, lineHeight: 18, color: flColor.gray600 },
  methodFoot: { paddingTop: 14, fontSize: 12, lineHeight: 18, color: flColor.gray600 },
});
