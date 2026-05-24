# 🏨 Hotel Management System — Project Review

> **Mango Hotel** — Hệ thống quản lý khách sạn full-stack, kiến trúc monorepo, được xây dựng với NestJS, Next.js và React (Vite).

---

## 📌 Tổng quan

Đây là một hệ thống quản lý khách sạn hoàn chỉnh bao gồm ba ứng dụng chạy song song: một **backend API** trung tâm, một **Admin Dashboard** dành cho nhân viên/quản trị viên, và một **Guest Portal** (cổng thông tin khách hàng). Dữ liệu được lưu trữ trên PostgreSQL, hỗ trợ real-time qua Socket.io với Redis làm adapter, và tích hợp thanh toán qua VNPay.

---

## 🏗️ Kiến trúc Monorepo

Dự án sử dụng **pnpm Workspaces + TurboRepo** để quản lý toàn bộ codebase trong một repository duy nhất.

```
Hotel-Manage/
├── apps/
│   ├── api/          → NestJS Backend (port 3000)
│   ├── web-admin/    → Next.js Admin Dashboard (port 3001)
│   └── web-client/   → React (Vite) Guest Portal (port 8080)
├── packages/
│   ├── api-contract/ → Shared type definitions (TS)
│   └── zod-schemas/  → Shared Zod validation schemas
├── docker/
│   └── postgres/     → PostgreSQL init scripts
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

**Lợi ích của Monorepo:**
- Chạy tất cả ứng dụng cùng lúc với một lệnh: `pnpm dev`
- TurboRepo cache kết quả build, tăng tốc CI đáng kể
- Chia sẻ types/schemas giữa frontend và backend qua `packages/`

---

## ⚙️ Hạ tầng (Infrastructure)

| Thành phần       | Công nghệ               | Cổng mặc định |
|------------------|-------------------------|---------------|
| Database         | PostgreSQL 15 (Alpine)  | 5432          |
| Cache / Pub-Sub  | Redis 7 (Alpine)        | 6379          |
| DB Admin (dev)   | pgAdmin 4               | 5050          |

Toàn bộ infrastructure được đóng gói bằng **Docker Compose**. Các service (postgres, redis) được cấu hình `healthcheck` trước khi API có thể kết nối.

```bash
# Khởi động infrastructure
pnpm docker:up

# Khởi động pgAdmin (profile tools)
pnpm docker:tools
```

---

## 🔧 Apps — Chi tiết từng ứng dụng

---

### 1. `apps/api` — NestJS Backend

**Công nghệ:** NestJS 10, TypeORM, PostgreSQL, Redis, Socket.io, Passport JWT, Swagger

**Cấu trúc source:**
```
src/
├── main.ts              → Entry point, cấu hình Swagger, CORS, Helmet, global pipes
├── app.module.ts        → Root module, import toàn bộ domain modules
├── config/              → App configuration (env loader)
├── database/            → TypeORM DataSource, migrations, seed script
├── redis/               → Redis module (ioredis)
├── health/              → Health check endpoint (/health)
└── modules/
    ├── auth/            → Xác thực, JWT, Passport strategies, audit log
    ├── guest/           → Quản lý thông tin khách hàng
    ├── property/        → Quản lý khách sạn / loại phòng / phòng
    ├── pricing/         → Quản lý giá phòng, pricing rules
    ├── booking/         → Đặt phòng, Invoice
    ├── payment/         → Tích hợp VNPay
    ├── task/            → Yêu cầu dịch vụ phòng + WebSocket Gateway
    ├── review/          → Đánh giá sau kỳ nghỉ
    ├── notification/    → Hệ thống thông báo (Expo push notification)
    └── chat/            → Nhắn tin nội bộ
