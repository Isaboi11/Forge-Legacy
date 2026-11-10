import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { Button } from '@/components/forge/composites/Button';
import { ForgeSymbol, type SymbolName } from '@/components/forge/ForgeSymbol';
import { ScreenBackground } from '@/components/screen-background';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { isAppAdmin } from '@/data/admin-live';
import { fetchCapConfig, fetchPaywallOffer, setMyPremiumAi } from '@/data/entitlement-live';
import {
  AI_ALLOWANCE_NOTE,
  AI_BENEFITS,
  AUTO_RENEWAL_NOTE,
  CADENCE_COPY,
  PAYWALL_FAQ,
  REASSURANCE,
  RECOMMENDED_BADGE,
  TIER_CARD_COPY,
  TIER_COPY,
  TIER_DISCLOSURE,
  TIER_NOTE_SHORT,
  TRIAL_NOTE,
  cadenceOf,
  cadencesOn,
  compactComparisonRows,
  premiumBenefitLines,
  rowForCadence,
  tierCardLines,
  tierOf,
  tierSaving,
  tiersOn,
  trialLabel,
  usageIsNear,
  usageRows,
  zeroPriceLabel,
  type BenefitLine,
  type Cadence,
  type CardTier,
  type CompactRow,
  type PlanTier,
  type StorePlan,
  type UsageRow,
} from '@/domain/billing/plans-core';
import type { EngravedName } from '@/components/forge/primitives/icons/EngravedIcon';
import type { CapKey, Caps } from '@/domain/entitlement/caps-core';
import { LEGAL } from '@/domain/settings/content';
import { billing, billingAvailable, MANAGE_ELSEWHERE_NOTE, manageSubscriptionsUrl, openManageSubscriptions } from '@/lib/billing';
import { ENTITLEMENT_RETRY_MESSAGE, useEntitlementState } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';
import { forgeOr } from '@/constants/theme-scrim';

/**
 * P-8 Subscription — the purchase and management surface.
 *
 * Spec: `Docs/P-8-Subscription-Wireframe-Spec.md` v1.1 (LOCKED), which §11 extended with the plan picker.
 * Visual language: `Forge Subscription.dc.html`. Numbers and claims: `Monetization-Architecture-
 * Amendment-003` via server config; plans and offers: Amendments 006 (Free → Premium → Premium AI) and
 * 007 (no lifetime; Early Bird for the first 100; the testers' AI add-on). Launch Checklist item 4.1.
 *
 * ══ ⭐ DECISION FIRST — THE PO'S REDESIGN, 2026-09-25 ══
 *
 * The screen used to read hero → benefits → comparison → usage → plans → price → button, so the price sat
 * two screens down. It now reads, top to bottom:
 *
 *   hero → Premium / Premium AI → founding-price note → yearly / monthly → START TRIAL → renewal terms →
 *   "See what's included" → benefits → AI upsell (or AI benefits) → Free vs. Premium → "Your data is
 *   yours" → usage → FAQ → Restore → Terms · Privacy
 *
 * Nothing was removed; the explanations moved below the decision. Two contextual moves: the usage card
 * jumps up beside the price once any allowance is 80% spent (it is now this athlete's reason to buy), and
 * a compact buy bar appears only after the main button has scrolled away.
 *
 * ══ ⚠ WHICH PRICES THIS ATHLETE SEES IS THE SERVER'S ANSWER ══
 *
 * `my_paywall_offer()` (0214) names the RevenueCat offering — regular, Early Bird, or the testers' add-on —
 * or nothing, when the athlete already holds a subscription in a group this screen must not sell them a
 * second of. A Premium subscriber is offered only the AI step, inside their own group.
 *
 * ══ ⚠ THIS SCREEN CANNOT MAKE ANYBODY PREMIUM ══
 *
 * It sells; it does not entitle. `src/lib/entitlement.tsx` remains the ONE answer to "is this athlete
 * entitled?" and it reads the server. A completed purchase here only means the *store* believes they
 * paid — so every purchase and restore ends by re-reading entitlement rather than by setting state.
 *
 * ══ ⚠ NO PRICE STRING EXISTS IN THIS FILE ══
 *
 * P-8 §80 and P8W-D3 are binding. Every price is the localized string the store returned; the only
 * derived figure is the annual saving percentage, computed in `plans-core.ts` from two platform prices
 * and rendered as nothing at all when it cannot be stood behind. The button names the trial ("Start
 * 7-day free trial") only when the store says the selected plan carries one, and never names a price.
 *
 * ══ ⚠ P8W-D4 STILL HOLDS: WHAT PREMIUM DOES NOT INCLUDE SITS ABOVE EVERY BUY BUTTON ══
 *
 * The PO asked for the full sentence to leave the sticky bar. The rule is about its existence and place,
 * not its wording, so: above the main button it is the hero's own sentence ("Upgrade to Premium AI for
 * the full AI coach"), and the sticky bar carries `TIER_NOTE_SHORT` — one short line, Premium only.
 *
 * ══ DELTAS vs the `.dc`, all deliberate ══
 *  · Header reads "Subscription", not "Membership" — §2.1/§7 lock it twice, including in the a11y table.
 *  · The social-proof line ("Thousands of photos. Years of chapters.") is DROPPED — an unverifiable claim.
 *  · Benefit rows are the ones the caps enforce, not the `.dc`'s analytics/Communities/share-layout list.
 *  · A per-month price is rendered only when the STORE supplies one.
 *  · No mountain or other artwork in the hero — PO, 2026-09-25: the stone texture is the foundation.
 *  · The Early Bird seat count is gone (PO: no inventory-style scarcity). "Founding price" states the
 *    locked promise instead — MA7-D3: the price holds for as long as they stay subscribed.
 */

/*
 * ══ ⭐ THE PO'S SECOND REDESIGN, 2026-11-09 — CADENCE FIRST, THEN THREE PLAN CARDS ══
 *
 * Mountains behind the hero (the Legacy plate, both themes), "Everything you build, kept for life.",
 * Yearly / Monthly, then Free · Premium · Premium AI as cards the athlete picks between, the button,
 * the renewal terms, "Continue with Free", and a five-icon "What's included" row that scrolls to the
 * details. Free is a card: choosing it makes the button "Continue with Free" and buys nothing.
 *
 * Deliberate deltas from the mockup:
 *  · The Premium badge says "Recommended", not "Most popular" — nobody has bought yet (RECOMMENDED_BADGE).
 *  · The Premium card keeps one small line, "Holt AI, the AI coach, is in Premium AI." — P8W-D4 needs what
 *    Premium does NOT include above the buy button.
 *  · The button says "Start 7-day free trial" only when the store says the selected plan carries one;
 *    Monthly has none (MA6-D11), so it reads "Subscribe" there.
 *  · "Founding price" stays on the Early Bird offering (MA7-D3), as one short line under the switch.
 *  · Terms + Privacy stay beside the renewal terms (Apple 3.1.2).
 */

