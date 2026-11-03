import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: 'server/.env' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'libery');
    const books = await db.collection('books').find({}).project({ id: 1, title: 1, totalChapters: 1 }).toArray();
    console.log('Books in DB count:', books.length);
    console.log('First 15 books:');
    for (const b of books.slice(0, 15)) {
      console.log(` - [${b.id}] "${b.title}" (totalChapters: ${b.totalChapters})`);
    }
    const beatrix = await db.collection('books').findOne({ title: /Beatrix/i });
    console.log('\nBeatrix book in DB:', beatrix);
    if (beatrix) {
      const chs = await db.collection('chapters').find({ bookId: beatrix.id }).toArray();
      console.log('Beatrix chapters count:', chs.length);
    }
  } finally {
    await client.close();
  }
}

run().catch(console.error);

