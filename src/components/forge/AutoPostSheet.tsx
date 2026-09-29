import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { EngravedIcon, type EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
import { SquadSelectList } from '@/components/forge/SquadSelectList';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchMySquads, type SquadSummary } from '@/data/squad-live';
import { autoPostLabel, autoPostOn, pruneAutoPost, type AutoPostPref } from '@/domain/share/auto-post';
import { useToast } from '@/hooks/useCeremony';
import { useAutoPost } from '@/hooks/useAutoPost';
import { errorMessage } from '@/lib/useQuery';

/**
 * AUTO-POST SETTINGS — one sheet, opened from the completion screen's row and from Profile Visibility.
 *
 * ══ THE OPTIONS FOLLOW THE ATHLETE'S SQUADS ══
 *
 *   · No squad:   Off · Friends. The squad options stay VISIBLE and disabled with the reason — a missing
 *                 option teaches nothing (the same rule `ShareSessionSheet` follows).
 *   · One squad:  Off · Friends · My Squad · Friends + Squad. Nothing to pick between, so no picker.
 *   · Several:    Off · Friends · Specific squad(s) › · Friends + selected squad(s) ›. Either squad option
 *                 opens "Select your squad(s)", and nothing is saved until Save.
 *
 * Every other option saves on the tap, like every other settings row in the app. The athlete always sees
 * WHERE before it is on — the option's own label is the destination.
 */

type Choice = 'off' | 'friends' | 'squads' | 'both';

function choiceOf(p: AutoPostPref): Choice {
  if (!autoPostOn(p)) return 'off';
  if (p.friends && p.squadIds.length) return 'both';
  return p.friends ? 'friends' : 'squads';
}

export interface AutoPostSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AutoPostSheet({ open, onClose }: AutoPostSheetProps) {
  const { pref, loaded, save } = useAutoPost();
  const { showToast } = useToast();
  const [squads, setSquads] = useState<SquadSummary[] | null>(null);
  /** The squad step, and which option opened it. Null on the options list. */
  const [pickFor, setPickFor] = useState<'squads' | 'both' | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  /* Read on open, not on mount — the row that hosts this sheet is drawn on screens that never open it. */
  useEffect(() => {
    if (!open || squads) return;
    let alive = true;
    void fetchMySquads().then(
      (s) => alive && setSquads(s),
      () => alive && setSquads([]),
    );
    return () => {
      alive = false;
    };
  }, [open, squads]);

  const mine = squads ?? [];
  const live = pruneAutoPost(pref, mine.map((s) => s.id));
  const current = choiceOf(live);
  const many = mine.length > 1;
  const none = squads != null && mine.length === 0;

