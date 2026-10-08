"""Kokoro TTS — primary local engine (Apache-2.0). pip install kokoro"""
from .base import TTSEngine


class KokoroEngine(TTSEngine):
    name = "kokoro"
    sample_rate = 24000

    def __init__(self):
        from kokoro import KPipeline   # deferred: heavy import
        self._pipeline = KPipeline(lang_code="a")
        self._available = True

    def synthesize(self, text: str, voice: dict, out_wav: str) -> str:
        import soundfile as sf
        generator = self._pipeline(text, voice=voice["engine_voice"], speed=1.0)
        audio = next(generator)[-1].numpy()          # take first (largest) segment
        sf.write(out_wav, audio, self.sample_rate)
        return out_wav
