import { APP_INFO } from '@family-wishlist/shared';

import { buildApp } from './app.js';
import { createDb } from './db/client.js';

const port = Number(process.env.API_PORT ?? 3000);
const host = process.env.API_HOST ?? '127.0.0.1';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Не задан DATABASE_URL (см. .env.example)');
}

const { db, pool } = createDb(databaseUrl);
const app = buildApp({ db }, { logger: true });

app.addHook('onClose', async () => {
  await pool.end();
});

try {
  await app.listen({ port, host });
  app.log.info(`${APP_INFO.name} API запущен`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
