================================================================================
VOICEOVER STUDIO — LOCAL, API-FREE TEXT-TO-SPEECH PRODUCTION FRAMEWORK
Version 1.0 | Architecture & Prompt Engineering Document
================================================================================

--------------------------------------------------------------------------------
1. EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Goal: A self-hosted, zero-API voiceover platform that converts long-form scripts
(up to 2 hours of finished audio) into broadcast-quality voiceovers using local
open-source TTS models. Voices include Nigerian-accented English, standard
foreign male voices, and standard foreign female voices. The system prioritizes
(1) throughput (fastest wall-clock time for long scripts), (2) preview-before-
you-commit voice testing, and (3) export-grade audio downloads.

Design philosophy of the interface: human-made, not machine-generated. Restrained
typography, generous whitespace, clearly labelled controls, zero decorative
emojis, zero gradient-purple "AI aesthetic."


--------------------------------------------------------------------------------
2. SYSTEM ARCHITECTURE
--------------------------------------------------------------------------------

  [Browser UI]
      |
      v
  [Frontend App — React + Vite + TypeScript]
      |  REST / WebSocket (job progress)
      v
  [API Layer — FastAPI (Python)]
      |  enqueues
      v
  [Job Queue — Redis + Celery, or RQ]  <---------------
      |                                              |
      v                                              |
  [GPU Inference Workers — local TTS models]         |
      |                                              |
      v                                              |
  [Audio Post-Processing — ffmpeg: normalize,        |
   stitch, loudness to -16 LUFS / -14 LUFS stereo]   |
      |                                              |
      v                                              |
  [Storage — ./audio_output (WAV masters + MP3)]     |
      |______________________________________________|
                        (status updates back to UI)

2.1 Hardware assumptions
  - Minimum: NVIDIA GPU with 8 GB VRAM (RTX 3060/4060 class)
  - Recommended: 12–24 GB VRAM (RTX 3090/4090) for batch parallelism
  - CPU fallback: Piper / Kokoro CPU mode (slower, still viable)

2.2 Backend stack
  - Python 3.11, FastAPI, Uvicorn
  - Celery + Redis (task queue, retry, progress callbacks)
  - PyTorch 2.x with CUDA
  - ffmpeg for normalization, concatenation, MP3 encode
  - SQLite or Postgres for job history

2.3 Frontend stack
  - React 18 + TypeScript + Vite
  - Tailwind CSS with a custom design-token layer (Section 7)
  - Web Audio API / howler.js for voice previews and playback scrubbing
  - Framer Motion for restrained micro-transitions only


--------------------------------------------------------------------------------
3. TTS ENGINE SELECTION (NO API, FULLY LOCAL)
--------------------------------------------------------------------------------

Primary engine: KOKORO TTS (Apache-2.0, 82M params)
  - Extremely fast: real-time factor ~0.3 on mid-range GPU
    (≈3x realtime; a 2-hour script renders in roughly 40 minutes;
    with batching across GPU/CPU threads, 15–25 minutes is achievable)
  - Built-in multi-voice library: dozens of male/female English voices
    across American, British, Australian, and international accents
  - Clean, natural prosody; no watermarking; fully offline

Secondary engine (voice cloning / accent customization): F5-TTS or XTTS v2
  - Used to create CUSTOM voices (e.g., authentic Nigerian-accented English)
  - Workflow: collect 3–10 minutes of clean Nigerian speaker audio (with
    consent), run zero-shot or few-shot voice cloning, save as a named
    custom voice profile
  - XTTS v2 supports cross-lingual cloning and is ideal for accent capture

Lightweight fallback: Piper TTS
  - CPU-fast, lower quality; used for instant preview drafts

Engine routing strategy:
  - Preview/test  -> Kokoro (instant, cached samples)
  - Final render  -> Kokoro (quality) OR cloned-voice engine if a custom
                     Nigerian voice was selected

3.1 Nigerian voice strategy (critical detail)
  Kokoro's stock library does not include Nigerian accents. Two paths:
    A) Voice cloning path (recommended):
       - Record/source consented Nigerian voice talent (English with Nigerian
         accent; optionally Yoruba/Igbo/Pidgin for multilingual support via XTTS)
       - Clone into named profiles: "Adaeze — Nigerian Female (Warm)",
         "Tunde — Nigerian Male (Authoritative)", etc.
       - Store reference audio + embeddings in ./voices/custom/
    B) Community fine-tuned checkpoint path:
       - Fine-tune Kokoro or F5-TTS on Nigerian-accented English corpus
       - Requires GPU hours but gives the most authentic result


--------------------------------------------------------------------------------
4. LONG-SCRIPT SPEED PIPELINE (2-HOUR SCRIPT)
--------------------------------------------------------------------------------

