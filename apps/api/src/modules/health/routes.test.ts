import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../app.js';
import { createDb } from '../../db/client.js';
import { createTestDb } from '../../test/db.js';

describe('GET /api/health', () => {
  const { db, pool } = createTestDb();
  const app = buildApp({ db });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('отвечает 200, когда БД доступна', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('отвечает 503, когда БД недоступна', async () => {
    // Порт 1 закрыт: подключение отклоняется сразу.
    const broken = createDb('postgres://wishlist:wishlist@127.0.0.1:1/wishlist_test');
    const brokenApp = buildApp({ db: broken.db });

    const response = await brokenApp.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable' });

    await brokenApp.close();
    await broken.pool.end();
  });
});
