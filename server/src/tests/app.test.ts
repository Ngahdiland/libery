import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../app.js';
import type { AppConfig } from '../config.js';
import type { AdminAuditEvent, AppStore, Book, Chapter, ChapterSummary, CommunityPost, CreateCommunityPostInput, LibraryBook, PublicBook, ReadingProgress, RefreshSession, UserPreferences, UserProfileUpdates, UserRecord, ProviderStatus } from '../types.js';
import { selectCatalogRows, toCatalogBook } from '../import-gutenberg.js';

class MemoryStore implements AppStore {
  users = new Map<string, UserRecord>();
  refreshSessions = new Map<string, RefreshSession>();
  books = new Map<string, Book>();
  library = new Map<string, LibraryBook>();
  posts = new Map<string, CommunityPost>();
  chapters = new Map<string, Chapter>(); // key: `${bookId}:${chapterNumber}`
  progress = new Map<string, ReadingProgress>(); // key: `${userId}:${bookId}`
  auditEvents: AdminAuditEvent[] = [];
  private nextId = 1;

  private makeId() {
    return String(this.nextId++).padStart(24, '0');
  }

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findUserByUsername(username: string) {
    return [...this.users.values()].find((user) => user.username === username) ?? null;
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async createUser(input: Omit<UserRecord, 'id'>) {
    const user = { ...input, id: this.makeId() };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserPreferences(id: string, preferences: UserPreferences) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...preferences };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserProfile(id: string, updates: UserProfileUpdates) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async createCommunityPost(input: CreateCommunityPostInput) {
    const book = input.bookId ? this.books.get(input.bookId) : undefined;
    const post: CommunityPost = {
      id: this.makeId(),
      userId: input.userId,
      author: input.author,
      content: input.content,
      bookId: input.bookId,
      book: book ? {
        id: book.id,
        title: book.title,
        authors: book.authors,
        provider: book.provider,
        description: book.description,
        categories: book.categories,
        tags: book.tags,
        language: book.language,
        ageRating: book.ageRating,
        coverImageUrl: book.coverImageUrl,
        pages: book.pages,
        ratingAvg: book.ratingAvg,
        ratingCount: book.ratingCount,
        access: book.access,
        priceMinor: book.priceMinor,
        currency: book.currency,
        availability: book.availability,
        sourceName: book.sourceName,
        sourceId: book.sourceId,
        sourceUrl: book.sourceUrl,
      } : undefined,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
    };
    this.posts.set(post.id, post);
    return post;
  }

  async listCommunityPosts(limit = 20) {
    return [...this.posts.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async likeCommunityPost(postId: string) {
    const post = this.posts.get(postId);
    if (!post) return null;
    post.likesCount += 1;
    return post.likesCount;
  }

  async listLibrary(userId: string, ageGroup: 'kids' | 'teens' | 'adults', languages: string[]) {
    return [...this.library.entries()]
      .filter(([key]) => key.startsWith(`${userId}:`))
      .map(([, item]) => item)
      .filter(({ book }) => {
        const allowed = ageGroup === 'kids' ? ['Kids'] : ageGroup === 'teens' ? ['Kids', 'Teen'] : ['Kids', 'Teen', 'Adult'];
        return allowed.includes(book.ageRating) && languages.includes(book.language);
      });
  }

  async updateLibraryItem(
    userId: string,
    bookId: string,
    ageGroup: 'kids' | 'teens' | 'adults',
    languages: string[],
    item: Pick<LibraryBook, 'status' | 'progress' | 'isFavorite'>,
  ) {
    const book = this.books.get(bookId);
    const allowed = ageGroup === 'kids' ? ['Kids'] : ageGroup === 'teens' ? ['Kids', 'Teen'] : ['Kids', 'Teen', 'Adult'];
    if (!book || book.status !== 'published' || !allowed.includes(book.ageRating) || !languages.includes(book.language)) return null;
    const saved: LibraryBook = {
      book: this.toPublicBook(book),
      ...item,
      updatedAt: new Date(),
    };
    this.library.set(`${userId}:${bookId}`, saved);
    return saved;
  }

  async removeLibraryItem(userId: string, bookId: string) {
    this.library.delete(`${userId}:${bookId}`);
  }

  async updateProviderStatus(id: string, status: ProviderStatus) {
    const user = this.users.get(id);
    if (!user || user.role !== 'provider') return null;
    const updated = { ...user, providerStatus: status };
    this.users.set(id, updated);
    return updated;
  }

  async recordAdminAuditEvent(event: AdminAuditEvent) {
    this.auditEvents.push(event);
  }

  async createBook(input: Omit<Book, 'id'>) {
    const book = { ...input, id: this.makeId() };
    this.books.set(book.id, book);
    return book;
  }

  async listProviderBooks(providerId: string) {
    return [...this.books.values()].filter((book) => book.providerId === providerId);
  }

  async findPublishedBook(id: string, ageGroup: 'kids' | 'teens' | 'adults', languages: string[]) {
    const book = this.books.get(id);
    const allowedRatings = ageGroup === 'kids' ? ['Kids'] : ageGroup === 'teens' ? ['Kids', 'Teen'] : ['Kids', 'Teen', 'Adult'];
    if (!book || book.status !== 'published' || !allowedRatings.includes(book.ageRating) || !languages.includes(book.language)) return null;
    return this.toPublicBook(book);
  }

  async listPendingProviders() {
    return [...this.users.values()].filter((user) => user.role === 'provider' && user.providerStatus === 'pending');
  }

  async listPendingBooks() {
    return [...this.books.values()].filter((book) => book.status === 'pending_review');
  }

  async updateBookStatus(id: string, status: Book['status'], providerId?: string, expectedStatus?: Book['status']) {
    const book = this.books.get(id);
    if (!book || (providerId && book.providerId !== providerId) || (expectedStatus && book.status !== expectedStatus)) return false;
    this.books.set(id, { ...book, status });
    return true;
  }

  async saveRefreshSession(session: RefreshSession) {
    this.refreshSessions.set(session.tokenHash, session);
  }

  async consumeRefreshSession(tokenHash: string) {
    const session = this.refreshSessions.get(tokenHash);
    if (!session || session.expiresAt <= new Date()) return null;
    this.refreshSessions.delete(tokenHash);
    return session;
  }

  async revokeRefreshSession(tokenHash: string) {
    this.refreshSessions.delete(tokenHash);
  }

  async listBooks(filter: {
    ageGroup: 'kids' | 'teens' | 'adults';
    languages: string[];
    category?: string;
    language?: string;
    query?: string;
    limit: number;
    beforeId?: string;
  }): Promise<PublicBook[]> {
    const allowedRatings = filter.ageGroup === 'kids'
      ? ['Kids']
      : filter.ageGroup === 'teens'
        ? ['Kids', 'Teen']
        : ['Kids', 'Teen', 'Adult'];
    const query = filter.query?.toLowerCase();
    return [...this.books.values()]
      .filter((book) => book.status === 'published')
      .filter((book) => allowedRatings.includes(book.ageRating))
      .filter((book) => filter.languages.includes(book.language))
      .filter((book) => !filter.language || book.language === filter.language)
      .filter((book) => !filter.category || book.categories.includes(filter.category))
      .filter((book) => !query || `${book.title} ${book.authors.join(' ')} ${book.provider} ${book.tags.join(' ')}`.toLowerCase().includes(query))
      .filter((book) => !filter.beforeId || book.id < filter.beforeId)
      .sort((left, right) => right.id.localeCompare(left.id))
      .slice(0, filter.limit)
      .map((book) => this.toPublicBook(book));
  }

  async countBooks(filter: {
    ageGroup: 'kids' | 'teens' | 'adults';
    languages: string[];
    category?: string;
    language?: string;
    query?: string;
  }) {
    return (await this.listBooks({ ...filter, limit: 1000 })).length;
  }

  async listChapters(bookId: string): Promise<ChapterSummary[]> {
    return [...this.chapters.values()]
      .filter((c) => c.bookId === bookId)
      .sort((a, b) => a.chapterNumber - b.chapterNumber)
      .map(({ text: _text, ...summary }) => summary);
  }

  async getChapter(bookId: string, chapterNumber: number): Promise<Chapter | null> {
    return this.chapters.get(`${bookId}:${chapterNumber}`) ?? null;
  }

  async upsertChapters(chapters: Omit<Chapter, 'id'>[]): Promise<void> {
    for (const chapter of chapters) {
      const key = `${chapter.bookId}:${chapter.chapterNumber}`;
      const existing = this.chapters.get(key);
      this.chapters.set(key, { ...chapter, id: existing?.id ?? this.makeId() });
    }
  }

  async getReadingProgress(userId: string, bookId: string): Promise<ReadingProgress | null> {
    return this.progress.get(`${userId}:${bookId}`) ?? null;
  }

  async saveReadingProgress(p: Omit<ReadingProgress, 'updatedAt'>): Promise<ReadingProgress> {
    const saved: ReadingProgress = { ...p, updatedAt: new Date() };
    this.progress.set(`${p.userId}:${p.bookId}`, saved);
    return saved;
  }


  async close() {}

  private toPublicBook(book: Book): PublicBook {
    const { status: _status, ...publicBook } = book;
    return publicBook;
  }
}

const config: AppConfig = {
  nodeEnv: 'test',
  port: 4000,
  trustProxyHops: 0,
  mongoUri: 'mongodb://localhost/test',
  mongoDb: 'libery-test',
  jwtAccessSecret: 'test-signing-secret-that-is-at-least-32-bytes',
  adminApiKey: 'test-admin-key-that-is-at-least-32-bytes',
  corsOrigins: ['http://localhost:19006'],
};

const readerInput = {
  email: 'reader@example.test',
  username: 'reader_1',
  displayName: 'Test Reader',
  password: 'StrongPassphrase123',
  ageGroup: 'adults',
  focusAreas: ['Fiction'],
  languages: ['English'],
};

function makeBearer(response: { body: { accessToken: string } }) {
  return ['Bearer', response.body.accessToken].join(' ');
}

describe('Libery API', () => {
  let store: MemoryStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    store = new MemoryStore();
    app = createApp(store, config);
  });

  it('creates a reader, omits password hashes, and authenticates a protected route', async () => {
    const registration = await request(app).post('/v1/auth/register').send(readerInput).expect(201);
    expect(registration.body.user.passwordHash).toBeUndefined();
    expect(registration.body.accessToken).toBeTypeOf('string');
    expect(registration.body.refreshToken).toBeTypeOf('string');

    await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${registration.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.user.email).toBe('reader@example.test');
        expect(body.user.passwordHash).toBeUndefined();
      });

    await request(app).get('/v1/me').expect(401);
  });

