/**
 * Holt's toolbox — what holding his coin offers (pure). AI Road to 10 Sprint 4a §1.7 (UX-3) — lane C.
 *
 * Every AI tool two taps away for a payer: hold the coin, tap the row. Not entitled: the same rows, each taking the
 * app's existing upgrade path (`usePlansDoor`) — no new paywall. The nutrition rows follow the nutrition access gate
 * (an allowlist: hidden, not refused, exactly as the tab is). "Ask" is always the chat as a tap opens it today.
 *
 * Pure, no imports: the rows and their rules are tested (`__tests__/holt-toolbox.test.mjs`); `HoltToolbox.tsx` draws
 * them.
 */

export type ToolKey = 'ask' | 'snap' | 'describe' | 'form' | 'import' | 'kitchen';

/** Engraved glyph names (the toolbox uses the engraved set only). */
export type ToolIcon = 'chat' | 'camera' | 'microphone' | 'video' | 'image' | 'bowl';

export interface ToolRow {
  key: ToolKey;
  label: string;
  sub: string;
  icon: ToolIcon;
  /** What the tap does: open the chat, open it in Kitchen mode, push a route, or the upgrade path. */
  does: { kind: 'chat' } | { kind: 'kitchen' } | { kind: 'route'; to: string } | { kind: 'plans' };
  /** The row is drawn with the Premium AI line (entitlement known, and not entitled). */
  premium: boolean;
}

/** The routes — `/describe-meal` is lane B's screen; the name is the contract (§1.6). */
export const TOOL_ROUTES = {
  snap: '/meal-photo',
  describe: '/describe-meal',
  form: '/form-check',
  import: '/program-import',
} as const;

const TOOLS: readonly { key: ToolKey; label: string; sub: string; icon: ToolIcon; nutrition: boolean; ai: boolean }[] = [
  { key: 'ask', label: 'Ask', sub: 'Talk to Holt', icon: 'chat', nutrition: false, ai: false },
  { key: 'snap', label: 'Snap a plate', sub: 'Log a meal from a photo', icon: 'camera', nutrition: true, ai: true },
  { key: 'describe', label: 'Describe a meal', sub: 'Say or type what you ate', icon: 'microphone', nutrition: true, ai: true },
  { key: 'form', label: 'Check my form', sub: 'Film a set for Holt to look at', icon: 'video', nutrition: false, ai: true },
  { key: 'import', label: 'Import a photo', sub: 'A program from a photo or a screenshot', icon: 'image', nutrition: false, ai: true },
  { key: 'kitchen', label: 'What can I make', sub: "Dishes from what you've got", icon: 'bowl', nutrition: true, ai: true },
];

export const PREMIUM_AI_LINE = 'Part of Premium AI';

/**
 * The rows for this athlete. `entitlementKnown` false (still loading, or the read failed): nothing is called Premium —
 * a payer whose read dropped must never be told they are not one (M-7 §10) — and the AI rows take the plans door,
 * which says "Unable to verify your subscription. Try again." rather than upselling.
 */
export function toolboxRows(a: { premiumAi: boolean; nutritionAccess: boolean; entitlementKnown: boolean }): ToolRow[] {
  return TOOLS.filter((t) => !t.nutrition || a.nutritionAccess).map((t) => {
    const open = !t.ai || (a.entitlementKnown && a.premiumAi);
    const premium = t.ai && a.entitlementKnown && !a.premiumAi;
    const does: ToolRow['does'] = !open
      ? { kind: 'plans' }
      : t.key === 'ask'
        ? { kind: 'chat' }
        : t.key === 'kitchen'
          ? { kind: 'kitchen' }
          : { kind: 'route', to: TOOL_ROUTES[t.key as keyof typeof TOOL_ROUTES] };
    return { key: t.key, label: t.label, sub: premium ? PREMIUM_AI_LINE : t.sub, icon: t.icon, does, premium };
  });
}

/** What VoiceOver says about the coin's hold — Feature Discovery: gestures are verbs, "hold", never "long-press". */
export const TOOLBOX_HINT = "Hold for Holt's tools.";
/** The name of the accessibility action that opens it, for the rotor. */
export const TOOLBOX_ACTION_LABEL = "Holt's tools";
