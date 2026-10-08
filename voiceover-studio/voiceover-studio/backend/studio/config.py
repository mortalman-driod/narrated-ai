"""Central configuration. No model libraries are imported during API startup."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    queue_mode: str = "local"
    redis_url: str = "redis://localhost:6379/0"
    ffmpeg_bin: str = "ffmpeg"
    ffprobe_bin: str = "ffprobe"
    device: str = "auto"
    local_workers: int = 1
    max_upload_bytes: int = 100 * 1024 * 1024

    @property
    def output_dir(self) -> Path:
        return self.data_dir / "audio_output"

    @property
    def custom_voices_dir(self) -> Path:
        return self.data_dir / "voices" / "custom"

    @property
    def models_dir(self) -> Path:
        return self.data_dir / "models"

    @property
    def database_path(self) -> Path:
        return self.data_dir / "studio.sqlite3"


def load_settings() -> Settings:
    data_path = Path(os.environ.get("STUDIO_DATA_DIR", str(ROOT_DIR / "data"))).expanduser()
    if not data_path.is_absolute():
        data_path = ROOT_DIR / data_path
    queue_mode = os.environ.get("STUDIO_QUEUE_MODE", "local").lower()
    if queue_mode not in {"local", "celery"}:
        raise ValueError("STUDIO_QUEUE_MODE must be local or celery")
    return Settings(
        data_dir=data_path.resolve(),
        queue_mode=queue_mode,
        redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
        ffmpeg_bin=os.environ.get("FFMPEG_BIN", "ffmpeg"),
        ffprobe_bin=os.environ.get("FFPROBE_BIN", "ffprobe"),
        device=os.environ.get("STUDIO_DEVICE", "auto"),
        local_workers=max(1, min(4, int(os.environ.get("STUDIO_LOCAL_WORKERS", "1")))),
    )


settings = load_settings()
DATA_DIR = settings.data_dir
OUTPUT_DIR = settings.output_dir
MODELS_DIR = settings.models_dir
