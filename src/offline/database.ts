import * as SQLite from 'expo-sqlite';

export type DownloadedBookRecord = {
  book_id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  total_chapters: number;
  version: string | null;
  downloaded_at: number;
};

export type DownloadedChapterRecord = {
  id: number;
  book_id: string;
  chapter_number: number;
  title: string | null;
  content: string;
};

const DATABASE_NAME = 'library.db';
const TARGET_SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Initializes and returns the shared SQLite database instance.
 * Enables foreign keys and executes schema migrations via PRAGMA user_version.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

      // Foreign keys must be enabled per connection in SQLite
      await db.execAsync('PRAGMA foreign_keys = ON;');

      // Check current schema version
      const versionResult = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version;',
      );
      const currentVersion = versionResult?.user_version ?? 0;

      if (currentVersion < 1) {
        await db.withExclusiveTransactionAsync(async () => {
          // Table 1: downloaded_books
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS downloaded_books (
              book_id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              author TEXT,
              cover_url TEXT,
              total_chapters INTEGER NOT NULL DEFAULT 0,
              version TEXT,
              downloaded_at INTEGER NOT NULL
            );
          `);

          // Table 2: downloaded_chapters
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS downloaded_chapters (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              book_id TEXT NOT NULL,
              chapter_number INTEGER NOT NULL,
              title TEXT,
              content TEXT NOT NULL,
              UNIQUE(book_id, chapter_number),
              FOREIGN KEY (book_id) REFERENCES downloaded_books(book_id) ON DELETE CASCADE
            );
          `);

          // Indexes
          await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_downloaded_chapters_book_id
            ON downloaded_chapters(book_id);
          `);

          await db.execAsync(`PRAGMA user_version = ${TARGET_SCHEMA_VERSION};`);
        });
      }

      return db;
    })();
  }

  return dbPromise;
}

