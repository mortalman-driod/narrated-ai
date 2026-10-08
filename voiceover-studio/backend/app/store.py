"""Minimal SQLite persistence for voices and render jobs."""
import json
import sqlite3
import time
import uuid

from . import config


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init():
    with _conn() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS voices(
                id TEXT PRIMARY KEY, name TEXT, category TEXT,
                descriptors TEXT, engine TEXT, engine_voice TEXT,
                reference_wav TEXT, gender TEXT, pace TEXT,
                pitch_semitones INTEGER, is_custom INTEGER DEFAULT 0)"""
        )
        c.execute(
            """CREATE TABLE IF NOT EXISTS jobs(
                id TEXT PRIMARY KEY, project_name TEXT, voice_id TEXT,
                script TEXT, status TEXT DEFAULT 'queued',
                progress REAL DEFAULT 0, total_chunks INTEGER DEFAULT 0,
                done_chunks INTEGER DEFAULT 0, eta_sec INTEGER,
                error TEXT, out_wav TEXT, out_mp3 TEXT,
                created REAL, finished REAL)"""
        )


def seed_voices(voices):
    with _conn() as c:
        for v in voices:
            c.execute(
                "INSERT OR IGNORE INTO voices VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (v["id"], v["name"], v["category"], json.dumps(v["descriptors"]),
                 v["engine"], v.get("engine_voice"), v.get("reference_wav"),
                 v.get("gender", "male"), v.get("pace", "natural"),
                 v.get("pitch_semitones", 0), 1 if v.get("is_custom") else 0),
            )


def list_voices(category=None):
    q = "SELECT * FROM voices"
    args = ()
    if category:
        q += " WHERE category = ?"
        args = (category,)
    with _conn() as c:
        rows = c.execute(q + " ORDER BY category, name", args).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["descriptors"] = json.loads(d["descriptors"])
        out.append(d)
    return out


def get_voice(voice_id):
    with _conn() as c:
        r = c.execute("SELECT * FROM voices WHERE id = ?", (voice_id,)).fetchone()
    if not r:
        return None
    d = dict(r)
    d["descriptors"] = json.loads(d["descriptors"])
    return d


def add_voice(v):
    seed_voices([v])


def create_job(project_name, voice_id, script):
    job_id = uuid.uuid4().hex[:12]
    with _conn() as c:
        c.execute(
            "INSERT INTO jobs (id, project_name, voice_id, script, created) "
            "VALUES (?,?,?,?,?)",
            (job_id, project_name, voice_id, script, time.time()),
        )
    return job_id


def get_job(job_id):
    with _conn() as c:
        r = c.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return dict(r) if r else None


def update_job(job_id, **fields):
    sets = ", ".join(k + " = ?" for k in fields)
    with _conn() as c:
        c.execute("UPDATE jobs SET " + sets + " WHERE id = ?",
                  (*fields.values(), job_id))


def list_jobs():
    with _conn() as c:
        return [dict(r) for r in c.execute(
            "SELECT id, project_name, voice_id, status, progress, created, "
            "finished, out_mp3 FROM jobs ORDER BY created DESC")]
