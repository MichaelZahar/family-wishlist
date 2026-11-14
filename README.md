# Family Wishlist

Семейные вишлисты с бронированием подарков. Документация — [`docs/`](docs/README.md).

## Требования

| Инструмент     | Версия                             |
| -------------- | ---------------------------------- |
| Node.js        | 26 (`.nvmrc`)                      |
| pnpm           | 12 — `npm install -g pnpm`         |
| Docker Desktop | Команда `docker` доступна в `PATH` |

## Быстрый старт

```sh
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

Web — <http://localhost:5173>, API — <http://localhost:3000> (через прокси: `/api`).

Все команды и структура — в [`CLAUDE.md`](CLAUDE.md).