4.1 Chunking
  - Parse script into sentences/paragraphs (spaCy or regex)
  - Pack sentences into ~20–40 second audio chunks (better than per-sentence
    synthesis: fewer seams, better prosody)
  - Preserve paragraph boundaries as natural pauses

4.2 Parallelism
  - Batch size auto-tuned to VRAM (e.g., batch 16–32 on a 12 GB card)
  - Split job across: GPU worker + optional second worker on CPU threads
  - Celery chunks: distribute paragraphs across worker processes

4.3 Streaming results
  - Each finished chunk is normalized and stored immediately
  - Progress bar updates per-chunk via WebSocket (% complete, ETA, chunk count)
  - User can listen to completed sections while the rest renders

4.4 Final assembly
  - ffmpeg concat + loudness normalization to -16 LUFS (podcast standard)
  - Output WAV (master) + MP3 320kbps + optional M4A
  - Target: 2-hour script -> complete render in under 30 minutes on a
    single mid-range GPU

4.5 Quality controls
  - Pronunciation lexicon: custom dictionary for Nigerian names, places,
    Pidgin terms (phoneme overrides)
  - Pause tuning: paragraph = 600 ms, section break = 1.2 s, full stop = 300 ms
  - Optional SSML-lite markup support for emphasis and rate control


--------------------------------------------------------------------------------
5. VOICE LIBRARY & PREVIEW SYSTEM
--------------------------------------------------------------------------------

Voice browser ("The Casting Room"):
  - Grid of voice CARDS. Each card shows:
      Voice name (human name, e.g., "Adaeze", "Marcus", "Elena")
      Category tag: Nigerian Female | Nigerian Male | Foreign Male |
      Foreign Female
      Tone descriptors: Warm | Authoritative | Conversational | Documentary
      Age color: Young | Mature | Deep
  - Each card has TWO clearly labelled buttons:
      [Listen]  — streams a cached 15-second sample sentence
                (a standard test passage + a Nigerian-names passage so users
                 hear how the voice handles local names)
      [Select]  — sets the voice as active for the project

  - A persistent bottom audio player bar (play/pause, waveform scrubber,
    close) so users can compare voices while browsing

  - "Test my own words" box: user types any sentence, clicks [Hear it],
    gets a live preview rendered on the spot in that voice

  - Sample passages should include: English prose, Nigerian names/places,
    numbers/dates, and an emotional line — so the user truly tests the voice
    before committing.

Suggested launch voice roster (12 voices):
  Nigerian Female: Adaeze (Warm), Zainab (Bright), Ngozi (Documentary)
  Nigerian Male:   Tunde (Authoritative), Emeka (Conversational), Sadiq (Deep)
  Foreign Male:    Marcus (American, warm), Oliver (British, crisp),
                   Hugo (European, deep)
  Foreign Female:  Elena (American, bright), Charlotte (British, refined),
                   Sofia (European, soft)


--------------------------------------------------------------------------------
6. DOWNLOAD & EXPORT
--------------------------------------------------------------------------------
  - After render: dedicated "Exports" panel listing the job
  - Buttons (clearly labelled):
      [Download MP3]  [Download WAV]  [Download ZIP (MP3 + WAV + script.txt)]
      [Listen Full]   (stream the complete master with a scrubber)
  - Filename convention: {project_name}_{voice}_{date}_{quality}.mp3
  - Optional chapter markers if the script contains headings (MP3 chapters)


--------------------------------------------------------------------------------
7. INTERFACE DESIGN SPEC (ANTI-"GENERIC AI SITE")
--------------------------------------------------------------------------------

Visual language: "Editorial studio," not "AI startup."

Typography (via Fontsource, self-hosted):
  - Display/headers: "Fraunces" (serif, optical sizing, humanist) 400/500/600
  - Body & UI: "Inter" 400/500/600
  - Mono (labels/technical tags): "JetBrains Mono" 400/500
  - Base size 16px, 1.6 line height, max content width 1080px, generous margins

Color system (muted, warm, print-inspired):
  - Background: warm off-white  #FAF7F2
  - Surface/cards: #FFFFFF with 1px border #E8E2D9 (soft shadow, no glow)
  - Ink (text): #1C1917
  - Muted text: #6B6259
  - Accent (used sparingly — primary buttons, active states): burnt sienna
    #B4532A; hover #9A4524
  - Secondary action: outlined button, ink text, no fill
  - Success/progress: deep olive #4D7C0F
  - Dark mode: optional, charcoal #171412 surfaces, same accent

Buttons — all clearly labelled with text, not icons alone:
  [New Project]  [Import Script]  [Listen]  [Select Voice]  [Start Render]
  [Pause]  [Download MP3]  [Download WAV]
  - States: default, hover (subtle darken), active/loading (spinner + label
    change, e.g., "Rendering… 42%"), disabled
  - No rounded-full pill spam: 6px radius, 2px focus ring in accent