/** The five things every plan is built around, under "What's included". Tapping the row shows the details. */
const INCLUDED: readonly { icon: EngravedName; label: string }[] = [
  { icon: 'dumbbell', label: 'Training' },
  { icon: 'book', label: 'Programs' },
  { icon: 'lightbulb', label: 'Coach Holt' },
  { icon: 'mountain', label: 'Transformation' },
  { icon: 'people', label: 'Squads' },
];

/**
 * The card fill. Translucent so the mountain plate reads through, as in the mockup. A new surface, so it
 * needs a value in each theme — one `forgeOr`, not a colour applied to both.
 */
const CARD_FILL = forgeOr('rgba(12,16,19,0.84)', 'rgba(249,246,239,0.92)');
const CARD_FILL_ON = forgeOr('rgba(30,24,19,0.92)', 'rgba(251,247,238,0.97)');
/** Selected edge: brighter bronze on Forge; Alabaster's earned bronze (`accentBorder`). */
const CARD_EDGE_ON = forgeOr('rgba(201,151,103,0.78)', flColor.accentBorder);
const BADGE_FILL = forgeOr('#2A2017', '#F3E8D3');
/** Check marks: bronze on Forge; taupe on Alabaster, where bronze is kept for selection (PO 09-26). */
const CHECK_INK = forgeOr(flColor.bronze300, flColor.labelInk);

