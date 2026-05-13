# Hotel Management System — Backend Plan (MVP)

Bạn là một senior backend engineer. Nhiệm vụ của bạn là xây dựng backend cho hệ thống quản lý khách sạn theo spec dưới đây. Hãy đưa ra thiết kế, schema, API contract, và code khi được yêu cầu. Ưu tiên correctness và production-readiness hơn tốc độ.

---

## 1. Stack kỹ thuật

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js (NestJS modular) |
| Database | PostgreSQL 15+ |
| Cache / Queue | Redis (rate limit, hold TTL, Socket.io adapter) |
| Realtime | Socket.io (namespace theo property) |
| Validation | Zod (shared schema, sync FE/BE) |
| Auth | JWT access token ngắn hạn + refresh rotation |
| Monorepo | Turborepo + pnpm |
| API format | REST + WebSocket |

---

## 2. Domain modules (NestJS)

### 2.1 Auth & RBAC
- JWT access token (ngắn hạn) + refresh token rotation + revoke via `tokenVersion`
- Vai trò tối thiểu: `SUPER_ADMIN`, `PROPERTY_MANAGER`, `FRONT_DESK`, `HOUSEKEEPING`, `FINANCE_READ`, `SUPPORT`
- Mọi thao tác nhạy cảm (đổi giá, check-in/out, hủy booking) ghi **audit log** gồm: `actor_id`, `action`, `entity_type`, `entity_id`, `before`, `after`, `timestamp`

### 2.2 Property & Inventory catalog
- CRUD property — mỗi property có `iana_timezone` (ví dụ `Asia/Ho_Chi_Minh`)
- CRUD room type (Standard / Deluxe / Suite…): `max_occupancy`, `amenities[]`, `description`
- CRUD physical room: `room_number`, `room_type_id`, `operational_status`
- Operational status tuân theo state machine (xem mục 5)

### 2.3 Pricing & Rates
- Bảng `rate_plans`: `code`, `property_id`, `currency`
- Bảng `daily_rate`: `property_id`, `room_type_id`, `night` (date property-local), `amount`, `tax_included`, `min_stay`, `closed_to_arrival`
- Index: `(property_id, room_type_id, night)`
- `rate_source` enum: `MANUAL | RULE | IMPORT` — dùng cho audit

### 2.4 Booking Engine
- Hold TTL: 600–900 giây (cấu hình theo property), lưu bảng `booking_holds(expires_at)`
- Khi confirm: snapshot giá từng đêm vào `booking_line_items`
- Idempotency: header `Idempotency-Key` trên `POST /bookings`, lưu bảng `idempotency_keys`
- Double-booking guard: **chọn một** — pessimistic `SELECT ... FOR UPDATE` hoặc PostgreSQL exclusion constraint (`btree_gist` + `daterange`)
- Policy hủy: `free_cancel_until_hours_before_checkin` (int `X`), `fee_rule_ref`, `policy_version` — snapshot vào `booking.policy_snapshot` (JSON) khi confirm

### 2.5 Payments & Reconciliation
- Bảng `payment_events(event_id UNIQUE, provider, payload_hash, processed_at, outcome)` — insert-first, idempotent
- Webhook: xử lý trong transaction; duplicate `event_id` → no-op trả `200`
- Webhook ký HMAC; xoay secret định kỳ
- Retry nội bộ: exponential backoff, DLQ cho manual review
- Reconciliation job: so sánh `SETTLED` trên cổng vs `payment_transactions` theo `provider_ref`; lệch → tạo ticket `FINANCE`
- **Không** lưu track2/CVC; dùng tokenization của cổng

### 2.6 Reviews
- Trạng thái: `PUBLISHED | HIDDEN | FLAGGED`
- Auto-publish sau khi pass spam filter nhẹ
- Auto-flag rules: link lạ, từ khóa tục tĩu, cùng `device_fingerprint` spam, trùng content hash, điểm cực đoan kèm text ngắn
- Staff có thể HIDDEN (lý do bắt buộc, audit log); có kênh appeal nội bộ

### 2.7 Notifications / Push
- Map `ExponentPushToken` → `user_id` + `device_id`; cho phép revoke khi logout
- Payload tối thiểu: `booking_id`, `type`, `deep_link` — không chứa PII nhạy cảm
- Handler NestJS gửi qua Expo Push API (hoặc FCM trực tiếp); log `ticket_id`; job dọn token hết hạn

### 2.8 Guest Support Chat (người–người)
- **Không** chatbot, **không** trợ lý tự động — mọi reply là nhân viên thực
- Socket.io namespace theo property; handshake JWT; join room chỉ khi claim có `propertyId` hợp lệ
- Lưu lịch sử chat DB (timestamp, sender, `booking_id`)
- Redis adapter khi scale-out nhiều instance API
- Rate limit theo `user_id` + IP

