import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ForgeSymbol, type SymbolName } from '@/components/forge/ForgeSymbol';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { forgeOr } from '@/constants/theme-scrim';
import { isAppAdmin } from '@/data/admin-live';
import { fetchPaywallOffer } from '@/data/entitlement-live';
import {
  HOLT_AI_OFFER_COPY as COPY,
  everyoneElseLine,
  offLabel,
  offPercent,
  regularRow,
} from '@/domain/billing/holt-ai-offer';
import {
  AI_ALLOWANCE_NOTE,
  AI_BENEFITS,
  AUTO_RENEWAL_NOTE,
  CADENCE_COPY,
  TRIAL_NOTE,
  cadenceOf,
  cadencesOn,
  rowForCadence,
  rowsFor,
  trialLabel,
  type Cadence,
  type StorePlan,
} from '@/domain/billing/plans-core';
import { LEGAL } from '@/domain/settings/content';
import { billing, billingAvailable } from '@/lib/billing';
import { ENTITLEMENT_RETRY_MESSAGE, useEntitlementState } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';

/**
 * The testers' Holt AI offer — Monetization Amendment 011.
 *
 * Opened once on the next launch for a comped tester (`useHoltAiOfferOnce`, `?from=announce`), and
 * reachable directly. It sells exactly one thing: the "Tester AI" add-on (MA7-D7), which adds `coach_ai`
 * to the Premium they already have for free.
 *
 * Visual language: P-8 (`subscription.tsx`, PO redesign 11-09) — the mountain plate, the ruled eyebrow,
 * the one serif line, the translucent plan cards. Same tokens, so Alabaster follows without a second pass:
 * bronze is earned (selected edge = `accentBorder`, labels = `labelInk`).
 *
 * ⚠ THE SERVER DECIDES WHETHER IT CAN BE BOUGHT. `my_paywall_offer()` must answer `tester_ai`; the page never
 *   fetches the add-on for anyone else, except an admin's read-only `?preview=1` (button disabled — the
 *   webhook would refuse a non-tester's purchase anyway, `_tester_ai_not_comped`).
 *
 * ⚠ EVERY PRICE IS THE STORE'S STRING (P8W-D3), and the billed amount is the largest price on each card
 *   (MA6-D10). The trial is named only when the store says this Apple ID is eligible (pricing sweep P1).
 *
 * ⚠ Apple 3.1.2: the renewal terms and Terms + Privacy sit beside the button.
 */

const AI_ICON: SymbolName[] = ['spark', 'target', 'eye', 'book', 'scale'];

/** P-8's card surfaces, so the two purchase screens are one family. One `forgeOr` per new surface. */
const CARD_FILL = forgeOr('rgba(12,16,19,0.84)', 'rgba(249,246,239,0.92)');
const CARD_FILL_ON = forgeOr('rgba(30,24,19,0.92)', 'rgba(251,247,238,0.97)');
const CARD_EDGE_ON = forgeOr('rgba(201,151,103,0.78)', flColor.accentBorder);

const PURCHASE_FAILED = 'Couldn’t start the purchase. Try again.';

