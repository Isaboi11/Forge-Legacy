import AsyncStorage from '@react-native-async-storage/async-storage';

import { onVoiceChange, restoreVoiceMemory, voiceMemory } from '@/domain/coach/rulebook/voice';

/**
 * Where Holt is in every deck of lines, kept on the device.
 *
 * PO, 2026-09-21: *"We need a very robust script for him so that he doesn't get old to users. Should feel
 * new for a very long time."* `voice.ts` deals every variant of a line before any repeats — but its decks
 * live in memory, and without this every launch would put him back at the top of every list. A daily user
 * opens the app once or twice a day, so in practice the deck would never get past its first few cards.
 *
 * ⚠ DEVICE-LOCAL, LIKE `coach-memory.ts`. What Holt last said is presentation, not training data: losing
 * it costs one repeated greeting, so it has no business in the database.
 *
 * ⚠ BEST-EFFORT IN BOTH DIRECTIONS. A failed read leaves fresh decks; a failed write loses a position.
 * Neither is worth an error anybody sees.
 *
 * Imported once for its side effect, from `app/(tabs)/_layout.tsx`.
 */

const KEY = 'forge_holt_voice_v1';
/** Writes are batched: a build conversation deals a dozen lines in a few seconds. */
const SAVE_DELAY_MS = 1500;

let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    AsyncStorage.setItem(KEY, JSON.stringify(voiceMemory())).catch(() => {});
  }, SAVE_DELAY_MS);
}

let started = false;

export function startVoiceMemory(): void {
  if (started) return;
  started = true;
  onVoiceChange(scheduleSave);
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) restoreVoiceMemory(JSON.parse(raw));
    })
    .catch(() => {});
}

startVoiceMemory();
