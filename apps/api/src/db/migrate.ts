import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDb } from './client.js';

// Каталог миграций один для src и dist: apps/api/drizzle.
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function runMigrations(connectionString: string) {
  const { db, pool } = createDb(connectionString);

  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
