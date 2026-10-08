# Narrated AI — Automated Narrative Pipeline & Video Synthesis

A modular, automated AI storytelling and video generation engine inspired by **Narrated AI**, Vox, and cinematic documentary workflows. Built with **Node.js**, **TypeScript**, **Google Gemini**, **Remotion**, **OpenAI**, and **FFmpeg**.

---

## 🚀 Key Modules & Capabilities

### 1. Synchronized Script & Diffusion Prompt Generator (`generate.ts`)
- **Dynamic Timing & Script Engine (`services/narrativeEngine.ts`)**:
  - Calculates sub-second spoken durations based on exact word counts and narration speed (WPM).
  - Enforces **strict 4 to 8 second scene pacing** for visual engagement.
  - Generates cumulative, continuous start and end timestamps in `MM:SS` format.
- **Visual Prompt Synthesis (Flux / Midjourney v6)**:
  - Generates detailed diffusion prompts including subject framing, lighting, environment, camera lens/gear, and color grading.
  - Maintains **visual continuity** across scenes with persistent character attributes, environmental progression, and lighting anchors.
  - Supports style presets: `cinematic realism`, `dark fantasy`, `retro anime`, `cyberpunk noir`, `historical documentary`, or custom aesthetics.
- **Dual Export Schema**:
  - Structured JSON at [output/storyboard.json](file:///c:/Users/ezeki/Desktop/Game%20Dev/output/storyboard.json).
  - Human-readable production document at [output/storyboard.md](file:///c:/Users/ezeki/Desktop/Game%20Dev/output/storyboard.md).

### 2. Automated Video Composition & Assembly (`cli.ts`)
- **Audio Worker (`services/tts.ts`)**:
  - Synthesizes speech via OpenAI TTS (`tts-1`), ElevenLabs, or offline synth fallback.
  - Computes audio duration with `ffprobe` and aligns word-level subtitle timings.
- **Remotion Video Engine (`remotion/NarratedStory.tsx`)**:
  - Renders 1080x1920 vertical video with Ken Burns camera motion (`zoom in`, `zoom out`, `slow pan right/left`).
  - Burned-in animated subtitles with glowing active-word pop/karaoke styling.
  - Outputs ready-to-publish MP4 to [renders/output.mp4](file:///c:/Users/ezeki/Desktop/Game%20Dev/renders/output.mp4).

---

## 📁 Project Structure

```
├── generate.ts                # Narrative & Diffusion Prompt Generator CLI
├── cli.ts                     # Video Composition & Remotion rendering CLI
├── services/
│   ├── narrativeEngine.ts     # Timing engine & Gemini prompt orchestrator
│   ├── markdownExporter.ts    # Markdown storyboard formatter & exporter
│   ├── scriptGen.ts           # LLM script generator (OpenAI / Gemini / Mock)
│   ├── tts.ts                 # TTS audio worker & ffprobe duration analyzer
│   └── imageGen.ts            # DALL-E 3 & procedural visual card generator
├── remotion/
│   ├── index.ts               # Remotion root entrypoint
│   ├── Root.tsx               # Remotion Composition with dynamic metadata
│   ├── Composition.tsx        # Composition export & default studio props
│   ├── NarratedStory.tsx      # Main composition (Series, progress bar, header badge)
│   ├── SceneView.tsx          # Single scene renderer (camera motion, audio, visual)
│   └── Subtitles.tsx          # Burned-in dynamic word-highlighted subtitles
├── output/
│   ├── storyboard.json        # Timestamped JSON output
│   └── storyboard.md          # Production Markdown document
├── temp/
│   ├── audio/                 # Generated audio files (scene_1.mp3, etc.)
│   └── storyboard.json        # Compiled Remotion storyboard
├── public/                    # Remotion static assets mirror for rendering
└── renders/
    └── output.mp4             # Final rendered MP4 video
```

---

## 🛠️ Configuration (`.env`)

```env
# Google Gemini API (Primary Narrative Engine)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# OpenAI API (TTS & Video Narrator)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_TTS_VOICE=onyx

# Video Settings
VIDEO_FPS=30
VIDEO_WIDTH=1080
VIDEO_HEIGHT=1920
```

---

## 🎬 How to Run

### 1. Generate Synchronized Script & Diffusion Prompts
```bash
# Default (60 seconds, 140 WPM, cinematic realism)
npm run generate -- --topic="The Lost City of Z" --duration=60

# Custom Pacing and Style Preset
npm run generate -- --topic="Neon Shadows: The Quantum Heist" --duration=45 --pacing=150 --style="cyberpunk noir"

# Dark Fantasy Epic (120 seconds)
npm run generate -- --topic="The Forgotten Citadel of Ash" --duration=120 --style="dark fantasy"
```

### 2. Output Schema

#### JSON (`output/storyboard.json`):
```json
{
  "title": "The Quest for Z",
  "total_duration": "01:00",
  "scenes": [
    {
      "scene_number": 1,
      "timestamp_start": "00:00",
      "timestamp_end": "00:05",
      "duration_seconds": 5,
      "narration_script": "Colonel Fawcett, driven by legend, ventured deep into the Amazon's uncharted heart.",
      "visual_prompt": "Extreme wide establishing shot of a vast, dense Amazonian jungle canopy...",
      "camera_direction": "Slow drone pull-up, revealing the immense scale of the jungle."
    }
  ]
}
```

#### Markdown (`output/storyboard.md`):
Exports a formatted production document featuring timeline tables, word count metrics, camera directions, and copyable prompt codeblocks ready for Midjourney v6 and Flux.1.

### 3. Full Video Narration Rendering (Remotion)
```bash
# Render complete MP4 with subtitles and audio
npm run generate-story -- --topic="The Mystery of Flight 19"

# Preview video in Remotion Studio
npm run preview
```
