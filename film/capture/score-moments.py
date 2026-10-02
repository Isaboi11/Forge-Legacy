# The film's score, cut from the licensed track "Moments (Instrumental Version)" by Ayoub (Epidemic Sound, licensed
# by the PO 10-02). The WAV lives in public/music/ (git-ignored) — never commit it.
#   python capture/score-moments.py          → the film's score
#   python capture/score-moments.py ad15     → the 15 s ad's score (shots 1, 4, 6 — src/timeline.ts AD15)
# 125 BPM exactly (beat 0.48 s, bar 1.92 s), kick grid phase 0.46 s, measured on the file. Each piece is spliced on a
# beat with a short equal-power crossfade, placed on the film's real-time beats (src/timeline.ts realAt):
#   1 · the intro's tail fading to the break's silence under the grey app → the DROP (beat 64, 31.18 s) on the turn
#       (film 1.4 → real 3.40 s), full energy through one tap, Holt, the missed week AND the squad — the momentum holds
#       (drop 1 is 15 bars long, to real 32.20; it plays 14 bars and 2 beats of it)
#   2 · the last five beats of the track's BUILD under the squad card (real 31.24 s; beats 179-183, the hats climbing;
#       its thinning bar and pre-drop silence left out), then the one-beat PICKUP (beat 191) straight into
#   3 · the SECOND DROP (beat 192, 92.62 s) on the Legacy pull-back (real 34.12 s = TURN + 64 beats; the move starts at
#       realAt(14.0) = 34.07 — the squad shot's length was chosen for this)
#   4 · the track's FINAL HIT and outro (beat 284, 136.78 s) as the end card arrives (real 43.72 s: shot 5's pieces start
#       leaving at realAt(17.2) = 43.67, the end card at realAt(17.55) = 44.02), faded out at the end
# PO 10-02 on the earlier cut: the missed week "kind of loses momentum" — it cut to the BREAKDOWN (beat 124) for three
# bars, where the kick stops; and the Welcome back hold (+2.4 s) had left the second drop ~1 s ahead of the pull-back.
# Then loudness: -14 LUFS integrated, -1 dBTP (ffmpeg loudnorm, two passes) → public/music/score-moments.wav.
# If the film's timing changes, re-derive the film times below from realAt().
import json, subprocess, sys
import numpy as np
from scipy.io import wavfile

SRC = 'public/music/ES_Moments (Instrumental Version) - Ayoub.wav'
RAW = 'public/music/score-moments-raw.wav'
OUT = 'public/music/score-moments.wav'
BAR = 1.92
TURN = 3.40          # realAt(1.4)
FILM = 47.47         # RDUR (47.47 since the squad shot, PO 10-02)

# Downbeats = the kicks themselves, measured at 10 ms on the file (kick grid phase 0.46 s; an onset-envelope fit
# was 0.29 s early and the drop landed half a beat late). Track map (per-bar RMS, low band = kick): intro bars 0-14,
# silence 15, DROP 1 bars 16-30, BREAKDOWN 31-38 (no kick), silence 39, BUILD 40-46 (kick, rising), silence 47 with a
# pickup on its beat 4, DROP 2 bars 48-70, OUTRO 71+.
PHASE, BEAT = 0.46, 0.48
at = lambda k: PHASE + k * BEAT
D1, D2, HIT = at(64), at(192), at(284)                # 31.18, 92.62, 136.78
BUILD_END, PICKUP = at(184), at(191)                  # 88.78 (bar 46 starts thinning), 92.14
f2 = TURN + 64 * BEAT        # 34.12 — the pull-back (realAt(14.0) = 34.07)
f1 = f2 - 6 * BEAT           # 31.24 — the build, under the squad card (inside drop 1, which runs to 32.20)
f3 = f2 + 5 * BAR            # 43.72 — shot 5 leaves, the end card arrives (realAt(17.2) = 43.67, realAt(17.55) = 44.02)
def build_into(fa, fb):      # the build, ending on the pickup at fb: [build … BUILD_END] + [PICKUP, one beat]
    return [(BUILD_END - (fb - BEAT - fa), fa, fb - BEAT), (PICKUP, fb - BEAT, fb)]
pieces = [                   # (track start, film start, film end)
    (D1 - TURN, 0.0, f1),
    *build_into(f1, f2)[:1],
    (PICKUP, f2 - BEAT, f3),  # the pickup runs on into the second drop: one continuous stretch of the track
    (HIT, f3, FILM),
]
if sys.argv[1:] == ['ad15']:
    # The ad: the same opening, the drop on the turn running on through the cut to the missed week, then the build's
    # last five beats and the pickup → the FINAL HIT on the end card (11.08, its picture cut; AD15 in src/timeline.ts).
    RAW, OUT, FILM = 'public/music/score-ad15-raw.wav', 'public/music/score-ad15.wav', 15.0
    a2 = TURN + 4 * BAR      # 11.08
    a1 = a2 - 6 * BEAT       # 8.20
    pieces = [(D1 - TURN, 0.0, a1), *build_into(a1, a2), (HIT, a2, FILM)]

sr, x = wavfile.read(SRC)
x = x.astype(np.float64)
x /= np.abs(x).max()                                  # one global scale (24-bit PCM arrives as int32); loudnorm sets level
n = int(round(FILM * sr))
out = np.zeros((n, x.shape[1]))
XF = int(0.06 * sr)                                   # 60 ms equal-power crossfade at each splice
for i, (ts, fa, fb) in enumerate(pieces):
    a, b = int(round(fa * sr)), int(round(fb * sr))
    s = int(round(ts * sr))
    lead = XF if i > 0 else 0                         # start the piece a hair early so it can fade in under the last
    tail = XF if i < len(pieces) - 1 else 0
    seg = x[s - lead: s + (b - a) + tail].copy()
    g = np.ones(len(seg))
    if lead:
        g[:lead] = np.sin(np.linspace(0, np.pi / 2, lead))
    if tail:
        g[-tail:] = np.cos(np.linspace(0, np.pi / 2, tail))
    seg *= g[:, None]
    lo, hi = a - lead, min(n, b + tail)
    out[lo:hi] += seg[: hi - lo]
fin = int(0.5 * sr)                                    # the cut opens mid-intro: ease it in
out[:fin] *= np.sin(np.linspace(0, np.pi / 2, fin))[:, None]
fade = int(1.4 * sr)                                   # the outro fades away under the end card
out[-fade:] *= np.cos(np.linspace(0, np.pi / 2, fade))[:, None]
wavfile.write(RAW, sr, out.astype(np.float32))

probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', RAW, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
m = json.loads(probe[probe.rindex('{'): probe.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-1:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', RAW, '-af', af, '-ar', '48000', '-c:a', 'pcm_s24le', OUT], check=True)
print('pieces', [(round(t, 3), round(a, 2), round(b, 2)) for t, a, b in pieces])
print('measured', m['input_i'], 'LUFS ->', OUT)
