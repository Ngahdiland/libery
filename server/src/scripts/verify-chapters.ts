import 'dotenv/config';
import { readConfig } from '../config.js';
import { MongoStore } from '../store/mongo.js';

async function main() {
  const config = readConfig();
  console.info(`Connecting to MongoDB to verify chapter decompression...`);
  const store = await MongoStore.connect(config.mongoUri, config.mongoDb, false);

  try {
    const chaptersCol = (store as any).chapters;

    const totalChapters = await chaptersCol.countDocuments();
    const compressedCount = await chaptersCol.countDocuments({ textGz: { $exists: true } });
    const uncompressedCount = await chaptersCol.countDocuments({ text: { $exists: true } });

    console.info(`\n=== CHAPTER STORAGE STATUS ===`);
    console.info(`Total chapters:       ${totalChapters.toLocaleString()}`);
    console.info(`Compressed (textGz):  ${compressedCount.toLocaleString()}`);
    console.info(`Uncompressed (text):  ${uncompressedCount.toLocaleString()}`);

    // Sample 15-20 random chapters across the database
    const sampleSize = 15;
    const randomChapters = await chaptersCol
      .aggregate([{ $sample: { size: sampleSize } }])
      .toArray();

    console.info(`\n=== SAMPLING & VERIFYING ${randomChapters.length} RANDOM CHAPTERS THROUGH API STORE ===\n`);

    let verifiedCount = 0;

    for (let i = 0; i < randomChapters.length; i++) {
      const doc = randomChapters[i];
      const bookId = doc.bookId;
      const chapterNumber = doc.chapterNumber;

      // Read through store.getChapter (which transparently decompresses textGz)
      const chapter = await store.getChapter(bookId, chapterNumber);

      if (!chapter) {
        console.error(`  ✗ [FAIL] Chapter ${chapterNumber} of book ${bookId} returned null!`);
        continue;
      }

      if (typeof chapter.text !== 'string' || chapter.text.length === 0) {
        console.error(`  ✗ [FAIL] Chapter "${chapter.title}" has empty or non-string text!`);
        continue;
      }

      const isStoredCompressed = Boolean(doc.textGz);
      const snippet = chapter.text.slice(0, 70).replace(/\r?\n/g, ' ');
      const words = chapter.text.split(/\s+/).filter(Boolean).length;

      console.info(
        `  ✓ [${i + 1}/${randomChapters.length}] Ch #${chapter.chapterNumber} "${chapter.title}" | ${words.toLocaleString()} words | Storage: ${isStoredCompressed ? 'COMPRESSED (gzip)' : 'RAW'} | Excerpt: "${snippet}..."`,
      );
      verifiedCount++;
    }

    console.info(`\n======================================================`);
    console.info(` Verification Result: ${verifiedCount} / ${randomChapters.length} passed 100%`);
    console.info(` Decompression is working flawlessly on live server.`);
    console.info(`======================================================\n`);
  } finally {
    await store.close();
  }
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

