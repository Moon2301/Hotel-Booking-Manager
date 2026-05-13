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

### 1. Start Docker containers
```bash
pnpm docker:up
# With pgAdmin:
pnpm docker:tools
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Run migrations
```bash
pnpm migrate
```

### 4. Start dev server
```bash
pnpm dev
```

API will be available at: http://localhost:3000/api/v1

## Services
| Service    | URL                        |
|------------|----------------------------|
| API        | http://localhost:3000      |
| PostgreSQL | localhost:5432             |
| Redis      | localhost:6379             |
| pgAdmin    | http://localhost:5050      |
