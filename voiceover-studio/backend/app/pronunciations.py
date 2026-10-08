"""Custom pronunciation dictionary for Nigerian names, places, Pidgin terms.

Simple text-level respelling layer: replace a term with its respelling before
synthesis. Works with any engine; engines with phoneme support can be extended
to consume IPA entries instead.
"""
import json
import re
from pathlib import Path

from . import config

DICT_PATH = config.DATA_DIR / "pronunciations.json"


def load() -> dict:
    if DICT_PATH.exists():
        return json.loads(DICT_PATH.read_text())
    return {}


def save(d: dict):
    DICT_PATH.write_text(json.dumps(d, indent=2, ensure_ascii=False))


def apply(text: str, dictionary: dict | None = None) -> str:
    if not dictionary:
        dictionary = load()
    for term, respelling in sorted(dictionary.items(), key=lambda kv: -len(kv[0])):
        text = re.sub(re.escape(term), respelling, text, flags=re.IGNORECASE)
    return text
