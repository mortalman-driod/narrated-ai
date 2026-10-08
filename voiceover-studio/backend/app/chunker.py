"""Split a long script into synthesis-sized chunks with pauses."""
import re
from dataclasses import dataclass, field

from . import config

_SENTENCE_RE = re.compile(r"[^.!?\n]+[.!?]*")
_HEADING_RE = re.compile(r"^#{1,3}\s+|^[A-Z0-9 ,.:'\-]{6,}$")


@dataclass
class Chunk:
    index: int
    text: str
    pause_after_ms: int = config.PAUSE_SENTENCE_MS


def _sentences(paragraph: str):
    return [s.strip() for s in _SENTENCE_RE.findall(paragraph) if s.strip()]


def chunk_script(script: str, target_words: int = config.CHUNK_TARGET_WORDS):
    """Pack sentences into ~target_words chunks, respecting paragraph breaks."""
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", script) if p.strip()]
    chunks: list[Chunk] = []
    buf: list[str] = []
    words = 0
    idx = 0

    def flush(pause_ms):
        nonlocal buf, words, idx
        if buf:
            chunks.append(Chunk(idx, " ".join(buf), pause_ms))
            idx += 1
            buf, words = [], 0

    for para in paragraphs:
        heading = bool(_HEADING_RE.match(para.strip())) and len(para) < 80
        sentences = _sentences(para)
        for sent in sentences:
            w = len(sent.split())
            if words + w > target_words and buf:
                flush(config.PAUSE_SENTENCE_MS)
            buf.append(sent)
            words += w
        flush(config.PAUSE_SECTION_MS if heading else config.PAUSE_PARAGRAPH_MS)
    flush(config.PAUSE_PARAGRAPH_MS)
    return chunks
