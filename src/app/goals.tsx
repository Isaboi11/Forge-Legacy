import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import {
  fetchActiveChapterGoals,
  fetchGoalHistory,
  markAchieved,
  saveGoal,
  updateProgress,
  type ChapterGoals,
} from '@/data/goals-live';
import {
  GOAL_NAME_MAX,
  UNIT_MAX,
  goalSections,
  historyDate,
  isAchieved,
  isQuantifiable,
  orderedUnits,
  parseTarget,
  progressEntryLine,
  progressLabel,
  progressPct,
  validateGoal,
  type Goal,
} from '@/domain/goals/goals';
import { useQuery } from '@/lib/useQuery';
import { useCeremony, useToast } from '@/hooks/useCeremony';

/**
 * G-1 Goal Hub (+ Detail, Create/Edit, Update Progress) — `Forge Goal Hub.dc.html` and siblings, LOCKED.
 *
 * Chapter-scoped, real (`goals`, 0025). Three hub states: no active chapter · chapter but no goals ·
 * goals present (primary pinned + active + achieved). GD-D5: no delete — the chapter archive records
 * the outcome, so this screen has no remove path.
 *
 * A PRIMARY goal's achievement fires the M-3 Goal Achieved ceremony (`enqueue({kind:'goalAchieved'})`);
 * a SUPPORTING one gets a toast (GD-D4). Narrative "mark achieved" and quantifiable "update progress" both
 * route through that celebrate step. Achieving is confirmed first (ConfirmSheet) — it's permanent (GD-D5).
 */

const PLUS = 'M12 5v14M5 12h14';
const CHEVRON = 'M9 6l6 6-6 6';
const PENCIL = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z';

type ViewState = { mode: 'hub' } | { mode: 'detail'; id: string } | { mode: 'form'; id?: string; primary: boolean };

export default function GoalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, refetch } = useQuery(fetchActiveChapterGoals, []);
  const [view, setView] = useState<ViewState>({ mode: 'hub' });

  if (loading || !data) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
        <AppBar title="Goals" serif onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  if (view.mode === 'form') {
    const existing = view.id ? data.goals.find((g) => g.id === view.id) : undefined;
    return (
      <GoalForm
        existing={existing}
        chapterId={data.chapterId}
        primary={view.primary}
        insets={insets}
        onCancel={() => setView(view.id ? { mode: 'detail', id: view.id } : { mode: 'hub' })}
        onSaved={(g) => {
          refetch();
          setView({ mode: 'detail', id: g.id });
        }}
      />
    );
  }

  if (view.mode === 'detail') {
    const goal = data.goals.find((g) => g.id === view.id);
    if (!goal) {
      setView({ mode: 'hub' });
      return null;
    }
    return (
      <GoalDetail
        goal={goal}
        chapterName={data.chapterName}
        insets={insets}
        onBack={() => setView({ mode: 'hub' })}
        onEdit={() => setView({ mode: 'form', id: goal.id, primary: goal.isPrimary })}
        onChanged={refetch}
      />
    );
  }

  return <GoalHub data={data} insets={insets} onOpen={(id) => setView({ mode: 'detail', id })} onAdd={(primary) => setView({ mode: 'form', primary })} onStartChapter={() => router.push('/legacy')} />;
}

