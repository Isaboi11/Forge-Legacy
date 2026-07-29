import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { fetchSquad, transferSquadOwnership } from '@/data/squad-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Transfer Ownership — built to `Squad Transfer Ownership.dc.html`, wired to real data. Owner picks another
 * member; a confirm ceremony then runs the atomic `transfer_squad_ownership` RPC (0047): the caller becomes a
 * member, the pick becomes owner, `owner_id` moves. After it lands, the caller is no longer owner → returns
 * to the squad (now the member view). Owner-only.
 */

const tenureLabel = (joinedAt: string | null): string => {
  if (!joinedAt) return 'Member';
  const then = new Date(joinedAt).getTime();
  if (!Number.isFinite(then)) return 'Member';
  const months = Math.floor((Date.now() - then) / (30 * 86400000));
  if (months < 1) return 'New member';
  if (months < 12) return `Member ${months} mo`;
  return `Member ${Math.floor(months / 12)} yr`;
};

export default function SquadTransferRoute() {
  const { id, member } = useLocalSearchParams<{ id: string; member?: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const squadId = String(id ?? '');
  const { data, loading } = useQuery(() => fetchSquad(squadId), [squadId]);
  const squad = data?.squad;
  const members = data?.members ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(member ? String(member) : null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const backToSquad = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/squad/[id]', params: { id: squadId } }));

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <TransferBg />
        <AppBar title="Transfer Ownership" serif onBack={backToSquad} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }
  if (!squad || !squad.isOwner) {
    return (
      <View style={styles.root}>
        <TransferBg />
        <AppBar title="Transfer Ownership" serif onBack={backToSquad} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>{squad ? 'Only the owner can transfer this squad.' : 'This squad isn’t available.'}</Text>
        </View>
      </View>
    );
  }

  const eligible = members.filter((m) => m.role !== 'owner');
  const selected = eligible.find((m) => m.id === selectedId) ?? null;
  const firstName = selected ? selected.name.split(' ')[0] : '';

  const doTransfer = () => {
    if (!selected || transferring) return;
    setTransferring(true);
    transferSquadOwnership(squad.id, selected.id).then(
      () => {
        showToast(`${selected.name} is now the owner`);
        router.replace({ pathname: '/squad/[id]', params: { id: squad.id } });
      },
      (e: unknown) => {
        setTransferring(false);
        setConfirmOpen(false);
        showToast(errorMessage(e));
      },
    );
  };

  return (
    <View style={styles.root}>
      <TransferBg />
      <AppBar title="Transfer Ownership" serif onBack={backToSquad} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <View style={styles.headerCrest}>
            {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.headerCrestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={30} />}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {squad.name}
            </Text>
            <Text style={styles.headerMeta}>
              {squad.privacy === 'public' ? 'Public' : 'Private'} · {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </Text>
          </View>
        </View>

        {/* what happens */}
        <View style={styles.factsCard}>
          <Fact icon={<CrownGlyph />} text="The new owner gains full control — identity, members, and settings." />
          <Fact icon={<PeopleGlyph />} text="You stay in the squad as a regular member and keep your history." divided />
          <Fact icon={<ShieldGlyph />} text="Only the new owner can transfer ownership back to you." divided />
        </View>

        {/* choose */}
        <Text style={styles.sectionLabel}>Choose New Owner</Text>
        {eligible.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>There’s no one to transfer to yet. Invite a member first, then you can hand over the squad.</Text>
          </View>
        ) : (
          <View style={styles.memberList}>
            {eligible.map((m) => {
              const on = selectedId === m.id;
              return (
                <Pressable key={m.id} onPress={() => setSelectedId(on ? null : m.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.memberRow, on ? styles.memberRowOn : styles.memberRowOff]}>
                  <Avatar src={m.avatarUrl ?? undefined} name={m.name} size="listRow" />
                  <View style={styles.memberText}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <View style={styles.tenureRow}>
                      <ClockGlyph />
                      <Text style={styles.tenure}>{tenureLabel(m.joinedAt)}</Text>
                    </View>
                  </View>
                  <View style={[styles.radio, on ? styles.radioOn : styles.radioOff]}>{on ? <View style={styles.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.commitBar}>
        <Pressable onPress={() => (selected ? setConfirmOpen(true) : undefined)} disabled={!selected} accessibilityRole="button" accessibilityLabel={selected ? `Transfer to ${firstName}` : 'Select a new owner'} style={[styles.commit, selected ? styles.commitOn : styles.commitOff]}>
          <CrownGlyph color={selected ? flColor.bronze300 : flColor.gray600} />
          <Text style={[styles.commitText, selected ? styles.commitTextOn : styles.commitTextOff]}>{selected ? `Transfer to ${firstName}` : 'Select a New Owner'}</Text>
        </Pressable>
      </View>

      <Modal visible={confirmOpen && !!selected} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmCrown}>
              <CrownGlyph color={flColor.bronze300} size={24} />
            </View>
            <Text style={styles.confirmTitle}>Make {firstName} the owner?</Text>
            <Text style={styles.confirmBody}>
              {selected?.name} will gain full control of {squad.name}. You’ll remain a member but lose owner privileges. Only they can transfer it back.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={doTransfer} disabled={transferring} accessibilityRole="button" accessibilityLabel="Transfer ownership" style={styles.confirmPrimary}>
                <CrownGlyph color={flColor.bronze300} size={16} />
                <Text style={styles.confirmPrimaryText}>{transferring ? 'Transferring…' : 'Transfer Ownership'}</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TransferBg() {
  return <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.3)' }} />;
}

function Fact({ icon, text, divided = false }: { icon: React.ReactNode; text: string; divided?: boolean }) {
  return (
    <View style={[styles.fact, divided ? styles.factDivided : null]}>
      <View style={styles.factIcon}>{icon}</View>
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

// ── glyphs ──
function CrownGlyph({ color = flColor.bronze300, size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function PeopleGlyph() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
      <Path d="M16 5.3a3.2 3.2 0 0 1 0 5.4M18.2 19a5.6 5.6 0 0 0-3-4.9" />
    </Svg>
  );
}
function ShieldGlyph() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </Svg>
  );
}
function ClockGlyph() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7v5l3.5 2" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  missingTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2 },
  headerCrest: { width: 42, height: 42, flexShrink: 0, borderRadius: flRadius.round, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.charcoal900, boxShadow: `0 0 0 2px ${flColor.bronze400}, 0 4px 12px rgba(0,0,0,0.55), 0 0 10px rgba(191,143,79,0.2)` },
  headerCrestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerName: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  headerMeta: { fontSize: 11.5, letterSpacing: 0.3, color: flColor.gray600 },

  factsCard: { marginTop: 20, backgroundColor: flColor.surfaceRecessed, borderWidth: 1, borderColor: flColor.charcoal700, borderRadius: flRadius.lg, paddingHorizontal: 15 },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13 },
  factDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  factIcon: { width: 30, height: 30, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  factText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 19, color: flColor.gray400 },

  sectionLabel: { marginTop: 26, marginBottom: 12, marginLeft: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  emptyCard: { padding: 18, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900 },
  emptyText: { fontSize: 13, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },

  memberList: { gap: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 13, borderRadius: flRadius.lg, borderWidth: 1, boxShadow: flShadow.card },
  memberRowOff: { backgroundColor: flColor.charcoal800, borderColor: flColor.bronzeBorderSubtle },
  memberRowOn: { backgroundColor: '#171009', borderColor: flColor.bronzeBorder },
  memberText: { flex: 1, minWidth: 0, gap: 3 },
  memberName: { fontSize: 15.5, fontWeight: '500', color: flColor.cream100 },
  tenureRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tenure: { fontSize: 11.5, color: flColor.gray600 },
  radio: { width: 22, height: 22, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  radioOff: { borderColor: flColor.charcoal500 },
  radioOn: { borderColor: flColor.bronze400, boxShadow: flShadow.glowSubtle },
  radioDot: { width: 11, height: 11, borderRadius: flRadius.round, backgroundColor: flColor.bronze300 },

  commitBar: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: 'rgba(9,9,9,0.6)' },
  commit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1 },
  commitOn: { borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A', boxShadow: flShadow.glowSubtle },
  commitOff: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  commitText: { fontSize: 15, fontWeight: '600' },
  commitTextOn: { color: flColor.bronze300 },
  commitTextOff: { color: flColor.gray600 },

  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: flColor.overlayDark },
  confirmCard: { width: '100%', maxWidth: 328, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, padding: 24, boxShadow: flShadow.ambient },
  confirmCrown: { alignSelf: 'center', width: 52, height: 52, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorder, marginBottom: 15, boxShadow: flShadow.glowSubtle },
  confirmTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  confirmBody: { fontSize: 13.5, lineHeight: 21, color: flColor.gray400, textAlign: 'center', marginTop: 11 },
  confirmActions: { gap: 10, marginTop: 22 },
  confirmPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A', boxShadow: flShadow.glowSubtle },
  confirmPrimaryText: { fontSize: 14.5, fontWeight: '600', color: flColor.bronze300 },
  confirmCancel: { paddingVertical: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center' },
  confirmCancelText: { fontSize: 14.5, fontWeight: '600', color: flColor.gray400 },
});
