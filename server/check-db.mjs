import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'libery');
  const books = await db.collection('books').find({}).project({ id: 1, title: 1, totalChapters: 1 }).toArray();
  console.log('Books in DB count:', books.length);
  for (const b of books.slice(0, 20)) {
    console.log(` - [${b.id}] "${b.title}" (totalChapters: ${b.totalChapters})`);
  }
  const beatrix = await db.collection('books').findOne({ title: /Beatrix/i });
  console.log('\nBeatrix book:', beatrix ? { id: beatrix.id, title: beatrix.title, sourceUrl: beatrix.sourceUrl, totalChapters: beatrix.totalChapters } : null);
  if (beatrix) {
    const chs = await db.collection('chapters').find({ bookId: beatrix.id }).toArray();
    console.log('Beatrix chapters count in chapters collection:', chs.length);
  }
  await client.close();
}

main().catch(console.error);

