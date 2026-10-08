import fs from 'fs';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import dotenv from 'dotenv';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { execSync } from 'child_process';

import { PipelineInput, Storyboard } from './types';
import { generateScript } from './services/scriptGen';
import { synthesizeAudioForScenes } from './services/tts';
import { generateVisualsForScenes } from './services/imageGen';

dotenv.config();

const program = new Command();

program
  .name('narrated-ai')
  .description('Modular, automated video narration application using Remotion & AI APIs')
  .option('-t, --topic <topic>', 'Premise or topic for the video', 'The Mystery of Flight 19')
  .option('-a, --audience <audience>', 'Target audience', 'General mystery & history enthusiasts')
  .option('-d, --duration <duration>', 'Desired duration (e.g. "45-60 seconds")', '45-60 seconds')
  .option('--tone <tone>', 'Voice narration tone', 'Suspenseful, dramatic, documentary narrator')
  .option('-m, --mock', 'Run with mock audio/visuals for offline testing without spending API credits', false)
  .option('--generate-images', 'Generate real AI images with DALL-E 3', false)
  .option('-o, --output <output>', 'Destination MP4 path', 'renders/output.mp4')
  .option('--render-only', 'Re-render using existing temp/storyboard.json', false);

program.parse(process.argv);
const options = program.opts();

