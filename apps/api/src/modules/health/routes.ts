import { healthResponseSchema } from '@family-wishlist/shared';
import { sql } from 'drizzle-orm';
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';

import type { Db } from '../../db/client.js';

export const healthRoutes: FastifyPluginCallbackZod<{ db: Db }> = (app, { db }, done) => {
  app.get(
    '/api/health',
    { schema: { response: { 200: healthResponseSchema, 503: healthResponseSchema } } },
    async (request, reply) => {
      try {
        await db.execute(sql`select 1`);
        return { status: 'ok' as const };
      } catch (error) {
        request.log.error(error, 'health: БД недоступна');
        return reply.code(503).send({ status: 'unavailable' as const });
      }
    },
  );
  done();
};
