import 'dotenv/config';

import { readConfig } from '../config.js';
import { SystemPosterService } from '../services/systemPoster.js';
import { MongoStore } from '../store/mongo.js';

async function main() {
  const config = readConfig();
  console.info('Connecting to MongoDB for system poster...');
  const store = await MongoStore.connect(config.mongoUri, config.mongoDb, false);

  try {
    const isForce = process.argv.includes('--force') || process.argv.includes('--reset');
    if (isForce) {
      console.info('Reset flag detected: clearing existing system slot posts for today...');
      await (store as any).posts.deleteMany({ userId: 'system:curator' });
      console.info('Cleared previous system slot posts.');
    }

    const poster = new SystemPosterService(store);
    console.info('Evaluating daytime post slots (Canada/American ET time)...');
    const posts = await poster.catchUpTodaySlots();
    console.info(`Done! Published ${posts.length} new daytime post(s) today.`);
  } finally {
    await store.close();
  }
}

main().catch((err) => {
  console.error('System poster failed:', err);
  process.exit(1);
});
