import fs from 'fs';
import path from 'path';
import { StoryboardOutput } from './narrativeEngine';

/**
 * Exports the structured Storyboard to a readable, production-ready Markdown document
 */
export function exportStoryboardToMarkdown(
  storyboard: StoryboardOutput,
  outputPath: string,
  metadata?: { topic: string; pacing: number; style_preset: string }
): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines: string[] = [];

  // Header
  lines.push(`# 🎬 Storyboard: ${storyboard.title}`);
  lines.push('');
  lines.push(`> **Automated Narrative & Diffusion Prompt Storyboard**`);
  lines.push('');

  // Metadata Card
  lines.push('## 📋 Production Overview');
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| **Premise / Topic** | \`${metadata?.topic || storyboard.title}\` |`);
  lines.push(`| **Total Runtime** | \`${storyboard.total_duration}\` (${storyboard.scenes.reduce((acc, s) => acc + s.duration_seconds, 0)}s) |`);
  lines.push(`| **Scene Count** | \`${storyboard.scenes.length} scenes\` |`);
  lines.push(`| **Narration Pacing** | \`${metadata?.pacing || storyboard.pacing_wpm || 140} WPM\` |`);
  lines.push(`| **Visual Aesthetic** | \`${metadata?.style_preset || storyboard.style_preset || 'Cinematic Realism'}\` |`);
  lines.push(`| **Target Generators** | \`Flux.1 Dev / Schnell\`, \`Midjourney v6\` |`);
  lines.push('');

  // Quick Reference Table
  lines.push('## ⏱️ Timeline & Scene Index');
  lines.push('');
  lines.push('| # | Window | Dur | Camera Direction | Narration Excerpt |');
  lines.push('| :---: | :---: | :---: | :--- | :--- |');

  for (const scene of storyboard.scenes) {
    const excerpt = scene.narration_script.length > 55
      ? scene.narration_script.slice(0, 52) + '...'
      : scene.narration_script;
    lines.push(
      `| **${scene.scene_number}** | \`${scene.timestamp_start} - ${scene.timestamp_end}\` | \`${scene.duration_seconds}s\` | *${scene.camera_direction}* | "${excerpt}" |`
    );
  }
  lines.push('');

  // Scene-by-Scene Detailed Breakdown
  lines.push('---');
  lines.push('## 🎥 Detailed Scene Breakdown');
  lines.push('');

  for (const scene of storyboard.scenes) {
    const wordCount = scene.narration_script.trim().split(/\s+/).filter(Boolean).length;

    lines.push(`### Scene ${scene.scene_number.toString().padStart(2, '0')} \`[${scene.timestamp_start} ➔ ${scene.timestamp_end}]\` (${scene.duration_seconds}s)`);
    lines.push('');
    lines.push(`- **Camera Motion**: \`${scene.camera_direction}\``);
    lines.push(`- **Word Count**: \`${wordCount} words\` (~${(wordCount / scene.duration_seconds * 60).toFixed(0)} WPM)`);
    lines.push('');
    lines.push('#### 🎙️ Narration Script:');
    lines.push(`> "${scene.narration_script}"`);
    lines.push('');
    lines.push('#### 🎨 Diffusion Model Prompt (Flux / Midjourney):');
    lines.push('```text');
    lines.push(scene.visual_prompt);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Footer notes
  lines.push('### 💡 Prompt Usage Tips:');
  lines.push('- **For Midjourney v6**: Append `--ar 16:9 --style raw --v 6.0` (or `--ar 9:16` for vertical shorts).');
  lines.push('- **For Flux.1**: Use with guidance scale 3.5, 28-35 steps for optimal lighting and photorealistic detail.');
  lines.push('');

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}
