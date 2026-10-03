#!/usr/bin/env bash
# Every deliverable from the ungraded 60 fps masters (node capture/render.mjs …). Run from film/:
#   bash capture/deliver.sh
# One light grade for everything: warmer shadows so the app's slightly teal blacks sit in the same warm black as the
# background, a touch deeper blacks, a hair more saturation for the bronze.
#   out/final/   graded 60 fps masters with full sound (film 16:9 + 9:16, ad 16:9 + 9:16) — for social and archive
#   ../site/assets/film/   the homepage hero's loop (9:16 — PO 10-02, it lives in the hero column): 30 fps,
#                          H.264 MP4 + VP9 WebM, each under 5 MB, and its poster
set -euo pipefail
# The masters come out of Remotion as full-range BT.601 (yuvj420p — its frames are JPEGs). Phones want limited-range
# BT.709, tagged as such: iPhone Safari froze on the full-range, level-5.0 web file (PO 10-02). So the grade ends in
# that conversion, every H.264 file is capped at a phone-safe level (which also caps reference frames), and every
# file is tagged.
G="colorbalance=rs=0.015:gs=0.003:bs=-0.025:rm=0.005:bm=-0.005,curves=master='0/0 0.05/0.038 0.5/0.505 0.9/0.92 1/1',eq=saturation=1.04,scale=out_range=tv:out_color_matrix=bt709,format=yuv420p"
TAGS="-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
WEB=../site/assets/film
POSTER_AT=10.6   # NEW PERSONAL RECORD, lifted off the phone (same moment in the web loop: its first 11.08 s are the film's)
mkdir -p out/final out/enc "$WEB"
ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# WEB_ONLY=1 skips the social masters (they take ~6 min and only change when a master does).
[ -n "${WEB_ONLY:-}" ] || for pair in HeroDesktop:forge-hero-16x9 HeroPhone:forge-hero-9x16 Ad15Desktop:forge-ad15-16x9 Ad15Phone:forge-ad15-9x16; do
  id=${pair%%:*}; name=${pair##*:}
  [ -f "out/master-$id.mp4" ] || { echo "missing out/master-$id.mp4"; continue; }
  ff -i "out/master-$id.mp4" -vf "$G" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level:v 4.2 $TAGS \
     -c:a aac -b:a 320k -movflags +faststart "out/final/$name.mp4"
  echo "out/final/$name.mp4"
done

# Web loops. A short fade from black at the top and to black at the end, so the loop's seam is a breath, not a jump.
web() { # master, shape, width, height, video kbps
  local src=$1 shape=$2 w=$3 h=$4 kb=$5
  local dur; dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  local vf="$G,fps=30,scale=$w:$h:flags=lanczos,fade=t=in:st=0:d=0.35,fade=t=out:st=$(awk "BEGIN{print $dur - 0.6}"):d=0.6"
  local af="afade=t=in:st=0:d=0.35,afade=t=out:st=$(awk "BEGIN{print $dur - 0.6}"):d=0.6"
  ff -i "$src" -vf "$vf" -an -c:v libx264 -preset veryslow -b:v ${kb}k -maxrate $((kb * 2))k -bufsize $((kb * 4))k \
     -pix_fmt yuv420p -profile:v high -level:v 4.0 $TAGS -pass 1 -passlogfile out/enc/x264-$shape -f mp4 /dev/null
  ff -i "$src" -vf "$vf" -af "$af" -c:v libx264 -preset veryslow -b:v ${kb}k -maxrate $((kb * 2))k -bufsize $((kb * 4))k \
     -pix_fmt yuv420p -profile:v high -level:v 4.0 $TAGS -pass 2 -passlogfile out/enc/x264-$shape -c:a aac -b:a 96k -movflags +faststart "$WEB/hero-$shape.mp4"
  ff -i "$src" -vf "$vf" -an -c:v libvpx-vp9 -b:v ${kb}k -row-mt 1 -deadline good -cpu-used 1 $TAGS -pass 1 \
     -passlogfile out/enc/vp9-$shape -f webm /dev/null
  ff -i "$src" -vf "$vf" -af "$af" -c:v libvpx-vp9 -b:v ${kb}k -row-mt 1 -deadline good -cpu-used 1 $TAGS -pass 2 \
     -passlogfile out/enc/vp9-$shape -c:a libopus -b:a 80k "$WEB/hero-$shape.webm"
  ff -ss $POSTER_AT -i "$src" -frames:v 1 -vf "$G,scale=$w:$h:flags=lanczos" -q:v 4 "$WEB/poster-$shape.jpg"
  ls -la "$WEB"/hero-$shape.* "$WEB"/poster-$shape.jpg
}
# 2026-10-03: the hero shows the 25.8 s WEB loop (WebPhone — src/timeline.ts WEB), not the 47.5 s film. Half the length
# buys the bitrate back for the app's small text: 1200 + 96 kbps ≈ 4.2 MB (5 MB cap). The film was 700 kbps.
web out/master-WebPhone.mp4 9x16 720 1280 ${KB9:-1200}
# (a 16:9 web loop: web out/master-HeroDesktop.mp4 16x9 1920 1080 800 — 4.6 MB; not on the page since the film moved
#  into the hero)
