/**
 * The line Holt shows while a tool runs. AI Road to 10 Sprint 4a §1.5. STUB — lane C owns it; lane A mounts it.
 */
import { Text } from 'react-native';

import { statusLine, type StatusDetail } from '@/domain/coach/holt-status';

export function HoltStatusLine({ status, detail }: { status: string; detail?: StatusDetail | null }) {
  return <Text>{statusLine(status, detail)}</Text>;
}
