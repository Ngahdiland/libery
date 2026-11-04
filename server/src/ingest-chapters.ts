import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (existsSync(resolve(process.cwd(), 'server/.env'))) {
  dotenv.config({ path: resolve(process.cwd(), 'server/.env') });
} else {
  dotenv.config();
}

import { createHash } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { MongoClient, ObjectId, type AnyBulkWriteOperation } from 'mongodb';

import { readConfig } from './config.js';
import type { Book, Chapter } from './types.js';

// ── Default curated top 50 Project Gutenberg Classics ────────────────────────

export const POPULAR_GUTENBERG_IDS: readonly string[] = [
  '1342', // Pride and Prejudice (Jane Austen)
  '84',   // Frankenstein (Mary Shelley)
  '11',   // Alice's Adventures in Wonderland (Lewis Carroll)
  '2701', // Moby Dick (Herman Melville)
  '1661', // The Adventures of Sherlock Holmes (Arthur Conan Doyle)
  '345',  // Dracula (Bram Stoker)
  '98',   // A Tale of Two Cities (Charles Dickens)
  '1400', // Great Expectations (Charles Dickens)
  '174',  // The Picture of Dorian Gray (Oscar Wilde)
  '1260', // Jane Eyre (Charlotte Brontë)
  '76',   // Adventures of Huckleberry Finn (Mark Twain)
  '74',   // The Adventures of Tom Sawyer (Mark Twain)
  '4300', // Ulysses (James Joyce)
  '2591', // Grimms' Fairy Tales (Brothers Grimm)
  '1952', // The Yellow Wallpaper (Charlotte Perkins Gilman)
  '16',   // Peter Pan (J. M. Barrie)
  '2542', // A Doll's House (Henrik Ibsen)
  '2852', // The Hound of the Baskervilles (Arthur Conan Doyle)
  '120',  // Treasure Island (Robert Louis Stevenson)
  '43',   // The Strange Case of Dr. Jekyll and Mr. Hyde (Robert Louis Stevenson)
  '514',  // Little Women (Louisa May Alcott)
  '36',   // The War of the Worlds (H. G. Wells)
  '35',   // The Time Machine (H. G. Wells)
  '5200', // Metamorphosis (Franz Kafka)
  '219',  // Heart of Darkness (Joseph Conrad)
  '205',  // Walden (Henry David Thoreau)
  '28054',// The Brothers Karamazov (Fyodor Dostoyevsky)
  '2600', // War and Peace (Leo Tolstoy)
  '1399', // Anna Karenina (Leo Tolstoy)
  '160',  // The Awakening (Kate Chopin)
  '3600', // Essays of Montaigne (Michel de Montaigne)
  '1232', // The Prince (Niccolò Machiavelli)
  '1497', // The Republic (Plato)
  '844',  // The Importance of Being Earnest (Oscar Wilde)
  '2500', // Siddhartha (Hermann Hesse)
  '23',   // Narrative of the Life of Frederick Douglass (Frederick Douglass)
  '1080', // A Modest Proposal (Jonathan Swift)
  '82',   // History of the Peloponnesian War (Thucydides)
  '215',  // The Call of the Wild (Jack London)
  '1250', // Anthem (Ayn Rand)
  '16389',// The Enchanted April (Elizabeth Von Arnim)
  '20203',// Autobiography of Benjamin Franklin (Benjamin Franklin)
  '158',  // Emma (Jane Austen)
  '105',  // Persuasion (Jane Austen)
  '121',  // Northanger Abbey (Jane Austen)
  '141',  // Mansfield Park (Jane Austen)
  '161',  // Sense and Sensibility (Jane Austen)
  '244',  // A Study in Scarlet (Arthur Conan Doyle)
  '100',  // Complete Works of William Shakespeare
  '30254',// The Romance of Lust (Anonymous)
];

const LOG_FILE = resolve('logs/ingest-failures.log');

// ── Boilerplate Stripper ─────────────────────────────────────────────────────

const START_MARKERS = [
  /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n*]*\*\*\*/i,
  /\*\*\*\s*START OF THE EBOOK[^\n*]*\*\*\*/i,
  /\*END\*THE SMALL PRINT! FOR PUBLIC DOMAIN EBOOKS/i,
];

const END_MARKERS = [
  /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i,
  /\*\*\*\s*END OF THE EBOOK/i,
  /End of the Project Gutenberg EBook/i,
  /End of Project Gutenberg's/i,
  /End of this Project Gutenberg/i,
];

/**
 * Strips Project Gutenberg legal boilerplate headers and footers from plain text.
 */
