import type { Book } from '../data/books';
import type { LiteraryQuote } from '../data/quotes';
import { literaryQuotes } from '../data/quotes';
import { seededRandom } from './postingAlgorithm';

type RecommendationInput = {
  allBooks: Book[];
  libraryItems: {
    book: Pick<Book, 'id' | 'category' | 'author'> & { tags?: string[] };
    status: 'reading' | 'want_to_read' | 'finished';
    isFavorite: boolean;
    progress: number;
  }[];
  focusAreas?: string[];
  selectedMood?: string;
  refreshSeed?: number;
  userId?: string;
};

export type RecommendationResult = {
  tailoredPicks: Book[];
  relatedCategoryName: string | null;
  relatedBooks: Book[];
  moodQuotes: LiteraryQuote[];
  topLikedCategory: string | null;
};

export function computeRecommendations({
  allBooks,
  libraryItems,
  focusAreas = [],
  selectedMood,
  refreshSeed = 1,
  userId = 'default_reader',
}: RecommendationInput): RecommendationResult {
  if (!allBooks || allBooks.length === 0) {
    return {
      tailoredPicks: [],
      relatedCategoryName: null,
      relatedBooks: [],
      moodQuotes: literaryQuotes,
      topLikedCategory: null,
    };
  }

  // 1. Build user taste vectors from likes, reading history, and focus areas
  const categoryWeights: Record<string, number> = {};
  const authorWeights: Record<string, number> = {};
  const tagWeights: Record<string, number> = {};

  // Stated focus areas
  for (const focus of focusAreas) {
    const key = focus.toLowerCase();
    categoryWeights[key] = (categoryWeights[key] ?? 0) + 12;
  }

  let topLikedCategory: string | null = null;
  let maxLikedCategoryScore = 0;

  // Interacted / saved library items
  for (const item of libraryItems) {
    const cat = item.book.category.toLowerCase();
    const author = item.book.author.toLowerCase();

    // Favorites give the highest signal
    if (item.isFavorite) {
      categoryWeights[cat] = (categoryWeights[cat] ?? 0) + 20;
      authorWeights[author] = (authorWeights[author] ?? 0) + 25;
      if (categoryWeights[cat] > maxLikedCategoryScore) {
        maxLikedCategoryScore = categoryWeights[cat];
        topLikedCategory = item.book.category;
      }
    }

    // Active reading
    if (item.status === 'reading') {
      categoryWeights[cat] = (categoryWeights[cat] ?? 0) + 10;
      authorWeights[author] = (authorWeights[author] ?? 0) + 15;
    }

    // Finished
    if (item.status === 'finished') {
      categoryWeights[cat] = (categoryWeights[cat] ?? 0) + 8;
    }

    // Tags
    if (Array.isArray(item.book.tags)) {
      for (const tag of item.book.tags) {
        const t = tag.toLowerCase();
        tagWeights[t] = (tagWeights[t] ?? 0) + (item.isFavorite ? 6 : 3);
      }
    }
  }

  // 2. Score every book in catalog with interest weights + refresh seed jitter
  const scoredBooks = allBooks.map((book) => {
    let score = 0;
    const cat = book.category.toLowerCase();
    const author = book.author.toLowerCase();

    // Category affinity
    if (categoryWeights[cat]) {
      score += categoryWeights[cat];
    }

    // Author affinity
    if (authorWeights[author]) {
      score += authorWeights[author];
    }

    // Tag similarity
    if (Array.isArray(book.tags)) {
      for (const tag of book.tags) {
        const t = tag.toLowerCase();
        if (tagWeights[t]) {
          score += tagWeights[t];
        }
      }
    }

    // Base quality bonus (rating + reviews)
    score += (book.rating || 0) * 2;
    if (book.reviews) {
      score += Math.min(Math.log10(book.reviews + 1) * 3, 10);
    }

    // High priority bonus for books with full chapters inserted
    if (book.availability === 'in_app_text' || (book.totalChapters && book.totalChapters > 0)) {
      score += 35;
    }

    // Refresh jitter based on user profile and refresh seed
    const jitter = (seededRandom(refreshSeed, `rec_${userId}_${book.id}`) - 0.5) * 12;
    score += jitter;

    return { book, score };
  });

  // Sort descending by calculated score
  scoredBooks.sort((a, b) => b.score - a.score);

  const tailoredPicks = scoredBooks.slice(0, 10).map((s) => s.book);

  // 3. Find related books to top category with randomized permutation on refresh
  let relatedBooks: Book[] = [];
  if (topLikedCategory) {
    const candidates = allBooks.filter((b) => b.category.toLowerCase() === topLikedCategory?.toLowerCase());
    relatedBooks = [...candidates]
      .sort((a, b) => seededRandom(refreshSeed, `rel_${a.id}`) - seededRandom(refreshSeed, `rel_${b.id}`))
      .slice(0, 8);
  } else if (focusAreas.length > 0) {
    topLikedCategory = focusAreas[0];
    const candidates = allBooks.filter((b) => b.category.toLowerCase() === topLikedCategory?.toLowerCase());
    relatedBooks = [...candidates]
      .sort((a, b) => seededRandom(refreshSeed, `rel_${a.id}`) - seededRandom(refreshSeed, `rel_${b.id}`))
      .slice(0, 8);
  } else if (allBooks.length > 0) {
    topLikedCategory = allBooks[0].category;
    relatedBooks = [...allBooks]
      .sort((a, b) => seededRandom(refreshSeed, `rel_${a.id}`) - seededRandom(refreshSeed, `rel_${b.id}`))
      .slice(0, 8);
  }

  // 4. Select quotes matching selected mood or top user affinity, randomized by seed
  let pool = literaryQuotes;
  if (selectedMood && selectedMood !== 'All') {
    pool = literaryQuotes.filter((q) => q.mood.toLowerCase() === selectedMood.toLowerCase());
  } else if (topLikedCategory) {
    const matching = literaryQuotes.filter(
      (q) => q.category.toLowerCase() === topLikedCategory?.toLowerCase(),
    );
    if (matching.length > 0) {
      pool = [...matching, ...literaryQuotes.filter((q) => !matching.includes(q))];
    }
  }

  // Shuffle quotes with the refresh seed
  const moodQuotes = [...pool].sort(
    (a, b) => seededRandom(refreshSeed, `quote_${a.id}`) - seededRandom(refreshSeed, `quote_${b.id}`),
  );

  return {
    tailoredPicks,
    relatedCategoryName: topLikedCategory,
    relatedBooks,
    moodQuotes,
    topLikedCategory,
  };
}
