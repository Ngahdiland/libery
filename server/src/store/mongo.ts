import { MongoClient, ObjectId, type Collection, type Filter } from 'mongodb';

import type {
  AgeGroup,
  AppStore,
  Book,
  AdminAuditEvent,
  Chapter,
  ChapterSummary,
  CommunityPost,
  CreateCommunityPostInput,
  LibraryBook,
  LibraryStatus,
  PublicBook,
  ReadingProgress,
  RefreshSession,
  UserPreferences,
  UserProfileUpdates,
  UserRecord,
  ProviderStatus,
} from '../types.js';

// ── Document shapes (MongoDB internal) ──────────────────────────────────────

type UserDocument = Omit<UserRecord, 'id'> & { _id: ObjectId };
type RefreshDocument = RefreshSession & { _id?: ObjectId };
type BookDocument = Omit<Book, 'id'> & { _id: ObjectId };
type AuditDocument = AdminAuditEvent & { _id?: ObjectId };
type LibraryDocument = {
  userId: string;
  bookId: string;
  status: LibraryStatus;
  progress: number;
  isFavorite: boolean;
  updatedAt: Date;
};
type PostDocument = {
  _id: ObjectId;
  userId: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  content: string;
  bookId?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
};

/** Stored shape for a book chapter (text stored as-is, no chunking in the DB). */
type ChapterDocument = {
  _id: ObjectId;
  bookId: string;
  chapterNumber: number;
  title: string;
  text: string;
  wordCount: number;
  audioUrl?: string;
};

/** Stored shape for a user's reading position in a book. */
type ProgressDocument = {
  _id?: ObjectId;
  userId: string;
  bookId: string;
  chapterNumber: number;
  textPosition: number;
  audioPositionSeconds: number;
  updatedAt: Date;
};

// ── Mapper helpers ───────────────────────────────────────────────────────────

function toUser(document: UserDocument): UserRecord {
  const { _id, ...user } = document;
  return { ...user, id: _id.toHexString() };
}

function toPublicBook(document: BookDocument): PublicBook {
  const { _id, status: _status, providerId: _providerId, rightsConfirmed: _rightsConfirmed, ...book } = document;
  return { ...book, id: _id.toHexString() };
}

function toBook(document: BookDocument): Book {
  const { _id, ...book } = document;
  return { ...book, id: _id.toHexString() };
}

function toChapterSummary(document: ChapterDocument): ChapterSummary {
  const { _id, text: _text, ...rest } = document;
  return { ...rest, id: _id.toHexString() };
}

function toChapter(document: ChapterDocument): Chapter {
  const { _id, ...rest } = document;
  return { ...rest, id: _id.toHexString() };
}

function toProgress(document: ProgressDocument): ReadingProgress {
  const { _id: _, ...rest } = document;
  return rest;
}

// ── Book filter builder ──────────────────────────────────────────────────────

function makeBookFilter(filter: {
  ageGroup: AgeGroup;
  languages: string[];
  category?: string;
  language?: string;
  query?: string;
}): Filter<BookDocument> {
  const allowedRatings: Book['ageRating'][] = filter.ageGroup === 'kids'
    ? ['Kids']
    : filter.ageGroup === 'teens'
      ? ['Kids', 'Teen']
      : ['Kids', 'Teen', 'Adult'];

  const conditions: Filter<BookDocument>[] = [
    { status: 'published' },
    { ageRating: { $in: allowedRatings } },
    { language: { $in: filter.languages } },
  ];

  if (filter.category) conditions.push({ categories: filter.category });
  if (filter.language) conditions.push({ language: filter.language });
  if (filter.query) conditions.push({ $text: { $search: filter.query } });
  return { $and: conditions };
}

// ── MongoStore ───────────────────────────────────────────────────────────────

export class MongoStore implements AppStore {
  private constructor(
    private readonly client: MongoClient,
    private readonly users: Collection<UserDocument>,
    private readonly refreshSessions: Collection<RefreshDocument>,
    private readonly books: Collection<BookDocument>,
    private readonly auditEvents: Collection<AuditDocument>,
    private readonly library: Collection<LibraryDocument>,
    private readonly posts: Collection<PostDocument>,
    private readonly chapters: Collection<ChapterDocument>,
    private readonly readingProgress: Collection<ProgressDocument>,
  ) {}

  static async connect(uri: string, dbName: string, isProduction = false) {
    const client = new MongoClient(uri, {
      appName: 'libery-api',
      maxPoolSize: 20,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      ...(isProduction ? { tls: true } : { tlsAllowInvalidCertificates: true }),
    });
    await client.connect();
    const db = client.db(dbName);
    const store = new MongoStore(
      client,
      db.collection<UserDocument>('users'),
      db.collection<RefreshDocument>('refresh_sessions'),
      db.collection<BookDocument>('books'),
      db.collection<AuditDocument>('admin_audit_events'),
      db.collection<LibraryDocument>('user_library'),
      db.collection<PostDocument>('community_posts'),
      db.collection<ChapterDocument>('chapters'),
      db.collection<ProgressDocument>('reading_progress'),
    );
    await store.ensureIndexes();
    return store;
  }

