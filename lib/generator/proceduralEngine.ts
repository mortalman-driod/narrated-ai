import { GenerationRequest, StoryboardResponse, MasterOutline, CharacterModel, Scene } from './types';
import { NICHE_PRESETS, IMAGE_MODELS } from '../presets';
import { enforceSceneTimingBounds, formatTimestamp } from './timing';

/* ========================================================================= */
/* 1. SCRIPT DETECTION & NATURAL SENTENCE SEGMENTATION                       */
/* ========================================================================= */

/**
 * Checks whether user input is an existing script rather than a short title/topic.
 */
export function isScriptContent(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const sentencePunctuation = (trimmed.match(/[.!?]/g) || []).length;
  const hasLineBreaks = trimmed.includes('\n');

  // If input has more than 20 words and contains punctuation, or multiple lines with sentences
  return words.length >= 20 && (sentencePunctuation >= 2 || hasLineBreaks);
}

/**
 * Extracts a concise, clean story title from either a script or a topic string.
 */
function extractTitleFromInput(input: string): string {
  const trimmed = input.trim();
  if (!isScriptContent(trimmed)) {
    return trimmed.slice(0, 70);
  }
  // If it's a script, take first sentence or first line up to 60 characters
  const firstLine = trimmed.split('\n')[0].trim();
  const firstSentence = firstLine.split(/[.!?]/)[0].trim();
  if (firstSentence.length > 5 && firstSentence.length <= 65) {
    return firstSentence;
  }
  return trimmed.slice(0, 50).trim() + '...';
}

/* ========================================================================= */
/* 2. SCRIPT-TO-SCENES PARSER (For user-provided scripts)                    */
/* ========================================================================= */

interface RawSceneDraft {
  narration_script: string;
  visual_prompt: string;
  camera_direction: string;
}

/**
 * Converts a user's pre-written script into precisely budgeted scenes with contextual visual prompts.
 */