async function runPipeline() {
  console.log('\n======================================================');
  console.log('       NARRATED AI — AUTOMATED VIDEO PIPELINE         ');
  console.log('======================================================\n');

  const cwd = process.cwd();
  const tempDir = path.join(cwd, 'temp');
  const tempAudioDir = path.join(tempDir, 'audio');
  const tempImagesDir = path.join(tempDir, 'images');
  const publicDir = path.join(cwd, 'public');
  const publicAudioDir = path.join(publicDir, 'audio');
  const publicImagesDir = path.join(publicDir, 'images');
  const rendersDir = path.join(cwd, 'renders');
  const storyboardPath = path.join(tempDir, 'storyboard.json');

  [tempDir, tempAudioDir, tempImagesDir, publicDir, publicAudioDir, publicImagesDir, rendersDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  let storyboard: Storyboard;

  if (options.renderOnly && fs.existsSync(storyboardPath)) {
    console.log(`[Pipeline] Loading existing storyboard from ${storyboardPath}...`);
    storyboard = JSON.parse(fs.readFileSync(storyboardPath, 'utf8'));
  } else {
    const input: PipelineInput = {
      topic: options.topic,
      audience: options.audience,
      duration: options.duration,
      tone: options.tone,
      mock: options.mock,
      generateImages: options.generateImages
    };

    console.log(`[Pipeline Input]`);
    console.log(` • Topic:    "${input.topic}"`);
    console.log(` • Audience: "${input.audience}"`);
    console.log(` • Duration: "${input.duration}"`);
    console.log(` • Tone:     "${input.tone}"`);
    console.log(` • Mock Mode: ${input.mock ? 'YES' : 'NO'}`);
    console.log(` • DALL-E 3:  ${input.generateImages ? 'YES' : 'NO (procedural cards)'}\n`);

    // Stage 1: Script & Storyboard Generator (LLM)
    console.log('--- [Stage 1/4] Generating Script & Storyboard ---');
    const rawStoryboard = await generateScript(input);

    // Stage 2: Audio Synthesis Worker (TTS + ffprobe duration measurement)
    console.log('\n--- [Stage 2/4] Audio Synthesis & Timing Analysis ---');
    const scenesWithAudio = await synthesizeAudioForScenes(
      rawStoryboard.scenes,
      tempAudioDir,
      rawStoryboard.fps,
      input.mock
    );

    // Mirror audio to public/audio so Remotion can multiplex it into the video track
    for (const sc of scenesWithAudio) {
      if (sc.audio_file && fs.existsSync(sc.audio_file)) {
        const dest = path.join(publicAudioDir, path.basename(sc.audio_file));
        fs.copyFileSync(sc.audio_file, dest);
      }
    }

    // Stage 3: Visual Generation
    console.log('\n--- [Stage 3/4] Visual Media Generation ---');
    const scenesWithVisuals = await generateVisualsForScenes(
      scenesWithAudio,
      tempImagesDir,
      {
        generateWithAI: input.generateImages,
        width: rawStoryboard.width,
        height: rawStoryboard.height
      }
    );

    // Mirror images to public/images
    for (const sc of scenesWithVisuals) {
      if (sc.image_file && fs.existsSync(sc.image_file)) {
        const dest = path.join(publicImagesDir, path.basename(sc.image_file));
        fs.copyFileSync(sc.image_file, dest);
      }
    }

    // Map scene relative paths for Remotion staticFile()
    const finalScenes = scenesWithVisuals.map((sc) => {
      const audioRel = sc.audio_file ? `audio/${path.basename(sc.audio_file)}` : undefined;
      const imageRel = sc.image_file ? `images/${path.basename(sc.image_file)}` : undefined;

      return {
        ...sc,
        audio_file_path: sc.audio_file,
        image_file_path: sc.image_file,
        audio_file: audioRel,
        image_file: imageRel
      };
    });

    const totalDuration = finalScenes.reduce((sum, sc) => sum + (sc.duration_in_frames || 90), 0);

    storyboard = {
      ...rawStoryboard,
      scenes: finalScenes,
      total_duration_in_frames: totalDuration
    };

    fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2), 'utf8');
    console.log(`[Pipeline] Storyboard metadata saved to ${storyboardPath}`);
  }

  // Stage 4: Video Composition & Assembly (Remotion)
  console.log('\n--- [Stage 4/4] Remotion Video Composition & Assembly ---');
  const outputPath = path.resolve(options.output);
  const totalFrames = storyboard.total_duration_in_frames || 300;
  const concurrency = Math.min(4, Math.max(1, os.cpus().length));

  console.log(`[Remotion] Target Output: ${outputPath}`);
  console.log(`[Remotion] Composition:   ${storyboard.width}x${storyboard.height} @ ${storyboard.fps}fps`);
  console.log(`[Remotion] Total Length:  ${(totalFrames / storyboard.fps).toFixed(1)}s (${totalFrames} frames)`);
  console.log(`[Remotion] Concurrency:   ${concurrency}x threads`);

  const entryPoint = path.resolve(cwd, 'remotion/index.ts');

  try {
    console.log(`[Remotion] Bundling Remotion project...`);
    const bundleLocation = await bundle({
      entryPoint,
      publicDir,
      onProgress: (progress) => {
        if (progress % 25 === 0 || progress === 100) {
          process.stdout.write(`\r[Remotion] Bundling: ${progress}%`);
        }
      }
    });
    console.log(`\n[Remotion] Bundle created successfully.`);

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'NarratedStory',
      inputProps: { storyboard }
    });

    console.log(`[Remotion] Rendering media with H.264 & AAC audio...`);
    let lastLoggedPercent = -1;

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      audioCodec: 'aac',
      concurrency,
      outputLocation: outputPath,
      inputProps: { storyboard },
      onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 100);
        if (percent !== lastLoggedPercent && percent % 10 === 0) {
          lastLoggedPercent = percent;
          process.stdout.write(`\r[Remotion] Rendering MP4: ${percent}%`);
        }
      }
    });

    console.log(`\n\n🎉 [SUCCESS] Video rendered successfully!`);
    console.log(`📹 Output Artifact: ${outputPath}`);
  } catch (renderError: any) {
    console.warn(`\n[Remotion] Node API render note: ${renderError.message}`);
    console.log('[Remotion] Using CLI render with multi-core concurrency...');

    const cliCmd = `npx.cmd remotion render NarratedStory "${outputPath}" --props="${storyboardPath}" --concurrency=${concurrency}`;
    execSync(cliCmd, { stdio: 'inherit' });
    console.log(`\n🎉 [SUCCESS] Video rendered successfully!`);
    console.log(`📹 Output Artifact: ${outputPath}`);
  }
}

runPipeline().catch((err) => {
  console.error('\n❌ [PIPELINE ERROR]:', err);
  process.exit(1);
});
