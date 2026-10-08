"""SQLite persistence with atomic updates shared by API and worker processes."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sqlite3
from typing import Any, Iterator
from uuid import uuid4

from . import config

TERMINAL_STATUSES = {"completed", "failed", "cancelled"}
ACTIVE_STATUSES = {"queued", "running", "assembling"}


class JobCancelled(Exception):
    """Cooperative cancellation requested by the user."""


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def connection(*, write: bool = False) -> Iterator[sqlite3.Connection]:
    db = sqlite3.connect(config.settings.database_path, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout = 30000")
    try:
        if write:
            db.execute("BEGIN IMMEDIATE")
        yield db
        if write:
            db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def initialize() -> None:
    for directory in (
        config.settings.data_dir,
        config.settings.output_dir,
        config.settings.custom_voices_dir,
        config.settings.models_dir,
    ):
        directory.mkdir(parents=True, exist_ok=True)
    with connection() as db:
        db.execute("PRAGMA journal_mode = WAL")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL,
                cache_key TEXT
            );
            CREATE INDEX IF NOT EXISTS jobs_created ON jobs(created_at DESC);
            CREATE INDEX IF NOT EXISTS jobs_cache ON jobs(cache_key);
            CREATE TABLE IF NOT EXISTS voices (id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS preferences (id TEXT PRIMARY KEY, data TEXT NOT NULL);
        """)
        db.commit()


def _get(table: str, identifier: str) -> dict[str, Any] | None:
    # Table names are private constants, never user input.
    with connection() as db:
        row = db.execute(f"SELECT data FROM {table} WHERE id = ?", (identifier,)).fetchone()
    return json.loads(row["data"]) if row else None


def list_projects() -> list[dict[str, Any]]:
    with connection() as db:
        projects = [json.loads(row["data"]) for row in db.execute("SELECT data FROM projects")]
    return sorted(projects, key=lambda project: project["updated_at"], reverse=True)


def get_project(project_id: str) -> dict[str, Any] | None:
    return _get("projects", project_id)


def save_project(payload: dict[str, Any], project_id: str | None = None) -> dict[str, Any]:
    with connection(write=True) as db:
        previous = None
        if project_id:
            row = db.execute("SELECT data FROM projects WHERE id = ?", (project_id,)).fetchone()
            if not row:
                raise KeyError(project_id)
            previous = json.loads(row["data"])
        project = {
            **payload,
            "id": project_id or str(uuid4()),
            "created_at": previous["created_at"] if previous else now(),
            "updated_at": now(),
        }
        db.execute("INSERT OR REPLACE INTO projects(id, data) VALUES (?, ?)", (project["id"], json.dumps(project)))
    return project


def delete_project(project_id: str) -> bool:
    with connection(write=True) as db:
        jobs = [json.loads(row["data"]) for row in db.execute("SELECT data FROM jobs")]
        if any(job["project_id"] == project_id and job["status"] in ACTIVE_STATUSES for job in jobs):
            raise ValueError("Cancel the active render before deleting this project.")
        result = db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        return result.rowcount > 0


def get_settings() -> dict[str, Any]:
    return _get("preferences", "settings") or {"lexicon": {}}


def save_settings(payload: dict[str, Any]) -> dict[str, Any]:
    with connection(write=True) as db:
        db.execute("INSERT OR REPLACE INTO preferences(id,data) VALUES ('settings',?)", (json.dumps(payload),))
    return payload


def add_voice(payload: dict[str, Any]) -> dict[str, Any]:
    with connection(write=True) as db:
        db.execute("INSERT INTO voices(id,data) VALUES (?,?)", (payload["id"], json.dumps(payload)))
    return payload


def list_voices() -> list[dict[str, Any]]:
    from .engines import engine_status, stock_voices

    voices = list(stock_voices())
    with connection() as db:
        custom = [json.loads(row["data"]) for row in db.execute("SELECT data FROM voices")]
    ready = {engine["id"]: engine["available"] for engine in engine_status()}
    for voice in custom:
        voice["available"] = bool(ready.get(voice["engine"], False)) and Path(voice["reference_path"]).is_file()
    return voices + custom


def get_voice(voice_id: str) -> dict[str, Any] | None:
    return next((voice for voice in list_voices() if voice["id"] == voice_id), None)


def create_job(
    *, project: dict[str, Any] | None, voice: dict[str, Any], snapshot: dict[str, Any],
    kind: str = "render", cache_key: str | None = None,
) -> dict[str, Any]:
    timestamp = now()
    job = {
        "id": str(uuid4()), "project_id": project["id"] if project else None,
        "project_name": project["name"] if project else "Voice preview",
        "voice_id": voice["id"], "voice_name": voice["name"], "kind": kind,
        "status": "queued", "progress": 0, "completed_chunks": 0, "total_chunks": 0,
        "eta_seconds": None, "duration_seconds": None, "error": None,
        "created_at": timestamp, "updated_at": timestamp,
        "available_formats": [], "chunks": [], "audio_url": None,
        "input_snapshot": snapshot, "cancel_requested": False, "outputs": {},
    }
    with connection(write=True) as db:
        db.execute("INSERT INTO jobs(id,data,created_at,cache_key) VALUES (?,?,?,?)", (
            job["id"], json.dumps(job), timestamp, cache_key,
        ))
    return job