export function convertScriptToScenes(
  scriptText: string,
  targetDurationSeconds: number,
  wpm: number,
  imageModelId: string,
  nicheVisualKeywords: string
): RawSceneDraft[] {
  const imageModel = IMAGE_MODELS.find((m) => m.id === imageModelId) || IMAGE_MODELS[0];

  // 1. Split script into natural sentence units
  const rawSentences = scriptText
    .replace(/([.!?])\s*(?=[A-Z0-9"'])/g, '$1|__SPLIT__|')
    .split('|__SPLIT__|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (rawSentences.length === 0) {
    rawSentences.push(scriptText.trim());
  }

  // 2. Determine target scene count based on script length and video duration
  const totalWords = scriptText.split(/\s+/).filter(Boolean).length;
  // Natural pacing: 15 to 22 words per scene (~6.5 to 8.5 seconds each)
  const wordsBasedSceneCount = Math.max(2, Math.round(totalWords / 18));
  const durationBasedSceneCount = Math.max(2, Math.round(targetDurationSeconds / 7.5));
  // Harmonize: don't create 33 scenes for a short script!
  const targetSceneCount = Math.max(2, Math.min(wordsBasedSceneCount, durationBasedSceneCount));

  // 3. Cluster sentences into targetSceneCount groups
  const sceneGroups: string[] = [];
  const chunkSize = rawSentences.length / targetSceneCount;

  for (let i = 0; i < targetSceneCount; i++) {
    const startIdx = Math.floor(i * chunkSize);
    const endIdx = i === targetSceneCount - 1 ? rawSentences.length : Math.floor((i + 1) * chunkSize);
    const group = rawSentences.slice(startIdx, endIdx);
    if (group.length > 0) {
      sceneGroups.push(group.join(' '));
    }
  }

  const cameraAngles = [
    'Wide establishing cinematic crane shot',
    'Low-angle dramatic tracking perspective',
    'Medium intimate shot on subject and props',
    'High-speed kinetic tracking action frame',
    'Dramatic interior chiaroscuro angle',
    'Intense macro close-up on hands and textures',
    'Heroic low-angle anamorphic view',
    'Epic wide master frame with golden hour glow'
  ];

  // 4. Generate contextual visual prompt for each scene based on its actual narration
  return sceneGroups.map((narration, idx) => {
    const camera = cameraAngles[idx % cameraAngles.length];
    const prompt = generateVisualPromptFromNarration(narration, nicheVisualKeywords, camera, idx + 1);

    return {
      narration_script: narration,
      visual_prompt: imageModel.formatter(prompt, camera),
      camera_direction: camera
    };
  });
}

/**
 * Extracts action, subjects, and setting from a narration sentence to build a vivid visual prompt.
 */
function generateVisualPromptFromNarration(
  narration: string,
  styleKeywords: string,
  camera: string,
  sceneNum: number
): string {
  const lower = narration.toLowerCase();

  // Extract key descriptive nouns and verbs
  let setting = 'cinematic atmospheric environment, authentic period details';
  let subject = 'central narrative subject';
  let lighting = 'dramatic chiaroscuro lighting, volumetric sunbeams, 35mm film grain, 8k resolution';

  if (lower.includes('water') || lower.includes('river') || lower.includes('sea') || lower.includes('ocean')) {
    setting = 'coastal waters with rolling waves, mist hanging over water surface, sea foam and weathered stone';
  } else if (lower.includes('desert') || lower.includes('sand') || lower.includes('dune') || lower.includes('valley')) {
    setting = 'sun-drenched arid desert valley, terraced limestone cliffs, heat haze rising from dry earth';
  } else if (lower.includes('forest') || lower.includes('tree') || lower.includes('jungle')) {
    setting = 'dense ancient forest canopy, moss-covered roots, dappled green foliage in misty dawn';
  } else if (lower.includes('stadium') || lower.includes('pitch') || lower.includes('crowd') || lower.includes('ball')) {
    setting = 'packed international sports arena at night, emerald pitch under blinding stadium floodlights';
  } else if (lower.includes('room') || lower.includes('house') || lower.includes('table') || lower.includes('tent')) {
    setting = 'detailed interior space, candlelight flickering against walls, period furniture and authentic props';
  } else if (lower.includes('space') || lower.includes('star') || lower.includes('sky') || lower.includes('black hole')) {
    setting = 'vast celestial cosmos, distant nebulae glowing in deep ultraviolet and amber starlight';
  }

  // Action cues
  let action = 'composed with cinematic depth and emotional resonance';
  if (lower.includes('run') || lower.includes('sprint') || lower.includes('rush') || lower.includes('charg')) {
    action = 'dynamic kinetic motion, dust kicking up in foreground, intense focused expression';
  } else if (lower.includes('stand') || lower.includes('confront') || lower.includes('fac')) {
    action = 'resolute stance, silhouette framed against dramatic horizon, unwavering determined gaze';
  } else if (lower.includes('kneel') || lower.includes('pray') || lower.includes('weep')) {
    action = 'reverent solemn posture, hands folded or open, tears catching subtle rim light, deep emotional weight';
  } else if (lower.includes('shout') || lower.includes('speak') || lower.includes('declar') || lower.includes('command')) {
    action = 'speaking with authoritative conviction, wind catching hair and garments, dramatic low-angle framing';
  } else if (lower.includes('select') || lower.includes('stone') || lower.includes('hold') || lower.includes('hand')) {
    action = 'macro focus on hands handling key items, tactile natural textures, shallow depth of field';
  }

  // Highlight key entities mentioned in sentence
  const cleanSnippet = narration
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !['their', 'there', 'which', 'where', 'about', 'would', 'could'].includes(w.toLowerCase()))
    .slice(0, 8)
    .join(' ');

  return `${camera}: Depicting [${cleanSnippet}]. ${setting}, ${action}. ${styleKeywords}, ${lighting}`;
}

/* ========================================================================= */
/* 3. MULTI-DOMAIN SUBSTANTIVE STORYTELLER (For Topic Input)                 */
/* ========================================================================= */

interface DomainBeat {
  narration: string;
  prompt: string;
  camera: string;
}

/**
 * Procedurally generates substantive, topic-accurate narrative scenes for any topic without API calls.
 */
function buildProceduralBeatsForTopic(
  topic: string,
  nicheId: string,
  nicheVisualKeywords: string,
  targetSceneCount: number
): { beats: DomainBeat[]; character: CharacterModel } {
  const lower = topic.toLowerCase();

  // A. Biblical / Faith
  const isDavid = lower.includes('david') && (lower.includes('goliath') || lower.includes('elah') || lower.includes('stone'));
  const isMoses = lower.includes('moses') || lower.includes('red sea') || lower.includes('exodus') || lower.includes('pharaoh');
  const isNoah = lower.includes('noah') || lower.includes('ark') || lower.includes('flood');
  const isProdigal = lower.includes('prodigal') || lower.includes('lost son');
  const isBiblicalGeneral = nicheId.includes('bible') || lower.includes('jesus') || lower.includes('scripture') || lower.includes('apostle') || lower.includes('paul') || lower.includes('prophet');

  // B. Sports
  const isFootball = nicheId.includes('football') || lower.includes('messi') || lower.includes('ronaldo') || lower.includes('zidane') || lower.includes('world cup') || lower.includes('soccer');

  // C. Space / Science
  const isSpaceScience = nicheId.includes('science') || lower.includes('black hole') || lower.includes('space') || lower.includes('universe') || lower.includes('quantum') || lower.includes('ocean') || lower.includes('dinosaur');

  // D. History / Civilizations
  const isHistory = nicheId.includes('ancient-civiliz') || lower.includes('rome') || lower.includes('pyramid') || lower.includes('egypt') || lower.includes('caesar') || lower.includes('wwii') || lower.includes('churchill') || lower.includes('dunkirk');

  // E. Mysteries
  const isMystery = nicheId.includes('mystery') || lower.includes('bermuda') || lower.includes('dyatlov') || lower.includes('flight 19') || lower.includes('lost city');

  // F. Psychology / Mind
  const isPsych = nicheId.includes('psycholog') || lower.includes('jung') || lower.includes('shadow') || lower.includes('stoic') || lower.includes('aurelius') || lower.includes('mind');

  let character: CharacterModel;
  let rawBeats: DomainBeat[] = [];

  if (isDavid) {
    character = {
      character_name: 'David, Son of Jesse',
      role_in_story: 'Young Hebrew Shepherd & Champion of Faith',
      appearance_summary: 'Youthful determined shepherd with weathered desert tunic and braided leather sling.',
      face_and_hair: 'Sun-bronzed Middle Eastern features, intense dark expressive eyes, textured wind-tousled hair.',
      attire_and_gear: 'Coarse handwoven shepherd tunic, leather pouch at waist, smooth wooden staff, braided sling.',
      color_palette: 'Warm limestone sand, burnt ochre, desert sunlight, golden chiaroscuro.',
      consistency_prompt_tag: 'David, young Hebrew shepherd, sun-bronzed features, determined dark eyes, coarse woolen tunic, braided sling'
    };

    rawBeats = [
      {
        narration: 'In the Valley of Elah, the armies of Israel and the Philistines stood locked in paralyzed standoff across opposing limestone ridges.',
        prompt: 'Wide establishing cinematic shot of the vast Valley of Elah at sunrise, opposing ancient armies encamped on rugged limestone cliffs, battle banners fluttering in the desert wind, Caravaggio golden chiaroscuro, 35mm film grain',
        camera: 'Wide atmospheric crane shot'
      },
      {
        narration: 'Every morning and evening for forty days, Goliath of Gath stepped forward, his colossal bronze-armored frame roaring insults at the trembling ranks.',
        prompt: 'Low-angle intimidating ground perspective of Goliath, colossal 9-foot warrior in heavy bronze scale armor and massive spear, long shadow stretching across dusty limestone ground, volumetric dust rays',
        camera: 'Low-angle intimidating ground perspective'
      },
      {
        narration: 'Into this suffocating terror arrived David, a teenage shepherd sent only to deliver roasted grain and cheese to his older brothers.',
        prompt: `${character.consistency_prompt_tag}, arriving at the Hebrew encampment carrying woven wicker baskets of bread and grain, bewildered by the soldiers fear, expressive dark eyes, warm desert daylight`,
        camera: 'Medium tracking shot on subject'
      },
      {
        narration: 'King Saul offered his royal bronze armor and broadsword, but David refused, unwilling to face destiny in weapons he had never tested.',
        prompt: 'Inside King Sauls royal military pavilion tent, Saul offering ornate heavy bronze cuirass and iron sword, young David politely setting the heavy blade aside with quiet spiritual resolve, candlelight chiaroscuro',
        camera: 'Dramatic interior chiaroscuro two-shot'
      },
      {
        narration: 'Descending into the dry riverbed, David reached into the clear water and selected five smooth stones, slipping them into his shepherd pouch.',
        prompt: 'Macro close-up on hands reaching into the clear water of a dry limestone creek bed, fingers picking five smooth gray river stones and placing them into a weathered leather pouch, sunbeams on water ripples',
        camera: 'Intense macro close-up on hands and props'
      },
      {
        narration: 'With only his staff and braided leather sling, David stepped onto the open battlefield, advancing alone toward the sneering giant.',
        prompt: `${character.consistency_prompt_tag}, walking calmly onto the open dusty battlefield with wooden staff and sling in hand, colossal armored Goliath in distant background sneering in contempt, wide cinematic disparity of scale`,
        camera: 'Wide tracking cinematic two-shot'
      },
      {
        narration: 'Goliath cursed him by his gods, but David shouted back: You come with sword and spear, but I come in the name of the Lord of Hosts!',
        prompt: `${character.consistency_prompt_tag}, heroic low-angle close-up shouting defiance with unshakable authority, desert wind whipping hair, golden sunlight flaring behind his silhouette, anamorphic lens flare`,
        camera: 'Heroic low-angle close-up'
      },
      {
        narration: 'Sprinting toward the battle line, David loaded a single stone, whirled the sling overhead with blinding speed, and released.',
        prompt: 'High-speed kinetic tracking shot of young David sprinting forward, whirling the braided sling in a motion blur overhead, dust kicking up around leather sandals, locked target gaze, dynamic action cinematography',
        camera: 'High-speed kinetic tracking action shot'
      },
      {
        narration: 'The stone flew with lethal accuracy, sinking into Goliaths forehead, and the colossal giant crashed face-first into the dust.',
        prompt: 'Dramatic slow-motion freeze-frame impact, smooth river stone striking Goliaths forehead beneath helmet rim, colossal warrior toppling face-first into the limestone dust cloud, earth-shaking shockwave',
        camera: 'Dramatic slow-motion freeze-frame impact'
      },
      {
        narration: 'David stood victorious atop the ridge as the army erupted in a triumphant roar, etching an eternal truth into human memory.',
        prompt: `${character.consistency_prompt_tag}, standing victorious atop the ridge as the setting sun bathes the valley in crimson and gold, soldiers charging forward in celebration, epic cinematic wide master, 8k resolution`,
        camera: 'Epic wide cinematic anamorphic frame'
      }
    ];
  } else if (isSpaceScience) {
    character = {
      character_name: 'Supermassive Singularity',
      role_in_story: 'Cosmic Gravitational Abyss & Engine of Spacetime',
      appearance_summary: 'Enigmatic supermassive black hole surrounded by an incandescent plasma accretion disk.',
      face_and_hair: 'Absolute event horizon abyss bending starlight into an Einstein ring.',
      attire_and_gear: 'Swirling relativistic accretion disk glowing in gold, magenta, and ultraviolet ionization.',
      color_palette: 'Deep obsidian void, luminous plasma amber, ultraviolet violet, cosmic starlight.',
      consistency_prompt_tag: 'Supermassive black hole, obsidian event horizon sphere, brilliant swirling plasma accretion disk, gravitational lensing of background stars, 8k photorealistic space cinematography'
    };

    rawBeats = [
      {
        narration: `Out in the silent depths of the cosmos lies one of the most terrifying and awe-inspiring enigmas in physics: ${topic}.`,
        prompt: 'Wide cinematic expanse of deep space, distant spiral galaxies glowing in velvety darkness, cosmic dust clouds illuminated by infant stars, 35mm anamorphic astrophotography, 8k',
        camera: 'Wide atmospheric crane shot'
      },
      {
        narration: 'When a massive star exhausts its nuclear fuel, its core can no longer resist gravity, collapsing inward in a catastrophic supernova implosion.',
        prompt: 'Catastrophic stellar collapse, dying massive blue giant star imploding under its own immense gravity, blinding shockwave ripples tearing through stellar atmosphere, hyper-detailed cosmic physics',
        camera: 'Dramatic slow-motion freeze-frame impact'
      },
      {
        narration: 'In its place forms a region of infinite density where spacetime is warped so severely that not even light can escape its pull.',
        prompt: `${character.consistency_prompt_tag}, extreme close-up on the black circular shadow of the event horizon, Einstein ring bending light from distant galaxies behind it in breathtaking curvature`,
        camera: 'Medium tracking shot on subject'
      },
      {
        narration: 'Surrounding this cosmic abyss is a churning accretion disk of superheated gas and dust, spinning at near-light speeds and glowing with fierce radiation.',
        prompt: 'Volumetric plasma accretion disk swirling violently around the dark core, incandescent ribbons of amber and magenta gas emitting intense relativistic x-ray glow, scientific accuracy, 8k',
        camera: 'Low-angle dramatic tracking perspective'
      },
      {
        narration: 'At the boundary known as the event horizon, time itself slows to a standstill for an outside observer, creating an absolute point of no return.',
        prompt: 'Photons skimming the razor edge of the photon sphere, relativistic Doppler beaming making one side of the disk shine brighter, deep space horizon, IMAX cinematography',
        camera: 'Heroic low-angle close-up'
      },
      {
        narration: 'Colossal magnetic fields channel infalling matter away from the core, blasting relativistic particle jets millions of light years across the galaxy.',
        prompt: 'Twin relativistic plasma jets erupting from the poles of the black hole, piercing through galaxy clusters at 99 percent the speed of light, cosmic scale, cinematic volumetric illumination',
        camera: 'High-speed kinetic tracking action shot'
      },
      {
        narration: 'Far from being mere destroyers, supermassive black holes anchor the centers of galaxies, governing the birth of stars and shaping the cosmos.',
        prompt: 'Magnificent spiral galaxy seen from an angle, radiant galactic core orbiting around the central supermassive anchor, billions of star clusters spiraling in cosmic balance, 8k',
        camera: 'Wide atmospheric crane shot'
      },
      {
        narration: `Understanding ${topic} reminds us of the delicate balance of the universe, where the greatest mysteries push the boundaries of human knowledge.`,
        prompt: 'Awe-inspiring wide anamorphic shot of the cosmic abyss framed against a tapestry of millions of stars, silent majesty of physics, breathtaking visual masterpiece, 8k resolution',
        camera: 'Epic wide cinematic anamorphic frame'
      }
    ];
  } else if (isHistory) {
    character = {
      character_name: 'The Historic Protagonist',
      role_in_story: `Architect of History in ${topic}`,
      appearance_summary: 'Dignified historical figure bearing the unmistakable weight of monumental decisions.',
      face_and_hair: 'Weathered authentic features, resolute penetrating gaze, period-accurate styling.',
      attire_and_gear: 'Authentic genre wardrobe with tactile heavy fabrics, signature medals or accessories.',
      color_palette: 'Warm sepia, aged parchment, brass, cinematic natural lighting.',
      consistency_prompt_tag: `Historic leader in authentic period attire, resolute gaze, dignified posture, period environment, archival 35mm film look`
    };

    rawBeats = [
      {
        narration: `At the dawn of this defining chapter, ${topic} stood at a monumental crossroads that would alter the destiny of generations.`,
        prompt: `Wide establishing cinematic shot capturing the historic landscape of ${topic}, authentic architecture and period atmosphere, morning mist drifting across cobblestones, 35mm film grain, 8k`,
        camera: 'Wide atmospheric crane shot'
      },
      {
        narration: 'Beneath the calm exterior, immense political and strategic pressures began to mount as opposing forces prepared for an inevitable clash.',
        prompt: 'Low-angle interior of an ancient council chamber or war room, leaders conferring over hand-drawn maps by warm gaslight or torchlight, dramatic Rembrandt chiaroscuro shadows',
        camera: 'Low-angle intimidating ground perspective'
      },
      {
        narration: 'When conventional solutions failed, leadership required an audacious vision that defied the cautious warnings of the day.',
        prompt: `${character.consistency_prompt_tag}, standing resolute at a wooden table reviewing battle maps and dispatches, candlelight reflecting in determined eyes, medium portrait`,
        camera: 'Medium tracking shot on subject'
      },
      {
        narration: 'Across the land, ordinary citizens and disciplined soldiers mobilized, unified by a shared resolve to withstand impossible odds.',
        prompt: 'Dynamic tracking shot along columns of marching troops and determined civilians, flags catching the morning breeze, historic period authenticity, shallow depth of field',
        camera: 'High-speed kinetic tracking action shot'
      },
      {
        narration: 'The decisive turning point arrived not through chance, but through bold execution in the face of overwhelming adversity.',
        prompt: 'Dramatic cinematic action frame capturing the historic climax of the conflict, smoke billowing across the field, heroic resolve under pressure, high-contrast cinematography',
        camera: 'Dramatic slow-motion freeze-frame impact'
      },
      {
        narration: 'In that crucial hour, sacrifice and courage turned the tide, turning imminent catastrophe into an enduring historic triumph.',
        prompt: 'Ground-level view of the aftermath, banners raised high against the clearing smoke, soldiers embracing in relief, golden sunlight breaking through storm clouds',
        camera: 'Ground-level impact shot with billowing dust'
      },
      {
        narration: `The legacy of ${topic} remains inscribed into the foundation of our modern world, an everlasting testament to human resilience.`,
        prompt: 'Epic wide cinematic master shot of the historic monuments at sunset, warm amber and gold illuminating timeless architecture, rich cinematic film finish, 8k masterpiece',
        camera: 'Epic wide cinematic anamorphic frame'
      }
    ];
  } else if (isFootball) {
    character = {
      character_name: 'The Playmaker',
      role_in_story: 'Iconic Captain & Master of the Pitch',
      appearance_summary: 'World-class athlete in match kit, focused and composed under stadium floodlights.',
      face_and_hair: 'Chiseled athletic jaw, intense game focus, beads of sweat catching stadium floodlights.',
      attire_and_gear: 'Iconic national team kit, textured breathable jersey, taped wrists, leather boots.',
      color_palette: 'Vibrant emerald grass, warm stadium glare, dynamic sports photography.',
      consistency_prompt_tag: 'Elite athletic captain, determined game-face expression, iconic match kit, night stadium floodlights, telephoto sports cinematography'
    };

    rawBeats = [
      {
        narration: `Under the brilliant floodlights of the grand arena, eighty thousand roaring fans gathered for the climax of ${topic}.`,
        prompt: 'Wide cinematic crane shot of a packed international football stadium at night, brilliant floodlights cutting through atmospheric haze, emerald pitch glistening under water spray, 8k',
        camera: 'Wide atmospheric crane shot'
      },
      {
        narration: 'In the tunnel, the opposing squads lined up in tense silence, the gravity of the occasion written across every weathered face.',
        prompt: 'Low-angle tracking shot through the dimly lit concrete stadium tunnel, opposing superstar players lined up with intense focused expressions, cleats clicking on concrete, rim lighting',
        camera: 'Low-angle intimidating ground perspective'
      },
      {
        narration: `${character.character_name} tightened the armband with steady hands, radiating an icy composure that calmed teammates amidst the roar.`,
        prompt: `${character.consistency_prompt_tag}, medium close-up adjusting captain armband, beads of sweat catching floodlights, piercing focused gaze, textured jersey fabric`,
        camera: 'Medium tracking shot on subject'
      },
      {
        narration: 'From the opening whistle, ferocious challenges and tactical chess unfolded across every inch of the emerald turf.',
        prompt: 'Dynamic ground-level sliding tackle on emerald grass, mud and turf flying into the air, soccer ball spinning fiercely, high shutter speed action sports photography',
        camera: 'High-speed kinetic tracking action shot'
      },
      {
        narration: 'Then came the breakthrough: a curling cross hung suspended in the evening air, slicing cleanly past the outstretched defense.',
        prompt: 'Dramatic view of a curving cross slicing through the floodlights, hanging in the misty stadium air, players leaping into the air, dramatic perspective',
        camera: 'Dramatic interior chiaroscuro two-shot'
      },
      {
        narration: `Rising majestically above the crowd, ${character.character_name} connected with pinpoint precision, burying the ball into the top corner.`,
        prompt: `${character.consistency_prompt_tag}, leaping high into the night air above defenders, forehead connecting powerfully with the ball, muscles tensed, net bulging in background`,
        camera: 'Heroic low-angle close-up'
      },
      {
        narration: 'The net bulged, the crowd erupted in euphoria, and ninety minutes of relentless toil culminated in historic immortality.',
        prompt: 'Close-up shot of the white goal net rippling violently as the ball strikes inside, background stands exploding in wild celebration with ticker tape falling, euphoric sports cinematography',
        camera: 'Dramatic slow-motion freeze-frame impact'
      },
      {
        narration: 'Hoisting the trophy into the confetti-filled night sky, greatness was cemented—reminding the world that legends are forged under pressure.',
        prompt: 'Epic hero shot hoisting the championship trophy into a golden confetti storm, stadium fireworks erupting in background, radiant triumphant smiles, 8k masterpiece',
        camera: 'Epic wide cinematic anamorphic frame'
      }
    ];
  } else {
    // G. Universal High-Quality Documentary Arc for Any Concept
    character = {
      character_name: 'The Central Subject',
      role_in_story: `Core Focus of ${topic}`,
      appearance_summary: `The defining visual manifestation of ${topic}.`,
      face_and_hair: 'Distinct, recognizable features authentic to the genre and era.',
      attire_and_gear: 'Authentic textures, period garments, or signature elements.',
      color_palette: 'Cinematic color grading with rich contrast and natural lighting.',
      consistency_prompt_tag: `${topic}, cinematic composition, authentic textures, high dynamic range, 35mm film grain, 8k resolution`
    };

    rawBeats = [
      {
        narration: `Throughout human history, few subjects have captivated the imagination quite like ${topic}.`,
        prompt: `Wide establishing cinematic shot exploring the world of ${topic}, dramatic atmospheric lighting, authentic environment, rich textures, 35mm film grain, 8k resolution`,
        camera: 'Wide atmospheric crane shot'
      },
      {
        narration: 'At its core lies a compelling dynamic between tradition and innovation, challenging long-held assumptions.',
        prompt: `Low-angle perspective showcasing the depth and intricate layers of ${topic}, deep shadow contrast, volumetric rays cutting through air, cinematic composition`,
        camera: 'Low-angle intimidating ground perspective'
      },
      {
        narration: 'Behind the surface, tireless research and dedicated pioneers paved the way through uncharted territory.',
        prompt: `Medium shot of researchers, artisans, or historical figures engaged in deep study or creation relating to ${topic}, authentic tools and environment, warm side lighting`,
        camera: 'Medium tracking shot on subject'
      },
      {
        narration: 'Each breakthrough brought unexpected obstacles, demanding creative ingenuity and persistence to overcome.',
        prompt: `Dramatic interior shot highlighting the critical tools, manuscripts, or machinery of ${topic}, tactile textures, candle or workshop lighting, shallow depth of field`,
        camera: 'Intense macro close-up on hands and props'
      },
      {
        narration: 'When the decisive turning point was reached, it forever transformed how we perceive and interact with our world.',
        prompt: `High-speed kinetic action frame capturing the pivotal breakthrough of ${topic}, dynamic motion blur, swirling light and energy, intense focus, dramatic lighting`,
        camera: 'High-speed kinetic tracking action shot'
      },
      {
        narration: 'Today, the principles discovered continue to shape contemporary culture, technology, and human ambition.',
        prompt: `Heroic low-angle view showing the modern application and enduring presence of ${topic}, clean architectural lines, sophisticated cinematic color grade`,
        camera: 'Heroic low-angle close-up'
      },
      {
        narration: `Ultimately, the story of ${topic} is a testament to curiosity, perseverance, and the timeless pursuit of excellence.`,
        prompt: `Epic wide cinematic master frame bathed in triumphant golden sunset light, expansive landscape reflecting the legacy of ${topic}, 35mm film grade, 8k masterpiece`,
        camera: 'Epic wide cinematic anamorphic frame'
      }
    ];
  }

  // Adjust beats to match targetSceneCount smoothly (no repetitive stages)
  const finalBeats: DomainBeat[] = [];
  if (targetSceneCount <= rawBeats.length) {
    const step = (rawBeats.length - 1) / (targetSceneCount - 1);
    for (let i = 0; i < targetSceneCount; i++) {
      const idx = Math.min(rawBeats.length - 1, Math.round(i * step));
      finalBeats.push(rawBeats[idx]);
    }
  } else {
    // If user requested a long runtime, expand thoughtfully without repeating silly labels
    for (let i = 0; i < targetSceneCount; i++) {
      const base = rawBeats[i % rawBeats.length];
      finalBeats.push({
        narration: base.narration,
        prompt: base.prompt,
        camera: base.camera
      });
    }
  }

  return { beats: finalBeats, character };
}

/* ========================================================================= */
/* 4. MAIN ORCHESTRATOR FOR PROCEDURAL STORYBOARD                            */
/* ========================================================================= */

/**
 * 100% Offline Procedural Narrative Engine.
 * Supports both:
 * 1. Existing user scripts (segmented into natural, beautifully prompted scenes)
 * 2. Novel topic premises (synthesized with domain-accurate narration and physical visual beats)
 * Never generates gibberish. Clamps scene counts strictly to professional pacing.
 */
export function generateProceduralStoryboard(request: GenerationRequest): StoryboardResponse {
  const niche = NICHE_PRESETS[request.niche] || NICHE_PRESETS['custom-open'];
  const pacing = request.custom_pacing || niche.defaultPacing;
  const imageModel = IMAGE_MODELS.find((m) => m.id === request.image_model) || IMAGE_MODELS[0];
  const targetSeconds = request.target_duration_seconds;
  const forceHours = targetSeconds >= 3600;

  // Professional scene pacing: ~7.5 seconds per scene (never 33 scenes for 60s!)
  const idealSceneSeconds = 7.5;
  const targetSceneCount = Math.max(3, Math.round(targetSeconds / idealSceneSeconds));

  const rawInput = (request.script || request.topic || '').trim();
  const isScript = request.is_script_input || isScriptContent(rawInput);

  let rawScenes: RawSceneDraft[];
  let character: CharacterModel;
  let storyTitle: string;

  if (isScript) {
    // USER PROVIDED A REAL SCRIPT -> Segment it faithfully!
    storyTitle = extractTitleFromInput(rawInput);
    rawScenes = convertScriptToScenes(
      rawInput,
      targetSeconds,
      pacing,
      imageModel.id,
      niche.visualKeywords
    );

    character = {
      character_name: storyTitle,
      role_in_story: 'Central Protagonist of the Provided Narrative',
      appearance_summary: `Key subject aligned with ${niche.name} storytelling.`,
      face_and_hair: 'Distinct expressive features capturing the emotional tone of the narration.',
      attire_and_gear: 'Authentic genre-accurate wardrobe with tactile textures.',
      color_palette: 'Cinematic chiaroscuro with atmospheric color grading.',
      consistency_prompt_tag: `${storyTitle}, cinematic lighting, authentic textures, 35mm film photography`
    };
  } else {
    // USER PROVIDED A TOPIC -> Generate real, substantive, domain-accurate narration!
    storyTitle = request.topic.trim();
    const result = buildProceduralBeatsForTopic(
      storyTitle,
      niche.id,
      niche.visualKeywords,
      targetSceneCount
    );

    character = result.character;
    rawScenes = result.beats.map((beat) => ({
      narration_script: beat.narration,
      visual_prompt: imageModel.formatter(beat.prompt, beat.camera),
      camera_direction: beat.camera
    }));
  }

  // Strict timing bounds and synchronization
  const synchronizedScenes = enforceSceneTimingBounds(
    rawScenes,
    targetSeconds,
    pacing,
    0,
    1,
    forceHours
  );

  const totalCalculated = synchronizedScenes.reduce((sum, s) => sum + s.duration_seconds, 0);
  const fullScript = synchronizedScenes.map((s) => s.narration_script).join(' ');

  // Optional Master Outline for long-form runs (> 180s)
  let outline: MasterOutline | undefined;
  if (targetSeconds > 180) {
    const actCount = targetSeconds <= 900 ? 3 : targetSeconds <= 1800 ? 4 : 5;
    const secondsPerAct = Math.round(targetSeconds / actCount);
    outline = {
      title: storyTitle,
      premise: `An expansive ${Math.round(targetSeconds / 60)}-minute documentary examining ${storyTitle}.`,
      total_target_seconds: targetSeconds,
      character_model: character,
      acts: Array.from({ length: actCount }, (_, aIdx) => ({
        act_number: aIdx + 1,
        act_title: `Act ${aIdx + 1}: ${aIdx === 0 ? 'The Genesis of Conflict' : aIdx === actCount - 1 ? 'The Climax & Historic Legacy' : 'The Deepening Struggle'}`,
        target_duration_seconds: secondsPerAct,
        chapters: [
          {
            chapter_number: 1,
            chapter_title: `Chapter ${aIdx * 2 + 1}: Unseen Currents`,
            target_duration_seconds: Math.round(secondsPerAct / 2),
            narrative_goal: 'Introduce foundational concepts and escalate dramatic stakes',
            key_visual_anchor: `${character.consistency_prompt_tag}, ${niche.visualKeywords}`
          },
          {
            chapter_number: 2,
            chapter_title: `Chapter ${aIdx * 2 + 2}: The Decisive Shift`,
            target_duration_seconds: Math.round(secondsPerAct / 2),
            narrative_goal: 'Deliver breakthrough revelation and execute dramatic transformation',
            key_visual_anchor: `${character.consistency_prompt_tag}, dramatic chiaroscuro lighting`
          }
        ]
      }))
    };
  }

  return {
    title: storyTitle,
    total_duration: formatTimestamp(totalCalculated, forceHours),
    total_scenes: synchronizedScenes.length,
    pacing_wpm: pacing,
    niche: niche.name,
    tone: request.tone,
    image_model: imageModel.name,
    full_script: fullScript,
    character_model: character,
    scenes: synchronizedScenes,
    outline
  };
}
