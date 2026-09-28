import { requireOptionalNativeModule } from 'expo';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform, Vibration } from 'react-native';

import { tapSuccess } from './haptics';

/**
 * ══ THE MILE MARKER'S VOICE — NATIVE ══
 *
 * A chime, a buzz, and the split spoken ("Mile 3. 8 minutes 42 seconds.") — WITH THE PHONE LOCKED.
 * PO 2026-09-28. The web build resolves `mile-voice.web.ts`, which makes no sound (the card's on-screen
 * line is all the preview gets). WHEN to speak is `domain/run/mile-marker.ts`; this file only speaks.
 *
 * ══ HOW IT IS HEARD IN A POCKET ══
 *
 * The app is awake while locked during a run because the location background mode keeps it running (see
 * `background-task.ts`). Being awake is not being ALLOWED TO MAKE SOUND: that is the `audio` background
 * mode (app.json, build 10) plus an audio session that says it plays in the background. So:
 *
 *   · the chime goes through expo-audio with `shouldPlayInBackground: true` and `mixWithOthers` — the
 *     athlete's music keeps playing under it, it is never paused or stopped;
 *   · the words go through `expo-speech` with `useApplicationAudioSession: false`, which gives the
 *     synthesizer its OWN session that iOS ducks the music under for the length of the sentence and then
 *     lets back up — the behaviour every running app has;
 *   · the buzz is `Vibration` (the system vibrate), because the Taptic Engine APIs expo-haptics uses are
 *     not played for a backgrounded app. Android keeps expo-haptics, which needs no VIBRATE permission.
 *
 * ⚠ BUILD 9 HAS NO `ExpoSpeech`. `expo-speech` calls `requireNativeModule` at import and would THROW on a
 *   binary without it, so it is never imported at the top: `requireOptionalNativeModule` asks first, and
 *   only then is it required. On build 9 the marker still chimes and buzzes; it just does not talk.
 *
 * ⚠ NONE OF THIS HAS BEEN HEARD ON A DEVICE. Background audio is a device-only behaviour; it is the first
 *   thing to check on build 10 (see the report for the steps).
 */

type SpeechApi = typeof import('expo-speech');

let speech: SpeechApi | null | undefined;
function speechApi(): SpeechApi | null {
  if (speech !== undefined) return speech;
  speech = null;
  try {
    if (Platform.OS !== 'web' && requireOptionalNativeModule('ExpoSpeech')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      speech = require('expo-speech') as SpeechApi;
    }
  } catch {
    speech = null;
  }
  return speech;
}

let player: AudioPlayer | null = null;

/**
 * The session the marker needs. Re-asserted before every chime rather than once: `lib/ding` sets the
 * app-wide mode too (foreground-only, for the rest timer), and whichever ran last wins.
 */
function backgroundMode(): Promise<void> {
  return setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

/** Call when a bout goes live — while the screen is on, which is when a session is best set up. */
export function prepareMileVoice(): void {
  try {
    void backgroundMode();
    if (!player) player = createAudioPlayer(require('../../assets/audio/mile-chime.wav'));
  } catch {
    // Audio is a courtesy. A device that will not give us a player still runs.
  }
}

export interface MileCue {
  /** The sentence — `markerSpeech`. */
  speech: string;
  /** Speak it. The athlete's "Spoken splits" preference. */
  voice: boolean;
  /** Chime. The app-wide Sound preference. */
  sound: boolean;
  /** Buzz. The app-wide Haptics preference. */
  haptics: boolean;
}

/** Chime + buzz now, then the sentence once the chime has rung out. */
export function announceMileMarker(cue: MileCue): void {
  if (cue.haptics) {
    try {
      if (Platform.OS === 'ios') Vibration.vibrate();
      else tapSuccess();
    } catch {
      /* best-effort */
    }
  }
  if (cue.sound) {
    void backgroundMode().then(() => {
      try {
        if (!player) player = createAudioPlayer(require('../../assets/audio/mile-chime.wav'));
        player.seekTo(0);
        player.play();
      } catch {
        /* best-effort */
      }
    });
  }
  const s = cue.voice ? speechApi() : null;
  if (s) {
    /* After the chime's two notes (~0.6 s), so the words are not stepped on. */
    setTimeout(
      () => {
        try {
          void s.stop().catch(() => {});
          s.speak(cue.speech, { language: 'en-US', rate: 1.0, useApplicationAudioSession: false });
        } catch {
          /* best-effort */
        }
      },
      cue.sound ? 700 : 0,
    );
  }
}

/** The bout ended: stop mid-sentence rather than read a split after the athlete pressed End. */
export function releaseMileVoice(): void {
  try {
    const s = speech;
    if (s) void s.stop().catch(() => {});
  } catch {
    /* best-effort */
  }
}
