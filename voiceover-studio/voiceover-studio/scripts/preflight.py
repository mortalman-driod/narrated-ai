"""Read-only checks for a local installation. Does not download or load models."""
from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))


def main() -> int:
    if importlib.util.find_spec("dotenv"):
        from dotenv import load_dotenv
        load_dotenv(ROOT / ".env")
    print(f"Python: {sys.version.split()[0]} ({sys.executable})")
    failures = []
    if sys.version_info[:2] not in [(3, 11), (3, 12)]:
        failures.append("Use Python 3.11 (recommended) or 3.12.")
    for executable in ("ffmpeg", "ffprobe"):
        location = shutil.which(os.environ.get(f"{executable.upper()}_BIN", executable))
        print(f"{executable}: {location or 'MISSING'}")
        if not location:
            failures.append(f"Install {executable} and add it to PATH.")
    for package in ("fastapi", "uvicorn", "soundfile", "numpy", "multipart"):
        found = importlib.util.find_spec(package) is not None
        print(f"{package}: {'installed' if found else 'MISSING'}")
        if not found:
            failures.append(f"Install backend dependencies: {package} is missing.")
    data = Path(os.environ.get("STUDIO_DATA_DIR", ROOT / "data")).expanduser()
    if not data.is_absolute():
        data = ROOT / data
    data = data.resolve()
    models = data / "models"
    print(f"Data: {data}\nModels: {models}")
    ready = []
    for name, package, paths in [
        ("piper", "piper", ["piper/en_US-ljspeech-medium.onnx", "piper/en_US-ljspeech-medium.onnx.json"]),
        ("kokoro", "kokoro", ["kokoro/config.json", "kokoro/kokoro-v1_0.pth", "kokoro/voices/af_heart.pt"]),
        ("xtts", "TTS", ["xtts/config.json", "xtts/model.pth", "xtts/vocab.json", "xtts/speakers_xtts.pth"]),
    ]:
        available = importlib.util.find_spec(package) is not None and all((models / path).is_file() for path in paths)
        print(f"{name}: {'installed with weights' if available else 'not installed / weights missing (optional)'}")
        if available:
            ready.append(name)
    if not ready:
        print("No speech engine ready. Run setup.ps1 / bash setup, or scripts/download_models.py after installing an engine.")
    print(f"Queue: {os.environ.get('STUDIO_QUEUE_MODE', 'local')}; device: {os.environ.get('STUDIO_DEVICE', 'auto')}")
    print(f"Frontend build: {'present' if (ROOT / 'frontend/dist/index.html').is_file() else 'missing; run npm run build in frontend'}")
    for failure in failures:
        print(f"ERROR: {failure}", file=sys.stderr)
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
