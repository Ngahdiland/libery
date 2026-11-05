export type AgeGroup = 'kids' | 'teens' | 'adults';
export type AccountStatus = 'active' | 'suspended';
export type UserRole = 'reader' | 'provider' | 'admin';
export type ProviderStatus = 'pending' | 'verified' | 'rejected';

export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  ageGroup: AgeGroup;
  focusAreas: string[];
  languages: string[];
  role: UserRole;
  providerName?: string;
  providerStatus?: ProviderStatus;
  status: AccountStatus;
  createdAt: Date;
};

export type UserRecord = User & {
  passwordHash: string;
};

export type Book = {
  id: string;
  providerId: string;
  title: string;
  authors: string[];
  author?: string;
  provider: string;
  description: string;
  categories: string[];
  tags: string[];
  language: string;
  ageRating: 'Kids' | 'Teen' | 'Adult';
  coverImageUrl?: string;
  coverUrl?: string;
  pages?: number;
  ratingAvg: number;
  ratingCount: number;
  access: 'free' | 'paid' | 'subscription';
  priceMinor?: number;
  currency?: 'USD' | 'EUR' | 'XAF';
  rightsConfirmed: boolean;
  availability: 'metadata_only' | 'provider_file' | 'in_app_text';
  sourceName?: string;
  sourceId?: string;
  sourceUrl?: string;
  /** SPDX license identifier or human-readable license name, e.g. "Public Domain" */
  license?: string;
  /** Direct download URL for the source file (always the original source, never hosted by Libery) */
  downloadUrl?: string;
  /** Total number of chapters stored in the chapters collection */
  totalChapters?: number;
  createdAt?: Date;
  status: 'draft' | 'pending_review' | 'published' | 'removed';
};

export type PublicBook = Omit<Book, 'status' | 'providerId' | 'rightsConfirmed'>;

export type LibraryStatus = 'reading' | 'want_to_read' | 'finished';

export type LibraryBook = {
  book: PublicBook;
  status: LibraryStatus;
  progress: number;
  isFavorite: boolean;
  updatedAt: Date;
};

export type RefreshSession = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
};

export type PasswordResetToken = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
};

export type AdminAuditEvent = {
  action: 'provider_verified' | 'provider_rejected' | 'book_published' | 'book_removed';
  targetId: string;
  createdAt: Date;
};

export type UserPreferences = Pick<User, 'ageGroup' | 'focusAreas' | 'languages'>;
export type UserProfileUpdates = Partial<Pick<User, 'displayName' | 'bio' | 'avatarUrl' | 'ageGroup' | 'focusAreas' | 'languages'>>;

export type CommunityPost = {
  id: string;
  userId: string;
  slotKey?: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  content: string;
  bookId?: string;
  book?: PublicBook;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
};

export type CreateCommunityPostInput = {
  userId: string;
  slotKey?: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  content: string;
  bookId?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: Date;
};

/**
 * A single chapter of a book stored in the `chapters` collection.
 * Text is the full plain-text content of the chapter.
 */
export type Chapter = {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  text: string;
  wordCount: number;
  /** URL to a pre-generated audio file; falls back to device TTS when absent */
  audioUrl?: string;
};

/** Chapter index entry — omits the full text, used for the chapter list UI */
export type ChapterSummary = Omit<Chapter, 'text'>;

/**
 * Tracks a reader's position in a book, saved per user+book.
 * chapterNumber is 1-based.
 * textPosition is the character offset within the chapter text (for scroll restoration).
 * audioPositionSeconds is the playback position in the audio player.
 */
export type ReadingProgress = {
  userId: string;
  bookId: string;
  chapterNumber: number;
  textPosition: number;
  audioPositionSeconds: number;
  updatedAt: Date;
};

export interface AppStore {
  // ── Users ──────────────────────────────────────────────────────────────────
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: Omit<UserRecord, 'id'>): Promise<UserRecord>;
  updateUserPreferences(id: string, preferences: UserPreferences): Promise<UserRecord | null>;
  updateUserProfile(id: string, updates: UserProfileUpdates): Promise<UserRecord | null>;

  // ── Community posts ────────────────────────────────────────────────────────
  createCommunityPost(input: CreateCommunityPostInput): Promise<CommunityPost>;
  listCommunityPosts(limit?: number): Promise<CommunityPost[]>;
  likeCommunityPost(postId: string): Promise<number | null>;
  findCommunityPostBySlotKey?(slotKey: string): Promise<CommunityPost | null>;
  listReadableBooks?(): Promise<PublicBook[]>;

  // ── Library ────────────────────────────────────────────────────────────────
  listLibrary(userId: string, ageGroup: AgeGroup, languages: string[]): Promise<LibraryBook[]>;
  updateLibraryItem(
    userId: string,
    bookId: string,
    ageGroup: AgeGroup,
    languages: string[],
    item: Pick<LibraryBook, 'status' | 'progress' | 'isFavorite'>,
  ): Promise<LibraryBook | null>;
  removeLibraryItem(userId: string, bookId: string): Promise<void>;

  // ── Provider / admin ───────────────────────────────────────────────────────
  updateProviderStatus(id: string, status: ProviderStatus): Promise<UserRecord | null>;
  recordAdminAuditEvent(event: AdminAuditEvent): Promise<void>;

  // ── Books ──────────────────────────────────────────────────────────────────
  createBook(book: Omit<Book, 'id'>): Promise<Book>;
  listProviderBooks(providerId: string): Promise<Book[]>;
  findPublishedBook(id: string, ageGroup: AgeGroup, languages: string[]): Promise<PublicBook | null>;
  listPendingProviders(): Promise<UserRecord[]>;
  listPendingBooks(): Promise<Book[]>;
  updateBookStatus(
    id: string,
    status: Book['status'],
    providerId?: string,
    expectedStatus?: Book['status'],
  ): Promise<boolean>;
  listBooks(filter: {
    ageGroup: AgeGroup;
    languages: string[];
    category?: string;
    language?: string;
    query?: string;
    limit: number;
    beforeId?: string;
  }): Promise<PublicBook[]>;
  countBooks(filter: {
    ageGroup: AgeGroup;
    languages: string[];
    category?: string;
    language?: string;
    query?: string;
  }): Promise<number>;

  // ── Chapters ───────────────────────────────────────────────────────────────
  /** Returns the chapter index (no text) for a book, ordered by chapterNumber. */
  listChapters(bookId: string): Promise<ChapterSummary[]>;
  /** Returns a single chapter with full text, or null if not found. */
  getChapter(bookId: string, chapterNumber: number): Promise<Chapter | null>;
  /** Upserts chapters in bulk; used by the ingestion script. */
  upsertChapters(chapters: Omit<Chapter, 'id'>[]): Promise<void>;

  // ── Reading progress ───────────────────────────────────────────────────────
  getReadingProgress(userId: string, bookId: string): Promise<ReadingProgress | null>;
  saveReadingProgress(progress: Omit<ReadingProgress, 'updatedAt'>): Promise<ReadingProgress>;

  // ── Sessions ───────────────────────────────────────────────────────────────
  saveRefreshSession(session: RefreshSession): Promise<void>;
  consumeRefreshSession(tokenHash: string): Promise<RefreshSession | null>;
  revokeRefreshSession(tokenHash: string): Promise<void>;

  close(): Promise<void>;
}