```

**Tính năng nổi bật:**

- **Bảo mật:** Helmet, CORS, cookie-parser, rate limiting (ThrottlerModule) — giới hạn 60 req/phút thông thường, 5 lần đăng nhập/phút
- **Validation:** Global `ValidationPipe` với `whitelist: true` (tự động loại bỏ các field không khai báo)
- **API Documentation:** Swagger UI tự động sinh ra tại `/docs` (chỉ ở môi trường non-production)
- **Migrations:** TypeORM migration workflow, có 1 baseline migration duy nhất
- **Scheduled Jobs:** `@nestjs/schedule` hỗ trợ cron jobs
- **Real-time:** WebSocket Gateway `/tasks` namespace — xác thực JWT ngay lúc kết nối, hỗ trợ join room theo `bookingId` hoặc `propertyId`

**API Prefix:** `api/v1` (ví dụ: `GET /api/v1/bookings`)

---

### 2. `apps/web-admin` — Next.js Admin Dashboard

**Công nghệ:** Next.js 14 (App Router), React 18, TailwindCSS, Shadcn/UI (Radix UI), TanStack Query, TanStack Table, Recharts, Zod + React Hook Form, Vitest

**Cấu trúc:**
```
src/
├── app/
│   ├── (auth)/          → Trang đăng nhập admin
│   └── (dashboard)/     → Layout chính Dashboard
│       ├── guests/      → Quản lý danh sách khách
│       ├── invoices/    → Quản lý hoá đơn
│       ├── properties/  → Quản lý khách sạn / phòng
│       ├── reviews/     → Quản lý đánh giá
│       ├── room-board/  → Bảng trạng thái phòng (Room Board)
│       └── tasks/       → Quản lý & xử lý yêu cầu dịch vụ
├── components/
│   ├── layout/          → Sidebar, header, navigation
│   ├── shared/          → Các component tái sử dụng
│   ├── data-table/      → Generic data table (TanStack Table)
│   └── ui/              → Shadcn/UI component library
├── lib/
│   ├── api/             → API client functions (axios)
│   ├── rbac.ts          → Role-based access control logic
│   ├── auth.ts          → Auth helpers
│   ├── timezone.ts      → Timezone utilities
│   ├── room-status.ts   → Room status mapping
│   └── error-handler.ts → Centralized error handling
├── hooks/               → Custom React hooks
├── providers/           → Context providers (QueryClient, Toast...)
├── schemas/             → Zod form validation schemas
├── types/               → TypeScript type definitions
└── middleware.ts        → Next.js middleware (route protection)
```

**Tính năng nổi bật:**

- **RBAC:** Hệ thống phân quyền theo role (được implement trong `lib/rbac.ts` với test coverage)
- **Route protection:** Next.js `middleware.ts` bảo vệ các route Dashboard
- **Data table:** Generic `DataTable` component sử dụng TanStack Table — có sorting, pagination, filtering
- **Charts:** Recharts cho analytics/báo cáo
- **Real-time tasks:** Socket.io-client lắng nghe cập nhật yêu cầu dịch vụ từ backend
- **Testing:** Vitest + Testing Library + MSW (Mock Service Worker) + fast-check (property-based testing)

---

### 3. `apps/web-client` — React Guest Portal (Vite)

**Công nghệ:** React 18, Vite, React Router DOM v6, TailwindCSS, Socket.io-client, Lucide React

**Cấu trúc:** Single-file SPA với 2 route chính:

| Route | Nội dung |
|-------|----------|
| `/` | Trang chủ (Landing page) — giới thiệu Mango Hotel |
| `/my-stay` | Cổng thông tin khách — yêu cầu xác thực |

**Luồng hoạt động của Guest Portal:**

```
1. Khách hàng truy cập /my-stay
2. Đăng nhập bằng [Booking ID + Số điện thoại]
   → POST /api/v1/auth/guest-login
