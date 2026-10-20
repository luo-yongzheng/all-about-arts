#!/usr/bin/env python3
"""Use an already installed macOS system voice. No packages or network calls."""
import argparse
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--script-file", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--voice")
    parser.add_argument("--rate", type=int)
    args = parser.parse_args()
    if sys.platform != "darwin" or not shutil.which("say"):
        parser.error("macOS say is unavailable; import audio or configure an existing TTS command")
    source = Path(args.script_file).resolve(strict=True)
    if not source.read_text(encoding="utf-8").strip():
        parser.error("narration script is empty")
    if args.rate is not None and not 40 <= args.rate <= 500:
        parser.error("speech rate must be 40–500 words per minute")
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    command = ["say", "-f", str(source), "-o", str(output)]
    if args.voice:
        command += ["-v", args.voice]
    if args.rate is not None:
        command += ["-r", str(args.rate)]
    completed = subprocess.run(command, check=False, capture_output=True, text=True, timeout=120)
    if completed.returncode:
        print(completed.stderr.strip(), file=sys.stderr)
        return completed.returncode
    if not output.is_file() or output.stat().st_size == 0:
        print("say produced no audio", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
