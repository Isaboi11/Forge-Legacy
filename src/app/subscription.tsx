import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ForgeSymbol, type SymbolName } from '@/components/forge/ForgeSymbol';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { fetchCapConfig, fetchFounderSeatsRemaining } from '@/data/entitlement-live';
import {
  AI_DISCLOSURE,
  AUTO_RENEWAL_NOTE,
  FOUNDER_SEATS_TOTAL,
  PLAN_COPY,
  REASSURANCE,
  comparisonRows,
  defaultSelection,
  founderSeatLine,
  orderPlans,
  premiumBenefitLines,
  renews,
  savingLabel,
  savingPercent,
  usageRows,
  type BenefitLine,
  type PlanSlot,
  type StorePlan,
} from '@/domain/billing/plans-core';
import type { CapKey } from '@/domain/entitlement/caps-core';
import { billing, openManageSubscriptions } from '@/lib/billing';
import { ENTITLEMENT_RETRY_MESSAGE, useEntitlementState } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';

/**
 * P-8 Subscription — the purchase and management surface.
 *
 * Spec: `Docs/P-8-Subscription-Wireframe-Spec.md` v1.1 (LOCKED), which §11 extended with the plan picker.
 * Visual language: `Forge Subscription.dc.html`. Numbers and claims: `Monetization-Architecture-
 * Amendment-003` via server config. Launch Checklist item 4.1.
 *
 * ══ ⚠ THE DESIGN AND THE SPEC DISAGREED, AND THE SPLIT WAS DECIDED BY THE PO ══
 *
 * The `.dc` predates the pricing lock of 2026-08-12. It carries a three-plan ladder at typed prices, no
 * Founder or Lifetime row, no Coach AI disclosure, and benefit copy promising analytics, Communities and
 * "unlimited Squads" — none of which exist and the last of which the tier cannot deliver (M7-D15). So:
 * **the design governs the visual language, the locked spec governs every number, plan and claim.**
 * The deltas are listed at the bottom of this comment.
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
 * and rendered as nothing at all when it cannot be stood behind.
 *
 * ══ DELTAS vs the `.dc`, all deliberate ══
 *  · Header reads "Subscription", not "Membership" — §2.1/§7 lock it twice, including in the a11y table.
 *  · The picker sits above the buy button (§3.2's diagram) rather than under the hero. ⚠ §11.2's prose
 *    says "between the reassurance line and the usage review" and contradicts its own §3.2 diagram; the
 *    diagram is the v1.1 revision and putting plan → disclosure → button adjacent is the whole point of
 *    P8W-D4. Flagged for the spec's next amendment rather than silently resolved.
 *  · The social-proof line ("Thousands of photos. Years of chapters.") is DROPPED. It is an unverifiable
 *    claim on a purchase screen for a product with 20 testers — pricing plan, Legal §8: claims must be
 *    true.
 *  · The buy button reads "Continue", not the design's "Start Premium · [price]" — §11.5 locks both the
 *    label and its hint. (No price appears in this comment either: §9 says grep for one and find none.)
 *  · The `.dc`'s fineprint ("Renews automatically until cancelled — cancel anytime") is replaced by a
 *    disclosure that renders only for the cadences that actually renew, and worded clear of the five
 *    claims `content.test.mjs` guards.
 *  · Benefit rows are the five the caps enforce, not the `.dc`'s analytics/Communities/share-layout list.
 *  · A per-month price is rendered only when the STORE supplies one. The `.dc` divides its annual figure
 *    by twelve and prints the result; deriving a currency string Forge was never handed is how a wrong
 *    price reaches a purchase screen.
 *  · DEFERRED: the accent-palette treatment and the `.dc`'s noise overlay, as elsewhere in the app.
 */

/** The Forge mark, filled — ported verbatim from the `.dc`'s hero and loading insignia. */
const MARK = [
  'M10.9 3.2H13.1V15H10.9Z',
  'M7.6 7.1L9.6 5.8V15H7.6Z',
  'M16.4 7.1L14.4 5.8V15H16.4Z',
  'M6.8 15.4H17.2V16.2H6.8Z',
  'M5.6 16.6H18.4V17.4H5.6Z',
  'M4.4 17.8H19.6V18.6H4.4Z',
];

function ForgeMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={flColor.onBronze}>
      {MARK.map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}

function Check({ size = 13, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}

/** The bronze-metallic disc behind the mark — the design's hero insignia. */
const BRONZE_DISC = [flColor.bronze300, flColor.bronze400, flColor.bronzeDark] as const;

/**
 * The icon and supporting sentence for each benefit, keyed by the cap that makes it true.
 *
 * ⚠ KEYED, NOT INDEXED. The headline of each row comes from `premiumBenefitLines()` so the squad number
 * tracks config; pairing the two lists by array position would mislabel every row below any reordering,
 * which is the kind of mistake that puts the wrong promise beside the wrong number on a purchase screen.
 */
const BENEFIT_META: Partial<Record<CapKey, { icon: SymbolName; detail: string; starred?: boolean }>> = {
  // Legacy leads, and is the only starred row — the design's ordering, and the thing no competitor can copy.
  photos: { icon: 'book', detail: 'Every progress photo and video kept, with no ceiling to work around.', starred: true },
  programs: { icon: 'dumbbell', detail: 'Build, generate and receive as many programs as your training asks for.' },
  squads: { icon: 'squad', detail: 'Lead more than one squad at a time.' },
  imports: { icon: 'spark', detail: 'Bring a coach’s spreadsheet across whenever you need to.' },
  holt_programs: { icon: 'medal', detail: 'A full program for any goal, and help during the set — not just between them.' },
};

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
  const viaGate = from === 'gate';

  const { snapshot, status, refetch } = useEntitlementState();
  const { data: config } = useQuery(fetchCapConfig, []);
  const { data: seatsRemaining } = useQuery(fetchFounderSeatsRemaining, []);
  const { data: storePlans, refetch: refetchPlans } = useQuery(() => billing().fetchPlans(), []);

  const [chosen, setChosen] = useState<PlanSlot | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  /** The inline messages §4 specifies for restore. Never an alert — the screen stays where it is. */
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * ⚠ RE-CHECKED ON FOREGROUND (§5.2), BECAUSE "MANAGE SUBSCRIPTION" LEAVES THE APP.
   *
   * The athlete can cancel in OS settings and come straight back. Without this the screen would go on
   * showing Premium to somebody who just ended it — and the next thing they would do is doubt the app
   * rather than the timing.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/account-settings');
  }, [router]);

  const rows = orderPlans(storePlans ?? [], seatsRemaining ?? null);
  /**
   * ⚠ DERIVED, NOT AN EFFECT. Annual is pre-selected on every mount (P8W-D2), and a `setState` in an
   * effect body is a react-compiler error in this repo besides. Falling back through the derivation also
   * means a late-arriving offering lands pre-selected rather than empty.
   */
  const selected = chosen ?? defaultSelection(rows);
  const saving = savingLabel(
    savingPercent(
      rows.find((p) => p.slot === 'annual'),
      rows.find((p) => p.slot === 'monthly'),
    ),
  );

  const tier = status === 'ready' ? snapshot?.tier : null;
  const isPremium = tier === 'PREMIUM';

  const onContinue = async () => {
    if (!selected || busy) return;
    setBusy('purchase');
    setNotice(null);
    const outcome = await billing().purchase(selected);
    setBusy(null);

    // Cancelling is not an error and produces no message (§5.1.3). A failure inside the native sheet is
    // the platform's to report, not Forge's (§5.1.4) — so neither branch says anything here.
    if (outcome === 'purchased') {
      setNotice('Welcome to Forge Premium.');
      refetch();
    } else if (outcome === 'unavailable') {
      setNotice('Purchases aren’t available on this device yet.');
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
      refetch();
    } else if (outcome === 'none') {
      setNotice('No previous purchases found.');
    } else if (outcome === 'unavailable') {
      setNotice('Purchases aren’t available on this device yet.');
    } else {
      setNotice('Couldn’t reach the store. Try again.');
    }
  };

  const onManage = async () => {
    const opened = await openManageSubscriptions();
    if (!opened) setNotice('Couldn’t open your subscription settings.');
  };

  const header = viaGate
    ? { onClose: back, onBack: undefined }
    : { onBack: back, onClose: undefined };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Subscription" {...header} />

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
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* HERO — the design's bronze insignia, overline, tagline and current-plan chip. */}
            <View style={styles.hero}>
              <LinearGradient colors={BRONZE_DISC} locations={[0, 0.52, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.heroDisc}>
                <ForgeMark size={34} />
              </LinearGradient>
              <Text style={styles.overline}>Forge Premium</Text>
              <Text style={styles.tagline}>
                {isPremium ? 'Your legacy, preserved for life.' : 'Everything you build, kept for life.'}
              </Text>
              <Text style={styles.principle}>
                The training engine is always free. Premium is for the permanence, scale and story around it.
              </Text>

              <View style={styles.chip} accessibilityLabel={`Current plan: ${isPremium ? 'Premium' : 'Free'}`}>
                <Text style={styles.chipLabel}>Current plan</Text>
                <View style={[styles.chipValue, isPremium ? styles.chipValuePremium : styles.chipValueFree]}>
                  <Text style={isPremium ? styles.chipTextPremium : styles.chipTextFree}>
                    {isPremium ? 'Premium' : 'Free'}
                  </Text>
                </View>
              </View>
            </View>

            {isPremium ? (
              <PremiumState
                kind={snapshot?.premiumKind ?? null}
                until={snapshot?.premiumUntil ?? null}
                seat={snapshot?.founderSeat ?? null}
                benefits={premiumBenefitLines(config?.paid ?? null)}
              />
            ) : (
              <FreeState
                benefits={premiumBenefitLines(config?.paid ?? null)}
                comparison={comparisonRows(config?.free ?? null, config?.paid ?? null)}
                usage={usageRows(snapshot?.caps ?? null, snapshot?.usage ?? null)}
                plans={rows}
                planMissing={storePlans == null}
                selected={selected}
                onSelect={setChosen}
                saving={saving}
                seatsRemaining={seatsRemaining ?? null}
                onRetryPlans={refetchPlans}
              />
            )}
          </ScrollView>

          {/*
            THE COMMIT BAR — the design's fixed footer, carrying the one thing the design did not have.

            ⚠ THE DISCLOSURE SITS HERE, ABOVE THE BUTTON, AND THAT PLACEMENT IS THE REQUIREMENT (P8W-D4).
            A buyer who pays for "lifetime" and later finds a feature needs another subscription is the
            classic deceptive-practices fact pattern; putting the sentence in the terms instead of on the
            purchase surface is precisely the failure the rule exists to prevent. It renders in every Free
            state, not only when Lifetime is selected — the athlete comparing plans is the one who needs
            it, and a sticky bar is the only place on a scrolling screen where "above the button" is
            always true.
          */}
          <View style={[styles.commitBar, { paddingBottom: 15 + insets.bottom }]}>
            {notice ? (
              <Text style={styles.notice} accessibilityLiveRegion="polite">
                {notice}
              </Text>
            ) : null}

            {isPremium ? (
              <>
                <Button variant="primary" fullWidth onPress={onManage} accessibilityLabel="Manage Subscription">
                  Manage Subscription
                </Button>
                <RestoreLink busy={busy === 'restore'} onPress={onRestore} />
              </>
            ) : (
              <>
                <Text style={styles.disclosure}>{AI_DISCLOSURE}</Text>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={selected == null || busy != null}
                  onPress={onContinue}
                  accessibilityLabel="Continue"
                >
                  {busy === 'purchase' ? 'Opening…' : 'Continue'}
                </Button>
                <RestoreLink busy={busy === 'restore'} onPress={onRestore} />
              </>
            )}
          </View>
        </>
      )}
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
      style={styles.restore}
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
  MONTHLY: 'Forge Premium · Monthly',
  ANNUAL: 'Forge Premium · Annual',
  LIFETIME: 'Forge Premium · Lifetime',
  FOUNDER: 'Forge Premium · Founder',
  GRANT: 'Forge Premium',
};

