/**
 * Holt's toolbox — hold his coin, and every AI tool is one more tap away. AI Road to 10 Sprint 4a §1.7 (UX-3) — lane C.
 *
 * Ask · Snap a plate · Describe a meal · Check my form · Import a photo · What can I make. Which rows, and what each
 * tap does, is `domain/coach/holt-toolbox.ts` (tested); this draws them. Tapping the coin still opens the chat as it
 * always has — the toolbox is only the hold.
 *
 * ══ HOW IT PRESENTS ══
 *
 * The app's `BottomSheet` — a sheet the athlete acts inside of and then leaves, the same presentation as the coin's
 * nudge and draft sheets beside it. (The "never a Modal" rule is for overlays that must NOT hold the screen — toasts;
 * this one holds it until a row is picked.) The rows are the media picker's: icon, label, hairline between — no card
 * per row, nothing nested.
 *
 * ⚠ THE TAP WAITS FOR THE SHEET TO BE GONE ON iOS. iOS will not present a screen while another view controller is
 * still on screen — the bug that once made "Choose from library" do nothing (`useMediaPicker`). The row is kept and
 * run from `onDismiss`, which RN fires on iOS only once the sheet has really left; Android and web run it at once.
 *
 * Form check is navigated to as it is (`/form-check`) — that screen belongs to another session and is not touched.
 */
import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { flColor } from '@/constants/foundation';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { usePlansDoor } from '@/hooks/usePremiumGate';
import { useEntitlementState, useNutritionAccess, usePremiumAi } from '@/lib/entitlement';
import { consentForRoute } from '@/lib/consent';
import { track } from '@/lib/analytics';
import { toolboxRows, type ToolRow } from '@/domain/coach/holt-toolbox';

export interface HoltToolboxProps {
  open: boolean;
  onClose: () => void;
  /** Open the chat, as tapping the coin does. */
  onAsk: () => void;
  /** Open the chat in Kitchen mode (the chef's-hat Holt the Nutrition tab opens). */
  onKitchen: () => void;
}

export function HoltToolbox({ open, onClose, onAsk, onKitchen }: HoltToolboxProps) {
  const router = useRouter();
  const premiumAi = usePremiumAi();
  const nutritionAccess = useNutritionAccess();
  const { status } = useEntitlementState();
  const openPlans = usePlansDoor();
  const rows = toolboxRows({ premiumAi, nutritionAccess, entitlementKnown: status === 'ready' });
  /* The row picked, run once the sheet is gone (iOS). Touched only in event handlers. */
  const pending = useRef<ToolRow | null>(null);

  const run = (row: ToolRow) => {
    track('holt_toolbox', { kind: row.key, result: row.does.kind });
    const does = row.does;
    if (does.kind === 'chat') return onAsk();
    if (does.kind === 'kitchen') return onKitchen();
    if (does.kind === 'plans') return void openPlans();
    /* A nutrition screen asks for the Nutrition consent first, exactly as the tab does (MHMDA). */
    void consentForRoute(does.to).then((ok) => {
      if (ok) router.push(does.to as Parameters<typeof router.push>[0]);
    });
  };

  const pick = (row: ToolRow) => {
    if (Platform.OS === 'ios') {
      pending.current = row;
      onClose();
      return;
    }
    onClose();
    run(row);
  };

  const dismissed = () => {
    const row = pending.current;
    pending.current = null;
    if (row) run(row);
  };

  return (
    <BottomSheet open={open} onClose={onClose} onDismiss={dismissed} title="Holt's tools">
      <View style={styles.list}>
        {rows.map((row, i) => (
          <Pressable
            key={row.key}
            onPress={() => pick(row)}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            accessibilityHint={row.premium ? 'Part of Premium AI. Opens the plans.' : row.sub}
            style={({ pressed }) => [styles.row, i > 0 && styles.rowDivided, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <EngravedIcon name={row.icon} size={20} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowSub}>{row.sub}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  /* `useMediaPicker`'s source rows, with a second line. Layout both themes; colours are tokens. */
  list: { marginHorizontal: -6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 8 },
  rowDivided: { borderTopWidth: 1, borderTopColor: flColor.divider },
  rowPressed: { opacity: 0.7 },
  rowIcon: { flexShrink: 0 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, color: flColor.cream100 },
  rowSub: { fontSize: 12, lineHeight: 16, color: flColor.gray600 },
});
