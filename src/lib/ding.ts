import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * The rest-timer ding — native.
 *
 * The web build resolves `ding.web.ts` instead, which synthesises the same sound in the Web Audio API
 * rather than decoding a file (see the note there on iOS Safari). Both expose exactly these two calls,
 * so `workout.tsx` never asks which platform it is on.
 *
 * ONE PLAYER FOR THE APP'S LIFETIME. Creating one per ding would mean decoding a 33 KiB file on the
 * exact frame the countdown hits zero, which is the one moment it must not stutter.
 */
let player: AudioPlayer | null = null;
let configured = false;

function ensure(): AudioPlayer | null {
  try {
    if (!configured) {
      configured = true;
      /* Plays through the silent switch and does NOT stop the athlete's music — a rest timer that
         paused someone's playlist to make a noise would be worse than one that made no noise. */
      void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
    }
    if (!player) player = createAudioPlayer(require('../../assets/audio/rest-ding.wav'));
    return player;
  } catch {
    // Audio is a courtesy. A device that will not give us a player still runs a workout.
    return null;
  }
}

/**
 * Warm the player up while the athlete is touching the screen.
 *
 * Harmless on native — it is only decoding early — but it is load-bearing on web, and calling it from
 * the same place on both platforms is what keeps the two files interchangeable.
 */
export function primeDing(): void {
  ensure();
}

export function playRestDing(): void {
  const p = ensure();
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // best-effort
  }
}
