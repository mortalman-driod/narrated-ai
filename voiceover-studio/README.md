# Voiceover Studio

A fully local, zero-API voiceover platform. Long scripts (2-hour scale) are
chunked, rendered in parallel on your own GPU/CPU, loudness-normalized, and
exported as MP3 / WAV / ZIP. Includes a casting room with Nigerian and foreign
male & female voices, live previews, and a human-made editorial interface.

## Stack
- **Backend:** Python 3.11 · FastAPI · SQLite · ffmpeg
- **Engines:** Kokoro TTS (primary, Apache-2.0) · Coqui XTTS v2 (voice cloning)
  · built-in placeholder engine so the app runs before models are installed
- **Frontend:** React 18 · TypeScript · Vite · Tailwind CSS

## Setup

```bash
./setup.sh                 # creates venvs, installs deps, builds frontend
# or manually:

# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install "kokoro>=0.9"        # primary engine
pip install "TTS==0.22.*"        # for cloning Nigerian voices
sudo apt install ffmpeg          # macOS: brew install ffmpeg

# 2. Frontend
cd ../frontend
npm install

# 3. Run (two terminals)
cd backend  && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev        # http://localhost:5173
```

> Without Kokoro/XTTS installed, the app still runs end to end on the
> placeholder engine (voice-like tones) so you can validate the UI, queue,
> progress, and exports. Install the real engines for production speech.

## Cloning a Nigerian voice (Casting Room -> Clone)
1. Record 3–10 minutes of clean speech from a consenting Nigerian speaker
   (quiet room, no music, single speaker).
2. Upload via `POST /api/voices/clone` (name, category, reference WAV, and the
   consent affirmation). The voice then appears in the Casting Room under its
   category, with Listen / Select / "Test my own words".

## Speed knobs (environment variables)
| Variable | Default | Notes |
|---|---|---|
| `VS_RENDER_CONCURRENCY` | 4 | Raise to 8–16 on a 12 GB+ GPU; keep 1 on CPU |
| `VS_CHUNK_WORDS` | 75 | Words per chunk (~30 s); larger = fewer seams |
| `VS_TARGET_LUFS` | -16 | Loudness target for the master |

On a mid-range GPU, Kokoro renders ~3x realtime; with batching, a 2-hour
script lands in roughly 15–40 minutes depending on hardware.

## Layout
```
backend/app/
  main.py        FastAPI routes + WebSocket progress
  pipeline.py    chunk -> parallel synthesize -> ffmpeg loudnorm -> WAV+MP3
  chunker.py     script -> timed chunks with paragraph/section pauses
  voices.py      voice roster + cached audition clips
  pronunciations.py  custom dictionary for Nigerian names/places
  engines/       kokoro / xtts / placeholder + fallback registry
frontend/src/
  components/    NavRail, CastingRoom, VoiceCard, ScriptEditor,
                 RenderConsole, ExportsPanel, PlayerBar, Buttons
```

## Ethics
Only clone voices you own or have explicit written consent to use. The clone
endpoint refuses requests without the consent affirmation. Disclose that
finished audio is synthesized wherever you publish it.