---

## 3. Database schema (các bảng chính)

```sql
-- Auth
users(id, email, password_hash, role, token_version, locked_at)
refresh_tokens(id, user_id, token_hash, expires_at, revoked_at)
audit_logs(id, actor_id, action, entity_type, entity_id, before jsonb, after jsonb, created_at timestamptz)

-- Property & Inventory
properties(id, name, iana_timezone, ...)
room_types(id, property_id, name, max_occupancy, amenities jsonb)
rooms(id, property_id, room_type_id, room_number, status) -- status: AVAILABLE|RESERVED|OCCUPIED|CLEANING|MAINTENANCE

-- Pricing
rate_plans(id, property_id, code, currency)
daily_rate(id, property_id, room_type_id, night date, amount numeric, tax_included bool, min_stay int, closed_to_arrival bool, rate_source)

-- Booking
booking_holds(id, room_type_id, property_id, nights date[], expires_at timestamptz, booking_id)
bookings(id, property_id, room_id, guest_id, status, check_in date, check_out date, policy_snapshot jsonb, payment_status, created_at timestamptz)
booking_line_items(id, booking_id, night date, unit_price numeric, tax_breakdown jsonb, rate_plan_code, currency)
idempotency_keys(key, user_id, request_hash, response_json, created_at)
cancellation_policies(id, property_id, free_cancel_until_hours_before_checkin int, fee_rule_ref jsonb, policy_version int)

-- Payments
payment_events(id, event_id text UNIQUE, provider, payload_hash, processed_at, outcome)
payment_transactions(id, booking_id, provider_ref, amount, currency, status, created_at)

-- Reviews
reviews(id, booking_id, guest_id, rating int, content text, status, flagged_reason, created_at)

-- Notifications
device_tokens(id, user_id, device_id, expo_token, platform, revoked_at)

-- Chat
chat_threads(id, property_id, booking_id, guest_id, status, created_at)
chat_messages(id, thread_id, sender_id, sender_role, content, sent_at)
```

> Tất cả timestamp dùng `timestamptz` (UTC). Logic "đêm" dùng `date` theo property timezone.

---

## 4. Timezone rules

| Lớp | Quy ước |
|---|---|
| Lưu DB | UTC (`timestamptz`) cho mọi sự kiện |
| Logic "đêm lưu trú" | `date` theo `property.iana_timezone` |
| API nhận date từ client | Ghi rõ trong OpenAPI: "interpreted in property timezone" |
| Email/push template | Hiển thị giờ kèm timezone label |

- Không dùng "local date" thuần cho logic giá; luôn dùng `timestamptz` + IANA
- Test DST edge case: giờ chuyển đổi mùa không được tạo đêm ảo hoặc bỏ sót đêm

---

## 5. Room state machine

```
[*] --> AVAILABLE

AVAILABLE --> RESERVED       : assign_booking_or_hold
RESERVED  --> OCCUPIED       : check_in
OCCUPIED  --> CLEANING       : check_out
CLEANING  --> AVAILABLE      : housekeeping_done_QC_pass

AVAILABLE --> MAINTENANCE    : start_maintenance
CLEANING  --> MAINTENANCE    : issue_found_during_cleaning
MAINTENANCE --> AVAILABLE    : maintenance_complete_inspection

RESERVED  --> AVAILABLE      : cancel_or_release_hold
```

- Mọi chuyển trạng thái đi qua **domain service một cửa** trong transaction
- Realtime: emit Socket.io event sau khi DB commit thành công — không emit trước

---

## 6. Booking engine: luồng và edge cases

### Luồng chính
```
POST /holds          → tạo hold (TTL 600-900s), trả hold_id + expires_at
POST /payments/intent → tạo payment intent trên cổng, gắn hold_id
[webhook PAID]       → promote hold → CONFIRMED booking, snapshot line items
```

### Double-booking (hai request đồng thời, còn 1 slot)
- Cả hai vào transaction
- Một transaction giữ lock / exclusion constraint thắng
- Bên còn lại nhận `409 ROOM_UNAVAILABLE` + gợi ý ngày/loại khác

### Hold TTL hết hạn trước khi webhook đến
- Job release hold set phòng về `AVAILABLE`
- Nếu webhook đến sau khi hold đã expired: kiểm tra `payment_events.event_id` + `booking_id` — nếu booking chưa tồn tại thì **hoàn tiền tự động** (refund intent) và ghi ticket `FINANCE`
- Đây là edge case cần document rõ và có alert monitoring

