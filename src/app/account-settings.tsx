import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { deleteMyAccount } from '@/data/account-live';
import { isAppAdmin } from '@/data/admin-live';
import { usePersist } from '@/hooks/usePersist';
import { useToast } from '@/hooks/useCeremony';
import { fetchHomeGym } from '@/data/home-gym-live';
import { fetchAccountIdentity } from '@/domain/profile/live';
import {
  ABOUT_BODY,
  LEGAL,
  rankLine,
  settingsSections,
  SIGN_OUT_CONFIRM,
  versionFooter,
  versionLine,
  type LegalKey,
} from '@/domain/settings/content';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@/lib/useQuery';
import { useTour } from '@/hooks/useTour';

/**
 * Account Settings — the settings home (`Forge Account Settings.dc.html`).
 *
 * `P-1-Dissolution-Amendment.md` (LOCKED 2026-07-20) dissolved P-1 Profile and P-4 Settings Root into
 * this screen. It carries the design's identity header (the bronze disc + name + rank), P-4's category
 * map, Sign Out, legal sheets and version line.
 *
 * HEADER SCOPE (a deliberate reversal of amendment §4 under PD-7, "the design governs"): the amendment
 * proposed rehoming @handle / athlete type / "Forging since" in this header, but the design keeps the
 * header to name + rank. Those are editable identity, so they belong on **P-1.1 Edit Profile — now
 * built**, which this header is the entry point to. The handle rides along under the rank because it is
 * how other athletes reach you (handle search is the only Add Friend path), so it has to be legible
 * somewhere; athlete type and "Forging since" stay on the editor rather than crowding the header.
 *
 * The App Bar avatar app-wide targets this screen directly. There is no Profile modal.
 *
 * All three menu screens are now built and server-persisted: Profile Visibility (P-6), Notifications
 * (P-5) and Preferences (P-4b, with a real units system).
 *
 * DEFERRED vs the `.dc` (omitted, not faked):
 *  · Accent colour (10 palettes) — the tokens are compile-time constants; runtime theming is a rebuild.
 *
 * The design's version string `2.4.1 (build 318)` is placeholder copy; this reports the real one.
 */

const CHEVRON = 'M9 6l6 6-6 6';
const BULB = 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.4c.7.7 1 1.3 1 2.1h6c0-.8.3-1.4 1-2.1A6 6 0 0 0 12 3z';

/** The design's bronze-metallic disc: a vertical light→dark bronze sweep behind the initials. */
const AVATAR_STOPS = [flColor.bronze300, flColor.bronze400, flColor.bronzeDark] as const;

function Glyph({ d, size = 15, color, width = 1.9 }: { d: string; size?: number; color: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((seg) => (
        <Path key={seg} d={`M${seg}`} />
      ))}
    </Svg>
  );
}