function renewLine(kind: string | null, until: string | null, seat: number | null): string | null {
  if (kind === 'FOUNDER' && seat != null) return `Founder seat ${seat}. Yours for life.`;
  if (kind === 'LIFETIME') return 'Yours for life. Nothing renews.';
  if (kind === 'GRANT') return 'Granted. Nothing is billed to this account.';
  if (until) {
    const when = formatDate(until);
    return when ? `Renews ${when}.` : null;
  }
  // No kind and no date is every athlete today: `default_tier` is PREMIUM and no purchase has happened.
  // Saying nothing would be fine; saying this is better, because it answers the question the card raises.
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

function PremiumState({
  kind,
  until,
  seat,
  benefits,
}: {
  kind: string | null;
  until: string | null;
  seat: number | null;
  benefits: BenefitLine[];
}) {
  const line = renewLine(kind, until, seat);
  return (
    <>
      <View style={styles.planCard}>
        <Text style={styles.planCardLabel}>Your plan</Text>
        <Text style={styles.planCardValue}>{(kind && KIND_LABEL[kind]) ?? 'Forge Premium'}</Text>
        {line ? <Text style={styles.planCardLine}>{line}</Text> : null}
      </View>

      {/* No comparison table and no usage review in Premium (§3.4) — there is nothing left to compare
          against, and no limit to be proximate to. */}
      <SectionLabel>What Premium unlocks</SectionLabel>
      <BenefitList benefits={benefits} />

      <Text style={styles.reassurance}>{REASSURANCE}</Text>
    </>
  );
}

// ── Free ─────────────────────────────────────────────────────────────────────

function FreeState({
  benefits,
  comparison,
  usage,
  plans,
  planMissing,
  selected,
  onSelect,
  saving,
  seatsRemaining,
  onRetryPlans,
}: {
  benefits: BenefitLine[];
  comparison: { key: string; free: string; premium: string }[];
  usage: { key: string; label: string; value: string }[];
  plans: StorePlan[];
  planMissing: boolean;
  selected: PlanSlot | null;
  onSelect: (slot: PlanSlot) => void;
  saving: string | null;
  seatsRemaining: number | null;
  onRetryPlans: () => void;
}) {
  return (
    <>
      <SectionLabel>What Premium unlocks</SectionLabel>
      <BenefitList benefits={benefits} />

      {comparison.length > 0 ? (
        <>
          <SectionLabel>At a glance</SectionLabel>
          {/*
            ⚠ LAID OUT ROW-MAJOR, WHICH IS AN ACCESSIBILITY DECISION AND NOT A STYLING ONE.
            Two column containers would look identical and read as "3 programs, 75 photos, 1 squad…"
            followed by an unattached list of Premium values — the pairing that makes a comparison a
            comparison is lost, and §7 requires each row to announce as "Free: x, Premium: y". So each
            row is one accessible element carrying both cells; the divider and the bronze wash are
            per-cell and stack back into the two columns the design draws.
          */}
          <View style={styles.glance}>
            <View style={styles.glanceRow} accessibilityRole="header">
              <View style={styles.glanceCellFree}>
                <Text style={styles.glanceHeadFree}>Free</Text>
              </View>
              <View style={styles.glanceCellPremium}>
                <Text style={styles.glanceHeadPremium}>Premium</Text>
              </View>
            </View>
            {comparison.map((r) => (
              /* `accessible` is what collapses the two cells into ONE spoken row — without it the label
                 is set but the children stay in the tree and the pairing is lost again. */
              <View key={r.key} accessible style={styles.glanceRow} accessibilityLabel={`Free: ${r.free}. Premium: ${r.premium}.`}>
                <View style={styles.glanceCellFree}>
                  <Check size={12} color={flColor.gray600} />
                  <Text style={styles.glanceFreeText}>{r.free}</Text>
                </View>
                <View style={styles.glanceCellPremium}>
                  <Check size={12} color={flColor.bronze300} />
                  <Text style={styles.glancePremiumText}>{r.premium}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.reassurance}>{REASSURANCE}</Text>

      {/*
        YOUR USAGE — proximity to the limits, on the athlete's own terms (P-8 architecture §3).
        It exists so nobody first learns where a ceiling is by hitting it. Informational only: it never
        suggests deleting anything, because Never Charge For History means there is nothing to delete
        your way out of.
      */}
      {usage.length > 0 ? (
        <>
          <SectionLabel>Your usage</SectionLabel>
          <View style={styles.card}>
            {usage.map((u, i) => (
              <View key={u.key} style={[styles.usageRow, i > 0 && styles.rowBorder]}>
                <Text style={styles.usageLabel}>{u.label}</Text>
                <Text
                  style={styles.usageValue}
                  accessibilityLabel={`${u.label}: ${u.value}`}
                >
                  {u.value}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionLabel>Choose your plan</SectionLabel>
      {plans.length > 0 ? (
        <View style={styles.plans} accessibilityRole="radiogroup">
          {plans.map((p) => {
            const on = p.slot === selected;
            const copy = PLAN_COPY[p.slot];
            const seatLine =
              p.slot === 'founder' && seatsRemaining != null ? founderSeatLine(seatsRemaining) : null;
            const showSaving = p.slot === 'annual' && saving != null;
            /*
             * ⚠ THE SAVING AND THE SEAT COUNT MUST RIDE ON THE ROW'S OWN LABEL (§11.5).
             *
             * The row is one accessible element, so anything inside it is never announced separately —
             * a screen-reader user would hear "Annual, <the price>, selected" and never learn there was
             * a saving, or that four Founder seats were left. Those are the two facts the picker exists
             * to convey, so they go in the label rather than being left to the visual layer.
             */
            const spoken = [
              copy.title,
              p.priceLabel,
              showSaving ? `${saving} compared to monthly` : null,
              seatLine ? `${seatsRemaining} of ${FOUNDER_SEATS_TOTAL} seats remaining` : null,
              on ? 'selected' : 'not selected',
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <Pressable
                key={p.slot}
                onPress={() => onSelect(p.slot)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={spoken}
                style={[styles.planRow, on && styles.planRowOn]}
              >
                {copy.badge && p.slot === 'annual' ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{copy.badge}</Text>
                  </View>
                ) : null}
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={12} color={flColor.onBronze} /> : null}</View>
                <View style={styles.planText}>
                  <Text style={styles.planTitle}>{copy.title}</Text>
                  <Text style={styles.planCadence}>{copy.cadence}</Text>
                  {/* ⚠ LIVE OR ABSENT (P8W-D5). An unverifiable scarcity claim is worse than none, and
                      `orderPlans()` has already dropped this row if the count could not be read. */}
                  {seatLine ? <Text style={styles.planSeats}>{seatLine}</Text> : null}
                </View>
                <View style={styles.planPrice}>
                  <Text style={styles.priceText}>{p.priceLabel}</Text>
                  {p.pricePerMonthLabel ? <Text style={styles.perMonth}>{p.pricePerMonthLabel}</Text> : null}
                  {showSaving ? (
                    <View style={styles.savePill}>
                      <Text style={styles.saveText}>{saving}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        /*
         * No picker, and deliberately no substitute for one.
         *
         * `planMissing` is the store failing to answer — worth a retry. An empty-but-readable offering is
         * a configuration state the athlete can do nothing about. Neither invents a price to fill the
         * gap: this is the same code path a real store outage takes, and it is why the port models
         * "unavailable" separately from "failed".
         */
        <View style={styles.card}>
          <Text style={styles.emptyPlans}>
            {planMissing
              ? 'Plans couldn’t be loaded right now.'
              : 'Plans aren’t available on this device yet.'}
          </Text>
          {planMissing ? (
            <Pressable onPress={onRetryPlans} accessibilityRole="button" accessibilityLabel="Try again">
              <Text style={styles.emptyRetry}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Auto-renewal terms are required before purchase — and false for the one-off plans, which renew
          nothing. So it tracks the selection rather than sitting there unconditionally. */}
      {renews(selected) ? <Text style={styles.fineprint}>{AUTO_RENEWAL_NOTE}</Text> : null}
    </>
  );
}

// ── shared pieces ────────────────────────────────────────────────────────────

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
          <View key={b.key} style={[styles.benefitRow, i > 0 && styles.rowBorder, meta.starred && styles.benefitStarred]}>
            <View style={styles.benefitIcon}>
              <ForgeSymbol name={meta.icon} size={18} color={flColor.bronze300} />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{b.line}</Text>
              <Text style={styles.benefitDetail}>{meta.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 16 },
  retryText: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
  retryBtn: { minWidth: 140 },
  body: { paddingHorizontal: 20, paddingBottom: 30 },

  hero: { alignItems: 'center', paddingTop: 4 },
  heroDisc: {
    width: 60,
    height: 60,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowBadge,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginTop: 15,
  },
  tagline: {
    fontFamily: flFont.display,
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 32,
    color: flColor.cream100,
    textAlign: 'center',
    marginTop: 9,
    maxWidth: 300,
  },
  principle: {
    fontSize: 13.5,
    lineHeight: 21,
    color: flColor.gray400,
    textAlign: 'center',
    marginTop: 11,
    maxWidth: 300,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 17,
    paddingLeft: 14,
    paddingRight: 7,
    paddingVertical: 6,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  chipLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  chipValue: { paddingHorizontal: 11, paddingVertical: 3, borderRadius: flRadius.pill, borderWidth: 1 },
  chipValuePremium: { backgroundColor: flColor.bronze400, borderColor: flColor.bronzeBorder },
  chipValueFree: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal500 },
  chipTextPremium: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: flColor.onBronze },
  chipTextFree: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: flColor.gray400 },

  planCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
  },
  planCardLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  planCardValue: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, marginTop: 6 },
  planCardLine: { fontSize: 12.5, color: flColor.gray400, marginTop: 5 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginTop: 28,
    marginBottom: 12,
  },
  card: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
    overflow: 'hidden',
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },

  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, padding: 15 },
  benefitStarred: { backgroundColor: flColor.bronzeTint },
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
  benefitTitle: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  benefitDetail: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400, marginTop: 3 },

  glance: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.card,
    overflow: 'hidden',
  },
  glanceRow: { flexDirection: 'row', alignItems: 'stretch' },
  glanceCellFree: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRightWidth: 1,
    borderRightColor: flColor.charcoal700,
  },
  glanceCellPremium: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: flColor.bronzeTint,
  },
  glanceHeadFree: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray400, paddingVertical: 7 },
  glanceHeadPremium: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze300, paddingVertical: 7 },
  glanceFreeText: { flex: 1, fontSize: 12, lineHeight: 16, color: flColor.gray400 },
  glancePremiumText: { flex: 1, fontSize: 12, lineHeight: 16, color: flColor.cream100 },

  reassurance: { fontSize: 12, lineHeight: 19, color: flColor.gray600, textAlign: 'center', marginTop: 16, paddingHorizontal: 10 },

  usageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13, paddingHorizontal: 15 },
  usageLabel: { fontSize: 13.5, color: flColor.cream100 },
  usageValue: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },

  plans: { gap: 11 },
  planRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  planRowOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800, boxShadow: flShadow.card },
  badge: {
    position: 'absolute',
    top: -9,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronzeSolid,
    boxShadow: flShadow.glowSubtle,
  },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.onBronze },
  radio: {
    width: 22,
    height: 22,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeSolid },
  planText: { flex: 1 },
  planTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  planCadence: { fontSize: 12, color: flColor.gray600, marginTop: 2 },
  planSeats: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze400, marginTop: 4 },
  planPrice: { alignItems: 'flex-end', gap: 3 },
  priceText: { fontFamily: flFont.display, fontSize: 21, fontWeight: '700', color: flColor.cream100 },
  perMonth: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  savePill: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  saveText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.4, color: flColor.bronze300 },

  emptyPlans: { fontSize: 13, lineHeight: 20, color: flColor.gray400, padding: 16, textAlign: 'center' },
  emptyRetry: { fontSize: 13, fontWeight: '700', color: flColor.bronze400, textAlign: 'center', paddingBottom: 16 },

  fineprint: { fontSize: 10.5, lineHeight: 16, color: flColor.gray600, textAlign: 'center', marginTop: 16, paddingHorizontal: 8 },

  commitBar: {
    paddingHorizontal: 20,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.base,
    gap: 9,
  },
  notice: { fontSize: 12.5, color: flColor.bronze400, textAlign: 'center' },
  disclosure: { fontSize: 12, lineHeight: 17, color: flColor.gray400, textAlign: 'center' },
  restore: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, minHeight: 32 },
  restoreText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray600 },
});
