import fs from 'fs';
import path from 'path';
import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Scene } from '../types';

dotenv.config();

const PALETTES = [
  { bg1: '#0B0F19', bg2: '#1B2A47', accent: '#00F0FF', text: '#E2E8F0' },
  { bg1: '#120A1F', bg2: '#28133E', accent: '#FF007A', text: '#F3E8FF' },
  { bg1: '#051A1A', bg2: '#0D3838', accent: '#00FFA3', text: '#E6FFFA' },
  { bg1: '#1A0E05', bg2: '#3D1C06', accent: '#FFB800', text: '#FFFBEB' },
  { bg1: '#1A0B14', bg2: '#381428', accent: '#FF3366', text: '#FFE4E6' }
];

export function generateProceduralVisualCard(
  scene: Scene,
  outputPath: string,
  width: number = 1080,
  height: number = 1920
): string {
  const palette = PALETTES[(scene.scene_id - 1) % PALETTES.length];
  const escapedPrompt = (scene.visual_prompt || '')
    .slice(0, 160)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${palette.bg2}" />
      <stop offset="100%" stop-color="${palette.bg1}" />
    </radialGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
    </radialGradient>
    <filter id="noiseFilter">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1  0 0 0 0.05 0" />
    </filter>
  </defs>

  <!-- Background Gradient -->
  <rect width="100%" height="100%" fill="url(#bgGrad)" />

  <!-- Ambient Glow Orb -->
  <circle cx="${width / 2}" cy="${height / 2.2}" r="${width * 0.45}" fill="url(#glowGrad)" />

  <!-- Subtle Grid Lines -->
  <g stroke="rgba(255,255,255,0.04)" stroke-width="1.5">
    <line x1="0" y1="${height * 0.25}" x2="${width}" y2="${height * 0.25}" />
    <line x1="0" y1="${height * 0.5}" x2="${width}" y2="${height * 0.5}" />
    <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${height * 0.75}" />
    <line x1="${width * 0.25}" y1="0" x2="${width * 0.25}" y2="${height}" />
    <line x1="${width * 0.5}" y1="0" x2="${width * 0.5}" y2="${height}" />
    <line x1="${width * 0.75}" y1="0" x2="${width * 0.75}" y2="${height}" />
  </g>

  <!-- Noise Texture -->
  <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.6" />

  <!-- Scene Badge -->
  <g transform="translate(${width * 0.1}, ${height * 0.12})">
    <rect width="180" height="42" rx="21" fill="rgba(255,255,255,0.08)" stroke="${palette.accent}" stroke-width="1.5" />
    <text x="90" y="26" fill="${palette.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" letter-spacing="2" text-anchor="middle">
      SCENE ${scene.scene_id}
    </text>
  </g>

  <!-- Center Decorative Visual Icon / Motif -->
  <g transform="translate(${width / 2}, ${height / 2.2})">
    <circle r="140" fill="none" stroke="${palette.accent}" stroke-width="1" stroke-dasharray="8 6" opacity="0.4" />
    <circle r="110" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
    <polygon points="0,-45 40,35 -40,35" fill="${palette.accent}" opacity="0.8" />
  </g>

  <!-- Camera Motion Indicator -->
  <text x="${width * 0.9}" y="${height * 0.14}" fill="rgba(255,255,255,0.4)" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" text-anchor="end" letter-spacing="1">
    MOTION: ${scene.camera_motion.toUpperCase()}
  </text>

  <!-- Visual Prompt Summary Card -->
  <g transform="translate(${width * 0.1}, ${height * 0.65})">
    <rect width="${width * 0.8}" height="140" rx="16" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
    <text x="24" y="34" fill="${palette.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="1.5">
      VISUAL DIRECTION
    </text>
    <foreignObject x="24" y="44" width="${width * 0.8 - 48}" height="85">
      <div xmlns="http://www.w3.org/1999/xhtml" style="color: #94A3B8; font-family: system-ui, -apple-system, sans-serif; font-size: 15px; line-height: 1.45; font-style: italic; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
        "${escapedPrompt}"
      </div>
    </foreignObject>
  </g>

  <!-- Cinematic Vignette / Border -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="24" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1.5" />
</svg>`;

  const svgPath = outputPath.endsWith('.svg') ? outputPath : outputPath.replace(/\.[^.]+$/, '.svg');
  fs.writeFileSync(svgPath, svg, 'utf8');
  return svgPath;
}

async function generateDallEImage(
  prompt: string,
  outputPath: string,
  apiKey: string
): Promise<boolean> {
  const openai = new OpenAI({ apiKey });
  console.log(`[ImageGen] Requesting DALL-E 3 image: "${prompt.slice(0, 50)}..."`);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `Cinematic vertical video background, 9:16 aspect ratio, masterpiece, high quality: ${prompt}`,
    n: 1,
    size: '1024x1792',
    response_format: 'b64_json'
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) return false;

  fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
  return true;
}

export async function generateVisualsForScenes(
  scenes: Scene[],
  outputDir: string,
  options: { generateWithAI?: boolean; width?: number; height?: number } = {}
): Promise<Scene[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const useAI = options.generateWithAI || process.env.IMAGE_GENERATOR === 'openai';
  const width = options.width || 1080;
  const height = options.height || 1920;

  const enrichedScenes: Scene[] = [];

  for (const scene of scenes) {
    const pngPath = path.join(outputDir, `scene_${scene.scene_id}.png`);
    const svgPath = path.join(outputDir, `scene_${scene.scene_id}.svg`);
    let finalPath = svgPath;

    if (useAI && apiKey && !apiKey.includes('your_openai_api_key')) {
      try {
        const success = await generateDallEImage(scene.visual_prompt, pngPath, apiKey);
        if (success) {
          finalPath = pngPath;
          console.log(`[ImageGen] DALL-E 3 image saved for Scene ${scene.scene_id}`);
        }
      } catch (err: any) {
        console.warn(`[ImageGen] DALL-E 3 generation failed for Scene ${scene.scene_id}: ${err.message}. Using procedural card.`);
        finalPath = generateProceduralVisualCard(scene, svgPath, width, height);
      }
    } else {
      finalPath = generateProceduralVisualCard(scene, svgPath, width, height);
    }

    enrichedScenes.push({
      ...scene,
      image_file: finalPath
    });
  }

  return enrichedScenes;
}
