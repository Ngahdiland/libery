import 'dotenv/config';

import { MongoStore } from './store/mongo.js';

async function initializeDatabase() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error('Set MONGODB_URI in server/.env before initializing the database.');
  }

  const database = process.env.MONGODB_DB?.trim() || 'libery';
  const store = await MongoStore.connect(mongoUri, database, process.env.NODE_ENV === 'production');
  await store.close();

  console.info(`MongoDB indexes initialized for database "${database}".`);
  console.info('Collections: users, refresh_sessions, books, admin_audit_events, user_library.');
}

initializeDatabase().catch((error: unknown) => {
  console.error('Database initialization failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