export default function AccountSettingsScreen() {
  /*
   * ⚠ REQUIRED BY APP STORE REVIEW 5.1.1(v) — and the Terms have promised it the whole time.
   *
   * Typed confirmation, matching `squad-settings.tsx` exactly rather than inventing a second ceremony for
   * the same weight of action: an irreversible delete should feel the same everywhere in the product.
   *
   * The order is load-bearing and lives in `deleteMyAccount()`: storage objects go FIRST, while the
   * athlete still owns them (0146) and while the rows naming them still exist. Delete the account first
   * and nothing knows which bytes were theirs.
   */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const persist = usePersist();
  const { showToast } = useToast();
  const canDelete = deleteText.trim().toUpperCase() === 'DELETE';

  const doDeleteAccount = () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    persist(() => deleteMyAccount(), {
      onOk: async (res) => {
        /* Signing out is what actually ends the session — the account is already gone, so this cannot
           fail in a way that matters, but it must run AFTER the delete resolved. */
        if (res.squadsTransferred > 0) showToast(`Squad ownership passed on. Your account is deleted.`);
        await signOut();
      },
      rollback: () => setDeleting(false),
      detail: true,
    });
  };

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { tipsEnabled, setTipsEnabled, startTour } = useTour();

  const { data: me, loading } = useQuery(fetchAccountIdentity, []);
  const { data: homeGym } = useQuery(fetchHomeGym, []);
  /* The operator row (0129). `isAppAdmin()` fails closed and never throws, so `data` is true only for
     a confirmed admin — while it loads, and on any error, the row simply is not there. */
  const { data: isAdmin } = useQuery(isAppAdmin, []);

  const [sheet, setSheet] = useState<LegalKey | 'about' | null>(null);

  const gymSummary =
    homeGym == null ? undefined : homeGym.length === 0 ? 'Bodyweight only' : `${homeGym.length} item${homeGym.length === 1 ? '' : 's'}`;

  // Rows only exist once their screens do — all three are built now.
  const sections = settingsSections({
    homeGymSummary: gymSummary,
    hasVisibility: true,
    hasNotifications: true,
    hasPreferences: true,
    isAdmin: isAdmin === true,
  });

  const buildNo = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? null;
  const version = versionLine(Constants.expoConfig?.version, buildNo); // "Forge Legacy 1.0.0" — the About subtitle
  const footerVersion = versionFooter(Constants.expoConfig?.version, buildNo); // "Version 1.0.0 · Build N" — the design's footer

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm(`${SIGN_OUT_CONFIRM.title}\n\n${SIGN_OUT_CONFIRM.message}`)) return;
      void signOut();
      return;
    }
    Alert.alert(SIGN_OUT_CONFIRM.title, SIGN_OUT_CONFIRM.message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const doc = sheet === 'about' ? null : sheet ? LEGAL[sheet] : null;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Settings" onBack={back} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* identity — the design's clean header: bronze disc, name, rank. Now the entry point to P-1.1
              Edit Profile: the header is the identity, so tapping it to change the identity needs no new
              row and keeps the design's uncluttered header intact. The chevron is the only addition. */}
          <Pressable
            onPress={() => router.push('/edit-profile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            style={({ pressed }) => [styles.identity, pressed ? { opacity: 0.7 } : null]}
          >
            <LinearGradient colors={AVATAR_STOPS} locations={[0, 0.52, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarInitials}>{me?.initials ?? ''}</Text>
            </LinearGradient>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {me?.name ?? ''}
              </Text>
              {rankLine(me?.rankFamily, me?.rankLevel) ? <Text style={styles.rank}>{rankLine(me?.rankFamily, me?.rankLevel)}</Text> : null}
              {me?.handle ? <Text style={styles.handle}>@{me.handle}</Text> : null}
            </View>
            <Glyph d={CHEVRON} size={18} color={flColor.gray600} />
          </Pressable>

          {/* guided tips */}
          <Text style={styles.sectionLabel}>Onboarding</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconTile}>
                <Glyph d={BULB} size={18} color={flColor.bronze300} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Guided Tips</Text>
                <Text style={styles.rowHint}>A short spotlight walkthrough the first time you open each screen.</Text>
              </View>
              <SettingsToggle value={tipsEnabled} onChange={setTipsEnabled} accessibilityLabel="Guided tips" />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowMuted}>Seen them all?</Text>
              <Pressable onPress={startTour} accessibilityRole="button" accessibilityLabel="Replay all tips">
                <Text style={styles.rowAction}>Replay all tips</Text>
              </Pressable>
            </View>
          </View>

          {/* the category map */}
          {sections.map((sec) => (
            <View key={sec.key}>
              <Text style={styles.sectionLabel}>{sec.label}</Text>
              <View style={styles.card}>
                {sec.rows.map((row, i) => (
                  <Pressable
                    key={row.key}
                    onPress={() => {
                      if (row.action.type === 'route') return router.push(row.action.path as never);
                      if (row.action.type === 'deleteAccount') return setDeleteOpen(true);
                      return setSheet(row.action.key);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={row.label}
                    style={[styles.row, i > 0 && styles.rowBorder]}
                  >
                    <Text style={[styles.rowLabel, row.destructive && styles.rowLabelDanger]}>{row.label}</Text>
                    <View style={styles.rowRight}>
                      {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
                      <Glyph d={CHEVRON} color={row.destructive ? flColor.redMuted : flColor.gray600} width={2} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          {/* sign out — centered bronze text, its own quiet card */}
          <Pressable onPress={confirmSignOut} accessibilityRole="button" accessibilityLabel="Sign out" style={styles.signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>

          {/* footer */}
          <View style={styles.footer}>
            <View style={styles.legalRow}>
              <Pressable onPress={() => setSheet('terms')} accessibilityRole="button" accessibilityLabel="Terms of Service">
                <Text style={styles.legalLink}>Terms of Service</Text>
              </Pressable>
              <Text style={styles.dot}>·</Text>
              <Pressable onPress={() => setSheet('privacy')} accessibilityRole="button" accessibilityLabel="Privacy Policy">
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </Pressable>
            </View>
            <Text style={styles.version}>{footerVersion}</Text>
          </View>
        </ScrollView>
      )}

      {/* legal / about — an in-app content sheet, not a browser. Nothing is fetched. */}
      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'about' ? 'About' : doc?.host ?? ''}>
        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>{sheet === 'about' ? 'Forge Legacy' : doc?.title ?? ''}</Text>
          <Text style={styles.sheetUpdated}>{sheet === 'about' ? version : doc?.updated ?? ''}</Text>
          {(sheet === 'about' ? ABOUT_BODY : (doc?.body ?? [])).map((p) => (
            <Text key={p} style={styles.sheetPara}>
              {p}
            </Text>
          ))}
        </ScrollView>
      </BottomSheet>

      {/* Delete account — typed confirmation, matching the squad-delete ceremony (App Store 5.1.1(v)). */}
      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete your account?</Text>
            <Text style={styles.confirmBody}>
              This erases your chapters, workouts, records, goals, honors and photos. It cannot be undone
              and nothing here can be recovered afterwards.
            </Text>
            {/* Said separately because it is the one reassurance in this dialog, and it answers the
                question an owner would otherwise have to guess at. */}
            <Text style={styles.confirmBody}>
              Any squad you own passes to its longest-standing member, so nobody else loses their work.
            </Text>
            <Text style={styles.confirmPrompt}>
              Type <Text style={styles.confirmWord}>DELETE</Text> to confirm
            </Text>
            <View style={styles.confirmInput}>
              <InputField value={deleteText} onChange={setDeleteText} placeholder="DELETE" autoCapitalize="characters" autoCorrect={false} />
            </View>
            <View style={styles.confirmActions}>
              <Button variant="destructive" fullWidth disabled={!canDelete || deleting} onPress={doDeleteAccount} accessibilityLabel="Delete my account forever">
                {deleting ? 'Deleting…' : 'Delete My Account'}
              </Button>
              <Button variant="secondary" fullWidth onPress={() => setDeleteOpen(false)} accessibilityLabel="Cancel">
                Keep My Account
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  rowLabelDanger: { color: flColor.redMuted },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  confirmCard: { width: '100%', maxWidth: 380, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, padding: 22, alignItems: 'center' },
  confirmTitle: { fontFamily: flFont.display, fontSize: 21, color: flColor.cream100, textAlign: 'center', marginBottom: 10 },
  confirmBody: { fontSize: 13, lineHeight: 19, color: flColor.gray400, textAlign: 'center', marginBottom: 16 },
  confirmPrompt: { fontSize: 12, color: flColor.gray400, marginBottom: 8 },
  confirmWord: { color: flColor.redMuted, fontWeight: '700' },
  confirmInput: { width: '100%', marginBottom: 16 },
  confirmActions: { width: '100%', gap: 9 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingTop: 10, paddingBottom: 28 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(181, 138, 97, 0.14)',
  },
  avatarInitials: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', color: '#1A1206' },
  identityText: { flex: 1 },
  name: { fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100 },
  rank: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 3 },
  handle: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray600, marginTop: 3 },

  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginBottom: 10,
  },
  card: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    marginBottom: 22,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  rowValue: { fontSize: 12.5, color: flColor.bronze400 },
  rowMuted: { fontSize: 12.5, color: flColor.gray400 },
  rowAction: { fontSize: 12.5, fontWeight: '700', color: flColor.bronze400 },

  iconTile: {
    width: 36,
    height: 36,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },

  signOut: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginBottom: 22 },
  signOutText: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },

  footer: { alignItems: 'center', gap: 10, paddingTop: 4 },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legalLink: { fontSize: 12, color: flColor.bronze400 },
  dot: { fontSize: 12, color: flColor.gray600 },
  version: { fontSize: 11, color: flColor.gray600 },

  sheetScroll: { maxHeight: 460 },
  sheetBody: { paddingHorizontal: 4, paddingBottom: 20 },
  sheetTitle: { fontFamily: flFont.display, fontSize: 24, fontWeight: '600', color: flColor.cream100, marginBottom: 6 },
  sheetUpdated: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: flColor.gray600,
    marginBottom: 18,
  },
  sheetPara: { fontSize: 13.5, lineHeight: 22, color: flColor.gray400, marginBottom: 14 },
});
