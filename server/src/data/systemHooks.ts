import type { PublicBook } from '../types.js';

export type SystemPersona = {
  username: string;
  displayName: string;
  avatarUrl?: string;
};

export const SYSTEM_PERSONAS: SystemPersona[] = [
  { username: 'midnight_philosopher', displayName: 'The Midnight Thinker' },
  { username: 'spicy_classics', displayName: 'Literary Hot Takes 🔥' },
  { username: 'netherfield_society', displayName: 'Netherfield Society 💌' },
  { username: 'baker_street_files', displayName: '221B Chronicles 🔍' },
  { username: 'ocean_depths', displayName: 'Ishmael’s Log 🌊' },
  { username: 'wonderland_wanderer', displayName: 'Curiouser & Curiouser 🐇' },
  { username: 'vanity_verse', displayName: 'Vanity & Verse 🪞' },
  { username: 'reading_fox', displayName: 'The Reading Fox 🦊' },
  { username: 'elena_reads', displayName: 'Elena Rostova 📖' },
  { username: 'marcus_aurelius', displayName: 'Marcus Aurelius 🏛️' },
];

export type SystemHookDefinition = {
  bookKeywords: string[];
  badge: string;
  questionOrQuote: string;
  curiosityHook: string;
  persona: SystemPersona;
};

export const CURATED_SYSTEM_HOOKS: SystemHookDefinition[] = [
  // Frankenstein
  {
    bookKeywords: ['frankenstein', 'shelley'],
    badge: '🧠 Moral Dilemma',
    questionOrQuote:
      'If you could manufacture human life tonight, would you have the courage to love what looks back at you?',
    curiosityHook:
      'Victor Frankenstein didn’t create a monster because of science. He created a monster because the second it opened its watery yellow eyes, he ran away and left a child in an eight-foot body all alone in the dark. How far would you go to make amends?',
    persona: SYSTEM_PERSONAS[0],
  },
  {
    bookKeywords: ['frankenstein', 'shelley'],
    badge: '🔥 Hot Take',
    questionOrQuote:
      'The Creature read Milton’s Paradise Lost and wept because even the Devil had companions. What’s our excuse for neglect?',
    curiosityHook:
      'Chapters 11 to 16 are told entirely from the Creature’s POV, and they are the most heartbreaking masterclass in emotional longing ever written. You will never look at this story the same way.',
    persona: SYSTEM_PERSONAS[1],
  },

  // Pride and Prejudice
  {
    bookKeywords: ['pride and prejudice', 'austen'],
    badge: '💌 Modern Parallel',
    questionOrQuote:
      'Would you turn down 10,000 pounds a year just because the guy was insufferably rude at a party?',
    curiosityHook:
      'Elizabeth Bennet said no to the wealthiest bachelor in Derbyshire because self-respect wasn’t for sale in 1813. Chapter 34 is the greatest enemies-to-lovers confrontation in Western literature.',
    persona: SYSTEM_PERSONAS[2],
  },
  {
    bookKeywords: ['pride and prejudice', 'austen'],
    badge: '✨ Sharp Satire',
    questionOrQuote:
      '“It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.”',
    curiosityHook:
      'Opening lines rarely burn this bright after 200 years. Austen’s irony cuts through social performance like a scalpel. Re-reading this with modern eyes reveals pure psychological comedy.',
    persona: SYSTEM_PERSONAS[7],
  },

  // Sherlock Holmes
  {
    bookKeywords: ['sherlock', 'conan doyle', 'holmes', 'baskerville'],
    badge: '🔍 The Question',
    questionOrQuote:
      'How does a mind see everything that happens in a room while everyone else only looks?',
    curiosityHook:
      '“You see, Watson, but you do not observe. The distinction is perfectly clear.” In A Scandal in Bohemia, Holmes meets the only woman who ever outsmarted his invincible calculation. Who was Irene Adler?',
    persona: SYSTEM_PERSONAS[3],
  },
  {
    bookKeywords: ['sherlock', 'conan doyle', 'holmes'],
    badge: '⚡ The Cliffhanger',
    questionOrQuote:
      'When you eliminate the impossible, whatever remains, however improbable, must be the truth.',
    curiosityHook:
      'A locked room, a venomous whisper in the night, and five orange pips delivered in an unmarked envelope. Conan Doyle invented the modern suspense engine right here.',
    persona: SYSTEM_PERSONAS[3],
  },

  // Moby Dick
  {
    bookKeywords: ['moby dick', 'melville', 'whale'],
    badge: '🌊 Cosmic Obsession',
    questionOrQuote:
      'What happens when the enemy you are hunting is not a beast, but the indifferent silence of the universe itself?',
    curiosityHook:
      'Captain Ahab didn’t lose his leg to a dumb whale; he lost his soul to the idea that fate dared to strike him. Chapter 36 (“The Quarter-Deck”) is an electric duel between madness and obedience.',
    persona: SYSTEM_PERSONAS[4],
  },
  {
    bookKeywords: ['moby dick', 'melville', 'whale'],
    badge: '✨ Timeless Reflection',
    questionOrQuote:
      '“Whenever it is a damp, drizzly November in my soul... I account it high time to get to sea as soon as I can.”',
    curiosityHook:
      'Call him Ishmael. In 1851, Herman Melville diagnosed seasonal burnout and existential wandering before modern psychology even gave it a name.',
    persona: SYSTEM_PERSONAS[4],
  },

  // Alice in Wonderland
  {
    bookKeywords: ['alice', 'wonderland', 'carroll'],
    badge: '🐇 The Rabbit Hole',
    questionOrQuote:
      '“Who in the world am I? Ah, that’s the great puzzle!” Have you ever woke up feeling like a stranger to yourself?',
    curiosityHook:
      'Lewis Carroll wasn’t writing just a whimsical fairy tale for children; he was a Oxford logician satirizing how nonsensical adult etiquette and societal rules truly are.',
    persona: SYSTEM_PERSONAS[5],
  },
  {
    bookKeywords: ['alice', 'wonderland', 'carroll'],
    badge: '🧠 Logic Trap',
    questionOrQuote:
      '“We’re all mad here. I’m mad. You’re mad.” “How do you know I’m mad?” said Alice. “You must be,” said the Cat, “or you wouldn’t have come here.”',
    curiosityHook:
      'The Cheshire Cat’s smile in Chapter 6 is the ultimate answer to anyone who feels like the world has lost its collective marbles. Dive down the rabbit hole tonight.',
    persona: SYSTEM_PERSONAS[5],
  },

  // Beatrix Potter
  {
    bookKeywords: ['beatrix potter', 'peter rabbit', 'potter'],
    badge: '🌿 Rebel Spirit',
    questionOrQuote:
      'Why do the most gentle children’s stories carry the most dangerous warnings about curiosity and consequence?',
    curiosityHook:
      'Peter Rabbit was warned not to go into Mr. McGregor’s garden because his father had an “accident” there and was put into a pie. Beatrix Potter never sugarcoated reality for a single second.',
    persona: SYSTEM_PERSONAS[7],
  },

  // Dorian Gray
  {
    bookKeywords: ['dorian gray', 'wilde'],
    badge: '🪞 The Moral Question',
    questionOrQuote:
      'What if your body never aged, but every compromise and petty betrayal rotted a secret canvas hidden in your attic?',
    curiosityHook:
      'Oscar Wilde foresaw the influencer era 130 years before Instagram. How long could your portrait stay clean?',
    persona: SYSTEM_PERSONAS[6],
  },
];

