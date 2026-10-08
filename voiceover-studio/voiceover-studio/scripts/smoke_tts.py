"""Generate actual local Piper speech and validate a nonempty PCM waveform."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import time
import wave

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--text", default="Welcome to Voiceover Studio. This narration is generated on your computer, with no cloud speech service.")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    data = Path(os.environ.get("STUDIO_DATA_DIR", ROOT / "data"))
    if not data.is_absolute():
        data = ROOT / data
    models = data / "models"
    output = args.output or data / "diagnostics" / "piper-smoke.wav"
    output.parent.mkdir(parents=True, exist_ok=True)
    model = models / "piper" / "en_US-ljspeech-medium.onnx"
    if not model.is_file():
        parser.error("Piper weights missing. Run scripts/download_models.py --engine piper first.")
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    from piper import PiperVoice
    import numpy as np
    started = time.perf_counter()
    voice = PiperVoice.load(str(model))
    with wave.open(str(output), "wb") as stream:
        voice.synthesize_wav(args.text, stream)
    with wave.open(str(output), "rb") as stream:
        duration = stream.getnframes() / stream.getframerate()
        samples = np.frombuffer(stream.readframes(stream.getnframes()), dtype=np.int16)
    if duration <= 0.1 or not np.any(samples):
        raise RuntimeError("Synthesizer produced no measurable speech signal")
    elapsed = time.perf_counter() - started
    print(f"Speech generated: {output.resolve()}\nDuration: {duration:.2f}s; elapsed including model load: {elapsed:.2f}s; RTF: {elapsed/duration:.3f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
