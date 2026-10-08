import { VoiceProfile } from './types';

export interface ExtendedVoiceProfile extends VoiceProfile {
  neuralVoiceId: string;
  neuralPitch?: string;
  neuralRate?: string;
}

export const LAUNCH_VOICES: ExtendedVoiceProfile[] = [
  // === NIGERIAN FEMALE ===
  {
    id: 'adaeze',
    name: 'Adaeze',
    category: 'nigerian-female',
    categoryLabel: 'Nigerian Female',
    tone: 'Warm & Captivating',
    ageColor: 'Mature',
    accent: 'Authentic Nigerian English (Warm Storyteller)',
    neuralVoiceId: 'en-NG-EzinneNeural',
    neuralPitch: '-2Hz',
    neuralRate: '-4%',
    sampleAudioText:
      'History is not merely what was left behind, but the courage of those who dared to step forward into the unknown.',
    nigerianSampleText:
      'Chief Nnamdi and Dr. Ngozi arrived in Enugu just before the rains swept through the Anambra valley.',
    recommendedNiches: ['bible-stories', 'ancient-christian-history', 'historical-documentary'],
    pitch: 1.0,
    rate: 0.95,
    voiceGender: 'female',
    lang: 'en-NG'
  },
  {
    id: 'zainab',
    name: 'Zainab',
    category: 'nigerian-female',
    categoryLabel: 'Nigerian Female',
    tone: 'Bright & Conversational',
    ageColor: 'Young',
    accent: 'Authentic Nigerian English (Modern & Clear)',
    neuralVoiceId: 'en-NG-EzinneNeural',
    neuralPitch: '+8Hz',
    neuralRate: '+6%',
    sampleAudioText:
      'Every breakthrough begins with a single question that refuses to accept things as they are.',
    nigerianSampleText:
      'From Kaduna to Abuja, innovators are reimagining what African enterprise can achieve.',
    recommendedNiches: ['human-psychology', 'sports-analysis', 'brainrot-hyper'],
    pitch: 1.1,
    rate: 1.05,
    voiceGender: 'female',
    lang: 'en-NG'
  },
  {
    id: 'ngozi',
    name: 'Ngozi',
    category: 'nigerian-female',
    categoryLabel: 'Nigerian Female',
    tone: 'Documentary & Solemn',
    ageColor: 'Deep',
    accent: 'Authentic Nigerian English (Stately & Classical)',
    neuralVoiceId: 'en-NG-EzinneNeural',
    neuralPitch: '-10Hz',
    neuralRate: '-8%',
    sampleAudioText:
      'Beneath the surface of ancient kingdoms, forgotten manuscripts whisper truths that time could never extinguish.',
    nigerianSampleText:
      'In the court of Benin, the bronze casters of Igun Street fashioned records of imperial majesty.',
    recommendedNiches: ['ancient-civilizations', 'forgotten-mysteries', 'bible-stories'],
    pitch: 0.9,
    rate: 0.9,
    voiceGender: 'female',
    lang: 'en-NG'
  },

  // === NIGERIAN MALE ===
  {
    id: 'tunde',
    name: 'Tunde',
    category: 'nigerian-male',
    categoryLabel: 'Nigerian Male',
    tone: 'Authoritative & Resonant',
    ageColor: 'Mature',
    accent: 'Authentic Nigerian English (Commanding Broadcaster)',
    neuralVoiceId: 'en-NG-AbeoNeural',
    neuralPitch: '-6Hz',
    neuralRate: '-5%',
    sampleAudioText:
      'In moments of national reckoning, the decisions of leaders determine the destiny of generations.',
    nigerianSampleText:
      'From the historic streets of Ibadan to the financial towers of Marina, the legacy of our pioneers still stands.',
    recommendedNiches: ['football-history', 'historical-documentary', 'ancient-christian-history'],
    pitch: 0.9,
    rate: 0.95,
    voiceGender: 'male',
    lang: 'en-NG'
  },
  {
    id: 'emeka',
    name: 'Emeka',
    category: 'nigerian-male',
    categoryLabel: 'Nigerian Male',
    tone: 'Conversational & Dynamic',
    ageColor: 'Young',
    accent: 'Authentic Nigerian English (Energetic Sports & Commercial)',
    neuralVoiceId: 'en-NG-AbeoNeural',
    neuralPitch: '+5Hz',
    neuralRate: '+8%',
    sampleAudioText:
      'The roar inside the stadium was deafening as ninety thousand fans held their breath for the final penalty kick.',
    nigerianSampleText:
      'Nwankwo Kanu stepped up in ninety-six, and Nigerian football changed the sporting map forever.',
    recommendedNiches: ['football-history', 'sports-analysis', 'motivational-mindset'],
    pitch: 1.05,
    rate: 1.08,
    voiceGender: 'male',
    lang: 'en-NG'
  },
  {
    id: 'sadiq',
    name: 'Sadiq',
    category: 'nigerian-male',
    categoryLabel: 'Nigerian Male',
    tone: 'Deep & Philosophical',
    ageColor: 'Deep',
    accent: 'Authentic Nigerian English (Solemn & Gravitas)',
    neuralVoiceId: 'en-NG-AbeoNeural',
    neuralPitch: '-16Hz',
    neuralRate: '-10%',
    sampleAudioText:
      'True strength is found not in the absence of conflict, but in the unwavering peace that guides a man through it.',
    nigerianSampleText:
      'In the quiet dawn across the savannah plains of Sokoto, wisdom is passed down like a sacred flame.',
    recommendedNiches: ['bible-stories', 'gospel-missionaries', 'human-psychology'],
    pitch: 0.8,
    rate: 0.88,
    voiceGender: 'male',
    lang: 'en-NG'
  },

  // === FOREIGN MALE ===
  {
    id: 'marcus',
    name: 'Marcus',
    category: 'foreign-male',
    categoryLabel: 'Foreign Male',
    tone: 'Warm & Relatable',
    ageColor: 'Mature',
    accent: 'American Male (Warm & Conversational)',
    neuralVoiceId: 'en-US-ChristopherNeural',
    neuralPitch: '-4Hz',
    neuralRate: '-2%',
    sampleAudioText:
      'We often think of discovery as a physical journey, but the greatest frontier has always been between our ears.',
    nigerianSampleText:
      'The expedition documented records across Lagos, Port Harcourt, and Calabar.',
    recommendedNiches: ['human-psychology', 'motivational-mindset', 'time-travel-timelines'],
    pitch: 0.95,
    rate: 0.98,
    voiceGender: 'male',
    lang: 'en-US'
  },
  {
    id: 'oliver',
    name: 'Oliver',
    category: 'foreign-male',
    categoryLabel: 'Foreign Male',
    tone: 'Crisp & Intellectual',
    ageColor: 'Mature',
    accent: 'British Male (BBC Documentary & Academic)',
    neuralVoiceId: 'en-GB-RyanNeural',
    neuralPitch: '+0Hz',
    neuralRate: '-4%',
    sampleAudioText:
      'Upon close inspection of the archaeological strata, a curious anomaly presents itself to the trained historian.',
    nigerianSampleText:
      'Archival correspondence between Kaduna and Whitehall revealed remarkable administrative rigor.',
    recommendedNiches: ['ancient-civilizations', 'forgotten-mysteries', 'historical-documentary'],
    pitch: 1.0,
    rate: 0.94,
    voiceGender: 'male',
    lang: 'en-GB'
  },
  {
    id: 'hugo',
    name: 'Hugo',
    category: 'foreign-male',
    categoryLabel: 'Foreign Male',
    tone: 'Deep & Cinematic',
    ageColor: 'Deep',
    accent: 'American Male (Deep Cinematic Baritone)',
    neuralVoiceId: 'en-US-EricNeural',
    neuralPitch: '-12Hz',
    neuralRate: '-8%',
    sampleAudioText:
      'The shadows grew long across the deserted valley, where secrets had waited silently for centuries.',
    nigerianSampleText:
      'Deep inside the rain-soaked forest reserves of Cross River, the expedition halted in silence.',
    recommendedNiches: ['horror-supernatural', 'time-travel-timelines', 'true-crime'],
    pitch: 0.8,
    rate: 0.88,
    voiceGender: 'male',
    lang: 'en-US'
  },

  // === FOREIGN FEMALE ===
  {
    id: 'elena',
    name: 'Elena',
    category: 'foreign-female',
    categoryLabel: 'Foreign Female',
    tone: 'Bright & Polished',
    ageColor: 'Young',
    accent: 'American Female (Crisp Editorial & Commercial)',
    neuralVoiceId: 'en-US-JennyNeural',
    neuralPitch: '+4Hz',
    neuralRate: '+2%',
    sampleAudioText:
      'Every behavioral experiment demonstrates how subtly our subconscious perceptions steer our daily choices.',
    nigerianSampleText:
      'Field interviews conducted across Abuja and Lagos highlighted rapid technological adoption.',
    recommendedNiches: ['human-psychology', 'sports-analysis', 'motivational-mindset'],
    pitch: 1.1,
    rate: 1.0,
    voiceGender: 'female',
    lang: 'en-US'
  },
  {
    id: 'charlotte',
    name: 'Charlotte',
    category: 'foreign-female',
    categoryLabel: 'Foreign Female',
    tone: 'Refined & Poetic',
    ageColor: 'Mature',
    accent: 'British Female (Classical & Elegant)',
    neuralVoiceId: 'en-GB-SoniaNeural',
    neuralPitch: '-2Hz',
    neuralRate: '-6%',
    sampleAudioText:
      'There is a quiet majesty in the ancient scriptures that transcends time, culture, and circumstance.',
    nigerianSampleText:
      'The missionary diaries kept in Calabar offer an intimate glimpse of 19th-century devotion.',
    recommendedNiches: ['bible-stories', 'ancient-christian-history', 'historical-documentary'],
    pitch: 1.0,
    rate: 0.92,
    voiceGender: 'female',
    lang: 'en-GB'
  },
  {
    id: 'sofia',
    name: 'Sofia',
    category: 'foreign-female',
    categoryLabel: 'Foreign Female',
    tone: 'Soft & Intimate',
    ageColor: 'Deep',
    accent: 'European / Irish Female (Lyrical & Intimate)',
    neuralVoiceId: 'en-IE-EmilyNeural',
    neuralPitch: '-4Hz',
    neuralRate: '-8%',
    sampleAudioText:
      'When the noise of the world recedes, the deepest reflections of the soul begin to take shape.',
    nigerianSampleText:
      'The twilight over Victoria Island settles like a gentle veil upon the ocean harbor.',
    recommendedNiches: ['horror-supernatural', 'ancient-civilizations', 'human-psychology'],
    pitch: 0.95,
    rate: 0.9,
    voiceGender: 'female',
    lang: 'en-IE'
  }
];
