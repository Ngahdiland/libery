/**
 * free-space.ts
 * Deletes ALL chapters for a small set of books to free Atlas M0 quota.
 * Uses aggregation (single query) instead of per-book queries — much faster.
 *
 * Run with: npm run db:free-space --prefix server
 *
 * Strategy: delete chapters for smallest books first (~50-70 MB freed),
 * then run compress script. After compression, re-ingest deleted books.
 *
 * Flags:
 *   --dry-run      Show what would be deleted without deleting
 *   --target=<MB>  Stop deleting once this many MB freed (default 60)
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DRY_RUN = process.argv.includes('--dry-run');
const targetArg = process.argv.find((a) => a.startsWith('--target='));
const TARGET_MB = targetArg ? parseInt(targetArg.split('=')[1], 10) : 60;
const AVG_CHAPTER_KB = 19.65; // from db:stats

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const dbName = process.env.MONGODB_DB || 'libery';

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 60_000,
  });
  await client.connect();
  const db = client.db(dbName);
  const books = db.collection('books');
  const chapters = db.collection('chapters');

  console.info(`\n=== Free-Space Tool — ${DRY_RUN ? 'DRY RUN' : 'LIVE'} ===`);
  console.info(`Target: free at least ${TARGET_MB} MB\n`);

  // Single aggregation: group chapters by bookId, count them
  console.info('Running aggregation to count chapters per book...');
  const chaptersByBook = await chapters
    .aggregate([
      { $group: { _id: '$bookId', count: { $sum: 1 } } },
      { $sort: { count: 1 } }, // smallest first
    ])
    .toArray();

  console.info(`Books with chapters: ${chaptersByBook.length}`);

  // Enrich with book titles
  const bookIds = chaptersByBook.map((b) => b._id);
  const bookDocs = await books
    .find({ _id: { $in: bookIds } }, { projection: { _id: 1, title: 1 } })
    .toArray();
  const titleMap = new Map(bookDocs.map((b) => [b._id.toString(), b.title || b._id.toString()]));

  // Show top 20 smallest books
  console.info(`\nSmallest books (most easily freed):`);
  for (const b of chaptersByBook.slice(0, 20)) {
    const mb = (b.count * AVG_CHAPTER_KB) / 1024;
    const title = titleMap.get(b._id) || b._id;
    console.info(`  ${b.count.toString().padStart(4)} ch | ~${mb.toFixed(1).padStart(6)} MB | ${String(title).substring(0, 60)}`);
  }

  // Delete smallest books until we've freed enough
  let freedMB = 0;
  const deleted: { title: string; chapters: number; mb: number; bookId: string }[] = [];

  console.info(`\nSelecting books to delete to free ${TARGET_MB} MB...\n`);

  for (const b of chaptersByBook) {
    if (freedMB >= TARGET_MB) break;
    const mb = (b.count * AVG_CHAPTER_KB) / 1024;
    const title = String(titleMap.get(b._id) || b._id).substring(0, 60);
    console.info(`  ${DRY_RUN ? '[DRY] ' : ''}Deleting ${b.count} chapters of "${title}" (~${mb.toFixed(1)} MB)`);

    if (!DRY_RUN) {
      const result = await chapters.deleteMany({ bookId: b._id });
      console.info(`    → Deleted ${result.deletedCount} documents`);
    }

    freedMB += mb;
    deleted.push({ title, chapters: b.count, mb, bookId: b._id });
  }

  console.info(`\n=== Summary ===`);
  console.info(`Books processed: ${deleted.length}`);
  console.info(`Estimated space freed: ~${freedMB.toFixed(1)} MB`);

  if (!DRY_RUN && freedMB > 0) {
    console.info(`\n✓ Done! Atlas should now have room for writes.`);
    console.info(`\nNext steps:`);
    console.info(`  1. Run: npm run db:compress --prefix server`);
    console.info(`     (this compresses all remaining chapters — ~15-30 min)`);
    console.info(`  2. After compression, re-ingest deleted books:`);
    console.info(`     npm run ingest:chapters --prefix server`);
  }

  if (DRY_RUN) {
    console.info(`\nBooks that WOULD be deleted:`);
    for (const d of deleted) {
      console.info(`  - [${d.bookId}] ${d.title} (${d.chapters} ch, ~${d.mb.toFixed(1)} MB)`);
    }
  }

  await client.close();
}

main().catch((err) => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});
