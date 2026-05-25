# Hotel Management System Monorepo

## Project Structure
```
Hotel-Manage/
├── apps/
│   └── api/              # NestJS backend
├── packages/
│   ├── zod-schemas/      # Shared Zod validation schemas (sync FE/BE)
│   └── api-contract/     # OpenAPI types & shared interfaces
├── docker/
│   └── postgres/
│       └── init.sql      # DB extensions init
├── docker-compose.yml
├── .env.example
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Quick Start

### Cách 1 — Docker (khuyến nghị, tự chạy pnpm)

```bash
cp .env.example .env   # chỉnh secret nếu cần
pnpm docker:up       # build + postgres + redis + migrate + seed + pnpm dev
```

Xem log: `pnpm docker:logs`

| Service     | URL |
|-------------|-----|
| API         | http://localhost:3000/api/v1 |
| Web Admin   | http://localhost:3001 |
| Web Client  | http://localhost:8080 |
| PostgreSQL  | localhost:5432 |
| Redis       | localhost:6379 |
| pgAdmin     | `pnpm docker:tools` → http://localhost:5050 |

Dừng: `pnpm docker:down`

Chỉ DB + Redis (chạy app trên máy): `pnpm docker:infra` rồi `pnpm install && pnpm migrate && pnpm dev`

### Cách 2 — Chạy local (không container app)

```bash
pnpm docker:infra    # hoặc pnpm docker:up nếu muốn full docker
pnpm install
pnpm migrate
pnpm dev
```

## Services
| Service    | URL                        |
|------------|----------------------------|
| API        | http://localhost:3000      |
| Web Admin  | http://localhost:3001      |
| Web Client | http://localhost:8080      |
| PostgreSQL | localhost:5432             |
| Redis      | localhost:6379             |
| pgAdmin    | http://localhost:5050      |
