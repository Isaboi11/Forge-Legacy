import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { Field, SelectTile } from '@/components/onboarding/kit';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont } from '@/constants/foundation';
import { isHandleAvailable } from '@/domain/onboarding/service';
import type { AthleteType } from '@/domain/onboarding/derive';
import {
  fetchAccountIdentity,
  HandleTakenError,
  normalizeHandle,
  removeSelfAvatar,
  updateSelfProfile,
  type AccountIdentity,
} from '@/domain/profile/live';
import type { Sex } from '@/domain/profile/schema';
import { useToast } from '@/hooks/useCeremony';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { AvatarCropEditor } from '@/components/forge/AvatarCropEditor';
import { useProfile } from '@/lib/profile';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * P-1.1 Edit Profile — the identity editor `P-1-Dissolution-Amendment.md` §4 has owed since P-1 was
 * dissolved, and the screen `Onboarding-First-Time-Journey-Architecture` names when it calls the derived
 * Athlete Type "a default, never a lock… freely editable later via P-1.1" (ONB-D8).
 *
 * Until this existed, everything here was write-once at onboarding: an athlete who mistyped their handle
 * owned that typo permanently. That matters more than it sounds — the handle is the ONLY way Add Friend
 * resolves a person (SOC-D15, handle search only), so a typo isn't cosmetic, it makes you unfindable.
 *
 * WHAT IS EDITABLE, AND WHY ONLY THIS:
 *  · Name / photo / handle — presentation and addressing. Nothing computes from them.
 *  · Sex — badge artwork and silhouettes only, never a health metric (`profile/schema.ts`).
 *  · Athlete Type — picks the Personal-Improvement evaluation context the RCM scores against.
 * Rank, "Forging since" and every earned record are ABSENT by design, not omitted for later: they are
 * the record, and "History cannot be rewritten" (Product DNA §9) is a rule about this screen too.
 *
 * The form seeds from ONE read and mounts only once it lands (`<Form initial>`), so there is no
 * fetch-then-setState pass to race with typing — and none of the sync-setState-in-effect the strict
 * react-compiler lint rejects.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const { data, loading } = useQuery(fetchAccountIdentity, []);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      {loading || !data ? (
        <>
          <AppBar title="Edit Profile" onBack={back} />
          <View style={styles.loading}>
            <ActivityIndicator color={flColor.bronze400} />
          </View>
        </>
      ) : (
        <Form initial={data} onDone={back} />
      )}
    </View>
  );
}

type UStatus = 'unchanged' | 'idle' | 'short' | 'checking' | 'available' | 'taken';

const ATHLETE_TYPES: { id: AthleteType; title: string; desc: string }[] = [
  { id: 'Strength', title: 'Strength', desc: 'Progress measured by what you lift.' },
  { id: 'Bodybuilding', title: 'Bodybuilding', desc: 'Progress measured by training volume and muscle work.' },
  { id: 'Endurance', title: 'Endurance', desc: 'Progress measured by distance, pace and time.' },
  { id: 'Hybrid', title: 'Hybrid', desc: 'A bit of everything — the always-valid default.' },
];

const SEXES: { id: Sex; title: string }[] = [
  { id: 'male', title: 'Male' },
  { id: 'female', title: 'Female' },
  { id: 'unspecified', title: 'Prefer not to say' },
];

