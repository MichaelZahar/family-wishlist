import { runMigrations } from '../db/migrate.js';

// Перед тестами API тестовая БД приводится к актуальной схеме.
export default async function setup() {
  const connectionString = process.env.DATABASE_URL_TEST;

  if (!connectionString) {
    throw new Error('Не задан DATABASE_URL_TEST (см. .env.example)');
  }

  await runMigrations(connectionString);
}
