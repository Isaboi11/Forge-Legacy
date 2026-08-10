import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Turn } from '@/domain/coach/chat-core';

/**
 * The conversation, kept between visits.
 *
 * ══ WHY IT PERSISTS (PROMPT §15.1–15.3) ══
 *
 * One rolling thread per athlete. It survives leaving the app, and — the part that actually matters — it
 * survives leaving for the Program Builder and coming back, so the outcome can be written into the
 * conversation that produced it. A coach who forgets the last five minutes every time you glance at
 * something else is not a coach.
 *
 * Device-local, like the Builder's own draft: this is a working surface, not a record. Nothing here is
 * training history, and the programs it produces are saved through the Builder like everything else.
 *
 * ⚠ TRIMMED, per §15.6. A thread past ~100 turns is a scroll-performance problem and, worse, a JSON blob
 * that grows without bound in device storage. The OLDEST turns go: the recent ones are the conversation,
 * and the introduction is not worth carrying forever.
 */
const KEY = 'forge_coach_thread_v1';
const MAX_TURNS = 100;

export async function loadThread(): Promise<Turn[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Turn[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    // A thread we cannot read is a thread we start again — never an error in the athlete's face.
    return null;
  }
}

export async function saveThread(turns: Turn[]): Promise<void> {
  try {
    /* `live` is a transient — it means "this line is typing itself right now". Persisting it would make
       every restored line replay its typewriter, so the conversation would appear to be written afresh
       each time the sheet opens. */
    const settled = turns.slice(-MAX_TURNS).map((t) => (t.kind === 'holt' ? { ...t, live: false } : t));
    await AsyncStorage.setItem(KEY, JSON.stringify(settled));
  } catch {
    // Best-effort: losing the thread costs the conversation, never the training.
  }
}

export async function clearThread(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
