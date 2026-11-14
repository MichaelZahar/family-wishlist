# Family Wishlist

Семейные вишлисты с бронированием подарков. Что делает система — `docs/prd.md`. Почему так решили — `docs/adr.md`. Принципы, гейты и DoD — `docs/constitution.md`.

## Стек

Монорепо pnpm, Node.js 26, TypeScript (ESM), Fastify, React + Vite, PostgreSQL 17, zod. Полный состав и альтернативы — ADR-001.

## Команды

Запускаются из корня.

| Команда                             | Действие                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm install`                      | Установка зависимостей и git-хуков                                                                    |
| `pnpm db:up` / `pnpm db:down`       | Запуск / остановка Postgres в Docker Compose                                                          |
| `pnpm db:migrate`                   | Применение миграций Drizzle к `DATABASE_URL`                                                          |
| `pnpm db:generate`                  | Генерация миграции из Drizzle-схемы (`apps/api/drizzle`)                                              |
| `pnpm db:seed`                      | Заглушка: данных для загрузки нет                                                                     |
| `pnpm dev`                          | API (`tsx watch`, порт `API_PORT`) + web (Vite, порт `WEB_PORT`)                                      |
| `pnpm test`                         | Vitest по всем пакетам                                                                                |
| `pnpm vitest run --project api`     | Тесты одного пакета: `api`, `web`, `shared`                                                           |
| `pnpm e2e`                          | Playwright (`e2e/`); сам поднимает `pnpm dev`. Первый запуск: `pnpm exec playwright install chromium` |
| `pnpm lint`                         | ESLint                                                                                                |
| `pnpm format` / `pnpm format:check` | Prettier: запись / проверка                                                                           |
| `pnpm typecheck`                    | `tsc -b` по project references                                                                        |
| `pnpm build`                        | `tsc -b` + сборка web                                                                                 |

Сброс окружения — ADR-006, «Последствия».

## Структура

| Путь                       | Содержание                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/api`                 | Fastify-сервер. `src/app.ts` — `buildApp({ db })`, `src/server.ts` — запуск, `src/modules/*` — роуты |
| `apps/api/src/db`          | Drizzle: `client.ts`, `schema/`, `migrate.ts`. Миграции — `apps/api/drizzle`                         |
| `apps/web`                 | React + Vite. Прокси `/api` → API в `vite.config.ts`                                                 |
| `packages/shared`          | Контракт API: zod-схемы и типы                                                                       |
| `scripts`                  | Служебные скрипты (`db-seed.ts`)                                                                     |
| `e2e`                      | Тесты Playwright; конфигурация — `playwright.config.ts`                                              |
| `docker/postgres/init`     | SQL, выполняемый при первом создании volume                                                          |
| `docs`                     | Оглавление и статусы документов — `docs/README.md`                                                   |
| `specs/NNN-feature`        | Спеки фич Spec Kit: `spec.md`, `plan.md`, `contracts/`, `tasks.md`                                   |
| `apps/web/src/i18n`        | Инициализация i18next; локали — `locales/ru.json`, `locales/en.json`                                 |
| `.specify`                 | Spec Kit: шаблоны, скрипты, `memory/constitution.md` — копия конституции                             |
| `.claude/skills/speckit-*` | Команды Spec Kit: `/speckit-specify`, `/speckit-plan`, `/speckit-tasks` и др.                        |
| `.github/workflows/ci.yml` | CI: lint → format:check → typecheck → migrate → test → build → e2e                                   |

## Устройство сборки

- `@family-wishlist/shared` в dev и тестах читается из `src` по export-условию `@family-wishlist/source`; шаг сборки не нужен.
- Условие задано в четырёх местах: `tsconfig.base.json`, `apps/api/package.json` (скрипт `dev`), `apps/web/vite.config.ts`, `vitest.config.ts`.
- `apps/api` и `packages/shared`: `module: NodeNext`, относительные импорты — с расширением `.js`.
- `apps/web`: `moduleResolution: Bundler`, импорты без расширения.
- Env: один `.env` в корне, шаблон — `.env.example`. `.env.local` переопределяет значения под worktree (ADR-006).
- API читает `.env` и `.env.local` через `--env-file-if-exists`, web — через `envDir` в `vite.config.ts`.
- TypeScript закреплён на 6.0.x: `typescript-eslint` 8 не поддерживает 7.x.

## Тесты

