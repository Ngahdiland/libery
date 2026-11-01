import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import { MongoClient, ObjectId, type AnyBulkWriteOperation } from 'mongodb';

import { readConfig } from './config.js';
import type { Book } from './types.js';

const CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';
const MAX_CATALOG_BYTES = 60 * 1024 * 1024;
const DEFAULT_LIMIT = 2000;

type CatalogRow = Record<string, string>;
type CatalogDocument = Omit<Book, 'id'> & { _id: ObjectId };

const categoryRules: Array<[string, RegExp]> = [
  ['Children & Young Adult', /children|juvenile|young adult/i],
  ['Fiction', /fiction|novel|short stor|fantasy|adventure/i],
  ['History', /history|historical/i],
  ['Science & Technology', /science|technology|mathematics|engineering|invention/i],
  ['Business & Economics', /business|economics|finance|commerce|industry/i],
  ['Education', /education|teaching|school|study/i],
  ['Religion', /religion|spiritual|christian|bible|islam|judaism|hindu|buddhis/i],
  ['Philosophy', /philosophy|ethics/i],
  ['Health & Medicine', /health|medicine|medical|nursing|diet/i],
  ['Law', /law|criminology|legal/i],
  ['Biography', /biograph|autobiograph|memoir/i],
  ['Language & Linguistics', /language|linguistics|grammar|dictionary/i],
  ['Poetry', /poetry|poems|verse/i],
  ['Drama', /drama|plays|theater|theatre/i],
  ['Travel & Places', /travel|geography|voyage|exploration/i],
  ['Arts & Music', /art|music|painting|photography/i],
  ['Society & Politics', /politic|social science|sociology|government/i],
];

export function classifyCategories(row: CatalogRow) {
  const metadata = `${row.Subjects ?? ''};${row.Bookshelves ?? ''}`;
  const selected: string[] = [];
  for (const [category, pattern] of categoryRules) {
    if (pattern.test(metadata)) selected.push(category);
  }
  return selected.length > 0 ? selected.slice(0, 5) : ['Literature'];
}

function parseAuthors(value: string) {
  const author = value.split(';')[0]?.trim();
  if (!author) return ['Unknown author'];
  return [author.replace(/,\s*(?:\d{3,4}|fl\.?\s*\d{3,4}).*$/i, '').trim() || 'Unknown author'];
}

function parseAgeRating(row: CatalogRow, categories: string[]): Book['ageRating'] {
  const metadata = `${row.Subjects ?? ''};${row.Bookshelves ?? ''}`;
  if (/children|juvenile/i.test(metadata)) return 'Kids';
  if (/young adult/i.test(metadata) || categories.includes('Children & Young Adult')) return 'Teen';
  return 'Adult';
}

export function toCatalogBook(row: CatalogRow, id: string): Omit<Book, 'id'> {
  const categories = classifyCategories(row);
  const subjects = (row.Subjects ?? '').split(';').map((item) => item.trim()).filter(Boolean).slice(0, 20);
  const title = (row.Title ?? '').trim().replace(/\s+/g, ' ');
  const language = row.Language === 'fr' ? 'French' : 'English';

  return {
    providerId: `source:project-gutenberg:${id}`,
    title: title.slice(0, 200),
    authors: parseAuthors(row.Authors ?? ''),
    provider: 'Project Gutenberg',
    description: subjects.length
      ? `Subjects: ${subjects.join('; ')}`
      : 'Catalog record imported from Project Gutenberg. Visit the source record for more information.',
    categories,
    tags: subjects.map((subject) => subject.slice(0, 40)),
    language,
    ageRating: parseAgeRating(row, categories),
    ratingAvg: 0,
    ratingCount: 0,
    access: 'free',
    rightsConfirmed: false,
    availability: 'metadata_only',
    sourceName: 'Project Gutenberg',
    sourceId: id,
    sourceUrl: `https://www.gutenberg.org/ebooks/${id}`,
    status: 'published',
  };
}