3. Nhận JWT token → lưu vào localStorage
4. Kết nối WebSocket /tasks namespace (gửi kèm JWT)
5. Join room theo bookingId → emit 'join_booking'
6. Real-time updates qua event 'task_changed'
```

**Ba tab chức năng sau khi đăng nhập:**

| Tab | Chức năng |
|-----|-----------|
| **Kỳ nghỉ của tôi** | Xem thông tin đặt phòng (phòng, check-in/out, trạng thái) |
| **Hoá đơn & Thanh toán** | Xem hoá đơn, thanh toán qua cổng VNPay |
| **Dịch vụ phòng** | Gửi yêu cầu dịch vụ, xem lịch sử real-time |

**Loại yêu cầu dịch vụ:** `CLEANING` · `FOOD` · `TRANSPORT` · `OTHER`

---

## 📦 Shared Packages

| Package | Mục đích |
|---------|----------|
| `packages/api-contract` | TypeScript type definitions dùng chung giữa API và frontend |
| `packages/zod-schemas` | Zod schemas dùng chung để validate data ở cả hai phía |

---

## 🔄 Luồng dữ liệu & Real-time

```
Guest Portal ──┐
               │  HTTP REST (api/v1/*)
Admin Dashboard─┤──────────────────────► NestJS API ──► PostgreSQL
               │
               │  WebSocket (/tasks)
Guest Portal ──┴────────────────────────► TaskGateway ──► Redis Adapter
Admin Dashboard─────────────────────────►              (broadcast to rooms)
```

**WebSocket Events:**
- `join_booking` — Client join room theo booking ID (Guest Portal)
- `join_property` — Client join room theo property ID (Admin)
- `task_changed` — Server broadcast khi task được tạo/cập nhật

---

## 💳 Tích hợp thanh toán — VNPay

- Backend tạo payment URL có HMAC-SHA512 signature
- Guest redirect đến VNPay gateway
- VNPay callback về `/api/v1/payment/vnpay/callback`
- Backend xác minh chữ ký, cập nhật trạng thái invoice
- Redirect về frontend với query param `?payment=success|failed|error`

---

## 🛡️ Bảo mật

| Lớp | Biện pháp |
|-----|-----------|
| **HTTP** | Helmet headers, CORS whitelist |
| **Auth** | JWT (Access Token) via `Authorization: Bearer` và HttpOnly Cookie |
| **Rate Limiting** | 60 req/phút; 5 lần login/phút |
| **Validation** | `ValidationPipe` + Zod schemas (whitelist, forbidNonWhitelisted) |
| **WebSocket** | JWT verification ngay khi handshake, disconnect nếu không hợp lệ |
| **RBAC** | Role-based access control trên Admin Dashboard |

---

## 🗄️ Database Schema (tổng quan)

Database được quản lý bởi **TypeORM migrations**. Các entity chính bao gồm:

- `Property` → `RoomType` → `Room`
- `Guest` → `Booking` → `Invoice`
- `Booking` → `Task` (yêu cầu dịch vụ)
- `Booking` → `Review`
- `User` (staff/admin) → `AuditLog`
- `Notification`, `Message` (Chat)

---

## 🚀 Hướng dẫn chạy dự án

### Yêu cầu
- Node.js ≥ 20
- pnpm ≥ 9
- Docker & Docker Compose

### Bước 1: Cài đặt dependencies
```bash
pnpm install
```

### Bước 2: Cấu hình môi trường
```bash
# Copy file env mẫu
cp .env.example .env
# Chỉnh sửa các giá trị trong .env (DB, Redis, JWT, VNPay...)
```

### Bước 3: Khởi động hạ tầng (PostgreSQL + Redis)
```bash
pnpm docker:up
```

### Bước 4: Chạy migrations
```bash
pnpm --filter @hotel/api migrate:run
```

### Bước 5: Chạy toàn bộ ứng dụng
```bash
pnpm dev
```

| App | URL |
|-----|-----|
| Guest Portal | http://localhost:8080 |
| Admin Dashboard | http://localhost:3001 |
| API | http://localhost:3000/api/v1 |
| Swagger Docs | http://localhost:3000/docs |

---

## 📋 Tổng hợp công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| **Build tool / Monorepo** | TurboRepo, pnpm Workspaces |
| **Backend framework** | NestJS 10 |
| **ORM** | TypeORM 0.3 |
| **Database** | PostgreSQL 15 |
| **Cache / Pub-Sub** | Redis 7, ioredis, @socket.io/redis-adapter |
| **Real-time** | Socket.io 4 |
| **Auth** | Passport.js, JWT (@nestjs/jwt), bcrypt |
| **Validation** | class-validator, class-transformer, Zod |
| **Admin UI framework** | Next.js 14 (App Router) |
| **Guest UI framework** | React 18 + Vite |
| **UI Components** | Shadcn/UI (Radix UI), TailwindCSS |
| **Data fetching** | TanStack Query (React Query) |
| **Tables** | TanStack Table |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **Icons** | Lucide React |
| **Testing (Admin)** | Vitest, Testing Library, MSW, fast-check |
| **Containerization** | Docker, Docker Compose |
| **Payment Gateway** | VNPay (HMAC-SHA512) |
| **API Docs** | Swagger / OpenAPI |
| **Push Notifications** | Expo Server SDK |
| **Scheduling** | @nestjs/schedule |

---

*Tài liệu này được tạo ngày 2026-05-23. Cấu trúc có thể thay đổi theo quá trình phát triển.*
