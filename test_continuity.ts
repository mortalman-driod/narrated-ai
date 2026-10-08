import { runMockGenerationPipeline, verifyTimestampContinuity } from './lib/generator/mockPipeline';

console.log('========================================================');
console.log('       MULTI-PART TIMESTAMP CONTINUITY VERIFICATION     ');
console.log('========================================================\n');

const testCases = [
  { name: '30s Viral Short (Brainrot)', seconds: 30, niche: 'brainrot-hyper', tone: 'humorous' },
  { name: '60s Short (True Crime)', seconds: 60, niche: 'true-crime', tone: 'bleak' },
  { name: '15m Deep Dive (Historical Doc)', seconds: 900, niche: 'historical-documentary', tone: 'authoritative' },
  { name: '60m Long-Form (Anime Lore)', seconds: 3600, niche: 'anime-recaps', tone: 'energetic' },
  { name: '120m 2-Hour Epic Audio Film', seconds: 7200, niche: 'custom-open', tone: 'authoritative' }
];

let allPassed = true;

for (const tc of testCases) {
  console.log(`\n▶ Testing: ${tc.name} (${tc.seconds} seconds)...`);
  const result = runMockGenerationPipeline({
    topic: tc.name,
    target_duration_seconds: tc.seconds,
    niche: tc.niche,
    tone: tc.tone,
    image_model: 'flux'
  });

  const check = verifyTimestampContinuity(result.scenes);

  if (check.valid) {
    console.log(`  ✅ PASSED: ${result.total_scenes} scenes generated.`);
    console.log(`     Total Duration: ${result.total_duration}`);
    console.log(`     Scene 1: ${result.scenes[0].timestamp_start} -> ${result.scenes[0].timestamp_end} (${result.scenes[0].duration_seconds}s)`);
    const lastScene = result.scenes[result.scenes.length - 1];
    console.log(`     Scene ${result.total_scenes}: ${lastScene.timestamp_start} -> ${lastScene.timestamp_end} (${lastScene.duration_seconds}s)`);
    console.log(`     Every scene strictly in [4s, 8s]. Continuity 100% verified.`);
  } else {
    console.error(`  ❌ FAILED with errors:`, check.errors.slice(0, 5));
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n🎉 ALL 5 TEST CASES PASSED! Continuous timestamp calculation verified across 30s to 2 hours.');
} else {
  console.error('\n❌ SOME TEST CASES FAILED.');
  process.exit(1);
}
