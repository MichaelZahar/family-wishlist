# Family Wishlist — доменная модель

Статус: черновик · 2026-11-12. Основа: `docs/prd.md` (R-…), ADR-003, ADR-004.

## 1. Сущности

Таблицы Better Auth (`user`, `session`, `account`, `organization`, `member`, `invitation`) не дублируем. Семья = `organization`, роль = `member.role`.

| Сущность | Назначение | Ключевые поля |
| --- | --- | --- |
| **Family** | Семья (= organization Better Auth) | `id`, `name` |
| **Profile** | Член семьи, владелец пула | `id`, `family_id`, `user_id?`, `managed_by_profile_id?`, `display_name`, `avatar_url?` |
| **Wish** | Желание | `id`, `family_id`, `owner_profile_id`, `kind` (concrete/abstract), `title`, `description?`, `url?`, `price?`, `currency?`, `image_url?`, `store?`, `parse_status`, `status`, `deleted_at?` |
| **Wishlist** | Подборка | `id`, `family_id`, `owner_profile_id`, `title`, `event_id?`, `status` (active/archived) |
| **WishlistItem** | Желание в вишлисте | `wishlist_id`, `wish_id`, `position` |
| **WishlistShare** | Доступ пользователю | `wishlist_id`, `recipient_profile_id`, `created_at` |
| **ShareLink** | Доступ по ссылке | `id`, `wishlist_id`, `token_hash`, `created_at`, `revoked_at?` |
| **Reservation** | Бронь | `id`, `family_id`, `wish_id`, `reserver_profile_id?`, `guest_name?`, `guest_token_hash?`, `share_link_id?`, `status` (active/cancelled/gifted), `created_at` |
| **Event** | Повод профиля | `id`, `family_id`, `profile_id`, `type` (birthday/anniversary/holiday/custom), `holiday_id?`, `title`, `date`, `yearly` |
| **Holiday** | Системный каталог праздников (без `family_id`, исключение из D-01) | `id`, `title`, `date_rule`, `region?` |
| **Reminder** | Напоминание получателю | `id`, `event_id`, `occurrence_date`, `recipient_profile_id`, `offset_days` (14/3), `seen_at?` |
| **FeedEntry** | Запись ленты | `id`, `family_id`, `wishlist_id`, `wish_id`, `type` (wish_added/wish_updated/wish_removed), `created_at` |

## 2. Связи

| Связь | Кардинальность |
| --- | --- |
| Family → Profile | 1 : N |
| User → Profile | 1 : 0..1 в рамках семьи |
| Profile (взрослый) → Profile (детский) | 1 : N через `managed_by_profile_id` |
| Profile → Wish | 1 : N |
| Profile → Wishlist | 1 : N |
| Wishlist ↔ Wish | N : M через WishlistItem (R-LST-02) |
| Wishlist → WishlistShare | 1 : N |
| Wishlist → ShareLink | 1 : N, активна ≤ 1 |
| Wish → Reservation | 1 : N, активна ≤ 1 (R-RES-06) |
| Profile → Event | 1 : N |
| Holiday → Event | 1 : N (профиль добавляет праздник из каталога себе) |
| Event → Wishlist | 1 : N |

## 3. Инварианты

- **D-01.** Каждая доменная таблица содержит `family_id`; запросы фильтруются по активной семье (ADR-004).
- **D-02.** В WishlistItem владелец желания = владелец вишлиста.
- **D-03.** У желания ≤ 1 брони со `status = active`. Реализация: частичный уникальный индекс (R-RES-06).
- **D-04.** У брони задан ровно один из `reserver_profile_id` или `guest_name`.
- **D-05.** `reserver_profile_id` ≠ владелец желания.
- **D-06.** Детский профиль: `user_id IS NULL` ⇔ `managed_by_profile_id IS NOT NULL`.
- **D-07.** WishlistShare: получатель — взрослый профиль той же семьи, не владелец.
- **D-08.** Токены ссылок и гостевых броней хранятся только как хеш.
- **D-09.** Желание удаляется мягко (`deleted_at`): брони сохраняются (R-RES-07).
- **D-10.** FeedEntry не содержит данных о бронях (R-FEED-01).

## 4. Жизненный цикл

**Желание**

| Состояние | Условие | Переход |
| --- | --- | --- |
| Свободно | Нет активной брони | → Занято: бронь создана |
| Занято | Есть активная бронь | → Свободно: бронь отменена. → Подарено: событие прошло (R-HIS-01) |
| Подарено | `reservation.status = gifted` | Конечное |
| Удалено | `deleted_at` задан | Конечное; бронь видна дарящему с пометкой (R-RES-07) |

«Свободно / Занято» не хранится, а вычисляется из Reservation. Владелец видит желание всегда как «Свободно» (R-RES-01).

**Вишлист**

| Состояние | Условие |
| --- | --- |
| Личный | Нет WishlistShare и активной ShareLink (R-LST-03) |
| Открыт | Есть ≥ 1 WishlistShare или активная ShareLink |
| В архиве | Дата события прошла (R-HIS-01) |

## 5. Вопросы

- ✅ Q-07 → А: событие принадлежит одному профилю; годовщину каждый создаёт себе.
- ✅ Q-08 → Б + свои: системный каталог праздников (Holiday) и пользовательские события `type = custom`. Состав каталога и регион — TBD.
- ✅ Q-09 → А: напоминания получают только пользователи, которым открыт вишлист, привязанный к событию. Нет привязанного вишлиста — нет напоминаний.
- ✅ Q-10 → А: у каждого желания своя валюта (`price` + `currency`), без конвертации. Бюджет абстрактного желания — так же.
- ✅ Q-11 → В: приоритета у желания нет.
