import { describe, expect, it } from 'vitest';

import { APP_INFO, appInfoSchema } from './index.js';

describe('appInfoSchema', () => {
  it('принимает APP_INFO', () => {
    expect(appInfoSchema.parse(APP_INFO)).toEqual(APP_INFO);
  });

  it('отклоняет пустое имя', () => {
    expect(appInfoSchema.safeParse({ name: '' }).success).toBe(false);
  });
});