  private async ensureIndexes() {
    await Promise.all([
      // Users
      this.users.createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' }),
      this.users.createIndex({ username: 1 }, { unique: true, name: 'users_username_unique' }),
      this.users.createIndex({ role: 1, providerStatus: 1 }, { name: 'users_provider_status' }),
      // Audit
      this.auditEvents.createIndex({ createdAt: -1 }, { name: 'admin_audit_created_at' }),
      // Library
      this.library.createIndex({ userId: 1, bookId: 1 }, { unique: true, name: 'user_library_book_unique' }),
      this.library.createIndex({ userId: 1, updatedAt: -1 }, { name: 'user_library_updated_at' }),
      // Refresh sessions
      this.refreshSessions.createIndex({ tokenHash: 1 }, { unique: true, name: 'refresh_token_unique' }),
      this.refreshSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'refresh_expiry_ttl' }),
      this.refreshSessions.createIndex({ userId: 1 }, { name: 'refresh_user_id' }),
      // Books
      this.books.createIndex({ status: 1, ageRating: 1, language: 1, _id: -1 }, { name: 'books_catalog_filter' }),
      this.books.createIndex({ providerId: 1, _id: -1 }, { name: 'books_provider_id' }),
      this.books.createIndex({ providerId: 1, title: 1 }, { unique: true, name: 'books_provider_title_unique' }),
      this.books.createIndex(
        { title: 'text', authors: 'text', provider: 'text', categories: 'text', tags: 'text' },
        { name: 'books_catalog_search' },
      ),
      // Community posts
      this.posts.createIndex({ createdAt: -1 }, { name: 'posts_created_at' }),
      this.posts.createIndex({ userId: 1, createdAt: -1 }, { name: 'posts_user_created' }),
      // Chapters — compound index on bookId + chapterNumber (the primary query pattern)
      this.chapters.createIndex(
        { bookId: 1, chapterNumber: 1 },
        { unique: true, name: 'chapters_book_chapter_unique' },
      ),
      // Reading progress — one record per user+book, quickly updated
      this.readingProgress.createIndex(
        { userId: 1, bookId: 1 },
        { unique: true, name: 'progress_user_book_unique' },
      ),
    ]);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async findUserByEmail(email: string) {
    const user = await this.users.findOne({ email });
    return user ? toUser(user) : null;
  }

  async findUserByUsername(username: string) {
    const user = await this.users.findOne({ username });
    return user ? toUser(user) : null;
  }

  async findUserById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    const user = await this.users.findOne({ _id: new ObjectId(id) });
    return user ? toUser(user) : null;
  }

  async createUser(input: Omit<UserRecord, 'id'>) {
    const document: UserDocument = { ...input, _id: new ObjectId() };
    await this.users.insertOne(document);
    return toUser(document);
  }

  async updateUserPreferences(id: string, preferences: UserPreferences) {
    if (!ObjectId.isValid(id)) return null;
    const result = await this.users.findOneAndUpdate(
      { _id: new ObjectId(id), status: 'active' },
      { $set: preferences },
      { returnDocument: 'after' },
    );
    return result ? toUser(result) : null;
  }

  async updateUserProfile(id: string, updates: UserProfileUpdates) {
    if (!ObjectId.isValid(id)) return null;
    const result = await this.users.findOneAndUpdate(
      { _id: new ObjectId(id), status: 'active' },
      { $set: updates },
      { returnDocument: 'after' },
    );
    return result ? toUser(result) : null;
  }

  // ── Community posts ────────────────────────────────────────────────────────

  async createCommunityPost(input: CreateCommunityPostInput): Promise<CommunityPost> {
    const doc: Omit<PostDocument, '_id'> = {
      userId: input.userId,
      author: input.author,
      content: input.content,
      bookId: input.bookId,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
    };
    const res = await this.posts.insertOne(doc as any);
    let book: PublicBook | undefined;
    if (input.bookId && ObjectId.isValid(input.bookId)) {
      const bookDoc = await this.books.findOne({ _id: new ObjectId(input.bookId) });
      if (bookDoc) book = toPublicBook(bookDoc);
    }
    return {
      id: res.insertedId.toHexString(),
      userId: doc.userId,
      author: doc.author,
      content: doc.content,
      bookId: doc.bookId,
      book,
      likesCount: doc.likesCount,
      commentsCount: doc.commentsCount,
      createdAt: doc.createdAt,
    };
  }

  async listCommunityPosts(limit = 20): Promise<CommunityPost[]> {
    const docs = await this.posts.find().sort({ createdAt: -1 }).limit(limit).toArray();
    const bookIds = docs.map((d) => d.bookId).filter((id): id is string => Boolean(id && ObjectId.isValid(id)));
    const bookMap = new Map<string, PublicBook>();
    if (bookIds.length > 0) {
      const bookDocs = await this.books.find({ _id: { $in: bookIds.map((id) => new ObjectId(id)) } }).toArray();
      for (const b of bookDocs) {
        bookMap.set(b._id.toHexString(), toPublicBook(b));
      }
    }
    return docs.map((d) => ({
      id: d._id.toHexString(),
      userId: d.userId,
      author: d.author,
      content: d.content,
      bookId: d.bookId,
      book: d.bookId ? bookMap.get(d.bookId) : undefined,
      likesCount: d.likesCount ?? 0,
      commentsCount: d.commentsCount ?? 0,
      createdAt: d.createdAt,
    }));
  }

  async likeCommunityPost(postId: string): Promise<number | null> {
    if (!ObjectId.isValid(postId)) return null;
    const result = await this.posts.findOneAndUpdate(
      { _id: new ObjectId(postId) },
      { $inc: { likesCount: 1 } },
      { returnDocument: 'after' },
    );
    return result ? result.likesCount : null;
  }

  // ── Library ────────────────────────────────────────────────────────────────

  async listLibrary(userId: string, ageGroup: AgeGroup, languages: string[]) {
    const records = await this.library.find({ userId }).sort({ updatedAt: -1 }).toArray();
    const bookIds = records.flatMap((record) => ObjectId.isValid(record.bookId) ? [new ObjectId(record.bookId)] : []);
    if (bookIds.length === 0) return [];

    const filter = makeBookFilter({ ageGroup, languages });
    const books = await this.books.find({ $and: [filter, { _id: { $in: bookIds } }] }).toArray();
    const booksById = new Map(books.map((book) => [book._id.toHexString(), toPublicBook(book)]));
    return records.flatMap((record): LibraryBook[] => {
      const book = booksById.get(record.bookId);
      return book ? [{
        book,
        status: record.status,
        progress: record.progress,
        isFavorite: record.isFavorite,
        updatedAt: record.updatedAt,
      }] : [];
    });
  }

  async updateLibraryItem(
    userId: string,
    bookId: string,
    ageGroup: AgeGroup,
    languages: string[],
    item: Pick<LibraryBook, 'status' | 'progress' | 'isFavorite'>,
  ) {
    if (!ObjectId.isValid(bookId)) return null;
    const filter = makeBookFilter({ ageGroup, languages });
    const document = await this.books.findOne({ $and: [filter, { _id: new ObjectId(bookId) }] });
    if (!document) return null;

    const updatedAt = new Date();
    await this.library.updateOne(
      { userId, bookId },
      { $set: { ...item, updatedAt }, $setOnInsert: { userId, bookId } },
      { upsert: true },
    );
    return { book: toPublicBook(document), ...item, updatedAt };
  }

  async removeLibraryItem(userId: string, bookId: string) {
    await this.library.deleteOne({ userId, bookId });
  }

  // ── Provider / admin ───────────────────────────────────────────────────────

  async updateProviderStatus(id: string, status: ProviderStatus) {
    if (!ObjectId.isValid(id)) return null;
    const result = await this.users.findOneAndUpdate(
      { _id: new ObjectId(id), role: 'provider' },
      { $set: { providerStatus: status } },
      { returnDocument: 'after' },
    );
    return result ? toUser(result) : null;
  }

  async recordAdminAuditEvent(event: AdminAuditEvent) {
    await this.auditEvents.insertOne(event);
  }

  // ── Books ──────────────────────────────────────────────────────────────────

  async createBook(book: Omit<Book, 'id'>) {
    const document: BookDocument = { ...book, _id: new ObjectId() };
    await this.books.insertOne(document);
    return toBook(document);
  }

  async listProviderBooks(providerId: string) {
    if (!ObjectId.isValid(providerId)) return [];
    const documents = await this.books.find({ providerId }).sort({ _id: -1 }).limit(100).toArray();
    return documents.map(toBook);
  }

  async findPublishedBook(id: string, ageGroup: AgeGroup, languages: string[]) {
    if (!ObjectId.isValid(id)) return null;
    const filter = makeBookFilter({ ageGroup, languages });
    const document = await this.books.findOne({ $and: [filter, { _id: new ObjectId(id) }] });
    return document ? toPublicBook(document) : null;
  }

  async listPendingProviders() {
    const documents = await this.users.find({ role: 'provider', providerStatus: 'pending' }).limit(100).toArray();
    return documents.map(toUser);
  }

  async listPendingBooks() {
    const documents = await this.books.find({ status: 'pending_review' }).sort({ _id: -1 }).limit(100).toArray();
    return documents.map(toBook);
  }

  async updateBookStatus(
    id: string,
    status: Book['status'],
    providerId?: string,
    expectedStatus?: Book['status'],
  ) {
    if (!ObjectId.isValid(id)) return false;
    const filter: Filter<BookDocument> = { _id: new ObjectId(id) };
    if (providerId) filter.providerId = providerId;
    if (expectedStatus) filter.status = expectedStatus;
    const result = await this.books.updateOne(filter, { $set: { status } });
    return result.modifiedCount === 1 || result.matchedCount === 1;
  }

  async listBooks(filter: {
    ageGroup: AgeGroup;
    languages: string[];
    category?: string;
    language?: string;
    query?: string;
    limit: number;
    beforeId?: string;
  }) {
    const conditions = [makeBookFilter(filter)];
    if (filter.beforeId && ObjectId.isValid(filter.beforeId)) {
      conditions.push({ _id: { $lt: new ObjectId(filter.beforeId) } });
    }

    const documents = await this.books
      .find({ $and: conditions })
      .sort({ _id: -1 })
      .limit(filter.limit)
      .toArray();
    return documents.map(toPublicBook);
  }

  async countBooks(filter: {
    ageGroup: AgeGroup;
    languages: string[];
    category?: string;
    language?: string;
    query?: string;
  }) {
    return this.books.countDocuments(makeBookFilter(filter));
  }

  // ── Chapters ───────────────────────────────────────────────────────────────

  /**
   * Returns the chapter index (without text) for a book, sorted by chapterNumber.
   * Used to render the chapter list on the Book Details screen.
   */
  async listChapters(bookId: string): Promise<ChapterSummary[]> {
    const docs = await this.chapters
      .find({ bookId }, { projection: { text: 0 } })
      .sort({ chapterNumber: 1 })
      .toArray();
    return docs.map(toChapterSummary);
  }

  /**
   * Returns a single chapter with its full text.
   * Returns null if the chapter does not exist.
   */
  async getChapter(bookId: string, chapterNumber: number): Promise<Chapter | null> {
    const doc = await this.chapters.findOne({ bookId, chapterNumber });
    return doc ? toChapter(doc) : null;
  }

  /**
   * Bulk-upserts chapters from the ingestion pipeline.
   * Uses `updateOne + upsert` keyed on (bookId, chapterNumber) so re-runs are safe.
   */
  async upsertChapters(chapters: Omit<Chapter, 'id'>[]): Promise<void> {
    if (chapters.length === 0) return;
    const ops = chapters.map((chapter) => ({
      updateOne: {
        filter: { bookId: chapter.bookId, chapterNumber: chapter.chapterNumber },
        update: { $set: chapter, $setOnInsert: { _id: new ObjectId() } },
        upsert: true,
      },
    }));
    await this.chapters.bulkWrite(ops as any, { ordered: false });
  }

  // ── Reading progress ───────────────────────────────────────────────────────

  /**
   * Returns the saved reading position for a user+book pair, or null if none exists.
   */
  async getReadingProgress(userId: string, bookId: string): Promise<ReadingProgress | null> {
    const doc = await this.readingProgress.findOne({ userId, bookId });
    return doc ? toProgress(doc) : null;
  }

  /**
   * Upserts the reading position for a user+book pair.
   * Always updates updatedAt so the client can detect staleness.
   */
  async saveReadingProgress(progress: Omit<ReadingProgress, 'updatedAt'>): Promise<ReadingProgress> {
    const updatedAt = new Date();
    await this.readingProgress.updateOne(
      { userId: progress.userId, bookId: progress.bookId },
      {
        $set: {
          chapterNumber: progress.chapterNumber,
          textPosition: progress.textPosition,
          audioPositionSeconds: progress.audioPositionSeconds,
          updatedAt,
        },
        $setOnInsert: { userId: progress.userId, bookId: progress.bookId },
      },
      { upsert: true },
    );
    return { ...progress, updatedAt };
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  async saveRefreshSession(session: RefreshSession) {
    await this.refreshSessions.insertOne(session);
  }

  async consumeRefreshSession(tokenHash: string) {
    const result = await this.refreshSessions.findOneAndDelete({ tokenHash, expiresAt: { $gt: new Date() } });
    return result ?? null;
  }

  async revokeRefreshSession(tokenHash: string) {
    await this.refreshSessions.deleteOne({ tokenHash });
  }

  async close() {
    await this.client.close();
  }
}
