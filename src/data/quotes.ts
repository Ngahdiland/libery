export type QuoteMood =
  | 'Fun'
  | 'Educational'
  | 'Philosophical'
  | 'Inspirational'
  | 'Adventurous'
  | 'Poetic';

export type LiteraryQuote = {
  id: string;
  quote: string;
  author: string;
  bookTitle: string;
  category: string;
  mood: QuoteMood;
  moodBadge: string;
  moodColor: string;
  tagline: string;
  likesCount: number;
  commentsCount: number;
};

export const literaryQuotes: LiteraryQuote[] = [
  {
    id: 'quote-1',
    quote: 'To live is the rarest thing in the world. Most people exist, that is all.',
    author: 'Oscar Wilde',
    bookTitle: 'The Picture of Dorian Gray',
    category: 'Fiction',
    mood: 'Fun',
    moodBadge: '✨ Wit & Irony',
    moodColor: '#D97706',
    tagline: 'A sharp, delightful reflection on art, society, and genuine living.',
    likesCount: 142,
    commentsCount: 28,
  },
  {
    id: 'quote-2',
    quote: 'You have power over your mind - not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
    bookTitle: 'Meditations',
    category: 'Philosophy',
    mood: 'Philosophical',
    moodBadge: '🏛️ Stoic Wisdom',
    moodColor: '#2D6A4F',
    tagline: 'Timeless guidance on inner calm, self-mastery, and perspective.',
    likesCount: 310,
    commentsCount: 54,
  },
  {
    id: 'quote-3',
    quote: 'It is not down on any map; true places never are.',
    author: 'Herman Melville',
    bookTitle: 'Moby-Dick',
    category: 'Travel & Places',
    mood: 'Adventurous',
    moodBadge: '🌊 Epic Journey',
    moodColor: '#1D4ED8',
    tagline: 'The thrill of boundless horizons and the uncharted depths of human purpose.',
    likesCount: 185,
    commentsCount: 32,
  },
  {
    id: 'quote-4',
    quote: 'Knowledge is power. The more we observe with care, the further human understanding expands.',
    author: 'Francis Bacon',
    bookTitle: 'The Advancement of Learning',
    category: 'Science & Technology',
    mood: 'Educational',
    moodBadge: '🔬 Curiosity & Mind',
    moodColor: '#4338CA',
    tagline: 'The cornerstone treatise that laid the groundwork for modern scientific thought.',
    likesCount: 224,
    commentsCount: 19,
  },
  {
    id: 'quote-5',
    quote: 'I am not afraid of storms, for I am learning how to sail my ship.',
    author: 'Louisa May Alcott',
    bookTitle: 'Little Women',
    category: 'Children & Young Adult',
    mood: 'Inspirational',
    moodBadge: '🌟 Heart & Courage',
    moodColor: '#B45309',
    tagline: 'A beloved chronicle of sisterhood, resilience, and forging your own destiny.',
    likesCount: 268,
    commentsCount: 41,
  },
  {
    id: 'quote-6',
    quote: 'Hope is the thing with feathers that perches in the soul - and sings the tune without the words.',
    author: 'Emily Dickinson',
    bookTitle: 'Selected Poems',
    category: 'Poetry',
    mood: 'Poetic',
    moodBadge: '🪶 Lyrical Solitude',
    moodColor: '#7C3AED',
    tagline: 'Luminous verse exploring solitude, immortality, and quiet resilience.',
    likesCount: 194,
    commentsCount: 25,
  },
  {
    id: 'quote-7',
    quote: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    author: 'Jane Austen',
    bookTitle: 'Pride and Prejudice',
    category: 'Literature',
    mood: 'Fun',
    moodBadge: '🎩 Sparkling Satire',
    moodColor: '#BE185D',
    tagline: 'A masterclass in character, romance, and societal wit that never grows old.',
    likesCount: 388,
    commentsCount: 67,
  },
  {
    id: 'quote-8',
    quote: 'Whatever our souls are made of, his and mine are the same.',
    author: 'Emily Brontë',
    bookTitle: 'Wuthering Heights',
    category: 'Fiction',
    mood: 'Poetic',
    moodBadge: '🔥 Fierce Passion',
    moodColor: '#9F1239',
    tagline: 'A tempestuous tale of love, obsession, and the untamed Yorkshire moors.',
    likesCount: 215,
    commentsCount: 39,
  },
  {
    id: 'quote-9',
    quote: 'Nature does not hurry, yet everything is accomplished.',
    author: 'Lao Tzu',
    bookTitle: 'Tao Te Ching',
    category: 'Philosophy',
    mood: 'Philosophical',
    moodBadge: '🌿 Calm Balance',
    moodColor: '#047857',
    tagline: 'An ancient spiritual compass pointing toward harmony, humility, and grace.',
    likesCount: 276,
    commentsCount: 48,
  },
  {
    id: 'quote-10',
    quote: 'There is nothing like looking, if you want to find something. You certainly usually find something, if you look.',
    author: 'J.R.R. Tolkien',
    bookTitle: 'The Hobbit',
    category: 'Children & Young Adult',
    mood: 'Fun',
    moodBadge: '🗝️ Whimsical Quest',
    moodColor: '#059669',
    tagline: 'An endearing reminder that great adventures often begin with an unexpected step.',
    likesCount: 345,
    commentsCount: 52,
  },
];