// ── G-1 hub ──
function GoalHub({
  data,
  insets,
  onOpen,
  onAdd,
  onStartChapter,
}: {
  data: ChapterGoals;
  insets: { bottom: number };
  onOpen: (id: string) => void;
  onAdd: (primary: boolean) => void;
  onStartChapter: () => void;
}) {
  const router = useRouter();
  const { primary, active, achieved } = goalSections(data.goals);

  const body = () => {
    if (!data.chapterId) {
      return (
        <Empty
          icon="M4 5a1 1 0 0 1 1-1h11l-2.2 3L16 10H5v9"
          title="Goals live inside chapters."
          sub="Start a chapter to begin pursuing a goal."
          cta="Start a Chapter"
          onCta={onStartChapter}
        />
      );
    }
    if (data.goals.length === 0) {
      return (
        <>
          <ChapterAnchor name={data.chapterName} />
          <Empty
            circle
            title="What are you building toward?"
            sub="Define the goal for this chapter."
            cta="Add a Goal"
            onCta={() => onAdd(true)}
          />
        </>
      );
    }
    return (
      <>
        <ChapterAnchor name={data.chapterName} />
        {primary ? <PrimaryCard goal={primary} onPress={() => onOpen(primary.id)} /> : null}

        {active.length ? (
          <View style={styles.group}>
            {active.map((g) => (
              <GoalRow key={g.id} goal={g} onPress={() => onOpen(g.id)} />
            ))}
          </View>
        ) : null}

        {achieved.length ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>Achieved</Text>
            {achieved.map((g) => (
              <GoalRow key={g.id} goal={g} onPress={() => onOpen(g.id)} />
            ))}
          </View>
        ) : null}

        {!primary ? (
          <Pressable onPress={() => onAdd(true)} accessibilityRole="button" accessibilityLabel="Add a chapter goal" style={styles.addBtn}>
            <Glyph d={PLUS} size={17} color={flColor.bronze300} width={2} />
            <Text style={styles.addText}>Add a Chapter Goal</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => onAdd(false)} accessibilityRole="button" accessibilityLabel="Add a supporting goal" style={styles.addBtn}>
            <Glyph d={PLUS} size={17} color={flColor.bronze300} width={2} />
            <Text style={styles.addText}>Add a Supporting Goal</Text>
          </Pressable>
        )}
      </>
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar title="Goals" serif onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {body()}
      </ScrollView>
    </View>
  );
}

function ChapterAnchor({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <View style={styles.anchor}>
      <Text style={styles.anchorLabel}>Current Chapter</Text>
      <Text style={styles.anchorName}>{name}</Text>
    </View>
  );
}

function PrimaryCard({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const done = isAchieved(goal);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={goal.name} style={[styles.primary, done && styles.primaryDone]}>
      <Text style={styles.primaryEyebrow}>{done ? 'Chapter Goal · Achieved' : 'Chapter Goal'}</Text>
      <Text style={styles.primaryName}>{goal.name}</Text>
      {isQuantifiable(goal) ? (
        <View style={styles.primaryProgress}>
          <ProgressBar value={progressPct(goal)} max={100} height={8} label={`${progressLabel(goal)} · ${progressPct(goal)}%`} />
        </View>
      ) : (
        <Text style={styles.narrativeState}>{done ? 'Achieved' : 'In progress — renewed each week'}</Text>
      )}
    </Pressable>
  );
}

function GoalRow({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const done = isAchieved(goal);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={goal.name} style={[styles.row, done && styles.rowDone]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowName, done && styles.rowNameDone]} numberOfLines={1}>
          {goal.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {progressLabel(goal)}
        </Text>
      </View>
      <Glyph d={CHEVRON} size={16} color={flColor.gray600} width={2} />
    </Pressable>
  );
}

