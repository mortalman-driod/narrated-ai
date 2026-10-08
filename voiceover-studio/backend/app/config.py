"""Central configuration for Voiceover Studio."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
DATA_DIR = Path(os.environ.get("VS_DATA_DIR", BASE_DIR.parent / "data"))
AUDIO_OUT = DATA_DIR / "renders"
VOICES_DIR = DATA_DIR / "voices"           # cloned voice reference audio
SAMPLES_DIR = DATA_DIR / "samples"         # cached per-voice sample clips
CHUNKS_DIR = DATA_DIR / "chunks"
DB_PATH = DATA_DIR / "studio.db"

for d in (DATA_DIR, AUDIO_OUT, VOICES_DIR, SAMPLES_DIR, CHUNKS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# --- Audio / render targets -------------------------------------------------
TARGET_LUFS = float(os.environ.get("VS_TARGET_LUFS", "-16"))
MP3_BITRATE = "320k"
SAMPLE_RATE = 24000

# --- Throughput tuning ------------------------------------------------------
# Words per chunk (~75 words ≈ 30 s at 150 wpm). Larger chunks = fewer seams.
CHUNK_TARGET_WORDS = int(os.environ.get("VS_CHUNK_WORDS", "75"))
# Concurrent chunk renders. Set to 1 on CPU; a 12 GB GPU handles 8-16.
RENDER_CONCURRENCY = int(os.environ.get("VS_RENDER_CONCURRENCY", "4"))

# Pause lengths (milliseconds)
PAUSE_PARAGRAPH_MS = 600
PAUSE_SECTION_MS = 1200
PAUSE_SENTENCE_MS = 300

# Seconds of cached sample audio per voice
SAMPLE_SECONDS = 15
