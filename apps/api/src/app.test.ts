import { APP_INFO } from '@family-wishlist/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';

describe('buildApp', () => {
  const app = buildApp();

  afterEach(async () => {
    await app.close();
  });

  it('стартует и отвечает 404 на неизвестный путь', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/unknown' });

    expect(response.statusCode).toBe(404);
  });

  it('видит пакет shared', () => {
    expect(APP_INFO.name).toBe('Family Wishlist');
  });
});
