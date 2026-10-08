"""Resolve the right engine for a voice, with graceful fallback.

Engine availability is probed lazily so the app always starts: mock engine is
the guaranteed fallback until real model weights are installed.
"""
import threading

from .base import TTSEngine
from .mock_engine import MockEngine

_lock = threading.Lock()
_cache: dict[str, TTSEngine] = {}


def _build(engine_name: str) -> TTSEngine:
    if engine_name == "kokoro":
        try:
            from .kokoro_engine import KokoroEngine
            return KokoroEngine()
        except Exception:
            pass
    if engine_name == "xtts":
        try:
            from .xtts_engine import XTTSEngine
            return XTTSEngine()
        except Exception:
            pass
    return MockEngine()


def get_engine(engine_name: str) -> TTSEngine:
    with _lock:
        if engine_name not in _cache:
            _cache[engine_name] = _build(engine_name)
        return _cache[engine_name]
