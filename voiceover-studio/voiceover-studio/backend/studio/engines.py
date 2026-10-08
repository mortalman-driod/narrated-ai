"""Lazy local-only adapters. Installing models is an explicit setup operation.

No model library is imported on API startup. A worker reuses loaded models and
serializes inference per process; run one worker per GPU to bound VRAM use.
"""
from __future__ import annotations

from contextlib import contextmanager
import importlib.util
import os
from pathlib import Path
import sys
import threading
import wave

_MODEL_LOCK = threading.RLock()
_MODELS: dict[tuple, object] = {}
_RUNTIME_ERRORS: dict[str, str] = {}
_ACTIVE_ENGINE: str | None = None

KOKORO_VOICES = [
    ("af_heart", "Heart", "female", "American", "Warm"),
    ("af_bella", "Bella", "female", "American", "Bright"),
    ("af_nicole", "Nicole", "female", "American", "Soft"),
    ("af_sarah", "Sarah", "female", "American", "Conversational"),
    ("am_adam", "Adam", "male", "American", "Deep"),
    ("am_michael", "Michael", "male", "American", "Warm"),
    ("bf_emma", "Emma", "female", "British", "Refined"),
    ("bf_isabella", "Isabella", "female", "British", "Documentary"),
    ("bm_george", "George", "male", "British", "Authoritative"),
    ("bm_lewis", "Lewis", "male", "British", "Crisp"),
]
PIPER_VOICES = [
    ("en_US-ljspeech-medium", "LJ", "female", "American", "Clear"),
    ("en_US-lessac-medium", "Lessac", "male", "American", "Clear"),
    ("en_US-amy-medium", "Amy", "female", "American", "Conversational"),
]


class EngineUnavailable(RuntimeError):
    pass


def _settings():
    from .config import settings
    return settings


