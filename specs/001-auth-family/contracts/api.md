# API Contract: F1 · Auth и семья

Контракт фиксируется на шаге plan (конституция IV). Реализация — zod-схемы в `packages/shared`, вносит `architect`.
Базовый путь — `/api`. Тела — JSON. Сессия — cookie Better Auth.

## Общие правила

- Ошибка собственных роутов: `{ "error": { "code": "<CODE>", "message": "<текст для разработчика>" } }`. Текст для пользователя берётся из i18n по `code`.
- Ошибка валидации: `400 VALIDATION_ERROR`, дополнительно `error.fields: [{ "path": "password", "code": "too_short" }]`.
- Роуты `/api/auth/*` отвечают в формате Better Auth: `{ "code": "<CODE>", "message": "…" }`.
- Изменяющий запрос с `Origin` ≠ `APP_URL`: `403 ORIGIN_NOT_ALLOWED` (FR-033).
- Превышение лимита: `429 RATE_LIMITED`, заголовок `Retry-After` (FR-019, FR-020).
- Роут с пометкой «сессия» без сессии: `401 UNAUTHENTICATED` (FR-017).
- Ресурс другой семьи: `404 NOT_FOUND` (FR-031).

## Типы

| Тип                 | Поля                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `Language`          | `"ru"` \| `"en"`                                                                              |
| `Role`              | `"admin"` \| `"member"`                                                                       |
| `Email`             | строка, формат email, ≤ 254 символа                                                           |
| `Password`          | строка, 10…128 символов (FR-004)                                                              |
| `DisplayName`       | строка, 1…80 символов после обрезки пробелов                                                  |
| `FamilyName`        | строка, 1…80 символов после обрезки пробелов                                                  |
| `Me`                | `{ user: { id, email }, profile: { id, displayName, language }, family: { id, name }, role }` |
| `Member`            | `{ profileId, displayName, role }`                                                            |
| `Invitation`        | `{ id, createdAt, expiresAt }` — без токена и ссылки (FR-038)                                 |
| `InvitationCreated` | `Invitation` + `{ url }`; `url` = `<APP_URL>/invite#<token>`                                  |
| `PasswordResetLink` | `{ url, expiresAt }`; `url` = `<APP_URL>/reset-password#<token>`                              |

Даты — ISO 8601, UTC.

## Собственные роуты

| #    | Метод и путь                                     | Доступ     | Тело запроса                                             | Успех                                                                   | Ошибки                                                                             | Требования             |
| ---- | ------------------------------------------------ | ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| E-1  | `POST /register`                                 | Без сессии | `{ email, password, displayName, familyName, language }` | `201 Me` + cookie сессии                                                | `400`, `409 EMAIL_TAKEN`, `409 ALREADY_IN_FAMILY`, `429`                           | FR-001…005, FR-035     |
| E-2  | `GET /me`                                        | Сессия     | —                                                        | `200 Me`                                                                | `401`                                                                              | FR-017                 |
| E-3  | `PATCH /me`                                      | Сессия     | `{ displayName?, language? }`, хотя бы одно поле         | `200 Me`                                                                | `400`, `401`                                                                       | FR-027, FR-028         |
| E-4  | `GET /family/members`                            | Сессия     | —                                                        | `200 { members: Member[] }`                                             | `401`                                                                              | FR-030                 |
| E-5  | `POST /family/members/:profileId/password-reset` | admin      | —                                                        | `201 PasswordResetLink`                                                 | `401`, `403 FORBIDDEN`, `404`, `429`                                               | FR-021, FR-023, FR-024 |
| E-6  | `GET /invitations`                               | admin      | —                                                        | `200 { invitations: Invitation[] }` — только действующие, новые первыми | `401`, `403`                                                                       | FR-036, FR-037         |
| E-7  | `POST /invitations`                              | admin      | —                                                        | `201 InvitationCreated`                                                 | `401`, `403`, `429`                                                                | FR-006, FR-012, FR-038 |
| E-8  | `DELETE /invitations/:id`                        | admin      | —                                                        | `204`                                                                   | `401`, `403`, `404`, `409 INVITATION_NOT_ACTIVE`                                   | FR-011, FR-012         |
| E-9  | `POST /invitations/lookup`                       | Любой      | `{ token }`                                              | `200 { familyName }`                                                    | `400`, `409 ALREADY_IN_FAMILY`, `410 INVITATION_INVALID`, `429`                    | FR-009, FR-010         |
| E-10 | `POST /invitations/accept`                       | Без сессии | `{ token, email, password, displayName, language }`      | `201 Me` + cookie сессии                                                | `400`, `409 EMAIL_TAKEN`, `409 ALREADY_IN_FAMILY`, `410 INVITATION_INVALID`, `429` | FR-007…010, FR-035     |

