import type { Book } from '../data/books';

export type HookStyle =
  | 'question' // A moral dilemma or question the book answers
  | 'hot_take' // A spicy, modern, or controversial perspective
  | 'cliffhanger' // A dramatic open loop or shocking quote
  | 'modern_parallel' // Connecting the classic theme to modern life (burnout, dating, ego)
  | 'wit'; // Sharp satire or ironic observation

export type CuratedBookHook = {
  bookKeywords: string[];
  style: HookStyle;
  hookBadge: string;
  hookColor: string;
  questionOrQuote: string;
  curiosityHook: string;
  category: string;
  suggestedPersona: {
    username: string;
    displayName: string;
    avatarColor: string;
  };
};

// ── Rich Curated Knowledge Base of Provocative Questions & Book Hooks ──────────

export const CURATED_BOOK_HOOKS: CuratedBookHook[] = [
  // Frankenstein
  {
    bookKeywords: ['frankenstein', 'shelley'],
    style: 'question',
    hookBadge: '🧠 Moral Dilemma',
    hookColor: '#059669',
    questionOrQuote:
      'If you could manufacture human life in your room tonight, would you have the courage to love what looks back at you?',
    curiosityHook:
      'Victor Frankenstein didn’t create a monster because of science. He created a monster because the second it opened its watery yellow eyes, he ran away and left a child in an eight-foot body all alone in the dark.',
    category: 'Fiction',
    suggestedPersona: {
      username: 'midnight_philosopher',
      displayName: 'The Midnight Thinker',
      avatarColor: '#10B981',
    },
  },
  {
    bookKeywords: ['frankenstein', 'shelley'],
    style: 'hot_take',
    hookBadge: '🔥 Hot Take',
    hookColor: '#DC2626',
    questionOrQuote:
      'The Creature read Milton’s Paradise Lost and cried because even the Devil had friends. What’s your excuse for ghosting people?',
    curiosityHook:
      'Chapter 11 to 16 is told from the Creature’s POV, and it is the most heartbreaking masterclass in emotional neglect ever written.',
    category: 'Fiction',
    suggestedPersona: {
      username: 'spicy_classics',
      displayName: 'Literary Hot Takes 🔥',
      avatarColor: '#EF4444',
    },
  },

  // The Picture of Dorian Gray
  {
    bookKeywords: ['dorian gray', 'oscar wilde', 'wilde'],
    style: 'question',
    hookBadge: '🪞 The Question',
    hookColor: '#D97706',
    questionOrQuote:
      'What if your face never aged, but every lie, betrayal, and dark secret you kept carved a fresh scar onto a canvas locked in your attic?',
    curiosityHook:
      'Oscar Wilde wasn’t writing a horror story. He was predicting what happens when someone values aesthetic appearance over their own soul. How long could your portrait stay clean?',
    category: 'Fiction',
    suggestedPersona: {
      username: 'aesthetic_dread',
      displayName: 'Vanity & Verse',
      avatarColor: '#F59E0B',
    },
  },
  {
    bookKeywords: ['dorian gray', 'oscar wilde', 'wilde'],
    style: 'wit',
    hookBadge: '✨ Sharp Satire',
    hookColor: '#BE185D',
    questionOrQuote:
      '“There is only one thing in the world worse than being talked about, and that is not being talked about.”',
    curiosityHook:
      'Lord Henry Wotton whispers three sentences in a garden in Chapter 2, and Dorian’s entire mortal innocence evaporates on the spot.',
    category: 'Literature',
    suggestedPersona: {
      username: 'oscar_quotes',
      displayName: 'Wilde Reflections',
      avatarColor: '#EC4899',
    },
  },

  // Pride and Prejudice
  {
    bookKeywords: ['pride and prejudice', 'austen'],
    style: 'modern_parallel',
    hookBadge: '💌 Modern Parallel',
    hookColor: '#E11D48',
    questionOrQuote:
      'Ever convinced yourself you despise someone, only to realize your ego was just terrified because they saw straight through your facade?',
    curiosityHook:
      '1813 or 2026: Jane Austen understood weaponized social awkwardness and mutual pining two hundred years before modern dating apps existed.',
    category: 'Literature',
    suggestedPersona: {
      username: 'pemberley_bound',
      displayName: 'Lizzie Bennet Club',
      avatarColor: '#F43F5E',
    },
  },
  {
    bookKeywords: ['pride and prejudice', 'austen'],
    style: 'cliffhanger',
    hookBadge: '⚡ The Confrontation',
    hookColor: '#8B5CF6',
    questionOrQuote:
      '“In vain have I struggled. It will not do. My feelings will not be repressed. You must allow me to tell you how ardently I admire and love you.”',
    curiosityHook:
      'The most arrogant confession in literary history, immediately followed by the most savage verbal rejection ever recorded in English prose. Chapter 34 is undefeated.',
    category: 'Literature',
    suggestedPersona: {
      username: 'booktok_binge',
      displayName: 'Classic Drama 🍿',
      avatarColor: '#8B5CF6',
    },
  },

  // Alice's Adventures in Wonderland
  {
    bookKeywords: ['alice', 'wonderland', 'carroll'],
    style: 'question',
    hookBadge: '🐇 Rabbit Hole',
    hookColor: '#0284C7',
    questionOrQuote:
      '“Why is a raven like a writing-desk?” Is going slightly mad the only rational reaction when the real world stops making any sense?',
    curiosityHook:
      'Alice fell down a rabbit hole and discovered every adult in authority is arbitrary, temperamental, and obsessed with bizarre rules. Sounds eerily familiar.',
    category: 'Children & Young Adult',
    suggestedPersona: {
      username: 'cheshire_mind',
      displayName: 'Curiouser & Curiouser',
      avatarColor: '#0EA5E9',
    },
  },

  // Dracula
  {
    bookKeywords: ['dracula', 'bram stoker', 'stoker'],
    style: 'cliffhanger',
    hookBadge: '🩸 Dark Thriller',
    hookColor: '#991B1B',
    questionOrQuote:
      'What happens when the oldest predatory evil in Eastern Europe decides to buy prime real estate right next to your quiet house in London?',
    curiosityHook:
      'Before Hollywood turned him into a cape-wearing cartoon, Bram Stoker wrote Jonathan Harker trapped inside a castle where every door is locked, and the count crawls down the castle wall face-first like a giant lizard.',
    category: 'Fiction',
    suggestedPersona: {
      username: 'gothic_chronicles',
      displayName: 'Gothic Archives',
      avatarColor: '#7F1D1D',
    },
  },

  // The Great Big Treasury of Beatrix Potter
  {
    bookKeywords: ['beatrix potter', 'peter rabbit', 'potter'],
    style: 'question',
    hookBadge: '🥕 The Temptation',
    hookColor: '#15803D',
    questionOrQuote:
      'Peter Rabbit was explicitly told his father had an “accident” in Mr. McGregor’s garden and ended up in a pie. Why was the forbidden blue jacket still worth risking his life?',
    curiosityHook:
      'Beatrix Potter wrote with razor-sharp biological realism disguised as pastoral watercolors. Danger was real, foxes wore waistcoats, and disobedience had immediate consequences.',
    category: 'Children & Young Adult',
    suggestedPersona: {
      username: 'woodland_tales',
      displayName: 'Pastoral Lore',
      avatarColor: '#16A34A',
    },
  },

  // Moby-Dick
  {
    bookKeywords: ['moby-dick', 'moby dick', 'melville'],
    style: 'question',
    hookBadge: '🌊 Obsession',
    hookColor: '#1E40AF',
    questionOrQuote:
      'Is chasing vengeance across the world’s oceans a heroic purpose, or just the longest, most articulate suicide note ever penned?',
    curiosityHook:
      'Ahab wasn’t mad because a white whale bit off his leg. He was mad because the universe didn’t care that he was suffering, and he refused to let God off the hook.',
    category: 'Travel & Places',
    suggestedPersona: {
      username: 'ishmael_speaks',
      displayName: 'Whalebone & Waves',
      avatarColor: '#2563EB',
    },
  },

  // The Adventures of Sherlock Holmes
  {
    bookKeywords: ['sherlock', 'conan doyle', 'baker street'],
    style: 'question',
    hookBadge: '🔍 Logic & Mind',
    hookColor: '#4F46E5',
    questionOrQuote:
      '“When you have eliminated the impossible, whatever remains, however improbable, must be the truth.” But what if you don’t like the truth?',
    curiosityHook:
      'The genius of Holmes wasn’t superhuman vision—it was that everyone else looked, but nobody actually *observed*. A Scandal in Bohemia will rewire how you notice details.',
    category: 'Fiction',
    suggestedPersona: {
      username: 'baker_street_221b',
      displayName: 'The Sleuth File',
      avatarColor: '#6366F1',
    },
  },

  // The Strange Case of Dr. Jekyll and Mr. Hyde
  {
    bookKeywords: ['jekyll', 'mr. hyde', 'stevenson'],
    style: 'question',
    hookBadge: '🧪 Dual Soul',
    hookColor: '#7C3AED',
    questionOrQuote:
      'What if the darkest, cruellest version of your personality wasn’t an intrusive thought, but a person waiting in the dark to take your place?',
    curiosityHook:
      'Dr. Jekyll didn’t invent the potion to become evil. He invented it so he could indulge his worst vices without ruining his spotless Victorian reputation. The hypocrisy is the real poison.',
    category: 'Fiction',
    suggestedPersona: {
      username: 'shadow_self',
      displayName: 'Psychology of Fear',
      avatarColor: '#9333EA',
    },
  },

  // Meditations by Marcus Aurelius
  {
    bookKeywords: ['meditations', 'marcus aurelius', 'aurelius'],
    style: 'modern_parallel',
    hookBadge: '🏛️ Stoic Armor',
    hookColor: '#047857',
    questionOrQuote:
      '“You have power over your mind—not outside events. Realize this, and you will find strength.”',
    curiosityHook:
      'Written by the most powerful man on earth by candlelight on a Roman military frontier, not for an audience, but to remind himself not to let irritating colleagues ruin his peace of mind.',
    category: 'Philosophy',
    suggestedPersona: {
      username: 'stoic_notes',
      displayName: 'The Emperor’s Journal',
      avatarColor: '#059669',
    },
  },

  // Jane Eyre
  {
    bookKeywords: ['jane eyre', 'charlotte brontë', 'bronte'],
    style: 'cliffhanger',
    hookBadge: '🕯️ Fierce Will',
    hookColor: '#B45309',
    questionOrQuote:
      '“I am no bird; and no net ensnares me: I am a free human being with an independent will.”',
    curiosityHook:
      'She had no family, no fortune, no physical protection, and was offered all the luxury in the world to become Rochester’s mistress. And she walked out into the cold night with nothing instead.',
    category: 'Fiction',
    suggestedPersona: {
      username: 'thornfield_hall',
      displayName: 'Gothic Resilience',
      avatarColor: '#D97706',
    },
  },

  // The Time Machine
  {
    bookKeywords: ['time machine', 'h. g. wells', 'wells'],
    style: 'question',
    hookBadge: '⏳ Future Shock',
    hookColor: '#C026D3',
    questionOrQuote:
      'If you leaped eight hundred thousand years into the future, would humanity have conquered the stars—or split into predators and cattle?',
    curiosityHook:
      'The Time Traveller stepped into year 802,701 expecting paradise. What he found in the subterranean dark under the singing gardens will make your stomach drop.',
    category: 'Science & Technology',
    suggestedPersona: {
      username: 'fourth_dimension',
      displayName: 'Chronos Vault',
      avatarColor: '#D946EF',
    },
  },

  // Metamorphosis
  {
    bookKeywords: ['metamorphosis', 'franz kafka', 'kafka'],
    style: 'hot_take',
    hookBadge: '🪲 Kafkaesque',
    hookColor: '#475569',
    questionOrQuote:
      'Gregor Samsa woke up transformed into a giant insect, and his first panicked thought wasn’t terror—it was “how am I going to explain being late to my boss?”',
    curiosityHook:
      'The most painfully accurate metaphor for corporate burnout and conditional family love ever penned. You aren’t tired; you’re just turning into a beetle.',
    category: 'Fiction',
    suggestedPersona: {
      username: 'existential_crisis',
      displayName: 'Late Night Kafka',
      avatarColor: '#64748B',
    },
  },

  // A Tale of Two Cities
  {
    bookKeywords: ['tale of two cities', 'dickens'],
    style: 'cliffhanger',
    hookBadge: '⚔️ Sacrifice',
    hookColor: '#9F1239',
    questionOrQuote:
      '“It is a far, far better thing that I do, than I have ever done; it is a far, far better rest that I go to than I have ever known.”',
    curiosityHook:
      'Sydney Carton was an alcoholic cynic who felt his entire life had been completely wasted. The final five pages of this book will wreck you for a week.',
    category: 'Literature',
    suggestedPersona: {
      username: 'paris_1789',
      displayName: 'Revolution & Redemption',
      avatarColor: '#BE123C',
    },
  },
];

