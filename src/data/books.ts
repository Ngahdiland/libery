export type Book = {
  id: string;
  title: string;
  author: string;
  provider: string;
  description: string;
  category: string;
  language: string;
  pages: number;
  rating: number;
  reviews: number;
  ageRating: string;
  coverColors: [string, string];
  progress?: number;
  readingTime?: string;
};

export const books: Book[] = [
  {
    id: 'the-garden-of-mirrors',
    title: 'The Garden of Mirrors',
    author: 'Lina Njeri',
    provider: 'Nairobi Press',
    description: 'A lyrical fiction novel about memory, migration, and the quiet courage of rebuilding home.',
    category: 'Fiction',
    language: 'English',
    pages: 312,
    rating: 4.8,
    reviews: 1240,
    ageRating: 'Teen',
    coverColors: ['#1E8E5A', '#8AD8AE'],
    progress: 62,
    readingTime: '3h 12m left',
  },
  {
    id: 'the-future-in-our-hands',
    title: 'The Future in Our Hands',
    author: 'Amina Diallo',
    provider: 'Civic Works',
    description: 'Business and community thinking for young leaders who want to build resilient futures.',
    category: 'Business',
    language: 'French',
    pages: 224,
    rating: 4.6,
    reviews: 840,
    ageRating: 'Adult',
    coverColors: ['#0F5A38', '#5CCF8B'],
    progress: 48,
    readingTime: '2h 20m left',
  },
  {
    id: 'moonlit-letters',
    title: 'Moonlit Letters',
    author: 'Rafael Costa',
    provider: 'Forklight Studio',
    description: 'An intimate coming-of-age story exploring friendship, faith, and the bravery to start over.',
    category: 'Young Adult',
    language: 'English',
    pages: 286,
    rating: 4.7,
    reviews: 960,
    ageRating: 'Teen',
    coverColors: ['#1B3F5C', '#7EC6E8'],
  },
  {
    id: 'roots-of-kindness',
    title: 'Roots of Kindness',
    author: 'Béatrice Ndaya',
    provider: 'Mimosa Library',
    description: 'A practical guide to emotional resilience and daily habits for calmer, kinder living.',
    category: 'Self-development',
    language: 'French',
    pages: 198,
    rating: 4.9,
    reviews: 1820,
    ageRating: 'Adult',
    coverColors: ['#1A5C3C', '#A8E6C3'],
  },
  {
    id: 'little-echoes',
    title: 'Little Echoes',
    author: 'Tariq Bensaid',
    provider: 'Story Grove',
    description: 'A warm picture-book-inspired adventure for curious children learning to listen and care.',
    category: 'Kids',
    language: 'English',
    pages: 104,
    rating: 4.5,
    reviews: 420,
    ageRating: 'Kids',
    coverColors: ['#D36F35', '#F7D29C'],
  },
];
