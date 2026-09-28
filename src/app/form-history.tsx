import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BackGlyph, CloseGlyph, FC, FcPrimary, FormBar, FrameFill, HoltSays, MarkedFrame } from '@/components/forge/form-check/FormCheckParts';
import { ScreenBackground } from '@/components/screen-background';
import { flFont, flRadius } from '@/constants/foundation';
import { listFormHistory, type FormHistoryEntry } from '@/data/form-history-live';

/**
 * FORM HISTORY — `Coach Holt Form Check.dc.html` 05: the timeline (05), compare (05b), and empty (05c).
 *
 * Reached from a read's "Saved · See form history". Params: `key` (the lift key `form_checks.lift_key`
 * groups by) and `lift` (its display name).
 *
 * ══ DELTAS FROM THE .dc ══
 *
 *   · Compare draws each date's SAVED FRAME with Holt's mark on it, not the .dc's traced bar-path line. A
 *     bar path is a trace across every frame of a rep, which needs body/bar tracking (Plan §5.1, Phase 3).
 *     The frames are real; the line would be invented. DEFERRED.
 *   · Holt's lines here are the model's own `progress` sentences from those reads. When a read has none,
 *     the screen states the saved fixes plainly rather than composing a verdict of its own.
 */

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const lowerLead = (t: string) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