export function stripGutenbergBoilerplate(rawText: string): string {
  // Normalize line endings to LF
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip start boilerplate
  for (const pattern of START_MARKERS) {
    const match = pattern.exec(text);
    if (match) {
      text = text.slice(match.index + match[0].length);
      break;
    }
  }

  // Strip end boilerplate
  for (const pattern of END_MARKERS) {
    const match = pattern.exec(text);
    if (match) {
      text = text.slice(0, match.index);
      break;
    }
  }

  return text.trim();
}

// ── Chapter Splitter ─────────────────────────────────────────────────────────

export type ParsedChapter = {
  chapterNumber: number;
  title: string;
  text: string;
  wordCount: number;
};

function countWords(str: string): number {
  const matches = str.match(/\S+/g);
  return matches ? matches.length : 0;
}

// Regex to identify standard chapter and section headings
const CHAPTER_HEADING_REGEX = /(?:^|\n\n+)[ \t]*((?:CHAPTER|Chapter|PART|Part|BOOK|Book|ACT|Act|CANTO|Canto|SECTION|Section)\s+[0-9IVXLCDM]+[^\n]*)(?:\n|$)/g;

/**
 * Splits plain text into chapters based on standard heading patterns.
 * If no clear headings are detected or fewer than 2 sections result,
 * it safely falls back to splitting into ~3,000-word sections at paragraph boundaries.
 */
