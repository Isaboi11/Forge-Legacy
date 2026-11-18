/**
 * One card for every Holt action — Confirm, then Undo. AI Road to 10 Sprint 4a §1.2 — lane C; lane A mounts it in
 * CoachChatSheet against these props (append only).
 *
 * ══ THE CARD LANGUAGE IS THE CHAT'S OWN ══
 *
 * Cut from Holt's meal card (`MealCardView`, 095d8bf6) and the dish cards beside it: the same 14-radius surface with
 * the bronze wash and the one shadow (it is something to act INSIDE of — `feedback_cards_are_for_acting_inside`), the
 * 8.5/700 tracked eyebrow, the 13.5/600 title, the food-line rows, the bordered text buttons in the tag style. Layout
 * is identical in both themes; every colour is a token, so Alabaster reads its own values.
 *
 * ⚠ BRONZE IS EARNED (Alabaster): only the Confirm button — the one thing to do NOW — carries the accent edge and the
 * action ink. Dismiss, Undo and the secondary button sit on the plain taupe edge with the label ink. A card that
 * cannot be confirmed loses the wash and the shadow: there is nothing to act on but Dismiss.
 *
 * ⚠ NO RED. A failed write is the app's plain words and "Not changed." on its own line — the chat's error turn is the
 * one place red appears, and a card that changed nothing has not gone wrong in a way that needs alarm.
 *
 * States: ready → working → done (the executor's line + Undo) → undone; or failed; or dismissed. Every button has a
 * full VoiceOver label ("Do it: Swap today's exercise"), and the line that lands after a tap is announced.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { flColor, flShadow } from '@/constants/foundation';
import { bronzeWash, wash } from '@/constants/washes';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { failedLine, undoFailedLine } from '@/domain/coach/holt-action-cards';
import type { ActionCardModel, ApplyResult, HoltActionName } from '@/domain/coach/holt-actions';

export type ActionCardState = 'ready' | 'working' | 'done' | 'undone' | 'failed' | 'dismissed';

export interface HoltActionCardProps {
  card: ActionCardModel;
  state: ActionCardState;
  /** The executor's one line after a write ("Logged to lunch."). */
  said?: string;
  onConfirm: (key?: string) => void;
  onUndo: () => void;
  onDismiss: () => void;
  /** Lane C (append): why it failed (`ApplyResult.reason`) — drawn in plain words, then "Not changed.". */
  reason?: Extract<ApplyResult, { ok: false }>['reason'];
  /** Lane C (append): `ApplyResult.noUndo` — the write has nothing to undo; the line (if any) shows instead of Undo. */
  noUndo?: string;
  /** Lane C (append): an Undo was tapped and could not put it back (it changed since). */
  undoFailed?: boolean;
}

/** The eyebrow — what kind of thing the card does, in the chat's tag voice. */
const TAG: Partial<Record<HoltActionName, string>> = {
  swap_exercise_today: 'SWAP',
  start_workout: 'START',
  schedule_session: 'SCHEDULE',
  set_targets: 'TARGETS',
  remember_note: 'NOTE',
  open_door: 'OPEN',
  log_food: 'LOG',
  propose_meal: 'MEAL',
};

