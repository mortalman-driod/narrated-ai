# Voiceover Studio

A local narration workspace built with React, TypeScript, and FastAPI. Write a script, audition a narrator, render speech on your computer, and download a WAV master, MP3, or ZIP containing both formats and the script. The interface uses self-hosted Fraunces, Inter, and JetBrains Mono fonts.

Speech runs through installed **Kokoro**, **Piper**, or **XTTS v2** models. There are no cloud TTS calls, API keys, hosted inference services, or runtime weight downloads. Package installation and explicit model setup require internet access; rendering works offline after setup.

## Quick start: Windows

Requirements: Python 3.11, Node.js 22+ with npm, and `ffmpeg` / `ffprobe` on PATH. Python 3.12 also works for the CPU path; the setup scripts choose 3.11 for model compatibility. If [uv](https://docs.astral.sh/uv/) is installed, setup can provision Python 3.11 automatically. Otherwise install Python 3.11 with the Windows Python launcher. Install FFmpeg using your preferred distribution; for example `winget install Gyan.FFmpeg`, then open a new terminal.

Run from this directory:

```powershell
.\setup.ps1
.\backend\.venv\Scripts\python.exe -m uvicorn studio.api:app --app-dir backend --host 127.0.0.1 --port 8000
```

Open [Voiceover Studio](http://127.0.0.1:8000). Select **LJ** in the casting room and choose **Listen** or enter your own preview text. The default setup installs Piper's CPU runtime and a 61 MiB LJ Speech model; it also builds the browser application. Kokoro voices remain visibly unavailable until their optional setup is complete. No fake speech or made-up Nigerian voice samples are included.

If PowerShell blocks local script execution, use `powershell -ExecutionPolicy Bypass -File .\setup.ps1` for this invocation. Setup never changes your global execution policy. Re-running it is safe: existing model files are reused.

To install the primary Kokoro engine and its ten American/British voices:

```powershell
.\setup.ps1 -Engine kokoro
```

This also keeps the small Piper fallback and installs PyTorch, the local English phonemizer data, and Kokoro weights. It is a larger download. For Windows Kokoro, install [eSpeak NG](https://github.com/espeak-ng/espeak-ng/releases) if your phonemizer requires it. Piper bundles its own eSpeak data.

## Linux / macOS

Install Python 3.11 (or uv), Node.js 22+, FFmpeg, and eSpeak NG. Debian/Ubuntu system packages include `ffmpeg espeak-ng libsndfile1`; macOS Homebrew provides `ffmpeg espeak-ng`.

```bash
bash setup
backend/.venv/bin/python -m uvicorn studio.api:app --app-dir backend --host 127.0.0.1 --port 8000
```

`bash setup --engine kokoro` adds Kokoro. After marking the launchers executable in a POSIX checkout (`chmod +x setup setup.sh`), `./setup` is equivalent. For Python-only setup pass `--skip-frontend`; PowerShell uses `-SkipFrontend`. `--skip-models` / `-SkipModels` installs code without downloading weights.

## Work in the studio

1. Create a project, paste or import a plain text script, and choose an installed voice.
2. Use **Listen** for the sample passage or **Hear it** to audition your own words. Previews are cached by text, voice, speed, pronunciation settings, and model fingerprint.
3. Adjust delivery speed, sentence/paragraph/section pauses, and loudness. Add whole-word pronunciation respellings in Settings.
4. Start rendering. Progress and ETA arrive by WebSocket with a polling fallback. Completed passages are playable before the master is ready.
5. Open Exports to listen or download 48 kHz, stereo, 24-bit PCM WAV; 320 kbps MP3; or the ZIP bundle. Stereo narration is dual mono, not an artificial spatial effect.

The final master uses FFmpeg two-pass loudness normalization with a -1.5 dBTP ceiling and your selected -16 or -14 LUFS target. Chunk playback is normalized separately before the full program can be measured.

Cancellation is cooperative: the current model synthesis call may finish before the job stops; FFmpeg processing is interruptible. Interrupted jobs are marked failed after a local server restart so unfinished exports are never presented as completed work. A fresh render reuses matching cached speech where possible. Editing a project does not change a render already in progress: jobs contain immutable input snapshots.

### Nigerian and other custom voices

Custom voices need a real reference recording from a speaker who has consented to this use. Upload **3–10 minutes** of clear single-speaker audio, affirm consent, and name the profile, accent, gender, and delivery tone. Files are stored locally under `data/voices/custom/`; no recording is uploaded to a third-party speech service. XTTS performs zero-shot conditioning from the recording, not a new model training run. Accent fidelity and name pronunciation should be auditioned with the actual speaker's recording.

There are no built-in Nigerian Kokoro voices and no fabricated Nigerian profiles. A profile can be saved before XTTS is installed but becomes usable only when its local engine is available. XTTS supports English; Yoruba, Igbo, and Nigerian Pidgin are not separately listed supported languages, so this project makes no multilingual quality claim for them.

XTTS model weights and outputs use the **non-commercial Coqui Public Model License**, not a permissive open-source license. Review the [actual model license](https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt) before enabling it. If you accept its terms:

```powershell
.\setup.ps1 -WithXtts -AcceptXttsLicense
```

```bash
bash setup --with-xtts --accept-xtts-license
```

XTTS adds a substantial model/runtime download. This installer does not automatically accept the license or enable XTTS in the default installation.

### Pauses and pronunciation

Plain text uses blank lines for paragraphs and Markdown headings or `---` for section boundaries. The dictionary performs case-insensitive whole-word/phrase respellings, not engine-specific IPA conversion. For example, enter a speaker-tested phonetic spelling for a name, then preview it.

SSML-lite accepts `speak`, `p`, `s`, `break`, `prosody`, `emphasis`, and `sub`:

```xml
<speak>
  <p>Welcome to Lagos.<break time="600ms"/>Our story begins here.</p>
  <p><prosody rate="90%">Read this a little more slowly.</prosody></p>
  <p><sub alias="your tested pronunciation">A name</sub> joins us today.</p>
</speak>
```

Rates range from 50% to 200%; individual explicit breaks are limited to ten seconds. Emphasis is a modest speed/gain approximation, not a promise of native emotional SSML support. Unsupported or malformed markup receives an error instead of being silently interpreted.

## GPU and long scripts

CPU-only machines can render with Piper. For Kokoro or XTTS on GPU, use an NVIDIA CUDA device with at least 8 GB VRAM as a practical starting point; 12–24 GB leaves more headroom. Install the CUDA-enabled PyTorch/torchaudio build that matches your driver using the [official PyTorch selector](https://pytorch.org/get-started/locally/) into `backend/.venv`, then set `STUDIO_DEVICE=cuda`. `auto` selects CUDA when PyTorch detects it and otherwise uses CPU; Piper remains the CPU fallback. No GPU is required to start the app.

The pipeline plans roughly 20–40 second delivery chunks, preserves sentence/prosody segments for pause control, reuses loaded models, caches reusable speech, streams completed chunks, and writes/joins PCM incrementally so a long recording does not have to fit in RAM. Provision several GB of free disk space per two-hour project: masters and ZIP bundles deliberately duplicate high-quality audio. Scripts are limited to 400,000 characters.

**Throughput is hardware- and voice-dependent.** Two hours in under thirty minutes is a target from the brief, not a measured guarantee. This implementation runs inference sequentially per worker/model session; Celery distributes complete jobs, not individual chunks. It does not implement automatic VRAM batch tuning or independent GPU minibatches. More workers on one GPU can exhaust memory without speeding up a single job. Use one worker per GPU initially. `STUDIO_CPU_THREADS` controls the PyTorch CPU thread count.

The verified CPU smoke test generated 6.62 seconds of real LJ speech in 7.11 seconds including model load on the development machine. That short measurement is not a two-hour benchmark. GPU Kokoro, XTTS voice cloning, and Docker execution need validation on their intended hardware.

Measure your own long-form workload against a running server:

```powershell
.\backend\.venv\Scripts\python.exe scripts/render_cli.py .\script.txt --voice piper:en_US-ljspeech-medium --name "Long narration"
```

The CLI prints measured audio duration, elapsed time, and real-time factor, and saves WAV/MP3/ZIP plus a benchmark JSON under `data/cli_exports`. Use `--voice kokoro:af_heart` after Kokoro setup. A 30-minute / 2-hour target means a real-time factor of 0.25 or lower, including assembly. First renders include model load; subsequent renders may hit caches, so distinguish cold runs from warm or cached ones.

## Local queue and Celery

Native Windows defaults to a background thread queue in the API process and needs no Redis. Run one Uvicorn process; do not combine the local queue with multiple Uvicorn workers or production auto-reload. `STUDIO_LOCAL_WORKERS` defaults to one. Development reload interrupts active jobs.

Celery's official documentation does [not support native Windows workers](https://docs.celeryq.dev/en/stable/faq.html#does-celery-support-windows). Use Docker Desktop with Linux containers or WSL/Linux for the Redis/Celery topology. The provided Docker image defaults to CPU Piper and bundles the built frontend:

```bash
docker compose build
docker compose run --rm --no-deps api python scripts/download_models.py --engine piper
docker compose up -d
```

Open [the local studio](http://127.0.0.1:8000). Both API and worker mount `./data`; Redis stays on the private Compose network. To include CPU Kokoro, set `ENGINE_EXTRAS=piper,kokoro,queue` when building, then run the download command with `--engine kokoro`. The default image is not a CUDA image; a GPU deployment needs a matching CUDA-enabled PyTorch image/runtime and explicit GPU device allocation.

For WSL/Linux without Docker, install the queue extra (setup includes it), start Redis, set the same `STUDIO_DATA_DIR` in both processes, then run from `backend`:

```bash
export STUDIO_QUEUE_MODE=celery
export REDIS_URL=redis://127.0.0.1:6379/0
.venv/bin/celery -A studio.tasks:celery_app worker --loglevel=info --concurrency=1
# In another terminal with the same environment:
.venv/bin/uvicorn studio.api:app --host 127.0.0.1 --port 8000
```

Use a Linux filesystem for SQLite/data in WSL and avoid sharing an actively used SQLite database across a network filesystem. For the native app, placing `STUDIO_DATA_DIR` outside OneDrive avoids syncing private recordings, large exports, and an open database. Back up the data directory while the app and workers are stopped.

## Configuration and data

Copy `.env.example` to `.env` to change defaults. Environment variables already set in the launching shell take precedence. Restart the API and any workers after changing settings.

| Variable | Default / meaning |
| --- | --- |
| `STUDIO_DATA_DIR` | Repository `data/`; absolute paths recommended; relative paths resolve from repository root |
| `STUDIO_QUEUE_MODE` | `local` or `celery` |
| `STUDIO_DEVICE` | `auto`, `cpu`, or `cuda` for PyTorch engines |
| `STUDIO_LOCAL_WORKERS` | `1`, up to `4`; inference in one process remains serialized |
| `STUDIO_CPU_THREADS` | PyTorch CPU thread count; otherwise up to eight |
| `REDIS_URL` | `redis://localhost:6379/0` |
| `FFMPEG_BIN` / `FFPROBE_BIN` | Executable names or full paths |

```text
voiceover-studio/
  backend/studio/        API, SQLite store, workers, models, speech/audio pipeline
  backend/tests/         API, chunking, and pipeline checks
  frontend/src/          React studio and self-hosted visual design
  scripts/               Explicit model downloads, preflight, speech test, CLI render
  setup.ps1 / setup.sh    Cross-platform setup (bash setup is the POSIX entrypoint)
  Dockerfile / compose.yaml
  data/                  Ignored local user data, never committed
    studio.sqlite3       Projects, jobs, profiles, and pronunciation settings
    models/piper/        .onnx, .onnx.json, model card, download manifest
    models/kokoro/       config.json, kokoro-v1_0.pth, voices/*.pt
    models/xtts/         config.json, model.pth, vocab.json, speakers_xtts.pth
    voices/custom/       Consented local reference recordings
    audio_output/        Render chunks and completed exports
```

The downloader uses pinned repository revisions, atomic partial files, length checks, and a SHA-256 manifest; Kokoro's primary weight file additionally checks the publisher's full SHA-256. To download to a different installation, pass `--models-dir` to `scripts/download_models.py`; the application itself looks in `STUDIO_DATA_DIR/models`.

The server is intended for a single trusted user on their own machine: loopback binding, Host/Origin checks, local data, no accounts. Public multi-user hosting, authentication, quotas, HTTPS termination, and concurrent database coordination across machines are outside this implementation.

## Development and verification

```powershell
.\backend\.venv\Scripts\python.exe scripts/preflight.py
.\backend\.venv\Scripts\python.exe scripts/smoke_tts.py
.\backend\.venv\Scripts\python.exe -m pytest backend/tests
cd frontend
npm run build
npm run dev
```

The Vite development server proxies `/api` and WebSockets to port 8000. Keep the API running separately. Interactive API documentation is available at [localhost:8000/docs](http://127.0.0.1:8000/docs).

The smoke command writes real local speech to `data/diagnostics/piper-smoke.wav` and validates that it contains a nonempty signal. Unit tests may use test doubles; production code never substitutes a tone or silence for missing speech models. Preflight reports unavailable optional engines without downloading anything.

If a voice is unavailable, check Settings and `/api/health`, run its setup command, and restart the server. If CUDA was requested but is unavailable, install the matching PyTorch build or choose `STUDIO_DEVICE=cpu`. Missing weights fail with an actionable error; no fallback silently changes the narrator you selected.

## Model and runtime licenses

Third-party code and weights retain their own licenses; local execution does not make every model permissively licensed.

- **Kokoro:** the [official Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M) identifies the weights as Apache-2.0. Setup includes ten English voices from that repository and saves its license/model card.
- **Piper:** the maintained [Piper runtime](https://github.com/OHF-Voice/piper1-gpl) is GPL-3.0. Voice models have separate provenance and terms. The default [LJ Speech model card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/medium/MODEL_CARD) identifies public-domain source data and training from scratch. Additional Lessac/Amy voices are optional; inspect their model cards and linked dataset terms before use or distribution.
- **XTTS v2:** the [Coqui Public Model License](https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt) limits the model and its outputs to non-commercial use. The application preserves this distinction instead of describing XTTS as unrestricted open source.

The application identifies narration as generated and asks for voice-owner consent when importing a reference. Keep the speaker's permission and model/license records with your production assets.
