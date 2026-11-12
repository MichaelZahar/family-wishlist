import { APP_INFO } from '@family-wishlist/shared';
import { useTranslation } from 'react-i18next';

// Заглушка каркаса. Первая настоящая страница — фаза 3 (docs/plan.md).
export function App() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{APP_INFO.name}</h1>
      <p>{t('app.tagline')}</p>
    </main>
  );
}