  it('rejects short passwords and child accounts without verified guardian consent', async () => {
    await request(app)
      .post('/v1/auth/register')
      .send({ ...readerInput, password: 'short' })
      .expect(400);

    await request(app)
      .post('/v1/auth/register')
      .send({ ...readerInput, email: 'child@example.test', username: 'child_1', ageGroup: 'kids' })
      .expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('GUARDIAN_CONSENT_REQUIRED'));
  });

  it('rotates refresh tokens and rejects replay of a consumed token', async () => {
    const registration = await request(app).post('/v1/auth/register').send(readerInput).expect(201);
    const refreshed = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: registration.body.refreshToken })
      .expect(200);

    expect(refreshed.body.refreshToken).not.toBe(registration.body.refreshToken);
    await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: registration.body.refreshToken })
      .expect(401);
  });

  it('does not return a catalog book above the reader age rating', async () => {
    const registration = await request(app)
      .post('/v1/auth/register')
      .send({ ...readerInput, email: 'teen@example.test', username: 'teen_1', ageGroup: 'teens' })
      .expect(201);
    store.books.set('000000000000000000000010', {
      id: '000000000000000000000010',
      providerId: 'publisher',
      title: 'Teen Title',
      authors: ['Author A'],
      provider: 'Test Press',
      description: 'Teen book',
      categories: ['Fiction'],
      tags: [],
      language: 'English',
      ageRating: 'Teen',
      pages: 100,
      ratingAvg: 0,
      ratingCount: 0,
      access: 'free',
      rightsConfirmed: true,
      availability: 'metadata_only',
      status: 'published',
    });
    store.books.set('000000000000000000000011', {
      ...store.books.get('000000000000000000000010')!,
      id: '000000000000000000000011',
      title: 'Adult Title',
      ageRating: 'Adult',
    });

    await request(app)
      .get('/v1/books')
      .set('Authorization', `Bearer ${registration.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.items.map((book: { title: string }) => book.title)).toEqual(['Teen Title']);
      });
  });

  it('stores library items per user and enforces catalog visibility', async () => {
    const firstReader = await request(app).post('/v1/auth/register').send(readerInput).expect(201);
    const secondReader = await request(app)
      .post('/v1/auth/register')
      .send({ ...readerInput, email: 'reader2@example.test', username: 'reader_2' })
      .expect(201);
    const bookId = '000000000000000000000020';
    store.books.set(bookId, {
      id: bookId,
      providerId: 'publisher',
      title: 'Library Story',
      authors: ['Author A'],
      provider: 'Test Press',
      description: 'A catalog book.',
      categories: ['Fiction'],
      tags: [],
      language: 'English',
      ageRating: 'Teen',
      pages: 100,
      ratingAvg: 0,
      ratingCount: 0,
      access: 'free',
      rightsConfirmed: true,
      availability: 'metadata_only',
      status: 'published',
    });

    await request(app)
      .put(`/v1/me/library/${bookId}`)
      .set('Authorization', makeBearer(firstReader))
      .send({ status: 'reading', progress: 35, isFavorite: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.item.book.title).toBe('Library Story');
        expect(body.item.progress).toBe(35);
        expect(body.item.isFavorite).toBe(true);
      });

    await request(app)
      .get('/v1/me/library')
      .set('Authorization', makeBearer(firstReader))
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
    await request(app)
      .get('/v1/me/library')
      .set('Authorization', makeBearer(secondReader))
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
    await request(app)
      .put(`/v1/me/library/${bookId}`)
      .set('Authorization', makeBearer(firstReader))
      .send({ status: 'reading', progress: 101, isFavorite: false })
      .expect(400);
    await request(app)
      .delete(`/v1/me/library/${bookId}`)
      .set('Authorization', makeBearer(firstReader))
      .expect(204);
    await request(app)
      .get('/v1/me/library')
      .set('Authorization', makeBearer(firstReader))
      .expect(200)
      .expect(({ body }) => expect(body.items).toEqual([]));
  });

  it('does not allow a reader to increase their age rating through preferences', async () => {
    const registration = await request(app)
      .post('/v1/auth/register')
      .send({ ...readerInput, email: 'teen@example.test', username: 'teen_1', ageGroup: 'teens' })
      .expect(201);
    await request(app)
      .put('/v1/me/preferences')
      .set('Authorization', makeBearer(registration))
      .send({ ageGroup: 'adults', focusAreas: ['Fiction'], languages: ['English'] })
      .expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('AGE_GROUP_UPGRADE_BLOCKED'));
  });

  it('requires provider verification and enforces draft-review-publish workflow', async () => {
    const registration = await request(app).post('/v1/auth/register').send({
      ...readerInput,
      email: 'provider@example.test',
      username: 'provider_1',
      accountType: 'provider',
      providerName: 'Example Press',
    }).expect(201);
    const authorization = `Bearer ${registration.body.accessToken}`;
    const bookInput = {
      title: 'A New Story',
      authors: ['A. Writer'],
      description: 'An original book from our provider.',
      categories: ['Fiction'],
      tags: ['story'],
      language: 'English',
      ageRating: 'Teen',
      pages: 120,
      rightsConfirmed: true,
    };

    await request(app).post('/v1/provider/books').set('Authorization', authorization).send(bookInput).expect(403);
    await request(app).post('/v1/provider/covers').set('Authorization', authorization).expect(403);
    await request(app)
      .patch(`/v1/admin/providers/${registration.body.user.id}/verify`)
      .set('X-Admin-Key', config.adminApiKey!)
      .expect(200);
    expect(store.auditEvents.map(({ action }) => action)).toEqual(['provider_verified']);
    await request(app)
      .post('/v1/provider/covers')
      .set('Authorization', authorization)
      .expect(503)
      .expect(({ body }) => expect(body.error.code).toBe('COVER_UPLOAD_UNAVAILABLE'));

    const draft = await request(app)
      .post('/v1/provider/books')
      .set('Authorization', authorization)
      .send(bookInput)
      .expect(201);
    expect(draft.body.book.status).toBe('draft');

    await request(app)
      .post(`/v1/provider/books/${draft.body.book.id}/submit`)
      .set('Authorization', authorization)
      .expect(202);
    const pending = await request(app)
      .get('/v1/admin/books/pending')
      .set('X-Admin-Key', config.adminApiKey!)
      .expect(200);
    expect(pending.body.items).toHaveLength(1);

    await request(app)
      .patch(`/v1/admin/books/${draft.body.book.id}/publish`)
      .set('X-Admin-Key', config.adminApiKey!)
      .expect(200);
    expect(store.auditEvents.map(({ action }) => action)).toEqual(['provider_verified', 'book_published']);

    const catalog = await request(app).get('/v1/books').set('Authorization', authorization).expect(200);
    expect(catalog.body.items).toHaveLength(1);
    expect(catalog.body.items[0].title).toBe('A New Story');

    await request(app)
      .get('/v1/books?q=New&category=Fiction')
      .set('Authorization', authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.items[0].title).toBe('A New Story');
      });

    await request(app)
      .get('/v1/books?q=missing&category=Fiction')
      .set('Authorization', authorization)
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(0);
        expect(body.items).toEqual([]);
      });
  });

  it('rejects arbitrary query operators and invalid request JSON without leaking server errors', async () => {
    const registration = await request(app).post('/v1/auth/register').send(readerInput).expect(201);
    await request(app)
      .get('/v1/books?limit[$gt]=0')
      .set('Authorization', `Bearer ${registration.body.accessToken}`)
      .expect(400);

    await request(app)
      .post('/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400)
      .expect(({ body }) => expect(body.error.code).toBe('INVALID_JSON'));
  });

  it('selects a varied English/French metadata catalog without granting text redistribution rights', () => {
    const categories = ['Fiction', 'History', 'Poetry', 'Science'];
    const rows = categories.flatMap((category, index) => [
      {
        'Text#': String(index + 1),
        Type: 'Text',
        Title: `${category} title`,
        Language: index % 2 === 0 ? 'en' : 'fr',
        Authors: 'Example Author',
        Subjects: `Category: ${category}`,
        Bookshelves: '',
      },
      {
        'Text#': String(index + 11),
        Type: 'Text',
        Title: `${category} title 2`,
        Language: 'en',
        Authors: 'Example Author',
        Subjects: `Category: ${category}`,
        Bookshelves: '',
      },
    ]);
    rows.push({
      'Text#': '99',
      Type: 'Audio',
      Title: 'Audio record',
      Language: 'en',
      Authors: 'Example Author',
      Subjects: 'Fiction',
      Bookshelves: '',
    });

    const selected = selectCatalogRows(rows, 8);
    expect(new Set(selected.map((row) => row['Text#'])).size).toBe(8);
    expect(selected).toHaveLength(8);
    expect(selected.some((row) => row.Language === 'fr')).toBe(true);

    const book = toCatalogBook(selected[0], selected[0]['Text#']);
    expect(book.availability).toBe('metadata_only');
    expect(book.rightsConfirmed).toBe(false);
    expect(book.sourceUrl).toContain('gutenberg.org/ebooks/');
    expect(book.status).toBe('published');
  });

  it('updates reader profile and saves bio, display name, and avatar in the store', async () => {
    const registerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'profile_tester@example.com',
        username: 'profile_tester',
        displayName: 'Initial Name',
        password: 'Password1234!',
        ageGroup: 'adults',
        focusAreas: ['Fiction'],
        languages: ['English'],
      })
      .expect(201);

    const token = registerResponse.body.accessToken;

    const profileResponse = await request(app)
      .put('/v1/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Updated Reader',
        bio: 'Avid reader of 19th century literature and philosophy.',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      })
      .expect(200);

    expect(profileResponse.body.user.displayName).toBe('Updated Reader');
    expect(profileResponse.body.user.bio).toBe('Avid reader of 19th century literature and philosophy.');
    expect(profileResponse.body.user.avatarUrl).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb');

    // Verify GET /me returns the updated profile
    const meResponse = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meResponse.body.user.displayName).toBe('Updated Reader');
    expect(meResponse.body.user.bio).toBe('Avid reader of 19th century literature and philosophy.');
    expect(meResponse.body.user.avatarUrl).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb');
  });

  it('creates and lists community posts with book attachment and likes', async () => {
    const registerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'poster@example.com',
        username: 'book_enthusiast',
        displayName: 'Book Enthusiast',
        password: 'Password1234!',
        ageGroup: 'adults',
        focusAreas: ['Fiction'],
        languages: ['English'],
      })
      .expect(201);

    const token = registerResponse.body.accessToken;

    // Create a community post
    const postResponse = await request(app)
      .post('/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'Reading this masterpiece on a quiet Sunday afternoon! Highly recommended.',
      })
      .expect(201);

    expect(postResponse.body.post.content).toBe('Reading this masterpiece on a quiet Sunday afternoon! Highly recommended.');
    expect(postResponse.body.post.author.username).toBe('book_enthusiast');
    expect(postResponse.body.post.author.displayName).toBe('Book Enthusiast');
    expect(postResponse.body.post.likesCount).toBe(0);

    const postId = postResponse.body.post.id;

    // Like the post
    const likeResponse = await request(app)
      .post(`/v1/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(likeResponse.body.likesCount).toBe(1);

    // Guest can list posts
    const listResponse = await request(app)
      .get('/v1/posts')
      .expect(200);

    expect(listResponse.body.posts.length).toBeGreaterThanOrEqual(1);
    expect(listResponse.body.posts[0].id).toBe(postId);
    expect(listResponse.body.posts[0].likesCount).toBe(1);
  });
  it('manages book chapters and tracks reader reading progress', async () => {
    const registerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'chapter_reader@example.com',
        username: 'chapter_reader',
        displayName: 'Chapter Reader',
        password: 'Password1234!',
        ageGroup: 'adults',
        focusAreas: ['Fiction'],
        languages: ['English'],
      })
      .expect(201);

    const token = registerResponse.body.accessToken;

    // Create a published book
    const book = await store.createBook({
      providerId: 'provider_1',
      title: 'Moby Dick',
      authors: ['Herman Melville'],
      author: 'Herman Melville',
      provider: 'Project Gutenberg',
      description: 'Call me Ishmael.',
      categories: ['Fiction'],
      tags: ['Whale', 'Adventure'],
      language: 'English',
      ageRating: 'Adult',
      ratingAvg: 4.8,
      ratingCount: 120,
      access: 'free',
      rightsConfirmed: true,
      availability: 'in_app_text',
      sourceName: 'Project Gutenberg',
      sourceUrl: 'https://www.gutenberg.org/ebooks/2701',
      license: 'Public Domain',
      downloadUrl: 'https://www.gutenberg.org/ebooks/2701',
      totalChapters: 2,
      status: 'published',
    });

    // Upsert chapters
    await store.upsertChapters([
      {
        bookId: book.id,
        chapterNumber: 1,
        title: 'Chapter 1: Loomings',
        text: 'Call me Ishmael. Some years ago—never mind how long precisely...',
        wordCount: 2150,
      },
      {
        bookId: book.id,
        chapterNumber: 2,
        title: 'Chapter 2: The Carpet-Bag',
        text: 'I stuffed a shirt or two into my old carpet-bag, tucked it under my arm...',
        wordCount: 1840,
      },
    ]);

    // GET /books/:id/chapters -> list of chapters without text
    const chaptersResponse = await request(app)
      .get(`/v1/books/${book.id}/chapters`)
      .expect(200);

    expect(chaptersResponse.body.totalChapters).toBe(2);
    expect(chaptersResponse.body.chapters.length).toBe(2);
    expect(chaptersResponse.body.chapters[0].chapterNumber).toBe(1);
    expect(chaptersResponse.body.chapters[0].title).toBe('Chapter 1: Loomings');
    expect(chaptersResponse.body.chapters[0].text).toBeUndefined();

    // GET /books/:id/chapters/1 -> single chapter with text
    const chapter1Response = await request(app)
      .get(`/v1/books/${book.id}/chapters/1`)
      .expect(200);

    expect(chapter1Response.body.chapter.chapterNumber).toBe(1);
    expect(chapter1Response.body.chapter.text).toContain('Call me Ishmael.');

    // GET /books/:id/chapters/99 -> 404
    await request(app)
      .get(`/v1/books/${book.id}/chapters/99`)
      .expect(404);

    // Initial progress check
    const initProgress = await request(app)
      .get(`/v1/me/progress/${book.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(initProgress.body.progress).toBeNull();

    // Save reading progress
    const saveProgress = await request(app)
      .put(`/v1/me/progress/${book.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        chapterNumber: 2,
        textPosition: 540,
        audioPositionSeconds: 78.5,
      })
      .expect(200);

    expect(saveProgress.body.progress.chapterNumber).toBe(2);
    expect(saveProgress.body.progress.textPosition).toBe(540);
    expect(saveProgress.body.progress.audioPositionSeconds).toBe(78.5);

    // Fetch updated reading progress
    const fetchedProgress = await request(app)
      .get(`/v1/me/progress/${book.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(fetchedProgress.body.progress.chapterNumber).toBe(2);
    expect(fetchedProgress.body.progress.textPosition).toBe(540);
  });
});
