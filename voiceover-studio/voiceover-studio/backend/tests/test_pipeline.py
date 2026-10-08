from __future__ import annotations

from dataclasses import replace
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
from types import SimpleNamespace
import wave
import zipfile

import pytest

from studio import audio, config, engines, pipeline, store
from studio.chunking import apply_lexicon, plan_script


def fixture_wave(path: Path, seconds: float = 1.5, sample_rate: int = 24000):
    """Synthetic signal ONLY for deterministic processing tests, never production."""
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        frames = [int(7000 * math.sin(index * 2 * math.pi * 220 / sample_rate)) for index in range(round(seconds * sample_rate))]
        output.writeframes(struct.pack(f"<{len(frames)}h", *frames))


def test_lexicon_longest_match_and_nonrecursive_replacement():
    assert apply_lexicon("Lagos Island, LAGOS and Lagosian.", {"Lagos": "lay-goss", "Lagos Island": "island", "island": "different"}) == "island, lay-goss and Lagosian."


def test_long_script_bounded_chunks_preserve_every_word():
    text = " ".join(["This is a sentence with exactly nine spoken words."] * 2000)
    chunks = plan_script(text)
    restored = " ".join(segment.text for chunk in chunks for segment in chunk.segments)
    assert restored == text
    assert len(chunks) > 100
    assert all(0 < chunk.estimated_seconds <= 40 for chunk in chunks)
    assert all(chunk.index == i for i, chunk in enumerate(chunks))


def test_unpunctuated_script_splits_without_losing_words():
    text = " ".join(f"word{i}" for i in range(3000))
    chunks = plan_script(text, {"speed": 0.5})
    assert " ".join(segment.text for chunk in chunks for segment in chunk.segments) == text
    assert max(chunk.estimated_seconds for chunk in chunks) <= 40


def test_pause_and_ssml_rate_emphasis_lexicon():
    chunks = plan_script('<speak><p>Dr. Adaeze visited Lagos.</p><prosody rate="80%"><emphasis level="strong">Welcome home.</emphasis></prosody><break time="1s"/>Again.</speak>', lexicon={"Adaeze": "Ah-day-zeh"})
    segments = [segment for chunk in chunks for segment in chunk.segments]
    assert segments[0].text == "Dr. Ah-day-zeh visited Lagos."
    assert segments[0].pause_after_ms == 600
    assert segments[1].rate == 0.8 and segments[1].emphasis == "strong"
    assert segments[1].pause_after_ms == 1300
    assert segments[-1].pause_after_ms == 0


@pytest.mark.parametrize("text", ["", "<speak><audio>file</audio></speak>", '<break time="90s"/>', '<prosody rate="300%">Hi</prosody>', "<speak>Oops", "<foo>Oops</foo>", "a" * 201])
def test_reject_invalid_scripts(text):
    with pytest.raises(ValueError):
        plan_script(text)


def test_inline_prosody_does_not_add_sentence_pause():
    chunks = plan_script('Hello <emphasis>dear</emphasis> friends.')
    assert [segment.pause_after_ms for chunk in chunks for segment in chunk.segments] == [0, 0, 0]


def test_explicit_final_pause_is_preserved_and_repeated_breaks_bounded():
    assert plan_script('Hello<break time="300ms"/>')[0].segments[-1].pause_after_ms == 300
    with pytest.raises(ValueError, match="Consecutive breaks"):
        plan_script('Hello<break time="10s"/><break time="10s"/>')


def test_file_assembly_preserves_exact_pause_and_bounded_frames(tmp_path):
    source = tmp_path / "source.wav"
    fixture_wave(source, 1)
    dest = tmp_path / "combined.wav"
    audio.concatenate_pcm([(source, 600), (source, 0)], dest)
    assert audio.probe_duration(dest) == pytest.approx(2.6)
    with wave.open(str(dest), "rb") as result:
        result.setpos(24000)
        assert result.readframes(14400) == b"\0" * 28800


def test_assembly_cancels_cooperatively(tmp_path):
    with pytest.raises(store.JobCancelled):
        audio.concatenate_pcm([(None, 10000)], tmp_path / "out.wav", cancel=lambda: True)


