import { useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SquadCrest, CREST_KEYS, type CrestKey } from '@/components/forge/SquadCrest';
import { createSquad, updateSquad, uploadSquadPhoto, type SquadPrivacy } from '@/data/squad-live';
import { SQUAD_CATEGORIES, type SquadCategory } from '@/data/squad-discover-live';
import { errorMessage } from '@/lib/useQuery';
import { useMediaPicker } from '@/lib/useMediaPicker';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Create Squad — the first squad WRITE path. Built to `Create Squad.dc.html`.
 *
 * Full identity: a live-identity hero (title mirrors the typed name; the disc previews the squad photo, or
 * the selected crest glyph when no photo; both compress while a field is focused), an Identity card (name ·
 * motto · description) in flat recessed `.cs-input` fields, the 4-across crest grid, the Private/Public
 * segmented control with a lock/globe hint, and the forged-fill commit bar (enabled at name ≥ 2). On create →
 * the atomic `create_squad` RPC; if a photo was picked it uploads to the `squad-photos` bucket and patches the
 * row, then replaces to the new squad's detail. The `squad_created` celebration stays cut (design-only).
 */

const NAME_MAX = 28;
const MOTTO_MAX = 40;
const DESC_MAX = 140;

const PRIVACY_HINT: Record<SquadPrivacy, string> = {
  private: 'Invite-only and hidden from search. Members join through invitations or approval.',
  public: 'Visible to everyone. Athletes can discover your squad and request to join — you approve each one.',
};