def _installed(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except (ModuleNotFoundError, ValueError):
        return False


def _files(engine: str, model_voice: str | None = None) -> list[Path]:
    root = Path(_settings().models_dir) / engine
    if engine == "kokoro":
        files = [root / "config.json", root / "kokoro-v1_0.pth"]
        if model_voice:
            files.append(root / "voices" / f"{model_voice}.pt")
        return files
    if engine == "piper":
        voice = model_voice or "en_US-ljspeech-medium"
        return [root / f"{voice}.onnx", root / f"{voice}.onnx.json"]
    if engine == "xtts":
        return [root / name for name in ("config.json", "model.pth", "vocab.json", "speakers_xtts.pth")]
    raise EngineUnavailable(f"Unknown engine: {engine}")


def _availability(engine: str, model_voice: str | None = None) -> tuple[bool, str]:
    package = {"kokoro": "kokoro", "piper": "piper", "xtts": "TTS"}[engine]
    if not _installed(package):
        return False, f"Install the {engine} optional dependencies and local model files with setup."
    missing = [path.name for path in _files(engine, model_voice) if not path.is_file()]
    if missing:
        return False, "Missing local model files: " + ", ".join(missing)
    if engine == "kokoro" and not _installed("en_core_web_sm"):
        return False, "Install the en_core_web_sm phonemizer resource during setup."
    if engine in _RUNTIME_ERRORS:
        return False, _RUNTIME_ERRORS[engine]
    return True, "Local files and dependencies present; model loads on first render."


def engine_status() -> list[dict]:
    results = []
    for engine in ("kokoro", "piper", "xtts"):
        available, detail = _availability(engine)
        results.append({"id": engine, "available": available, "detail": detail})
    return results


def stock_voices() -> list[dict]:
    voices = []
    for engine, records in (("kokoro", KOKORO_VOICES), ("piper", PIPER_VOICES)):
        for model_voice, name, gender, accent, tone in records:
            available, detail = _availability(engine, model_voice)
            voices.append({"id": f"{engine}:{model_voice}", "name": name, "gender": gender,
                           "accent": accent, "tone": tone, "engine": engine,
                           "model_voice": model_voice, "custom": False, "available": available,
                           "description": (f"{accent} English · {engine.title()} stock voice." if available else detail)})
    return voices


def resolve_engine(voice: dict, requested: str = "auto") -> str:
    engine = voice["engine"]
    if requested not in {"auto", engine}:
        raise EngineUnavailable(f"This voice belongs to {engine}. Select a {requested} voice to use that engine.")
    available, detail = _availability(engine, voice.get("model_voice") if not voice.get("custom") else None)
    if not available:
        raise EngineUnavailable(detail)
    # Do not silently replace a selected narrator with a different Piper voice.
    return engine


def model_fingerprint(voice: dict) -> list[tuple[str, int, int]]:
    files = _files(voice["engine"], voice.get("model_voice") if not voice.get("custom") else None)
    if voice.get("reference_path"):
        files.append(Path(voice["reference_path"]))
    return [(str(path.resolve()), path.stat().st_size, path.stat().st_mtime_ns) for path in files]


def _offline() -> None:
    # Set before importing Hugging Face / transformers, whose constants are
    # computed at import time. Explicit local paths are also always supplied.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_DATASETS_OFFLINE"] = "1"


def _torch_device(torch) -> str:
    device = _settings().device
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda" and not torch.cuda.is_available():
        raise EngineUnavailable("CUDA was requested but is unavailable. Set STUDIO_DEVICE=cpu or install a matching CUDA PyTorch build.")
    threads = max(1, int(os.environ.get("STUDIO_CPU_THREADS", min(8, os.cpu_count() or 1))))
    torch.set_num_threads(threads)
    if device == "cuda":
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
    return device


def _activate_engine(engine: str) -> None:
    """Keep at most one engine resident, rather than accumulating GPU models."""
    global _ACTIVE_ENGINE
    if _ACTIVE_ENGINE is not None and _ACTIVE_ENGINE != engine:
        _MODELS.clear()
        torch = sys.modules.get("torch")
        if torch is not None and torch.cuda.is_available():
            torch.cuda.empty_cache()
    _ACTIVE_ENGINE = engine


def _write_float_wave(path: Path, arrays, sample_rate: int, gain: float = 1.0) -> None:
    import numpy as np
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        frames = 0
        for array in arrays:
            values = np.asarray(array, dtype=np.float32).reshape(-1)
            if not np.isfinite(values).all():
                raise RuntimeError("The speech engine produced invalid audio samples.")
            pcm = (np.clip(values * gain, -1, 1) * 32767).astype("<i2")
            output.writeframes(pcm.tobytes())
            frames += len(values)
        if frames == 0:
            raise RuntimeError("The speech engine returned no audio for this passage.")


@contextmanager
def inference_session():
    with _MODEL_LOCK:
        yield


def synthesize(text: str, voice: dict, speed: float, destination: Path, emphasis: str = "none") -> None:
    """Write genuine engine output to a PCM WAV, using only installed weights."""
    if not text.strip():
        raise ValueError("Cannot synthesize an empty passage.")
    engine = voice["engine"]
    root = Path(_settings().models_dir) / engine
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    # SSML-lite emphasis is explicitly an acoustic approximation, not a claim
    # that any engine implements native SSML emotional control.
    emphasis_rate = {"none": 1, "reduced": 1.05, "moderate": 0.94, "strong": 0.88}[emphasis]
    gain = {"none": 1, "reduced": 0.9, "moderate": 1.05, "strong": 1.1}[emphasis]
    speed = min(2, max(0.5, speed * emphasis_rate))
    _offline()
    with _MODEL_LOCK:
        _activate_engine(engine)
        try:
            if engine == "piper":
                from piper import PiperVoice, SynthesisConfig
                name = voice["model_voice"]
                key = (engine, str(root), name)
                if key not in _MODELS:
                    _MODELS[key] = PiperVoice.load(str(root / f"{name}.onnx"), use_cuda=False)
                model = _MODELS[key]
                config = SynthesisConfig(length_scale=1 / speed, volume=gain)
                with wave.open(str(destination), "wb") as output:
                    model.synthesize_wav(text, output, syn_config=config)
            elif engine == "kokoro":
                import torch
                from kokoro import KModel, KPipeline
                device = _torch_device(torch)
                key = (engine, str(root), device)
                if key not in _MODELS:
                    _MODELS[key] = KModel(repo_id="hexgrad/Kokoro-82M", config=str(root / "config.json"), model=str(root / "kokoro-v1_0.pth")).to(device).eval()
                language = voice["model_voice"][0]
                pipeline_key = (*key, language)
                if pipeline_key not in _MODELS:
                    # Misaki otherwise tries to install spaCy resources. The
                    # preflight check makes runtime startup strictly offline.
                    if not _installed("en_core_web_sm"):
                        raise EngineUnavailable("Kokoro requires the local en_core_web_sm resource. Run setup for Kokoro.")
                    _MODELS[pipeline_key] = KPipeline(lang_code=language, model=_MODELS[key], repo_id="hexgrad/Kokoro-82M")
                pipeline = _MODELS[pipeline_key]
                voice_path = root / "voices" / f"{voice['model_voice']}.pt"
                with torch.inference_mode():
                    generated = pipeline(text, voice=str(voice_path), speed=speed, split_pattern=None)
                    _write_float_wave(destination, (result.audio.cpu().numpy() for result in generated if result.audio is not None), 24000, gain)
            elif engine == "xtts":
                import torch
                from TTS.tts.configs.xtts_config import XttsConfig
                from TTS.tts.models.xtts import Xtts
                device = _torch_device(torch)
                key = (engine, str(root), device)
                if key not in _MODELS:
                    config = XttsConfig()
                    config.load_json(str(root / "config.json"))
                    model = Xtts.init_from_config(config)
                    model.load_checkpoint(config, checkpoint_dir=str(root), eval=True, use_deepspeed=False)
                    _MODELS[key] = model.to(device).eval()
                model = _MODELS[key]
                reference = Path(voice.get("reference_path", ""))
                if not reference.is_file():
                    raise EngineUnavailable("This custom voice is missing its consented reference audio. Upload the reference again.")
                stat = reference.stat()
                latent_key = (*key, str(reference.resolve()), stat.st_size, stat.st_mtime_ns)
                if latent_key not in _MODELS:
                    # Keep a bounded set of conditioning tensors for large voice
                    # libraries. We retain the shared XTTS model itself.
                    for old_key in list(_MODELS):
                        if len(_MODELS) <= 16:
                            break
                        if len(old_key) > 3 and old_key[:3] == key:
                            del _MODELS[old_key]
                    _MODELS[latent_key] = model.get_conditioning_latents(audio_path=[str(reference)], gpt_cond_len=30, gpt_cond_chunk_len=6, max_ref_length=60)
                latent, embedding = _MODELS[latent_key]
                with torch.inference_mode():
                    result = model.inference(text, "en", latent, embedding, speed=speed, enable_text_splitting=True)
                _write_float_wave(destination, [result["wav"]], 24000, gain)
            else:
                raise EngineUnavailable(f"Unknown engine: {engine}")
        except (ImportError, ModuleNotFoundError) as exc:
            message = f"{engine.title()} could not load its local dependencies: {exc}. Re-run setup for this engine."
            _RUNTIME_ERRORS[engine] = message
            raise EngineUnavailable(message) from exc
    with wave.open(str(destination), "rb") as output:
        if output.getnframes() == 0:
            raise RuntimeError("The speech engine returned an empty WAV.")
