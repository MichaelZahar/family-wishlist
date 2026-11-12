import { APP_INFO } from '@family-wishlist/shared';

import { buildApp } from './app.js';

const port = Number(process.env.API_PORT ?? 3000);
const host = process.env.API_HOST ?? '127.0.0.1';

const app = buildApp({ logger: true });

try {
  await app.listen({ port, host });
  app.log.info(`${APP_INFO.name} API запущен`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
