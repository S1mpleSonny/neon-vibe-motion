#!/usr/bin/env bash
set -euo pipefail

# extract-frames.sh — FFmpeg frame extraction and comparison for neon-replicate
#
# Usage:
#   extract-frames.sh coarse <video> <output_dir>
#   extract-frames.sh dense  <video> <output_dir> <start_sec> <duration_sec>
#   extract-frames.sh compare <video_a> <video_b> <output_dir> [fps]
#
# All frames are scaled to max 720px on the long edge to avoid buffer limits.

MODE="${1:-}"

# Scale filter: limit long edge to 720px, preserve aspect ratio
SCALE_FILTER="scale='if(gt(iw,ih),min(720,iw),-2)':'if(gt(iw,ih),-2,min(720,ih))'"

case "$MODE" in
  coarse)
    # Coarse scan: 2fps across entire video
    VIDEO="${2:?Usage: extract-frames.sh coarse <video> <output_dir>}"
    OUT_DIR="${3:?Usage: extract-frames.sh coarse <video> <output_dir>}"
    mkdir -p "$OUT_DIR"
    ffmpeg -i "$VIDEO" -vf "fps=2,${SCALE_FILTER}" -q:v 2 "$OUT_DIR/coarse_%04d.jpg" -y 2>/dev/null
    COUNT=$(ls "$OUT_DIR"/coarse_*.jpg 2>/dev/null | wc -l | tr -d ' ')
    echo "✓ Extracted $COUNT coarse frames (≤720px) to $OUT_DIR"
    ;;

  dense)
    # Dense scan: 10fps on a specific interval
    VIDEO="${2:?Usage: extract-frames.sh dense <video> <output_dir> <start> <duration>}"
    OUT_DIR="${3:?Usage: extract-frames.sh dense <video> <output_dir> <start> <duration>}"
    START="${4:?Missing start time (seconds)}"
    DURATION="${5:?Missing duration (seconds)}"
    mkdir -p "$OUT_DIR"
    ffmpeg -i "$VIDEO" -ss "$START" -t "$DURATION" -vf "fps=10,${SCALE_FILTER}" -q:v 2 "$OUT_DIR/dense_%04d.jpg" -y 2>/dev/null
    COUNT=$(ls "$OUT_DIR"/dense_*.jpg 2>/dev/null | wc -l | tr -d ' ')
    echo "✓ Extracted $COUNT dense frames (≤720px) ($START-$(echo "$START + $DURATION" | bc)s) to $OUT_DIR"
    ;;

  compare)
    # Compare: extract frames from both videos at same timestamps, hstack them
    VIDEO_A="${2:?Usage: extract-frames.sh compare <video_a> <video_b> <output_dir> [fps]}"
    VIDEO_B="${3:?Usage: extract-frames.sh compare <video_a> <video_b> <output_dir> [fps]}"
    OUT_DIR="${4:?Usage: extract-frames.sh compare <video_a> <video_b> <output_dir> [fps]}"
    FPS="${5:-5}"
    mkdir -p "$OUT_DIR"

    # Extract frames from both videos (scaled to ≤720px)
    ffmpeg -i "$VIDEO_A" -vf "fps=$FPS,${SCALE_FILTER}" -q:v 2 "$OUT_DIR/orig_%04d.jpg" -y 2>/dev/null
    ffmpeg -i "$VIDEO_B" -vf "fps=$FPS,${SCALE_FILTER}" -q:v 2 "$OUT_DIR/gen_%04d.jpg" -y 2>/dev/null

    # Side-by-side stitch each pair (result will be ≤1440px wide, ≤720px tall)
    # Handle different aspect ratios: scale both to 720px height, then hstack
    STITCHED=0
    for ORIG in "$OUT_DIR"/orig_*.jpg; do
      NUM=$(basename "$ORIG" | sed 's/orig_\(.*\)\.jpg/\1/')
      GEN="$OUT_DIR/gen_${NUM}.jpg"
      COMPARE="$OUT_DIR/compare_${NUM}.jpg"
      if [ -f "$GEN" ]; then
        # Scale both to same height (720px), preserve aspect ratio, then hstack
        ffmpeg -i "$ORIG" -i "$GEN" \
          -filter_complex "[0]scale=-2:720[a];[1]scale=-2:720[b];[a][b]hstack=inputs=2" \
          -q:v 2 "$COMPARE" -y 2>/dev/null
        STITCHED=$((STITCHED + 1))
      fi
    done

    echo "✓ Generated $STITCHED comparison frames (≤720px each side) in $OUT_DIR"
    ;;

  *)
    echo "Usage:"
    echo "  extract-frames.sh coarse <video> <output_dir>"
    echo "  extract-frames.sh dense  <video> <output_dir> <start_sec> <duration_sec>"
    echo "  extract-frames.sh compare <video_a> <video_b> <output_dir> [fps]"
    exit 1
    ;;
esac
