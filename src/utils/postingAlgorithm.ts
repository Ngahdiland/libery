import type { ThreadPostData } from '../components/ThreadPostCard';
import type { Book } from '../data/books';
import {
  CURATED_BOOK_HOOKS,
  synthesizeDynamicBookHook,
  type CuratedBookHook,
} from './bookHooks';

export type UserTasteProfile = {
  userId?: string;
  focusAreas?: string[];
  languages?: string[];
  favoriteCategories?: string[];
  favoriteAuthors?: string[];
};

type PostingAlgorithmInput = {
  allBooks: Book[];
  userProfile?: UserTasteProfile;
  libraryItems?: {
    book: Pick<Book, 'id' | 'category' | 'author'> & { tags?: string[] };
    status: 'reading' | 'want_to_read' | 'finished';
    isFavorite: boolean;
    progress: number;
  }[];
  selectedMood?: string;
  refreshSeed: number;
  limit?: number;
};

// ── Book Readability Filter ───────────────────────────────────────────────────

/**
 * Validates whether a book has full plain-text chapter content inserted
 * and ready for immediate in-app reading & narration.
 */
export function isBookReadableInApp(book: Book): boolean {
  return (
    book.availability === 'in_app_text' ||
    (typeof book.totalChapters === 'number' && book.totalChapters > 0)
  );
}

// ── Deterministic LCG Pseudo-Random Generator with Salt ───────────────────────

export function seededRandom(seed: number, salt: string): number {
  let hash = seed & 0x7fffffff;
  for (let i = 0; i < salt.length; i++) {
    hash = (hash * 31 + salt.charCodeAt(i)) & 0x7fffffff;
  }
  hash = (hash * 16807 + 1) & 0x7fffffff;
  return (hash & 0x7fffffff) / 0x7fffffff;
}

// ── The Posting Algorithm: Curated Hooks & Curiosity Synthesizer ───────────────

export function generatePersonalizedPostFeed({
  allBooks,
  userProfile,
  libraryItems = [],
  selectedMood,
  refreshSeed,
  limit = 15,
}: PostingAlgorithmInput): ThreadPostData[] {
  if (!allBooks || allBooks.length === 0) return [];

  // Strictly filter to books that have full text and chapters inserted
  const readableBooks = allBooks.filter(isBookReadableInApp);
  const targetCatalog = readableBooks.length > 0 ? readableBooks : allBooks;

  const focusAreas = userProfile?.focusAreas || [];
  const userSalt = userProfile?.userId || 'guest';

  // 1. Calculate category and author affinity scores from user behavior
  const categoryWeights: Record<string, number> = {};
  const authorWeights: Record<string, number> = {};

  for (const focus of focusAreas) {
    const key = focus.toLowerCase();
    categoryWeights[key] = (categoryWeights[key] ?? 0) + 15;
  }

  for (const item of libraryItems) {
    const cat = item.book.category?.toLowerCase() || '';
    const author = item.book.author?.toLowerCase() || '';

    if (item.isFavorite) {
      categoryWeights[cat] = (categoryWeights[cat] ?? 0) + 25;
      authorWeights[author] = (authorWeights[author] ?? 0) + 30;
    }
    if (item.status === 'reading') {
      categoryWeights[cat] = (categoryWeights[cat] ?? 0) + 12;
      authorWeights[author] = (authorWeights[author] ?? 0) + 18;
    }
    if (item.status === 'finished') {
      categoryWeights[cat] = (categoryWeights[cat] ?? 0) + 8;
    }
  }

  // 2. Score and probabilistically jitter every book based on user taste + refreshSeed
  const scoredCatalog = targetCatalog.map((book) => {
    let score = 0;
    const cat = book.category?.toLowerCase() || '';
    const author = book.author?.toLowerCase() || '';

    if (categoryWeights[cat]) score += categoryWeights[cat];
    if (authorWeights[author]) score += authorWeights[author];

    // Priority bonus for books that are already fully ingested in-app
    if (isBookReadableInApp(book)) {
      score += 40;
    }

    // Rating boost
    score += (book.rating || 4.5) * 2;

    // Filter by selected mood if applicable
    if (selectedMood && selectedMood !== 'All') {
      const moodLower = selectedMood.toLowerCase();
      if (cat.includes(moodLower) || (book.tags || []).some((t) => t.toLowerCase().includes(moodLower))) {
        score += 20;
      }
    }

    // Apply seed-based jitter so every pull-to-refresh gives a fresh, dynamic ordering
    // while still strongly prioritizing the user's favorite topics!
    const jitter = (seededRandom(refreshSeed, `${userSalt}_${book.id}`) - 0.5) * 16;
    const finalScore = Math.max(0, score + jitter);

    return { book, score: finalScore };
  });

  // Sort descending by jittered score
  scoredCatalog.sort((a, b) => b.score - a.score);

  // Take top candidates
  const candidateBooks = scoredCatalog.slice(0, Math.max(limit * 2, 30)).map((s) => s.book);

  // 3. Match each candidate book to a curated hook or synthesize a dynamic one
  const posts: ThreadPostData[] = [];
  const usedHookKeys = new Set<string>();

  for (let i = 0; i < candidateBooks.length && posts.length < limit; i++) {
    const book = candidateBooks[i];
    const titleLower = book.title.toLowerCase();
    const authorLower = book.author.toLowerCase();

    // Find any curated hooks matching this book
    const matchingCurated = CURATED_BOOK_HOOKS.filter((h) =>
      h.bookKeywords.some((kw) => titleLower.includes(kw) || authorLower.includes(kw)),
    );

    let chosenHook: CuratedBookHook;

    if (matchingCurated.length > 0) {
      // Pick one deterministically from the matching hooks using the refresh seed
      const pickIndex = Math.floor(
        seededRandom(refreshSeed, `hook_${book.id}_${i}`) * matchingCurated.length,
      );
      chosenHook = matchingCurated[pickIndex];
    } else {
      // Synthesize an irresistible question / cliffhanger for this book
      chosenHook = synthesizeDynamicBookHook(book, refreshSeed + i);
    }

    const hookKey = chosenHook.questionOrQuote.slice(0, 40);
    if (usedHookKeys.has(hookKey)) continue;
    usedHookKeys.add(hookKey);

    // Randomize dynamic engagement numbers consistent with the seed
    const baseLikes = Math.floor(80 + seededRandom(refreshSeed, `likes_${book.id}`) * 450);
    const baseComments = Math.floor(12 + seededRandom(refreshSeed, `cmts_${book.id}`) * 65);
    const baseReposts = Math.round(baseLikes * 0.22);
    const baseShares = Math.round(baseLikes * 0.1);

    const timeOptions = ['18m', '42m', '1h', '2h', '3h', '5h', '8h', '1d'];
    const timeAgo = timeOptions[Math.floor(seededRandom(refreshSeed, `time_${book.id}`) * timeOptions.length)];

    // Format rich post content with Curiosity Gap, provocative question, and book context
    const formattedContent = `${chosenHook.hookBadge}\n\n“${chosenHook.questionOrQuote}”\n\n${chosenHook.curiosityHook}`;

    posts.push({
      id: `hook-post-${book.id}-${refreshSeed}-${i}`,
      user: {
        username: chosenHook.suggestedPersona.username,
        displayName: chosenHook.suggestedPersona.displayName,
        avatarColor: chosenHook.suggestedPersona.avatarColor,
        isVerified: true,
      },
      timeAgo,
      content: formattedContent,
      book,
      likesCount: baseLikes,
      commentsCount: baseComments,
      repostsCount: baseReposts,
      sharesCount: baseShares,
    });
  }

  return posts;
}
