"""Render a UTF-8 script through the running local studio; report measured RTF."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import time
import urllib.error
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("script", type=Path)
    parser.add_argument("--voice", default="piper:en_US-ljspeech-medium")
    parser.add_argument("--name", default="CLI narration")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--output", type=Path, default=Path("data/cli_exports"))
    args = parser.parse_args()
    base = f"http://127.0.0.1:{args.port}/api"

    def request(path: str, payload: dict | None = None) -> dict:
        encoded = json.dumps(payload).encode() if payload is not None else None
        headers = {"Content-Type": "application/json"} if encoded else {}
        with urllib.request.urlopen(urllib.request.Request(base + path, data=encoded, headers=headers), timeout=30) as response:
            return json.load(response)

    project = request("/projects", {"name": args.name, "script": args.script.read_text(encoding="utf-8-sig"), "voice_id": args.voice, "settings": {}})
    started = time.perf_counter()
    job = request("/jobs", {"project_id": project["id"]})
    previous = None
    try:
        while job["status"] not in {"completed", "failed", "cancelled"}:
            snapshot = (job["status"], job["completed_chunks"], round(job["progress"]))
            if snapshot != previous:
                print(f"{job['status']}: {job['progress']:.0f}% | {job['completed_chunks']}/{job['total_chunks']} chunks | ETA {job.get('eta_seconds')}s", flush=True)
                previous = snapshot
            time.sleep(1)
            job = request(f"/jobs/{job['id']}")
    except KeyboardInterrupt:
        request(f"/jobs/{job['id']}/cancel", {})
        print("Cancellation requested. Any current synthesis call finishes before cancellation takes effect.")
        return 130
    if job["status"] != "completed":
        print(f"{job['status']}: {job.get('error') or 'No completed export.'}")
        return 1
    elapsed = time.perf_counter() - started
    duration = job["duration_seconds"]
    print(f"Completed. Audio: {duration:.2f}s; elapsed: {elapsed:.2f}s; real-time factor: {elapsed/duration:.3f}")
    args.output.mkdir(parents=True, exist_ok=True)
    for kind in ("wav", "mp3", "zip"):
        destination = args.output / f"{job['id']}.{kind}"
        urllib.request.urlretrieve(base + f"/jobs/{job['id']}/download/{kind}", destination)
        print(destination.resolve())
    (args.output / f"{job['id']}.benchmark.json").write_text(json.dumps({"job_id": job["id"], "voice": args.voice, "audio_seconds": duration, "elapsed_seconds": elapsed, "rtf": elapsed / duration}, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.HTTPError as error:
        print(f"Studio API error ({error.code}): {error.read().decode(errors='replace')}")
        raise SystemExit(1)
    except (OSError, ValueError) as error:
        print(f"Render failed: {error}")
        raise SystemExit(1)