function Form({ initial, onDone }: { initial: AccountIdentity; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { refetch: refetchProfile } = useProfile();
  const { pick, mediaPickerSheet } = useMediaPicker();

  const [name, setName] = useState(initial.name);
  const [handle, setHandle] = useState(initial.handle);
  const [sex, setSex] = useState<Sex>(initial.sex);
  const [athleteType, setAthleteType] = useState<AthleteType>((initial.athleteType as AthleteType) || 'Hybrid');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  /** The picked-but-not-yet-positioned image. Non-null while the crop editor is up. */
  const [cropping, setCropping] = useState<string | null>(null);
  /** The photo on the profile RIGHT NOW. Its own state because Remove takes it down at once, without Save. */
  const [storedPhoto, setStoredPhoto] = useState<string | null>(initial.avatarUrl);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [uStatus, setUStatus] = useState<UStatus>('unchanged');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── handle availability (debounced, same 450ms as onboarding) ──
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHandle = (raw: string) => {
    const clean = normalizeHandle(raw);
    setHandle(clean);
    if (timer.current) clearTimeout(timer.current);
    // Your OWN handle is in the profiles table, so a plain availability check reports it taken and locks
    // you out of saving any other field. Unchanged is always valid.
    if (clean === initial.handle) {
      setUStatus('unchanged');
      return;
    }
    if (clean.length < 3) {
      setUStatus(clean.length === 0 ? 'idle' : 'short');
      return;
    }
    setUStatus('checking');
    timer.current = setTimeout(() => {
      isHandleAvailable(clean).then(
        (ok) => setUStatus(ok ? 'available' : 'taken'),
        () => setUStatus('idle'),
      );
    }, 450);
  };

  /**
   * Pick, then POSITION.
   *
   * `allowsEditing` is left off deliberately: on web it does nothing, and on iOS its square hint is
   * largely ignored — so on both platforms this app is actually used from, the OS crop was not a crop.
   * The picked image goes to `AvatarCropEditor` instead, which produces an already-square file, so what
   * lands in storage IS the avatar and every surface that draws one is untouched.
   */
  const onPickPhoto = async () => {
    const asset = await pick({ kind: 'images', title: 'Profile photo', quality: 0.92 });
    if (asset?.uri) setCropping(asset.uri);
  };

  const dirty =
    name.trim() !== initial.name ||
    handle !== initial.handle ||
    sex !== initial.sex ||
    athleteType !== (initial.athleteType || 'Hybrid') ||
    photoUri != null;

  /*
   * ⚠ A CLEARED HANDLE NO LONGER SAVES (QA 09-26 settings-23). 0009 allows a null handle, but handle
   * search is the only way anyone can add you — clearing it made an athlete unfindable in one tap, with
   * nothing but a grey line to say so. An account that never had one is still 'unchanged' and saves.
   */
  const handleOk = uStatus === 'unchanged' || uStatus === 'available';
  const canSave = dirty && handleOk && !!name.trim() && !saving;

  const cropEditor = cropping ? (
    <AvatarCropEditor
      uri={cropping}
      onClose={() => setCropping(null)}
      onDone={(uri) => {
        setCropping(null);
        setPhotoUri(uri);
      }}
    />
  ) : null;

  /**
   * Take the photo down (settings-08). Its own confirmed action rather than one more field behind Save:
   * it deletes a file, which Save cannot undo, and an athlete who wants their face off the feed should
   * not also have to pass the name and handle checks to get it.
   */
  const onRemovePhoto = async () => {
    setConfirmRemove(false);
    if (removing) return;
    setRemoving(true);
    setError(null);
    try {
      await removeSelfAvatar();
      setStoredPhoto(null);
      // The AppBar avatars and the Legacy portrait read the shared profile — same reason as `onSave`.
      refetchProfile();
      showToast('Profile photo removed');
    } catch {
      setError('Couldn’t remove your photo. Check your connection and try again.');
    } finally {
      setRemoving(false);
    }
  };

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await updateSelfProfile({ name, handle, sex, athleteType, photoUri });
      // Every AppBar avatar and the Legacy hero read the shared profile context — without this they keep
      // showing the old name and photo until the app is reloaded.
      refetchProfile();
      showToast('Profile updated');
      onDone();
    } catch (e) {
      setSaving(false);
      if (e instanceof HandleTakenError) {
        setUStatus('taken');
        setError(e.message);
        return;
      }
      setError(errorMessage(e));
    }
  };

  /* Back with unsaved edits asks first — it used to throw them away silently (QA 09-26 settings-23). */
  const back = () => {
    if (!dirty || saving) return onDone();
    const msg = 'Your changes haven’t been saved.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Discard changes?

${msg}`)) onDone();
      return;
    }
    Alert.alert('Discard changes?', msg, [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onDone },
    ]);
  };

  return (
    <>
      <AppBar title="Edit Profile" onBack={back} />
      {cropEditor}
      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarRow}>
          <Pressable onPress={() => void onPickPhoto()} accessibilityRole="button" accessibilityLabel="Change profile photo">
            <Avatar src={photoUri ?? storedPhoto ?? undefined} name={name || '  '} size="profile" ring />
          </Pressable>
          <View style={styles.photoActions}>
            <Pressable onPress={() => void onPickPhoto()} accessibilityRole="button" accessibilityLabel={storedPhoto || photoUri ? 'Change photo' : 'Add photo'}>
              <Text style={styles.changePhoto}>{photoUri ? 'Positioned — save to apply' : storedPhoto ? 'Change photo' : 'Add photo'}</Text>
            </Pressable>
            {/* Only for a photo that is actually ON the profile. A picked-but-unsaved one is dropped by
                leaving without saving; offering Remove there would delete the old photo instead. */}
            {storedPhoto && !photoUri ? (
              <Pressable onPress={() => setConfirmRemove(true)} disabled={removing} accessibilityRole="button" accessibilityLabel="Remove photo">
                <Text style={styles.removePhoto}>{removing ? 'Removing…' : 'Remove photo'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Field
          label="Your name"
          placeholder="e.g. Marcus Vale"
          maxLength={24}
          showCount
          value={name}
          onChangeText={(t) => setName(t.replace(/^\s+/, ''))}
        />

        <Group label="Handle" hint="How friends find you — handle search is the only way to add someone.">
          <View style={styles.handleRow}>
            <Text style={styles.at}>@</Text>
            {/* No second label: "Handle" above already names it, and the extra "Username" pushed the field
                to 60% width (QA 09-26 settings-22). */}
            <View style={styles.handleField}>
              <Field
                accessibilityLabel="Handle"
                placeholder="marcusvale"
                autoCapitalize="none"
                autoCorrect={false}
                value={handle}
                onChangeText={onHandle}
              />
            </View>
          </View>
          <HandleStatus status={uStatus} handle={handle} />
        </Group>

        <Group label="Sex" hint="Used for badge artwork and silhouettes only.">
          {/* Two across, then "Prefer not to say" on its own line: three across left it a third of the
              width and it broke over three lines (QA 09-26 settings-22). Onboarding's pair is the same shape. */}
          <View style={styles.tileRow}>
            {SEXES.filter((s) => s.id !== 'unspecified').map((s) => (
              <SelectTile key={s.id} fill title={s.title} selected={sex === s.id} onPress={() => setSex(s.id)} />
            ))}
          </View>
          <View style={styles.tileRow}>
            {SEXES.filter((s) => s.id === 'unspecified').map((s) => (
              <SelectTile key={s.id} fill title={s.title} selected={sex === s.id} onPress={() => setSex(s.id)} />
            ))}
          </View>
        </Group>

        <Group label="Athlete Type" hint="Sets what personal improvement is measured against for rank. Change it whenever your training does.">
          <View style={styles.typeCol}>
            {ATHLETE_TYPES.map((t) => (
              <SelectTile key={t.id} title={t.title} desc={t.desc} selected={athleteType === t.id} onPress={() => setAthleteType(t.id)} />
            ))}
          </View>
        </Group>

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <View style={styles.save}>
          <Button variant="primary" fullWidth disabled={!canSave} onPress={() => void onSave()} accessibilityLabel="Save changes">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </View>

        <Text style={styles.footnote}>
          Your rank, your honors and everything you&apos;ve logged aren&apos;t edited here. They&apos;re the record.
        </Text>
      </ScrollView>
      {mediaPickerSheet}
      <ConfirmSheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        headline="Remove your photo?"
        body="Your initials show in its place — on your profile, in your squads and beside your posts. You can add a photo again whenever you like."
        confirmLabel="Remove Photo"
        onConfirm={() => void onRemovePhoto()}
      />
    </>
  );
}

// ── local pieces ──
function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.groupHint}>{hint}</Text> : null}
    </View>
  );
}

function HandleStatus({ status, handle }: { status: UStatus; handle: string }) {
  const map: Record<UStatus, { text: string; color: string }> = {
    unchanged: { text: '', color: flColor.gray600 },
    idle: { text: 'Pick a handle — it’s how friends find you, so it can’t be left empty.', color: flColor.gray400 },
    short: { text: 'At least 3 characters.', color: flColor.gray400 },
    checking: { text: 'Checking availability…', color: flColor.gray400 },
    available: { text: `@${handle} is available.`, color: flColor.greenMuted },
    taken: { text: `@${handle} is already taken.`, color: flColor.redMuted },
  };
  const m = map[status];
  return m.text ? <Text style={[styles.uStatus, { color: m.color }]}>{m.text}</Text> : <View style={styles.uStatusGap} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 8, gap: 22 },

  avatarRow: { alignItems: 'center', gap: 10, paddingVertical: 6 },
  photoActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 22, rowGap: 8 },
  changePhoto: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.bronzeInk },
  removePhoto: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  group: { gap: 8 },
  groupLabel: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  groupHint: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600 },
  tileRow: { flexDirection: 'row', gap: 10 },
  typeCol: { gap: 8 },

  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  handleField: { flex: 1, minWidth: 0 },
  at: { fontFamily: flFont.display, fontSize: 20, color: flColor.bronzeInk },
  uStatus: { fontFamily: flFont.sans, fontSize: 13 },
  uStatusGap: { height: 18 },

  save: { marginTop: 4 },
  err: { fontFamily: flFont.sans, fontSize: 13, color: flColor.redMuted },
  footnote: { fontFamily: flFont.sans, fontSize: 12, lineHeight: 18, color: flColor.gray600, textAlign: 'center', paddingHorizontal: 12 },
});