@pytest.fixture
def database(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "settings", replace(config.settings, data_dir=tmp_path))
    store.initialize()
    return tmp_path


def make_job():
    voice = {"id": "piper:test", "name": "Test fixture", "engine": "piper", "model_voice": "test", "custom": False}
    project = {"id": "test-project", "name": "Processing check"}
    snapshot = {"script": "First sentence. Second sentence.", "voice": voice, "settings": {"engine": "auto", "loudness_lufs": -16}, "lexicon": {}}
    return store.create_job(project=project, voice=voice, snapshot=snapshot)


@pytest.mark.skipif(not shutil.which("ffmpeg") or not shutil.which("ffprobe"), reason="FFmpeg is required for integration processing tests")
def test_real_ffmpeg_exports_and_cache(database, monkeypatch):
    calls = []
    monkeypatch.setattr(engines, "resolve_engine", lambda *_: "piper")
    monkeypatch.setattr(engines, "model_fingerprint", lambda *_: [("fixture", 1, 1)])

    def fixture_synthesis(text, voice, speed, destination, emphasis="none"):
        calls.append(text)
        fixture_wave(destination)

    monkeypatch.setattr(engines, "synthesize", fixture_synthesis)
    job = make_job()
    pipeline.run_job(job["id"])
    result = store.get_job(job["id"])
    assert result["status"] == "completed", result["error"]
    assert result["progress"] == 100
    assert result["completed_chunks"] == result["total_chunks"] == 1
    assert set(result["outputs"]) == {"wav", "mp3", "zip"}
    assert result["duration_seconds"] == pytest.approx(3.3, abs=0.05)
    probe = json.loads(subprocess.check_output([config.settings.ffprobe_bin, "-v", "error", "-show_streams", "-of", "json", result["outputs"]["mp3"]]))
    assert probe["streams"][0]["bit_rate"] == "320000"
    assert probe["streams"][0]["channels"] == 2
    with zipfile.ZipFile(result["outputs"]["zip"]) as bundle:
        assert bundle.read("script.txt").decode() == job["input_snapshot"]["script"]
        assert any(name.endswith(".wav") for name in bundle.namelist())
    second = make_job()
    pipeline.run_job(second["id"])
    assert store.get_job(second["id"])["status"] == "completed"
    assert len(calls) == 2, "Both sentences should be synthesized only once, then served from cache"
    # Duplicate delivery is idempotent and cannot rewrite a completed output.
    pipeline.run_job(second["id"])
    assert len(calls) == 2


def test_cancel_after_inference_does_not_publish_partial_chunk(database, monkeypatch):
    monkeypatch.setattr(engines, "resolve_engine", lambda *_: "piper")
    monkeypatch.setattr(engines, "model_fingerprint", lambda *_: [])
    job = make_job()

    def cancelling_synthesis(text, voice, speed, destination, emphasis="none"):
        fixture_wave(destination)
        store.request_cancel(job["id"])

    monkeypatch.setattr(engines, "synthesize", cancelling_synthesis)
    pipeline.run_job(job["id"])
    result = store.get_job(job["id"])
    assert result["status"] == "cancelled"
    assert not result["chunks"] and not result["available_formats"]


def test_missing_engine_is_honest_failure(database, monkeypatch):
    monkeypatch.setattr(engines, "_availability", lambda *_: (False, "Missing local model files"))
    job = make_job()
    pipeline.run_job(job["id"])
    result = store.get_job(job["id"])
    assert result["status"] == "failed"
    assert "Missing local model" in result["error"]
    assert not result["outputs"] and not result["chunks"]


def test_engine_routing_never_substitutes_selected_voice():
    with pytest.raises(engines.EngineUnavailable, match="belongs to kokoro"):
        engines.resolve_engine({"engine": "kokoro", "model_voice": "af_heart"}, "piper")


def test_reference_duration_limit(tmp_path):
    source = tmp_path / "reference.wav"
    fixture_wave(source, 2)
    with pytest.raises(ValueError, match="cannot exceed"):
        audio.normalize_reference(source, tmp_path / "normalized.wav", max_duration=1)
