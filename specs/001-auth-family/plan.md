# Implementation Plan: F1 · Auth и семья

**Branch**: `001-auth-family` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-auth-family/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Человек создаёт семью и становится admin, приглашает взрослых по ссылке; участники входят по email и паролю (FR-001…038).

Подход: Better Auth с плагином `organization` отвечает за аккаунты, пароли, сессии, семью и роли (ADR-003). Поверх — собственные роуты Fastify для регистрации с семьёй, приглашений, ссылки сброса от admin и профиля. Права проверяет только модуль `authz`.

Три решения отходят от ожиданий ADR-003 (`research.md`):

| Решение                                  | Причина                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Собственная таблица приглашений (R-1)    | Приглашение плагина требует email и совпадения email при принятии |
| Собственный rate limit (R-7)             | Ключ встроенного лимитера — только IP + путь                      |
| Наружу открыты 4 роута Better Auth (R-5) | Остальные обходят `authz` и FR-003                                |

## Technical Context

**Language/Version**: TypeScript 6.0 (ESM), Node.js 26

**Primary Dependencies**: Fastify 5 + `fastify-type-provider-zod`, zod 4, Better Auth 1.7 + `@better-auth/drizzle-adapter`, Drizzle ORM, `@fastify/rate-limit`; React 19, React Router, TanStack Query, i18next

**Storage**: PostgreSQL 17; таблицы Better Auth + `profile`, `family_invitation` (`data-model.md`)

**Testing**: Vitest; API — `app.inject()` против `DATABASE_URL_TEST`; web — Testing Library + jsdom; e2e — Playwright (`pnpm e2e`), сценарии AC-1…10

**Target Platform**: Linux-сервер (Railway, один сервис, ADR-002); браузеры из N-UX-03

**Project Type**: web-application — монорепо `apps/api`, `apps/web`, `packages/shared`

**Performance Goals**: p95 ≤ 300 мс чтение, ≤ 500 мс запись (N-PERF-01); вход и регистрация ≤ 1 с для 95% попыток (SC-010)

**Constraints**: cookie `httpOnly` + `SameSite=Lax`; собственная криптография запрещена (N-SEC-04); токены и email вне логов (N-PRV-03); от 360 px (N-UX-01); строки UI в `ru` и `en` (N-UX-04); первая загрузка JS ≤ 250 КБ gzip (N-PERF-03)

**Scale/Scope**: ≤ 10 семей, ≤ 30 профилей в семье, ≤ 50 одновременных пользователей; 10 собственных роутов + 4 роута Better Auth, 7 страниц, 2 новые таблицы

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Принцип                       | Статус | Как выполняется                                                                  |
| ----------------------------- | ------ | -------------------------------------------------------------------------------- |
| I. Спека раньше кода          | ✅     | Спека утверждена до плана; код — после tasks                                     |
| II. Трассируемость            | ✅     | Роуты E-1…10, B-1…4 ссылаются на FR; FR — на `R-AUTH`, `AC`, `N`, `D`            |
| III. Тесты раньше реализации  | ✅     | Порядок задач: тест по AC и по ячейке матрицы → реализация                       |
| IV. Контракт первым           | ✅     | `contracts/api.md` фиксируется здесь; в `packages/shared` его вносит `architect` |
| V. Безопасность и приватность | ✅     | Права — только `authz`; фильтр по `family_id`; токены хешируются (ADR-007)       |
| VI. Простота                  | ✅     | 2 новые таблицы, 1 новая зависимость; обоснованы в ADR-007                       |
| VII. Границы модулей          | ✅     | API, web и контракт меняются в своих зонах                                       |
| VIII. Интерфейс               | ✅     | Ключи i18n в `ru` и `en`; вёрстка от 360 px                                      |
| IX. Документация              | ✅     | Артефакты по `docs/style-guide.md`                                               |

**Условия до implement** — закрыты 2026-11-14:

1. ✅ ADR-007 «Границы Better Auth: приглашения, rate limit, открытые роуты» принят (`docs/adr.md`).
2. ✅ `docs/domain-model.md` (FamilyInvitation, `Profile.language`, D-11, D-12), `docs/permissions.md` («Семья») и `docs/nfr.md` (Rate limit, N-SEC-07) обновлены.
3. ✅ Фаза 3, локальная часть: Drizzle, drizzle-kit, `pnpm db:migrate`, `GET /api/health`. Деплой на Railway — отдельно, F1 не блокирует.
4. ✅ `pnpm e2e` (Playwright) настроен и входит в CI. Сценарии F1 добавляются в implement.

