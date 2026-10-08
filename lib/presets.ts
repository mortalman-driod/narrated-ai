export interface NichePreset {
  id: string;
  name: string;
  category: 'faith' | 'sports' | 'psychology' | 'history_mystery' | 'horror_scifi' | 'viral';
  badge: string;
  description: string;
  defaultPacing: number; // Words Per Minute
  idealSceneDuration: number; // in seconds (between 4 and 8)
  toneRecommendation: string;
  promptDirective: string;
  visualKeywords: string;
  characterModelingDirective: string;
  iconName: string;
}

export const NICHE_CATEGORIES = [
  { id: 'all', label: 'All Niches' },
  { id: 'faith', label: '✝️ Faith & Scripture' },
  { id: 'sports', label: '⚽ Football & Sports' },
  { id: 'psychology', label: '🧠 Psychology & Mindset' },
  { id: 'history_mystery', label: '🏛️ Mysteries & Lost Worlds' },
  { id: 'horror_scifi', label: '🌑 Horror & Timelines' },
  { id: 'viral', label: '⚡ Viral & Pop Culture' }
];

export const NICHE_PRESETS: Record<string, NichePreset> = {
  // === FAITH, GOSPEL & CHRISTIAN HISTORY ===
  'bible-stories': {
    id: 'bible-stories',
    category: 'faith',
    name: 'Bible Stories & Scripture Wisdom',
    badge: '130 WPM • Majestic & Sacred',
    description: 'Cinematic Biblical narratives, life lessons from scripture, prophets, miracles, and covenants.',
    defaultPacing: 130,
    idealSceneDuration: 6.0,
    toneRecommendation: 'Sacred, reverent, inspirational, authoritative',
    promptDirective: `Style: Epic Biblical cinematic realism. Masterpiece renaissance lighting, golden volumetric light beams, ancient Middle Eastern stone and desert landscapes, authentic linen and coarse woven tunics, majestic historical reverence, dramatic chiaroscuro Caravaggio lighting.`,
    visualKeywords: 'Biblical epic, Caravaggio golden chiaroscuro, volumetric divine sunbeams, ancient Judean desert, hand-woven period robes, 35mm filmic realism, Arri Alexa LF cinema camera',
    characterModelingDirective: 'Ensure the Biblical figure has identical facial structure, beard texture, skin complexion, and traditional robes across every scene.',
    iconName: 'BookOpen'
  },
  'gospel-missionaries': {
    id: 'gospel-missionaries',
    category: 'faith',
    name: 'Gospel Missionaries & Revivalists',
    badge: '135 WPM • Passionate & Inspiring',
    description: 'Biographies of great revivalists (Finney, Whitefield, Wesley, Spurgeon) and fearless frontier missionaries.',
    defaultPacing: 135,
    idealSceneDuration: 5.5,
    toneRecommendation: 'Passionate, heartfelt, historically grounded, stirring',
    promptDirective: `Style: Historical 18th-19th century documentary portraiture. Moody gas-lamp or candlelight illumination, weathered wooden pulpits, rain-swept open-air tent revivals, damp frontier wilderness, authentic wool frock coats and worn leather Bibles.`,
    visualKeywords: '19th century revivalist oil painting aesthetic, flickering candlelight, crowded wooden chapel, authentic Victorian missionary attire, sepia-toned filmic depth, high emotional drama',
    characterModelingDirective: 'Maintain consistent facial bone structure, signature hairstyle/spectacles, and distinctive preacher frock coat or traveling cloak in every scene.',
    iconName: 'Flame'
  },
  'ancient-christian-history': {
    id: 'ancient-christian-history',
    category: 'faith',
    name: 'Ancient Christian History & Martyrs',
    badge: '130 WPM • Solemn & Triumphant',
    description: 'The Early Church, Roman catacombs, desert fathers, martyrs, and the endurance of faith.',
    defaultPacing: 130,
    idealSceneDuration: 6.0,
    toneRecommendation: 'Solemn, defiant, historically precise, triumphant',
    promptDirective: `Style: Ancient Roman & Byzantine cinematic realism. Torch-lit Roman catacombs, subterranean limestone arches, colosseum sand, weathered parchment scrolls, Roman armor, and humble tunic drapery.`,
    visualKeywords: 'torchlight illumination, subterranean Roman catacombs, ancient limestone textures, authentic early Christian frescoes, dramatic shadows, moody 35mm cinematic film',
    characterModelingDirective: 'Preserve exact facial features, battle scars or weathered skin, and specific humble tunic/cross medallion across all historical scenes.',
    iconName: 'Cross'
  },

  // === SPORTS & FOOTBALL (SOCCER) ===
  'football-history': {
    id: 'football-history',
    category: 'sports',
    name: 'Football (Soccer) Histories & Legends',
    badge: '145 WPM • Dramatic & Iconic',
    description: 'Legendary World Cup moments, iconic rivalries, historic comebacks, and golden generation lore.',
    defaultPacing: 145,
    idealSceneDuration: 5.0,
    toneRecommendation: 'Passionate, epic, energetic, nostalgic',
    promptDirective: `Style: Dynamic sports broadcast and cinematic stadium realism. Stadium floodlights cutting through night mist, roaring stadium crowd bokeh, turf kicked into the air, iconic vintage/modern kits, slow-motion athletic tension, rain drenched pitch.`,
    visualKeywords: 'intense stadium floodlights, night match atmospheric haze, turf particles in air, authentic football kit texture, high speed sports camera, 4k ultra realism, cinematic color grading',
    characterModelingDirective: 'Ensure the football player maintains identical facial features, signature boots, kit number, and jersey colors across all angles.',
    iconName: 'Trophy'
  },
  'sports-analysis': {
    id: 'sports-analysis',
    category: 'sports',
    name: 'Sports Analysis, News & Fantasy',
    badge: '150 WPM • Analytical & Fast',
    description: 'Tactical breakdowns, transfer window sagas, fantasy predictions, and analytical deep dives.',
    defaultPacing: 150,
    idealSceneDuration: 5.0,
    toneRecommendation: 'Analytical, authoritative, fast-paced, engaging',
    promptDirective: `Style: Modern high-end tactical sports studio and on-pitch telephoto photography. Tactical pitch diagrams overlaid with holographic lines, high-contrast dugout portraits, intense manager reactions, stadium sidelines.`,
    visualKeywords: 'telephoto 400mm lens, dugout sideline lighting, tactical pitch markers, intense athlete expression, broadcast depth of field, sharp modern color grading',
    characterModelingDirective: 'Keep the manager or athlete wearing the exact same suit or club training gear with consistent physical appearance.',
    iconName: 'Activity'
  },

  // === PSYCHOLOGY & MOTIVATION ===
  'human-psychology': {
    id: 'human-psychology',
    category: 'psychology',
    name: 'Human Psychology & Behavioral Science',
    badge: '135 WPM • Introspective & Deep',
    description: 'Cognitive biases, the unconscious mind, body language, psychological experiments, and brain science.',
    defaultPacing: 135,
    idealSceneDuration: 5.5,
    toneRecommendation: 'Intriguing, psychological, clinical yet accessible',
    promptDirective: `Style: Conceptual psychological thriller and cerebral cinema (Inception, Mindhunter style). Symmetrical framing, moody cool-toned color grade, mirrors and reflections, neural synapses visualized in ambient darkness, striking metaphorical visual illusions.`,
    visualKeywords: 'cinematic psychology, high contrast cool slate and amber lighting, conceptual visual metaphor, 50mm portrait lens, clean minimalist architectural framing, deep atmospheric tension',
    characterModelingDirective: 'Keep the subject in a consistent tailored minimalist outfit, with constant facial features and subtle expressive eye gaze.',
    iconName: 'Brain'
  },
  'motivational-mindset': {
    id: 'motivational-mindset',
    category: 'psychology',
    name: 'Motivational, Discipline & Performance',
    badge: '140 WPM • Inspiring & Hard-Hitting',
    description: 'Stoicism, relentless discipline, overcoming devastating adversity, peak physical and mental drive.',
    defaultPacing: 140,
    idealSceneDuration: 5.0,
    toneRecommendation: 'Commanding, raw, motivating, uncompromising',
    promptDirective: `Style: Gritty high-contrast cinematic realism (Creed, Nike commercial aesthetic). Sweat glistening under raw warehouse lights, dawn fog during solo training, intense eye contact with camera, monochrome shadows with warm golden accents, visceral physical grit.`,
    visualKeywords: 'gritty cinematic lighting, sweat droplets in slow motion, dark athletic gym background, dramatic dawn rim light, 35mm film texture, high emotional intensity',
    characterModelingDirective: 'Maintain the exact same protagonist build, facial stubble, athletic gear, and focused expression in every scene.',
    iconName: 'Target'
  },

  // === MYSTERIES, ANCIENT STORIES & LOST WORLDS ===
  'ancient-mysteries': {
    id: 'ancient-mysteries',
    category: 'history_mystery',
    name: 'Ancient Stories & Lost Worlds',
    badge: '130 WPM • Mysterious & Grand',
    description: 'Atlantis, Sumerian myths, lost Amazonian megaliths, forbidden archaeology, and ancient enigmas.',
    defaultPacing: 130,
    idealSceneDuration: 6.0,
    toneRecommendation: 'Enigmatic, breathtaking, investigative, haunting',
    promptDirective: `Style: Breathtaking archaeological mystery and lost world exploration. Sunken cyclopean ruins, overgrown jungle ziggurats, dust motes dancing in shaft of torchlight, enigmatic gold relics, bioluminescent underwater caverns, misty mountain plateaus.`,
    visualKeywords: 'cyclopean ancient masonry, overgrown jungle monoliths, volumetric torchlight, lost civilization architecture, 35mm cinematic realism, atmospheric haze, epic wide-angle lens',
    characterModelingDirective: 'Keep the lead explorer with identical khaki expedition tunic, leather satchel, weathered fedora, and facial features throughout.',
    iconName: 'Landmark'
  },
  'forgotten-mysteries': {
    id: 'forgotten-mysteries',
    category: 'history_mystery',
    name: 'Forgotten Mysteries & Unexplained',
    badge: '135 WPM • Chilling & Suspenseful',
    description: 'Ghost ships, vanished expeditions, Bermuda Triangle phenomena, and unsolvable historical riddles.',
    defaultPacing: 135,
    idealSceneDuration: 5.5,
    toneRecommendation: 'Suspenseful, eerie, dramatic, investigative',
    promptDirective: `Style: Chilling atmospheric mystery and investigative documentary. Fog-draped oceans, abandoned compass needles spinning wild, empty derelict cabins with forgotten logs, eerie twilight storm clouds, mysterious radar silhouettes.`,
    visualKeywords: 'eerie oceanic fog, derelict vintage vessel, atmospheric twilight, chilling shadows, vintage 1940s navigation instruments, high suspense cinematography',
    characterModelingDirective: 'Ensure recurring crew or investigator maintains period-accurate uniform and consistent anxious demeanor.',
    iconName: 'HelpCircle'
  },
  'historical-documentary': {
    id: 'historical-documentary',
    category: 'history_mystery',
    name: 'Historical Documentary',
    badge: '130 WPM • Authoritative',
    description: 'Grand historical narratives, pivotal battles, empires, and monumental human events.',
    defaultPacing: 130,
    idealSceneDuration: 6.0,
    toneRecommendation: 'Authoritative, resonant, dramatic, reflective',
    promptDirective: `Style: Prestige cinematic documentary. Archival authenticity, period-accurate garments, volumetric morning sunlight, oil painting textural depth, epic wide vistas, Arri Alexa LF cinema framing.`,
    visualKeywords: 'Arri Alexa LF, 35mm anamorphic photography, volumetric sunbeams, authentic museum period textures, warm sepia and earthen palette, cinematic depth of field',
    characterModelingDirective: 'Keep historical figure attire, insignia, facial likeness, and posture strictly uniform.',
    iconName: 'Scroll'
  },

  // === HORROR & TIMELINES ===
  'horror-supernatural': {
    id: 'horror-supernatural',
    category: 'horror_scifi',
    name: 'Psychological Horror & Supernatural',
    badge: '125 WPM • Terrifying & Atmospheric',
    description: 'Cosmic dread, abandoned facilities, eerie urban legends, cryptids, and haunting night encounters.',
    defaultPacing: 125,
    idealSceneDuration: 6.0,
    toneRecommendation: 'Bleak, dread-inducing, visceral, claustrophobic',
    promptDirective: `Style: Grimy analog psychological horror (Hereditary, The Witch style). Searing flashlight beams through pitch-black mist, decaying wallpaper, uncanny peripheral silhouettes, muted sickly greens and deep pitch blacks, film grain, claustrophobic framing.`,
    visualKeywords: 'claustrophobic framing, sickly greenish shadow tones, flashlight cutting dense fog, analog VHS grain, disturbing uncanny shadows, high suspense',
    characterModelingDirective: 'Maintain identical pale, terror-stricken protagonist with specific jacket and messy disheveled hair in all horror scenes.',
    iconName: 'Ghost'
  },
  'time-travel-timelines': {
    id: 'time-travel-timelines',
    category: 'horror_scifi',
    name: 'Alternate Timelines & Time Travel',
    badge: '140 WPM • Mind-Bending',
    description: 'What-if historical divergences, temporal anomalies, dystopian futures, and time loop paradoxes.',
    defaultPacing: 140,
    idealSceneDuration: 5.5,
    toneRecommendation: 'Mind-bending, urgent, philosophical, cinematic',
    promptDirective: `Style: Temporal sci-fi and alternate timeline cinema (Tenet, Dark, Interstellar aesthetic). Time dilation distortion effects, holographic chronometer readouts, brutalist clocktowers in surreal landscapes, golden hour colliding with stormy twilight.`,
    visualKeywords: 'time dilation visual distortion, brutalist clock tower, split temporal lighting, anamorphic lens flares, cinematic science fiction, high conceptual depth',
    characterModelingDirective: 'Ensure the time traveler wears the exact same futuristic chronometer wristwatch, dark trench coat, and distinctive facial features.',
    iconName: 'Clock'
  },

  // === VIRAL & POP CULTURE ===
  'brainrot-hyper': {
    id: 'brainrot-hyper',
    category: 'viral',
    name: 'Brainrot / Hyper-Shorts',
    badge: '175 WPM • Fast Cuts',
    description: 'Ultra-high stimulation, chaotic Gen-Z hooks, sensory overload, surreal viral memes.',
    defaultPacing: 175,
    idealSceneDuration: 4.5,
    toneRecommendation: 'Humorous, hyperactive, erratic, satirical',
    promptDirective: `Style: Hyper-saturated surreal viral aesthetic. Wildly exaggerated 3D visuals, distorted fisheye lens, intense chromatic aberration, neon glows, vibrant colors, frantic energy. Keep scenes punchy, shocking, and visually absurd.`,
    visualKeywords: 'fisheye lens, ultra-vibrant neon palette, chromatic aberration, 3D blender render, chaotic surrealism, high dopamine visual, dynamic angle',
    characterModelingDirective: 'Keep the surreal mascot or influencer wearing identical stylized 3D sunglasses and neon hoodie across all cuts.',
    iconName: 'Zap'
  },
  'true-crime': {
    id: 'true-crime',
    category: 'viral',
    name: 'True Crime / Unsolved',
    badge: '135 WPM • Suspenseful',
    description: 'Chilling mysteries, forensic evidence, cold case files, psychological tension.',
    defaultPacing: 135,
    idealSceneDuration: 5.5,
    toneRecommendation: 'Bleak, investigative, solemn, chilling',
    promptDirective: `Style: Moody neo-noir crime thriller. Low-key chiaroscuro lighting, desaturated colors, police evidence aesthetics, rain-slicked asphalt, flickering streetlights, dimly lit archives, shadows concealing identities.`,
    visualKeywords: 'chiaroscuro shadows, 35mm gritty film stock, muted cold slate and crimson tones, foggy interrogation atmosphere, anamorphic lens, forensic detail',
    characterModelingDirective: 'Maintain the detective’s worn trench coat, fedora, and weary facial features across all scenes.',
    iconName: 'ShieldAlert'
  },
  'first-person-pov': {
    id: 'first-person-pov',
    category: 'viral',
    name: 'First-Person POV',
    badge: '145 WPM • Immersive',
    description: 'Personal confessions, thrilling survival stories, interactive "You" perspective.',
    defaultPacing: 145,
    idealSceneDuration: 5.0,
    toneRecommendation: 'First-person POV, urgent, confessional, intimate',
    promptDirective: `Style: Immersive first-person viewpoint (POV). GoPro headcam or chest-mount angle, visible hands interacting with surroundings, natural breathing camera shake, eye-level framing, immediate visceral danger.`,
    visualKeywords: 'first-person POV angle, GoPro 4k lens, visible hands in foreground, immersive wide field of view, realistic motion blur, authentic live-action perspective',
    characterModelingDirective: 'Ensure foreground hands wear identical weathered gloves, watch on left wrist, and sleeve fabric.',
    iconName: 'Eye'
  },
  'anime-recaps': {
    id: 'anime-recaps',
    category: 'viral',
    name: 'Anime Recaps & Lore',
    badge: '155 WPM • High Energy',
    description: 'High-octane power scaling, mythological lore breakdowns, and chapter recaps.',
    defaultPacing: 155,
    idealSceneDuration: 5.0,
    toneRecommendation: 'Energetic, dramatic, analytical, hype',
    promptDirective: `Style: Modern high-budget anime cinematics (Ufotable, MAPPA style). Dynamic action perspective lines, glowing ethereal aura particles, razor-sharp cel-shading, dramatic lighting contrast, vibrant magical energy.`,
    visualKeywords: 'modern high-budget anime style, Ufotable lighting, intense aura particles, sharp cel shading, dynamic anime perspective lines, vibrant saturated neon effects',
    characterModelingDirective: 'Keep anime protagonist hair color, eye shape, outfit detailing, and weapon signature consistent across all angles.',
    iconName: 'Flame'
  },
  'cartoon-satire': {
    id: 'cartoon-satire',
    category: 'viral',
    name: 'Cartoon / Satire',
    badge: '150 WPM • Punchy Comic',
    description: 'Satirical social commentary, witty animated sketches, and dark comedy.',
    defaultPacing: 150,
    idealSceneDuration: 5.0,
    toneRecommendation: 'Humorous, witty, sarcastic, animated',
    promptDirective: `Style: Expressive stylized 3D animation (Pixar/Spider-Verse comic hybrid). Exaggerated comedic expressions, bold halftone textures, punchy rim lighting, vivid stylized color palettes.`,
    visualKeywords: 'stylized 3D animation, comic book halftone textures, exaggerated facial expressions, bold vibrant color blocking, playful cinematic lighting',
    characterModelingDirective: 'Preserve the stylized character caricature proportions, facial features, and signature outfit.',
    iconName: 'Smile'
  },
  'custom-open': {
    id: 'custom-open',
    category: 'viral',
    name: 'Custom / Open',
    badge: '140 WPM • Flexible',
    description: 'Tailor any premise across any genre, pacing, or aesthetic.',
    defaultPacing: 140,
    idealSceneDuration: 6.0,
    toneRecommendation: 'Versatile',
    promptDirective: `Style: Cinematic visual realism with expressive lighting, crisp focal depth, and strong environmental atmosphere.`,
    visualKeywords: 'cinematic lighting, photorealistic textures, shallow depth of field, 8k resolution, filmic color grading',
    characterModelingDirective: 'Maintain consistent protagonist visual anchors across all scenes.',
    iconName: 'Sliders'
  }
};