/**
 * Dynamically synthesizes an engaging hook for any book in the catalog.
 */
export function synthesizeSystemHook(
  book: PublicBook,
  slotIndex: number,
): {
  badge: string;
  questionOrQuote: string;
  curiosityHook: string;
  persona: SystemPersona;
} {
  const persona = SYSTEM_PERSONAS[slotIndex % SYSTEM_PERSONAS.length];
  const title = book.title;
  const author = book.authors?.[0] || 'Unknown Author';
  const category = (book.categories?.[0] || 'Fiction').toLowerCase();

  if (category.includes('philosophy')) {
    return {
      badge: '🏛️ The Big Question',
      questionOrQuote: `Can reading ${title} fundamentally shift how you react to chaos and disappointment today?`,
      curiosityHook: `${author} strips away comforting illusions to ask what a human being actually controls when external circumstances collapse. It answers questions most people spend decades avoiding.`,
      persona,
    };
  }

  if (category.includes('adventur') || category.includes('detective') || category.includes('mystery')) {
    return {
      badge: '⚡ High Stakes Hook',
      questionOrQuote: `What would you do if your survival depended on solving the impossible riddle at the heart of ${title}?`,
      curiosityHook: `From the very first chapter, ${author} pulls you into a high-stakes web of secrets, danger, and relentless momentum that will keep you up well past midnight.`,
      persona,
    };
  }

  return {
    badge: '📖 Deep Reading Reflection',
    questionOrQuote: `Why has ${title} captivated readers across generations without losing an ounce of its power?`,
    curiosityHook: `${author} crafts an unforgettable world that holds a mirror up to our modern obsessions, fears, and hopes. Read Chapter 1 and see if you can put it down.`,
    persona,
  };
}

