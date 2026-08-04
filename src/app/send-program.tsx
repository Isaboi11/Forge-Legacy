import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchProgram, type SavedProgram } from '@/data/programs-live';
import { fetchFriendLists, type FriendSummary } from '@/data/friends-live';
import { fetchMySquads, fetchSquad, type SquadSummary } from '@/data/squad-live';
import { shareProgram } from '@/data/program-shares-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';

/**
 * Send Program — hand the PLAN to someone, not a picture of it.
 *
 * The other share (SH-1's card, from Program Detail's "Share Card") posts a keepsake to a feed. This
 * writes a copy of the program into another athlete's library. Two different acts under one word in
 * most apps; two buttons with two verbs here, because the blast radius is completely different.
 *
 * ── A SNAPSHOT, AND THE SCREEN SAYS SO ────────────────────────────────────────────────────────────────
 * What is sent is a frozen copy. Editing this program tomorrow will not change theirs, and deleting it
 * will not take theirs away. That is stated on the screen rather than left as a surprise — an athlete
 * who thinks they are sharing a LIVE plan will keep editing and wonder why nobody sees it.
 *
 * ── WHO CAN BE SENT TO ────────────────────────────────────────────────────────────────────────────────
 * Friends and squad-mates. There is no send-by-handle, deliberately: that would be an unsolicited
 * payload from a stranger, which is the shape of contact SOC-D15's discovery rules exist to prevent.
 * The server enforces the same rule (`can_receive_program_from`), so this list is a convenience, not the
 * gate.
 *
 * ── THE COUNT IS REPORTED, NOT ASSUMED ────────────────────────────────────────────────────────────────
 * `share_program` returns how many rows it actually wrote, and the toast says that number. A recipient
 * who already had this offer pending is skipped server-side, so "Sent to 11 athletes" after selecting a
 * squad of twelve is the truth and gets said out loud.
 */

type Recipients = { friends: FriendSummary[]; squads: SquadSummary[] };

export default function SendProgramScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();

  const [program, setProgram] = useState<SavedProgram | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [squadPicked, setSquadPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const { data, loading } = useQuery(async (): Promise<Recipients> => {
    const [lists, squads] = await Promise.all([fetchFriendLists(), fetchMySquads()]);
    return { friends: lists.friends, squads };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchProgram(String(id)).then(
      (p) => alive && setProgram(p),
      (e: unknown) => alive && setLoadError(errorMessage(e)),
    );
    return () => {
      alive = false;
    };
  }, [id]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/workouts'));

  const friends = data?.friends ?? [];
  const squads = data?.squads ?? [];
  const total = picked.size + squadPicked.size;

  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  const send = async () => {
    if (!program || sending || total === 0) return;
    setSending(true);
    try {
      /**
       * A squad resolves to its members HERE rather than server-side, so the recipient list the athlete
       * confirmed is the recipient list that gets written. Self is filtered out — you are a member of
       * your own squad, and the table refuses a self-send anyway; dropping it here means the reported
       * count matches what was asked for instead of being one short with no explanation.
       */
      const ids = new Set(picked);
      for (const sq of squadPicked) {
        const detail = await fetchSquad(sq);
        for (const m of detail?.members ?? []) if (!m.isSelf) ids.add(m.id);
      }
      if (!ids.size) {
        showToast('Nobody to send to');
        return;
      }
      const n = await shareProgram([...ids], program.name, program.structure, program.sourceDefinitionId);
      if (n === 0) showToast('They already have this program waiting');
      else showToast(n === 1 ? 'Program sent' : `Program sent to ${n} athletes`);
      if (n > 0) goBack();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      <AppBar title={<Text style={styles.barTitle}>Send Program</Text>} onBack={goBack} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loadError ? (
          <Text style={styles.error}>{loadError}</Text>
        ) : (
          <View style={styles.programCard}>
            <Text style={styles.programEyebrow}>Sending</Text>
            <Text style={styles.programName} numberOfLines={2}>
              {program?.name ?? '…'}
            </Text>
            {program ? (
              <Text style={styles.programMeta}>
                {program.structure.weeks} weeks • {program.structure.daysPerWeek}{' '}
                {program.structure.daysPerWeek === 1 ? 'day' : 'days'} / week
              </Text>
            ) : null}
          </View>
        )}

        <Text style={styles.note}>
          They get their own copy to run. Editing or deleting your program later won’t change theirs.
        </Text>

        {loading && !data ? (
          <View style={styles.loading}>
            <ActivityIndicator color={flColor.bronze400} />
          </View>
        ) : null}

        {squads.length ? (
          <Section label="Your Squads">
            {squads.map((s) => (
              <Row
                key={s.id}
                name={s.name}
                sub={`${s.memberCount} ${s.memberCount === 1 ? 'member' : 'members'}`}
                on={squadPicked.has(s.id)}
                onPress={() => toggle(squadPicked, s.id, setSquadPicked)}
              />
            ))}
          </Section>
        ) : null}

        {friends.length ? (
          <Section label="Friends">
            {friends.map((f) => (
              <Row
                key={f.id}
                name={f.name}
                sub={f.handle ? `@${f.handle}` : ''}
                avatarUrl={f.avatarUrl}
                on={picked.has(f.id)}
                onPress={() => toggle(picked, f.id, setPicked)}
              />
            ))}
          </Section>
        ) : null}

        {!loading && !friends.length && !squads.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              A program can only be sent to a friend or a squad-mate. You don’t have either yet.
            </Text>
            <Pressable onPress={() => router.push('/add-friend')} accessibilityRole="button" style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Add a Friend</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.cta}>
        <Button
          variant="primary"
          fullWidth
          disabled={total === 0 || sending || !program}
          onPress={send}
          accessibilityLabel="Send this program"
        >
          {sending ? 'Sending…' : total === 0 ? 'Choose who to send it to' : `Send to ${total} ${total === 1 ? 'recipient' : 'recipients'}`}
        </Button>
      </View>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  name,
  sub,
  avatarUrl,
  on,
  onPress,
}: {
  name: string;
  sub: string;
  avatarUrl?: string | null;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={name}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <Avatar src={avatarUrl ?? undefined} name={name} size={34} />
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {name}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View style={[styles.check, on ? styles.checkOn : null]}>
        {on ? (
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 13l4.5 4.5L19 7" />
          </Svg>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.85 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },

  programCard: { padding: 16, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  programEyebrow: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  programName: { marginTop: 6, fontSize: 20, fontWeight: '700', color: flColor.cream100 },
  programMeta: { marginTop: 4, fontSize: 12, color: flColor.gray400 },

  note: { marginTop: 14, fontSize: 12, lineHeight: 18, color: flColor.gray600 },
  error: { fontSize: 13, color: '#A97E68' },

  section: { marginTop: 24 },
  sectionLabel: { marginBottom: 10, paddingHorizontal: 2, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  card: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: flColor.charcoal700 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowSub: { marginTop: 1, fontSize: 11, color: flColor.gray600 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  checkOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },

  loading: { paddingVertical: 30, alignItems: 'center' },
  empty: { marginTop: 26, paddingVertical: 26, paddingHorizontal: 18, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600, alignItems: 'center' },
  emptyText: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', color: flColor.gray600 },
  emptyBtn: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 9, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  emptyBtnText: { fontSize: 12, fontWeight: '700', color: flColor.bronze300 },

  cta: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
});
