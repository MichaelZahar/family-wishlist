import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ru from './locales/ru.json';

// N-UX-04: локали ru и en, по умолчанию — язык браузера, fallback — en.
export const SUPPORTED_LANGUAGES = ['ru', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';

export const resources = {
  ru: { translation: ru },
  en: { translation: en },
} as const;

export function detectLanguage(preferred: readonly string[] = navigator.languages): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    const match = SUPPORTED_LANGUAGES.find((language) => language === base);
    if (match) return match;
  }
  return FALLBACK_LANGUAGE;
}

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

await i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false }, // React экранирует сам
});

export default i18n;
