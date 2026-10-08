"""Validated public API models; internal filesystem paths never leave the API."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class RenderSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    paragraph_pause_ms: int = Field(default=600, ge=0, le=5000)
    section_pause_ms: int = Field(default=1200, ge=0, le=10000)
    sentence_pause_ms: int = Field(default=300, ge=0, le=3000)
    loudness_lufs: Literal[-16, -14] = -16
    engine: Literal["auto", "kokoro", "piper", "xtts"] = "auto"


class ProjectInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    script: str = Field(default="", max_length=400_000)
    voice_id: str = Field(default="kokoro:af_heart", min_length=1, max_length=100)
    settings: RenderSettings = Field(default_factory=RenderSettings)

    @field_validator("name")
    @classmethod
    def meaningful_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Give this project a name.")
        return value


class Project(ProjectInput):
    id: str
    created_at: str
    updated_at: str


class Voice(BaseModel):
    id: str
    name: str
    gender: Literal["female", "male"]
    accent: str
    tone: str
    engine: str
    model_voice: str
    custom: bool
    available: bool
    description: str


class RenderInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str = Field(min_length=1, max_length=100)


class PreviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    voice_id: str = Field(min_length=1, max_length=100)
    text: str = Field(min_length=1, max_length=1200)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)

    @field_validator("text")
    @classmethod
    def meaningful_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Add a sentence to hear this voice.")
        return value.strip()


class Chunk(BaseModel):
    index: int
    url: str
    duration_seconds: float


class Job(BaseModel):
    id: str
    project_id: str | None
    project_name: str
    voice_id: str
    voice_name: str
    kind: Literal["render", "preview"]
    status: Literal["queued", "running", "assembling", "completed", "failed", "cancelled"]
    progress: float
    completed_chunks: int
    total_chunks: int
    eta_seconds: float | None = None
    duration_seconds: float | None = None
    error: str | None = None
    created_at: str
    updated_at: str
    available_formats: list[str] = Field(default_factory=list)
    chunks: list[Chunk] = Field(default_factory=list)
    audio_url: str | None = None


class LexiconSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lexicon: dict[str, str] = Field(default_factory=dict)

    @field_validator("lexicon")
    @classmethod
    def bounded_lexicon(cls, values: dict[str, str]) -> dict[str, str]:
        if len(values) > 500:
            raise ValueError("The pronunciation dictionary supports up to 500 entries.")
        cleaned: dict[str, str] = {}
        for key, value in values.items():
            key, value = key.strip(), value.strip()
            if not key or not value or len(key) > 100 or len(value) > 200:
                raise ValueError("Pronunciations need a word (1–100 characters) and replacement (1–200 characters).")
            cleaned[key] = value
        return cleaned
