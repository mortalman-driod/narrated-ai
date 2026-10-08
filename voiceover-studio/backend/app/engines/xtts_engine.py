"""Coqui XTTS v2 — local voice cloning for custom (Nigerian) voices.
pip install TTS==0.22.*
"""
from pathlib import Path

from .base import TTSEngine


class XTTSEngine(TTSEngine):
    name = "xtts"
    sample_rate = 24000

    def __init__(self):
        from TTS.api import TTS   # deferred: heavy import
        self._tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        self._tts.to("cuda")

    def synthesize(self, text: str, voice: dict, out_wav: str) -> str:
        ref = Path(voice["reference_wav"])
        if not ref.exists():
            raise FileNotFoundError(f"Reference audio missing for {voice['name']}")
        self._tts.tts_to_file(
            text=text,
            file_path=out_wav,
            speaker_wav=str(ref),
            language="en",
        )
        return out_wav