### Idempotency
```
Header: Idempotency-Key: <uuid>
- Cùng key + cùng payload hash → trả cùng response (cached)
- Cùng key + payload khác → 409
- Lưu: idempotency_keys(key, user_id, request_hash, response_json, created_at)
```

---

## 7. Cancellation policy

```json
// policy_snapshot lưu trong booking khi confirm
{
  "free_cancel_until_hours_before_checkin": 24,
  "fee_rule": {
    "type": "first_night",
    "description": "Phí bằng 1 đêm đầu tiên"
  },
  "no_show_rule": {
    "type": "full_charge"
  },
  "policy_version": 3,
  "snapshotted_at": "2025-06-01T08:00:00Z"
}
```

- Thay đổi policy sau khi confirm **không** ảnh hưởng booking cũ
- Deadline hủy miễn phí tính: `check_in_datetime_property_local - X hours` → convert sang UTC để so sánh với server timestamp

---

## 8. API endpoints chính (OpenAPI cần cover)

```
# Auth
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

# Property & Rooms
GET    /properties
POST   /properties
GET    /properties/:id/rooms
PATCH  /rooms/:id/status          # chuyển trạng thái vận hành

# Rates
GET    /properties/:id/rates?from=&to=
PUT    /properties/:id/rates/bulk  # cập nhật daily_rate nhiều đêm

# Availability
GET    /availability?property_id=&from=&to=&guests=

# Booking
POST   /holds
DELETE /holds/:id
POST   /bookings                   # Idempotency-Key header bắt buộc
GET    /bookings/:id
POST   /bookings/:id/cancel
POST   /bookings/:id/checkin
POST   /bookings/:id/checkout

# Payments
POST   /payments/intent
POST   /webhooks/payment           # public, HMAC verified

# Reviews
GET    /reviews?property_id=&status=
PATCH  /reviews/:id/moderate       # HIDDEN | FLAGGED | PUBLISHED

# Chat
GET    /chat/threads
GET    /chat/threads/:id/messages
# Realtime qua Socket.io

# Reports
GET    /reports/occupancy?property_id=&from=&to=
GET    /reports/revenue?property_id=&from=&to=
```

---

## 9. Non-functional requirements

### Bảo mật
- TLS bắt buộc; HSTS; rate limit login (5 lần/phút/IP)
- CORS whitelist; validate toàn bộ input qua Zod
- Log không chứa PII nhạy cảm, không chứa token
- Secrets trong vault / CI masked; không commit vào git

### Hiệu năng
- Phân trang tất cả list endpoint (`cursor` hoặc `offset+limit`)
- Index DB: `(property_id, room_type_id, night)` trên `daily_rate`; `expires_at` trên `booking_holds`; `booking_id` trên `booking_line_items`

### Khả dụng
- PostgreSQL PITR (WAL), backup mã hóa, test restore định kỳ
- Error logging tập trung (Sentry hoặc tương đương)
- Health check endpoint `/health` cho load balancer

### PCI DSS
- Không lưu track2/CVC/PAN thô
- Webhook ký HMAC; xoay signing secret định kỳ
- Scope giảm: dùng hosted fields / checkout của cổng

---

## 10. Phân chia module (3 engineer)

| Engineer | Domain modules |
|---|---|
| **E1** | Auth, RBAC, Property, RoomType, PhysicalRoom, Rates/Pricing |
| **E2** | Availability, Holds, Booking (engine + lifecycle), CheckIn/Out, CancellationPolicy |
| **E3** | Payments, Webhook, Reconciliation, Reviews, Push, Chat (Socket.io) |

### Contract cần lock sớm (họp trước khi code)
- `GET /availability` response schema — E2 cung cấp, E1 đọc từ rates
- Payload event `payment.confirmed` từ E3 → E2 cập nhật `bookings.payment_status`
- JWT claims structure (E1 define, E2/E3 consume)
- Socket.io event names + payload schema (E3 define, E2 emit room status)
- `deep_link` slug cho push notification (E3 define, E2 dùng cho booking screen)

---

## 11. Definition of Done (mỗi module)

- [ ] Migration chạy sạch trên DB mới (không dữ liệu seed)
- [ ] OpenAPI spec cập nhật, khớp với `api-contract` package
- [ ] Unit test: business logic (policy, state machine, idempotency)
- [ ] Integration test: happy path + edge case chính (double-booking, TTL expired, duplicate webhook)
- [ ] Không có PII/thẻ trong log
- [ ] Audit log ghi đúng với thao tác nhạy cảm
- [ ] Reviewed bởi ít nhất 1 engineer khác trước merge
