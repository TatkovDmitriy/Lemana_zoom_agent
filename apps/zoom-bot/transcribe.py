#!/usr/bin/env python3
"""Transcribe an audio file using faster-whisper.

Invoked from src/transcribe.ts as:

    python3 transcribe.py <audio_path> \
        --language ru \
        --model large-v3 \
        --device cpu \
        --compute-type int8

The full transcript is printed to stdout. Progress / model load logs go to
stderr so they don't pollute the transcript captured by Node.
"""
from __future__ import annotations

import argparse
import sys

from faster_whisper import WhisperModel


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="faster-whisper transcription")
    parser.add_argument("audio_path", help="Path to the input audio file")
    parser.add_argument("--language", default="ru")
    parser.add_argument("--model", default="large-v3")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument(
        "--beam-size",
        type=int,
        default=5,
        help="Beam search size (higher = better quality, slower)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    print(
        f"[transcribe] loading model={args.model} device={args.device} "
        f"compute_type={args.compute_type}",
        file=sys.stderr,
    )
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)

    print(f"[transcribe] transcribing {args.audio_path} lang={args.language}", file=sys.stderr)
    segments, info = model.transcribe(
        args.audio_path,
        language=args.language,
        beam_size=args.beam_size,
        vad_filter=True,
    )

    print(
        f"[transcribe] detected_language={info.language} "
        f"duration={info.duration:.1f}s",
        file=sys.stderr,
    )

    pieces: list[str] = []
    for segment in segments:
        text = segment.text.strip()
        if text:
            pieces.append(text)

    sys.stdout.write(" ".join(pieces))
    sys.stdout.write("\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
