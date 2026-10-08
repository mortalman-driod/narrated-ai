"""Engine interface. Every engine turns text into a WAV file."""
from abc import ABC, abstractmethod


class TTSEngine(ABC):
    name = "base"
    sample_rate = 24000

    @abstractmethod
    def synthesize(self, text: str, voice: dict, out_wav: str) -> str:
        """Write a WAV of `text` in `voice` to `out_wav`; return the path."""
        raise NotImplementedError
