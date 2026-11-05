import { fetchChapter, type ApiChapter } from '../api/client';
import {
  getDatabase,
  type DownloadedBookRecord,
  type DownloadedChapterRecord,
} from './database';
import { checkIsOnline } from './useNetworkStatus';

export type ChapterResult = {
  chapter: ApiChapter;
  isOffline: boolean;
};

export type StorageInfo = {
  count: number;
  totalBytes: number;
  formattedSize: string;
};

/**
 * Checks whether a book is fully downloaded locally in SQLite.
 */
export async function isBookDownloaded(bookId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM downloaded_books WHERE book_id = ?;',
    [bookId],
  );
  return (row?.count ?? 0) > 0;
}

/**
 * Retrieves all downloaded books sorted by most recently downloaded.
 */
export async function getDownloadedBooks(): Promise<DownloadedBookRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<DownloadedBookRecord>(
    'SELECT * FROM downloaded_books ORDER BY downloaded_at DESC;',
  );
}

/**
 * Retrieves a single downloaded book record by bookId.
 */
export async function getDownloadedBook(
  bookId: string,
): Promise<DownloadedBookRecord | null> {
  const db = await getDatabase();
  const book = await db.getFirstAsync<DownloadedBookRecord>(
    'SELECT * FROM downloaded_books WHERE book_id = ?;',
    [bookId],
  );
  return book ?? null;
}

/**
 * Reads a chapter from local SQLite storage first.
 * If missing locally and online, falls back to the server API.
 * If missing locally and offline, throws an informative error for the UI.
 */
export async function getChapter(
  bookId: string,
  chapterNumber: number,
  accessToken?: string,
): Promise<ChapterResult> {
  const db = await getDatabase();

  // 1. Try local SQLite first
  const localRow = await db.getFirstAsync<DownloadedChapterRecord>(
    'SELECT * FROM downloaded_chapters WHERE book_id = ? AND chapter_number = ?;',
    [bookId, chapterNumber],
  );

  if (localRow && typeof localRow.content === 'string') {
    const wordCount = localRow.content.trim().split(/\s+/).filter(Boolean).length;
    return {
      chapter: {
        id: `offline_${localRow.id}`,
        bookId: localRow.book_id,
        chapterNumber: localRow.chapter_number,
        title: localRow.title || `Chapter ${localRow.chapter_number}`,
        text: localRow.content,
        wordCount,
      },
      isOffline: true,
    };
  }

  // 2. Local copy missing — check network connectivity
  const isOnline = await checkIsOnline();
  if (!isOnline) {
    throw new Error(
      'You are offline and this chapter has not been downloaded for offline reading.',
    );
  }

  // 3. Device is online — fallback to API
  const remoteChapter = await fetchChapter(bookId, chapterNumber, accessToken);
  return {
    chapter: remoteChapter,
    isOffline: false,
  };
}

/**
 * Deletes a downloaded book and all its chapters (cascaded by SQLite foreign keys).
 */
export async function deleteDownload(bookId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM downloaded_books WHERE book_id = ?;', [bookId]);
}

/**
 * Compares the local version stamp with the server's version to check for updates.
 */
export async function checkBookUpdate(
  bookId: string,
  serverVersion?: string,
): Promise<{ hasUpdate: boolean; localVersion: string | null }> {
  if (!serverVersion) {
    return { hasUpdate: false, localVersion: null };
  }
  const localBook = await getDownloadedBook(bookId);
  if (!localBook) {
    return { hasUpdate: false, localVersion: null };
  }
  const hasUpdate = Boolean(localBook.version && localBook.version !== serverVersion);
  return { hasUpdate, localVersion: localBook.version };
}

/**
 * Returns total downloaded books and approximate local disk storage used.
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  const db = await getDatabase();

  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM downloaded_books;',
  );
  const totalBooks = countRow?.count ?? 0;

  const bytesRow = await db.getFirstAsync<{ total_bytes: number | null }>(
    'SELECT SUM(LENGTH(content)) as total_bytes FROM downloaded_chapters;',
  );
  const totalBytes = bytesRow?.total_bytes ?? 0;

  return {
    count: totalBooks,
    totalBytes,
    formattedSize: formatBytes(totalBytes),
  };
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

