import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import {
  CONSENT_SETTINGS,
  consentKindsShown,
  consentStatusLine,
  HEALTH_DATA_URL,
  type ConsentKind,
} from '@/domain/consent/consent';
import { useToast } from '@/hooks/useCeremony';
import { ensureConsent, refreshConsents, useConsent, withdrawConsent } from '@/lib/consent';

/**
 * Health Data & AI — Account Settings → Privacy & Alerts (0224).
 *
 * The athlete's consents (MHMDA / Nevada SB 370): Nutrition (collecting food and body data), AI features
 * (sharing what a feature needs with Anthropic) and — where it can be connected, or once answered —
 * Apple Health (collecting workouts from Health, build 10). Each shows whether it is in place and since
 * when, and can be withdrawn here, or given again. Agreeing goes through the same sheet as everywhere
 * else, so the words agreed to are always the same words.
 *
 * ⚠ OWNED BY THE CONSENT SYSTEM, NOT BY P-6. P-6's guardrail is that each privacy control reads and
 * writes its own owning system's data; this screen reads and writes `health_consents` only.
 *
 * ⚠ A WITHDRAWAL TAKES EFFECT ON THIS PHONE AT ONCE, before the server answers — an AI call must not
 * slip through during the round trip. If the server refuses it, the athlete is told it only held here.
 */
export default function HealthConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const consent = useConsent();
  const [confirm, setConfirm] = useState<ConsentKind | null>(null);

  /* Re-read on open: an answer given on another device should show here. */
  useEffect(() => {
    void refreshConsents();
  }, []);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  const withdraw = async (kind: ConsentKind) => {
    setConfirm(null);
    const stored = await withdrawConsent(kind);
    showToast(stored ? 'Withdrawn' : 'Withdrawn on this phone. It didn’t save to your account, so try again when you’re online.');
  };

  const agree = async (kind: ConsentKind) => {
    const agreed = await ensureConsent(kind);
    if (agreed) showToast('Agreed');
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Health Data & AI" onBack={back} />

      {!consent.loaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : (
        <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Some parts of Forge need your OK first, because some states treat what they use as health data. Each is
            separate, and you can withdraw any of them here at any time.
          </Text>

          {consent.unreadable ? (
            <Text style={styles.notice}>
              Couldn’t load your saved answers just now. What you see here is from this session only.
            </Text>
          ) : null}

          <Text style={styles.sectionLabel}>Your consents</Text>

          {/* Apple Health is listed only where it can be connected (no build can yet: plan §3.2) or once it
              has been answered on some device, so it stays withdrawable from here. */}
          {consentKindsShown(consent.status, false).map((kind) => {
            const s = CONSENT_SETTINGS[kind];
            const status = consent.status[kind];
            const on = status === 'granted';
            return (
              <View key={kind} style={styles.card}>
                <Text style={styles.rowLabel}>{s.label}</Text>
                <Text style={styles.rowHint}>{s.hint}</Text>
                <Text style={[styles.status, on && styles.statusOn]}>
                  {consentStatusLine(status, consent.grantedAt[kind])}
                </Text>
                <View style={styles.action}>
                  {on ? (
                    <Button variant="secondary" fullWidth onPress={() => setConfirm(kind)} accessibilityLabel={`Withdraw ${s.label} consent`}>
                      Withdraw
                    </Button>
                  ) : (
                    <Button variant="primary" fullWidth onPress={() => void agree(kind)} accessibilityLabel={`Review and agree: ${s.label}`}>
                      Review and agree
                    </Button>
                  )}
                </View>
              </View>
            );
          })}

          <Text style={styles.footnote}>
            Withdrawing stops anything new being saved or sent. To delete what is already stored, use Delete Account
            in Account Settings, or write to support@forgelegacy.app.
          </Text>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => void Linking.openURL(HEALTH_DATA_URL).catch(() => {})}
            style={styles.linkWrap}
          >
            <Text style={styles.link}>Read the health data policy</Text>
          </Pressable>
        </ScrollView>
      )}

      <ConfirmSheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        headline={confirm ? CONSENT_SETTINGS[confirm].withdrawTitle : ''}
        body={confirm ? CONSENT_SETTINGS[confirm].withdrawBody : ''}
        confirmLabel="Withdraw"
        onConfirm={() => confirm && void withdraw(confirm)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 6 },

  intro: { fontSize: 13, lineHeight: 20, color: flColor.gray400, marginBottom: 16 },
  notice: { fontSize: 12.5, lineHeight: 19, color: flColor.gray400, marginBottom: 16 },

  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.labelInk,
    marginBottom: 11,
  },

  card: {
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    marginBottom: 11,
  },
  rowLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, marginTop: 2 },
  status: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400, marginTop: 10 },
  statusOn: { color: flColor.bronze300 },
  action: { marginTop: 12 },

  footnote: { fontSize: 12, lineHeight: 18, color: flColor.gray600, marginTop: 10 },
  linkWrap: { alignSelf: 'flex-start', paddingVertical: 12 },
  link: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
});
