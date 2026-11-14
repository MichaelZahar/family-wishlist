# Data Model: F1 · Auth и семья

Основа: `docs/domain-model.md`, `research.md`. Идентификаторы — `uuid`. Время — `timestamptz`.

## Таблицы Better Auth (генерируются, R-13)

| Таблица        | Роль в F1            | Заметки                                                                    |
| -------------- | -------------------- | -------------------------------------------------------------------------- |
| `user`         | Аккаунт              | `email` уникален, в нижнем регистре; `name` — копия `profile.display_name` |
| `account`      | Учётные данные       | Хеш пароля; провайдер `credential`                                         |
| `session`      | Сессия               | `expires_at`, `active_organization_id`                                     |
| `verification` | Токены сброса пароля | `identifier` хешируется; `value` = `user.id`; срок 24 ч                    |
| `organization` | Family               | `name`; `slug` генерируется сервером                                       |
| `member`       | Участие              | `user_id`, `organization_id`, `role`: `admin` \| `member`                  |
| `invitation`   | Не используется      | Создаётся генератором, остаётся пустой (R-1)                               |

Строки этих таблиц создаёт и меняет Better Auth. Исключения: `user.name` (R-11) и удаление строк `verification` (R-6).

## `profile`

| Поле                    | Тип                           | Правила                                                       |
| ----------------------- | ----------------------------- | ------------------------------------------------------------- |
| `id`                    | uuid, PK                      | —                                                             |
| `family_id`             | uuid, FK → `organization.id`  | NOT NULL (D-01)                                               |
| `user_id`               | uuid, FK → `user.id`, NULL    | Уникален: один профиль на аккаунт (FR-026). Ослабляется в F12 |
| `managed_by_profile_id` | uuid, FK → `profile.id`, NULL | В F1 всегда NULL                                              |
| `display_name`          | text                          | NOT NULL, 1…80 символов после обрезки пробелов (FR-027)       |
| `language`              | text, NULL                    | `ru` \| `en`; NOT NULL для взрослого профиля (FR-028)         |
| `avatar_url`            | text, NULL                    | В F1 не заполняется                                           |
| `created_at`            | timestamptz                   | NOT NULL                                                      |

- CHECK D-06: `(user_id IS NULL) = (managed_by_profile_id IS NOT NULL)`.
- CHECK: `user_id IS NULL OR language IS NOT NULL`.
- Создаётся в `organizationHooks.afterAddMember` — и для создателя семьи, и для вступившего по приглашению.

## `family_invitation`

| Поле                    | Тип                           | Правила                                        |
| ----------------------- | ----------------------------- | ---------------------------------------------- |
| `id`                    | uuid, PK                      | Публичный идентификатор для списка и отзыва    |
| `family_id`             | uuid, FK → `organization.id`  | NOT NULL (D-01)                                |
| `token_hash`            | text                          | NOT NULL, уникален; SHA-256 токена (D-08, R-2) |
| `created_by_profile_id` | uuid, FK → `profile.id`       | NOT NULL                                       |
| `created_at`            | timestamptz                   | NOT NULL                                       |
| `expires_at`            | timestamptz                   | NOT NULL; `created_at` + 7 дней (R-AUTH-02)    |
| `used_at`               | timestamptz, NULL             | Момент принятия                                |
| `used_by_profile_id`    | uuid, FK → `profile.id`, NULL | Кто вступил                                    |
| `revoked_at`            | timestamptz, NULL             | Момент отзыва                                  |

Индекс: `(family_id, created_at)`.

**Состояние** — вычисляется, не хранится:

| Состояние    | Условие                                                         |
| ------------ | --------------------------------------------------------------- |
| Действует    | `used_at IS NULL AND revoked_at IS NULL AND expires_at > now()` |
| Использовано | `used_at IS NOT NULL`                                           |
| Отозвано     | `revoked_at IS NOT NULL`                                        |
| Истекло      | остальное                                                       |

**Переходы:**

| Из           | В            | Событие                                                    | Гарантия                                                                                  |
| ------------ | ------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Действует    | Использовано | Принятие (FR-007, FR-008)                                  | Один `UPDATE … WHERE <действует> RETURNING`: из двух одновременных запросов проходит один |
| Действует    | Отозвано     | Отзыв admin (FR-011)                                       | Тот же условный `UPDATE`                                                                  |
| Действует    | Истекло      | Время                                                      | —                                                                                         |
| Использовано | Действует    | Откат при сбое создания аккаунта (например, `EMAIL_TAKEN`) | `used_at = NULL` в обработчике ошибки (FR-035)                                            |

Других переходов нет.

## Связи

| Связь                                                     | Кардинальность         |
| --------------------------------------------------------- | ---------------------- |
| `organization` → `member`                                 | 1 : N                  |
| `user` → `member`                                         | 1 : 1 в F1 (R-AUTH-05) |
| `user` → `profile`                                        | 1 : 1 в F1             |
| `organization` → `profile`                                | 1 : N                  |
| `organization` → `family_invitation`                      | 1 : N                  |
| `profile` → `family_invitation` (`created_by`, `used_by`) | 1 : N                  |

## Инварианты фичи

- **I-1.** У аккаунта ровно одно участие и один профиль (R-AUTH-05, FR-026).
- **I-2.** `profile.family_id` = `member.organization_id` того же аккаунта.
- **I-3.** Аккаунт без участия не существует дольше одного запроса: сбой регистрации откатывается (FR-002, FR-003).
- **I-4.** Токен приглашения в открытом виде не хранится и не логируется (D-08, FR-032).
- **I-5.** Каждый запрос к `profile` и `family_invitation` фильтруется по `family_id` активной семьи (D-01, FR-031).

## Изменения в документах

- ✅ `docs/domain-model.md`: сущность FamilyInvitation, поле `Profile.language`, D-11, D-12.
- ✅ `docs/permissions.md`: строки из `research.md`, R-12.
