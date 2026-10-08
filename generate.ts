import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import dotenv from 'dotenv';
import { generateNarrativeStoryboard, NarrativeInput } from './services/narrativeEngine';
import { exportStoryboardToMarkdown } from './services/markdownExporter';

dotenv.config();

const program = new Command();

program
  .name('storyboard-generator')
  .description('Streamlined narrative pipeline generating timestamped scripts paired with diffusion prompts')
  .option('-t, --topic <string>', 'Story premise or subject matter', 'The Lost City of Z')
  .option('-d, --duration <number>', 'Total runtime target in seconds (e.g. 60, 180, 300)', '60')
  .option('--target_duration_seconds <number>', 'Alias for --duration')
  .option('-p, --pacing <number>', 'Narration speed in words per minute (WPM)', '140')
  .option('-s, --style <string>', 'Visual aesthetic preset', 'cinematic realism')
  .option('--style_preset <string>', 'Alias for --style')
  .option('-o, --output-dir <path>', 'Output directory for generated artifacts', 'output');

program.parse(process.argv);
const opts = program.opts();

async function main() {
  console.log('\n===============================================================');
  console.log('       NARRATIVE PIPELINE & DIFFUSION PROMPT SYNTHESIZER       ');
  console.log('===============================================================\n');

  const topic = opts.topic;
  const duration = parseInt(opts.target_duration_seconds || opts.duration, 10) || 60;
  const pacing = parseInt(opts.pacing, 10) || 140;
  const stylePreset = opts.style_preset || opts.style || 'cinematic realism';
  const outputDir = path.resolve(process.cwd(), opts.outputDir || 'output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const input: NarrativeInput = {
    topic,
    target_duration_seconds: duration,
    pacing,
    style_preset: stylePreset
  };

  console.log(`[Input Parameters]`);
  console.log(` • Topic / Premise:      "${input.topic}"`);
  console.log(` • Target Duration:      ${input.target_duration_seconds}s (${Math.floor(input.target_duration_seconds / 60)}m ${input.target_duration_seconds % 60}s)`);
  console.log(` • Pacing:               ${input.pacing} WPM (~${(input.pacing / 60).toFixed(2)} words/sec)`);
  console.log(` • Visual Aesthetic:     "${input.style_preset}"`);
  console.log(` • Output Directory:     ${outputDir}\n`);

  try {
    const storyboard = await generateNarrativeStoryboard(input);

    const jsonPath = path.join(outputDir, 'storyboard.json');
    const mdPath = path.join(outputDir, 'storyboard.md');

    // 1. Export JSON conforming strictly to schema
    const jsonOutput = {
      title: storyboard.title,
      total_duration: storyboard.total_duration,
      scenes: storyboard.scenes.map((s) => ({
        scene_number: s.scene_number,
        timestamp_start: s.timestamp_start,
        timestamp_end: s.timestamp_end,
        duration_seconds: s.duration_seconds,
        narration_script: s.narration_script,
        visual_prompt: s.visual_prompt,
        camera_direction: s.camera_direction
      }))
    };

    fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf8');
    console.log(`[Output] Structured JSON saved to: ${jsonPath}`);

    // 2. Export human-readable Markdown
    exportStoryboardToMarkdown(storyboard, mdPath, {
      topic: input.topic,
      pacing: input.pacing,
      style_preset: input.style_preset
    });
    console.log(`[Output] Production Markdown saved to: ${mdPath}`);

    // 3. Print Console Summary
    console.log('\n--- ⏱️ Scene Timeline Summary ---');
    console.log('Scene | Time Window   | Dur | Spoken Words | Camera Direction');
    console.log('------+---------------+-----+--------------+----------------------------------');
    for (const sc of storyboard.scenes) {
      const words = sc.narration_script.trim().split(/\s+/).filter(Boolean).length;
      const numStr = sc.scene_number.toString().padStart(4, ' ');
      const winStr = `${sc.timestamp_start} - ${sc.timestamp_end}`.padEnd(13, ' ');
      const durStr = `${sc.duration_seconds}s`.padStart(3, ' ');
      const wordStr = `${words} words`.padStart(10, ' ');
      const camStr = sc.camera_direction.slice(0, 32);
      console.log(`${numStr}  | ${winStr} | ${durStr} | ${wordStr}   | ${camStr}`);
    }
    console.log('------+---------------+-----+--------------+----------------------------------');
    console.log(`Total Runtime: ${storyboard.total_duration} across ${storyboard.scenes.length} scenes (Every scene between 4s and 8s)\n`);

    console.log('🎉 [SUCCESS] Narrative storyboard generation completed successfully!');
  } catch (error: any) {
    console.error('\n❌ [ERROR] Pipeline failed:', error.message);
    process.exit(1);
  }
}

main();
