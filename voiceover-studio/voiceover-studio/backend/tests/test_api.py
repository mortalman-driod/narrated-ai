"""API boundary tests use a queue double; production never fabricates speech."""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from studio import api, config, engines, queue, store


VOICE = {"id": "kokoro:af_heart", "name": "Heart", "gender": "female", "accent": "American",
         "tone": "Warm", "engine": "kokoro", "model_voice": "af_heart", "custom": False,
         "available": True, "description": "Stock voice."}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "settings", replace(config.settings, data_dir=tmp_path, queue_mode="local"))
    monkeypatch.setattr(engines, "stock_voices", lambda: [dict(VOICE)])
    monkeypatch.setattr(engines, "engine_status", lambda: [{"id": "kokoro", "available": True, "detail": "Ready"},
                                                         {"id": "xtts", "available": False, "detail": "Missing"}])
    monkeypatch.setattr(api.shutil, "which", lambda command: "/usr/bin/ffmpeg")
    monkeypatch.setattr(queue, "enqueue", lambda job_id: None)
    with TestClient(api.app) as browser:
        yield browser


def project(client, **fields):
    payload = {"name": "The Lagos story", "script": "Welcome to Lagos. This is our story.", "voice_id": VOICE["id"], **fields}
    response = client.post("/api/projects", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def render(client, **fields):
    saved = project(client, **fields)
    response = client.post("/api/jobs", json={"project_id": saved["id"]})
    assert response.status_code == 201, response.text
    return response.json(), saved


def test_projects_persist_and_validate(client):
    saved = project(client)
    assert client.get("/api/projects").json() == [saved]
    assert store.get_project(saved["id"])["script"] == saved["script"]
    assert client.post("/api/projects", json={"name": "   "}).status_code == 422
    assert client.post("/api/projects", json={"name": "Draft", "settings": {"speed": 8}}).status_code == 422
    assert client.post("/api/projects", json={"name": "Draft", "voice_id": "missing"}).status_code == 404


def test_render_snapshot_is_immutable_when_project_and_lexicon_change(client):
    client.put("/api/settings", json={"lexicon": {"Lagos": "Lay-goss"}})
    job, saved = render(client)
    changed = {key: saved[key] for key in ("name", "script", "voice_id", "settings")}
    changed["script"] = "A changed script."
    changed["settings"]["speed"] = 1.5
    assert client.put(f"/api/projects/{saved['id']}", json=changed).status_code == 200
    client.put("/api/settings", json={"lexicon": {"Lagos": "Lagos"}})
    frozen = store.get_job(job["id"])["input_snapshot"]
    assert frozen["script"] == "Welcome to Lagos. This is our story."
    assert frozen["settings"]["speed"] == 1
    assert frozen["lexicon"] == {"Lagos": "Lay-goss"}
    assert "input_snapshot" not in client.get(f"/api/jobs/{job['id']}").json()
    with pytest.raises(ValueError, match="immutable"):
        store.update_job(job["id"], input_snapshot={})


def test_empty_script_and_engine_override_are_rejected(client):
    empty = project(client, script=" \n")
    assert client.post("/api/jobs", json={"project_id": empty["id"]}).status_code == 422
    mismatched = project(client, settings={"engine": "piper"})
    assert client.post("/api/jobs", json={"project_id": mismatched["id"]}).status_code == 422


def test_missing_engine_is_honest(client, monkeypatch):
    monkeypatch.setattr(engines, "stock_voices", lambda: [{**VOICE, "available": False}])
    saved = project(client)
    response = client.post("/api/jobs", json={"project_id": saved["id"]})
    assert response.status_code == 409
    assert "not ready" in response.json()["detail"]
    assert client.get("/api/jobs").json() == []


def test_preview_cache_reuses_pending_and_finished_jobs_and_invalidates_settings(client):
    payload = {"voice_id": VOICE["id"], "text": "Hello, Lagos."}
    first = client.post("/api/previews", json=payload).json()
    assert client.post("/api/previews", json=payload).json()["id"] == first["id"]
    wav = config.settings.output_dir / "preview.wav"
    wav.write_bytes(b"test audio placeholder, never produced by application")
    store.set_outputs(first["id"], {"wav": wav})
    store.update_job(first["id"], status="completed", progress=100)
    assert client.post("/api/previews", json=payload).json()["id"] == first["id"]
    client.put("/api/settings", json={"lexicon": {"Lagos": "Lay-goss"}})
    assert client.post("/api/previews", json=payload).json()["id"] != first["id"]
    assert client.post("/api/previews", json={**payload, "speed": 1.1}).json()["id"] != first["id"]


def test_failed_preview_retries_and_blank_input_is_rejected(client):
    payload = {"voice_id": VOICE["id"], "text": "Hello, Lagos."}
    first = client.post("/api/previews", json=payload).json()
    store.update_job(first["id"], status="failed", error="Inference failed")
    assert client.post("/api/previews", json=payload).json()["id"] != first["id"]
    assert client.post("/api/previews", json={**payload, "text": " "}).status_code == 422


def test_active_render_prevents_duplicate_and_deletion_then_queued_cancel(client):
    job, saved = render(client)
    assert client.post("/api/jobs", json={"project_id": saved["id"]}).status_code == 409
    assert client.delete(f"/api/projects/{saved['id']}").status_code == 409
    cancelled = client.post(f"/api/jobs/{job['id']}/cancel").json()
    assert cancelled["status"] == "cancelled"
    assert store.cancel_requested(job["id"])
    assert not store.claim_job(job["id"])
    assert store.update_job(job["id"], status="completed")["status"] == "cancelled"
    assert client.delete(f"/api/projects/{saved['id']}").status_code == 204
    assert client.get(f"/api/jobs/{job['id']}").status_code == 200


def test_running_cancel_is_cooperative_and_claim_is_atomic(client):
    job, _ = render(client)
    with ThreadPoolExecutor(max_workers=4) as pool:
        claims = list(pool.map(lambda _: store.claim_job(job["id"]), range(4)))
    assert sum(claims) == 1
    cancelled = client.post(f"/api/jobs/{job['id']}/cancel").json()
    assert cancelled["status"] == "running"
    assert store.cancel_requested(job["id"])
    # Cancellation must also win the final commit if it arrives between the
    # worker's last cooperative check and its completed-state update.
    assert store.update_job(job["id"], status="completed")["status"] == "cancelled"


def test_exports_only_serve_completed_files_under_output_root(client, tmp_path):
    job, _ = render(client)
    assert client.get(f"/api/jobs/{job['id']}/download/wav").status_code == 409
    output = config.settings.output_dir / "master.wav"
    output.write_bytes(b"RIFF-test")
    store.set_outputs(job["id"], {"wav": output})
    store.update_job(job["id"], status="completed", progress=100)
    downloaded = client.get(f"/api/jobs/{job['id']}/download/wav")
    assert downloaded.status_code == 200
    assert downloaded.content == b"RIFF-test"
    assert "master.wav" in downloaded.headers["content-disposition"]
    secret = tmp_path / "outside-output.txt"
    secret.write_text("private")
    store.set_outputs(job["id"], {"wav": secret})
    assert client.get(f"/api/jobs/{job['id']}/download/wav").status_code == 404
    assert client.get(f"/api/jobs/{job['id']}/download/exe").status_code == 404


def test_chunks_are_streamable_before_final_assembly_and_paths_stay_private(client):
    job, _ = render(client)
    chunk = config.settings.output_dir / "chunk.wav"
    chunk.write_bytes(b"RIFF-section")
    store.add_chunk(job["id"], 0, chunk, 2.5)
    public = client.get(f"/api/jobs/{job['id']}").json()
    assert public["chunks"] == [{"index": 0, "url": f"/api/jobs/{job['id']}/chunks/0", "duration_seconds": 2.5}]
    assert client.get(public["chunks"][0]["url"]).content == b"RIFF-section"
    assert client.get(f"/api/jobs/{job['id']}/chunks/55").status_code == 404


def test_websocket_sends_public_terminal_snapshot(client):
    job, _ = render(client)
    store.update_job(job["id"], status="failed", error="Model not installed")
    with client.websocket_connect(f"/api/jobs/{job['id']}/ws") as socket:
        message = socket.receive_json()
        assert message["status"] == "failed"
        assert "outputs" not in message
        assert "input_snapshot" not in message
        assert socket.receive()["type"] == "websocket.close"


def test_reference_requires_consent_duration_and_safe_path(client, monkeypatch):
    from studio import audio

    fields = {"name": "Adaeze", "gender": "female", "tone": "Warm", "accent": "Nigerian English"}
    files = {"reference": ("../../reference.wav", b"test recording", "audio/wav")}
    assert client.post("/api/voices/custom", data=fields, files=files).status_code == 422
    monkeypatch.setattr(audio, "probe_duration", lambda _: 30)
    assert client.post("/api/voices/custom", data={**fields, "consent": "true"}, files=files).status_code == 422
    assert list(config.settings.custom_voices_dir.iterdir()) == []
    monkeypatch.setattr(audio, "probe_duration", lambda _: 180)
    monkeypatch.setattr(audio, "normalize_reference", lambda source, destination, **_: destination.write_bytes(b"normalized"))
    response = client.post("/api/voices/custom", data={**fields, "consent": "true"}, files=files)
    assert response.status_code == 201, response.text
    voice = response.json()
    assert voice["custom"] and not voice["available"]
    assert "reference_path" not in voice
    internal = store.get_voice(voice["id"])
    assert Path(internal["reference_path"]).is_relative_to(config.settings.custom_voices_dir)
    assert internal["consent"]
    assert Path(internal["reference_path"]).read_bytes() == b"normalized"


def test_lexicon_validation_and_local_origin_protection(client):
    assert client.put("/api/settings", json={"lexicon": {"": "word"}}).status_code == 422
    assert client.put("/api/settings", json={"lexicon": {"Ngozi": "N-goh-zee"}}).json()["lexicon"] == {"Ngozi": "N-goh-zee"}
    assert client.post("/api/projects", json={"name": "Attack"}, headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.get("/api/health", headers={"Host": "evil.example"}).status_code == 400
    assert client.get("/api/health", headers={"Origin": "http://localhost:5173"}).status_code == 200


def test_queue_failure_and_restart_recovery_are_visible(client, monkeypatch):
    def fail_enqueue(job_id):
        raise RuntimeError("Redis is offline")

    monkeypatch.setattr(queue, "enqueue", fail_enqueue)
    job, _ = render(client)
    assert job["status"] == "failed" and "Redis is offline" in job["error"]
    monkeypatch.setattr(queue, "enqueue", lambda job_id: None)
    queued, _ = render(client)
    assert store.recover_interrupted_jobs() == 1
    assert store.get_job(queued["id"])["status"] == "failed"
    assert "server stopped" in store.get_job(queued["id"])["error"]


def test_stale_worker_recovery_keeps_queued_and_live_work(client):
    from datetime import datetime, timedelta, timezone

    abandoned, _ = render(client)
    live, _ = render(client)
    queued, _ = render(client)
    store.claim_job(abandoned["id"])
    store.claim_job(live["id"])
    old = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    store.update_job(abandoned["id"], worker_heartbeat_at=old)
    store.update_job(live["id"], worker_heartbeat_at=store.now())
    assert store.recover_stale_workers() == 1
    assert store.get_job(abandoned["id"])["status"] == "failed"
    assert store.get_job(live["id"])["status"] == "running"
    assert store.get_job(queued["id"])["status"] == "queued"