- Файлы — рядом с кодом: `src/**/*.test.ts`, в web также `*.test.tsx`.
- Проекты Vitest заданы в корневом `vitest.config.ts`: `shared` и `api` — окружение `node`, `web` — `jsdom` + Testing Library.
- API тестируется через `buildApp({ db })` и `app.inject()` без запуска сервера; БД — `createTestDb()` из `apps/api/src/test/db.ts`.
- Тестам API нужен запущенный Postgres (`pnpm db:up`); миграции к тестовой БД применяет `apps/api/src/test/global-setup.ts`.
- Тестовая БД `wishlist_test` (`DATABASE_URL_TEST`) создаётся скриптом `docker/postgres/init/01-test-db.sql`.
- Pre-commit (husky + lint-staged): `eslint --fix` и `prettier --write` по staged-файлам.

## Правила

| #   | Правило                                                                                                                                      | Источник                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| C1  | Перед завершением задачи агент ДОЛЖЕН получить код 0 от `pnpm lint && pnpm typecheck && pnpm test`                                           | —                                    |
| C1a | Перед PR агент ДОЛЖЕН получить код 0 от `pnpm format:check && pnpm build && pnpm e2e`                                                        | `.github/workflows/ci.yml`           |
| C2  | Агент НЕ ДОЛЖЕН менять стек, хостинг или auth без нового ADR                                                                                 | `docs/adr.md`, преамбула             |
| C3  | Контракт в `packages/shared` меняет только агент `architect`                                                                                 | ADR-001                              |
| C4  | Агент НЕ ДОЛЖЕН запускать миграции и тесты против БД чужого worktree                                                                         | ADR-006                              |
| C5  | Доменные таблицы ДОЛЖНЫ содержать `family_id`                                                                                                | ADR-004                              |
| C6  | Агент НЕ ДОЛЖЕН коммитить `.env` и `.env.*`, кроме `.env.example`                                                                            | `.gitignore`                         |
| C7  | Документы, `CLAUDE.md` и PR-описания пишутся по `docs/style-guide.md`                                                                        | `docs/style-guide.md`                |
| C8  | При конфликте документов приоритет: конституция → ADR → NFR → PRD → спека фичи                                                               | `docs/constitution.md`, «Управление» |
| C9  | Термины — из глоссария PRD, без синонимов                                                                                                    | `docs/style-guide.md`, S8            |
| C10 | Зависимость добавляется вместе с первым кодом, который её использует                                                                         | —                                    |
| C11 | Тест НЕ ДОЛЖЕН ослабляться или удаляться ради прохождения                                                                                    | `docs/constitution.md`, III          |
| C12 | Права проверяются только в модуле `authz`; проверки в обработчиках ЗАПРЕЩЕНЫ                                                                 | `docs/constitution.md`, V            |
| C13 | Данные о бронях НЕ ДОЛЖНЫ попадать владельцу желания                                                                                         | `docs/constitution.md`, V            |
| C14 | Секреты, токены, email НЕ ДОЛЖНЫ попадать в код, логи и тестовые снимки                                                                      | `docs/constitution.md`, V            |
| C15 | Строки UI — через i18n-ключи; локали `ru` и `en` обновляются вместе                                                                          | `docs/constitution.md`, VIII         |
| C16 | Изменение поведения ДОЛЖНО менять спеку в том же PR                                                                                          | `docs/constitution.md`, I            |
| C17 | При изменении `docs/constitution.md` агент ДОЛЖЕН в том же коммите обновить копию: `cp docs/constitution.md .specify/memory/constitution.md` | `docs/constitution.md`, шапка        |
| C18 | Агент НЕ ДОЛЖЕН править `.specify/memory/constitution.md` напрямую и запускать `/speckit-constitution`                                       | `docs/constitution.md`, шапка        |

## Состояние

Фаза 3 «Walking skeleton», локальная часть готова: Drizzle, миграции, `GET /api/health`, Playwright. Таблиц в схеме нет. Следующая фича — F1 (`specs/001-auth-family`), этап tasks.

| Не настроено                                       | Когда                |
| -------------------------------------------------- | -------------------- |
| Dockerfile, деплой на Railway, Sentry, UptimeRobot | Фаза 3, остаток      |
| Better Auth                                        | ADR-003, ADR-007, F1 |
| `pnpm wt:new`                                      | TBD                  |
| Субагенты, hooks, собственные skills               | Следующий шаг фазы 2 |
