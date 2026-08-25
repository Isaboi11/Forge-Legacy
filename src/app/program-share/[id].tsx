import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { acceptProgramShare, dismissProgramShare, fetchProgramShare } from '@/data/program-shares-live';
import { equipmentOf } from '@/domain/program/progress-core';
import { deriveBlocks, plannedSetCount, schemeText } from '@/domain/program/prescription';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { equipmentLabel } from '@/components/forge/EquipIcon';

/**
 * A program someone sent you (migration 0110) — read it before you take it.
 *
 * ── YOU SEE THE WHOLE THING FIRST ─────────────────────────────────────────────────────────────────────
 * Accepting writes a program into your library, so the screen shows what is actually in it — every day,
 * every exercise, every prescription — rather than a name and a set of buttons. A "12 exercises" summary
 * would be asking somebody to take delivery of training they have not read.
 *
 * The prescriptions render through the SAME `schemeText` / `deriveBlocks` the logger and Program Detail
 * use, so a ladder shows as `6-6-4-4` and an AMRAP shows its clock here exactly as it will when trained.
 * A preview that summarised differently from the real screen would be its own small lie.
 *
 * ── DECLINE ERASES ────────────────────────────────────────────────────────────────────────────────────
 * Declining deletes the row. The sender is not told, and afterwards it is indistinguishable from never
 * having been sent — the same rule as a declined friend request (0073). So the confirm copy says
 * "they won't be told", because silently informing someone is worse than either honest option.
 *
 * ── ACCEPTING DOES NOT START IT ───────────────────────────────────────────────────────────────────────
 * The copy lands in `future` state. Taking a program and committing to it are separate decisions, and
 * auto-starting would end whatever the athlete is currently running (`start_program` is exclusive).
 */

