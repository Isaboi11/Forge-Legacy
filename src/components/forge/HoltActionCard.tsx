/**
 * One card for every Holt action — Confirm, then Undo. AI Road to 10 Sprint 4a §1.2. STUB from the integrator —
 * lane C owns the real component; lane A mounts it in CoachChatSheet against these props (append only).
 */
import { Text, View } from 'react-native';

import type { ActionCardModel } from '@/domain/coach/holt-actions';

export type ActionCardState = 'ready' | 'working' | 'done' | 'undone' | 'failed';

export interface HoltActionCardProps {
  card: ActionCardModel;
  state: ActionCardState;
  /** The executor's one line after a write ("Logged to lunch."). */
  said?: string;
  onConfirm: (key?: string) => void;
  onUndo: () => void;
  onDismiss: () => void;
}

export function HoltActionCard({ card }: HoltActionCardProps) {
  return (
    <View>
      <Text>{card.title}</Text>
    </View>
  );
}