function Check({ size = 13, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return <EngravedIcon name="check" size={size} color={color} />;
}

/** The engraved set has no infinity; this is one stroke in the same weight. */
function InfinityMark({ size = 24, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 8.5c-2 0-3.5 1.5-3.5 3.5S5 15.5 7 15.5c3.2 0 6.8-7 10-7 2 0 3.5 1.5 3.5 3.5S19 15.5 17 15.5c-3.2 0-6.8-7-10-7Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * The icon and supporting sentence for each benefit, keyed by the cap that makes it true.
 *
 * ⚠ KEYED, NOT INDEXED. The headline of each row comes from `premiumBenefitLines()` so the squad number
 * tracks config; pairing the two lists by array position would mislabel every row below any reordering.
 *
 * Basic Holt gets its own title (PO 09-25): "Unlimited Basic Holt programs, including in your workout"
 * made Basic Holt, Holt AI, Basic Holt programs and Basic Holt days read as four products. It is one —
 * the rulebook coach — and the numbers live in the comparison table.
 */
const BENEFIT_META: Partial<Record<CapKey, { icon: SymbolName; detail: string; title?: string; note?: string }>> = {
  photos: { icon: 'book', detail: 'Every progress photo and video kept, with no ceiling to work around.' },
  programs: { icon: 'dumbbell', detail: 'Build, generate and receive as many programs as your training asks for.' },
  squads: { icon: 'squad', detail: 'Lead more than one squad at a time.' },
  imports: { icon: 'spark', detail: 'Bring a coach’s spreadsheet across whenever you need to.' },
  holt_programs: {
    icon: 'medal',
    title: 'Basic Holt coaching',
    detail: 'Rulebook-based coaching, program guidance and in-workout support.',
    note: 'Included with Premium.',
  },
};

const USAGE_ICON: Partial<Record<CapKey, SymbolName>> = {
  programs: 'dumbbell',
  photos: 'book',
  squads: 'squad',
  imports: 'spark',
  holt_programs: 'medal',
  holt_days_per_month: 'medal',
};

const AI_ICON: SymbolName[] = ['spark', 'target', 'eye', 'book'];

/**
 * The hero (PO mockup 11-09). One message for the whole page — the plan cards below carry each plan's
 * specifics, so the hero no longer changes with the selection.
 */
const FREE_HERO = {
  eyebrow: 'Forge Premium',
  title: 'Everything you build,\nkept for life.',
  body: 'More room to train. More tools to progress.\nA lasting legacy.',
};

const PURCHASE_FAILED = 'Couldn’t start the purchase. Try again.';

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /**
   * ⚠ THE ONLY DIFFERENCE BETWEEN THE TWO ENTRY CONTEXTS (§2.3), AND IT IS NOT COSMETIC.
   *
   * A back chevron promises a previous screen in this stack; a close button promises a self-contained
   * surface to dismiss. Via Account Settings the first is true; via an M-7 gate the athlete never opened
   * Settings, and the correct return is the surface that triggered the upsell — which then re-evaluates
   * its own limit, per M-7's contract.
   */
  const { from } = useLocalSearchParams<{ from?: string }>();
  /* `nudge` = Holt's one upgrade line (Monetization Amendment 010). Unasked, so it closes like a gate. */
  const viaGate = from === 'gate' || from === 'nudge';
  /** Shown once after onboarding, unasked (ONB-A7-D2) — so it closes like a gate AND offers Free by name. */
  const viaOnboarding = from === 'onboarding';

  const { snapshot, status, refetch } = useEntitlementState();
  const { data: config } = useQuery(fetchCapConfig, []);
  /** Which offering, decided by the server (0214, Amendment 007). Never chosen here. */
  const { data: offer, settled: offerSettled, refetch: refetchOffer } = useQuery(fetchPaywallOffer, []);
  const offering = offer?.offering ?? null;
  const { data: storePlans, refetch: refetchPlans } = useQuery(
    () => (offering ? billing().fetchPlans(offering) : Promise.resolve(null)),
    [offering],
  );
  const { data: admin } = useQuery(isAppAdmin, []);

  /** The card the athlete tapped. Null until they tap one; the derivation below picks the default. */
  const [chosenTier, setChosenTier] = useState<CardTier | null>(null);
  /** Yearly is pre-selected on every mount (MA6-D10). */
  const [cadence, setCadence] = useState<Cadence>('annual');
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  /** The inline messages §4 specifies for restore. Never an alert — the screen stays where it is. */
  const [notice, setNotice] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /**
   * Where the page's landmarks sit in the scroll content, written by `onLayout` and read only inside
   * handlers — never during render (react-compiler rule).
   */
  const scrollRef = useRef<ScrollView>(null);
  const marks = useRef({ pricing: 0, ctaEnd: 0, included: 0 });
  /** The compact buy bar shows only once the main button has scrolled out of view. */
  const [showSticky, setShowSticky] = useState(false);
  /** The bronze pill of the Yearly / Monthly switch, gliding between segments (~200 ms, PO 09-25). */
  const [pill] = useState(() => new Animated.Value(0));
  const [switchWidth, setSwitchWidth] = useState(0);

  /**
   * ⚠ RE-CHECKED ON FOREGROUND (§5.2), BECAUSE "MANAGE SUBSCRIPTION" LEAVES THE APP.
   *
   * The athlete can cancel in OS settings and come straight back. Without this the screen would go on
   * showing Premium to somebody who just ended it — and the next thing they would do is doubt the app
   * rather than the timing.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        refetch();
        refetchOffer();
      }
    });
    return () => sub.remove();
  }, [refetch, refetchOffer]);

  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/account-settings');
  }, [router]);

  const tier = status === 'ready' ? snapshot?.tier : null;
  const isPremium = tier === 'PREMIUM';
  const coachAi = snapshot?.coachAi === true;

  /**
   * What can be bought from here. Free: Premium and Premium AI. Premium: only the AI step — Premium AI in
   * the athlete's own group, or the testers' add-on — and nothing once they hold AI. The server has
   * already chosen the offering; this only drops tabs that would sell someone what they hold.
   */
  const plans = storePlans ?? [];
  const tiers = tiersOn(plans).filter((t) =>
    isPremium ? t !== 'premium' && !coachAi : t !== 'ai_addon',
  );
  /**
   * ⚠ DERIVED, NOT AN EFFECT. A `setState` in an effect body is a react-compiler error in this repo, and
   * deriving means a late-arriving offering lands pre-selected rather than empty.
   *
   * The cards: Free (only for a Free athlete — never a "downgrade" offer to someone paying) and then every
   * tier this offering sells. Premium starts selected when it is on sale; otherwise the first tier.
   */
  const cadences = cadencesOn(plans.filter((p) => tiers.includes(tierOf(p.slot))));
  const activeCadence: Cadence = cadences.includes(cadence) ? cadence : (cadences[0] ?? 'annual');
  /*
   * ⚠ NO STORE HERE (the web, a build without StoreKit): the plans are still worth comparing, so the three
   * cards render WITHOUT prices and the button is replaced by where to buy. Nothing is invented — a card
   * with no store row simply has no price. Never for a Premium athlete (nothing to compare).
   */
  const browseOnly = tiers.length === 0 && !isPremium && !billingAvailable();
  const cardTiers: CardTier[] = !isPremium && tiers.length > 0 ? ['free', ...tiers] : browseOnly ? ['free', 'premium', 'premium_ai'] : tiers;
  const defaultTier: CardTier | null = tiers.includes('premium') || browseOnly ? 'premium' : (tiers[0] ?? null);
  const activeTier: CardTier | null = chosenTier && cardTiers.includes(chosenTier) ? chosenTier : defaultTier;
  const paidTier: PlanTier | null = activeTier && activeTier !== 'free' ? activeTier : null;
  const freeChosen = activeTier === 'free';
  const selectedPlan = paidTier ? rowForCadence(plans, paidTier, activeCadence) : null;
  const selected = selectedPlan?.slot ?? null;
  const canBuy = offering != null && selectedPlan != null;
  const trial = trialLabel(selectedPlan?.trialDays ?? null);
  const ctaLabel = freeChosen ? 'Continue with Free' : trial ? `Start ${trial}` : 'Subscribe';
  const aiSelected = activeTier === 'premium_ai' || activeTier === 'ai_addon';

  /** Switch Yearly / Monthly. Every change comes through here, so the pill always glides to match. */
  const selectCadence = (c: Cadence) => {
    const index = cadences.indexOf(c);
    if (index >= 0) Animated.timing(pill, { toValue: index, duration: 200, useNativeDriver: true }).start();
    setCadence(c);
  };

  /** Pick a plan card; `reveal` scrolls back up to the cards (the "Want the full AI coach?" door). */
  const selectTier = (t: CardTier, reveal = false) => {
    setChosenTier(t);
    if (reveal) scrollRef.current?.scrollTo({ y: Math.max(0, marks.current.pricing - 16), animated: true });
  };

  /**
   * ⚠ THE STORE CONFIRMS BEFORE WE DO. The webhook writes the purchase a moment after Apple's sheet
   * closes, so entitlement is re-read a few times rather than once — otherwise a paying athlete sees
   * "Free" for the first seconds after paying, which reads as being charged for nothing.
   *
   * ⚠ AND IT RUNS AFTER EVERY ATTEMPT, NOT ONLY A CONFIRMED ONE (sandbox test, 2026-09-25). When Apple
   *   stops mid-purchase to ask for the Apple ID password, StoreKit can hand the app an error or a
   *   cancel and then complete the transaction in the background. The webhook landed 5 s later, but the
   *   screen had been told "no purchase" and never re-read — it showed Free until a force-quit. Reads are
   *   free and harmless, so the tail is a full minute and every outcome but "unavailable" starts it.
   */
  const settle = () => {
    for (const ms of [1500, 4000, 8000, 15000, 30000, 60000]) {
      setTimeout(() => {
        refetch();
        refetchOffer();
      }, ms);
    }
  };

  const onContinue = async () => {
    if (!selected || !offering || busy) return;
    setBusy('purchase');
    setNotice(null);
    const outcome = await billing().purchase(offering, selected);
    setBusy(null);

    // Cancelling is not an error and produces no message (§5.1.3).
    if (outcome === 'purchased') {
      setNotice(`Welcome to ${tierOf(selected) === 'premium' ? 'Forge Premium' : 'Holt AI'}.`);
      settle();
    } else if (outcome === 'pending') {
      setNotice('Waiting for approval. You’ll have access as soon as it’s approved.');
      settle();
    } else if (outcome === 'unavailable') {
      setNotice('Purchases aren’t available on this device yet.');
    } else if (outcome === 'failed') {
      setNotice(PURCHASE_FAILED);
      settle();
    } else {
      // Cancelled — still re-read, quietly: an Apple ID sign-in can report a cancel and then complete.
      settle();
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy('restore');
    setNotice(null);
    const outcome = await billing().restore();
    setBusy(null);

    if (outcome === 'restored') {
      setNotice('Purchase restored.');
      settle();
    } else if (outcome === 'none') {
      setNotice('No previous purchases found.');
    } else if (outcome === 'unavailable') {
      setNotice('Purchases aren’t available on this device yet.');
    } else {
      setNotice('Couldn’t reach the store. Try again.');
    }
  };

  /**
   * PREMIUM AI — the admins' free switch for testing (0203; admins-only since 0214, when Premium AI went
   * on sale). The server refuses anyone else, so it is not drawn for anyone else.
   */
  const serverAi = snapshot?.coachAi === true;
  const [aiPending, setAiPending] = useState<boolean | null>(null);
  const aiOn = aiPending ?? serverAi;
  const onToggleAi = async () => {
    const next = !aiOn;
    setAiPending(next);
    setNotice(null);
    try {
      await setMyPremiumAi(next);
      refetch();
    } catch {
      setNotice('Couldn’t change Premium AI. Try again.');
    } finally {
      setAiPending(null);
    }
  };

  const onManage = async () => {
    const opened = await openManageSubscriptions();
    if (!opened) setNotice('Couldn’t open your subscription settings.');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const end = marks.current.ctaEnd;
    const next = end > 0 && e.nativeEvent.contentOffset.y > end;
    setShowSticky((prev) => (prev === next ? prev : next));
  };
  const onPricingLayout = (e: LayoutChangeEvent) => {
    marks.current.pricing = e.nativeEvent.layout.y;
  };
  const onCtaEndLayout = (e: LayoutChangeEvent) => {
    marks.current.ctaEnd = e.nativeEvent.layout.y;
  };
  const onIncludedLayout = (e: LayoutChangeEvent) => {
    marks.current.included = e.nativeEvent.layout.y;
  };
  const toIncluded = () => scrollRef.current?.scrollTo({ y: Math.max(0, marks.current.included - 12), animated: true });

  const header = viaGate || viaOnboarding
    ? { onClose: back, onBack: undefined }
    : { onBack: back, onClose: undefined };

  /** Why there is no picker, when there is none. Each answer is true; none invents a price. */
  const pickerEmpty: PickerEmpty | null =
    tiers.length > 0
      ? null
      : !billingAvailable()
        ? 'unavailable'
        : !offerSettled
          ? 'loading'
          : offer == null
            ? 'offer-failed'
            : offering != null && storePlans == null
              ? 'plans-failed'
              : 'unavailable';
  const retryPicker = pickerEmpty === 'offer-failed' ? refetchOffer : refetchPlans;

  const paid = config?.paid ?? null;
  const benefits = premiumBenefitLines(paid);
  const usage = usageRows(snapshot?.caps ?? null, snapshot?.usage ?? null);
  const usageNear = usageIsNear(usage);
  const comparison = compactComparisonRows(config?.free ?? null, paid);
  /* A "couldn't start" that the store went on to complete is no longer true once Premium lands. */
  const shownNotice = notice && !(notice === PURCHASE_FAILED && isPremium) ? notice : null;
  const segment = cadences.length > 0 && switchWidth > 0 ? (switchWidth - 8) / cadences.length : 0;

  /*
   * ── THE DECISION ZONE ── Yearly/Monthly → plan cards → button → terms. Returned as a fragment so its
   * landmarks are direct children of the scroll content, which is what makes their `onLayout` y a scroll
   * position.
   */
  const decision = (
    <>
      {cadences.length > 1 ? (
        <View
          style={styles.tabs}
          accessibilityRole="tablist"
          onLayout={(e) => setSwitchWidth(e.nativeEvent.layout.width)}
        >
          {segment > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabPill,
                {
                  width: segment,
                  transform: [{ translateX: pill.interpolate({ inputRange: [0, 1], outputRange: [0, segment] }) }],
                },
              ]}
            />
          ) : null}
          {cadences.map((c) => {
            const on = c === activeCadence;
            return (
              <Pressable
                key={c}
                onPress={() => selectCadence(c)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={CADENCE_COPY[c].title}
                style={styles.tab}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{CADENCE_COPY[c].title}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View onLayout={onPricingLayout} />

      {/* ⚠ STATES THE LOCKED PROMISE, NOT A COUNT (MA7-D3). Only on the Early Bird offering, where it is true. */}
      {offering === 'early_bird' && tiers.length > 0 ? (
        <Text style={styles.foundingLine} accessibilityLabel="Founding price. Keep this price for as long as you stay subscribed.">
          <Text style={styles.foundingTitle}>Founding price</Text> · Keep it for as long as you stay subscribed.
        </Text>
      ) : null}

      <TierCards
        empty={browseOnly ? null : pickerEmpty}
        onRetry={retryPicker}
        cards={cardTiers}
        plans={plans}
        cadence={activeCadence}
        active={activeTier}
        recommended={cardTiers.length > 1 && cardTiers.includes('premium') ? 'premium' : null}
        free={config?.free ?? null}
        paid={paid}
        onSelect={selectTier}
      />
      {browseOnly && !freeChosen ? (
        <Text style={styles.browseNote}>Plans are bought in the Forge Legacy app on iPhone.</Text>
      ) : null}

      {canBuy || freeChosen ? (
        <View style={styles.cta}>
          <Button
            variant="primary"
            fullWidth
            disabled={busy != null}
            onPress={freeChosen ? back : onContinue}
            accessibilityLabel={ctaLabel}
          >
            {busy === 'purchase' ? 'Opening…' : ctaLabel}
          </Button>
        </View>
      ) : null}
      {shownNotice ? (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {shownNotice}
        </Text>
      ) : null}
      {tiers.length > 0 ? (
        <>
          {/* MA6-D11: the trial terms sit beside the button. Every plan renews (MA7-D1), so that line always shows. */}
          <Text style={styles.fineprint}>
            {trial ? `${trial}. ${TRIAL_NOTE} ` : 'Cancel anytime. '}
            {AUTO_RENEWAL_NOTE}
          </Text>
          {/* Apple 3.1.2: Terms + Privacy links in the purchase flow, beside the renewal terms — not only at the foot. */}
          <LegalLinks />
        </>
      ) : null}
      {!isPremium && !freeChosen ? (
        /* Leaving is a named, full-contrast choice on every Free visit — not a faint × alone (ONB-A7-D2). */
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Continue with Free" style={styles.linkRow}>
          <Text style={styles.freeText}>Continue with Free</Text>
        </Pressable>
      ) : null}
      <View onLayout={onCtaEndLayout} />
    </>
  );

  const usageCard = usage.length > 0 ? <UsageCard rows={usage} near={usageNear} /> : null;

  return (
    <View style={styles.root}>
      {/* The mountain plate behind the hero (PO mockup 11-09) — the Legacy screen's own, recoloured for
          Alabaster by `scripts/paper-plates`, so both themes carry it. Reverses the 09-25 "no artwork". */}
      <ScreenBackground
        paperTexture="atmospheric"
        image={SCREEN_BG.legacyMountains}
        imagePosition="top"
        imageOpacity={0.5}
        imageOpacityPaper={0.7}
        overlay={{ flat: 'rgba(5,5,5,0.30)' }}
      />
      <AppBar title="Subscription" transparent {...header} />
      <View style={styles.headerRule} />

      {status === 'loading' ? (
        /* §3.1 — the one state where content is intentionally withheld. Nothing renders until the
           entitlement check resolves, because every section below depends on which tier is being read. */
        <View style={styles.centre} accessibilityLabel="Loading subscription status">
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : status === 'unknown' ? (
        /*
         * ⚠ NOT MODELLED BY THE SPEC, AND IT MUST NOT DEFAULT EITHER WAY.
         *
         * Drawing the Free state would show an upsell to a Premium athlete whose network dropped, which
         * M-7 §10 forbids outright; drawing the Premium state would tell a Free athlete they had already
         * paid. `unknown` is a real third state everywhere else in this system (`caps-core.ts`), and the
         * honest answer on a purchase screen is the same one the gates give: say so, offer the retry.
         */
        <View style={styles.centre}>
          <Text style={styles.retryText}>{ENTITLEMENT_RETRY_MESSAGE}</Text>
          <View style={styles.retryBtn}>
            <Button variant="secondary" onPress={refetch} accessibilityLabel="Try again">
              Try Again
            </Button>
          </View>
        </View>
      ) : (
        <>
          <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets
            ref={scrollRef}
            contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom + (canBuy ? 96 : 0) }]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={32}
          >
            {/* HERO — ruled eyebrow, the one serif line, a short sentence. The Forge mark lives in the header now. */}
            <View style={styles.hero}>
              {isPremium ? (
                <>
                  <RuledEyebrow>{coachAi ? 'Forge Premium AI' : 'Forge Premium'}</RuledEyebrow>
                  <Text style={styles.tagline}>Your legacy,{'\n'}preserved for life.</Text>
                </>
              ) : (
                <>
                  <RuledEyebrow>{FREE_HERO.eyebrow}</RuledEyebrow>
                  <Text style={styles.tagline}>{FREE_HERO.title}</Text>
                  <Text style={styles.principle}>{FREE_HERO.body}</Text>
                </>
              )}
            </View>

            {isPremium ? (
              <>
                <PlanCard
                  kind={snapshot?.premiumKind ?? null}
                  until={snapshot?.premiumUntil ?? null}
                  seat={snapshot?.founderSeat ?? null}
                  coachAi={coachAi}
                />
                {/* The one thing left to offer a Premium athlete: the AI step, from their own group only.
                    ⚠ SHOWN EVEN WITH NO PLANS TO READ (QA holt-16): "See Premium AI" from Form Check landed
                    here, and with no store (the web) or a failed read the section vanished — no AI plan, no
                    price, no reason. The picker's own empty state now says why, under what AI adds. */}
                {!coachAi ? (
                  <>
                    <SectionLabel>Add Holt AI</SectionLabel>
                    <Text style={styles.sectionLead}>{TIER_DISCLOSURE[paidTier ?? 'premium_ai']}</Text>
                    {decision}
                    <AiBenefits />
                  </>
                ) : null}
                {/* A Premium AI athlete is paying for the AI — the page named none of it, only Premium's list
                    (QA 09-26 holtai-20). The same `AI_BENEFITS` the plan picker sells, nothing new. */}
                {coachAi ? (
                  <>
                    <SectionLabel>What Premium AI adds</SectionLabel>
                    <AiBenefits />
                  </>
                ) : null}
                {/* No comparison table and no usage review in Premium (§3.4) — nothing left to compare. */}
                <SectionLabel>What Premium unlocks</SectionLabel>
                <BenefitList benefits={benefits} />
                <OwnershipCard />
                {/* No store on the web, so no button — it says where the subscription is managed instead
                    (settings-04) — and only for a store subscription: a founder seat or a granted Premium
                    has nothing on the iPhone to manage. The native deep link is untouched. */}
                {manageSubscriptionsUrl() == null ? (
                  snapshot?.premiumKind === 'MONTHLY' || snapshot?.premiumKind === 'ANNUAL' ? (
                    <Text style={styles.manageNote}>{MANAGE_ELSEWHERE_NOTE}</Text>
                  ) : null
                ) : (
                  <View style={styles.manage}>
                    <Button variant="secondary" fullWidth onPress={onManage} accessibilityLabel="Manage Subscription">
                      Manage Subscription
                    </Button>
                  </View>
                )}
                {/* Without the AI section above, which carries its own notice under its button. */}
                {coachAi && !canBuy && shownNotice ? <Text style={styles.notice}>{shownNotice}</Text> : null}
              </>
            ) : (
              <>
                {decision}

                {/* Near a limit, usage is this athlete's reason to buy — so it moves up beside the price. */}
                {usageNear ? (
                  <>
                    <SectionLabel>Your usage</SectionLabel>
                    {usageCard}
                  </>
                ) : null}

                {/* WHAT'S INCLUDED — five icons (PO mockup 11-09); tapping the row scrolls to the details. */}
                <View style={styles.includedHead}>
                  <RuledEyebrow>What’s included</RuledEyebrow>
                </View>
                <Pressable
                  onPress={toIncluded}
                  accessibilityRole="button"
                  accessibilityLabel={`What’s included: ${INCLUDED.map((i) => i.label).join(', ')}. Shows the details.`}
                  style={({ pressed }) => [styles.includedRow, pressed && styles.pressed]}
                >
                  {INCLUDED.map((i) => (
                    <View key={i.label} style={styles.includedItem}>
                      <EngravedIcon name={i.icon} size={26} color={CHECK_INK} />
                      <Text style={styles.includedLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {i.label}
                      </Text>
                    </View>
                  ))}
                </Pressable>

                <View onLayout={onIncludedLayout} />
                {aiSelected ? (
                  <>
                    <SectionLabel>What Premium AI adds</SectionLabel>
                    <Text style={styles.sectionLead}>Everything in Premium, plus:</Text>
                    <AiBenefits />
                  </>
                ) : (
                  <>
                    <SectionLabel>What Premium unlocks</SectionLabel>
                    <BenefitList benefits={benefits} />
                    {tiers.includes('premium_ai') ? (
                      <>
                        <SectionLabel>Want the full AI coach?</SectionLabel>
                        <Pressable
                          onPress={() => selectTier('premium_ai', true)}
                          accessibilityRole="button"
                          accessibilityLabel="Holt AI. Included with Premium AI. Shows Premium AI plans."
                          style={({ pressed }) => [styles.card, styles.upsell, pressed && styles.pressed]}
                        >
                          <View style={styles.benefitIcon}>
                            <ForgeSymbol name="spark" size={18} color={flColor.bronze300} />
                          </View>
                          <View style={styles.benefitText}>
                            <Text style={styles.benefitTitle}>Holt AI</Text>
                            <Text style={styles.benefitDetail}>
                              Ask your coach anything in plain language. Analyze photos, make program changes, answer training questions and adapt your plan.
                            </Text>
                            <Text style={styles.upsellLink}>Included with Premium AI →</Text>
                          </View>
                        </Pressable>
                      </>
                    ) : null}
                  </>
                )}

                {comparison.length > 0 ? (
                  <>
                    <SectionLabel>Free vs. Premium</SectionLabel>
                    <ComparisonTable rows={comparison} />
                  </>
                ) : null}
                <OwnershipCard />

                {!usageNear && usageCard ? (
                  <>
                    <SectionLabel>Your usage</SectionLabel>
                    {usageCard}
                  </>
                ) : null}
              </>
            )}

            <SectionLabel>FAQs</SectionLabel>
            <View style={styles.card}>
              {PAYWALL_FAQ.map((f, i) => {
                const open = openFaq === i;
                return (
                  <View key={f.q} style={i > 0 && styles.rowBorder}>
                    <Pressable
                      onPress={() => setOpenFaq(open ? null : i)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      accessibilityLabel={f.q}
                      style={styles.faqRow}
                    >
                      <Text style={styles.faqQ}>{f.q}</Text>
                      <EngravedIcon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={flColor.gray600} />
                    </Pressable>
                    {open ? <Text style={styles.faqA}>{f.a}</Text> : null}
                  </View>
                );
              })}
            </View>

            {admin === true ? (
              <>
                <SectionLabel>Premium AI (admin)</SectionLabel>
                <View style={[styles.card, styles.aiRow]}>
                  <View style={styles.aiText}>
                    <Text style={styles.benefitTitle}>Premium AI</Text>
                    <Text style={styles.benefitDetail}>Admin switch for testing. No charge.</Text>
                  </View>
                  {/* The Settings switch (settings-24/18) — one look, and its on/off reaches a screen reader on web. */}
                  <SettingsToggle
                    value={aiOn}
                    onChange={() => {
                      if (aiPending == null) void onToggleAi();
                    }}
                    accessibilityLabel="Premium AI"
                  />
                </View>
              </>
            ) : null}

            {/* Always available, in both states (§5.3). Visually secondary — never inside the bronze button. */}
            <RestoreLink busy={busy === 'restore'} onPress={onRestore} />
            <LegalLinks />
          </ScrollView>

          {/*
            THE COMPACT BUY BAR — only once the main button has scrolled away (PO 09-25).
            ⚠ P8W-D4: what Premium does not include still sits above this button, in one short line.
          */}
          {canBuy && showSticky && selectedPlan && paidTier ? (
            <View style={[styles.commitBar, { paddingBottom: 12 + insets.bottom }]}>
              {shownNotice ? <Text style={styles.notice}>{shownNotice}</Text> : null}
              <Text style={styles.stickyPlan}>
                {TIER_COPY[paidTier].title} · {selectedPlan.priceLabel}/{CADENCE_COPY[cadenceOf(selectedPlan.slot)].per}
              </Text>
              {TIER_NOTE_SHORT[paidTier] ? <Text style={styles.disclosure}>{TIER_NOTE_SHORT[paidTier]}</Text> : null}
              <Button variant="primary" fullWidth disabled={busy != null} onPress={onContinue} accessibilityLabel={ctaLabel}>
                {busy === 'purchase' ? 'Opening…' : ctaLabel}
              </Button>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

/** Terms + Privacy (Apple 3.1.2). Shown beside the buy button's renewal terms and again at the foot. */
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

/** Always available, in both states (§5.3). Never opens a child screen. */
function RestoreLink({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Restore Purchases"
      accessibilityHint="Checks for previous purchases on this account"
      style={[styles.linkRow, styles.restore]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={flColor.gray600} />
      ) : (
        <Text style={styles.restoreText}>Restore Purchases</Text>
      )}
    </Pressable>
  );
}

// ── Premium ──────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Yearly',
};

function renewLine(kind: string | null, until: string | null, seat: number | null): string | null {
  if (kind === 'GRANT') return 'Granted. Nothing is billed to this account.';
  if (until && (kind === 'MONTHLY' || kind === 'ANNUAL')) {
    const when = formatDate(until);
    // "Paid through", not "Renews": the athlete may have turned auto-renew off, and only Apple knows.
    if (!when) return null;
    return seat != null ? `Paid through ${when}. Founding price.` : `Paid through ${when}.`;
  }
  // No kind and no date is every athlete during testing: `default_tier` is PREMIUM and nobody has paid.
  return kind == null ? 'No billing on this account.' : null;
}

function formatDate(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

function PlanCard({ kind, until, seat, coachAi }: { kind: string | null; until: string | null; seat: number | null; coachAi: boolean }) {
  const line = renewLine(kind, until, seat);
  const name = coachAi ? 'Forge Premium AI' : 'Forge Premium';
  const cadence = kind ? KIND_LABEL[kind] : undefined;
  return (
    <View style={styles.planCard}>
      <Text style={styles.planCardLabel}>Your plan</Text>
      <Text style={styles.planCardValue}>{cadence ? `${name} · ${cadence}` : name}</Text>
      {line ? <Text style={styles.planCardLine}>{line}</Text> : null}
    </View>
  );
}

// ── the plan rows ────────────────────────────────────────────────────────────

type PickerEmpty = 'loading' | 'unavailable' | 'offer-failed' | 'plans-failed';

/** "——— FORGE PREMIUM ———": the mockup's eyebrow, ruled both sides. Labels are taupe on Alabaster. */
function RuledEyebrow({ children }: { children: string }) {
  return (
    <View style={styles.ruledRow} accessibilityRole="header">
      <View style={styles.ruledLine} />
      <Text style={styles.overline}>{children}</Text>
      <View style={styles.ruledLine} />
    </View>
  );
}

/**
 * One card per plan, priced at the chosen cadence (PO redesign 11-09).
 *
 * ⚠ THE BILLED AMOUNT IS THE LARGEST PRICE ON SCREEN (MA6-D10, Apple): the store's per-month figure for a
 * yearly plan is small type under it, and only when the store supplied one.
 */
function TierCards({
  empty,
  onRetry,
  cards,
  plans,
  cadence,
  active,
  recommended,
  free,
  paid,
  onSelect,
}: {
  empty: PickerEmpty | null;
  onRetry: () => void;
  cards: CardTier[];
  plans: StorePlan[];
  cadence: Cadence;
  active: CardTier | null;
  recommended: CardTier | null;
  free: Caps | null;
  paid: Caps | null;
  onSelect: (tier: CardTier) => void;
}) {
  if (empty) {
    /*
     * No picker, and deliberately no substitute for one. A failed read is worth a retry; "not available
     * on this device" (web, a build without the store, an offering with nothing in it) is not. Neither
     * invents a price to fill the gap.
     */
    if (empty === 'loading') {
      return (
        <View style={[styles.card, styles.pickerLoading]}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      );
    }
    const failed = empty === 'offer-failed' || empty === 'plans-failed';
    return (
      <View style={styles.card}>
        <Text style={styles.emptyPlans}>
          {failed ? 'Plans couldn’t be loaded right now.' : 'Plans aren’t available on this device yet.'}
        </Text>
        {failed ? (
          <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again">
            <Text style={styles.emptyRetry}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const currency = plans[0]?.currency ?? null;

  return (
    <View style={styles.plans} accessibilityRole="radiogroup">
      {cards.map((t) => {
        const on = t === active;
        const copy = TIER_CARD_COPY[t];
        const lines = tierCardLines(t, free, paid);
        const row = t === 'free' ? null : rowForCadence(plans, t, cadence);
        const annual = row != null && cadenceOf(row.slot) === 'annual';
        const price = t === 'free' ? zeroPriceLabel(currency) : (row?.priceLabel ?? null);
        const per = row ? CADENCE_COPY[cadenceOf(row.slot)].per : null;
        const perMonth = annual ? (row?.pricePerMonthLabel ?? null) : null;
        const saving = t !== 'free' && annual ? tierSaving(plans, t) : null;
        const trial = row ? trialLabel(row.trialDays) : null;
        const note = t === 'premium' ? TIER_NOTE_SHORT.premium : null;
        const badge = t === recommended ? RECOMMENDED_BADGE : null;
        /*
         * ⚠ THE PRICE, SAVING AND TRIAL MUST RIDE ON THE CARD'S OWN LABEL (§11.5). The card is one accessible
         * element, so anything inside it is never announced separately.
         */
        const spoken = [
          copy.title,
          badge,
          price ? (per ? `${price} per ${per}` : price) : null,
          saving ? `${saving} compared to monthly` : null,
          trial,
          ...lines,
          note,
          on ? 'selected' : 'not selected',
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <Pressable
            key={t}
            onPress={() => onSelect(t)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={spoken}
            style={({ pressed }) => [styles.tierCard, on && styles.tierCardOn, badge != null && styles.tierCardBadged, pressed && styles.pressed]}
          >
            {badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
            <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={12} color={flColor.onBronze} /> : null}</View>
            <View style={styles.tierBody}>
              <View style={styles.tierHead}>
                <View style={styles.tierName}>
                  <Text style={styles.tierTitle}>{copy.title}</Text>
                  <Text style={styles.tierSub}>{copy.subtitle}</Text>
                </View>
                <View style={styles.tierPrice}>
                  {price ? (
                    <Text style={styles.priceLine}>
                      <Text style={[styles.priceText, on && styles.priceTextOn]}>{price}</Text>
                      {per ? <Text style={styles.pricePer}>{` / ${per}`}</Text> : null}
                    </Text>
                  ) : null}
                  {perMonth ? <Text style={styles.perMonth}>{`${perMonth} / month`}</Text> : null}
                  {saving ? (
                    <View style={styles.savePill}>
                      <Text style={styles.saveText}>{saving}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={[styles.tierLines, t === 'free' && styles.tierLinesRuled]}>
                {lines.map((l) => (
                  <View key={l} style={styles.tierLine}>
                    <Check size={13} color={CHECK_INK} />
                    <Text style={styles.tierLineText}>{l}</Text>
                  </View>
                ))}
                {note ? <Text style={styles.tierNote}>{note}</Text> : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── the information zone ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function BenefitList({ benefits }: { benefits: BenefitLine[] }) {
  if (benefits.length === 0) return null;
  return (
    <View style={styles.card}>
      {benefits.map((b, i) => {
        const meta = BENEFIT_META[b.key];
        if (!meta) return null;
        return (
          <View key={b.key} style={[styles.benefitRow, i > 0 && styles.rowBorder]}>
            <View style={styles.benefitIcon}>
              <ForgeSymbol name={meta.icon} size={18} color={flColor.bronze300} />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{meta.title ?? b.line}</Text>
              <Text style={styles.benefitDetail}>{meta.detail}</Text>
              {meta.note ? <Text style={styles.benefitNote}>{meta.note}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AiBenefits() {
  return (
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
      <Text style={styles.allowance}>{AI_ALLOWANCE_NOTE} How it works is in the FAQs below.</Text>
    </View>
  );
}

/**
 * ⚠ LAID OUT ROW-MAJOR, WHICH IS AN ACCESSIBILITY DECISION AND NOT A STYLING ONE. Each row is one
 * accessible element carrying both cells, so it announces as "Programs. Free: 3. Premium: Unlimited."
 * (§7) rather than two unattached columns.
 */
function ComparisonTable({ rows }: { rows: CompactRow[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.cmpRow} accessibilityRole="header">
        <Text style={styles.cmpLabel} />
        <Text style={styles.cmpHeadFree}>Free</Text>
        <Text style={styles.cmpHeadPremium}>Premium</Text>
      </View>
      {rows.map((r) => (
        <View key={r.key} accessible style={[styles.cmpRow, styles.rowBorder]} accessibilityLabel={`${r.label}. Free: ${r.free}. Premium: ${r.premium}.`}>
          <Text style={styles.cmpLabel}>{r.label}</Text>
          <Text style={styles.cmpFree}>{r.free}</Text>
          <Text style={styles.cmpPremium}>{r.premium}</Text>
        </View>
      ))}
    </View>
  );
}

/** Never Charge For History (Monetization Amendment 001 §2) — the locked sentence, verbatim. */
function OwnershipCard() {
  return (
    <View style={[styles.card, styles.ownership]} accessible accessibilityLabel={`Your data is yours. ${REASSURANCE}`}>
      <View style={styles.ownershipIcon}>
        <InfinityMark size={24} />
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitTitle}>Your data is yours</Text>
        <Text style={styles.benefitDetail}>{REASSURANCE}</Text>
      </View>
    </View>
  );
}

/**
 * YOUR USAGE — proximity to the limits, on the athlete's own terms (P-8 architecture §3). Informational
 * only: it never suggests deleting anything. At 80%+ a row is emphasised in bronze, at 100% it says the
 * limit is reached — never red (PO 09-25).
 */
function UsageCard({ rows, near }: { rows: UsageRow[]; near: boolean }) {
  return (
    <View style={styles.card}>
      {rows.map((u, i) => {
        const hot = u.fill != null && u.fill >= 0.8;
        const full = u.fill != null && u.fill >= 1;
        const value = full && u.value !== 'Used' ? `${u.value} · Limit reached` : u.value;
        return (
          <View key={u.key} style={[styles.usageRow, near && styles.usageRowTight, i > 0 && styles.rowBorder]}>
            <View style={styles.usageIcon}>
              <ForgeSymbol name={USAGE_ICON[u.key] ?? 'target'} size={15} color={hot ? flColor.bronze300 : flColor.gray600} />
            </View>
            <Text style={[styles.usageLabel, !hot && near && styles.usageLabelQuiet]}>{u.label}</Text>
            <Text style={[styles.usageValue, hot && styles.usageValueHot]} accessibilityLabel={`${u.label}: ${value}`}>
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  pressed: { opacity: 0.8 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15 },
  aiText: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 16 },
  retryText: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
  retryBtn: { minWidth: 140 },
  body: { paddingHorizontal: 20 },

  headerRule: { height: 1, backgroundColor: flColor.bronzeBorderSubtle },

  // ── decision zone ──
  hero: { alignItems: 'center', paddingTop: 26, paddingBottom: 22 },
  ruledRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', paddingHorizontal: 18 },
  ruledLine: { flex: 1, height: 1, backgroundColor: flColor.bronzeBorder },
  overline: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: flColor.labelInk,
  },
  tagline: {
    fontFamily: flFont.display,
    /* 30, not 36: at 36 "Everything you build," broke onto two lines on a 390pt phone (render 11-09). */
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    color: flColor.cream100,
    textAlign: 'center',
    marginTop: 12,
  },
  principle: {
    fontSize: 15,
    lineHeight: 22,
    color: flColor.gray400,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 340,
  },

  tabs: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 14,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  tabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronzeSolid,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
    boxShadow: flShadow.glowSubtle,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  tabText: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  tabTextOn: { color: flColor.onBronze },

  foundingLine: { fontSize: 12.5, color: flColor.gray400, textAlign: 'center', marginBottom: 14 },
  foundingTitle: { fontWeight: '700', color: flColor.selectedInk },

  pickerLoading: { padding: 22, alignItems: 'center' },
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
    boxShadow: flShadow.card,
  },
  tierCardOn: { borderColor: CARD_EDGE_ON, backgroundColor: CARD_FILL_ON, boxShadow: flShadow.glowSubtle },
  /** Room for the badge that sits on the card's top edge. */
  tierCardBadged: { marginTop: 10, paddingTop: 22 },
  badge: {
    position: 'absolute',
    top: -11,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: flRadius.pill,
    backgroundColor: BADGE_FILL,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.selectedInk },
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
  savePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
  },
  saveText: { fontSize: 12, fontWeight: '700', color: flColor.selectedInk },
  tierLines: { gap: 7, marginTop: 12 },
  tierLinesRuled: { borderTopWidth: 1, borderTopColor: flColor.divider, paddingTop: 12 },
  tierLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  tierLineText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: flColor.cream100 },
  tierNote: { fontSize: 12, lineHeight: 17, color: flColor.gray600, marginTop: 2 },
  emptyPlans: { fontSize: 13, lineHeight: 20, color: flColor.gray400, padding: 16, textAlign: 'center' },
  emptyRetry: { fontSize: 13, fontWeight: '700', color: flColor.bronzeInk, textAlign: 'center', paddingBottom: 16 },

  cta: { marginTop: 18 },
  browseNote: { fontSize: 13.5, lineHeight: 19, color: flColor.gray400, textAlign: 'center', marginTop: 16 },
  notice: { fontSize: 12.5, color: flColor.bronzeInk, textAlign: 'center', marginTop: 10 },
  fineprint: { fontSize: 12, lineHeight: 17, color: flColor.gray400, textAlign: 'center', marginTop: 12, paddingHorizontal: 10 },
  linkRow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, minHeight: 40 },
  freeText: { fontSize: 15, fontWeight: '600', color: flColor.cream100, textDecorationLine: 'underline' },

  includedHead: { marginTop: 26 },
  /* Natural widths, spread evenly: equal fifths cut "Transformation" to "Transform…" on the web, where
     `adjustsFontSizeToFit` does nothing (render 11-09). The five labels fit 335pt (iPhone SE) at 12. */
  includedRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 2 },
  includedItem: { alignItems: 'center', gap: 8 },
  includedLabel: { fontSize: 12, color: flColor.gray400, textAlign: 'center' },

  // ── information zone ──
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.labelInk,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionLead: { fontSize: 13, color: flColor.gray400, marginTop: -4, marginBottom: 10 },
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
  benefitNote: { fontSize: 12, fontWeight: '600', color: flColor.bronzeInk, marginTop: 6 },
  allowance: { fontSize: 11.5, lineHeight: 16, color: flColor.gray600, paddingHorizontal: 15, paddingBottom: 13 },

  upsell: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, padding: 15, borderColor: flColor.bronzeBorder },
  upsellLink: { fontSize: 12.5, fontWeight: '700', color: flColor.bronze300, marginTop: 8 },

  cmpRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 },
  cmpLabel: { flex: 1.6, fontSize: 13, color: flColor.cream100 },
  cmpHeadFree: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600, textAlign: 'center' },
  cmpHeadPremium: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze300, textAlign: 'center' },
  cmpFree: { flex: 1, fontSize: 13, color: flColor.gray400, textAlign: 'center' },
  cmpPremium: { flex: 1, fontSize: 13, fontWeight: '600', color: flColor.bronze300, textAlign: 'center' },

  ownership: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, marginTop: 12 },
  ownershipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
  },

  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 15 },
  usageRowTight: { paddingVertical: 10 },
  usageIcon: { width: 22, alignItems: 'center' },
  usageLabel: { flex: 1, fontSize: 13.5, color: flColor.cream100 },
  usageLabelQuiet: { color: flColor.gray400 },
  usageValue: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  usageValueHot: { color: flColor.bronze300, fontWeight: '700' },

  faqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 13 },
  faqQ: { flex: 1, fontSize: 13.5, lineHeight: 19, color: flColor.cream100 },
  faqA: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400, paddingHorizontal: 15, paddingBottom: 14, marginTop: -4 },

  planCard: {
    padding: 18,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  planCardLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk },
  planCardValue: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, marginTop: 6 },
  planCardLine: { fontSize: 12.5, color: flColor.gray400, marginTop: 5 },
  manage: { marginTop: 22 },
  manageNote: { marginTop: 22, fontSize: 12.5, lineHeight: 18, color: flColor.gray400, textAlign: 'center', paddingHorizontal: 10 },

  restore: { marginTop: 20 },
  restoreText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 6 },
  legalText: { fontSize: 11.5, color: flColor.gray600, textDecorationLine: 'underline' },
  legalDot: { fontSize: 11.5, color: flColor.gray600 },

  commitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: flColor.divider,
    backgroundColor: flColor.base,
    gap: 7,
  },
  stickyPlan: { fontSize: 12.5, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  disclosure: { fontSize: 11.5, lineHeight: 15, color: flColor.gray400, textAlign: 'center' },
});