export default function ProgramShareScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const { data, loading, error } = useQuery(() => fetchProgramShare(String(id)), [id]);

  const guard = usePremiumGate();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/inbox'));

  const accept = async () => {
    if (busy || !data) return;
    /*
     * ⚠ THE GATE IS HERE, ON THE RECIPIENT'S DEVICE, AND NOWHERE ELSE (MA3-D10 · M7-D17).
     *
     * A received program consumes one of the recipient's three lifetime slots — it is a program, and the
     * sender's generosity is not the recipient's exemption. **Sending stays free** (MA3-D13): gating the
     * sender would tax the one acquisition surface that costs nothing to run.
     *
     * Pre-action means BEFORE the RPC, so a refusal leaves the offer intact and still visible — M-7's
     * navigation map says the invitation remains, simply unacceptable, which is only true if nothing was
     * consumed on the way to being refused.
     */
    if (!guard('programs')) return;
    setBusy(true);
    try {
      const newId = await acceptProgramShare(data.id);
      showToast(`“${data.name}” is in your programs`);
      router.replace({ pathname: '/program/[id]', params: { id: newId } });
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  const decline = async () => {
    if (busy || !data) return;
    setBusy(true);
    try {
      await dismissProgramShare(data.id);
      showToast('Declined');
      goBack();
    } catch (e) {
      showToast(errorMessage(e));
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate2} base="#050505" />
        <AppBar title="" onBack={goBack} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  // Withdrawn, declined, or already gone. Named honestly — there is no row to explain further, by design.
  if (!data) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate2} base="#050505" />
        <AppBar title="Program" onBack={goBack} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>This program isn’t being shared any more.</Text>
          <Text style={styles.emptyBody}>{error ?? 'It may have been withdrawn.'}</Text>
        </View>
      </View>
    );
  }

  const { structure } = data;
  const equipment = equipmentOf(structure);
  const taken = data.status === 'ACCEPTED';

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      <AppBar title="Shared Program" onBack={goBack} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.from}>
          <Avatar src={data.fromAvatarUrl ?? undefined} name={data.fromName} size={40} />
          <View style={styles.fromText}>
            <Text style={styles.fromName} numberOfLines={1}>
              {data.fromName} sent you a program
            </Text>
            {data.fromHandle ? <Text style={styles.fromHandle}>@{data.fromHandle}</Text> : null}
          </View>
        </View>

        <Text style={styles.title}>{data.name}</Text>
        <Text style={styles.meta}>
          {structure.weeks} weeks • {structure.daysPerWeek} {structure.daysPerWeek === 1 ? 'day' : 'days'} / week
          {structure.vary ? ' • per-week plan' : ''}
        </Text>

        {equipment.length ? (
          <View style={styles.equipRow}>
            {equipment.map((e) => (
              <View key={e} style={styles.equipPill}>
                <Text style={styles.equipText}>{equipmentLabel(e)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {taken ? (
          <View style={styles.takenBanner}>
            <Text style={styles.takenText}>You’ve already taken this one. It’s in your programs.</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>What’s in it</Text>
        <Text style={styles.sectionSub}>
          {structure.vary
            ? 'The prescriptions change between weeks — this is week one.'
            : 'The same week repeats for the length of the program.'}
        </Text>

        <View style={styles.days}>
          {structure.days.map((d, i) => {
            const key = `${d.letter}-${i}`;
            const items = [...d.warmup, ...d.main, ...d.cooldown];
            const open = openDay === key;
            return (
              <View key={key} style={styles.dayCard}>
                <Pressable
                  onPress={() => setOpenDay(open ? null : key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={`Day ${d.letter}, ${d.name}`}
                  style={({ pressed }) => [styles.dayHead, pressed ? styles.pressed : null]}
                >
                  <View style={styles.dayLetter}>
                    <Text style={styles.dayLetterText}>{d.letter}</Text>
                  </View>
                  <View style={styles.dayText}>
                    <Text style={styles.dayName} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text style={styles.daySub}>
                      {items.length} {items.length === 1 ? 'exercise' : 'exercises'} · {plannedSetCount(d.main)} sets
                    </Text>
                  </View>
                  <Text style={styles.dayChevron}>{open ? '−' : '+'}</Text>
                </Pressable>

                {open ? (
                  <View style={styles.dayBody}>
                    {(['warmup', 'main', 'cooldown'] as const).map((sec) =>
                      d[sec].length ? (
                        <View key={sec} style={styles.secBlock}>
                          <Text style={styles.secLabel}>{sec === 'warmup' ? 'Warm-Up' : sec === 'main' ? 'Main' : 'Cool-Down'}</Text>
                          {deriveBlocks(d[sec]).map((block, bi) => (
                            <View key={`${sec}-${bi}`} style={block.groupId ? styles.circuit : undefined}>
                              {block.groupId ? (
                                <View style={styles.circuitHead}>
                                  <Text style={styles.circuitName}>{block.name ?? 'Circuit'}</Text>
                                  <Text style={styles.circuitRounds}>
                                    {block.capSec ? `${Math.round(block.capSec / 60)} min AMRAP` : `${block.rounds ?? 1} rounds`}
                                  </Text>
                                </View>
                              ) : null}
                              {block.items.map((ex, xi) => (
                                <View key={`${sec}-${bi}-${xi}`} style={styles.exRow}>
                                  <Text style={styles.exName} numberOfLines={1}>
                                    {ex.name}
                                  </Text>
                                  <Text style={styles.exScheme}>{schemeText(ex)}</Text>
                                </View>
                              ))}
                            </View>
                          ))}
                        </View>
                      ) : null,
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <Button variant="primary" fullWidth disabled={busy || taken} onPress={accept} accessibilityLabel="Add this program to yours">
          {taken ? 'Already in your programs' : busy ? 'Adding…' : 'Add to My Programs'}
        </Button>
        <Text style={styles.ctaNote}>Adding it doesn’t start it — it waits in your programs until you do.</Text>
        {taken ? null : (
          <Pressable onPress={decline} disabled={busy} accessibilityRole="button" accessibilityLabel="Decline this program" style={styles.declineBtn}>
            <Text style={styles.declineText}>Decline — they won’t be told</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.85 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', color: flColor.cream100 },
  emptyBody: { fontSize: 13, textAlign: 'center', color: flColor.gray600 },

  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28 },
  from: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  fromText: { flex: 1, minWidth: 0 },
  fromName: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  fromHandle: { marginTop: 1, fontSize: 11, color: flColor.gray600 },

  title: { marginTop: 10, fontSize: 26, fontWeight: '700', color: flColor.cream100 },
  meta: { marginTop: 5, fontSize: 12.5, color: flColor.gray400 },

  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  equipPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  equipText: { fontSize: 10.5, fontWeight: '600', color: flColor.gray400 },

  takenBanner: { marginTop: 16, padding: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  takenText: { fontSize: 12, color: flColor.bronze300 },

  sectionLabel: { marginTop: 26, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionSub: { marginTop: 5, marginBottom: 12, fontSize: 12, lineHeight: 17, color: flColor.gray600 },

  days: { gap: 10 },
  dayCard: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, overflow: 'hidden' },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 12 },
  dayLetter: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  dayLetterText: { fontSize: 12, fontWeight: '700', color: flColor.bronze300 },
  dayText: { flex: 1, minWidth: 0 },
  dayName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  daySub: { marginTop: 1, fontSize: 11, color: flColor.gray600 },
  dayChevron: { fontSize: 18, color: flColor.gray600, paddingHorizontal: 4 },

  dayBody: { paddingHorizontal: 13, paddingBottom: 12, gap: 12 },
  secBlock: { gap: 6 },
  secLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  circuit: { borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, paddingHorizontal: 9, paddingVertical: 7, gap: 3 },
  circuitHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  circuitName: { flex: 1, fontSize: 11, fontWeight: '700', color: flColor.bronze400 },
  circuitRounds: { fontSize: 10.5, fontWeight: '600', color: flColor.bronze300 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  exName: { flex: 1, minWidth: 0, fontSize: 13, color: flColor.cream100 },
  exScheme: { fontSize: 12, fontWeight: '600', color: flColor.gray400, fontVariant: ['tabular-nums'] },

  cta: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 26, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  ctaNote: { marginTop: 9, fontSize: 11, textAlign: 'center', color: flColor.gray600 },
  declineBtn: { marginTop: 12, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  declineText: { fontSize: 12, color: flColor.gray600 },
});