export const TONE_OPTIONS = [
  { id: 'authoritative', label: 'Authoritative', desc: 'Commanding, investigative, objective tone' },
  { id: 'first_person', label: 'First-Person POV', desc: 'Direct, personal, visceral "I/You" storytelling' },
  { id: 'third_person', label: 'Third-Person Narrator', desc: 'Classic cinematic documentary storyteller' },
  { id: 'humorous', label: 'Humorous & Witty', desc: 'Sarcastic, punchy, high-energy comedic timing' },
  { id: 'bleak', label: 'Bleak & Ominous', desc: 'Dark, tense, psychological suspense' }
];

export const IMAGE_MODELS = [
  {
    id: 'flux',
    name: 'Flux.1 (Dev/Schnell)',
    desc: 'Best for intricate textures, precise natural language, photorealism',
    formatter: (prompt: string) => `${prompt}, photorealistic 8k, authentic textures, Arri Alexa LF cinematic rendering, neutral natural lighting`
  },
  {
    id: 'midjourney',
    name: 'Midjourney v6',
    desc: 'Cinematic compositions, dramatic lighting, artistic color grading',
    formatter: (prompt: string) => `${prompt} --ar 16:9 --style raw --v 6.0`
  },
  {
    id: 'runway',
    name: 'Runway Gen-3 Alpha',
    desc: 'Text-to-video with explicit camera movement and physics cues',
    formatter: (prompt: string, camera: string) => `[Camera motion: ${camera}], high production value, fluid cinematic motion, 4k: ${prompt}`
  }
];

export const DURATION_PRESETS = [
  { label: '30s', seconds: 30, desc: 'TikTok / YouTube Short Hook' },
  { label: '60s', seconds: 60, desc: 'Standard Viral Short' },
  { label: '8m', seconds: 480, desc: 'YouTube Mid-Form Video' },
  { label: '15m', seconds: 900, desc: 'Deep Dive Essay' },
  { label: '30m', seconds: 1800, desc: 'Feature Narrative Episode' },
  { label: '60m', seconds: 3600, desc: 'Hour-Long Documentary' },
  { label: '120m', seconds: 7200, desc: 'Full 2-Hour Epic Audio Film' }
];