def get_job(job_id: str) -> dict[str, Any] | None:
    return _get("jobs", job_id)


def list_jobs() -> list[dict[str, Any]]:
    with connection() as db:
        return [json.loads(row["data"]) for row in db.execute("SELECT data FROM jobs ORDER BY created_at DESC LIMIT 250")]


def _update(db: sqlite3.Connection, job_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    row = db.execute("SELECT data FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not row:
        raise KeyError(job_id)
    job = json.loads(row["data"])
    if {"input_snapshot", "id", "created_at"}.intersection(fields):
        raise ValueError("A job's input snapshot and identity are immutable.")
    # A late inference result must never revive a job that was already cancelled.
    if job["status"] == "cancelled" and fields.get("status") not in {None, "cancelled"}:
        return job
    if job["cancel_requested"] and fields.get("status") == "completed":
        fields = {**fields, "status": "cancelled", "eta_seconds": None, "error": None,
                  "available_formats": [], "audio_url": None, "outputs": {}}
    job.update(fields)
    job["updated_at"] = now()
    db.execute("UPDATE jobs SET data = ? WHERE id = ?", (json.dumps(job), job_id))
    return job


def update_job(job_id: str, **fields: Any) -> dict[str, Any]:
    with connection(write=True) as db:
        return _update(db, job_id, fields)


def claim_job(job_id: str) -> bool:
    """Only one worker may move a queued job into inference."""
    with connection(write=True) as db:
        row = db.execute("SELECT data FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            return False
        job = json.loads(row["data"])
        if job["status"] != "queued" or job["cancel_requested"]:
            return False
        _update(db, job_id, {"status": "running"})
        return True


def request_cancel(job_id: str) -> dict[str, Any]:
    with connection(write=True) as db:
        row = db.execute("SELECT data FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            raise KeyError(job_id)
        job = json.loads(row["data"])
        if job["status"] in TERMINAL_STATUSES:
            return job
        fields: dict[str, Any] = {"cancel_requested": True}
        if job["status"] == "queued":
            fields.update(status="cancelled", eta_seconds=None)
        return _update(db, job_id, fields)


def cancel_requested(job_id: str) -> bool:
    job = get_job(job_id)
    return not job or job["cancel_requested"] or job["status"] == "cancelled"


def add_chunk(job_id: str, index: int, path: str | Path, duration_seconds: float) -> dict[str, Any]:
    with connection(write=True) as db:
        row = db.execute("SELECT data FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            raise KeyError(job_id)
        job = json.loads(row["data"])
        chunks = [chunk for chunk in job["chunks"] if chunk["index"] != index]
        chunks.append({"index": index, "path": str(Path(path).resolve()),
                       "url": f"/api/jobs/{job_id}/chunks/{index}", "duration_seconds": duration_seconds})
        chunks.sort(key=lambda chunk: chunk["index"])
        return _update(db, job_id, {"chunks": chunks, "completed_chunks": len(chunks)})


def set_outputs(job_id: str, outputs: dict[str, str | Path]) -> dict[str, Any]:
    normalized = {key: str(Path(value).resolve()) for key, value in outputs.items()}
    return update_job(job_id, outputs=normalized, available_formats=list(normalized),
                      audio_url=f"/api/jobs/{job_id}/download/wav" if "wav" in normalized else None)


def find_cached_preview(cache_key: str) -> dict[str, Any] | None:
    with connection() as db:
        rows = db.execute("SELECT data FROM jobs WHERE cache_key = ? ORDER BY created_at DESC", (cache_key,)).fetchall()
    for row in rows:
        job = json.loads(row["data"])
        if job["status"] in ACTIVE_STATUSES and not job["cancel_requested"]:
            return job
        if job["status"] == "completed" and Path(job.get("outputs", {}).get("wav", "")).is_file():
            return job
    return None


def recover_interrupted_jobs() -> int:
    """The local queue is in-memory. Its old work cannot survive process restart."""
    count = 0
    with connection(write=True) as db:
        for row in db.execute("SELECT data FROM jobs").fetchall():
            job = json.loads(row["data"])
            if job["status"] in ACTIVE_STATUSES:
                _update(db, job["id"], {"status": "failed", "eta_seconds": None,
                    "error": "The server stopped before this render finished. Start a new render to try again."})
                count += 1
    return count


def recover_stale_workers(grace_seconds: int = 300) -> int:
    """Celery jobs waiting in Redis remain queued; only lost running work fails."""
    threshold = datetime.now(timezone.utc) - timedelta(seconds=grace_seconds)
    count = 0
    with connection(write=True) as db:
        for row in db.execute("SELECT data FROM jobs").fetchall():
            job = json.loads(row["data"])
            if job["status"] not in {"running", "assembling"}:
                continue
            last_seen = datetime.fromisoformat(job.get("worker_heartbeat_at", job["updated_at"]))
            if last_seen < threshold:
                _update(db, job["id"], {"status": "failed", "eta_seconds": None,
                    "error": "The render worker stopped responding. Restart the worker and start a new render."})
                count += 1
    return count