Voice cards: white, hairline border, name in Fraunces 20px, descriptor tags
in small caps mono labels, [Listen] outlined button, [Select] filled button.

Layout:
  - Left rail: navigation (Projects, Voices, Exports, Settings) — text labels
  - Main canvas: current project with script editor (monospace, line numbers),
    voice picker, render controls
  - Bottom: persistent audio player when a sample is playing

Tone of microcopy — human, calm, precise:
  - "Choose your narrator" not "Select an AI voice"
  - "Rendering your voiceover — about 18 minutes left" not "Processing…"
  - Error: "That file looks empty. Try pasting your script as plain text."

Motion: 150–250ms ease-out fades and slides only. No confetti, no emojis,
no gradient meshes, no glassmorphism, no robot icons.


--------------------------------------------------------------------------------
8. MASTER PROMPT (paste into your AI coding assistant)
--------------------------------------------------------------------------------

  You are a senior full-stack engineer and product designer. Build me a fully
  local, API-free voiceover web application called "Voiceover Studio."

  HARD CONSTRAINTS:
  - Do NOT use any cloud TTS API (no OpenAI, ElevenLabs, Google, Azure).
    All speech synthesis runs locally on my GPU/CPU using open-source models:
    Kokoro TTS as the primary engine, XTTS v2 (Coqui) for voice cloning of
    custom voices, and Piper as a CPU fallback. Include a documented
    ./setup script that downloads model weights automatically.
  - The app must convert a 2-hour script into finished audio as fast as
    possible: chunk the script into 20–40s passages, batch inference on GPU,
    parallelize with a Celery + Redis queue, stream per-chunk progress over
    WebSocket, and assemble with ffmpeg into -16 LUFS normalized WAV + MP3
    320kbps. Show live % progress and ETA.
  - Voice library must include: Nigerian-accented female and male voices
    (built via XTTS v2 voice cloning from my provided reference audio, stored
    as named profiles) AND stock foreign male and female voices from Kokoro's
    library. Each voice card must have a [Listen] button that plays a
    15-second cached sample and a "Test my own words" input that renders a
    live preview in the selected voice. Include a persistent bottom player
    bar with waveform scrubber for comparing voices.
  - Every render job must be downloadable as MP3, WAV, and a ZIP bundle,
    plus streamable in-browser for review.
  - Support a custom pronunciation dictionary (especially for Nigerian names
    and places) and basic pause/SSML-lite controls.

  DESIGN REQUIREMENTS — this must NOT look like a generic AI-generated site:
  - Typography: Fraunces for headings, Inter for body, JetBrains Mono for
    small labels. Self-hosted via Fontsource.
  - Palette: warm off-white #FAF7F2 background, white cards with 1px #E8E2D9
    borders and soft shadows, ink #1C1917 text, accent burnt sienna #B4532A
    used sparingly. No purple/blue gradients, no glassmorphism, no emojis.
  - Buttons: 6px radius, clearly text-labelled (e.g., "Listen", "Select
    Voice", "Start Render", "Download MP3"), visible hover/active/disabled/
    loading states with honest progress text like "Rendering — 42%,
    ~11 min left".
  - Layout: left text-labelled nav rail; main canvas with script editor
    (monospace, line numbers), voice picker grid, render console; bottom
    audio player. Max content width 1080px, generous whitespace.
  - Motion: only 150–250ms ease-out fades/slides. Microcopy is human and
    calm ("Choose your narrator", not "Select an AI voice").

  Deliverables: full repo structure, backend (FastAPI + Celery + Redis),
  frontend (React + TypeScript + Tailwind with the exact tokens above),
  voice cloning onboarding flow (upload 3–10 min reference audio -> clone ->
  name & save profile), render pipeline with chunking + batching, exports,
  and a README with hardware requirements and setup steps. Write clean,
  commented, production-quality code.

--------------------------------------------------------------------------------
9. BUILD ROADMAP
--------------------------------------------------------------------------------
  Phase 1 (Week 1): Backend pipeline — Kokoro integration, chunking, batching,
                   ffmpeg assembly, queue + progress. CLI proof that a 2-hour
                   script renders end-to-end.
  Phase 2 (Week 2): Nigerian voice cloning — collect consent-cleared reference
                   audio, clone 6 profiles, bake sample passages, A/B test.
  Phase 3 (Week 3): Frontend — design tokens, layout, casting room, script
                   editor, render console, player bar, exports.
  Phase 4 (Week 4): Polish — pronunciation dictionary UI, pause controls,
                   dark mode, QA on 2-hour end-to-end render time and loudness.

--------------------------------------------------------------------------------
10. LEGAL & ETHICS NOTE
--------------------------------------------------------------------------------
  - Only clone voices you own or have explicit written consent to use.
  - Add an in-app disclosure that audio was generated, and a consent
    affirmation step during voice-profile creation.
================================================================================