async function downloadCatalog() {
  const contact = process.env.LIBERY_CATALOG_CONTACT?.trim();
  if (!contact) throw new Error('Set LIBERY_CATALOG_CONTACT to a monitored email before importing.');

  const response = await fetch(CATALOG_URL, {
    headers: { 'User-Agent': `LiberyCatalogImporter/0.1 (${contact})` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Catalog download failed with HTTP ${response.status}.`);
  }

  const advertisedLength = Number(response.headers.get('content-length') ?? 0);
  if (advertisedLength > MAX_CATALOG_BYTES) throw new Error('Catalog feed exceeds the configured size limit.');

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_CATALOG_BYTES) {
      await reader.cancel();
      throw new Error('Catalog feed exceeds the configured size limit.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readCatalog() {
  const fileArgument = process.argv.find((value) => value.startsWith('--file='));
  if (!fileArgument) return downloadCatalog();

  const path = resolve(fileArgument.slice('--file='.length));
  const fileInfo = await stat(path);
  if (!fileInfo.isFile()) throw new Error('The catalog input must be a regular file.');
  if (fileInfo.size > MAX_CATALOG_BYTES) throw new Error('Catalog feed exceeds the configured size limit.');
  return readFile(path, 'utf8');
}

export function selectCatalogRows(rows: CatalogRow[], limit: number) {
  const categories = new Map<string, CatalogRow[]>();
  const ids = new Set<string>();

  for (const row of rows) {
    const id = row['Text#']?.trim();
    if (
      row.Type !== 'Text'
      || !id
      || !/^\d+$/.test(id)
      || ids.has(id)
      || !['en', 'fr'].includes(row.Language)
      || !row.Title?.trim()
    ) continue;

    ids.add(id);
    const category = classifyCategories(row)[0];
    const bucket = categories.get(category) ?? [];
    bucket.push(row);
    categories.set(category, bucket);
  }

  const selected: CatalogRow[] = [];
  const categoryNames = [...categories.keys()].sort();
  let round = 0;
  while (selected.length < limit) {
    let addedThisRound = false;
    for (const category of categoryNames) {
      const candidate = categories.get(category)?.[round];
      if (candidate && selected.length < limit) {
        selected.push(candidate);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
    round += 1;
  }
  return selected;
}

function readLimit() {
  const argument = process.argv.find((value) => value.startsWith('--limit='));
  const value = argument ? Number(argument.slice('--limit='.length)) : DEFAULT_LIMIT;
  if (!Number.isInteger(value) || value < 1000 || value > 10000) {
    throw new Error('Catalog import limit must be a whole number between 1,000 and 10,000.');
  }
  return value;
}

async function importCatalog() {
  const limit = readLimit();
  const csv = await readCatalog();
  const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true, max_record_size: 100_000 }) as CatalogRow[];
  const selected = selectCatalogRows(rows, limit);
  if (selected.length < 1000) {
    throw new Error(`Only ${selected.length} eligible English/French text records were found; refusing a small import.`);
  }

  const documents: CatalogDocument[] = selected.map((row) => {
    const sourceId = row['Text#'].trim();
    const id = createHash('sha256').update(`gutenberg:${sourceId}`).digest('hex').slice(0, 24);
    return { ...toCatalogBook(row, sourceId), _id: new ObjectId(id) };
  });
  const categoryCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  for (const document of documents) {
    for (const category of document.categories) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    languageCounts.set(document.language, (languageCounts.get(document.language) ?? 0) + 1);
  }
  console.info(`Prepared ${documents.length} metadata-only records from ${rows.length} catalog entries.`);
  console.info(`Languages: ${JSON.stringify(Object.fromEntries(languageCounts))}`);
  console.info(`Categories represented: ${JSON.stringify(Object.fromEntries(categoryCounts))}`);
  if (!process.argv.includes('--apply')) {
    console.info('Dry run only. Re-run with --apply to import; no ebook or cover files are downloaded.');
    return;
  }

  const config = readConfig();
  const client = new MongoClient(config.mongoUri, {
    appName: 'libery-gutenberg-catalog-import',
    ...(config.nodeEnv === 'production' ? { tls: true } : {}),
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  try {
    const collection = client.db(config.mongoDb).collection<CatalogDocument>('books');
    await collection.createIndex({ sourceId: 1 }, { unique: true, sparse: true, name: 'books_source_id_unique' });
    await collection.createIndex(
      { title: 'text', authors: 'text', provider: 'text', categories: 'text', tags: 'text' },
      { name: 'books_catalog_search' },
    );
    let inserted = 0;
    for (let offset = 0; offset < documents.length; offset += 500) {
      const batch = documents.slice(offset, offset + 500);
      const operations: AnyBulkWriteOperation<CatalogDocument>[] = batch.map((document) => ({
        updateOne: {
          filter: { _id: document._id },
          update: { $setOnInsert: document },
          upsert: true,
        },
      }));
      const result = await collection.bulkWrite(operations, { ordered: false });
      inserted += result.upsertedCount;
    }
    console.info(`Import completed. Newly added ${inserted} records; existing records were left unchanged.`);
  } finally {
    await client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importCatalog().catch((error: unknown) => {
    console.error('Project Gutenberg metadata import failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}
