# Hotel Booking Manager — hướng dẫn cho agent

Monorepo: NestJS API (`apps/api`), Next.js admin (`apps/web-admin`), Vite client (`apps/web-client`). Chạy dev qua Docker Compose service `dev` (container `hotel_dev`).

## Bắt buộc sau khi sửa code

**Luôn áp dụng skill** [docker-restart-after-code](.cursor/skills/docker-restart-after-code/SKILL.md) khi hoàn thành thay đổi source (API, migration, seed, cấu hình Docker/env liên quan runtime).

Tóm tắt:

1. Nếu có migration mới → chạy migrate trong container.
2. Nếu đổi `apps/api` → `pnpm run build` trong `hotel_dev`.
3. `docker compose restart dev` (không dùng `down -v` trừ khi user yêu cầu xóa DB).
4. Báo user URL kiểm tra: API `:3000`, admin `:3001`, client `:8080`.

API phục vụ từ `dist/` trong Docker; chỉ sửa file trên host mà không build + restart dễ gây lỗi “code mới không chạy”.

## Lệnh nhanh (từ thư mục repo)

```bash
docker compose restart dev
docker exec hotel_dev sh -c "cd apps/api && pnpm run migrate"
docker exec hotel_dev sh -c "cd apps/api && pnpm run build"
```

## Quy ước khác

- UI copy tiếng Việt khi thêm màn hình/messages cho user.
- Không commit `.env`, credentials.
- Chỉ `git commit` / `git push` khi user yêu cầu rõ.
- Seed/migrate: entrypoint đã chạy lúc boot; sau migration mới trong phiên dev vẫn cần migrate thủ công trong container.

## Cấu trúc chính

| App | Port | Ghi chú |
|-----|------|---------|
| API | 3000 | `/api/v1`, NestJS + TypeORM |
| web-admin | 3001 | Dashboard, RBAC |
| web-client | 8080 | Đặt phòng, My Stay |

Postgres/Redis: service `postgres`, `redis` — dữ liệu volume `postgres_data`.
