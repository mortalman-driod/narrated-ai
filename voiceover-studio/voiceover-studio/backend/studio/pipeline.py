"""Durable job runner: real inference, atomic cache, streaming chunks, exports."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import logging
from pathlib import Path
import re
import shutil
import tempfile
import time
from uuid import uuid4
import wave

from . import audio, config, engines, store
from .chunking import Chunk, plan_script

logger = logging.getLogger(__name__)
CACHE_VERSION = 2


def _cache_key(chunk: Chunk, voice: dict, settings: dict, fingerprint: list) -> str:
    package = {"kokoro": "kokoro", "piper": "piper-tts", "xtts": "coqui-tts"}[voice["engine"]]
    try:
        version = importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:
        version = "unknown"
    payload = {"v": CACHE_VERSION, "segments": chunk.to_dict()["segments"],
               "voice": voice["id"], "engine": voice["engine"], "package": version,
               "fingerprint": fingerprint, "settings": settings}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def _check(job_id: str) -> None:
    if store.cancel_requested(job_id):
        raise store.JobCancelled("Render cancelled.")


def _safe_name(name: str) -> str:
    return re.sub(r"[^\w.-]+", "_", name, flags=re.UNICODE).strip("_.")[:70] or "voiceover"


def _render_chunk(chunk: Chunk, voice: dict, settings: dict, output: Path, job_id: str) -> None:
    cancel = lambda: store.cancel_requested(job_id)
    # Temporary files bound RAM while retaining real inter-sentence pauses.
    with tempfile.TemporaryDirectory(prefix="chunk-", dir=output.parent) as temporary:
        directory = Path(temporary)
        parts: list[tuple[Path | None, int]] = []
        sample_rate: int | None = None
        for index, segment in enumerate(chunk.segments):
            _check(job_id)
            if not segment.text:
                parts.append((None, segment.pause_after_ms))
                continue
            raw = directory / f"segment-{index}.wav"
            engines.synthesize(segment.text, voice, float(settings.get("speed", 1)) * segment.rate,
                               raw, emphasis=segment.emphasis)
            _check(job_id)
            with wave.open(str(raw), "rb") as generated:
                rate = generated.getframerate()
            if sample_rate is not None and sample_rate != rate:
                raise RuntimeError("The speech engine changed sample rate within a chunk.")
            sample_rate = rate
            parts.append((raw, segment.pause_after_ms))
        combined = directory / "combined.wav"
        audio.concatenate_pcm(parts, combined, sample_rate=sample_rate or 24000, cancel=cancel)
        audio.normalize_chunk(combined, output, int(settings.get("loudness_lufs", -16)), cancel=cancel)


def run_job(job_id: str) -> None:
    job = store.get_job(job_id)
    if not job or job["status"] != "queued":
        return
    try:
        _check(job_id)
        if not store.claim_job(job_id):
            return
        snapshot = job["input_snapshot"]
        voice = snapshot["voice"]
        settings = snapshot.get("settings", {})
        script = snapshot.get("script") or snapshot.get("text", "")
        engines.resolve_engine(voice, settings.get("engine", "auto"))
        chunks = plan_script(script, settings, snapshot.get("lexicon", {}))
        fingerprint = engines.model_fingerprint(voice)
        store.update_job(job_id, total_chunks=len(chunks), completed_chunks=0, progress=0, eta_seconds=None, error=None)
        directory = config.settings.output_dir / job_id
        chunk_dir = directory / "chunks"
        chunk_dir.mkdir(parents=True, exist_ok=True)
        cache_dir = config.settings.data_dir / "cache" / "chunks"
        cache_dir.mkdir(parents=True, exist_ok=True)
        started = time.monotonic()
        completed_estimate = 0.0
        total_estimate = sum(chunk.estimated_seconds for chunk in chunks)
        chunk_paths: list[Path] = []
        for chunk in chunks:
            _check(job_id)
            destination = chunk_dir / f"{chunk.index:05d}.wav"
            cache_path = cache_dir / f"{_cache_key(chunk, voice, settings, fingerprint)}.wav"
            valid_cache = False
            if cache_path.is_file():
                try:
                    valid_cache = audio.probe_duration(cache_path) > 0
                except (OSError, ValueError, RuntimeError):
                    valid_cache = False
            if valid_cache:
                shutil.copyfile(cache_path, destination)
            else:
                _render_chunk(chunk, voice, settings, destination, job_id)
                _check(job_id)
                # Unique temporary files + replace make concurrent cache writes
                # safe across separate Celery processes sharing the data volume.
                pending = cache_dir / f".{cache_path.stem}-{uuid4().hex}.partial"
                try:
                    shutil.copyfile(destination, pending)
                    pending.replace(cache_path)
                finally:
                    pending.unlink(missing_ok=True)
            _check(job_id)
            duration = audio.probe_duration(destination)
            chunk_paths.append(destination)
            store.add_chunk(job_id, chunk.index, destination, duration)
            completed_estimate += chunk.estimated_seconds
            elapsed = time.monotonic() - started
            eta = round(elapsed * (total_estimate - completed_estimate) / max(completed_estimate, 0.1))
            store.update_job(job_id, progress=round((chunk.index + 1) / len(chunks) * 90, 1), eta_seconds=max(0, eta))
        _check(job_id)
        # Remaining work depends on disk and codec speed, so don't invent an ETA.
        store.update_job(job_id, status="assembling", progress=92, eta_seconds=None)
        date = datetime.now(timezone.utc).strftime("%Y%m%d")
        basename = f"{_safe_name(job['project_name'])}_{_safe_name(job['voice_name'])}_{date}_master"
        outputs = audio.assemble_exports(chunk_paths, directory, basename, script,
                                         int(settings.get("loudness_lufs", -16)),
                                         cancel=lambda: store.cancel_requested(job_id))
        _check(job_id)
        duration = audio.probe_duration(outputs["wav"])
        store.set_outputs(job_id, outputs)
        _check(job_id)
        store.update_job(job_id, status="completed", progress=100, eta_seconds=0, duration_seconds=duration)
    except store.JobCancelled:
        store.update_job(job_id, status="cancelled", eta_seconds=None, error=None, available_formats=[], audio_url=None, outputs={})
    except Exception as exc:
        logger.exception("Render failed for job %s", job_id)
        if store.cancel_requested(job_id):
            store.update_job(job_id, status="cancelled", eta_seconds=None, error=None, available_formats=[], audio_url=None, outputs={})
        else:
            store.update_job(job_id, status="failed", eta_seconds=None, error=str(exc)[:1500], available_formats=[], audio_url=None, outputs={})
