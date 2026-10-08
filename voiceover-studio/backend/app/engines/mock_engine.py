"""Placeholder engine so the full app works before model weights are installed.

Generates a soft, voice-like tone melody (per-voice pitch/tempo character) —
enough to exercise previews, jobs, downloads, and the UI end to end.
Replace by installing kokoro (primary) or TTS/XTTS v2 (cloning).
"""
import wave

import numpy as np

from .base import TTSEngine


class MockEngine(TTSEngine):
    name = "mock"
    sample_rate = 24000

    def synthesize(self, text: str, voice: dict, out_wav: str) -> str:
        sr = self.sample_rate
        base_pitch = 130.0 * (2.0 ** (voice.get("pitch_semitones", 0) / 12.0))
        if voice.get("gender") == "female":
            base_pitch *= 1.7
        rng = np.random.default_rng(abs(hash(text)) % (2**32))

        words = text.split() or ["..."]
        dur_per_word = 0.34 if voice.get("pace", "natural") == "natural" else 0.40
        t = np.arange(int(sr * dur_per_word)) / sr
        parts = []
        for w in words:
            syllables = max(1, min(4, len(w) // 3 + 1))
            for s in range(syllables):
                f = base_pitch * (1.0 + 0.12 * s + rng.uniform(-0.03, 0.03))
                env = np.sin(np.pi * np.linspace(0, 1, len(t))) ** 1.5
                tone = (
                    np.sin(2 * np.pi * f * t)
                    + 0.35 * np.sin(2 * np.pi * f * 2 * t)
                    + 0.15 * np.sin(2 * np.pi * f * 3 * t)
                ) * env * 0.35
                parts.append(tone)
            parts.append(np.zeros(int(sr * 0.06)))   # word gap
        audio = np.concatenate(parts).astype(np.float32)

        with wave.open(out_wav, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes((audio * 32767).astype(np.int16).tobytes())
        return out_wav
