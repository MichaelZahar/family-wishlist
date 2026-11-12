# Family Wishlist

Семейные вишлисты с бронированием подарков. Что делает система — `docs/prd.md`. Почему так решили — `docs/adr.md`. Принципы, гейты и DoD — `docs/constitution.md`.

## Стек

Монорепо pnpm, Node.js 26, TypeScript (ESM), Fastify, React + Vite, PostgreSQL 17, zod. Полный состав и альтернативы — ADR-001.

## Команды

Запускаются из корня.

| Команда                             | Действие                                                         |
| ----------------------------------- | ---------------------------------------------------------------- |
| `pnpm install`                      | Установка зависимостей и git-хуков                               |
| `pnpm db:up` / `pnpm db:down`       | Запуск / остановка Postgres в Docker Compose                     |
| `pnpm db:migrate`, `pnpm db:seed`   | Заглушки до фазы 3                                               |
| `pnpm dev`                          | API (`tsx watch`, порт `API_PORT`) + web (Vite, порт `WEB_PORT`) |
| `pnpm test`                         | Vitest по всем пакетам                                           |
| `pnpm vitest run --project api`     | Тесты одного пакета: `api`, `web`, `shared`                      |
| `pnpm lint`                         | ESLint                                                           |
| `pnpm format` / `pnpm format:check` | Prettier: запись / проверка                                      |
| `pnpm typecheck`                    | `tsc -b` по project references                                   |
| `pnpm build`                        | `tsc -b` + сборка web                                            |

Сброс окружения — ADR-006, «Последствия».

## Структура

| Путь                       | Содержание                                                                    |
| -------------------------- | ----------------------------------------------------------------------------- |
| `apps/api`                 | Fastify-сервер. `src/app.ts` — `buildApp()`, `src/server.ts` — запуск         |
| `apps/web`                 | React + Vite. Прокси `/api` → API в `vite.config.ts`                          |
| `packages/shared`          | Контракт API: zod-схемы и типы                                                |
| `scripts`                  | Служебные скрипты (`db-migrate.ts`, `db-seed.ts`)                             |
| `docker/postgres/init`     | SQL, выполняемый при первом создании volume                                   |
| `docs`                     | Оглавление и статусы документов — `docs/README.md`                            |
| `apps/web/src/i18n`        | Инициализация i18next; локали — `locales/ru.json`, `locales/en.json`          |
| `.specify`                 | Spec Kit: шаблоны, скрипты, `memory/constitution.md` — копия конституции      |
| `.claude/skills/speckit-*` | Команды Spec Kit: `/speckit-specify`, `/speckit-plan`, `/speckit-tasks` и др. |
| `.github/workflows/ci.yml` | CI: lint → format:check → typecheck → test → build                            |

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
- API тестируется через `buildApp()` без запуска сервера.
- Тестовая БД `wishlist_test` (`DATABASE_URL_TEST`) создаётся скриптом `docker/postgres/init/01-test-db.sql`.
- Pre-commit (husky + lint-staged): `eslint --fix` и `prettier --write` по staged-файлам.

## Правила

| #   | Правило                                                                                                                                      | Источник                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| C1  | Перед завершением задачи агент ДОЛЖЕН получить код 0 от `pnpm lint && pnpm typecheck && pnpm test`                                           | —                                    |
| C1a | Перед PR агент ДОЛЖЕН получить код 0 от `pnpm format:check && pnpm build`                                                                    | `.github/workflows/ci.yml`           |
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

Фаза 2 «Окружение» (`docs/plan.md`, раздел 5). Продуктового кода нет: `buildApp()` без роутов, страница-заглушка, схема-заглушка в `shared`. Spec Kit 1.3.1 и i18n подключены.

| Не настроено                                             | Когда                |
| -------------------------------------------------------- | -------------------- |
| Drizzle, миграции, `GET /api/health`, Dockerfile, деплой | Фаза 3               |
| Better Auth                                              | ADR-003, фаза 4      |
| `pnpm e2e` (Playwright), `pnpm wt:new`                   | TBD                  |
| Субагенты, hooks, собственные skills                     | Следующий шаг фазы 2 |
