import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * TALK TO HOLT — speech to text on the device, never through a server.
 *
 * PO, 2026-09-21: *"Am I able to talk to holt with a microphone feature? If not, build that"* — and, of
 * the two ways to turn speech into text, the phone's own (Apple `SFSpeechRecognizer`, Android
 * `SpeechRecognizer`, the browser's Web Speech API on the preview). Free per use, fast, and the audio is
 * the platform's business rather than ours: no recording is uploaded, stored or sent to the model — Holt
 * only ever receives the TEXT, through exactly the same path as a typed sentence.
 *
 * ══ ⚠ THE NATIVE MODULE IS OPTIONAL, AND THAT IS WHAT KEEPS AN OLD BUILD ALIVE ══
 *
 * `expo-speech-recognition` is a native module (config plugin in `app.json`), so it exists only in a build
 * made after it was added. Importing the package would call `requireNativeModule`, which THROWS when the
 * module is absent — an OTA to an older binary would crash the sheet on open. So the package is never
 * imported: `requireOptionalNativeModule` returns `null` on a build without it and the mic simply does not
 * render. Same pattern as `lib/watch-bridge.ts`.
 */

/** The slice of `ExpoSpeechRecognition` this hook uses. Events mirror the Web Speech API. */
interface NativeSpeech {
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  isRecognitionAvailable(): boolean;
  start(options: { lang: string; interimResults: boolean; continuous: boolean; addsPunctuation?: boolean }): void;
  stop(): void;
  abort(): void;
  addListener(event: 'start' | 'end', listener: () => void): { remove(): void };
  addListener(event: 'result', listener: (e: { isFinal: boolean; results: { transcript: string }[] }) => void): { remove(): void };
  addListener(event: 'error', listener: (e: { error: string; message: string }) => void): { remove(): void };
}

/** The browser's recogniser, typed only as far as it is used. */
interface WebRecognizer {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type WebRecognizerCtor = new () => WebRecognizer;

const native = Platform.OS === 'web' ? null : requireOptionalNativeModule<NativeSpeech>('ExpoSpeechRecognition');

function webCtor(): WebRecognizerCtor | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: WebRecognizerCtor; webkitSpeechRecognition?: WebRecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** The device's language, so a Spanish speaker is heard in Spanish. Holt's parser reads either. */
function deviceLang(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

/** Whether this build and this browser can hear at all. Decides whether the mic renders. */
export function dictationAvailable(): boolean {
  if (native) {
    try {
      return native.isRecognitionAvailable();
    } catch {
      return false;
    }
  }
  return webCtor() != null;
}

/** Why listening stopped without words — shown in the composer, in plain terms. */
export type DictationProblem = 'denied' | 'unavailable' | 'no_speech' | null;

/* `aborted` is our own stop (the web's `stop` aborts) — not a problem to report. Anything else that is not
   permission or silence means this device or browser cannot hear right now (holtai-21). */
const problemOf = (code: string): DictationProblem =>
  code === 'aborted'
    ? null
    : code === 'not-allowed' || code === 'service-not-allowed'
      ? 'denied'
      : code === 'no-speech' || code === 'speech-timeout'
        ? 'no_speech'
        : 'unavailable';

/** How long the browser gets to start listening before the mic is called unavailable (holtai-21). */
const WEB_START_TIMEOUT_MS = 4000;

/**
 * One utterance at a time: tap the mic, speak, stop talking — the final words arrive in `onFinal`.
 * `heard` carries the words so far, so the athlete sees they are being heard while they speak.
 */
export function useDictation(onFinal: (text: string) => void) {
  const [available] = useState(dictationAvailable);
  /* ⚠ A RECOGNISER THAT EXISTS IS NOT ONE THAT WORKS (holtai-21, QA 09-26). Chromium without Google's speech
     service ships `webkitSpeechRecognition` and then errors or never starts, so the mic did nothing at all.
     Once it has failed that way it is hidden for the rest of the visit and the composer says why. */
  const [broken, setBroken] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [problem, setProblem] = useState<DictationProblem>(null);

  /* Written in an effect, never during render — react-compiler rejects `ref.current` in render. */
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });
  /** Tears down whichever engine is live. */
  const teardown = useRef<(() => void) | null>(null);
  useEffect(() => () => teardown.current?.(), []);

  const finish = useCallback((text: string) => {
    const t = text.trim();
    setHeard('');
    if (t) onFinalRef.current(t);
  }, []);

  const start = useCallback(async () => {
    if (listening) return;
    setProblem(null);
    setHeard('');
    const lang = deviceLang();

    if (native) {
      const perm = await native.requestPermissionsAsync().catch(() => ({ granted: false }));
      if (!perm.granted) {
        setProblem('denied');
        return;
      }
      let last = '';
      const subs = [
        native.addListener('start', () => setListening(true)),
        native.addListener('result', (e) => {
          last = e.results[0]?.transcript ?? '';
          if (e.isFinal) finish(last);
          else setHeard(last);
        }),
        native.addListener('error', (e) => {
          const p = problemOf(e.error);
          setProblem(p);
          if (p === 'unavailable') setBroken(true);
        }),
        native.addListener('end', () => {
          setListening(false);
          setHeard('');
          subs.forEach((s) => s.remove());
          teardown.current = null;
        }),
      ];
      teardown.current = () => {
        subs.forEach((s) => s.remove());
        native.abort();
      };
      native.start({ lang, interimResults: true, continuous: false, addsPunctuation: true });
      return;
    }

    const Ctor = webCtor();
    if (!Ctor) {
      setProblem('unavailable');
      setBroken(true);
      return;
    }
    let started = false;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => {
      started = true;
      setListening(true);
    };
    r.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      const text = res?.[0]?.transcript ?? '';
      if (res?.isFinal) finish(text);
      else setHeard(text);
    };
    r.onerror = (e) => {
      const p = problemOf(e.error);
      setProblem(p);
      if (p === 'unavailable') setBroken(true);
    };
    r.onend = () => {
      if (watchdog) clearTimeout(watchdog);
      setListening(false);
      setHeard('');
      teardown.current = null;
    };
    teardown.current = () => {
      if (watchdog) clearTimeout(watchdog);
      r.abort();
    };
    try {
      r.start();
    } catch {
      setProblem('unavailable');
      setBroken(true);
      teardown.current = null;
      return;
    }
    watchdog = setTimeout(() => {
      if (started) return;
      teardown.current = null;
      try {
        r.abort();
      } catch {
        // already gone
      }
      setProblem('unavailable');
      setBroken(true);
    }, WEB_START_TIMEOUT_MS);
  }, [listening, finish]);

  /** Stop listening now; whatever was final is already delivered. */
  const stop = useCallback(() => {
    if (native) native.stop();
    else teardown.current?.();
  }, []);

  return { available: available && !broken, listening, heard, problem, start, stop };
}
