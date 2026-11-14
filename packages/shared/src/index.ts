import { z } from 'zod';

// Контракт API (zod-схемы) живёт в этом пакете — см. docs/adr.md, ADR-001.
// Схема ниже — заглушка каркаса: проверяет, что zod и сборка пакета работают.
export const appInfoSchema = z.object({
  name: z.string().min(1),
});

export type AppInfo = z.infer<typeof appInfoSchema>;

export const APP_INFO: AppInfo = { name: 'Family Wishlist' };

// GET /api/health — проверка живости API и БД.
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
