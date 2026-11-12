import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Роуты регистрируются здесь, начиная с фазы 3 (docs/plan.md).

  return app;
}