export default function HoltAiOfferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { from, preview } = useLocalSearchParams<{ from?: string; preview?: string }>();
  /** Unasked (opened on launch), so it closes like a gate and names its way out. */
  const announced = from === 'announce';

  const { snapshot, status, refetch } = useEntitlementState();
  const { data: offer, settled: offerSettled, refetch: refetchOffer } = useQuery(fetchPaywallOffer, []);
  const { data: admin } = useQuery(isAppAdmin, []);

  const offered = offer?.offering === 'tester_ai';
  /* An admin's look at the page. The PO holds AI, so the preview must skip the "Holt AI is on" state too. */
  const previewAsked = preview === '1' && admin === true;
  const previewing = !offered && previewAsked;
  const showPlans = offered || previewing;

  const {
    data: testerPlans,
    settled: plansSettled,
    refetch: refetchPlans,
  } = useQuery(() => (showPlans ? billing().fetchPlans('tester_ai') : Promise.resolve(null)), [showPlans]);
  /* The regular price, read only to say what everyone else pays. Never offered from here. */
  const { data: regularPlans } = useQuery(
    () => (showPlans ? billing().fetchPlans('default') : Promise.resolve(null)),
    [showPlans],
  );

  /** Yearly is pre-selected (MA6-D10). */
  const [cadence, setCadence] = useState<Cadence>('annual');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const coachAi = status === 'ready' && snapshot?.coachAi === true && !previewAsked;
  const rows = rowsFor(testerPlans ?? [], 'ai_addon');
  const cadences = cadencesOn(rows);
  const activeCadence: Cadence = cadences.includes(cadence) ? cadence : (cadences[0] ?? 'annual');
  const selected = rowForCadence(rows, 'ai_addon', activeCadence);
  const trial = trialLabel(selected?.trialDays ?? null);
  const canBuy = offered && selected != null;
  const ctaLabel = trial ? `Start ${trial}` : COPY.cta;

  /** Same tail as P-8: the webhook lands seconds after Apple's sheet closes, sometimes after a "cancel". */
  const settle = () => {
    for (const ms of [1500, 4000, 8000, 15000, 30000, 60000]) {
      setTimeout(() => {
        refetch();
        refetchOffer();
      }, ms);
    }
  };

  const onBuy = async () => {
    if (!canBuy || !selected || busy) return;
    setBusy(true);
    setNotice(null);
    const outcome = await billing().purchase('tester_ai', selected.slot);
    setBusy(false);
    if (outcome === 'purchased') {
      setNotice('Welcome to Holt AI. Turning it on…');
      settle();
    } else if (outcome === 'pending') {
      setNotice('Waiting for approval. You’ll have Holt AI as soon as it’s approved.');
      settle();
    } else if (outcome === 'unavailable') {
      setNotice('Purchases aren’t available on this device yet.');
    } else if (outcome === 'failed') {
      setNotice(PURCHASE_FAILED);
      settle();
    } else {
      settle(); // a cancel can still complete after an Apple ID sign-in (P-8, sandbox 09-25)
    }
  };

  const header = announced ? { onClose: close } : { onBack: close };

  let body: ReactNode;
  if (status === 'loading' || (status === 'ready' && !coachAi && !offerSettled)) {
    body = (
      <View style={styles.centre} accessibilityLabel="Loading">
        <ActivityIndicator color={flColor.bronze400} />
      </View>
    );
  } else if (status === 'unknown') {
    body = (
      <View style={styles.centre}>
        <Text style={styles.centreText}>{ENTITLEMENT_RETRY_MESSAGE}</Text>
        <View style={styles.centreBtn}>
          <Button variant="secondary" onPress={refetch} accessibilityLabel="Try again">
            Try Again
          </Button>
        </View>
      </View>
    );
  } else if (coachAi) {
    /* Bought (here or anywhere else): say it plainly and get out of the way. */
    body = (
      <View style={styles.centre}>
        <Hero eyebrow="Holt AI" title={COPY.onTitle} body={COPY.onBody} />
        <View style={styles.centreBtn}>
          <Button variant="primary" onPress={close} accessibilityLabel={COPY.done}>
            {COPY.done}
          </Button>
        </View>
      </View>
    );
  } else if (!showPlans) {
    body = (
      <View style={styles.centre}>
        <Text style={styles.centreText}>{offer == null ? 'Couldn’t check your offer right now.' : COPY.notOffered}</Text>
        <View style={styles.centreBtn}>
          {offer == null ? (
            <Button variant="secondary" onPress={refetchOffer} accessibilityLabel="Try again">
              Try Again
            </Button>
          ) : (
            <Button variant="secondary" onPress={close} accessibilityLabel={COPY.done}>
              {COPY.done}
            </Button>
          )}
        </View>
      </View>
    );
  } else {
    body = (
      <ScrollView
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Hero eyebrow={COPY.eyebrow} title={COPY.title} body={COPY.body} />

        {!billingAvailable() ? (
          <Text style={styles.storeNote}>{COPY.noStore}</Text>
        ) : !plansSettled ? (
          <View style={[styles.card, styles.loadingCard]}>
            <ActivityIndicator color={flColor.bronze400} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyPlans}>Prices couldn’t be loaded right now.</Text>
            <Pressable onPress={refetchPlans} accessibilityRole="button" accessibilityLabel="Try again">
              <Text style={styles.emptyRetry}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.plans} accessibilityRole="radiogroup">
              {cadences.map((c) => {
                const row = rowForCadence(rows, 'ai_addon', c);
                return row ? (
                  <OfferCard
                    key={c}
                    row={row}
                    regular={regularRow(regularPlans, c)}
                    on={c === activeCadence}
                    onPress={() => setCadence(c)}
                  />
                ) : null;
              })}
            </View>

            {previewing ? <Text style={styles.previewNote}>{COPY.previewNote}</Text> : null}

            <View style={styles.cta}>
              <Button
                variant="primary"
                fullWidth
                disabled={!canBuy || busy}
                onPress={onBuy}
                accessibilityLabel={ctaLabel}
              >
                {busy ? 'Opening…' : ctaLabel}
              </Button>
            </View>
            {notice ? (
              <Text style={styles.notice} accessibilityLiveRegion="polite">
                {notice}
              </Text>
            ) : null}
            <Text style={styles.keeps}>Your Premium stays free either way.</Text>
            {/* MA6-D11 + Apple 3.1.2: trial and renewal terms, then Terms + Privacy, beside the button. */}
            <Text style={styles.fineprint}>
              {trial ? `${trial}. ${TRIAL_NOTE} ` : 'Cancel anytime. '}
              {AUTO_RENEWAL_NOTE}
            </Text>
            <LegalLinks />
          </>
        )}

        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={COPY.notNow} style={styles.linkRow}>
          <Text style={styles.notNow}>{COPY.notNow}</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>{COPY.benefitsLabel}</Text>
        <View style={styles.card}>
          {AI_BENEFITS.map((b, i) => (
            <View key={b.title} style={[styles.benefitRow, i > 0 && styles.rowBorder]}>
              <View style={styles.benefitIcon}>
                <ForgeSymbol name={AI_ICON[i] ?? 'spark'} size={18} color={flColor.bronze300} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDetail}>{b.detail}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.allowance}>{AI_ALLOWANCE_NOTE}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground
        paperTexture="atmospheric"
        image={SCREEN_BG.legacyMountains}
        imagePosition="top"
        imageOpacity={0.5}
        imageOpacityPaper={0.7}
        overlay={{ flat: 'rgba(5,5,5,0.30)' }}
      />
      <AppBar title="Holt AI" transparent {...header} />
      <View style={styles.headerRule} />
      {body}
    </View>
  );
}

