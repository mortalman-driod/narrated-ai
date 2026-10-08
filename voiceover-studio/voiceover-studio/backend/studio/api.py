"""Local-only HTTP API and progress stream for Voiceover Studio."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import hashlib
import json
from pathlib import Path
import re
import shutil
from threading import Lock
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.staticfiles import StaticFiles

from . import config, queue, store
from .models import Job, LexiconSettings, PreviewInput, Project, ProjectInput, RenderInput, RenderSettings, Voice

_creation_lock = Lock()
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "testserver"}


def _local_origin(origin: str | None) -> bool:
    if origin is None:
        return True
    parsed = urlparse(origin)
    return parsed.scheme in {"http", "https"} and parsed.hostname in _LOCAL_HOSTS


@asynccontextmanager
async def lifespan(application: FastAPI):
    store.initialize()
    recovery_task = None
    if config.settings.queue_mode == "local":
        store.recover_interrupted_jobs()
    else:
        store.recover_stale_workers()

        async def recover_workers():
            while True:
                await asyncio.sleep(30)
                await asyncio.to_thread(store.recover_stale_workers)

        recovery_task = asyncio.create_task(recover_workers())
    try:
        yield
    finally:
        if recovery_task:
            recovery_task.cancel()
            try:
                await recovery_task
            except asyncio.CancelledError:
                pass
        queue.shutdown()


app = FastAPI(title="Voiceover Studio", version="0.1.0", lifespan=lifespan)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(_LOCAL_HOSTS) + ["[::1]"])
app.add_middleware(CORSMiddleware, allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?",
                   allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type"])


@app.middleware("http")
async def enforce_local_origin(request: Request, call_next):
    # A malicious website must not be able to submit work to a local unauthenticated service.
    if not _local_origin(request.headers.get("origin")):
        return JSONResponse(status_code=403, content={"detail": "This studio accepts requests from localhost only."})
    return await call_next(request)


def _voice_or_404(voice_id: str) -> dict:
    voice = store.get_voice(voice_id)
    if voice is None:
        raise HTTPException(404, "That voice profile was not found.")
    return voice


def _job_or_404(job_id: str) -> dict:
    job = store.get_job(job_id)
    if job is None:
        raise HTTPException(404, "That render was not found.")
    return job


def _check_engine(voice: dict, settings: dict) -> None:
    if settings["engine"] not in {"auto", voice["engine"]}:
        raise HTTPException(422, f"This voice uses {voice['engine']}. Choose Automatic or its matching engine.")
    if not voice["available"]:
        raise HTTPException(409, f"{voice['engine'].upper()} is not ready. Install its local package and model weights first; see Settings and the setup guide.")
    if not shutil.which(config.settings.ffmpeg_bin):
        raise HTTPException(409, "FFmpeg is not installed. Install FFmpeg to normalize and export your audio.")


def _dispatch(job: dict) -> dict:
    try:
        queue.enqueue(job["id"])
    except Exception as error:
        return store.update_job(job["id"], status="failed", error=f"The render queue could not accept this job: {error}", eta_seconds=None)
    return store.get_job(job["id"]) or job


@app.get("/api/health")
def health() -> dict:
    from .engines import engine_status

    engines = engine_status()
    ffmpeg = bool(shutil.which(config.settings.ffmpeg_bin))
    return {"status": "ready" if ffmpeg and any(engine["available"] for engine in engines) else "setup_required",
            "queue_mode": config.settings.queue_mode, "ffmpeg": ffmpeg,
            "engines": engines, "device": config.settings.device}


@app.get("/api/voices", response_model=list[Voice])
def list_voices():
    return store.list_voices()


@app.post("/api/voices/custom", response_model=Voice, status_code=201)
def create_custom_voice(
    reference: UploadFile = File(...), name: str = Form(...),
    gender: str = Form(...), tone: str = Form("Conversational"),
    accent: str = Form("Nigerian English"), consent: bool = Form(False),
):
    if not consent:
        raise HTTPException(422, "Confirm that you own this voice or have the speaker's permission to use it.")
    name, tone, accent = name.strip(), tone.strip(), accent.strip()
    if gender not in {"female", "male"} or not name or len(name) > 80 or not tone or len(tone) > 100 or not accent or len(accent) > 100:
        raise HTTPException(422, "Provide a name (up to 80 characters), gender, accent, and tone (up to 100 characters each).")
    suffix = Path(reference.filename or "").suffix.lower()
    if suffix not in {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".aac", ".webm"}:
        raise HTTPException(422, "Upload a WAV, MP3, FLAC, M4A, OGG, AAC, or WebM audio recording.")
    if not shutil.which(config.settings.ffmpeg_bin):
        raise HTTPException(409, "Install FFmpeg before adding reference recordings.")

    from .audio import normalize_reference, probe_duration

    voice_id = f"custom_{uuid4().hex}"
    directory = config.settings.custom_voices_dir / voice_id
    directory.mkdir(parents=True, exist_ok=False)
    try:
        # User-provided filenames never become output paths.
        source = directory / f"source{suffix}"
        count = 0
        with source.open("wb") as output:
            while block := reference.file.read(1024 * 1024):
                count += len(block)
                if count > config.settings.max_upload_bytes:
                    raise HTTPException(413, "Reference recordings must be smaller than 100 MB.")
                output.write(block)
        if count == 0:
            raise HTTPException(422, "That recording is empty. Choose an audio file with speech.")
        duration = probe_duration(source)
        if not 180 <= duration <= 600:
            raise HTTPException(422, f"Use 3–10 minutes of clean speech. This recording is {duration:.0f} seconds long.")
        destination = directory / "reference.wav"
        normalize_reference(source, destination, max_duration=600)
        source.unlink()
        voice = {"id": voice_id, "name": name, "gender": gender, "accent": accent,
                 "tone": tone, "engine": "xtts", "model_voice": voice_id, "custom": True,
                 "available": False, "description": "Consented custom voice, synthesized locally with XTTS.",
                 "reference_path": str(destination.resolve()), "reference_duration_seconds": duration,
                 "consent": True, "consent_recorded_at": store.now(), "created_at": store.now()}
        store.add_voice(voice)
        return store.get_voice(voice_id) or voice
    except HTTPException:
        shutil.rmtree(directory)
        raise
    except Exception as error:
        shutil.rmtree(directory)
        raise HTTPException(422, f"The recording could not be read: {error}") from error
    finally:
        reference.file.close()


@app.get("/api/projects", response_model=list[Project])
def list_projects():
    return store.list_projects()


@app.post("/api/projects", response_model=Project, status_code=201)
def create_project(payload: ProjectInput):
    _voice_or_404(payload.voice_id)
    return store.save_project(payload.model_dump())


@app.put("/api/projects/{project_id}", response_model=Project)
def update_project(project_id: str, payload: ProjectInput):
    _voice_or_404(payload.voice_id)
    try:
        return store.save_project(payload.model_dump(), project_id)
    except KeyError as error:
        raise HTTPException(404, "That project was not found.") from error


@app.delete("/api/projects/{project_id}", status_code=204)
def delete_project(project_id: str):
    try:
        if not store.delete_project(project_id):
            raise HTTPException(404, "That project was not found.")
    except ValueError as error:
        raise HTTPException(409, str(error)) from error
    return Response(status_code=204)


@app.get("/api/jobs", response_model=list[Job])
def list_jobs():
    return store.list_jobs()


@app.post("/api/jobs", response_model=Job, status_code=201)
def create_render(payload: RenderInput):
    with _creation_lock:
        project = store.get_project(payload.project_id)
        if project is None:
            raise HTTPException(404, "That project was not found.")
        if not project["script"].strip():
            raise HTTPException(422, "That script looks empty. Paste your script before rendering.")
        voice = _voice_or_404(project["voice_id"])
        _check_engine(voice, project["settings"])
        if any(job["project_id"] == project["id"] and job["status"] in store.ACTIVE_STATUSES for job in store.list_jobs()):
            raise HTTPException(409, "This project already has an active render.")
        snapshot = {"script": project["script"], "text": project["script"], "voice_id": voice["id"],
                    "voice": voice, "settings": project["settings"], "lexicon": store.get_settings()["lexicon"]}
        job = store.create_job(project=project, voice=voice, snapshot=snapshot)
        return _dispatch(job)


@app.post("/api/previews", response_model=Job, status_code=201)
def create_preview(payload: PreviewInput):
    with _creation_lock:
        voice = _voice_or_404(payload.voice_id)
        settings = RenderSettings(speed=payload.speed).model_dump()
        snapshot = {"script": payload.text, "text": payload.text, "voice_id": voice["id"],
                    "voice": voice, "settings": settings, "lexicon": store.get_settings()["lexicon"]}
        # Everything that changes the synthesized result belongs in the cache key.
        cache_key = hashlib.sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        cached = store.find_cached_preview(cache_key)
        if cached:
            return cached
        _check_engine(voice, settings)
        return _dispatch(store.create_job(project=None, voice=voice, snapshot=snapshot, kind="preview", cache_key=cache_key))


@app.get("/api/jobs/{job_id}", response_model=Job)
def get_job(job_id: str):
    return _job_or_404(job_id)


@app.post("/api/jobs/{job_id}/cancel", response_model=Job)
def cancel_job(job_id: str):
    try:
        return store.request_cancel(job_id)
    except KeyError as error:
        raise HTTPException(404, "That render was not found.") from error


@app.websocket("/api/jobs/{job_id}/ws")
async def job_progress(websocket: WebSocket, job_id: str):
    if not _local_origin(websocket.headers.get("origin")):
        await websocket.close(code=1008)
        return
    await websocket.accept()
    if store.get_job(job_id) is None:
        await websocket.close(code=1008, reason="Render not found")
        return
    try:
        last_updated = None
        while True:
            job = await asyncio.to_thread(store.get_job, job_id)
            if job is None:
                await websocket.close(code=1008)
                return
            if job["updated_at"] != last_updated:
                await websocket.send_json(Job.model_validate(job).model_dump())
                last_updated = job["updated_at"]
            if job["status"] in store.TERMINAL_STATUSES:
                await websocket.close(code=1000)
                return
            # Receive with timeout so disconnected clients are detected even while queued.
            try:
                message = await asyncio.wait_for(websocket.receive(), timeout=0.5)
                if message["type"] == "websocket.disconnect":
                    return
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        pass


def _output_path(raw: str | None) -> Path:
    if not raw:
        raise HTTPException(404, "That audio file is not ready yet.")
    path = Path(raw).resolve()
    if not path.is_relative_to(config.settings.output_dir.resolve()) or not path.is_file():
        raise HTTPException(404, "That audio file is unavailable. Render the project again.")
    return path


@app.get("/api/jobs/{job_id}/download/{format}")
def download(job_id: str, format: str):
    if format not in {"wav", "mp3", "zip"}:
        raise HTTPException(404, "Choose WAV, MP3, or ZIP.")
    job = _job_or_404(job_id)
    if job["status"] != "completed":
        raise HTTPException(409, "This render has not finished yet.")
    path = _output_path(job.get("outputs", {}).get(format))
    base = re.sub(r"[^\w .-]", "", f"{job['project_name']}_{job['voice_name']}").strip(" .")[:150] or "voiceover"
    filename = f"{base}_{job['created_at'][:10]}_master.{format}"
    media_type = {"wav": "audio/wav", "mp3": "audio/mpeg", "zip": "application/zip"}[format]
    return FileResponse(path, media_type=media_type, filename=filename)


@app.get("/api/jobs/{job_id}/chunks/{index}")
def get_chunk(job_id: str, index: int):
    job = _job_or_404(job_id)
    chunk = next((chunk for chunk in job["chunks"] if chunk["index"] == index), None)
    if chunk is None:
        raise HTTPException(404, "That section is not ready yet.")
    return FileResponse(_output_path(chunk.get("path")), media_type="audio/wav")


@app.get("/api/settings", response_model=LexiconSettings)
def settings():
    return store.get_settings()


@app.put("/api/settings", response_model=LexiconSettings)
def update_settings(payload: LexiconSettings):
    return store.save_settings(payload.model_dump())


# `npm run build` produces this directory. API-only development does not require it.
_frontend = config.ROOT_DIR / "frontend" / "dist"
if _frontend.is_dir():
    app.mount("/", StaticFiles(directory=_frontend, html=True), name="frontend")
