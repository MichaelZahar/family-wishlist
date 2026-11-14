import { createDb } from '../db/client.js';

// Тесты идут только против тестовой БД своего worktree (ADR-006, C4).
export function createTestDb() {
  const connectionString = process.env.DATABASE_URL_TEST;

  if (!connectionString) {
    throw new Error('Не задан DATABASE_URL_TEST (см. .env.example)');
  }

  return createDb(connectionString);
}
