import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing in server/.env');
  const dbName = process.env.MONGODB_DB || 'libery';

  console.info(`Connecting to MongoDB (${dbName})...`);
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const dbStats = await db.stats();
    console.info('\n=== DATABASE STATS ===');
    console.info(`Database: ${dbStats.db}`);
    console.info(`Collections: ${dbStats.collections}`);
    console.info(`Objects (Documents): ${dbStats.objects}`);
    console.info(`Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.info(`Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.info(`Total Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.info(`Total Space Used: ${((dbStats.storageSize + dbStats.indexSize) / 1024 / 1024).toFixed(2)} MB / 512.00 MB limit`);

    console.info('\n=== COLLECTION STATS ===');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      try {
        const stats = await db.command({ collStats: col.name });
        console.info(`Collection: [${col.name}]`);
        console.info(`  - Document Count: ${stats.count}`);
        console.info(`  - Data Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.info(`  - Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        console.info(`  - Total Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
        console.info(`  - Avg Doc Size: ${stats.avgObjSize ? (stats.avgObjSize / 1024).toFixed(2) : 0} KB`);
      } catch (err: any) {
        console.warn(`  Could not get stats for ${col.name}: ${err.message}`);
      }
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);

