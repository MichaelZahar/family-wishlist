# Research: F1 · Auth и семья

Дата: 2026-11-14. Источник фактов о Better Auth: документация и исходники тега `v1.7.23` (релиз 2026-11-13). Код не запускался.
Пометка **[NV]** — не подтверждено, проверяется первой задачей implement.

## R-1. Приглашение без привязки к email

- **Decision**: собственная таблица `family_invitation` и собственные эндпоинты. Приглашения плагина `organization` не используются. Вступление: `auth.api.signUpEmail` → серверный `auth.api.addMember` → профиль.
- **Rationale**: в `createInvitation` поле `email` обязательно; `acceptInvitation` требует совпадения email сессии и приглашения, опции отключения нет. FR-013 и R-AUTH-03 требуют ссылку, по которой email задаёт приглашённый.
- **Alternatives considered**:
  - Создавать приглашение плагина в момент принятия на введённый email — два лишних шага ради обхода проверки, токен ссылки всё равно свой.
  - Спрашивать email у admin при создании — меняет R-AUTH-02/03 и бриф.
- ✅ Зафиксировано в ADR-007 и `domain-model.md` (FamilyInvitation).

## R-2. Токен приглашения

- **Decision**: 32 случайных байта (`node:crypto.randomBytes`), в ссылке — base64url, в БД — только SHA-256 (`token_hash`, уникальный индекс). Поиск — по хешу.
- **Rationale**: D-08 и N-SEC-05 требуют ≥ 128 бит и хранение хеша. Поиск по хешу высокоэнтропийного токена не даёт тайминговой утечки значения.
- **Alternatives considered**: id строки как секрет (так делает Better Auth) — хранится открыто, виден в списке приглашений.

## R-3. Токены вне серверных логов

- **Decision**: токен в ссылке — во фрагменте: `/invite#<token>`, `/reset-password#<token>`. Клиент передаёт его в теле `POST`.
- **Rationale**: фрагмент не уходит на сервер, поэтому не попадает в логи доступа и `Referer` (N-PRV-03).
- **Alternatives considered**: токен в пути + редактирование логов — зависит от настройки каждого логгера и прокси.

## R-4. Регистрация с созданием семьи

- **Decision**: собственный `POST /api/register`. Порядок: `signUpEmail` (аккаунт + сессия) → `createOrganization({ userId })` (семья + участие с ролью `admin`) → профиль в хуке `organizationHooks.afterAddMember` → `setActiveOrganization` для новой сессии. При сбое после создания аккаунта — компенсация: удаление аккаунта каскадом.
- **Rationale**: Better Auth не создаёт организацию при регистрации; хуки `databaseHooks.*.after` выполняются после создания сессии, поэтому активная семья первой сессии выставляется явно. `createOrganization` без заголовков — системное действие, работает при `allowUserToCreateOrganization: false`.
- **Alternatives considered**:
  - `databaseHooks.user.create.after` — название семьи туда не передать, сессия уже создана.
  - `autoSignIn: false` — регистрация с существующим email возвращает 200 с синтетическим пользователем; это противоречит Q-20.
- **[NV]**: имя серверного метода `setActiveOrganization`; поведение `drizzleAdapter({ transaction: true })`.

## R-5. Закрытие лишних эндпоинтов Better Auth

- **Decision**: Fastify-роут `/api/auth/*` пропускает в `auth.handler` только список: `POST /sign-in/email`, `POST /sign-out`, `GET /get-session`, `POST /reset-password`. Остальное — `404`.
- **Rationale**: открытый `/sign-up/email` создаёт аккаунт без семьи (нарушает FR-003); `/request-password-reset` вызывает тот же колбэк, что и admin; эндпоинты `organization/*` обходят `authz` (конституция V).
- **Alternatives considered**: `disabledPaths` — не подтверждено, что серверные вызовы `auth.api.*` при нём работают.

## R-6. Ссылка сброса пароля от admin

- **Decision**: `POST /api/family/members/:profileId/password-reset` проверяет права, удаляет прежние токены участника, вызывает `auth.api.requestPasswordReset` и перехватывает `token` в колбэке `sendResetPassword` через `AsyncLocalStorage`. Смена пароля — штатный `POST /api/auth/reset-password`.
- **Настройки**: `resetPasswordTokenExpiresIn: 86400`, `revokeSessionsOnPasswordReset: true`, `minPasswordLength: 10`, `verification.storeIdentifier: 'hashed'`.
- **Rationale**: хеширование, сравнение и смена пароля остаются в Better Auth (N-SEC-04). Письмо не отправляется: колбэк только возвращает токен.
- **FR-024**: Better Auth не отзывает прежние токены. Перед выпуском удаляются строки `verification` с `value = <user id>`. В F1 других типов верификации нет.
- ⚠️ F10 (подтверждение email) добавит другие строки `verification` — условие удаления придётся сузить.
- **Alternatives considered**:
  - Плагин `admin`, `setUserPassword` — требует глобальной роли над всеми семьями, не завершает сессии, пароль знает admin.
  - Свои токены и прямой вызов внутреннего адаптера — собственный security-код.
- **[NV]**: вид `identifier` при `storeIdentifier: 'hashed'`; перехват токена через `AsyncLocalStorage`.

## R-7. Rate limit

