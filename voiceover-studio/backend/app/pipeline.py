"""Render pipeline: chunk -> parallel synthesize -> normalize -> assemble."""
import asyncio
import subprocess
import time
from pathlib import Path

from . import config, pronunciations, store
from .chunker import chunk_script
from .engines.registry import get_engine

# Connected websocket clients per job, for live progress
_listeners: dict[str, set] = {}
_engine_cache: dict[str, object] = {}


def register_listener(job_id: str, ws):
    _listeners.setdefault(job_id, set()).add(ws)


def remove_listener(job_id: str, ws):
    _listeners.get(job_id, set()).discard(ws)


async def _broadcast(job_id: str, payload: dict):
    dead = []
    for ws in _listeners.get(job_id, set()):
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        remove_listener(job_id, ws)


async def run_job(job_id: str):
    """Full render for one job. Designed for BackgroundTasks / asyncio."""
    job = store.get_job(job_id)
    voice = store.get_voice(job["voice_id"])
    if not voice:
        store.update_job(job_id, status="failed", error="Voice not found")
        return

    script = pronunciations.apply(job["script"])
    chunks = chunk_script(script)
    store.update_job(job_id, status="rendering", total_chunks=len(chunks),
                     done_chunks=0, progress=0.0)
    await _broadcast(job_id, {"type": "started", "total": len(chunks)})

    job_dir = config.CHUNKS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    engine = get_engine(voice["engine"])
    sem = asyncio.Semaphore(config.RENDER_CONCURRENCY)
    lock = asyncio.Lock()
    state = {"done": 0, "started_at": time.time()}
    wavs: list[str] = [""] * len(chunks)

    async def render_one(i, chunk):
        out = str(job_dir / f"{i:05d}.wav")
        async with sem:
            await asyncio.to_thread(engine.synthesize, chunk.text, voice, out)
            await asyncio.to_thread(_pad_silence, out, chunk.pause_after_ms)
        wavs[i] = out
        async with lock:
            state["done"] += 1
            elapsed = time.time() - state["started_at"]
            eta = int(elapsed / state["done"] * (len(chunks) - state["done"]))
            progress = round(state["done"] / len(chunks), 4)
            store.update_job(job_id, done_chunks=state["done"],
                             progress=progress, eta_sec=eta)
            await _broadcast(job_id, {
                "type": "progress", "done": state["done"],
                "total": len(chunks), "progress": progress, "eta_sec": eta})

    await asyncio.gather(*(render_one(i, c) for i, c in enumerate(chunks)))

    # --- Assemble: concat -> loudness normalize -> WAV master + MP3 --------
    concat_list = job_dir / "concat.txt"
    concat_list.write_text("".join(f"file '{w}'\n" for w in wavs))
    raw = str(config.AUDIO_OUT / f"{job_id}_raw.wav")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(concat_list), "-c", "copy", raw],
                   check=True, capture_output=True)

    out_wav = str(config.AUDIO_OUT / f"{job_id}.wav")
    out_mp3 = str(config.AUDIO_OUT / f"{job_id}.mp3")
    subprocess.run([
        "ffmpeg", "-y", "-i", raw,
        "-af", f"loudnorm=I={config.TARGET_LUFS}:TP=-1.5:LRA=11",
        "-ar", "44100", out_wav], check=True, capture_output=True)
    subprocess.run([
        "ffmpeg", "-y", "-i", out_wav, "-b:a", config.MP3_BITRATE, out_mp3],
        check=True, capture_output=True)
    Path(raw).unlink(missing_ok=True)

    store.update_job(job_id, status="done", progress=1.0, eta_sec=0,
                     out_wav=out_wav, out_mp3=out_mp3,
                     finished=time.time())
    await _broadcast(job_id, {"type": "done",
                              "mp3": f"/api/jobs/{job_id}/download?fmt=mp3",
                              "wav": f"/api/jobs/{job_id}/download?fmt=wav"})


def _pad_silence(wav_path: str, pause_ms: int):
    """Insert trailing silence so paragraph/section pauses survive assembly."""
    if pause_ms <= 0:
        return
    p = Path(wav_path)
    tmp = p.with_suffix(".pad.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(p),
         "-af", f"apad=pad_dur={pause_ms / 1000}",
         "-c:a", "pcm_s16le", str(tmp)],
        check=True, capture_output=True)
    tmp.replace(p)
