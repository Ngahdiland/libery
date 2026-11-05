import 'dotenv/config';
import zlib from 'node:zlib';
import { MongoClient, type AnyBulkWriteOperation, type ObjectId } from 'mongodb';

const BATCH_SIZE = 50; // Smaller batches — M0 free tier safe

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found in environment');
  const dbName = process.env.MONGODB_DB || 'libery';

  const isDryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const maxLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

  console.info(`\n======================================================`);
  console.info(` MongoDB Chapter Compression Tool`);
  console.info(` Database: "${dbName}"`);
  console.info(` Mode: ${isDryRun ? 'DRY-RUN (no writes)' : 'APPLY (live compression)'}`);
  console.info(` Gzip Level: 9 (maximum reduction)`);
  console.info(` Batch Size: ${BATCH_SIZE} (Atlas M0 safe)`);
  console.info(`======================================================\n`);

  // M0-tuned connection: shorter timeouts, auto-reconnect
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 30_000,
    connectTimeoutMS: 10_000,
    maxPoolSize: 3,
    retryWrites: true,
    retryReads: true,
  });
  await client.connect();

  try {
    const db = client.db(dbName);
    const chaptersCol = db.collection('chapters');

    const totalChapters = await chaptersCol.countDocuments();
    const uncompressedCount = await chaptersCol.countDocuments({
      textGz: { $exists: false },
      text: { $type: 'string' },
    });
    const alreadyCompressed = await chaptersCol.countDocuments({ textGz: { $exists: true } });

    console.info(`Total chapters:            ${totalChapters.toLocaleString()}`);
    console.info(`Already compressed:        ${alreadyCompressed.toLocaleString()}`);
    console.info(`Pending (plain text):      ${uncompressedCount.toLocaleString()}`);

    if (uncompressedCount === 0) {
      console.info('\n✓ All chapters are already compressed! Nothing to do.\n');
      return;
    }

    const targetToProcess = Math.min(uncompressedCount, maxLimit);
    console.info(`\nCompressing ${targetToProcess.toLocaleString()} chapters...\n`);

    let processedCount = 0;
    let totalRawBytes = 0;
    let totalCompressedBytes = 0;
    let lastId: ObjectId | null = null;

    const startTime = Date.now();

    while (processedCount < targetToProcess) {
      const remaining = targetToProcess - processedCount;
      const thisBatch = Math.min(BATCH_SIZE, remaining);

      // Paginate using _id > lastId — avoids long-lived cursors that timeout on M0
      const filter: any = { textGz: { $exists: false }, text: { $type: 'string' } };
      if (lastId) filter._id = { $gt: lastId };

      let docs: any[];
      try {
        docs = await chaptersCol
          .find(filter, { projection: { _id: 1, text: 1 } })
          .sort({ _id: 1 })
          .limit(thisBatch)
          .toArray();
      } catch (fetchErr: any) {
        console.warn(`\n  Fetch error (will retry once): ${fetchErr.message}`);
        await new Promise((r) => setTimeout(r, 3000));
        docs = await chaptersCol
          .find(filter, { projection: { _id: 1, text: 1 } })
          .sort({ _id: 1 })
          .limit(thisBatch)
          .toArray();
      }

      if (docs.length === 0) break;

      const batchOps: AnyBulkWriteOperation<any>[] = [];

      for (const doc of docs) {
        if (typeof doc.text !== 'string') continue;
        const rawBuffer = Buffer.from(doc.text, 'utf8');
        const compressed = zlib.gzipSync(rawBuffer, { level: 9 });
        totalRawBytes += rawBuffer.length;
        totalCompressedBytes += compressed.length;

        if (!isDryRun) {
          batchOps.push({
            updateOne: {
              filter: { _id: doc._id },
              update: {
                $set: { textGz: compressed },
                $unset: { text: '' },
              },
            },
          });
        }

        processedCount++;
      }
      lastId = docs[docs.length - 1]._id;

      if (batchOps.length > 0 && !isDryRun) {
        try {
          await chaptersCol.bulkWrite(batchOps, { ordered: false });
        } catch (writeErr: any) {
          if (writeErr?.code === 11000) {
            // Duplicate key — already compressed in a previous partial run, skip
          } else {
            throw writeErr;
          }
        }
      }

      const pct = ((processedCount / targetToProcess) * 100).toFixed(1);
      const savedMb = ((totalRawBytes - totalCompressedBytes) / 1024 / 1024).toFixed(2);
      const ratio = totalRawBytes > 0 ? ((1 - totalCompressedBytes / totalRawBytes) * 100).toFixed(1) : '0';
      console.info(
        `  [${pct}%] ${processedCount.toLocaleString()} / ${targetToProcess.toLocaleString()} chapters | Saved ${savedMb} MB so far (${ratio}% reduction)`,
      );

      // Brief pause between batches — prevents M0 rate limits
      if (!isDryRun) await new Promise((r) => setTimeout(r, 300));
    }

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalSavedMb = ((totalRawBytes - totalCompressedBytes) / 1024 / 1024).toFixed(2);
    const finalRatio = totalRawBytes > 0 ? ((1 - totalCompressedBytes / totalRawBytes) * 100).toFixed(1) : '0';
    const projectedTotalSavedMb = uncompressedCount > 0
      ? (((totalRawBytes / processedCount) * uncompressedCount - (totalCompressedBytes / processedCount) * uncompressedCount) / 1024 / 1024).toFixed(0)
      : '0';

    console.info(`\n======================================================`);
    console.info(` Compression Complete!`);
    console.info(` Chapters Processed:   ${processedCount.toLocaleString()}`);
    console.info(` Raw Size Processed:   ${(totalRawBytes / 1024 / 1024).toFixed(2)} MB`);
    console.info(` Compressed Size:      ${(totalCompressedBytes / 1024 / 1024).toFixed(2)} MB`);
    console.info(` Space Saved:          ${totalSavedMb} MB (${finalRatio}% reduction)`);
    console.info(` Elapsed Time:         ${elapsedSec}s`);
    if (processedCount < uncompressedCount) {
      console.info(`\n  Note: ${(uncompressedCount - processedCount).toLocaleString()} chapters remaining.`);
      console.info(`  Run again with --apply to continue from where it left off.`);
    }
    console.info(`======================================================\n`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Compression failed:', err?.message || err);
  process.exit(1);
});