export default function CreateSquadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { pick, mediaPickerSheet } = useMediaPicker();

  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [description, setDescription] = useState('');
  const [crest, setCrest] = useState<CrestKey>('swords');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<SquadPrivacy>('private');
  const [category, setCategory] = useState<SquadCategory | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const pickPhoto = async () => {
    const asset = await pick({ kind: 'images', title: 'Squad photo', allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (asset?.uri) setPhotoUri(asset.uri);
  };

  // Compress the hero while a field is focused (debounced blur so moving between fields doesn't flicker),
  // matching the design's focusin/focusout behaviour.
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFieldFocus = () => {
    if (editTimer.current) clearTimeout(editTimer.current);
    setEditing(true);
  };
  const onFieldBlur = () => {
    if (editTimer.current) clearTimeout(editTimer.current);
    editTimer.current = setTimeout(() => setEditing(false), 140);
  };
  useEffect(() => () => {
    if (editTimer.current) clearTimeout(editTimer.current);
  }, []);

  const trimmedName = name.trim();
  const nameOk = trimmedName.length >= 2;

  const onCreate = () => {
    if (!nameOk || busy) return;
    setBusy(true);
    createSquad({ name, motto, description, privacy, crest, category }).then(
      async (newId) => {
        // Squad already exists; a photo failure shouldn't block finishing — but it must NOT be silent.
        let photoError: string | null = null;
        if (photoUri) {
          try {
            const url = await uploadSquadPhoto(newId, photoUri);
            await updateSquad(newId, { photoUrl: url });
          } catch (err) {
            photoError = errorMessage(err);
          }
        }
        router.replace({ pathname: '/squad/[id]', params: { id: newId } });
        if (photoError) showToast(`Squad created, but the photo didn’t upload: ${photoError}`);
      },
      (e: unknown) => {
        setBusy(false);
        showToast(errorMessage(e));
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Create Squad" serif onBack={() => router.back()} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* ── Hero: live identity ── */}
          <View style={styles.hero}>
            <Text style={[styles.heroTitle, editing && styles.heroTitleSmall, !trimmedName && styles.heroTitleMuted]} numberOfLines={2}>
              {trimmedName || 'Your New Squad'}
            </Text>
            {!editing ? <Text style={styles.heroSupport}>Your photo, crest, and name become your squad’s identity. You can change them anytime.</Text> : null}
            <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel={photoUri ? 'Change squad photo' : 'Add squad photo'} style={[styles.heroCrest, editing && styles.heroCrestSmall]}>
              {photoUri ? <Image source={{ uri: photoUri }} style={styles.heroPhoto} contentFit="cover" /> : <SquadCrest crest={crest} size={editing ? 30 : 36} />}
            </Pressable>
            {!editing ? (
              <View style={styles.heroActions}>
                <Pressable onPress={pickPhoto} accessibilityRole="button" hitSlop={6}>
                  <Text style={styles.heroLink}>{photoUri ? 'Change Photo' : 'Add Squad Photo'}</Text>
                </Pressable>
                {photoUri ? (
                  <>
                    <Text style={styles.heroDot}>·</Text>
                    <Pressable onPress={() => setPhotoUri(null)} accessibilityRole="button" hitSlop={6}>
                      <Text style={styles.heroLinkMuted}>Remove</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null}
            {!editing && !photoUri ? <Text style={styles.heroHintTiny}>Optional — or pick a crest below</Text> : null}
          </View>

          {/* ── Identity ── */}
          <Text style={styles.sectionLabel}>Identity</Text>
          <View style={styles.cardIdentity}>
            <CsField
              label="Squad Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Iron Vigil"
              maxLength={NAME_MAX}
              autoCapitalize="words"
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              marker={nameOk ? <CheckMark /> : <Text style={styles.reqMark}>∗</Text>}
            />
            <CsField label="Motto" value={motto} onChangeText={setMotto} placeholder="A short rallying cry" maxLength={MOTTO_MAX} onFocus={onFieldFocus} onBlur={onFieldBlur} />
            <CsField
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the culture you’re building."
              maxLength={DESC_MAX}
              multiline
              autoCorrect
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
            />
          </View>

          {/* ── Crest ── */}
          <Text style={styles.sectionLabel}>Crest</Text>
          <View style={styles.card}>
            <View style={styles.crestGrid}>
              {CREST_KEYS.map((k) => {
                const on = crest === k;
                return (
                  <Pressable key={k} onPress={() => setCrest(k)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${k} crest`} style={[styles.crestCell, on ? styles.crestCellOn : null]}>
                    <SquadCrest crest={k} size={22} color={on ? flColor.bronze300 : flColor.gray400} />
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.crestCaption}>Pick a crest that marks your squad.</Text>
          </View>

          {/* ── Category ── the Discover Squads filter your squad answers to. */}
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.card}>
            <View style={styles.catRow}>
              {SQUAD_CATEGORIES.map((c) => {
                const on = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(on ? null : c)}
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
            <Text style={styles.crestCaption}>Where athletes find you in Discover. Optional — tap again to clear.</Text>
          </View>

          {/* ── Privacy ── */}
          <Text style={styles.sectionLabel}>Privacy</Text>
          <View style={styles.card}>
            <View style={styles.segTrack}>
              {(['private', 'public'] as const).map((p) => {
                const on = privacy === p;
                return (
                  <Pressable key={p} onPress={() => setPrivacy(p)} accessibilityRole="button" accessibilityState={{ selected: on }} style={styles.segBtn}>
                    {on ? <LinearGradient colors={flGradient.bronzeMetallic.colors} locations={flGradient.bronzeMetallic.locations} start={flGradient.bronzeMetallic.start} end={flGradient.bronzeMetallic.end} style={StyleSheet.absoluteFill} /> : null}
                    <Text style={[styles.segLabel, on ? styles.segLabelOn : null]}>{p === 'private' ? 'Private' : 'Public'}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.hintRow}>
              <View style={styles.hintIcon}>{privacy === 'private' ? <LockGlyph /> : <GlobeGlyph />}</View>
              <Text style={styles.hintText}>{PRIVACY_HINT[privacy]}</Text>
            </View>

          </View>
        </ScrollView>

        {/* ── Commit bar ── */}
        <LinearGradient colors={['rgba(9,9,9,0.4)', 'rgba(9,9,9,0.72)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={[styles.commitBar, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable onPress={onCreate} disabled={!nameOk || busy} accessibilityRole="button" accessibilityState={{ disabled: !nameOk || busy }} accessibilityLabel="Create squad">
            {nameOk ? (
              <LinearGradient colors={flGradient.bronzeFill.colors} locations={flGradient.bronzeFill.locations} start={flGradient.bronzeFill.start} end={flGradient.bronzeFill.end} style={[styles.commitBtn, styles.commitBtnOn]}>
                <ForgeGlyph color={flColor.bronze300} />
                <Text style={styles.commitLabel}>{busy ? 'Forging…' : 'Create Squad'}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.commitBtn, styles.commitBtnOff]}>
                <ForgeGlyph color={flColor.gray600} />
                <Text style={styles.commitLabelOff}>Create Squad</Text>
              </View>
            )}
          </Pressable>
        </LinearGradient>
      </KeyboardAvoidingView>

      {mediaPickerSheet}
    </View>
  );
}

// ── flat recessed field (matches the design's `.cs-input`) ──
function CsField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  marker,
  multiline = false,
  showCount = true,
  autoCapitalize = 'sentences',
  autoCorrect = false,
  onFocus,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength: number;
  marker?: ReactNode;
  multiline?: boolean;
  showCount?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const near = value.length >= maxLength - (multiline ? 5 : 4);
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <View style={styles.fieldLabelLeft}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {marker}
        </View>
        {showCount ? (
          <Text style={[styles.fieldCount, near && styles.fieldCountNear]}>
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={flColor.gray600}
        maxLength={maxLength}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        style={[styles.csInput, multiline && styles.csInputMultiline, focused && styles.csInputFocused]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

// ── glyphs ──
function ForgeGlyph({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function CheckMark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#6E8E74" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}
function LockGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 10.5h14v9H5z" />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Svg>
  );
}
function GlobeGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M3.5 12h17" />
      <Path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },

  // hero
  hero: { alignItems: 'center', paddingTop: 6 },
  heroTitle: { fontFamily: flFont.display, fontSize: 26, fontWeight: '600', letterSpacing: -0.3, lineHeight: 30, textAlign: 'center', color: flColor.cream100, maxWidth: 300 },
  heroTitleSmall: { fontSize: 21, lineHeight: 24 },
  heroTitleMuted: { color: flColor.charcoal500 },
  heroSupport: { marginTop: 9, fontSize: 12, lineHeight: 18, textAlign: 'center', color: flColor.gray600, maxWidth: 262 },
  heroCrest: {
    marginTop: 18,
    width: 70,
    height: 70,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: flColor.charcoal900,
    boxShadow: `0 0 0 2px ${flColor.bronze400}, 0 6px 18px rgba(0,0,0,0.6), 0 0 14px rgba(191,143,79,0.26)`,
  },
  heroCrestSmall: { marginTop: 14, width: 58, height: 58 },
  heroPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 },
  heroLink: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze400 },
  heroLinkMuted: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  heroDot: { fontSize: 11.5, color: flColor.gray600 },
  heroHintTiny: { marginTop: 3, fontSize: 11, letterSpacing: 0.2, color: flColor.gray600 },

  // sections + cards
  sectionLabel: { marginTop: 26, marginBottom: 12, marginLeft: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  card: {
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderRadius: flRadius.lg,
    padding: 15,
    boxShadow: flShadow.card,
  },
  cardIdentity: {
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    borderRadius: flRadius.lg,
    paddingHorizontal: 15,
    paddingVertical: 18,
    gap: 20,
    boxShadow: flShadow.card,
  },

  // flat field
  field: { gap: 7 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  fieldLabelLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },
  reqMark: { fontSize: 12, fontWeight: '700', color: flColor.bronze400, lineHeight: 12 },
  fieldCount: { fontSize: 11, color: flColor.gray600, fontVariant: ['tabular-nums'] },
  fieldCountNear: { color: flColor.bronze400 },
  csInput: {
    backgroundColor: flColor.charcoal900,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.md,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14.5,
    color: flColor.cream100,
  },
  csInputMultiline: { minHeight: 84, paddingTop: 12, lineHeight: 21 },
  csInputFocused: { borderColor: flColor.bronzeBorder },

  // crest grid
  crestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  crestCell: {
    flexGrow: 1,
    flexBasis: '20%',
    minWidth: 56,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  crestCellOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  crestCaption: { marginTop: 11, fontSize: 11, lineHeight: 16, color: flColor.gray600 },

  // category chips (same chip as the Discover Squads filter row)
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: flRadius.pill, borderWidth: 1, overflow: 'hidden' },
  catChipOn: { borderColor: flColor.bronzeBorder },
  catChipOff: { borderColor: flColor.charcoal500, backgroundColor: flColor.surfaceRecessed },
  catChipLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.cream100 },
  catChipLabelOn: { color: '#1A1206' },

  // joining (public only)
  joinBlock: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  joinLabel: { marginBottom: 10, fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray600 },

  // privacy
  segTrack: { flexDirection: 'row', gap: 5, padding: 3, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal800 },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.pill, overflow: 'hidden' },
  segLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  segLabelOn: { color: '#1A1206' },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
  hintIcon: { flexShrink: 0, marginTop: 1 },
  hintText: { flex: 1, fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  // commit bar
  commitBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  commitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1 },
  commitBtnOn: { borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  commitBtnOff: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600, opacity: 0.75 },
  commitLabel: { fontSize: 15, fontWeight: '600', color: flColor.bronze300 },
  commitLabelOff: { fontSize: 15, fontWeight: '600', color: flColor.gray600 },
});
