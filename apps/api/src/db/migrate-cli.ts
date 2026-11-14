import { runMigrations } from './migrate.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('db:migrate — не задан DATABASE_URL (см. .env.example).');
  process.exit(1);
}

await runMigrations(connectionString);
console.log('db:migrate — миграции применены.');
