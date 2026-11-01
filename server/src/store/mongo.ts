import { MongoClient, ObjectId, type Collection, type Filter } from 'mongodb';

import type {
  AgeGroup,
  AppStore,
  Book,
  AdminAuditEvent,
  LibraryBook,
  LibraryStatus,
  PublicBook,
  RefreshSession,
  UserPreferences,
  UserRecord,
  ProviderStatus,
} from '../types.js';

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

export class MongoStore implements AppStore {
  private constructor(
    private readonly client: MongoClient,
    private readonly users: Collection<UserDocument>,
    private readonly refreshSessions: Collection<RefreshDocument>,
    private readonly books: Collection<BookDocument>,
    private readonly auditEvents: Collection<AuditDocument>,
    private readonly library: Collection<LibraryDocument>,
  ) {}

  static async connect(uri: string, dbName: string, tls = false) {
    const client = new MongoClient(uri, {
      appName: 'libery-api',
      maxPoolSize: 20,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      ...(tls ? { tls: true } : {}),
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
    );
    await store.ensureIndexes();
    return store;
  }

  private async ensureIndexes() {
    await Promise.all([
      this.users.createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' }),
      this.users.createIndex({ username: 1 }, { unique: true, name: 'users_username_unique' }),
      this.users.createIndex({ role: 1, providerStatus: 1 }, { name: 'users_provider_status' }),
      this.auditEvents.createIndex({ createdAt: -1 }, { name: 'admin_audit_created_at' }),
      this.library.createIndex({ userId: 1, bookId: 1 }, { unique: true, name: 'user_library_book_unique' }),
      this.library.createIndex({ userId: 1, updatedAt: -1 }, { name: 'user_library_updated_at' }),
      this.refreshSessions.createIndex({ tokenHash: 1 }, { unique: true, name: 'refresh_token_unique' }),
      this.refreshSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'refresh_expiry_ttl' }),
      this.refreshSessions.createIndex({ userId: 1 }, { name: 'refresh_user_id' }),
      this.books.createIndex({ status: 1, ageRating: 1, language: 1, _id: -1 }, { name: 'books_catalog_filter' }),
      this.books.createIndex({ providerId: 1, _id: -1 }, { name: 'books_provider_id' }),
      this.books.createIndex({ providerId: 1, title: 1 }, { unique: true, name: 'books_provider_title_unique' }),
      this.books.createIndex(
        { title: 'text', authors: 'text', provider: 'text', categories: 'text', tags: 'text' },
        { name: 'books_catalog_search' },
      ),
    ]);
  }

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

  async close() {
    await this.client.close();
  }

}
