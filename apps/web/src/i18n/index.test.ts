import { describe, expect, it } from 'vitest';

import i18n, { detectLanguage, resources } from './index';

function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, nested]) =>
    keysOf(nested, prefix ? `${prefix}.${key}` : key),
  );
}

describe('i18n', () => {
  it('локали ru и en содержат одинаковые ключи', () => {
    expect(keysOf(resources.ru.translation).sort()).toEqual(
      keysOf(resources.en.translation).sort(),
    );
  });

  it('выбирает первый поддерживаемый язык браузера', () => {
    expect(detectLanguage(['ru-RU', 'en-US'])).toBe('ru');
    expect(detectLanguage(['de-DE', 'en-GB'])).toBe('en');
  });

  it('использует en, если язык браузера не поддерживается', () => {
    expect(detectLanguage(['de', 'fr'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('обновляет lang документа при смене языка', async () => {
    await i18n.changeLanguage('ru');
    expect(document.documentElement.lang).toBe('ru');
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
