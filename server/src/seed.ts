import 'dotenv/config';

import { createHash } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';

import { readConfig } from './config.js';
import type { Book } from './types.js';

const demoBooks: Omit<Book, 'id'>[] = [
  {
    providerId: 'demo-nairobi-press',
    title: 'The Garden of Mirrors',
    authors: ['Lina Njeri'],
    provider: 'Nairobi Press',
    description: 'A lyrical fiction novel about memory, migration, and the quiet courage of rebuilding home.',
    categories: ['Fiction'],
    tags: ['literary fiction', 'community'],
    language: 'English',
    ageRating: 'Teen',
    pages: 312,
    ratingAvg: 4.8,
    ratingCount: 1240,
    access: 'free',
    rightsConfirmed: false,
    availability: 'metadata_only',
    status: 'published',
  },
  {
    providerId: 'demo-civic-works',
    title: 'The Future in Our Hands',
    authors: ['Amina Diallo'],
    provider: 'Civic Works',
    description: 'Business and community thinking for young leaders who want to build resilient futures.',
    categories: ['Business'],
    tags: ['leadership', 'community'],
    language: 'French',
    ageRating: 'Adult',
    pages: 224,
    ratingAvg: 4.6,
    ratingCount: 840,
    access: 'free',
    rightsConfirmed: false,
    availability: 'metadata_only',
    status: 'published',
  },
  {
    providerId: 'demo-forklight-studio',
    title: 'Moonlit Letters',
    authors: ['Rafael Costa'],
    provider: 'Forklight Studio',
    description: 'An intimate coming-of-age story exploring friendship, faith, and the bravery to start over.',
    categories: ['Young Adult', 'Fiction'],
    tags: ['coming of age', 'friendship'],
    language: 'English',
    ageRating: 'Teen',
    pages: 286,
    ratingAvg: 4.7,
    ratingCount: 960,
    access: 'free',
    rightsConfirmed: false,
    availability: 'metadata_only',
    status: 'published',
  },
  {
    providerId: 'demo-mimosa-library',
    title: 'Roots of Kindness',
    authors: ['Béatrice Ndaya'],
    provider: 'Mimosa Library',
    description: 'A practical guide to emotional resilience and daily habits for calmer, kinder living.',
    categories: ['Self-development', 'Health'],
    tags: ['wellbeing', 'habits'],
    language: 'French',
    ageRating: 'Adult',
    pages: 198,
    ratingAvg: 4.9,
    ratingCount: 1820,
    access: 'free',
    rightsConfirmed: false,
    availability: 'metadata_only',
    status: 'published',
  },
  {
    providerId: 'demo-story-grove',
    title: 'Little Echoes',
    authors: ['Tariq Bensaid'],
    provider: 'Story Grove',
    description: 'A warm adventure for curious children learning to listen and care.',
    categories: ['Kids', 'Fiction'],
    tags: ['children', 'adventure'],
    language: 'English',
    ageRating: 'Kids',
    pages: 104,
    ratingAvg: 4.5,
    ratingCount: 420,
    access: 'free',
    rightsConfirmed: false,
    availability: 'metadata_only',
    status: 'published',
  },
];

async function seed() {
  const config = readConfig();
  const client = new MongoClient(config.mongoUri, { appName: 'libery-seed', tls: config.nodeEnv === 'production' });
  await client.connect();
  try {
    const collection = client.db(config.mongoDb).collection<Omit<Book, 'id'> & { _id: ObjectId }>('books');
    await collection.createIndex({ providerId: 1, title: 1 }, { unique: true, name: 'books_provider_title_unique' });
    await collection.createIndex(
      { title: 'text', authors: 'text', provider: 'text', categories: 'text', tags: 'text' },
      { name: 'books_catalog_search' },
    );
    const results = await Promise.all(demoBooks.map((book) => {
      const stableId = createHash('sha256').update(`${book.providerId}:${book.title}`).digest('hex').slice(0, 24);
      return collection.updateOne(
        { providerId: book.providerId, title: book.title },
        { $setOnInsert: { ...book, _id: new ObjectId(stableId) } },
        { upsert: true },
      );
    }));
    console.info(`Demo catalog ready (${results.length} sample books).`);
  } finally {
    await client.close();
  }
}

seed().catch((error: unknown) => {
  console.error('Catalog seed failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