  const commit = async (next: AutoPostPref) => {
    if (saving) return;
    setSaving(true);
    try {
      await save({ ...next, asked: true });
      setPickFor(null);
    } catch (e) {
      showToast(errorMessage(e) || 'Couldn’t save that. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const choose = (c: Choice) => {
    if (!loaded) {
      showToast('Still loading your settings — try that again in a moment.');
      return;
    }
    if (c === 'off') return void commit({ ...live, friends: false, squadIds: [] });
    if (c === 'friends') return void commit({ ...live, friends: true, squadIds: [] });
    // One squad is not a choice — it is THE squad.
    if (!many) return void commit({ ...live, friends: c === 'both', squadIds: mine.map((s) => s.id) });
    // Several: pick them. Seeded with what is already chosen, so editing is not starting over.
    setPicked(new Set(live.squadIds));
    setPickFor(c);
  };

  const close = () => {
    setPickFor(null);
    onClose();
  };

  const options: { key: Choice; label: string; sub: string; icon: EngravedName | null; needsSquad: boolean }[] = [
    { key: 'off', label: 'Off', sub: 'I’ll choose each time.', icon: null, needsSquad: false },
    { key: 'friends', label: 'Friends', sub: 'Automatically post to your Friends.', icon: 'partners', needsSquad: false },
    many
      ? { key: 'squads', label: 'Specific squad(s)', sub: 'Choose which squad(s) to post to.', icon: 'people', needsSquad: true }
      : { key: 'squads', label: 'My Squad', sub: 'Automatically post to your squad.', icon: 'people', needsSquad: true },
    many
      ? { key: 'both', label: 'Friends + selected squad(s)', sub: 'Automatically post to Friends and the squads you pick.', icon: 'layers', needsSquad: true }
      : { key: 'both', label: 'Friends + Squad', sub: 'Automatically post to both.', icon: 'layers', needsSquad: true },
  ];

  return (
    <BottomSheet
      open={open}
      onClose={close}
      scroll
      title={pickFor ? 'Select your squad(s)' : 'Auto-post settings'}
      footer={
        pickFor ? (
          <Button
            variant="primary"
            fullWidth
            disabled={saving || picked.size === 0}
            onPress={() => void commit({ ...live, friends: pickFor === 'both', squadIds: mine.filter((s) => picked.has(s.id)).map((s) => s.id) })}
            accessibilityLabel="Save the squads to post to"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        ) : null
      }
    >
      {pickFor ? (
        <SquadSelectList
          squads={mine}
          selected={picked}
          onChange={setPicked}
          disabled={saving}
          hint={pickFor === 'both' ? 'Your finished workouts post to Friends and to each squad you pick.' : 'Your finished workouts post to each squad you pick.'}
        />
      ) : (
        <View style={styles.body}>
          <Text style={styles.heading}>Automatically post workouts</Text>
          <Text style={styles.copy}>Choose where your completed workouts are posted by default.</Text>
          <View style={styles.list} accessibilityRole="radiogroup">
            {options.map((o, i) => {
              const on = current === o.key;
              const off = saving || (o.needsSquad && none);
              const sub = o.needsSquad && none ? 'Join a squad to post there automatically.' : o.sub;
              const drills = many && o.needsSquad;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => choose(o.key)}
                  disabled={off}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: off }}
                  accessibilityLabel={`${o.label}. ${sub}`}
                  style={({ pressed }) => [styles.row, i > 0 && styles.rowDiv, pressed && !off && styles.rowPressed, off && !on && styles.rowOff]}
                >
                  <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                  {o.icon ? <EngravedIcon name={o.icon} size={18} color={on ? flColor.bronze300 : flColor.gray400} /> : <View style={styles.iconGap} />}
                  <View style={styles.rowText}>
                    <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
                    <Text style={styles.sub}>{sub}</Text>
                  </View>
                  {drills ? <EngravedIcon name="chevron-right" size={14} color={flColor.gray600} /> : null}
                </Pressable>
              );
            })}
          </View>
          {/* Where it is going, in words, whenever it is on — the rows above say what each option means,
              this says what the athlete actually has. */}
          {current !== 'off' ? (
            <Text style={styles.now}>
              Posting to {autoPostLabel(live, mine)}. Your map, notes and photos are never posted automatically.
            </Text>
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}

/**
 * "⚡ Automatically post workouts        Off ›" — the row, with its sheet. Secondary on purpose: it sits
 * UNDER the Post to Forge button and must never compete with it.
 */
export function AutoPostRow({ squads }: { squads?: readonly { id: string; name: string }[] | null }) {
  const { pref } = useAutoPost();
  const [open, setOpen] = useState(false);
  /* A host that already holds the athlete's squads passes them; one that does not gets them read here,
     so "My Squad" vs a squad's name is right on every surface. */
  const [own, setOwn] = useState<SquadSummary[] | null>(null);
  const needOwn = squads === undefined;
  useEffect(() => {
    if (!needOwn) return;
    let alive = true;
    void fetchMySquads().then(
      (s) => alive && setOwn(s),
      () => alive && setOwn([]),
    );
    return () => {
      alive = false;
    };
  }, [needOwn, open]);
  const known = squads ?? own;
  /* Until the list is known, the label is drawn from the pref alone — "Off", "Friends", or a count. */
  const value = autoPostLabel(pref, known ?? pref.squadIds.map((id) => ({ id, name: 'Squad' })));
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Automatically post workouts: ${value}`}
        style={({ pressed }) => [styles.autoRow, pressed && styles.rowPressed]}
      >
        <EngravedIcon name="lightning" size={16} color={flColor.bronze400} />
        <Text style={styles.autoLabel}>Automatically post workouts</Text>
        <Text style={[styles.autoValue, value !== 'Off' && styles.autoValueOn]} numberOfLines={1}>
          {value}
        </Text>
        <EngravedIcon name="chevron-right" size={13} color={flColor.gray600} />
      </Pressable>
      <AutoPostSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: 6 },
  heading: { fontSize: 15, fontWeight: '700', color: flColor.cream100 },
  copy: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400, marginBottom: 8 },
  list: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowDiv: { borderTopWidth: 1, borderTopColor: flColor.divider },
  rowPressed: { backgroundColor: flColor.charcoal900 },
  rowOff: { opacity: 0.45 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: flColor.charcoal500, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: flColor.accentBorder },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: flColor.bronze300 },
  iconGap: { width: 18 },
  rowText: { flex: 1, minWidth: 0 },
  label: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  labelOn: { color: flColor.bronze300 },
  sub: { marginTop: 2, fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },
  now: { marginTop: 8, fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  autoLabel: { flex: 1, fontSize: 13, color: flColor.cream100 },
  autoValue: { maxWidth: 140, fontSize: 12.5, color: flColor.gray600 },
  autoValueOn: { color: flColor.bronze300, fontWeight: '600' },
});
