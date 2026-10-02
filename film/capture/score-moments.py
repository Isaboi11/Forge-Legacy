# The film's score, cut from the licensed track "Moments (Instrumental Version)" by Ayoub (Epidemic Sound, licensed
# by the PO 10-02). The WAV lives in public/music/ (git-ignored) — never commit it.
#   python capture/score-moments.py
# 125 BPM exactly (beat 0.48 s, bar 1.92 s), kick grid phase 0.46 s, measured on the file. Four pieces, each spliced on a
# bar line with a short equal-power crossfade, placed on the film's real-time beats (src/timeline.ts realAt):
#   1 · the intro's tail fading to the break's silence under the grey app → the DROP (beat 64, 31.18 s) on the turn
#       (film 1.4 → real 3.40 s), full energy through one tap and Holt
#   2 · the BREAKDOWN (beat 124, 59.98 s) for the missed week, from the bar nearest Activity History (real 20.68 s)
#   3 · the SECOND DROP (beat 192, 92.62 s) on the Legacy pull-back (real 26.44 s)
#   4 · the track's FINAL HIT and outro (beat 284, 136.78 s) as the end card arrives (real 37.96 s), faded out at the end
# Then loudness: -14 LUFS integrated, -1 dBTP (ffmpeg loudnorm, two passes) → public/music/score-moments.wav.
# If the film's timing changes, re-derive the film times below from realAt() and keep every piece a whole number of bars.
import json, subprocess
import numpy as np
from scipy.io import wavfile

SRC = 'public/music/ES_Moments (Instrumental Version) - Ayoub.wav'
RAW = 'public/music/score-moments-raw.wav'
OUT = 'public/music/score-moments.wav'
BAR = 1.92
TURN = 3.40          # realAt(1.4)
FILM = 40.75         # RDUR

# Downbeats = the kicks themselves, measured at 10 ms on the file (kick grid phase 0.46 s; an onset-envelope fit
# was 0.29 s early and the drop landed half a beat late): beat 64, 124, 192, 284.
PHASE, BEAT = 0.46, 0.48
D1, BD, D2, HIT = (PHASE + k * BEAT for k in (64, 124, 192, 284))   # 31.18, 59.98, 92.62, 136.78
f1 = TURN + 9 * BAR          # 20.68 — Activity History (realAt(9.05) = 20.50)
f2 = f1 + 3 * BAR            # 26.44 — the pull-back (realAt(14.0) = 26.35)
f3 = f2 + 6 * BAR            # 37.96 — the end card (realAt(17.55) = 37.30, badge 38.25)
pieces = [                   # (track start, film start, film end)
    (D1 - TURN, 0.0, f1),
    (BD, f1, f2),
    (D2, f2, f3),
    (HIT, f3, FILM),
]

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
