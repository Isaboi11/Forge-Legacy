import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ForgeTextArea } from '@/components/forge/inputs/ForgeTextArea';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { ReportSheet } from '@/components/ReportSheet';
import {
  DEFAULT_SQUAD_NOTIF,
  deleteSquad,
  fetchSquad,
  fetchSquadTrainingAlerts,
  getSquadNotifPrefs,
  leaveSquad,
  setMyTrainingAlerts,
  setSquadNotifPrefs,
  setSquadTrainingAlerts,
  updateSquad,
  fetchWeeklyStandard,
  uploadSquadPhoto,
  type SquadDetail,
  type SquadMemberView,
  type SquadNotifPrefs,
  type SquadPrivacy,
  type SquadTrainingAlerts,
} from '@/data/squad-live';
import { SQUAD_CATEGORIES, fetchPendingRequestCount, fetchSquadDiscovery, updateSquadDiscovery, type SquadCategory } from '@/data/squad-discover-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import { usePersist } from '@/hooks/usePersist';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Settings — owner management. Built to `Squad Settings.dc.html`, scoped to Squad Core.
 *
 * Real, design-faithful: the squad header, the Identity card (tap → Edit Identity sheet: photo · name · motto
 * · description → `updateSquad` + `uploadSquadPhoto`, name ≥2 validated), a live-saving Privacy segmented
 * control, and the Danger Zone type-DELETE ceremony → `deleteSquad`. Omitted (no backend — later Social
 * parts): Membership, Permissions, Notifications, Advanced (invite code / share / transfer). The squad goal
 * is a measurable target managed on Squad Detail, not here (so the two can't disagree).
 */

const NAME_MAX = 28;
const MOTTO_MAX = 40;
const DESC_MAX = 140;
/** SQ-D14 §2 deferred the cap to S-3 implementation; 200 fits a short list or short paragraph. */
const COMMITMENT_MAX = 200;

const PRIVACY_HINT: Record<SquadPrivacy, string> = {
  private: 'Invite-only and hidden from search. Members join through invitations or approval.',
  public: 'Visible to everyone. Athletes can discover your squad and request to join — you approve each one.',
};

export default function SquadSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const squadId = String(id ?? '');
  const { data, loading, refetch } = useQuery(() => fetchSquad(squadId), [squadId]);
  const squad = data?.squad;
  const { showToast } = useToast();
  const { pick, mediaPickerSheet } = useMediaPicker();

  // Discovery (0050) is read SEPARATELY from `fetchSquad` so the whole screen doesn't fail on a database
  // where the migration hasn't been applied — `null` just means the Discovery controls stay hidden.
  const { data: discovery, refetch: refetchDiscovery } = useQuery(() => fetchSquadDiscovery(squadId), [squadId]);
  const { data: pendingCount } = useQuery(() => fetchPendingRequestCount(squadId), [squadId]);
  // Same reason as Discovery above: read separately, and `null` (0099 not applied) hides the control
  // rather than taking the screen down on a missing column.
  const { data: standard, refetch: refetchStandard } = useQuery(() => fetchWeeklyStandard(squadId), [squadId]);

  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftMotto, setDraftMotto] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftCategory, setDraftCategory] = useState<SquadCategory | null>(null);
  const [draftCommitment, setDraftCommitment] = useState('');
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | null>(null);
  const [draftPhotoCleared, setDraftPhotoCleared] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [privacyOverride, setPrivacyOverride] = useState<SquadPrivacy | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [invitePermOverride, setInvitePermOverride] = useState<'owner' | 'members' | null>(null);
  const [savingInvitePerm, setSavingInvitePerm] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const backToSquad = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/squad/[id]', params: { id: squadId } }));

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar title="Settings" serif onBack={backToSquad} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }
  if (!squad) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
        <AppBar title="Settings" serif onBack={backToSquad} />
        <View style={styles.center}>
          <Text style={styles.missingTitle}>This squad isn’t available.</Text>
          <Pressable onPress={backToSquad} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  // A non-owner sees the member view (read-only info · notifications · leave) — a permissions fork, not a lockout.
  if (!squad.isOwner) {
    return <MemberSettings squad={squad} members={data?.members ?? []} onBack={backToSquad} />;
  }

  const displayedPrivacy = privacyOverride ?? squad.privacy;
  const editPhoto = draftPhotoUri ?? (draftPhotoCleared ? null : squad.photoUrl);

  const openEdit = () => {
    setDraftName(squad.name);
    setDraftMotto(squad.motto ?? '');
    setDraftDesc(squad.description ?? '');
    setDraftCategory(discovery?.category ?? null);
    setDraftCommitment(discovery?.commitment ?? '');
    setDraftPhotoUri(null);
    setDraftPhotoCleared(false);
    setEditOpen(true);
  };

  const pickPhoto = async () => {
    const asset = await pick({ kind: 'images', title: 'Squad photo', allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (asset?.uri) {
      setDraftPhotoUri(asset.uri);
      setDraftPhotoCleared(false);
    }
  };

  const canSaveEdit = draftName.trim().length >= 2;
  const saveEdit = () => {
    if (!canSaveEdit || savingEdit) return;
    setSavingEdit(true);
    const run = async () => {
      const patch: Parameters<typeof updateSquad>[1] = { name: draftName, motto: draftMotto, description: draftDesc };
      if (draftPhotoUri) patch.photoUrl = await uploadSquadPhoto(squad.id, draftPhotoUri);
      else if (draftPhotoCleared) patch.photoUrl = null;
      await updateSquad(squad.id, patch);
      if (discovery) {
        const nextCommitment = draftCommitment.trim() || null;
        const patch: Parameters<typeof updateSquadDiscovery>[1] = {};
        if (draftCategory !== discovery.category) patch.category = draftCategory;
        if (nextCommitment !== discovery.commitment) patch.commitment = nextCommitment;
        if (Object.keys(patch).length) await updateSquadDiscovery(squad.id, patch);
      }
    };
    run().then(
      () => {
        setSavingEdit(false);
        setEditOpen(false);
        refetch();
        refetchDiscovery();
        showToast('Identity saved');
      },
      (e: unknown) => {
        setSavingEdit(false);
        showToast(e instanceof Error ? e.message : 'Couldn’t save changes.');
      },
    );
  };

  /** Move the squad's weekly bar. Clamped, saved, then re-read so the number on screen is the stored one. */
  const changeStandard = async (next: number) => {
    const n = Math.max(1, Math.min(7, next));
    if (n === standard) return;
    try {
      await updateSquad(squadId, { weeklyStandard: n });
      refetchStandard();
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const changePrivacy = (p: SquadPrivacy) => {
    if (p === displayedPrivacy || savingPrivacy) return;
    const prev = displayedPrivacy;
    setPrivacyOverride(p);
    setSavingPrivacy(true);
    updateSquad(squad.id, { privacy: p }).then(
      () => {
        setSavingPrivacy(false);
        refetch();
      },
      () => {
        setPrivacyOverride(prev);
        setSavingPrivacy(false);
        showToast('Couldn’t update privacy.');
      },
    );
  };

  const displayedInvitePerm = invitePermOverride ?? discovery?.invitePermission ?? 'owner';
  const changeInvitePerm = (v: 'owner' | 'members') => {
    if (v === displayedInvitePerm || savingInvitePerm) return;
    const prev = displayedInvitePerm;
    setInvitePermOverride(v);
    setSavingInvitePerm(true);
    updateSquadDiscovery(squad.id, { invitePermission: v }).then(
      () => {
        setSavingInvitePerm(false);
        refetchDiscovery();
      },
      () => {
        setInvitePermOverride(prev);
        setSavingInvitePerm(false);
        showToast('Couldn’t update permissions.');
      },
    );
  };

  const canDelete = deleteText.trim().toUpperCase() === 'DELETE';
  const doDelete = () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    deleteSquad(squad.id).then(
      () => router.replace('/(tabs)/squads'),
      (e: unknown) => {
        setDeleting(false);
        showToast(e instanceof Error ? e.message : 'Couldn’t delete the squad.');
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Settings" serif onBack={backToSquad} />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={styles.header}>
          <View style={styles.headerCrest}>
            {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.headerCrestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={30} />}
          </View>
          <Text style={styles.headerName}>{squad.name}</Text>
          <View style={styles.headerMetaRow}>
            <CrownGlyph />
            <Text style={styles.headerMeta}>Led by You · Owner</Text>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Identity */}
        <TourAnchor id="settings-identity">
          <Text style={styles.sectionLabel}>Identity</Text>
        </TourAnchor>
        <Pressable onPress={openEdit} accessibilityRole="button" accessibilityLabel="Edit identity" style={styles.identityCard}>
          <View style={styles.idField}>
            <Text style={styles.idLabel}>Squad Name</Text>
            <Text style={styles.idValue}>{squad.name}</Text>
          </View>
          <View style={[styles.idField, styles.idFieldDivided]}>
            <Text style={styles.idLabel}>Motto</Text>
            <Text style={[styles.idValue, !squad.motto && styles.idValueMuted]} numberOfLines={1}>
              {squad.motto || 'No motto yet.'}
            </Text>
          </View>
          <View style={[styles.idField, styles.idFieldDivided]}>
            <Text style={styles.idLabel}>Description</Text>
            <Text style={[styles.idValue, !squad.description && styles.idValueMuted]} numberOfLines={2}>
              {squad.description || 'No description yet.'}
            </Text>
          </View>
          {discovery ? (
            <View style={[styles.idField, styles.idFieldDivided]}>
              <Text style={styles.idLabel}>Commitment</Text>
              <Text style={[styles.idValue, !discovery.commitment && styles.idValueMuted]} numberOfLines={2}>
                {discovery.commitment ?? 'No commitment yet.'}
              </Text>
            </View>
          ) : null}
          {discovery ? (
            <View style={[styles.idField, styles.idFieldDivided]}>
              <Text style={styles.idLabel}>Category</Text>
              <Text style={[styles.idValue, !discovery.category && styles.idValueMuted]} numberOfLines={1}>
                {discovery.category ?? 'No category yet.'}
              </Text>
            </View>
          ) : null}
          <View style={styles.idChevron}>
            <ChevronMini />
          </View>
        </Pressable>

        {/* Privacy */}
        <TourAnchor id="settings-privacy">
          <Text style={styles.sectionLabel}>Privacy</Text>
        </TourAnchor>
        <View style={styles.card}>
          <Text style={styles.privacyLabel}>Squad Visibility</Text>
          <Text style={styles.privacyHint}>{PRIVACY_HINT[displayedPrivacy]}</Text>
          <View style={styles.segTrack}>
            {(['private', 'public'] as const).map((p) => {
              const on = displayedPrivacy === p;
              return (
                <Pressable key={p} onPress={() => changePrivacy(p)} accessibilityRole="button" accessibilityState={{ selected: on }} style={styles.segBtn}>
                  {on ? <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} /> : null}
                  <Text style={[styles.segLabel, on ? styles.segLabelOn : null]}>{p === 'private' ? 'Private' : 'Public'}</Text>
                </Pressable>
              );
            })}
          </View>

          {discovery && displayedPrivacy === 'public' ? (
            <View style={styles.joinBlock}>
              <Text style={styles.privacyLabel}>Joining</Text>
              <Text style={styles.privacyHint}>Athletes request to join and you approve each one, in Join Requests below.</Text>
              <Text style={styles.capHint}>Squads hold up to {discovery.memberCap} members.</Text>
            </View>
          ) : null}
        </View>

        {/* The squad's weekly standard — the bar a Perfect Week is measured against. */}
        {standard != null ? (
          <>
            <Text style={styles.sectionLabel}>Training Standard</Text>
            <View style={styles.card}>
              <Text style={styles.privacyLabel}>Days a week</Text>
              <Text style={styles.privacyHint}>
                Days a week every member trains. Rest days are part of training — this is the bar the squad agrees
                to clear, not the number of days in a week.
              </Text>
              <View style={styles.stdRow}>
                <Pressable
                  onPress={() => void changeStandard(standard - 1)}
                  disabled={standard <= 1}
                  accessibilityRole="button"
                  accessibilityLabel="Fewer days a week"
                  style={({ pressed }) => [styles.stdBtn, standard <= 1 ? styles.stdBtnOff : null, pressed ? styles.stdPressed : null]}
                >
                  <Text style={styles.stdGlyph}>−</Text>
                </Pressable>
                <View style={styles.stdValueWrap}>
                  <Text style={styles.stdValue}>{standard}</Text>
                  <Text style={styles.stdUnit}>{standard === 1 ? 'DAY' : 'DAYS'}</Text>
                </View>
                <Pressable
                  onPress={() => void changeStandard(standard + 1)}
                  disabled={standard >= 7}
                  accessibilityRole="button"
                  accessibilityLabel="More days a week"
                  style={({ pressed }) => [styles.stdBtn, standard >= 7 ? styles.stdBtnOff : null, pressed ? styles.stdPressed : null]}
                >
                  <Text style={styles.stdGlyph}>+</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {/* Permissions — the design's Who Can Invite control (0056) */}
        {discovery ? (
          <>
            <Text style={styles.sectionLabel}>Permissions</Text>
            <View style={styles.card}>
              <Text style={styles.privacyLabel}>Who Can Invite</Text>
              <Text style={styles.privacyHint}>Choose who may bring new athletes into the squad.</Text>
              <View style={styles.segTrack}>
                {([
                  { v: 'owner' as const, label: 'Owner Only' },
                  { v: 'members' as const, label: 'Any Member' },
                ]).map((o) => {
                  const on = displayedInvitePerm === o.v;
                  return (
                    <Pressable key={o.v} onPress={() => changeInvitePerm(o.v)} accessibilityRole="button" accessibilityState={{ selected: on }} style={styles.segBtn}>
                      {on ? <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} /> : null}
                      <Text style={[styles.segLabel, on ? styles.segLabelOn : null]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        {/* Training Alerts (0153) — the leader's gate, then the leader's own two toggles under it. */}
        <TrainingAlerts squadId={squad.id} isLeader />

        {/* Membership — the owner's join-request queue */}
        <TourAnchor id="settings-roster">
          <Text style={styles.sectionLabel}>Membership</Text>
        </TourAnchor>
        <Pressable onPress={() => router.push({ pathname: '/squad-requests', params: { id: squad.id } })} accessibilityRole="button" accessibilityLabel="Review join requests" style={styles.ownershipRow}>
          <View style={styles.ownershipIcon}>
            <InviteGlyph />
          </View>
          <View style={styles.ownershipText}>
            <Text style={styles.ownershipTitle}>Join Requests</Text>
            <Text style={styles.ownershipSub}>Review athletes asking to join.</Text>
          </View>
          {pendingCount ? (
            <View style={styles.requestBadge}>
              <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} />
              <Text style={styles.requestBadgeText}>{pendingCount}</Text>
            </View>
          ) : null}
          <ChevronMini />
        </Pressable>

        {/* Ownership */}
        <Text style={styles.sectionLabel}>Ownership</Text>
        <Pressable onPress={() => router.push({ pathname: '/squad-transfer', params: { id: squad.id } })} accessibilityRole="button" accessibilityLabel="Transfer ownership" style={styles.ownershipRow}>
          <View style={styles.ownershipIcon}>
            <CrownGlyph size={16} />
          </View>
          <View style={styles.ownershipText}>
            <Text style={styles.ownershipTitle}>Transfer Ownership</Text>
            <Text style={styles.ownershipSub}>Hand this squad to another member.</Text>
          </View>
          <ChevronMini />
        </Pressable>

        {/* Danger Zone */}
        <Text style={[styles.sectionLabel, styles.dangerLabel]}>Danger Zone</Text>
        <Pressable onPress={() => { setDeleteText(''); setDeleteOpen(true); }} accessibilityRole="button" accessibilityLabel="Delete squad" style={styles.dangerRow}>
          <View style={styles.dangerIcon}>
            <TrashGlyph />
          </View>
          <View style={styles.dangerText}>
            <Text style={styles.dangerTitle}>Delete Squad</Text>
            <Text style={styles.dangerSub}>Permanently remove this squad.</Text>
          </View>
          <ChevronMini />
        </Pressable>

        <Text style={styles.footer}>Forge Legacy</Text>
      </ScrollView>

      <ScreenTour screenKey="squad-settings" />

      {/* Edit Identity sheet */}
      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Identity"
        /* The longest body in the app — photo, name, motto, description, commitment, category chips. It
           runs past the sheet's 88% cap, and an unscrolled body cannot shrink, so the footer holding Save
           was pushed off the bottom of the screen. The identity was editable and unsaveable. */
        scroll
        footer={
          <View style={styles.sheetFooter}>
            <View style={styles.footerCancel}>
              <Button variant="secondary" fullWidth onPress={() => setEditOpen(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
            <View style={styles.footerSave}>
              <Button variant="primary" fullWidth disabled={!canSaveEdit || savingEdit} onPress={saveEdit} accessibilityLabel="Save changes">
                {savingEdit ? 'Saving…' : 'Save'}
              </Button>
            </View>
          </View>
        }
      >
        <View style={styles.sheetBody}>
          <View style={styles.editPhotoWrap}>
            <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={editPhoto ? 'Change squad photo' : 'Add squad photo'} style={styles.editPhotoDisc}>
              {editPhoto ? <Image source={{ uri: editPhoto }} style={styles.editPhotoImg} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={30} />}
            </Pressable>
            <View style={styles.editPhotoActions}>
              <Pressable onPress={pickPhoto} accessibilityRole="button" hitSlop={6}>
                <Text style={styles.editLink}>{editPhoto ? 'Change Photo' : 'Add Photo'}</Text>
              </Pressable>
              {editPhoto ? (
                <>
                  <Text style={styles.editDot}>·</Text>
                  <Pressable onPress={() => { setDraftPhotoUri(null); setDraftPhotoCleared(true); }} accessibilityRole="button" hitSlop={6}>
                    <Text style={styles.editLinkMuted}>Remove</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>

          <InputField label="Squad Name" value={draftName} onChange={setDraftName} maxLength={NAME_MAX} showCount placeholder="Squad name" autoCapitalize="words" />
          <InputField label="Motto" value={draftMotto} onChange={setDraftMotto} maxLength={MOTTO_MAX} showCount placeholder="A short rallying cry" />
          <View>
            <Text style={styles.faLabel}>Description</Text>
            <ForgeTextArea value={draftDesc} onChangeText={setDraftDesc} maxLength={DESC_MAX} minRows={3} placeholder="Tell athletes what this squad is about. (Optional)" fullWidth autoCorrect />
          </View>
          {discovery ? (
            <View>
              <Text style={styles.faLabel}>Commitment</Text>
              <ForgeTextArea
                value={draftCommitment}
                onChangeText={setDraftCommitment}
                maxLength={COMMITMENT_MAX}
                minRows={3}
                placeholder="Show up. Encourage others. Stay respectful. Train consistently."
                fullWidth
                autoCorrect
              />
              <Text style={styles.catHint}>What this squad asks of its members. Everyone joining sees this and accepts it. (Optional)</Text>
            </View>
          ) : null}
          {discovery ? (
            <View>
              <Text style={styles.faLabel}>Category</Text>
              <View style={styles.catRow}>
                {SQUAD_CATEGORIES.map((c) => {
                  const on = draftCategory === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setDraftCategory(on ? null : c)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${c} category`}
                      style={[styles.catChip, on ? styles.catChipOn : styles.catChipOff]}
                    >
                      {on ? <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} /> : null}
                      <Text style={[styles.catChipLabel, on ? styles.catChipLabelOn : null]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.catHint}>Where athletes find you in Discover. Optional — tap again to clear.</Text>
            </View>
          ) : null}
        </View>
      </BottomSheet>

      {/* Delete confirm — type DELETE (centered ceremony) */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmWarnDisc}>
              <TrashGlyph />
            </View>
            <Text style={styles.confirmTitle}>Delete {squad.name}?</Text>
            <Text style={styles.confirmBody}>This permanently removes {squad.name} and everything in it. This can’t be undone.</Text>
            <Text style={styles.confirmPrompt}>
              Type <Text style={styles.confirmWord}>DELETE</Text> to confirm
            </Text>
            <View style={styles.confirmInput}>
              <InputField value={deleteText} onChange={setDeleteText} placeholder="DELETE" autoCapitalize="characters" autoCorrect={false} />
            </View>
            <View style={styles.confirmActions}>
              <Button variant="destructive" fullWidth disabled={!canDelete || deleting} onPress={doDelete} accessibilityLabel="Delete squad forever">
                {deleting ? 'Deleting…' : 'Delete Squad Forever'}
              </Button>
              <Button variant="secondary" fullWidth onPress={() => setDeleteOpen(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {mediaPickerSheet}
    </View>
  );
}

// ── Member view (read-only settings · notifications · leave) ──
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonthYear = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function MemberSettings({ squad, members, onBack }: { squad: SquadDetail; members: SquadMemberView[]; onBack: () => void }) {
  const persist = usePersist();
  const router = useRouter();
  const { showToast } = useToast();
  const { data: prefsData } = useQuery(() => getSquadNotifPrefs(squad.id), [squad.id]);
  const [edits, setEdits] = useState<Partial<SquadNotifPrefs>>({});
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const prefs: SquadNotifPrefs = { ...DEFAULT_SQUAD_NOTIF, ...(prefsData ?? {}), ...edits };
  const setPref = (patch: Partial<SquadNotifPrefs>) => {
    const next = { ...prefs, ...patch };
    const before = edits;
    setEdits((e) => ({ ...e, ...patch }));
    persist(() => setSquadNotifPrefs(squad.id, next), { rollback: () => setEdits(before) });
  };

  const owner = members.find((m) => m.role === 'owner');
  const ownerLabel = owner ? (owner.isSelf ? 'You' : owner.name) : 'the owner';
  const joinedAt = members.find((m) => m.isSelf)?.joinedAt ?? null;
  const memberSince = joinedAt ? fmtMonthYear(joinedAt) : null;
  const goalProgress = squad.goalTarget != null ? `${Math.round(Math.min(squad.goalProgress, squad.goalTarget))} / ${squad.goalTarget}` : null;
  const hasIdentityAbove = !!squad.motto || !!squad.description;

  const doLeave = () => {
    if (leaving) return;
    setLeaving(true);
    leaveSquad(squad.id).then(
      () => {
        showToast(`You left ${squad.name}`);
        router.replace('/(tabs)/squads');
      },
      (e: unknown) => {
        setLeaving(false);
        showToast(errorMessage(e));
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Settings" serif onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <View style={styles.headerCrest}>
            {squad.photoUrl ? <Image source={{ uri: squad.photoUrl }} style={styles.headerCrestPhoto} contentFit="cover" /> : <SquadCrest crest={squad.crest} size={30} />}
          </View>
          <Text style={styles.headerName}>{squad.name}</Text>
          <View style={styles.headerMetaRow}>
            <CrownGlyph />
            <Text style={styles.headerMeta}>Led by {ownerLabel}</Text>
          </View>
          <Text style={styles.memberMeta}>
            {squad.privacy === 'public' ? 'Public' : 'Private'} · {members.length} {members.length === 1 ? 'Member' : 'Members'}
          </Text>
        </View>
        <View style={styles.divider} />

        {/* Squad Information (read-only) */}
        <Text style={styles.sectionLabel}>Squad Information</Text>
        <View style={styles.infoCard}>
          {squad.motto ? <InfoField label="Motto" value={squad.motto} /> : null}
          {squad.description ? <InfoField label="About" value={squad.description} divided={!!squad.motto} lines={3} /> : null}
          {squad.goal || squad.goalTarget != null ? (
            <View style={[styles.infoField, hasIdentityAbove ? styles.infoFieldDivided : null]}>
              <Text style={styles.infoLabel}>Current Goal</Text>
              <Text style={styles.infoValue}>{squad.goal || (squad.goalTarget != null ? `Reach ${squad.goalTarget}` : '—')}</Text>
              {goalProgress ? <Text style={styles.infoProgress}>{goalProgress}</Text> : null}
            </View>
          ) : null}
          <InfoRow icon={<ShieldGlyph />} label="Visibility" right={<VisibilityPill privacy={squad.privacy} />} divided={hasIdentityAbove || squad.goal != null || squad.goalTarget != null} />
          {memberSince ? <InfoRow icon={<CalendarGlyph />} label="Member Since" right={<Text style={styles.infoRowValue}>{memberSince}</Text>} divided /> : null}
        </View>

        {/* Training Alerts (0153) — real, server-read, and above the four device-local ones below. */}
        <TrainingAlerts squadId={squad.id} isLeader={false} />

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.notifCard}>
          <NotifRow icon={<BellGlyph />} title="Mute Squad" sub="Master switch — silences everything below." on={prefs.muted} onToggle={() => setPref({ muted: !prefs.muted })} />
          <NotifRow icon={<FlameGlyph />} title="New Check-ins" sub="When members post check-ins." on={!prefs.muted && prefs.checkins} dim={prefs.muted} divided onToggle={() => { if (!prefs.muted) setPref({ checkins: !prefs.checkins }); }} />
          <NotifRow icon={<SwordsGlyph />} title="Competition Updates" sub="Rank changes and results." on={!prefs.muted && prefs.competition} dim={prefs.muted} divided onToggle={() => { if (!prefs.muted) setPref({ competition: !prefs.competition }); }} />
          <NotifRow icon={<TargetGlyph />} title="Squad Milestones" sub="Goal and mission completions." on={!prefs.muted && prefs.milestones} dim={prefs.muted} divided onToggle={() => { if (!prefs.muted) setPref({ milestones: !prefs.milestones }); }} />
        </View>

        {/* Membership */}
        <Text style={styles.membershipLabel}>Membership</Text>
        {/*
          * ⚠ THIS ROW SHOWED A TOAST READING "Reporting a squad is coming soon" FROM ITS FIRST SHIP UNTIL
          * 2026-08-19, and it was the ONLY report control anywhere in the binary.
          *
          * App Store Guideline 1.2 requires reporting, blocking and filtering for any app carrying
          * user-generated content, and a "coming soon" toast is worse than no button at all: it
          * demonstrates, inside the shipped app, that the need was known and unmet. A reviewer who tapped
          * it would have found the finding for us. Now it opens the real sheet (0171).
          */}
        <Pressable onPress={() => setReportOpen(true)} accessibilityRole="button" accessibilityLabel="Report squad" style={styles.reportRow}>
          <View style={styles.reportIcon}>
            <FlagGlyph />
          </View>
          <Text style={styles.reportLabel}>Report Squad</Text>
          <ChevronMini />
        </Pressable>
        <Pressable onPress={() => setLeaveOpen(true)} accessibilityRole="button" accessibilityLabel="Leave squad" style={styles.leaveRow}>
          <View style={styles.leaveIcon}>
            <DoorGlyph />
          </View>
          <View style={styles.leaveText}>
            <Text style={styles.leaveTitle}>Leave Squad</Text>
            <Text style={styles.leaveSub}>Stop sharing progress with {squad.name}.</Text>
          </View>
          <ChevronMini />
        </Pressable>

        <Text style={styles.footer}>Forge Legacy</Text>
      </ScrollView>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="squad"
        targetId={squad.id}
        targetName={squad.name}
      />

      <Modal visible={leaveOpen} transparent animationType="fade" onRequestClose={() => setLeaveOpen(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.leaveWarnDisc}>
              <DoorGlyph />
            </View>
            <Text style={styles.confirmTitle}>Leave {squad.name}?</Text>
            <Text style={styles.confirmBody}>You’ll stop sharing progress with this squad. You can be invited back later.</Text>
            <View style={styles.confirmActions}>
              <Button variant="destructive" fullWidth disabled={leaving} onPress={doLeave} accessibilityLabel="Leave squad">
                {leaving ? 'Leaving…' : 'Leave Squad'}
              </Button>
              <Button variant="secondary" fullWidth onPress={() => setLeaveOpen(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoField({ label, value, divided = false, lines }: { label: string; value: string; divided?: boolean; lines?: number }) {
  return (
    <View style={[styles.infoField, divided ? styles.infoFieldDivided : null]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={lines}>
        {value}
      </Text>
    </View>
  );
}
function InfoRow({ icon, label, right, divided = false }: { icon: React.ReactNode; label: string; right: React.ReactNode; divided?: boolean }) {
  return (
    <View style={[styles.infoRow, divided ? styles.infoFieldDivided : null]}>
      <View style={styles.infoRowIcon}>{icon}</View>
      <Text style={styles.infoRowLabel}>{label}</Text>
      {right}
    </View>
  );
}
function VisibilityPill({ privacy }: { privacy: SquadPrivacy }) {
  return (
    <View style={styles.visPill}>
      {privacy === 'private' ? <LockGlyph /> : <GlobeMini />}
      <Text style={styles.visPillText}>{privacy === 'private' ? 'Private' : 'Public'}</Text>
    </View>
  );
}
function NotifRow({ icon, title, sub, on, dim = false, divided = false, onToggle }: { icon: React.ReactNode; title: string; sub: string; on: boolean; dim?: boolean; divided?: boolean; onToggle: () => void }) {
  return (
    <View style={[styles.notifRow, divided ? styles.notifRowDivided : null, dim ? styles.notifRowDim : null]}>
      <View style={styles.notifIcon}>{icon}</View>
      <View style={styles.notifText}>
        <Text style={styles.notifTitle}>{title}</Text>
        <Text style={styles.notifSub}>{sub}</Text>
      </View>
      <NotifSwitch on={on} disabled={dim} onToggle={onToggle} label={title} />
    </View>
  );
}
/**
 * Training Alerts (0153) — the ONE per-squad notification control the server actually reads.
 *
 * ══ WHY IT IS NOT A ROW IN THE NOTIFICATIONS CARD BELOW IT ══
 *
 * That card's four switches live in AsyncStorage and no server code has ever read one; "Mute Squad" is a
 * master switch over three toggles that govern nothing. Putting a REAL preference inside it would put a
 * working control under a mute that cannot mute it — the athlete would turn training alerts on, mute the
 * squad, and keep getting them. Its own card, with its own label, and deliberately not wired to `muted`.
 *
 * ══ THE LEADER'S SWITCH IS A GATE, SO IT IS DRAWN AS ONE ══
 *
 * `squads.training_alerts` off means `notify_start` and `notify_finish` produce nothing, so the two
 * personal rows are not rendered at all in that state — they would save correctly and change nothing,
 * which is the silent dead end this feature is most likely to be mistaken for. The member is told whose
 * decision it is instead.
 *
 * `null` from the fetch means 0153 has not been pasted into the SQL editor yet: the whole section
 * disappears rather than offering switches nothing is listening to. Same rule as Discovery and the
 * weekly standard above.
 */
function TrainingAlerts({ squadId, isLeader }: { squadId: string; isLeader: boolean }) {
  const persist = usePersist();
  const { data } = useQuery(() => fetchSquadTrainingAlerts(squadId), [squadId]);
  const [edits, setEdits] = useState<Partial<SquadTrainingAlerts>>({});

  if (!data) return null;

  const v: SquadTrainingAlerts = { ...data, ...edits };

  const setMine = (patch: { start?: boolean; finish?: boolean }) => {
    const next = { ...v, ...patch };
    const before = edits;
    setEdits((e) => ({ ...e, ...patch }));
    // `detail: true` — the RPC's own sentences say something useful ("0153 hasn't been applied", "you're
    // not a member of this squad"), and the generic couldn't-save line would throw both away.
    persist(() => setMyTrainingAlerts(squadId, next.start, next.finish), { rollback: () => setEdits(before), detail: true });
  };

  const setGate = (on: boolean) => {
    const before = edits;
    setEdits((e) => ({ ...e, squadOn: on }));
    persist(() => setSquadTrainingAlerts(squadId, on), { rollback: () => setEdits(before) });
  };

  return (
    <>
      <Text style={styles.sectionLabel}>Training Alerts</Text>
      <View style={styles.notifCard}>
        {isLeader ? (
          <NotifRow
            icon={<BellGlyph />}
            title="Announce Sessions"
            sub="Let this squad know when its members start and finish training."
            on={v.squadOn}
            onToggle={() => setGate(!v.squadOn)}
          />
        ) : null}

        {v.squadOn ? (
          <>
            <NotifRow
              icon={<FlameGlyph />}
              title="When someone starts"
              sub="So you can ask to join while they’re still training."
              on={v.start}
              divided={isLeader}
              onToggle={() => setMine({ start: !v.start })}
            />
            <NotifRow
              icon={<TargetGlyph />}
              title="When someone finishes"
              sub="A session logged in this squad."
              on={v.finish}
              divided
              onToggle={() => setMine({ finish: !v.finish })}
            />
          </>
        ) : (
          <View style={[styles.notifRow, isLeader ? styles.notifRowDivided : null]}>
            <Text style={styles.notifSub}>
              {isLeader ? 'Turn this on to choose which alerts you get.' : 'Your squad leader hasn’t turned these on.'}
            </Text>
          </View>
        )}
      </View>
      {/* The one gate on this feature that is nobody's setting on this screen, said out loud — otherwise
          it reads as a bug the first time somebody trains and nothing arrives. */}
      <Text style={styles.trainingAlertsFoot}>
        Anyone who keeps their training private in Privacy settings is never announced, whatever is switched on here.
      </Text>
    </>
  );
}
function NotifSwitch({ on, disabled = false, onToggle, label }: { on: boolean; disabled?: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable onPress={onToggle} disabled={disabled} accessibilityRole="switch" accessibilityState={{ checked: on, disabled }} accessibilityLabel={label} style={[styles.sw, on ? styles.swOn : styles.swOff]}>
      <View style={[styles.swKnob, on ? styles.swKnobOn : styles.swKnobOff]} />
    </Pressable>
  );
}

// ── glyphs ──
function CrownGlyph({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function ChevronMini() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}
function InviteGlyph({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
      <Path d="M18 7.5v5M20.5 10h-5" />
    </Svg>
  );
}
function TrashGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.redMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16" />
      <Path d="M9 7V5h6v2" />
      <Path d="M6.5 7l1 13h9l1-13" />
      <Path d="M10 11v6M14 11v6" />
    </Svg>
  );
}
function ShieldGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </Svg>
  );
}
function CalendarGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={5} width={16} height={16} rx={2} />
      <Path d="M4 9h16M8 3v4M16 3v4" />
    </Svg>
  );
}
function LockGlyph() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={5} y={11} width={14} height={9} rx={1.5} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}
function GlobeMini() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3.5 12h17M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </Svg>
  );
}
function BellGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}
function FlameGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}
function SwordsGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 4H20v5.5L9 20.5l-5.5-5.5z" />
      <Path d="M4 4h5.5L20 14.5V20h-5.5" />
    </Svg>
  );
}
function TargetGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8} />
      <Circle cx={12} cy={12} r={4.4} />
      <Circle cx={12} cy={12} r={1.2} />
    </Svg>
  );
}
function FlagGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 21V4" />
      <Path d="M6 5h11l-2 3 2 3H6" />
    </Svg>
  );
}
function DoorGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.redMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 4H6v16h8" />
      <Path d="M11 12h9M17 9l3 3-3 3" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },

  missingTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  backBtn: { marginTop: 6, paddingVertical: 10, paddingHorizontal: 22, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronze400 },
  backText: { fontSize: 14, fontWeight: '600', color: flColor.bronze400 },

  // header
  header: { alignItems: 'center', paddingTop: 6 },
  headerCrest: {
    width: 56,
    height: 56,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: flColor.bronze400,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
    boxShadow: flShadow.glowSubtle,
  },
  headerCrestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  headerName: { marginTop: 9, fontFamily: flFont.display, fontSize: 19, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  headerMeta: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  divider: { height: 1, backgroundColor: flColor.charcoal700, marginTop: 15 },

  // sections
  sectionLabel: { marginTop: 26, marginBottom: 12, marginLeft: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  dangerLabel: { marginTop: 44, color: flColor.redMuted },
  stdRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stdBtn: {
    width: 44,
    height: 44,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stdBtnOff: { opacity: 0.3 },
  stdPressed: { opacity: 0.65 },
  stdGlyph: { fontSize: 21, lineHeight: 24, color: flColor.bronze300 },
  stdValueWrap: { flex: 1, alignItems: 'center' },
  stdValue: { fontFamily: flFont.display, fontSize: 30, lineHeight: 34, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  stdUnit: { fontSize: 9.5, letterSpacing: 1.5, color: flColor.gray600, marginTop: 1 },
  card: { backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, padding: 15, boxShadow: flShadow.card },

  // identity card
  identityCard: { position: 'relative', backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, paddingRight: 38, boxShadow: flShadow.card, overflow: 'hidden' },
  idField: { paddingHorizontal: 15, paddingVertical: 13, gap: 2 },
  idFieldDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  idLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  idValue: { fontSize: 14, lineHeight: 20, color: flColor.cream100 },
  idValueMuted: { color: flColor.gray600 },
  idChevron: { position: 'absolute', top: 14, right: 14 },

  // privacy
  privacyLabel: { fontSize: 14.5, color: flColor.cream100, marginBottom: 3 },
  privacyHint: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600, marginBottom: 11 },
  segTrack: { flexDirection: 'row', gap: 5, padding: 3, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800 },

  // join-request badge
  requestBadge: { minWidth: 22, height: 22, paddingHorizontal: 8, borderRadius: flRadius.pill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: flShadow.glowSubtle },
  requestBadgeText: { fontSize: 12, fontWeight: '700', color: '#1A1206' },

  // discovery (0050) — joining + category
  joinBlock: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  capHint: { marginTop: 10, fontSize: 11, lineHeight: 16, color: flColor.gray600 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: flRadius.pill, borderWidth: 1, overflow: 'hidden' },
  catChipOn: { borderColor: flColor.bronzeBorder },
  catChipOff: { borderColor: flColor.charcoal500, backgroundColor: flColor.surfaceRecessed },
  catChipLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.cream100 },
  catChipLabelOn: { color: '#1A1206' },
  catHint: { marginTop: 10, fontSize: 11, lineHeight: 16, color: flColor.gray600 },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.pill, overflow: 'hidden' },
  segLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  segLabelOn: { color: '#1A1206' },

  // ownership
  ownershipRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900, boxShadow: flShadow.card },
  ownershipIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  ownershipText: { flex: 1, minWidth: 0, gap: 2 },
  ownershipTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  ownershipSub: { fontSize: 12, lineHeight: 16, color: flColor.gray600 },

  // danger
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: 'rgba(150, 74, 66, 0.55)', backgroundColor: flColor.surfaceRecessed },
  dangerIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(190,90,76,0.14)' },
  dangerText: { flex: 1, minWidth: 0, gap: 2 },
  dangerTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.redMuted },
  dangerSub: { fontSize: 12, lineHeight: 16, color: flColor.gray600 },

  footer: { marginTop: 26, textAlign: 'center', fontFamily: flFont.display, fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.charcoal500 },

  // ── member view ──
  memberMeta: { marginTop: 5, fontSize: 11.5, letterSpacing: 0.3, color: flColor.gray600 },
  membershipLabel: { marginTop: 44, marginBottom: 12, marginLeft: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },

  infoCard: { backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card, overflow: 'hidden' },
  infoField: { paddingHorizontal: 15, paddingVertical: 13, gap: 3 },
  infoFieldDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  infoLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  infoValue: { fontSize: 14, lineHeight: 20, color: flColor.cream100 },
  infoProgress: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 13 },
  infoRowIcon: { width: 32, height: 32, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  infoRowLabel: { flex: 1, minWidth: 0, fontSize: 14, color: flColor.gray400 },
  infoRowValue: { fontSize: 13, fontWeight: '600', color: flColor.cream100 },
  visPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingRight: 11, paddingLeft: 9, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600 },
  visPillText: { fontSize: 12, fontWeight: '600', color: flColor.cream100 },

  notifCard: { backgroundColor: flColor.charcoal900, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card, overflow: 'hidden' },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 14 },
  notifRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  notifRowDim: { opacity: 0.4 },
  // The privacy line under the Training Alerts card (0153) — a caption, not a row.
  trainingAlertsFoot: { marginTop: 8, marginHorizontal: 4, fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },
  notifIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  notifText: { flex: 1, minWidth: 0, gap: 2 },
  notifTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  notifSub: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600 },
  sw: { width: 46, height: 27, borderRadius: flRadius.pill, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 2 },
  swOn: { backgroundColor: flColor.bronze400, borderColor: flColor.bronze400, alignItems: 'flex-end' },
  swOff: { backgroundColor: flColor.charcoal900, borderColor: flColor.charcoal700, alignItems: 'flex-start' },
  swKnob: { width: 21, height: 21, borderRadius: 10.5 },
  swKnobOn: { backgroundColor: '#E4D4B8' },
  swKnobOff: { backgroundColor: flColor.gray600 },

  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal900, boxShadow: flShadow.card, marginBottom: 12 },
  reportIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  reportLabel: { flex: 1, minWidth: 0, fontSize: 14.5, color: flColor.cream100 },
  leaveRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: flRadius.lg, borderWidth: 1, borderColor: 'rgba(150, 74, 66, 0.55)', backgroundColor: flColor.surfaceRecessed },
  leaveIcon: { width: 34, height: 34, flexShrink: 0, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(190,90,76,0.14)' },
  leaveText: { flex: 1, minWidth: 0, gap: 2 },
  leaveTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.redMuted },
  leaveSub: { fontSize: 12, lineHeight: 16, color: flColor.gray600 },
  leaveWarnDisc: { alignSelf: 'center', width: 44, height: 44, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(190,90,76,0.14)', borderWidth: 1, borderColor: 'rgba(150, 74, 66, 0.55)', marginBottom: 14 },

  // edit sheet
  sheetBody: { gap: 18 },
  faLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 9 },
  editPhotoWrap: { alignItems: 'center', gap: 10 },
  editPhotoDisc: { width: 76, height: 76, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: flColor.charcoal900, boxShadow: `0 0 0 2px ${flColor.bronze400}, 0 0 14px rgba(186, 134, 84,0.26)` },
  editPhotoImg: { width: '100%', height: '100%', borderRadius: flRadius.round },
  editPhotoActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editLink: { fontSize: 12, fontWeight: '600', color: flColor.bronze400 },
  editLinkMuted: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
  editDot: { fontSize: 12, color: flColor.gray600 },
  sheetFooter: { flexDirection: 'row', gap: 10 },
  footerCancel: { flex: 1 },
  footerSave: { flex: 2 },

  // delete confirm
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: flColor.overlayDark },
  confirmCard: { width: '100%', maxWidth: 322, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, padding: 24, boxShadow: flShadow.ambient },
  confirmWarnDisc: { alignSelf: 'center', width: 44, height: 44, borderRadius: flRadius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(190,90,76,0.14)', borderWidth: 1, borderColor: 'rgba(150, 74, 66, 0.55)', marginBottom: 14 },
  confirmTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  confirmBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center', marginTop: 10 },
  confirmPrompt: { fontSize: 11.5, color: flColor.gray600, marginTop: 18, marginBottom: 8 },
  confirmWord: { fontWeight: '700', letterSpacing: 1, color: flColor.redMuted },
  confirmInput: { marginBottom: 4 },
  confirmActions: { gap: 10, marginTop: 16 },
});
