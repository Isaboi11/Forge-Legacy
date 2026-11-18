/**
 * Holt's status line while a tool runs (pure). AI Road to 10 Sprint 4a §1.5. STUB from the integrator — lane C fills it.
 * "Reading your last 6 bench sessions…" from `detail`; anything it cannot template → the server's table line.
 */

/** The server's `detail` on a `{status}` event (lane A sends it). Numbers + a lift/food name the athlete owns. */
export interface StatusDetail {
  tool: string;
  n?: number;
  lift?: string;
  food?: string;
  days?: number;
}

export function statusLine(status: string, detail?: StatusDetail | null): string {
  void detail;
  return status;
}
