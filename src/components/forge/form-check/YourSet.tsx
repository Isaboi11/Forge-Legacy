import { useEffect, useState } from 'react';
import { Image, PanResponder, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import Svg, { Path } from 'react-native-svg';

import { FC, FrameFill } from '@/components/forge/form-check/FormCheckParts';
import { SHOW_ME_RATE, type RepSpan } from '@/domain/coach/pose/pose-rep-view';

/**
 * FORM CHECK — the athlete's own clip on the read (PO 2026-11-17, step 1: "see it in your video").
 *
 *   · {@link YourSet} — the clip at the top of the read, looping the part Holt watched, with a timeline under it: the
 *     sent stills as a strip, a tick per rep, and a bronze numbered mark at each fix's moment. Touch the strip to
 *     scrub; tap a mark to see that moment slowly.
 *   · {@link SlowReplay} — "Show me": plays slowly up to the marked moment and hands back, so the screen can freeze on
 *     the marked still with Holt's drawing on it (the still IS that frame of the clip, so the picture does not jump).
 *
 * Not in the .dc (added, PO 11-17). The clip never leaves the phone: it is the file the athlete picked.
 */

const C = FC;

/** Seek expo-video's player — through its setter, which a hook's value may only be written through out here. */
export function seekPlayer(p: VideoPlayer, ms: number) {
  p.currentTime = ms / 1000;
}

/** expo-video's scrubbing mode (iOS: chase the newest seek, drop stale ones) — on while a finger is down. */
export function scrubMode(p: VideoPlayer, on: boolean) {
  try {
    p.scrubbingModeOptions = { scrubbingModeEnabled: on };
  } catch {
    // a player without it still seeks, just less smoothly
  }
}

const mmss = (ms: number) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

/** One of Holt's fixes, placed on the clip. */
export interface ClipMarker {
  /** What the mark shows: "1", "2". */
  n: string;
  atMs: number;
  /** VoiceOver: "Show me fix 1, at 4.2 s, slowly". */
  label: string;
}

const STRIP_H = 44;
const MARK = 22;
const PICTURES = 8;
/** Web scrolls in the browser, where no responder reaches — the strip keeps its touches (see `useCompareDrag`). */
const TOUCH_STYLE = Platform.OS === 'web' ? ({ touchAction: 'none' } as unknown as ViewStyle) : null;

export function YourSet({
  uri,
  durationMs,
  win,
  frames,
  markers,
  reps,
  hold,
  onMarker,
}: {
  uri: string;
  durationMs: number;
  /** The part Holt watched — the timeline spans it and Play loops it. */
  win: { start: number; end: number };
  /** The sent stills, in time order (they cover `win` evenly) — the strip's pictures. */
  frames: string[];
  markers: ClipMarker[];
  reps: RepSpan[];
  /** True while something else plays the clip (Show me): this one stops. */
  hold: boolean;
  onMarker: (i: number) => void;
}) {
  const span = Math.max(1, win.end - win.start);
  const [head, setHead] = useState(win.start);
  const [scrubbing, setScrubbing] = useState(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.1;
    p.currentTime = win.start / 1000;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: false, oldIsPlaying: false });
  /* Play covers the part Holt watched: past its end (or looped round to before its start) it goes again. */
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (scrubbing) return;
    const ms = currentTime * 1000;
    if (isPlaying && (ms >= win.end || ms < win.start - 250)) {
      seekPlayer(player, win.start);
      setHead(win.start);
      return;
    }
    setHead(ms);
  });

  useEffect(() => {
    if (hold) player.pause();
  }, [hold, player]);

  /* Built once (a rebuilt PanResponder restarts its drag at dx 0); `live` is this closure's own, not a ref. */
  const [pan] = useState(() => {
    const live = { w: 1, x0: 0 };
    const place = (x: number) => {
      const ms = win.start + Math.max(0, Math.min(1, x / live.w)) * span;
      seekPlayer(player, ms);
      setHead(ms);
    };
    const finish = () => {
      scrubMode(player, false);
      setScrubbing(false);
    };
    return {
      measured: (w: number) => {
        live.w = Math.max(1, w);
      },
      responder: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          live.x0 = e.nativeEvent.locationX;
          player.pause();
          scrubMode(player, true);
          setScrubbing(true);
          place(live.x0);
        },
        onPanResponderMove: (_e, g) => place(live.x0 + g.dx),
        onPanResponderRelease: finish,
        onPanResponderTerminate: finish,
      }),
    };
  });

  const pct = (ms: number) => `${((Math.max(win.start, Math.min(win.end, ms)) - win.start) / span) * 100}%` as const;
  const pictures = Array.from({ length: PICTURES }, (_, i) => (frames.length ? frames[Math.round((i * (frames.length - 1)) / (PICTURES - 1))] : null));
  const inside = reps.filter((r) => r.turnMs >= win.start && r.turnMs <= win.end);

  return (
    <View style={s.wrap}>
      <View style={s.video}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        <Text style={s.tag}>YOUR SET</Text>
        {scrubbing ? null : (
          <Pressable
            onPress={() => {
              if (isPlaying) return player.pause();
              if (head < win.start || head >= win.end - 100) {
                seekPlayer(player, win.start);
                setHead(win.start);
              }
              player.play();
            }}
            style={s.play}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause your set' : 'Play your set'}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="#F0EDE8">
              {isPlaying ? <Path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <Path d="M8 5.5v13l10.5-6.5z" />}
            </Svg>
          </Pressable>
        )}
        <Text style={s.time}>{`${mmss(head)} / ${mmss(durationMs)}`}</Text>
      </View>

      {inside.length ? (
        <View style={s.ticks} pointerEvents="none">
          {inside.map((r) => (
            <View key={r.turnMs} style={[s.tickBox, { left: pct(r.turnMs) }]}>
              <Text style={s.tickN}>{reps.indexOf(r) + 1}</Text>
              <View style={s.tickBar} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={[s.track, TOUCH_STYLE]} onLayout={(e) => pan.measured(e.nativeEvent.layout.width)}>
        <View pointerEvents="none" style={s.strip}>
          {pictures.map((u, i) => (
            <View key={i} style={s.cell}>
              <FrameFill />
              {u ? <Image source={{ uri: u }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
            </View>
          ))}
        </View>
        <View pointerEvents="none" style={[s.playhead, { left: pct(head) }]} />
        {/* The scrub layer, then the marks over it. */}
        <View {...pan.responder.panHandlers} style={StyleSheet.absoluteFill} accessible={false} />
        {markers.map((m, i) => (
          <Pressable
            key={`${m.n}-${m.atMs}`}
            onPress={() => {
              player.pause();
              onMarker(i);
            }}
            hitSlop={10}
            style={[s.mark, { left: pct(m.atMs) }]}
            accessibilityRole="button"
            accessibilityLabel={m.label}
          >
            <Text style={s.markN}>{m.n}</Text>
          </Pressable>
        ))}
      </View>
      {markers.length ? <Text style={s.caption}>Tap a bronze mark to see that moment slowly.</Text> : null}
    </View>
  );
}

/**
 * "Show me": the clip from `fromMs`, slowly, stopping on `toMs` — then `onDone`, and the screen shows the marked still.
 * A replay that never reaches its moment (a player that would not start) still ends, a beat after it should have.
 */
export function SlowReplay({ uri, fromMs, toMs, onDone }: { uri: string; fromMs: number; toMs: number; onDone: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = false;
    p.timeUpdateEventInterval = 0.05;
    p.currentTime = fromMs / 1000;
    // Setting the rate starts playback at it (and keeps it through `play`) on iOS 16+.
    p.playbackRate = SHOW_ME_RATE;
    p.play();
  });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (currentTime * 1000 >= toMs - 20) {
      player.pause();
      onDone();
    }
  });
  useEffect(() => {
    const t = setTimeout(onDone, Math.max(0, toMs - fromMs) / SHOW_ME_RATE + 2500);
    return () => clearTimeout(t);
  }, [fromMs, toMs, onDone]);

  return (
    <View style={s.replay}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      <Text style={s.slow}>{`SLOW · ${SHOW_ME_RATE}×`}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  video: { height: 280, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0B0A08', alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', left: 14, top: 12, fontSize: 11, fontWeight: '600', letterSpacing: 1, color: 'rgba(240,237,232,0.6)' },
  play: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(10,10,10,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  time: { position: 'absolute', right: 12, bottom: 10, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(10,10,10,0.6)', fontSize: 12, fontWeight: '600', color: '#F0EDE8', fontVariant: ['tabular-nums'], overflow: 'hidden' },
  ticks: { height: 18, marginTop: 4 },
  tickBox: { position: 'absolute', top: 0, width: 20, marginLeft: -10, alignItems: 'center', gap: 2 },
  tickN: { fontSize: 10, fontWeight: '700', color: C.ink3 },
  tickBar: { width: 2, height: 4, borderRadius: 1, backgroundColor: C.ink3 },
  track: { height: STRIP_H, justifyContent: 'center' },
  strip: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', gap: 2, backgroundColor: C.line },
  cell: { flex: 1, overflow: 'hidden' },
  playhead: { position: 'absolute', top: -4, height: STRIP_H + 8, width: 4, marginLeft: -2, borderRadius: 2, backgroundColor: '#F0EDE8', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(10,10,10,0.45)' },
  mark: {
    position: 'absolute',
    top: (STRIP_H - MARK) / 2,
    width: MARK,
    height: MARK,
    marginLeft: -MARK / 2,
    borderRadius: MARK / 2,
    backgroundColor: C.brzHi,
    borderWidth: 2,
    borderColor: '#0B0A08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markN: { fontSize: 11, fontWeight: '700', color: 'rgba(20,14,8,0.9)' },
  caption: { fontSize: 12, color: C.ink3 },
  replay: { flex: 1, backgroundColor: '#050505' },
  slow: { position: 'absolute', left: 14, top: 12, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(10,10,10,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#F0EDE8', overflow: 'hidden' },
});
