import 'dotenv/config';
import zlib from 'node:zlib';
import { MongoClient, type AnyBulkWriteOperation } from 'mongodb';

const BATCH = 100;

async function main() {
  const oldUri = process.env.OLD_URI || process.env.MONGODB_URI;
  const newUri = process.env.NEW_URI;

  if (!newUri) {
    console.error('\nUsage: Set NEW_URI and optionally OLD_URI in your environment:');
    console.error('  $env:OLD_URI="mongodb+srv://.../libery"');
    console.error('  $env:NEW_URI="mongodb+srv://.../libery"');
    console.error('  npm run db:migrate-cluster\n');
    throw new Error('NEW_URI environment variable is required to migrate to a new cluster.');
  }

  const oldDbName = process.env.OLD_DB || process.env.MONGODB_DB || 'libery';
  const newDbName = process.env.NEW_DB || process.env.MONGODB_DB || 'libery';

  console.info(`\n======================================================`);
  console.info(` MongoDB Cross-Cluster Migration & Compression Tool`);
  console.info(` Source DB:      ${oldDbName}`);
  console.info(` Destination DB: ${newDbName}`);
  console.info(`======================================================\n`);

  const oldClient = await MongoClient.connect(oldUri!);
  const newClient = await MongoClient.connect(newUri);

  const oldDb = oldClient.db(oldDbName);
  const newDb = newClient.db(newDbName);

  try {
    // 1. Migrate standard metadata collections first
    const metadataCollections = [
      'books',
      'users',
      'community_posts',
      'user_library',
      'reading_progress',
      'refresh_sessions',
      'admin_audit_events',
    ];

    for (const colName of metadataCollections) {
      const srcCol = oldDb.collection(colName);
      const dstCol = newDb.collection(colName);

      const count = await srcCol.countDocuments();
      console.info(`Migrating collection [${colName}] (${count.toLocaleString()} docs)...`);

      if (count === 0) continue;

      const cursor = srcCol.find({});
      let batch: any[] = [];
      let copied = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        batch.push(doc);

        if (batch.length >= BATCH) {
          await dstCol.insertMany(batch, { ordered: false });
          copied += batch.length;
          batch = [];
        }
      }

      if (batch.length > 0) {
        await dstCol.insertMany(batch, { ordered: false });
        copied += batch.length;
      }

      console.info(`  ✓ Copied ${copied.toLocaleString()} documents to [${colName}]`);
    }

    // 2. Migrate Chapters with Gzip Compression
    console.info(`\nMigrating and compressing [chapters] collection...`);
    const srcChapters = oldDb.collection('chapters');
    const dstChapters = newDb.collection('chapters');

    const totalChapters = await srcChapters.countDocuments();
    console.info(`Total source chapters: ${totalChapters.toLocaleString()}`);

    const cursor = srcChapters.find({});
    let batch: any[] = [];
    let count = 0;
    let rawBytes = 0;
    let compressedBytes = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      // If document has uncompressed plain text, compress it with level 9
      if (typeof doc.text === 'string' && !doc.textGz) {
        const raw = Buffer.from(doc.text, 'utf8');
        const compressed = zlib.gzipSync(raw, { level: 9 });
        rawBytes += raw.length;
        compressedBytes += compressed.length;
        doc.textGz = compressed;
        delete doc.text; // Drop plain text
      } else if (doc.textGz) {
        compressedBytes += (doc.textGz as Buffer).length || 0;
      }

      batch.push(doc);

      if (batch.length >= BATCH) {
        await dstChapters.insertMany(batch, { ordered: false });
        count += batch.length;
        const pct = ((count / totalChapters) * 100).toFixed(1);
        console.info(`  [${pct}%] Migrated ${count.toLocaleString()} / ${totalChapters.toLocaleString()} chapters`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await dstChapters.insertMany(batch, { ordered: false });
      count += batch.length;
    }

    // 3. Ensure indexes on new cluster
    console.info('\nEnsuring compound index on destination chapters collection...');
    await dstChapters.createIndex(
      { bookId: 1, chapterNumber: 1 },
      { unique: true, name: 'chapters_book_chapter_unique' },
    );

    console.info(`\n======================================================`);
    console.info(` Migration Complete!`);
    console.info(` Total chapters migrated: ${count.toLocaleString()}`);
    if (rawBytes > 0) {
      const savedMb = ((rawBytes - compressedBytes) / 1024 / 1024).toFixed(2);
      console.info(` Space saved by compression: ${savedMb} MB`);
    }
    console.info(`======================================================\n`);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

