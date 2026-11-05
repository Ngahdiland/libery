import 'dotenv/config';

import { createApp } from './app.js';
import { readConfig } from './config.js';
import { SystemPosterService } from './services/systemPoster.js';
import { MongoStore } from './store/mongo.js';

async function main() {
  const config = readConfig();
  const store = await MongoStore.connect(config.mongoUri, config.mongoDb, config.nodeEnv === 'production');
  const app = createApp(store, config);
  const server = app.listen(config.port, () => {
    console.info(`Libery API listening on port ${config.port}`);
  });

  // Automated 10-per-day daytime system posting service (Canada / American time)
  const systemPoster = new SystemPosterService(store);
  systemPoster.startPeriodicWorker(5 * 60 * 1000);

  const shutdown = () => {
    systemPoster.stop();
    server.close(() => {
      void store.close().finally(() => process.exit(0));
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('API startup failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