export function HoltActionCard({ card, state, said, onConfirm, onUndo, onDismiss, reason, noUndo, undoFailed }: HoltActionCardProps) {
  const canConfirm = card.confirmLabel != null;
  const live = state === 'ready' || state === 'working';
  const working = state === 'working';
  return (
    <View style={[styles.card, canConfirm && live ? styles.cardAct : styles.cardQuiet]}>
      <Text style={styles.tag}>{TAG[card.action] ?? 'HOLT'}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {card.title}
      </Text>

      {card.rows.length ? (
        <View style={styles.rows}>
          {card.rows.map((r, i) => (
            <View
              key={`${r.label}-${i}`}
              style={styles.row}
              accessible
              accessibilityLabel={[r.label, r.value, r.note].filter(Boolean).join('. ')}
            >
              <View style={styles.rowTop}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                {r.value ? <Text style={styles.rowValue}>{r.value}</Text> : null}
              </View>
              {r.note ? <Text style={styles.rowNote}>{r.note}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {card.blocked && live ? <Text style={styles.blocked}>{card.blocked}</Text> : null}
      {card.credit ? <Text style={styles.credit}>{card.credit}</Text> : null}

      {live ? (
        <View style={styles.actions}>
          {canConfirm ? (
            <CardButton
              label={working ? 'WORKING…' : card.confirmLabel!.toUpperCase()}
              a11y={`${card.confirmLabel}: ${card.title}`}
              primary
              busy={working}
              onPress={() => onConfirm()}
            />
          ) : null}
          {canConfirm && card.secondary ? (
            <CardButton
              label={card.secondary.label.toUpperCase()}
              a11y={`${card.secondary.label}: ${card.title}`}
              busy={working}
              onPress={() => onConfirm(card.secondary!.key)}
            />
          ) : null}
          <CardButton label="DISMISS" a11y={`Dismiss: ${card.title}`} busy={working} onPress={onDismiss} />
        </View>
      ) : null}

      {state === 'done' ? (
        <View style={styles.after} accessibilityLiveRegion="polite">
          {said ? (
            <View style={styles.saidRow}>
              <EngravedIcon name="check" size={14} />
              <Text style={styles.said}>{said}</Text>
            </View>
          ) : null}
          {undoFailed ? <Text style={styles.quiet}>{undoFailedLine(card.action)}</Text> : null}
          {noUndo != null ? (
            noUndo ? <Text style={styles.quiet}>{noUndo}</Text> : null
          ) : undoFailed ? null : (
            <View style={styles.actions}>
              <CardButton label="UNDO" a11y={`Undo: ${card.title}`} onPress={onUndo} />
            </View>
          )}
        </View>
      ) : null}

      {state === 'undone' ? (
        <Text style={styles.quiet} accessibilityLiveRegion="polite">
          Undone. Put back as it was.
        </Text>
      ) : null}

      {state === 'failed' ? (
        <View style={styles.after} accessibilityLiveRegion="polite">
          <Text style={styles.failed}>{failedLine(reason ?? 'failed', card.action)}</Text>
          <Text style={styles.quiet}>Not changed.</Text>
        </View>
      ) : null}

      {state === 'dismissed' ? <Text style={styles.quiet}>Left as it was.</Text> : null}
    </View>
  );
}

function CardButton({ label, a11y, onPress, primary = false, busy = false }: { label: string; a11y: string; onPress: () => void; primary?: boolean; busy?: boolean }) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      disabled={busy}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: busy, busy }}
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, pressed && styles.buttonPressed, busy && styles.buttonBusy]}
    >
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* The dish/meal card's shape (`dishCard`), stacked full width. */
  card: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, borderRadius: 14, gap: 5 },
  /* `homeCardPrimary` — something to act inside of. */
  cardAct: { backgroundColor: bronzeWash(0.045), borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, boxShadow: flShadow.trainTogetherCard },
  /* `homeCardPlain` — a record, or a card with nothing to confirm. */
  cardQuiet: { backgroundColor: wash(0.028), borderWidth: 1, borderColor: wash(0.07) },
  tag: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1.8, color: flColor.labelInk },
  title: { fontSize: 13.5, fontWeight: '600', lineHeight: 17.5, color: flColor.cream100 },

  /* The meal card's food lines. Labels wrap (no `numberOfLines`): an exercise's full name is what tells two apart. */
  rows: { gap: 6, paddingTop: 4 },
  row: { gap: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowLabel: { flex: 1, fontSize: 12.5, lineHeight: 16.5, color: flColor.cream100 },
  rowValue: { fontSize: 12.5, lineHeight: 16.5, fontWeight: '600', color: flColor.cream100 },
  rowNote: { fontSize: 11, lineHeight: 15, color: flColor.gray600 },

  blocked: { fontSize: 12, lineHeight: 16.5, color: flColor.gray400, paddingTop: 2 },
  credit: { fontSize: 10, lineHeight: 14, color: flColor.gray600, paddingTop: 2 },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  /* `mealButton`. */
  button: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  buttonPrimary: { borderColor: flColor.accentBorder },
  buttonPressed: { backgroundColor: bronzeWash(0.08), borderColor: flColor.accentBorderSubtle },
  buttonBusy: { opacity: 0.6 },
  buttonText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 1.8, color: flColor.labelInk },
  buttonTextPrimary: { color: flColor.bronzeInk },

  after: { gap: 4, paddingTop: 4 },
  saidRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  said: { flex: 1, fontSize: 12.5, lineHeight: 17, color: flColor.cream100 },
  failed: { fontSize: 12.5, lineHeight: 17, color: flColor.gray400 },
  quiet: { fontSize: 11, lineHeight: 15, color: flColor.gray600, paddingTop: 2 },
});
