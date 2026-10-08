import { PronunciationRule } from './types';

export const DEFAULT_PRONUNCIATION_LEXICON: PronunciationRule[] = [
  // === NIGERIAN NAMES ===
  {
    id: 'nnamdi',
    word: 'Nnamdi',
    replacement: 'Nahm-dee',
    phoneticDescription: 'Soft N prefix, accented second syllable',
    category: 'name'
  },
  {
    id: 'chukwu',
    word: 'Chukwu',
    replacement: 'Chook-woo',
    phoneticDescription: 'Rounded vowels, soft k',
    category: 'name'
  },
  {
    id: 'adebayo',
    word: 'Adebayo',
    replacement: 'Ah-deh-bah-yoh',
    phoneticDescription: 'Evenly stressed Yoruba tones',
    category: 'name'
  },
  {
    id: 'babangida',
    word: 'Babangida',
    replacement: 'Bah-bahn-gee-dah',
    phoneticDescription: 'Rhythmic Northern cadence',
    category: 'name'
  },
  {
    id: 'nwankwo',
    word: 'Nwankwo',
    replacement: 'Nwahn-kwoh',
    phoneticDescription: 'Labio-velar consonant blend',
    category: 'name'
  },
  {
    id: 'ngozi',
    word: 'Ngozi',
    replacement: 'En-goh-zee',
    phoneticDescription: 'Gentle nasal glide',
    category: 'name'
  },
  {
    id: 'tunde',
    word: 'Tunde',
    replacement: 'Toon-day',
    phoneticDescription: 'High-mid vowel pitch',
    category: 'name'
  },
  {
    id: 'adaeze',
    word: 'Adaeze',
    replacement: 'Ah-dah-eh-zeh',
    phoneticDescription: 'Distinct multi-syllable lilt',
    category: 'name'
  },

  // === NIGERIAN PLACES ===
  {
    id: 'enugu',
    word: 'Enugu',
    replacement: 'Eh-noo-goo',
    phoneticDescription: 'Open initial vowel',
    category: 'place'
  },
  {
    id: 'ibadan',
    word: 'Ibadan',
    replacement: 'Ee-bah-dahn',
    phoneticDescription: 'Soft rhythmic open cadence',
    category: 'place'
  },
  {
    id: 'anambra',
    word: 'Anambra',
    replacement: 'Ah-nahm-brah',
    phoneticDescription: 'Clear dental consonants',
    category: 'place'
  },
  {
    id: 'kaduna',
    word: 'Kaduna',
    replacement: 'Kah-doo-nah',
    phoneticDescription: 'Even syllabic emphasis',
    category: 'place'
  },
  {
    id: 'abuja',
    word: 'Abuja',
    replacement: 'Ah-boo-jah',
    phoneticDescription: 'Soft palate j sound',
    category: 'place'
  },
  {
    id: 'calabar',
    word: 'Calabar',
    replacement: 'Cah-lah-bahr',
    phoneticDescription: 'Clear melodic vowels',
    category: 'place'
  },

  // === SCRIPTURAL & HISTORICAL TERMS ===
  {
    id: 'elah',
    word: 'Elah',
    replacement: 'Ee-lah',
    phoneticDescription: 'Biblical valley of David & Goliath',
    category: 'name'
  },
  {
    id: 'goliath',
    word: 'Goliath',
    replacement: 'Goh-lye-ath',
    phoneticDescription: 'Traditional oratorical cadence',
    category: 'name'
  },
  {
    id: 'constantinople',
    word: 'Constantinople',
    replacement: 'Kon-stan-tin-oh-pul',
    phoneticDescription: 'Documentary clarity',
    category: 'place'
  }
];

/**
 * Applies active pronunciation lexicon rules to plain script text
 */
export function applyPronunciationLexicon(
  text: string,
  rules: PronunciationRule[] = DEFAULT_PRONUNCIATION_LEXICON
): string {
  let processed = text;
  for (const rule of rules) {
    if (!rule.word.trim() || !rule.replacement.trim()) continue;
    // Word boundary regex case-insensitive
    const regex = new RegExp(`\\b${rule.word}\\b`, 'gi');
    processed = processed.replace(regex, rule.replacement);
  }
  return processed;
}
