# 🎙️ Narrated AI — Studio Suite

A modern, production-grade AI content creation workstation inspired by **Narrated AI**, Vox, and documentary workflows. Built with **Next.js 14**, **React 18**, **Tailwind CSS**, **Google Gemini**, **Remotion**, and neural speech synthesis.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Remotion](https://img.shields.io/badge/Remotion-4-purple.svg)](https://remotion.dev/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmortalman-driod%2Fnarrated-ai&env=GEMINI_API_KEY&envDescription=Optional%20Google%20Gemini%20API%20key%20for%20creative%20cloud%20storyboards)

---

## 🌟 Studio Suite Overview

Narrated AI is organized into two core studios:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      NARRATED AI STUDIO SUITE                          │
├───────────────────────────────────┬────────────────────────────────────┤
│ 📐 PROMPT ARCHITECT               │ 🎙️ VOICEOVER STUDIO                │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Direct Voiceover & Mic Input    │ • Neural TTS Speech Synthesis      │
│ • Premise-to-Script Generator     │ • Edge Neural & Kokoro Fallback    │
│ • Synchronized 4–8s Scene Cuts    │ • Phonetic Pronunciation Lexicon   │
│ • Contextual Diffusion Prompts    │ • Audio Cadence & Speed Tuning     │
│ • Character Consistency Model     │ • Batch Audio Render & Stitching   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. 📐 Prompt Architect (Storyboard & Diffusion Engine)
- **Direct Voiceover Input & Speech Dictation**:
  - Input, paste, or speak your voiceover via live microphone dictation (`Web Speech API`).
  - Automatically calculates exact word counts, natural spoken runtimes, and optimal scene budgets.
  - Preserves your exact words and partitions them into sequential, engagement-optimized scenes.
- **Story Premise Generator**:
  - Synthesizes compelling documentary narratives from just a premise or historical topic.
- **Mathematical Timing Engine (`lib/generator/timing.ts`)**:
  - Automatically calculates sub-second narration timing based on words-per-minute (WPM).
  - Enforces strict **4 to 8 second scene pacing** for maximum visual retention.
  - Automatically breaks longer scripts into balanced cinematic scene cuts.
- **Visual Continuity & Diffusion Prompts**:
  - Generates synchronized prompts optimized for **Flux.1**, **Midjourney v6**, and **Runway Gen-3**.
  - Includes camera angles, framing, lighting, lenses, and color palettes.
  - Extracts character model sheets and stylistic anchors across all scenes.
- **Dual Engine Architecture**:
  - **Cloud Mode**: High-fidelity creative synthesis via **Google Gemini 2.5 Flash**.
  - **Offline Mode**: 100% deterministic local procedural engine requiring zero API keys.

### 2. 🎙️ Voiceover Studio (Neural Audio Synthesizer)
- **High-Quality Speech Synthesis**:
  - Built-in multi-voice neural synthesis powered by **Microsoft Edge Neural TTS** and offline fallbacks.
  - Curated voice catalog across multiple accents, genders, and storytelling tones (Documentary, Deep Dramatic, Warm Narration, Energetic).
- **Phonetic Pronunciation Lexicon**:
  - Custom pronunciation substitutions for biblical, fantasy, historical, and foreign names.
- **Direct Bridge to Storyboard Architect**:
  - Send any edited voiceover directly to the Storyboard Architect with 1 click to generate matched visual scenes.
- **Batch Export**:
  - Synthesizes individual scene audio files (`scene_1.mp3`, `scene_2.mp3`, etc.) or merges complete full-length audio tracks.

### 3. 🎬 Remotion Video Pipeline
- Programmatic video rendering using **Remotion**:
  - Dynamic Ken Burns camera motion (`slow pan`, `cinematic zoom`, `tracking`).
  - Burned-in, word-highlighted karaoke-style subtitles.
  - 9:16 vertical video export for YouTube Shorts, TikTok, and Instagram Reels.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── generate/route.ts      # Storyboard synthesis API route
│   │   └── tts/route.ts           # Speech synthesis API route
│   ├── layout.tsx                 # Root layout & dark theme provider
│   └── page.tsx                   # Studio workspace dashboard
├── components/
│   ├── voiceover/                 # Voiceover Studio player & controls
│   ├── CharacterModelSheet.tsx    # Character continuity panel
│   ├── DurationSlider.tsx         # Runtime slider (15s - 180s)
│   ├── FullVoiceoverScript.tsx    # Full narration review modal
│   ├── NicheCard.tsx              # Genre presets selector
│   ├── SceneCard.tsx              # Visual storyboard scene cards
│   └── StoryboardTable.tsx        # Production data table
├── lib/
│   ├── generator/                 # Procedural & Gemini storyboard engine
│   ├── voiceover/                 # Audio exporter, voices, lexicon
│   └── presets.ts                 # Pre-configured storytelling niches
├── remotion/                      # Remotion composition & subtitle renderer
├── services/                      # CLI pipelines & exporters
├── cli.ts                         # Remotion video synthesis CLI
└── generate.ts                    # Standalone CLI storyboard generator
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js** 18.x or 20.x
- **npm** or **pnpm**
- *(Optional)* Google Gemini API key (for cloud storyboard generation)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mortalman-driod/narrated-ai.git
   cd narrated-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   # Google Gemini API (Optional: used for cloud storyboard generation)
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash

   # Port configuration
   PORT=3000
   ```
   > *Note: If no API key is provided, the application automatically runs in **Offline Procedural Mode**.*

4. **Launch the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Production Deployment

### Deploying to Vercel (Recommended)

1. Push your code to your GitHub repository (live at [mortalman-driod/narrated-ai](https://github.com/mortalman-driod/narrated-ai)).
2. Log into [Vercel](https://vercel.com) and import the project.
3. In Project Settings, set Framework Preset to **Next.js**.
4. Click **Deploy**.

### Self-Hosted Production Build

```bash
npm run build
npm run start
```

---

## 📜 License

This project is licensed under the MIT License.