/** "——— FOR OUR TESTERS ———", the serif line, one sentence. P-8's hero. */
function Hero({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <View style={styles.hero}>
      <View style={styles.ruledRow} accessibilityRole="header">
        <View style={styles.ruledLine} />
        <Text style={styles.overline}>{eyebrow}</Text>
        <View style={styles.ruledLine} />
      </View>
      <Text style={styles.tagline}>{title}</Text>
      <Text style={styles.principle}>{body}</Text>
    </View>
  );
}

/**
 * One card per cadence. The billed amount is the big number; the per-month figure, the discount against
 * the regular Premium AI price, and the trial are smaller, and all of it rides on the card's one label.
 */
function OfferCard({ row, regular, on, onPress }: { row: StorePlan; regular: StorePlan | null; on: boolean; onPress: () => void }) {
  const c = cadenceOf(row.slot);
  const copy = CADENCE_COPY[c];
  const perMonth = c === 'annual' ? row.pricePerMonthLabel : null;
  const off = offLabel(offPercent(row, regular));
  const trial = trialLabel(row.trialDays);
  const elseLine = everyoneElseLine(regular, c);
  const spoken = [
    copy.title,
    `${row.priceLabel} per ${copy.per}`,
    perMonth ? `${perMonth} per month` : null,
    off,
    trial,
    elseLine,
    on ? 'selected' : 'not selected',
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={spoken}
      style={({ pressed }) => [styles.tierCard, on && styles.tierCardOn, pressed && styles.pressed]}
    >
      <View style={[styles.radio, on && styles.radioOn]}>
        {on ? <EngravedIcon name="check" size={12} color={flColor.onBronze} /> : null}
      </View>
      <View style={styles.tierBody}>
        <View style={styles.tierHead}>
          <View style={styles.tierName}>
            <Text style={styles.tierTitle}>{copy.title}</Text>
            <Text style={styles.tierSub}>{trial ?? copy.cadence}</Text>
          </View>
          <View style={styles.tierPrice}>
            <Text style={styles.priceLine}>
              <Text style={[styles.priceText, on && styles.priceTextOn]}>{row.priceLabel}</Text>
              <Text style={styles.pricePer}>{` / ${copy.per}`}</Text>
            </Text>
            {perMonth ? <Text style={styles.perMonth}>{`${perMonth} / month`}</Text> : null}
            {off ? (
              <View style={styles.offPill}>
                <Text style={styles.offText}>{off}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {elseLine ? <Text style={styles.elseLine}>{elseLine}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Terms + Privacy (Apple 3.1.2) — the same two links P-8 shows beside its button. */
function LegalLinks() {
  return (
    <View style={styles.legal}>
      <Pressable onPress={() => void Linking.openURL(`https://${LEGAL.terms.host}`)} accessibilityRole="link" hitSlop={8}>
        <Text style={styles.legalText}>Terms of Service</Text>
      </Pressable>
      <Text style={styles.legalDot}>·</Text>
      <Pressable onPress={() => void Linking.openURL(`https://${LEGAL.privacy.host}`)} accessibilityRole="link" hitSlop={8}>
        <Text style={styles.legalText}>Privacy Policy</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  pressed: { opacity: 0.8 },
  headerRule: { height: 1, backgroundColor: flColor.bronzeBorderSubtle },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 16 },
  centreText: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
  centreBtn: { minWidth: 160 },
  body: { paddingHorizontal: 20 },

  hero: { alignItems: 'center', paddingTop: 26, paddingBottom: 22 },
  ruledRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', paddingHorizontal: 18 },
  ruledLine: { flex: 1, height: 1, backgroundColor: flColor.bronzeBorder },
  overline: { fontSize: 12, fontWeight: '600', letterSpacing: 3, textTransform: 'uppercase', color: flColor.labelInk },
  tagline: {
    fontFamily: flFont.display,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    color: flColor.cream100,
    textAlign: 'center',
    marginTop: 12,
  },
  principle: { fontSize: 15, lineHeight: 22, color: flColor.gray400, textAlign: 'center', marginTop: 12, maxWidth: 340 },

  plans: { gap: 12 },
  tierCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: CARD_FILL,
  },
  tierCardOn: { borderColor: CARD_EDGE_ON, backgroundColor: CARD_FILL_ON, boxShadow: flShadow.glowSubtle },
  radio: {
    width: 26,
    height: 26,
    borderRadius: flRadius.round,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.bronzeSolid },
  tierBody: { flex: 1, minWidth: 0 },
  tierHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tierName: { flex: 1, minWidth: 0 },
  tierTitle: { fontFamily: flFont.display, fontSize: 23, fontWeight: '700', color: flColor.cream100 },
  tierSub: { fontSize: 13, lineHeight: 18, color: flColor.gray400, marginTop: 3 },
  tierPrice: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  priceLine: { textAlign: 'right' },
  priceText: { fontFamily: flFont.display, fontSize: 24, fontWeight: '700', color: flColor.cream100 },
  priceTextOn: { color: flColor.selectedInk },
  pricePer: { fontSize: 13, fontWeight: '400', color: flColor.gray400 },
  perMonth: { fontSize: 13, color: flColor.gray400 },
  offPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
  },
  offText: { fontSize: 12, fontWeight: '700', color: flColor.selectedInk },
  elseLine: { fontSize: 12.5, lineHeight: 17, color: flColor.gray400, marginTop: 10 },

  loadingCard: { padding: 22, alignItems: 'center' },
  emptyPlans: { fontSize: 13, lineHeight: 20, color: flColor.gray400, padding: 16, textAlign: 'center' },
  emptyRetry: { fontSize: 13, fontWeight: '700', color: flColor.bronzeInk, textAlign: 'center', paddingBottom: 16 },
  storeNote: { fontSize: 13.5, lineHeight: 19, color: flColor.gray400, textAlign: 'center', marginTop: 4 },
  previewNote: { fontSize: 12.5, color: flColor.bronzeInk, textAlign: 'center', marginTop: 12 },

  cta: { marginTop: 18 },
  notice: { fontSize: 12.5, color: flColor.bronzeInk, textAlign: 'center', marginTop: 10 },
  keeps: { fontSize: 13, color: flColor.cream100, textAlign: 'center', marginTop: 12 },
  fineprint: { fontSize: 12, lineHeight: 17, color: flColor.gray400, textAlign: 'center', marginTop: 8, paddingHorizontal: 10 },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 6 },
  legalText: { fontSize: 11.5, color: flColor.gray600, textDecorationLine: 'underline' },
  legalDot: { fontSize: 11.5, color: flColor.gray600 },
  linkRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, minHeight: 44, marginTop: 6 },
  notNow: { fontSize: 15, fontWeight: '600', color: flColor.cream100, textDecorationLine: 'underline' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.labelInk,
    marginTop: 22,
    marginBottom: 10,
  },
  card: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
    overflow: 'hidden',
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: flColor.divider },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingHorizontal: 15, paddingVertical: 13 },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  benefitDetail: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400, marginTop: 3 },
  allowance: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600, paddingHorizontal: 15, paddingBottom: 13 },
});