Уточнения:

- E-1, E-10: запрос с действующей сессией — `409 ALREADY_IN_FAMILY`.
- E-5: `:profileId` чужой семьи или детский профиль — `404`. admin может указать свой профиль.
- E-8: приглашение использовано, отозвано или истекло — `409 INVITATION_NOT_ACTIVE`; чужой семьи или не существует — `404`.
- E-9, E-10: `410 INVITATION_INVALID` — один код для истёкшего, использованного, отозванного и несуществующего токена (FR-009).
- E-10 при `EMAIL_TAKEN` или `VALIDATION_ERROR` оставляет приглашение действующим.
- Проверка прав — до поиска ресурса: member получает `403` и для чужого, и для своего идентификатора.

## Роуты Better Auth

Наружу открыты только эти четыре (R-5); остальные пути `/api/auth/*` — `404`.

| #   | Метод и путь                | Тело запроса             | Успех                   | Ошибки                                                                                        | Требования             |
| --- | --------------------------- | ------------------------ | ----------------------- | --------------------------------------------------------------------------------------------- | ---------------------- |
| B-1 | `POST /auth/sign-in/email`  | `{ email, password }`    | `200` + cookie сессии   | `401 INVALID_EMAIL_OR_PASSWORD` — одинаково для неверного пароля и неизвестного email; `429`  | FR-014, FR-018, FR-019 |
| B-2 | `POST /auth/sign-out`       | —                        | `200`, cookie очищена   | —                                                                                             | FR-016                 |
| B-3 | `GET /auth/get-session`     | —                        | `200` сессия или `null` | —                                                                                             | клиент Better Auth     |
| B-4 | `POST /auth/reset-password` | `{ token, newPassword }` | `200`                   | `400 INVALID_TOKEN` — истёк, использован, заменён или не существует; `400 PASSWORD_TOO_SHORT` | FR-022, FR-025         |

- B-4 при успехе завершает все сессии аккаунта и гасит токен.
- Точные коды B-4 сверяются с исходниками Better Auth первой задачей implement.

## Коды ошибок

| Код                         | HTTP | Ключ i18n                                |
| --------------------------- | ---- | ---------------------------------------- |
| `VALIDATION_ERROR`          | 400  | `errors.validation.*` по `fields[].code` |
| `UNAUTHENTICATED`           | 401  | `errors.unauthenticated`                 |
| `INVALID_EMAIL_OR_PASSWORD` | 401  | `errors.invalidCredentials`              |
| `FORBIDDEN`                 | 403  | `errors.forbidden`                       |
| `ORIGIN_NOT_ALLOWED`        | 403  | `errors.generic`                         |
| `NOT_FOUND`                 | 404  | `errors.notFound`                        |
| `EMAIL_TAKEN`               | 409  | `errors.emailTaken`                      |
| `ALREADY_IN_FAMILY`         | 409  | `errors.alreadyInFamily`                 |
| `INVITATION_NOT_ACTIVE`     | 409  | `errors.invitationNotActive`             |
| `INVITATION_INVALID`        | 410  | `errors.invitationInvalid`               |
| `INVALID_TOKEN`             | 400  | `errors.resetLinkInvalid`                |
| `RATE_LIMITED`              | 429  | `errors.rateLimited`                     |

## Страницы web

| Путь                      | Доступ     | Назначение                                          | Сценарий спеки       |
| ------------------------- | ---------- | --------------------------------------------------- | -------------------- |
| `/register`               | Без сессии | Создание семьи                                      | User Story 1         |
| `/login`                  | Без сессии | Вход                                                | User Story 2         |
| `/invite#<token>`         | Любой      | Принятие приглашения или отказ                      | User Story 3         |
| `/reset-password#<token>` | Любой      | Новый пароль                                        | User Story 4         |
| `/`                       | Сессия     | Семья: список участников; для admin — ссылка сброса | User Story 4, FR-030 |
| `/invitations`            | admin      | Создание, список, отзыв                             | User Story 3         |
| `/settings`               | Сессия     | Имя и язык, выход                                   | User Story 5         |

Защищённый путь без сессии перенаправляет на `/login`.
