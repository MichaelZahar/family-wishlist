import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from './App';
import i18n from './i18n';

describe('App', () => {
  afterEach(cleanup);

  it('показывает название приложения', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Family Wishlist');
  });

  it.each([
    ['ru', 'Семейные вишлисты с бронированием подарков'],
    ['en', 'Family wishlists with gift reservations'],
  ])('показывает подзаголовок на языке %s', async (language, tagline) => {
    await i18n.changeLanguage(language);
    render(<App />);

    expect(screen.getByText(tagline)).toBeDefined();
  });
});