// ── goal detail ──
function GoalDetail({ goal, chapterName, insets, onBack, onEdit, onChanged }: { goal: Goal; chapterName: string | null; insets: { bottom: number }; onBack: () => void; onEdit: () => void; onChanged: () => void }) {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [achieveOpen, setAchieveOpen] = useState(false);
  const { enqueue } = useCeremony();
  const { showToast } = useToast();
  const { data: history, refetch: refetchHistory } = useQuery(() => fetchGoalHistory(goal.id), [goal.id]);
  const done = isAchieved(goal);

  // GD-D4: a PRIMARY achievement fires the M-3 ceremony; a SUPPORTING one is noted with a toast, not
  // celebrated at the same level.
  const celebrate = (newlyAchieved: boolean) => {
    if (!newlyAchieved) return;
    if (goal.isPrimary) enqueue({ id: `goal-${goal.id}`, kind: 'goalAchieved', goalName: goal.name, chapterName: chapterName ?? undefined });
    else showToast('Goal achieved · recorded in your legacy');
  };

  // Achieving is permanent (GD-D5) — confirm before it's written, so it's never an accidental tap.
  const runAchieve = () => {
    setAchieveOpen(false);
    void markAchieved(goal.id).then((res) => {
      celebrate(res.newlyAchieved);
      onChanged();
    });
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar
        title=""
        onBack={onBack}
        actions={
          !done ? (
            <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit goal" hitSlop={8} style={styles.iconBtn}>
              <Glyph d={PENCIL} size={18} color={flColor.gray400} />
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {goal.isPrimary ? <Text style={styles.detailEyebrow}>Chapter Goal</Text> : null}
        <Text style={styles.detailName}>{goal.name}</Text>

        {isQuantifiable(goal) ? (
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Progress</Text>
            <Text style={styles.detailBig}>{progressLabel(goal)}</Text>
            <ProgressBar value={progressPct(goal)} max={100} height={8} label={`${progressPct(goal)}%`} />
            {!done ? (
              <>
                <Pressable onPress={() => setUpdateOpen(true)} accessibilityRole="button" accessibilityLabel="Update progress" style={styles.updateBtn}>
                  <Glyph d={PENCIL} size={16} color={flColor.bronze300} width={2} />
                  <Text style={styles.updateText}>Update Progress</Text>
                </Pressable>
                {/* Declare it done before the number lands — the design allows marking a tracked goal achieved. */}
                <Pressable onPress={() => setAchieveOpen(true)} accessibilityRole="button" accessibilityLabel="Mark achieved" style={styles.markLink}>
                  <Text style={styles.markLinkText}>Mark as Achieved</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.achievedPill}>
                <Text style={styles.achievedPillText}>Achieved</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.detailBlock}>
            <View style={styles.achievedPill}>
              <Text style={styles.achievedPillText}>{done ? 'Achieved' : 'In Progress'}</Text>
            </View>
            <Text style={styles.narrativeCopy}>A commitment you renew each week. Mark it achieved when the chapter has proven it.</Text>
            {!done ? (
              <Button variant="primary" fullWidth onPress={() => setAchieveOpen(true)} accessibilityLabel="Mark achieved">
                Mark Achieved
              </Button>
            ) : null}
          </View>
        )}

        {/* History — the log of every progress update (G-2). */}
        {isQuantifiable(goal) && (history?.length ?? 0) > 0 ? (
          <View style={styles.historyBlock}>
            <Text style={styles.detailLabel}>History</Text>
            {(history ?? []).map((e) => (
              <View key={e.id} style={styles.historyRow}>
                <Text style={styles.historyLine}>{progressEntryLine(e, goal.unit)}</Text>
                <Text style={styles.historyDate}>{historyDate(e.createdAt)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <UpdateProgressSheet
        open={updateOpen}
        goal={goal}
        onClose={() => setUpdateOpen(false)}
        onSaved={(newlyAchieved) => {
          setUpdateOpen(false);
          celebrate(newlyAchieved);
          refetchHistory(); // the update just wrote a new history row
          onChanged();
        }}
      />

      <ConfirmSheet
        open={achieveOpen}
        onClose={() => setAchieveOpen(false)}
        headline={`Achieve “${goal.name}”?`}
        body="This is recorded in your legacy — there’s no undo."
        confirmLabel="Achieve"
        cancelLabel="Not yet"
        tone="primary"
        onConfirm={runAchieve}
      />
    </View>
  );
}

function UpdateProgressSheet({ open, goal, onClose, onSaved }: { open: boolean; goal: Goal; onClose: () => void; onSaved: (newlyAchieved: boolean) => void }) {
  const [value, setValue] = useState(String(goal.current));
  const [saving, setSaving] = useState(false);
  const n = parseTarget(value) ?? Number(value.trim());
  const valid = Number.isFinite(n) && n >= 0;

  const save = () => {
    if (!valid) return;
    setSaving(true);
    void updateProgress(goal.id, n).then((res) => onSaved(res.newlyAchieved), () => setSaving(false));
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Update Progress">
      <View style={styles.sheet}>
        <Text style={styles.sheetLabel}>Current{goal.unit ? ` (${goal.unit})` : ''}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => setValue(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder={goal.target != null ? `of ${goal.target}` : ''}
          placeholderTextColor={flColor.gray600}
          autoFocus
        />
        <View style={styles.sheetActions}>
          <Button variant="primary" fullWidth disabled={!valid || saving} onPress={save} accessibilityLabel="Save progress">
            Save
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

// ── create / edit form ──
function GoalForm({
  existing,
  chapterId,
  primary,
  insets,
  onCancel,
  onSaved,
}: {
  existing?: Goal;
  chapterId: string | null;
  primary: boolean;
  insets: { bottom: number };
  onCancel: () => void;
  onSaved: (g: Goal) => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing?.target != null ? String(existing.target) : '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [customUnit, setCustomUnit] = useState(existing?.unit != null && !orderedUnits('').includes(existing.unit));
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const isPrimary = existing?.isPrimary ?? primary;
  const valid = validateGoal({ name, target });
  const hasTarget = parseTarget(target) != null;
  const chips = orderedUnits(name);
  const showPreview = name.trim().length >= 2;

  // Discard protection: only prompt when there's unsaved input to lose (M3 / the design's discard sheet).
  const dirty = name !== (existing?.name ?? '') || target !== (existing?.target != null ? String(existing.target) : '') || unit !== (existing?.unit ?? '');
  const cancel = () => {
    if (!dirty) return onCancel();
    setDiscardOpen(true);
  };

  const save = () => {
    if (!valid.ok || !chapterId) return;
    setSaving(true);
    saveGoal({
      id: existing?.id,
      chapterId,
      name,
      target: parseTarget(target),
      unit: hasTarget ? unit.trim() || null : null,
      isPrimary,
    }).then(onSaved, () => setSaving(false));
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar title={existing ? 'Edit Goal' : isPrimary ? 'Chapter Goal' : 'Supporting Goal'} onClose={cancel} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Field label="Goal" counter={`${name.length}/${GOAL_NAME_MAX}`}>
          <TextInput style={styles.input} value={name} onChangeText={(t) => setName(t.slice(0, GOAL_NAME_MAX))} placeholder="e.g. Squat 405 lb" placeholderTextColor={flColor.gray600} maxLength={GOAL_NAME_MAX} />
        </Field>

        <Field label="Target Value · optional">
          <TextInput
            style={styles.input}
            value={target}
            onChangeText={(t) => setTarget(t.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="Leave blank for a narrative goal"
            placeholderTextColor={flColor.gray600}
          />
        </Field>

        {hasTarget ? (
          <Field label="Unit">
            <View style={styles.chipRow}>
              {chips.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => {
                    setUnit(u);
                    setCustomUnit(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !customUnit && unit === u }}
                  style={[styles.chip, !customUnit && unit === u && styles.chipOn]}
                >
                  <Text style={[styles.chipText, !customUnit && unit === u && styles.chipTextOn]}>{u}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setCustomUnit(true)} accessibilityRole="button" accessibilityState={{ selected: customUnit }} style={[styles.chip, customUnit && styles.chipOn]}>
                <Text style={[styles.chipText, customUnit && styles.chipTextOn]}>Custom</Text>
              </Pressable>
            </View>
            {customUnit ? (
              <TextInput style={[styles.input, styles.customUnit]} value={unit} onChangeText={(t) => setUnit(t.slice(0, UNIT_MAX))} placeholder="min/side, rooms, books…" placeholderTextColor={flColor.gray600} maxLength={UNIT_MAX} autoFocus />
            ) : null}
          </Field>
        ) : null}

        {/* live type hint — decided automatically by whether a target is set */}
        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>{hasTarget ? 'Tracked goal' : 'Narrative goal'}</Text>
          <Text style={styles.hintBody}>
            {hasTarget
              ? `You’ll log progress toward ${parseTarget(target)}${unit ? ` ${unit}` : ''} over time.`
              : 'No number to hit — mark it achieved when the chapter has proven it.'}
          </Text>
        </View>

        {/* preview — how it will appear on the hub */}
        {showPreview ? (
          <View style={styles.previewWrap}>
            <Text style={styles.previewLabel}>How it will appear</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewName} numberOfLines={1}>
                {name.trim()}
              </Text>
              {hasTarget ? (
                <View style={styles.previewProgress}>
                  <ProgressBar value={0} max={100} height={8} label={`0 / ${parseTarget(target)}${unit ? ` ${unit}` : ''} · 0%`} />
                </View>
              ) : (
                <View style={styles.previewPill}>
                  <Text style={styles.previewPillText}>In Progress</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.saveWrap}>
          <Button variant="primary" fullWidth disabled={!valid.ok || saving} onPress={save} accessibilityLabel="Save goal">
            {existing ? 'Save Changes' : isPrimary ? 'Set Chapter Goal' : 'Add Goal'}
          </Button>
        </View>
      </ScrollView>

      <ConfirmSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        headline="Discard changes?"
        body="Nothing is saved as a draft."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        tone="destructive"
        onConfirm={() => {
          setDiscardOpen(false);
          onCancel();
        }}
      />
    </View>
  );
}

function Field({ label, counter, children }: { label: string; counter?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {counter ? <Text style={styles.fieldCounter}>{counter}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Empty({ icon, circle, title, sub, cta, onCta }: { icon?: string; circle?: boolean; title: string; sub: string; cta: string; onCta: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        {circle ? (
          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={flColor.charcoal500} strokeWidth={1.5}>
            <Circle cx={12} cy={12} r={8} />
            <Circle cx={12} cy={12} r={3.4} />
          </Svg>
        ) : (
          <Glyph d={icon ?? PLUS} size={30} color={flColor.charcoal500} width={1.5} />
        )}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
      <Button variant="primary" onPress={onCta} accessibilityLabel={cta}>
        {cta}
      </Button>
    </View>
  );
}

function Glyph({ d, size = 16, color, width = 1.9 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((seg) => (
        <Path key={seg} d={`M${seg}`} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 8 },
  iconBtn: { padding: 6 },

  empty: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40, paddingTop: 70 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  emptySub: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center', marginTop: -6 },

  anchor: { marginBottom: 18 },
  anchorLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  anchorName: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100, marginTop: 3 },

  primary: { padding: 18, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, marginBottom: 16 },
  primaryDone: { borderColor: flColor.bronzeBorderSubtle },
  primaryEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 8 },
  primaryName: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100 },
  primaryProgress: { marginTop: 16 },
  narrativeState: { fontSize: 13, color: flColor.gray400, marginTop: 12 },

  group: { marginBottom: 16, gap: 8 },
  groupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  rowDone: { opacity: 0.66 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  rowNameDone: { textDecorationLine: 'line-through', color: flColor.gray400 },
  rowSub: { fontSize: 12, color: flColor.gray600, marginTop: 2 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(196,142,74,0.05)', marginTop: 4 },
  addText: { fontSize: 14, fontWeight: '600', color: flColor.bronze300 },

  // detail
  detailEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 8 },
  detailName: { fontFamily: flFont.display, fontSize: 26, fontWeight: '600', color: flColor.cream100 },
  detailBlock: { marginTop: 28, gap: 12 },
  detailLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },
  detailBig: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', color: flColor.cream100 },
  updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: 'rgba(196,142,74,0.06)', marginTop: 4 },
  updateText: { fontSize: 14, fontWeight: '600', color: flColor.bronze300 },
  achievedPill: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  achievedPillText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },
  narrativeCopy: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },
  markLink: { alignSelf: 'center', paddingVertical: 10 },
  markLinkText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  historyBlock: { marginTop: 30, gap: 2 },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  historyLine: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  historyDate: { fontSize: 12, color: flColor.gray600 },

  // form
  field: { marginBottom: 20 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  fieldLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  fieldCounter: { fontSize: 11, color: flColor.gray600 },
  input: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, color: flColor.cream100, fontSize: 15, paddingVertical: 13, paddingHorizontal: 14 },
  customUnit: { marginTop: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.bronze300 },

  hintCard: { padding: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, marginBottom: 14 },
  hintTitle: { fontSize: 12.5, fontWeight: '700', color: flColor.bronze300, marginBottom: 3 },
  hintBody: { fontSize: 12, lineHeight: 18, color: flColor.gray400 },

  previewWrap: { marginBottom: 18 },
  previewLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginBottom: 9 },
  previewCard: { padding: 16, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  previewName: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  previewProgress: { marginTop: 12 },
  previewPill: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900 },
  previewPillText: { fontSize: 11.5, fontWeight: '700', color: flColor.bronze300 },

  saveWrap: { marginTop: 8 },

  // sheet
  sheet: { paddingHorizontal: 2, paddingBottom: 8 },
  sheetLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 10 },
  sheetActions: { marginTop: 16 },
});
