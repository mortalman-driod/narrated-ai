"""Voice library: built-in roster + sample-clip generation."""
import subprocess
from pathlib import Path

from . import config, store
from .engines.registry import get_engine

# The launch roster. Foreign voices use Kokoro stock voices (engine_voice id).
# Nigerian voices are cloned profiles; reference_wav is filled when you clone
# (see POST /api/voices/clone). Until then they route to the fallback engine
# so every [Listen] button still works.
BUILTIN_VOICES = [
    # --- Nigerian Female ---
    dict(id="adaeze",  name="Adaeze",  category="Nigerian Female",
         descriptors=["Warm", "Storyteller"], engine="xtts", gender="female",
         pitch_semitones=0),
    dict(id="zainab",  name="Zainab",  category="Nigerian Female",
         descriptors=["Bright", "Conversational"], engine="xtts", gender="female",
         pitch_semitones=2),
    dict(id="ngozi",   name="Ngozi",   category="Nigerian Female",
         descriptors=["Documentary", "Measured"], engine="xtts", gender="female",
         pitch_semitones=-1),
    # --- Nigerian Male ---
    dict(id="tunde",   name="Tunde",   category="Nigerian Male",
         descriptors=["Authoritative", "Broadcast"], engine="xtts", gender="male",
         pitch_semitones=0),
    dict(id="emeka",   name="Emeka",   category="Nigerian Male",
         descriptors=["Conversational", "Warm"], engine="xtts", gender="male",
         pitch_semitones=1),
    dict(id="sadiq",   name="Sadiq",   category="Nigerian Male",
         descriptors=["Deep", "Calm"], engine="xtts", gender="male",
         pitch_semitones=-3),
    # --- Foreign Male (Kokoro stock ids) ---
    dict(id="marcus",  name="Marcus",  category="Foreign Male",
         descriptors=["American", "Warm"], engine="kokoro", engine_voice="am_michael",
         gender="male", pitch_semitones=0),
    dict(id="oliver",  name="Oliver",  category="Foreign Male",
         descriptors=["British", "Crisp"], engine="kokoro", engine_voice="bm_george",
         gender="male", pitch_semitones=0),
    dict(id="hugo",    name="Hugo",    category="Foreign Male",
         descriptors=["European", "Deep"], engine="kokoro", engine_voice="am_adam",
         gender="male", pitch_semitones=-2),
    # --- Foreign Female (Kokoro stock ids) ---
    dict(id="elena",   name="Elena",   category="Foreign Female",
         descriptors=["American", "Bright"], engine="kokoro", engine_voice="af_sarah",
         gender="female", pitch_semitones=0),
    dict(id="charlotte", name="Charlotte", category="Foreign Female",
         descriptors=["British", "Refined"], engine="kokoro", engine_voice="bf_emma",
         gender="female", pitch_semitones=0),
    dict(id="sofia",   name="Sofia",   category="Foreign Female",
         descriptors=["European", "Soft"], engine="kokoro", engine_voice="af_heart",
         gender="female", pitch_semitones=1),
]

SAMPLE_PASSAGE = (
    "Every story deserves a voice that carries it home. "
    "This one begins in Lagos, moves through Abuja and Enugu, "
    "and ends somewhere warm. Chioma Okafor met Emeka Nwosu "
    "on a Tuesday in Surulere, and nothing was ever the same again."
)


def ensure_seeded():
    store.seed_voices(BUILTIN_VOICES)


def sample_path(voice_id: str) -> Path:
    return config.SAMPLES_DIR / f"{voice_id}.wav"


def ensure_sample(voice) -> Path:
    """Generate (once) the cached 15 s audition clip for a voice."""
    path = sample_path(voice["id"])
    if not path.exists():
        text = SAMPLE_PASSAGE[:400]
        get_engine(voice["engine"]).synthesize(text, voice, str(path))
        _trim(path, config.SAMPLE_SECONDS)
    return path


def _trim(path: Path, seconds: int):
    tmp = path.with_suffix(".tmp.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(path), "-t", str(seconds),
         "-c", "copy", str(tmp)],
        check=True, capture_output=True,
    )
    tmp.replace(path)
