import { APP_INFO } from '@family-wishlist/shared';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import { createTestDb } from './test/db.js';

describe('buildApp', () => {
  const { db, pool } = createTestDb();
  const app = buildApp({ db });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('отвечает 404 на неизвестный путь', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/unknown' });

    expect(response.statusCode).toBe(404);
  });

  it('видит пакет shared', () => {
    expect(APP_INFO.name).toBe('Family Wishlist');
  });
});
