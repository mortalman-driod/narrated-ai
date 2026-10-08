"""Disk-streamed audio assembly and cancellable FFmpeg processing."""
from __future__ import annotations

import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from typing import Callable, Iterable
import wave
import zipfile

from . import config
from .store import JobCancelled

CancelCheck = Callable[[], bool]


def _check(cancel: CancelCheck | None) -> None:
    if cancel and cancel():
        raise JobCancelled("Render cancelled.")


def _run(arguments: list[str], cancel: CancelCheck | None = None) -> str:
    """Drain logs to disk (no PIPE deadlocks or unbounded stderr buffers)."""
    _check(cancel)
    with tempfile.TemporaryFile(mode="w+b") as log:
        process = subprocess.Popen(arguments, stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                   creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        try:
            while True:
                try:
                    code = process.wait(timeout=0.25)
                    break
                except subprocess.TimeoutExpired:
                    _check(cancel)
            _check(cancel)
        except BaseException:
            process.kill()
            process.wait()
            raise
        log.seek(0, 2)
        log.seek(max(0, log.tell() - 65536))
        output = log.read().decode("utf-8", errors="replace")
        if code:
            raise RuntimeError(f"Audio processing failed: {output[-1800:].strip()}")
        return output


def _ffmpeg(*args: str, cancel: CancelCheck | None = None) -> str:
    executable = config.settings.ffmpeg_bin
    if not shutil.which(executable) and not Path(executable).is_file():
        raise RuntimeError("FFmpeg was not found. Install FFmpeg and restart the server.")
    return _run([executable, "-hide_banner", "-nostdin", "-y", *map(str, args)], cancel)


def probe_duration(path: Path) -> float:
    path = Path(path)
    # Fast and precise for our own PCM files; avoid spawning for every chunk.
    try:
        with wave.open(str(path), "rb") as audio:
            return audio.getnframes() / audio.getframerate()
    except (wave.Error, EOFError):
        result = _run([config.settings.ffprobe_bin, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)])
        try:
            duration = float(json.loads(result)["format"]["duration"])
        except (ValueError, KeyError, TypeError) as exc:
            raise ValueError("Could not read the duration of this audio file.") from exc
        if not math.isfinite(duration) or duration <= 0:
            raise ValueError("The audio file has no usable duration.")
        return duration


def normalize_reference(source: Path, dest: Path, max_duration: int = 600) -> None:
    duration = probe_duration(source)
    if duration > max_duration + 0.05:
        raise ValueError(f"Reference audio cannot exceed {max_duration} seconds.")
    dest.parent.mkdir(parents=True, exist_ok=True)
    _ffmpeg("-i", str(source), "-map", "0:a:0", "-vn", "-t", str(max_duration),
            "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(dest))


def convert_pcm(source: Path, destination: Path, cancel: CancelCheck | None = None) -> None:
    _ffmpeg("-loglevel", "error", "-i", str(source), "-vn", "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(destination), cancel=cancel)


def concatenate_pcm(parts: Iterable[tuple[Path | None, int]], destination: Path,
                    sample_rate: int = 24000, cancel: CancelCheck | None = None) -> None:
    """Copy fixed-size PCM blocks; RAM does not grow with a two-hour script."""
    with wave.open(str(destination), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        for path, pause_ms in parts:
            _check(cancel)
            if path is not None:
                with wave.open(str(path), "rb") as source:
                    if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, sample_rate):
                        raise ValueError("All assembly inputs must be mono 16-bit PCM at the same sample rate.")
                    while block := source.readframes(32768):
                        _check(cancel)
                        output.writeframesraw(block)
            remaining = round(sample_rate * pause_ms / 1000)
            silence = b"\0" * 65536
            while remaining > 0:
                _check(cancel)
                count = min(remaining, 32768)
                output.writeframesraw(silence[:count * 2])
                remaining -= count


def normalize_chunk(source: Path, destination: Path, target: int = -16,
                    cancel: CancelCheck | None = None) -> None:
    # Chunk streaming is available before the full program can be measured.
    # The master below uses a two-pass program-wide loudness measurement.
    _ffmpeg("-loglevel", "error", "-i", str(source), "-af", f"loudnorm=I={target}:TP=-1.5:LRA=11",
            "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(destination), cancel=cancel)


def assemble_exports(chunks: list[Path], output_dir: Path, basename: str, script: str,
                     target: int = -16, cancel: CancelCheck | None = None) -> dict[str, Path]:
    if target not in {-16, -14}:
        raise ValueError("Loudness target must be -16 or -14 LUFS.")
    output_dir.mkdir(parents=True, exist_ok=True)
    joined = output_dir / "assembly.partial.wav"
    wav_path = output_dir / f"{basename}.wav"
    mp3_path = output_dir / f"{basename}.mp3"
    zip_path = output_dir / f"{basename}.zip"
    try:
        concatenate_pcm(((chunk, 0) for chunk in chunks), joined, cancel=cancel)
        # Stereo output (dual mono narration) at 48 kHz is measured in the same
        # channel layout as the final master, so the target isn't shifted by 3 dB.
        prefix = "aresample=48000,pan=stereo|c0=c0|c1=c0,"
        log = _ffmpeg("-i", str(joined), "-af", prefix + f"loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json",
                      "-f", "null", "-", cancel=cancel)
        matches = re.findall(r'\{\s*"input_i"[\s\S]*?\}', log)
        if not matches:
            raise RuntimeError("FFmpeg did not return a loudness measurement.")
        measured = json.loads(matches[-1])
        for field in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset"):
            if not math.isfinite(float(measured[field])):
                raise RuntimeError("Generated audio is silent or could not be measured for loudness.")
        loudness = (f"loudnorm=I={target}:TP=-1.5:LRA=11:"
                    f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
                    f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
                    f"offset={measured['target_offset']}:linear=true:print_format=summary")
        _ffmpeg("-loglevel", "error", "-i", str(joined), "-af", prefix + loudness,
                "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", str(wav_path), cancel=cancel)
        _ffmpeg("-loglevel", "error", "-i", str(wav_path), "-c:a", "libmp3lame", "-b:a", "320k",
                "-metadata", "comment=Generated locally with Voiceover Studio", str(mp3_path), cancel=cancel)
        _check(cancel)
        # ZIP_STORED avoids wasting CPU re-compressing already encoded MP3 and
        # writes large masters from disk instead of loading them into memory.
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as bundle:
            for path in (wav_path, mp3_path):
                with path.open("rb") as source, bundle.open(path.name, "w", force_zip64=True) as destination:
                    while block := source.read(1024 * 1024):
                        _check(cancel)
                        destination.write(block)
            bundle.writestr("script.txt", script)
            bundle.writestr("about.txt", "Generated locally with Voiceover Studio. Synthetic narration.\n")
        return {"wav": wav_path, "mp3": mp3_path, "zip": zip_path}
    finally:
        joined.unlink(missing_ok=True)
