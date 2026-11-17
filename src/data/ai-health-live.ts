import { callRpc } from '@/data/admin-live';
import { shapeAiHealth, type AiHealth } from '@/domain/admin/ai-health-core';

/**
 * /admin → AI health's one read (migration 0269, `admin_ai_health`).
 *
 * `admin_guard()` runs first inside the function, so this is an operator read whatever the client does.
 * `callRpc` names the two errors worth naming (0269 not applied yet · not authorized), and `shapeAiHealth`
 * THROWS on an answer it cannot read — so every failure reaches the screen as a failed load, never as a page of
 * zeros (audit G1: an AI outage that looks like a quiet day is the failure this page exists to end).
 */
export async function fetchAiHealth(days: number, tz: string): Promise<AiHealth> {
  const raw = await callRpc<unknown>('admin_ai_health', { p_days: days, p_tz: tz });
  return shapeAiHealth(raw);
}
