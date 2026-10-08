"""Bounded, deterministic script planning; never execute markup as code.

Chunks are delivery/cache units (~30 s); segments preserve explicit pauses and
prosody. Sentence boundaries are synthesis units where exact pause control is
requested. Durations are estimates, never reported as measured render times.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, replace
import re
import xml.etree.ElementTree as ET


@dataclass(frozen=True)
class Segment:
    text: str
    rate: float = 1.0
    emphasis: str = "none"
    pause_after_ms: int = 0
    explicit_pause: bool = False


@dataclass(frozen=True)
class Chunk:
    index: int
    segments: tuple[Segment, ...]
    estimated_seconds: float

    def to_dict(self) -> dict:
        return asdict(self)


_ALLOWED = {"speak", "p", "s", "break", "prosody", "emphasis", "sub"}
_ABBREVIATIONS = re.compile(r"\b(?:Mr|Mrs|Ms|Dr|Prof|St|Sr|Jr|vs|etc|e\.g|i\.e)\.$", re.I)


def apply_lexicon(text: str, lexicon: dict[str, str] | None) -> str:
    """One-pass case-insensitive whole-word/phrase respelling, longest first."""
    entries = {k.casefold(): str(v) for k, v in (lexicon or {}).items() if k.strip()}
    if not entries:
        return text
    pattern = re.compile(r"(?<!\w)(?:" + "|".join(re.escape(k) for k in sorted(entries, key=len, reverse=True)) + r")(?!\w)", re.I)
    return pattern.sub(lambda match: entries[match.group().casefold()], text)


def _sentences(text: str) -> list[str]:
    # Do not split decimals, initials, or common honorifics. This is intentionally
    # lightweight; no language model download is needed to start the application.
    result, start = [], 0
    for match in re.finditer(r'[.!?]+["\u201d\u2019\')\]]*(?=\s+|$)', text):
        prefix = text[start:match.end()]
        if _ABBREVIATIONS.search(prefix) or re.search(r"\b[A-Z]\.$", prefix):
            continue
        result.append(prefix.strip())
        start = match.end()
    if text[start:].strip():
        result.append(text[start:].strip())
    return [part for part in result if part]


def _rate(value: str) -> float:
    named = {"x-slow": 0.65, "slow": 0.8, "medium": 1.0, "fast": 1.2, "x-fast": 1.4, "default": 1.0}
    try:
        rate = named[value] if value in named else float(value.rstrip("%")) / (100 if value.endswith("%") else 1)
    except ValueError as exc:
        raise ValueError("Prosody rate must be slow, medium, fast, or 50%–200%.") from exc
    if not 0.5 <= rate <= 2:
        raise ValueError("Prosody rate must be between 50% and 200%.")
    return rate


def _break_ms(node: ET.Element) -> int:
    value = node.attrib.get("time")
    if value is None:
        strengths = {"none": 0, "x-weak": 100, "weak": 200, "medium": 400, "strong": 800, "x-strong": 1200}
        strength = node.attrib.get("strength", "medium")
        if strength not in strengths:
            raise ValueError("Unknown break strength.")
        return strengths[strength]
    match = re.fullmatch(r"(\d+(?:\.\d+)?)(ms|s)", value.strip())
    if not match:
        raise ValueError("Break time must look like 300ms or 1.2s.")
    duration = round(float(match[1]) * (1000 if match[2] == "s" else 1))
    if not 0 <= duration <= 10000:
        raise ValueError("An individual break cannot exceed 10 seconds.")
    return duration


def plan_script(script: str, settings: dict | None = None, lexicon: dict[str, str] | None = None) -> list[Chunk]:
    settings = settings or {}
    if not script.strip():
        raise ValueError("That script looks empty. Paste some words before rendering.")
    speed = float(settings.get("speed", 1))
    if not 0.5 <= speed <= 2:
        raise ValueError("Speed must be between 0.5 and 2.")
    sentence_pause = int(settings.get("sentence_pause_ms", 300))
    paragraph_pause = int(settings.get("paragraph_pause_ms", 600))
    section_pause = int(settings.get("section_pause_ms", 1200))
    if any(not 0 <= pause <= 10000 for pause in (sentence_pause, paragraph_pause, section_pause)):
        raise ValueError("Pause values must be between 0 and 10000 milliseconds.")
    segments: list[Segment] = []

    def pause(milliseconds: int, additive: bool = False, explicit: bool = False) -> None:
        if segments:
            previous = segments[-1]
            duration = previous.pause_after_ms + milliseconds if additive else max(previous.pause_after_ms, milliseconds)
            if duration > 10000:
                raise ValueError("Consecutive breaks cannot exceed 10 seconds.")
            segments[-1] = replace(previous, pause_after_ms=duration, explicit_pause=previous.explicit_pause or explicit)
        elif milliseconds:
            segments.append(Segment("", pause_after_ms=milliseconds, explicit_pause=explicit))

    def emit(text: str | None, rate: float, emphasis: str) -> None:
        if not text:
            return
        # Blank lines preserve paragraph spacing; Markdown headings and rules
        # mark sections. Headings are spoken without their Markdown hashes.
        for part in re.split(r"(\n\s*\n+)", text.replace("\r\n", "\n")):
            if not part.strip():
                if "\n" in part:
                    pause(paragraph_pause)
                continue
            if re.fullmatch(r"\s*(?:---+|\*\*\*+)\s*", part):
                pause(section_pause)
                continue
            heading = bool(re.match(r"\s*#{1,6}\s", part))
            if heading:
                pause(section_pause)
                part = re.sub(r"(?m)^\s*#{1,6}\s+", "", part)
            part = apply_lexicon(re.sub(r"\s+", " ", part).strip(), lexicon)
            for sentence in _sentences(part):
                # Long unpunctuated paragraphs must never escape the bound.
                words = sentence.split()
                if any(len(word) > 200 for word in words):
                    raise ValueError("A script token exceeds 200 characters. Add spaces to long identifiers before rendering.")
                word_cap = max(12, min(80, int(70 * speed * rate)))
                for offset in range(0, len(words), word_cap):
                    phrase = " ".join(words[offset:offset + word_cap])
                    ended = bool(re.search(r'[.!?]["\u201d\u2019\')\]]*$', phrase))
                    segments.append(Segment(phrase, rate, emphasis, sentence_pause if ended and offset + word_cap >= len(words) else 0))
            if heading:
                pause(section_pause)

    def walk(node: ET.Element, rate: float = 1, emphasis: str = "none") -> None:
        if node.tag not in _ALLOWED:
            raise ValueError(f"Unsupported speech tag <{node.tag}>. Use speak, p, s, break, prosody, emphasis, or sub.")
        if node.tag == "break":
            pause(_break_ms(node), additive=True, explicit=True)
            return
        if node.tag == "prosody":
            unsupported = set(node.attrib) - {"rate"}
            if unsupported:
                raise ValueError("Prosody supports only the rate attribute.")
            rate *= _rate(node.attrib.get("rate", "medium"))
            if not 0.5 <= rate <= 2:
                raise ValueError("Combined prosody rate must be between 50% and 200%.")
        if node.tag == "emphasis":
            emphasis = node.attrib.get("level", "moderate")
            if emphasis not in {"none", "reduced", "moderate", "strong"}:
                raise ValueError("Emphasis must be none, reduced, moderate, or strong.")
        if node.tag == "sub":
            alias = node.attrib.get("alias")
            if not alias:
                raise ValueError("The sub tag requires an alias.")
            emit(alias, rate, emphasis)
            return
        emit(node.text, rate, emphasis)
        for child in node:
            walk(child, rate, emphasis)
            emit(child.tail, rate, emphasis)
        if node.tag == "p":
            pause(paragraph_pause)
        elif node.tag == "s":
            pause(sentence_pause)

    if re.search(r"</?[A-Za-z][\w-]*(?:\s|/?>)", script):
        if "<!" in script or "<?" in script:
            raise ValueError("Declarations and processing instructions are not supported in speech markup.")
        try:
            wrapped = "<speak>" + script + "</speak>"
            root = ET.fromstring(wrapped)
        except ET.ParseError as exc:
            raise ValueError(f"Speech markup is not well formed: {exc}") from exc
        walk(root)
    else:
        emit(script, 1, "none")
    if not any(segment.text for segment in segments):
        raise ValueError("The script contains no spoken words.")
    # No automatic trailing gap on the final segment, but explicit breaks remain.
    if segments[-1].pause_after_ms == sentence_pause and not segments[-1].explicit_pause:
        segments[-1] = replace(segments[-1], pause_after_ms=0)

    chunks: list[Chunk] = []
    group: list[Segment] = []
    seconds = 0.0
    for segment in segments:
        estimate = len(segment.text.split()) / (2.5 * speed * segment.rate) + segment.pause_after_ms / 1000
        if group and seconds + estimate > 40:
            chunks.append(Chunk(len(chunks), tuple(group), round(seconds, 2)))
            group, seconds = [], 0.0
        group.append(segment)
        seconds += estimate
        if seconds >= 28:
            chunks.append(Chunk(len(chunks), tuple(group), round(seconds, 2)))
            group, seconds = [], 0.0
    if group:
        chunks.append(Chunk(len(chunks), tuple(group), round(seconds, 2)))
    return chunks
