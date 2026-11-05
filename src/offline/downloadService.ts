import { fetchBookChapters, fetchChapter, type ApiChapter } from '../api/client';
import { getDatabase } from './database';

export type DownloadableBook = {
  id: string;
  title: string;
  author?: string;
  coverImageUrl?: string;
  version?: string;
};

export type DownloadOptions = {
  accessToken?: string;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
};

/**
 * Downloads all chapters for a book and saves them atomically in local SQLite.
 * If the download fails or is cancelled, no partial book or orphaned chapters remain.
 */
export async function downloadBook(
  book: DownloadableBook,
  options: DownloadOptions = {},
): Promise<void> {
  const { accessToken, signal, onProgress } = options;

  if (signal?.aborted) {
    throw new Error('Download was cancelled before starting.');
  }

  // 1. Fetch chapter summaries index
  onProgress?.(0.05);
  const { chapters: chapterSummaries } = await fetchBookChapters(book.id, accessToken);

  if (!chapterSummaries || chapterSummaries.length === 0) {
    throw new Error('This book has no chapters available to download.');
  }

  const total = chapterSummaries.length;
  const downloadedChapters: ApiChapter[] = [];

  // 2. Download chapter contents sequentially
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      throw new Error('Download cancelled by user.');
    }

    const summary = chapterSummaries[i];
    const chapterData = await fetchChapter(book.id, summary.chapterNumber, accessToken);
    downloadedChapters.push(chapterData);

    // Calculate progress between 0.05 and 0.90
    const progress = 0.05 + ((i + 1) / total) * 0.85;
    onProgress?.(Math.min(progress, 0.9));
  }

  if (signal?.aborted) {
    throw new Error('Download cancelled by user.');
  }

  onProgress?.(0.92);

  // 3. Atomically write everything into SQLite inside a single transaction
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(async () => {
    // Clean up any existing record for this book first
    await db.runAsync('DELETE FROM downloaded_books WHERE book_id = ?;', [book.id]);

    // Insert book metadata
    await db.runAsync(
      `INSERT INTO downloaded_books (
        book_id,
        title,
        author,
        cover_url,
        total_chapters,
        version,
        downloaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        book.id,
        book.title,
        book.author ?? null,
        book.coverImageUrl ?? null,
        downloadedChapters.length,
        book.version ?? new Date().toISOString(),
        Date.now(),
      ],
    );

    // Insert each chapter
    for (const ch of downloadedChapters) {
      await db.runAsync(
        `INSERT INTO downloaded_chapters (
          book_id,
          chapter_number,
          title,
          content
        ) VALUES (?, ?, ?, ?);`,
        [book.id, ch.chapterNumber, ch.title ?? null, ch.text],
      );
    }
  });

  onProgress?.(1.0);
}

