export type AgeGroup = 'kids' | 'teens' | 'adults';
export type AccountStatus = 'active' | 'suspended';
export type UserRole = 'reader' | 'provider' | 'admin';
export type ProviderStatus = 'pending' | 'verified' | 'rejected';

export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
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
  provider: string;
  description: string;
  categories: string[];
  tags: string[];
  language: string;
  ageRating: 'Kids' | 'Teen' | 'Adult';
  coverImageUrl?: string;
  pages?: number;
  ratingAvg: number;
  ratingCount: number;
  access: 'free' | 'paid' | 'subscription';
  priceMinor?: number;
  currency?: 'USD' | 'EUR' | 'XAF';
  rightsConfirmed: boolean;
  availability: 'metadata_only' | 'provider_file';
  sourceName?: string;
  sourceId?: string;
  sourceUrl?: string;
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

export type AdminAuditEvent = {
  action: 'provider_verified' | 'provider_rejected' | 'book_published' | 'book_removed';
  targetId: string;
  createdAt: Date;
};

export type UserPreferences = Pick<User, 'ageGroup' | 'focusAreas' | 'languages'>;

export interface AppStore {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: Omit<UserRecord, 'id'>): Promise<UserRecord>;
  updateUserPreferences(id: string, preferences: UserPreferences): Promise<UserRecord | null>;
  listLibrary(userId: string, ageGroup: AgeGroup, languages: string[]): Promise<LibraryBook[]>;
  updateLibraryItem(
    userId: string,
    bookId: string,
    ageGroup: AgeGroup,
    languages: string[],
    item: Pick<LibraryBook, 'status' | 'progress' | 'isFavorite'>,
  ): Promise<LibraryBook | null>;
  removeLibraryItem(userId: string, bookId: string): Promise<void>;
  updateProviderStatus(id: string, status: ProviderStatus): Promise<UserRecord | null>;
  recordAdminAuditEvent(event: AdminAuditEvent): Promise<void>;
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
  saveRefreshSession(session: RefreshSession): Promise<void>;
  consumeRefreshSession(tokenHash: string): Promise<RefreshSession | null>;
  revokeRefreshSession(tokenHash: string): Promise<void>;
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
  close(): Promise<void>;
}
