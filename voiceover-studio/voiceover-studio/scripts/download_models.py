"""Explicit setup-time downloads only. Application inference never calls this file."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REVISIONS = {
    "piper": "c10ece1aade47bb51c153c893d14e5bf8e5b7117",
    "kokoro": "f3ff3571791e39611d31c381e3a41a3af07b4987",
    "xtts": "6c2b0d75eae4b7047358e3b6bd9325f857d43f77",
}
REPOSITORIES = {"piper": "rhasspy/piper-voices", "kokoro": "hexgrad/Kokoro-82M", "xtts": "coqui/XTTS-v2"}
KOKORO_VOICES = ["af_heart", "af_bella", "af_nicole", "af_sarah", "am_adam", "am_michael", "bf_emma", "bf_isabella", "bm_george", "bm_lewis"]
KOKORO_SHA256 = "496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for part in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(part)
    return digest.hexdigest()


def download(url: str, destination: Path, expected_sha: str | None = None) -> dict:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.stat().st_size and (not expected_sha or sha256(destination) == expected_sha):
        print(f"Already present: {destination.name}", flush=True)
    else:
        partial = destination.with_name(destination.name + ".part")
        for attempt in range(3):
            try:
                request = urllib.request.Request(url, headers={"User-Agent": "Voiceover-Studio-Setup/0.1"})
                with urllib.request.urlopen(request, timeout=120) as response, partial.open("wb") as stream:
                    expected_size = int(response.headers.get("Content-Length", "0"))
                    size = 0
                    last_report = time.monotonic()
                    while block := response.read(1024 * 1024):
                        stream.write(block)
                        size += len(block)
                        if time.monotonic() - last_report > 5:
                            print(f"Downloading {destination.name}: {size / 1048576:.1f} MiB", flush=True)
                            last_report = time.monotonic()
                if not size or (expected_size and size != expected_size):
                    raise OSError(f"Incomplete download: {size} of {expected_size} bytes")
                if expected_sha and sha256(partial) != expected_sha:
                    raise OSError(f"SHA256 mismatch for {destination.name}")
                partial.replace(destination)
                print(f"Downloaded: {destination.name} ({size / 1048576:.1f} MiB)", flush=True)
                break
            except Exception:
                partial.unlink(missing_ok=True)
                if attempt == 2:
                    raise
                print(f"Retrying {destination.name}…", flush=True)
                time.sleep(2)
    return {"path": str(destination), "url": url, "bytes": destination.stat().st_size, "sha256": sha256(destination)}


def main() -> int:
    try:
        from dotenv import load_dotenv
        load_dotenv(ROOT / ".env")
    except ImportError:
        pass  # Standalone stdlib-only downloader also works before installation.
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", choices=["piper", "kokoro", "xtts", "all"], default="piper")
    parser.add_argument("--models-dir", type=Path)
    parser.add_argument("--piper-voice", choices=["en_US-ljspeech-medium", "en_US-lessac-medium", "en_US-amy-medium"], default="en_US-ljspeech-medium")
    parser.add_argument("--accept-xtts-license", action="store_true", help="Confirm you have reviewed and accept the XTTS Coqui Public Model License (non-commercial model/output use)")
    args = parser.parse_args()
    engines = ["piper", "kokoro", "xtts"] if args.engine == "all" else [args.engine]
    if "xtts" in engines and not args.accept_xtts_license:
        parser.error("XTTS requires --accept-xtts-license after reviewing https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt. It is not a permissive commercial-use model.")
    data = Path(os.environ.get("STUDIO_DATA_DIR", ROOT / "data")).expanduser()
    if not data.is_absolute():
        data = ROOT / data
    models = (args.models_dir or data / "models").resolve()
    for engine in engines:
        directory = models / engine
        base = f"https://huggingface.co/{REPOSITORIES[engine]}/resolve/{REVISIONS[engine]}/"
        if engine == "piper":
            locale, speaker, quality = args.piper_voice.split("-")
            remote = f"{locale.split('_')[0]}/{locale}/{speaker}/{quality}/"
            files = [(remote + args.piper_voice + suffix, args.piper_voice + suffix) for suffix in [".onnx", ".onnx.json"]]
            files += [(remote + "MODEL_CARD", args.piper_voice + ".MODEL_CARD.md")]
        elif engine == "kokoro":
            files = [(name, name) for name in ["config.json", "kokoro-v1_0.pth", "README.md", "LICENSE"] + [f"voices/{voice}.pt" for voice in KOKORO_VOICES]]
        else:
            files = [(name, name) for name in ["config.json", "model.pth", "vocab.json", "speakers_xtts.pth", "LICENSE.txt", "README.md"]]
        manifest = []
        for remote, local in files:
            manifest.append(download(base + remote, directory / local, KOKORO_SHA256 if local == "kokoro-v1_0.pth" else None))
        (directory / "download-manifest.json").write_text(json.dumps({"repository": REPOSITORIES[engine], "revision": REVISIONS[engine], "files": manifest}, indent=2), encoding="utf-8")
        print(f"{engine}: ready in {directory}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        print(f"Model setup failed: {error}", file=sys.stderr)
        raise SystemExit(1)