// ── Dynamic Hook Generator for ANY other Catalog Book ──────────────────────────

/**
 * Generates an irresistible Curiosity Hook / Question for any book
 * based on its title, author, genre, and description.
 */
export function synthesizeDynamicBookHook(
  book: Book,
  indexSeed: number,
): CuratedBookHook {
  const cat = book.category?.toLowerCase() || '';

  const isPhilosophy = cat.includes('philosophy') || cat.includes('thought');
  const isSciFi = cat.includes('science') || cat.includes('future') || cat.includes('tech');
  const isAdventure = cat.includes('travel') || cat.includes('adventure');
  const isPoetry = cat.includes('poetry') || cat.includes('poem');
  const isYoungAdult = cat.includes('children') || cat.includes('young');

  const templates: {
    badge: string;
    color: string;
    question: string;
    hook: string;
  }[] = [];

  if (isPhilosophy) {
    templates.push(
      {
        badge: '🏛️ Big Question',
        color: '#2D6A4F',
        question: `What question about human existence was ${book.author} trying to solve in “${book.title}”?`,
        hook: `Written without vanity or corporate jargon—just pure, concentrated human perspective that outlived centuries of trends. Chapter 1 cuts right to the heart of the matter.`,
      },
      {
        badge: '⚡ Truth Bomb',
        color: '#D97706',
        question: `Are your opinions truly your own, or are you just echoing what society conditioned you to believe?`,
        hook: `“${book.title}” forces you into a mirror where excuses don’t work anymore. If you love philosophical clarity, don't sleep on this title.`,
      },
    );
  } else if (isSciFi) {
    templates.push(
      {
        badge: '🔬 Future Mystery',
        color: '#4338CA',
        question: `When technology leaps past human wisdom, who pays the ultimate price?`,
        hook: `“${book.title}” by ${book.author} saw the future coming from a mile away. The premise alone will keep your mind spinning for days.`,
      },
      {
        badge: '🌌 Mind Bender',
        color: '#7C3AED',
        question: `What if the universe isn’t stranger than we suppose, but stranger than we *can* suppose?`,
        hook: `An unforgettable journey into discovery and consequence. Start reading Chapter 1 and see why this classic inspired entire generations of innovators.`,
      },
    );
  } else if (isAdventure) {
    templates.push(
      {
        badge: '🧭 Uncharted',
        color: '#1D4ED8',
        question: `How far from home do you have to travel before you actually discover who you are?`,
        hook: `“${book.title}” isn't just about the miles traveled—it's about surviving when every map runs out and instinct is all that's left.`,
      },
    );
  } else if (isPoetry) {
    templates.push(
      {
        badge: '🪶 Soul Verse',
        color: '#9333EA',
        question: `Can words written in another century speak the exact sorrow you felt this morning?`,
        hook: `“${book.title}” by ${book.author} captures the quiet, ache-inducing resonance that ordinary conversation never quite reaches.`,
      },
    );
  } else if (isYoungAdult) {
    templates.push(
      {
        badge: '✨ Whimsical Spark',
        color: '#059669',
        question: `When was the last time a story made you forget the noise of the adult world?`,
        hook: `“${book.title}” holds that rare magic where every sentence feels warm, playful, and completely unpretentious. Perfect for reading aloud.`,
      },
    );
  } else {
    // Fiction / General Literature
    templates.push(
      {
        badge: '🔥 The Dilemma',
        color: '#B91C1C',
        question: `What would you sacrifice if your deepest hidden desire was offered to you right now?`,
        hook: `In “${book.title}”, ${book.author} strips away polite social masks to reveal human nature at its most electric, desperate, and true.`,
      },
      {
        badge: '👁️ The Hook',
        color: '#BE185D',
        question: `Can you ever truly forgive someone who saw your weakness and used it against you?`,
        hook: `The opening pages of “${book.title}” set up a collision course you can feel in your bones. Once you start Chapter 1, you won't want to put it down.`,
      },
      {
        badge: '🌙 2 AM Thought',
        color: '#4338CA',
        question: `Why do the most enduring stories always begin with someone making a terrible, beautiful mistake?`,
        hook: `Dive into “${book.title}” and listen or read along as the consequences unfold chapter by chapter.`,
      },
    );
  }

  const chosen = templates[indexSeed % templates.length];

  const personas = [
    { username: 'curious_cortex', displayName: 'Curious Cortex 🧠', avatarColor: '#6366F1' },
    { username: 'bookish_breeze', displayName: 'Bookish Breeze 🍃', avatarColor: '#059669' },
    { username: 'midnight_reads', displayName: 'The Midnight Reader 🌙', avatarColor: '#8B5CF6' },
    { username: 'literary_pulse', displayName: 'Literary Pulse ⚡', avatarColor: '#EC4899' },
    { username: 'classic_rebel', displayName: 'The Classic Rebel ☕', avatarColor: '#D97706' },
  ];

  return {
    bookKeywords: [book.title.toLowerCase()],
    style: 'question',
    hookBadge: chosen.badge,
    hookColor: chosen.color,
    questionOrQuote: chosen.question,
    curiosityHook: chosen.hook,
    category: book.category || 'Literature',
    suggestedPersona: personas[indexSeed % personas.length],
  };
}