export function splitIntoChapters(cleanedText: string): ParsedChapter[] {
  const matches: Array<{ index: number; fullHeading: string; headingLine: string }> = [];
  let match: RegExpExecArray | null;

  CHAPTER_HEADING_REGEX.lastIndex = 0;
  while ((match = CHAPTER_HEADING_REGEX.exec(cleanedText)) !== null) {
    matches.push({
      index: match.index,
      fullHeading: match[0],
      headingLine: match[1].trim(),
    });
  }

  // If at least 2 chapter headings were detected, split on them
  if (matches.length >= 2) {
    const chapters: ParsedChapter[] = [];

    // Optional introductory section (e.g. Preface, Prologue) before Chapter 1
    const introText = cleanedText.slice(0, matches[0].index).trim();
    if (countWords(introText) >= 60) {
      chapters.push({
        chapterNumber: 1,
        title: 'Preface / Introduction',
        text: introText,
        wordCount: countWords(introText),
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const startIndex = current.index + current.fullHeading.length;
      const endIndex = i + 1 < matches.length ? matches[i + 1].index : cleanedText.length;
      const body = cleanedText.slice(startIndex, endIndex).trim();

      chapters.push({
        chapterNumber: chapters.length + 1,
        title: current.headingLine.slice(0, 100),
        text: body,
        wordCount: countWords(body),
      });
    }

    // Filter out empty ghost chapters (e.g. table of contents entries)
    const validChapters = chapters.filter((c) => c.wordCount >= 20 || c.text.length >= 80);
    if (validChapters.length >= 2) {
      // Re-number sequentially
      return validChapters.map((c, idx) => ({ ...c, chapterNumber: idx + 1 }));
    }
  }

  // ── Fallback: Split into ~3,000 word sections at paragraph boundaries ────────
  return splitIntoWordSections(cleanedText, 3000);
}

/**
 * Splits body text into sections of approximately `targetWords` words at paragraph boundaries (\n\n+).
 */
export function splitIntoWordSections(text: string, targetWords = 3000): ParsedChapter[] {
  const paragraphs = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) {
    return [{ chapterNumber: 1, title: 'Chapter 1', text: text.trim(), wordCount: countWords(text) }];
  }

  const sections: ParsedChapter[] = [];
  let currentParagraphs: string[] = [];
  let currentWords = 0;

  for (const paragraph of paragraphs) {
    const pWords = countWords(paragraph);
    currentParagraphs.push(paragraph);
    currentWords += pWords;

    if (currentWords >= targetWords) {
      const sectionText = currentParagraphs.join('\n\n');
      sections.push({
        chapterNumber: sections.length + 1,
        title: `Section ${sections.length + 1}`,
        text: sectionText,
        wordCount: countWords(sectionText),
      });
      currentParagraphs = [];
      currentWords = 0;
    }
  }

  if (currentParagraphs.length > 0) {
    const sectionText = currentParagraphs.join('\n\n');
    // If last section is very short and we already have sections, append to previous
    if (currentWords < 300 && sections.length > 0) {
      const last = sections[sections.length - 1];
      last.text += `\n\n${sectionText}`;
      last.wordCount += currentWords;
    } else {
      sections.push({
        chapterNumber: sections.length + 1,
        title: `Section ${sections.length + 1}`,
        text: sectionText,
        wordCount: countWords(sectionText),
      });
    }
  }

  return sections.length > 0
    ? sections
    : [{ chapterNumber: 1, title: 'Chapter 1', text: text.trim(), wordCount: countWords(text) }];
}

// ── Text Fetcher with Rate Limiting & Retries ────────────────────────────────

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Downloads the plain-text UTF-8 edition of a Project Gutenberg book by ID.
 * Tries mirror URL patterns with exponential backoff and rate limiting.
 */
export async function fetchGutenbergText(gutenbergId: string, maxRetries = 3): Promise<string> {
  const urls = [
    `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`,
    `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`,
    `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}.txt`,
  ];

  const contact = process.env.LIBERY_CATALOG_CONTACT?.trim() || 'libery-ingest@example.com';
  const headers = { 'User-Agent': `LiberyChapterIngester/1.0 (${contact})` };

  let lastError: Error | null = null;

  for (const url of urls) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
        if (response.status === 404) {
          // File not at this specific URL variant, break to try next mirror
          break;
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${url}`);
        }
        const text = await response.text();
        if (text && text.length > 200) {
          return text;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await delay(attempt * 1000);
        }
      }
    }
  }

  throw lastError || new Error(`Could not download plain text for Project Gutenberg book #${gutenbergId}`);
}

async function logFailure(gutenbergId: string, error: unknown) {
  try {
    await mkdir(resolve('logs'), { recursive: true });
    const msg = `[${new Date().toISOString()}] Book #${gutenbergId} failed: ${error instanceof Error ? error.stack || error.message : String(error)}\n`;
    await appendFile(LOG_FILE, msg, 'utf8');
  } catch {
    console.error(`Failed to log error to ${LOG_FILE}`);
  }
}

// ── Ingestion Runner ─────────────────────────────────────────────────────────

type IngestOptions = {
  ids?: string[];
  limit?: number;
  apply?: boolean;
  rateLimitMs?: number;
};

export async function ingestGutenbergBooks(options: IngestOptions = {}) {
  const config = readConfig();
  const apply = options.apply ?? (process.argv.includes('--apply') || process.argv.some((a) => a.startsWith('--ids')));
  const rateLimitMs = options.rateLimitMs ?? 750;

  // Determine which Gutenberg IDs to process
  let targetIds: string[] = [];

  const idsArg = process.argv.find((arg) => arg.startsWith('--ids='));
  const idsIndex = process.argv.indexOf('--ids');
  if (idsArg) {
    targetIds = idsArg.slice('--ids='.length).split(',').map((id) => id.trim()).filter(Boolean);
  } else if (idsIndex !== -1 && process.argv[idsIndex + 1] && !process.argv[idsIndex + 1].startsWith('--')) {
    targetIds = process.argv[idsIndex + 1].split(',').map((id) => id.trim()).filter(Boolean);
  } else if (options.ids && options.ids.length > 0) {
    targetIds = options.ids;
  }

  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : options.limit ?? 50;

  const client = new MongoClient(config.mongoUri, {
    appName: 'libery-chapter-ingester',
    serverSelectionTimeoutMS: 15000,
    tlsAllowInvalidCertificates: true,
  });

  await client.connect();
  const db = client.db(config.mongoDb);
  const booksCollection = db.collection<any>('books');
  const chaptersCollection = db.collection<any>('chapters');

  // Ensure indexes on chapters collection
  await chaptersCollection.createIndex(
    { bookId: 1, chapterNumber: 1 },
    { unique: true, name: 'chapters_book_chapter_unique' },
  );

  const force = process.argv.includes('--force');

  try {
    // If no explicit IDs provided, select from existing MongoDB books or popular list
    if (targetIds.length === 0) {
      if (process.argv.includes('--popular')) {
        targetIds = POPULAR_GUTENBERG_IDS.slice(0, limit);
      } else {
        const pendingBooks = await booksCollection
          .find({
            sourceName: 'Project Gutenberg',
            sourceId: { $exists: true },
            availability: { $ne: 'in_app_text' },
          })
          .limit(limit)
          .toArray();

        if (pendingBooks.length > 0) {
          targetIds = pendingBooks.map((b) => String(b.sourceId));
        } else {
          targetIds = POPULAR_GUTENBERG_IDS.slice(0, limit);
        }
      }
    } else {
      targetIds = targetIds.slice(0, limit);
    }

    console.info(`Starting chapter ingestion for ${targetIds.length} books. Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);

    let processedCount = 0;
    let successCount = 0;
    let skippedCount = 0;
    let failureCount = 0;

    for (const gutenbergId of targetIds) {
      processedCount++;
      console.info(`[${processedCount}/${targetIds.length}] Fetching Gutenberg book #${gutenbergId}...`);

      // Skip already ingested books unless --force is specified
      if (!force) {
        const alreadyIngested = await booksCollection.findOne({
          $or: [
            { sourceId: gutenbergId },
            { providerId: `source:project-gutenberg:${gutenbergId}` },
          ],
          availability: 'in_app_text',
        });
        if (alreadyIngested) {
          console.info(`  ⏭ #${gutenbergId}: "${alreadyIngested.title}" already has chapters ingested. Skipping.`);
          skippedCount++;
          continue;
        }
      }

      try {
        const rawText = await fetchGutenbergText(gutenbergId);
        const cleanedText = stripGutenbergBoilerplate(rawText);
        const parsedChapters = splitIntoChapters(cleanedText);

        console.info(`  ✓ #${gutenbergId}: Cleaned text (${countWords(cleanedText).toLocaleString()} words), detected ${parsedChapters.length} chapters.`);

        if (!apply) {
          successCount++;
          await delay(200);
          continue;
        }

        // 1. Resolve or create MongoDB Book record
        let bookDoc = await booksCollection.findOne({
          $or: [
            { sourceId: gutenbergId },
            { providerId: `source:project-gutenberg:${gutenbergId}` },
          ],
        });

        let bookId: string;

        if (bookDoc) {
          bookId = bookDoc._id.toHexString();
        } else {
          // Extract a basic title from the text if book record doesn't exist
          const titleMatch = rawText.match(/Title:\s*([^\n\r]+)/i);
          const authorMatch = rawText.match(/Author:\s*([^\n\r]+)/i);
          const title = titleMatch ? titleMatch[1].trim() : `Project Gutenberg Book #${gutenbergId}`;
          const author = authorMatch ? authorMatch[1].trim() : 'Unknown author';

          const generatedId = createHash('sha256').update(`gutenberg:${gutenbergId}`).digest('hex').slice(0, 24);
          const newDoc: any = {
            _id: new ObjectId(generatedId),
            providerId: `source:project-gutenberg:${gutenbergId}`,
            title,
            author,
            authors: [author],
            provider: 'Project Gutenberg',
            description: `Public domain classic imported from Project Gutenberg (#${gutenbergId}).`,
            categories: ['Literature', 'Classics'],
            tags: ['Classic', 'Public Domain'],
            language: 'English',
            ageRating: 'Adult',
            ratingAvg: 4.8,
            ratingCount: 1,
            access: 'free',
            rightsConfirmed: true,
            availability: 'in_app_text',
            sourceName: 'Project Gutenberg',
            sourceId: gutenbergId,
            sourceUrl: `https://www.gutenberg.org/ebooks/${gutenbergId}`,
            license: 'Public Domain',
            downloadUrl: `https://www.gutenberg.org/ebooks/${gutenbergId}`,
            totalChapters: parsedChapters.length,
            createdAt: new Date(),
            status: 'published',
          };
          await booksCollection.insertOne(newDoc);
          bookId = generatedId;
        }

        // 2. Bulk upsert chapters into chapters collection
        const chapterOps: AnyBulkWriteOperation<any>[] = parsedChapters.map((c) => ({
          updateOne: {
            filter: { bookId, chapterNumber: c.chapterNumber },
            update: {
              $set: {
                bookId,
                chapterNumber: c.chapterNumber,
                title: c.title,
                text: c.text,
                wordCount: c.wordCount,
              },
              $setOnInsert: { _id: new ObjectId() },
            },
            upsert: true,
          },
        }));

        await chaptersCollection.bulkWrite(chapterOps, { ordered: false });

        // 3. Update Book document to in_app_text with totalChapters
        await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          {
            $set: {
              availability: 'in_app_text',
              license: 'Public Domain',
              downloadUrl: `https://www.gutenberg.org/ebooks/${gutenbergId}`,
              totalChapters: parsedChapters.length,
            },
          },
        );

        console.info(`  ✓ Saved ${parsedChapters.length} chapters to MongoDB for book "${bookDoc?.title || gutenbergId}".`);
        successCount++;
      } catch (err) {
        failureCount++;
        console.error(`  ✗ Error processing book #${gutenbergId}:`, err instanceof Error ? err.message : err);
        await logFailure(gutenbergId, err);
      }

      // Respect Gutenberg rate limits
      await delay(rateLimitMs);
    }

    console.info(`\nIngestion complete! Successfully processed: ${successCount}, Skipped: ${skippedCount}, Failures: ${failureCount}`);
  } finally {
    await client.close();
  }
}

// ── CLI invocation ───────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ingestGutenbergBooks().catch((error: unknown) => {
    console.error('Ingestion script failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