export default function FormHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ key?: string; lift?: string }>();
  const key = params.key ? String(params.key) : '';
  const liftName = params.lift ? String(params.lift) : 'Form history';

  const [entries, setEntries] = useState<FormHistoryEntry[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  const [open, setOpen] = useState<FormHistoryEntry | null>(null);

  useEffect(() => {
    let live = true;
    void listFormHistory(key).then((e) => {
      if (live) setEntries(e);
    });
    return () => {
      live = false;
    };
  }, [key]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const list = entries ?? [];

  // Compare defaults to the oldest and the newest — the change the athlete most wants to see.
  const startCompare = () => {
    if (list.length < 2) return;
    setPick([list[list.length - 1].id, list[0].id]);
    setComparing(true);
  };
  const pickDate = (id: string) =>
    setPick((cur) => {
      if (cur.includes(id)) return cur;
      const next = [cur[1] ?? cur[0], id].filter(Boolean) as string[];
      // Keep them in time order: older on the left.
      return next.sort((a, b) => list.findIndex((e) => e.id === b) - list.findIndex((e) => e.id === a));
    });

  const top = { paddingTop: insets.top };

  if (entries && list.length === 0) {
    return (
      <View style={[s.root, top]}>
        <ScreenBackground atmospheric overlay={null} />
        <FormBar
          left={
            <Pressable onPress={back} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
              <BackGlyph />
            </Pressable>
          }
        />
        <View style={s.pad}>
          <Text style={s.h2}>{liftName}</Text>
        </View>
        <View style={s.emptyMid}>
          <HoltSays text="No form checks on this lift yet. Film a set and we'll start a record." label={false} />
        </View>
        <View style={[s.pad, { paddingBottom: 28 + insets.bottom }]}>
          <FcPrimary
            label="Film a set"
            onPress={() =>
              router.replace({ pathname: '/form-check', params: { lift: liftName, key: key !== liftName.toLowerCase() ? key : '' } } as unknown as Parameters<typeof router.replace>[0])
            }
          />
        </View>
      </View>
    );
  }

  if (comparing) {
    const chosen = pick.map((id) => list.find((e) => e.id === id)).filter((e): e is FormHistoryEntry => !!e);
    const later = chosen[1];
    const holt =
      later?.progress ||
      (chosen.length === 2 && chosen[0].fix && chosen[1].fix
        ? `On ${chosen[0].date}: ${lowerLead(chosen[0].fix)} On ${chosen[1].date}: ${lowerLead(chosen[1].fix)}`
        : '');
    return (
      <View style={[s.root, top]}>
        <ScreenBackground atmospheric overlay={null} />
        <FormBar
          left={
            <Pressable onPress={back} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
              <BackGlyph />
            </Pressable>
          }
          right={
            <Pressable onPress={() => setComparing(false)} style={s.textAction} accessibilityRole="button">
              <Text style={s.textActionOn}>Done</Text>
            </Pressable>
          }
        />
        <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets contentContainerStyle={[s.body, { paddingBottom: 24 + insets.bottom }]}>
          <View style={s.head}>
            <Text style={s.h2}>{liftName}</Text>
            {/* The .dc says "bottom of the rep". These are the frames Holt MARKED, which are not always the
                bottom — claiming so needs rep detection (Plan §5.1). DEFERRED-HONEST: the words match the frames. */}
            <Text style={s.meta}>Compare · the frame Holt marked</Text>
          </View>
          <View style={s.group}>
            <Text style={s.label}>PICK TWO DATES</Text>
            <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dates}>
              {[...list].reverse().map((e) => {
                const on = pick.includes(e.id);
                return (
                  <Pressable key={e.id} onPress={() => pickDate(e.id)} style={[s.chip, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    {on ? <Tick /> : null}
                    <Text style={[s.chipText, on && s.chipTextOn]}>{e.date}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={s.pair}>
            {chosen.map((e) => (
              <View key={e.id} style={s.pairCol}>
                <MarkedFrame uri={e.frameUrl} mark={e.mark} height={290} />
                <Text style={s.pairDate}>{e.date}</Text>
                {e.fix ? <Text style={s.pairNote}>{e.fix}</Text> : null}
              </View>
            ))}
          </View>
          {holt ? <HoltSays text={holt} label={false} size={32} /> : null}
        </ScrollView>
      </View>
    );
  }

  const first = list.length ? new Date(list[list.length - 1].createdAt) : null;
  const since = first && !Number.isNaN(first.getTime()) ? ` since ${MONTHS_LONG[first.getMonth()]}` : '';
  const latest = list[0];
  const holtNow = latest?.progress || (latest?.fix ? `The thing to work on now: ${lowerLead(latest.fix)}` : '');

  return (
    <View style={[s.root, top]}>
      <ScreenBackground atmospheric overlay={null} />
      <FormBar
        left={
          <Pressable onPress={back} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Back">
            <BackGlyph />
          </Pressable>
        }
        right={
          list.length >= 2 ? (
            <Pressable onPress={startCompare} style={s.textAction} accessibilityRole="button">
              <Text style={s.textActionLabel}>Compare</Text>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets contentContainerStyle={[s.body, { paddingBottom: 24 + insets.bottom }]}>
        <View style={s.head}>
          <Text style={s.h2}>{liftName}</Text>
          {entries ? <Text style={s.meta}>{`${list.length} form check${list.length === 1 ? '' : 's'}${since}`}</Text> : null}
        </View>
        {holtNow ? <HoltSays text={holtNow} /> : null}
        <View>
          {list.map((e, i) => (
            <Pressable key={e.id} onPress={() => setOpen(e)} style={s.row} accessibilityRole="button" accessibilityLabel={`${e.date}: ${e.fix}`}>
              <View style={s.dotCol}>
                <View style={[s.tlDot, { backgroundColor: i === 0 ? FC.brzHi : FC.ink3 }]} />
              </View>
              <View style={s.thumb}>
                <FrameFill />
                {e.frameUrl ? <Image source={{ uri: e.frameUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}</View>
              <View style={s.rowText}>
                <Text style={s.rowDate}>{e.date}</Text>
                <Text style={s.rowFix}>{e.fix || 'Nothing to clean up.'}</Text>
                {e.trend ? (
                  <Text style={[s.tag, e.trend === 'better' ? s.tagBetter : null]}>
                    {e.trend === 'better' ? 'BETTER' : e.trend === 'same' ? 'SAME' : 'NEW FIX'}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!open} animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        {open ? (
          <View style={[s.fullRoot, { paddingTop: insets.top }]}>
            <View style={s.fullBar}>
              <Text style={s.fullTitle}>{open.date}</Text>
              <Pressable onPress={() => setOpen(null)} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Close" hitSlop={4}>
                <CloseGlyph color="#F0EDE8" />
              </Pressable>
            </View>
            <View style={s.fullFrame}>
              <MarkedFrame uri={open.frameUrl} mark={open.mark} fill contain />
            </View>
            {open.fix ? (
              <View style={[s.fullSays, { paddingBottom: 34 + insets.bottom }]}>
                <HoltSays text={open.fix} label={false} size={32} />
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function Tick() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={FC.brz} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12.5l5 5L20 6.5" />
    </Svg>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  textAction: { height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  textActionLabel: { fontSize: 14, fontWeight: '600', color: FC.ink2 },
  textActionOn: { fontSize: 14, fontWeight: '600', color: FC.ink },
  body: { paddingHorizontal: 20, gap: 22 },
  head: { gap: 6 },
  h2: { fontFamily: flFont.display, fontSize: 32, lineHeight: 36, fontWeight: '600', color: FC.ink },
  meta: { fontSize: 13, color: FC.ink3 },
  group: { gap: 8 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 2, color: FC.ink3 },
  dates: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1, borderColor: FC.chipBd, backgroundColor: FC.chip },
  chipOn: { backgroundColor: FC.tint },
  chipText: { fontSize: 13, color: FC.ink },
  chipTextOn: { fontWeight: '600' },
  pair: { flexDirection: 'row', gap: 10 },
  pairCol: { flex: 1, gap: 8 },
  pairDate: { fontSize: 13, fontWeight: '600', color: FC.ink },
  pairNote: { fontSize: 12.5, lineHeight: 18, color: FC.ink3 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 12, borderTopWidth: 1, borderTopColor: FC.line },
  dotCol: { width: 16, alignItems: 'center', paddingTop: 6 },
  tlDot: { width: 7, height: 7, borderRadius: 4 },
  thumb: { width: 50, height: 62, borderRadius: 7, overflow: 'hidden' },
  rowText: { flex: 1, minWidth: 0, gap: 6 },
  rowDate: { fontSize: 12, fontWeight: '600', color: FC.ink3 },
  rowFix: { fontSize: 14, lineHeight: 19, color: FC.ink },
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: FC.chipBd,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: FC.ink2,
    overflow: 'hidden',
  },
  tagBetter: { backgroundColor: FC.tint, color: FC.brz },
  emptyMid: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  fullRoot: { flex: 1, backgroundColor: '#050505' },
  fullBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8 },
  fullTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(240,237,232,0.8)' },
  fullFrame: { flex: 1, marginVertical: 8 },
  fullSays: { paddingTop: 10, paddingHorizontal: 20 },
});