- **Decision**: `@fastify/rate-limit`, хранилище в памяти, `hook: 'preHandler'`. Встроенный лимитер Better Auth выключен (`rateLimit.enabled: false`).

| Роут                                                           | Лимит    | Ключ                         | Источник       |
| -------------------------------------------------------------- | -------- | ---------------------------- | -------------- |
| `POST /api/auth/sign-in/email`                                 | 5 / мин  | IP + email в нижнем регистре | `nfr.md`, AC-7 |
| `POST /api/register`                                           | 10 / час | IP                           | `nfr.md`       |
| `POST /api/invitations/accept`, `POST /api/invitations/lookup` | 10 / час | IP                           | `nfr.md`       |
| `POST /api/invitations`                                        | 30 / час | пользователь                 | `nfr.md`       |
| `POST /api/family/members/:profileId/password-reset`           | 30 / час | пользователь                 | `nfr.md`       |

- **Rationale**: ключ встроенного лимитера — всегда `ip|path`, правила меняют только окно и максимум. Один сервис в проде (ADR-002) — памяти достаточно.
- **Alternatives considered**: встроенный лимитер + свой счётчик для входа — два механизма с разным поведением.
- Считаются все попытки входа, не только неверные: шестая за минуту получает `429`.

## R-8. Сессии и cookie

- **Decision**: `session.expiresIn = 30 дней`, `session.updateAge = 1 день`, `cookieCache` выключен.
- **Rationale**: умолчание — 7 дней; R-AUTH-07 требует 30 со скользящим продлением. Кеш cookie откладывает отзыв сессий, что нарушает FR-022 и N-SEC-06.
- Cookie: `httpOnly`, `SameSite=Lax` — по умолчанию; `Secure` включается при `baseURL` с `https://`.

## R-9. CSRF на собственных роутах

- **Decision**: глобальный хук Fastify: для `POST`, `PATCH`, `PUT`, `DELETE` заголовок `Origin` обязан совпадать с `APP_URL`, иначе `403 ORIGIN_NOT_ALLOWED`. В Better Auth `baseURL = APP_URL`.
- **Rationale**: проверки Better Auth действуют только внутри `auth.handler`; свои роуты она не защищает (N-SEC-13, FR-033).

## R-10. Существующий email и неразличимость входа

- **Decision**: `422 USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` от `signUpEmail` → `409 EMAIL_TAKEN` (FR-035). Вход — штатный ответ `401 INVALID_EMAIL_OR_PASSWORD`.
- **Rationale**: Better Auth отвечает одинаково на неизвестный email и неверный пароль и выравнивает время (FR-018). Email приводится к нижнему регистру библиотекой (FR-005).

## R-11. Имя и язык

- **Decision**: `profile.display_name` и `profile.language` — источник истины; `user.name` синхронизируется в той же транзакции. Изменение — `PATCH /api/me`. `user.additionalFields` не используется.
- **Rationale**: спека относит имя и язык к профилю; желания и вишлисты привязаны к профилю (ADR-003).
- **Alternatives considered**: `language` в `user.additionalFields` — доменная настройка оказывается в таблице библиотеки.

## R-12. Роли и права

- **Decision**: `creatorRole: 'admin'`; роли `admin` и `member` хранятся в `member.role`. Права проверяет только модуль `apps/api/src/authz` по `permissions.md`; система прав плагина не используется.
- **Rationale**: конституция V. Чужая семья → ресурс ищется с фильтром `family_id` → `404`.
- ✅ Строки «Видеть список участников» и «Видеть список действующих приглашений, отозвать приглашение» добавлены в `permissions.md`.

## R-13. Схема и идентификаторы

- **Decision**: `advanced.database.generateId: 'uuid'`. Схема таблиц Better Auth генерируется `auth generate --adapter drizzle --dialect postgresql` в `apps/api/src/db/schema/auth.ts`; миграции — drizzle-kit. Адаптер — `@better-auth/drizzle-adapter`.
- **Rationale**: ADR-001: источник истины данных — Drizzle-схема. CLI теперь пакет `auth`; `@better-auth/cli` устарел.
- Таблица `invitation` плагина создаётся генератором и остаётся пустой.

## R-14. Тесты

- **Decision**: API — Vitest + `app.inject()` против `DATABASE_URL_TEST`; права — модульные тесты `authz` по матрице; web — Testing Library. Проверки CSRF и лимитов — только через `inject`: вызовы `auth.api.*` их обходят.
- **Rationale**: ADR-001, ADR-006; N-SEC-01, N-SEC-02.
- e2e — Playwright (`pnpm e2e`): сценарии `quickstart.md` автоматизируются в implement.

## Новые зависимости

| Пакет                                         | Где        | Зачем                              |
| --------------------------------------------- | ---------- | ---------------------------------- |
| `better-auth`, `@better-auth/drizzle-adapter` | `apps/api` | ADR-003                            |
| `@fastify/rate-limit`                         | `apps/api` | R-7                                |
| `auth` (CLI, dev)                             | `apps/api` | R-13                               |
| `better-auth` (клиент `better-auth/react`)    | `apps/web` | вход, выход, сброс пароля          |
| `react-router`, `@tanstack/react-query`       | `apps/web` | ADR-001; первые страницы и запросы |

Drizzle, drizzle-kit и подключение к БД установлены фазой 3.
