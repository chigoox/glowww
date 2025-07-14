import { useState, useCallback } from 'react';

// Curated word lists for better reliability
const ADJECTIVES = [
  'amazing', 'bright', 'creative', 'dynamic', 'elegant', 'fantastic', 'golden', 'happy',
  'incredible', 'joyful', 'keen', 'lively', 'magical', 'noble', 'optimistic', 'powerful',
  'quiet', 'radiant', 'stellar', 'tremendous', 'unique', 'vibrant', 'wonderful', 'excellent',
  'bold', 'calm', 'cool', 'dark', 'epic', 'fast', 'gentle', 'huge', 'iron', 'swift',
  'wild', 'wise', 'young', 'zealous', 'ancient', 'cosmic', 'divine', 'eternal', 'fierce',
  'grand', 'heroic', 'infinite', 'lunar', 'mystic', 'pure', 'royal', 'sacred', 'ultra'
];

const NOUNS = [
  'adventure', 'bridge', 'castle', 'dragon', 'engine', 'forest', 'galaxy', 'harbor',
  'island', 'journey', 'kingdom', 'lighthouse', 'mountain', 'nexus', 'ocean', 'phoenix',
  'quest', 'river', 'starship', 'temple', 'universe', 'village', 'waterfall', 'xenon',
  'yard', 'zenith', 'beacon', 'crystal', 'dream', 'echo', 'flame', 'garden', 'haven',
  'iris', 'jewel', 'keystone', 'lagoon', 'meadow', 'nebula', 'oasis', 'palace', 'quasar',
  'realm', 'sanctuary', 'tower', 'utopia', 'vista', 'workshop', 'apex', 'core', 'forge'
];

async function fetchWords(partOfSpeech, max = 20) {
  // Use curated lists for more reliable results
  if (partOfSpeech === 'adj') {
    // Shuffle and return a subset
    const shuffled = [...ADJECTIVES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(max, shuffled.length));
  } else if (partOfSpeech === 'n') {
    const shuffled = [...NOUNS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(max, shuffled.length));
  }
  
  // Fallback to API for other parts of speech (if needed)
  try {
    const response = await fetch(`https://api.datamuse.com/words?md=p&max=${max}&sp=*`);
    const data = await response.json();
    return data
      .filter(word => word.tags && word.tags.includes(partOfSpeech))
      .map(word => word.word);
  } catch (error) {
    console.warn(`Could not fetch ${partOfSpeech} words from API, using fallback list.`);
    return [];
  }
}

async function generateProjectName() {
  const [adjectives, nouns] = await Promise.all([
    fetchWords('adj'),
    fetchWords('n')
  ]);

  const getRandom = (list) => list[Math.floor(Math.random() * list.length)];
  
  // Generate 4-digit random number
  const randomNumber = Math.floor(Math.random() * 9000) + 1000; // Ensures 4 digits (1000-9999)

  const word1 = getRandom(adjectives); // Should be adjective
  const word2 = getRandom(nouns);      // Should be noun
  const word3 = getRandom(nouns);      // Should be noun

  const result = `${word1}-${word2}-${word3}-${randomNumber}`;
  
  // Debug logging to verify parts of speech
  console.log('Generated project name:', result);
  console.log('Parts:', { adjective: word1, noun1: word2, noun2: word3, number: randomNumber });
  
  return result;
}

export const useRandomName = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateName = useCallback(async () => {
    setIsGenerating(true);
    try {
      const name = await generateProjectName();
      return name;
    } catch (error) {
      console.error('Error generating project name:', error);
      // Fallback to a simple random name if everything fails
      const fallbackNumber = Math.floor(Math.random() * 9000) + 1000;
      return `my-project-${fallbackNumber}`;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateName,
    isGenerating
  };
};