**Повторная проверка после Phase 1**: новых нарушений нет. Гейт пройден.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-family/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # создаёт /speckit-tasks
```

### Source Code (repository root)

```text
packages/shared/src/
├── index.ts
└── auth/                    # zod-схемы и типы из contracts/api.md, коды ошибок

apps/api/src/
├── app.ts                   # buildApp(): плагины, хуки, роуты
├── auth/
│   ├── auth.ts              # конфигурация Better Auth (R-4, R-6, R-8, R-12, R-13)
│   ├── handler.ts           # /api/auth/* со списком разрешённых путей (R-5)
│   └── session.ts           # сессия → актор: user, profile, family, role
├── authz/
│   └── policy.ts            # матрица «Семья» из permissions.md; единственное место проверки прав
├── db/schema/
│   ├── auth.ts              # сгенерировано CLI Better Auth
│   ├── profile.ts
│   └── family-invitation.ts
├── modules/
│   ├── registration/        # E-1
│   ├── me/                  # E-2, E-3
│   ├── family/              # E-4, E-5
│   └── invitations/         # E-6…E-10, генерация и хеш токена (R-2)
└── plugins/
    ├── origin-check.ts      # R-9
    ├── rate-limit.ts        # R-7
    └── errors.ts            # формат ошибок, логи без email и токенов

apps/web/src/
├── api/                     # клиент Better Auth, запросы TanStack Query по контракту
├── auth/                    # текущий пользователь, защита маршрутов
├── pages/                   # Register, Login, Invite, ResetPassword, Family, Invitations, Settings
├── i18n/locales/            # ru.json, en.json
└── App.tsx                  # маршруты
```

Тесты лежат рядом с кодом: `*.test.ts`, `*.test.tsx`.

**Structure Decision**: существующее монорепо из ADR-001. Каталоги `auth`, `authz`, `modules`, `plugins`, `pages` создаются этой фичей. Каталог `db` создан фазой 3.

## Порядок реализации

| Шаг | Содержание                                                                                              | Зависит от |
| --- | ------------------------------------------------------------------------------------------------------- | ---------- |
| 0   | Проверка пунктов **[NV]** из `research.md` на установленной Better Auth; при расхождении — правка плана | —          |
| 1   | Контракт в `packages/shared`                                                                            | —          |
| 2   | Схема БД и миграция; конфигурация Better Auth                                                           | 0          |
| 3   | `authz` + сессия → актор; проверка `Origin`; rate limit; формат ошибок                                  | 1, 2       |
| 4   | User Story 1 и 2: регистрация, вход, выход                                                              | 3          |
| 5   | User Story 6: тесты изоляции на каждый роут                                                             | 4          |
| 6   | User Story 3: приглашения                                                                               | 4          |
| 7   | User Story 4: сброс пароля                                                                              | 4          |
| 8   | User Story 5: имя и язык                                                                                | 4          |
| 9   | e2e-сценарии по `quickstart.md`, запись в `docs/process-log.md`                                         | 5–8        |

Шаги 6, 7, 8 независимы друг от друга. В каждом: тесты API → API → тесты web → web.

## Риски

| Риск                                               | Митигация                                                               |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| Пункты **[NV]** не подтвердятся                    | Шаг 0 до остального кода; запасные варианты названы в `research.md`     |
| Аккаунт без семьи при сбое регистрации             | Компенсация + тест со сбоем после `signUpEmail` (I-3)                   |
| Обновление Better Auth меняет поведение            | Версия закреплена; тесты на `401`/`409`/`410`/`429` и завершение сессий |
| Удаление строк `verification` заденет будущие типы | Тест FR-024; пометка для F10 в `research.md`, R-6                       |
| Токен попадёт в логи                               | Токен во фрагменте ссылки и в теле запроса; тест на содержимое логов    |

## Complexity Tracking

| Violation                                                             | Why Needed                                | Simpler Alternative Rejected Because                                                    |
| --------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Своя таблица `family_invitation` вместо приглашений плагина (ADR-003) | FR-013: приглашение не привязано к email  | Плагин требует email при создании и совпадения email при принятии; опции отключения нет |
| Зависимость `@fastify/rate-limit`                                     | FR-019: лимит входа по паре IP + email    | Ключ встроенного лимитера Better Auth — только IP + путь                                |
| Перехват токена сброса через `AsyncLocalStorage`                      | FR-021: ссылку получает admin, письма нет | Плагин `admin` даёт власть над всеми семьями и не завершает сессии                      |
