import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The handoff between a session's conditioning leg and the Active Run screen.
 *
 * Active Run is a full route with its own three phases, not something that can be embedded in the logger.
 * So a leg SENDS the athlete there and Active Run SENDS BACK a measurement — the same shape as
 * `workout-launch`, which is how every other screen hands the logger its starting conditions.
 *
 * The critical difference from a standalone run: in leg mode Active Run must NOT save a workout of its
 * own. The leg belongs to the session, and the session commits it at Finish. Saving here would produce
 * two records of one run — a standalone run in Activity History and the same miles again inside the
 * session — and inflate every distance total the athlete has.
 */

const REQUEST_KEY = 'forge_run_leg_request_v1';
const RESULT_KEY = 'forge_run_leg_result_v1';

export interface RunLegRequest {
  /** Which exercise in the session is waiting for this — the block it returns to. */
  exerciseIndex: number;
  /** 'run' | 'walk' | 'bike'. Active Run takes its activity from here, not from the URL. */
  activity: string;
  /** The block's derived name, shown as the eyebrow instead of the generic activity label. */
  name: string;
  /**
   * The prescription. `null` means the program prescribed no distance, and Active Run must then RESTORE
   * its goal chooser and default to Open — the ring becomes a per-mile cycle rather than progress toward
   * a target nobody set.
   */
  targetMi: number | null;
  targetPaceSec?: number | null;
  /** The session's name, for the "Part of …" pill. Truncated at the first `·` by the reader. */
  program?: string;
}

export interface RunLegResult {
  exerciseIndex: number;
  distanceMi: number;
  durationSec: number;
}

export async function writeRunLegRequest(req: RunLegRequest): Promise<void> {
  await AsyncStorage.setItem(REQUEST_KEY, JSON.stringify(req));
}

export async function readRunLegRequest(): Promise<RunLegRequest | null> {
  const raw = await AsyncStorage.getItem(REQUEST_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RunLegRequest;
  } catch {
    return null;
  }
}

export async function clearRunLegRequest(): Promise<void> {
  await AsyncStorage.removeItem(REQUEST_KEY);
}

export async function writeRunLegResult(result: RunLegResult): Promise<void> {
  await AsyncStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

/**
 * Read and CONSUME the result — a measurement must land on its leg exactly once. Left in place, the same
 * run would be re-applied every time the logger regained focus.
 */
export async function takeRunLegResult(): Promise<RunLegResult | null> {
  const raw = await AsyncStorage.getItem(RESULT_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(RESULT_KEY);
  try {
    return JSON.parse(raw) as RunLegResult;
  } catch {
    return null;
  }
}
