#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL at ${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}..."
until nc -z "${POSTGRES_HOST:-postgres}" "${POSTGRES_PORT:-5432}"; do
  sleep 1
done

echo "==> Waiting for Redis at ${REDIS_HOST:-redis}:${REDIS_PORT:-6379}..."
until nc -z "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}"; do
  sleep 1
done

cd /app

export CI=true

echo "==> Installing dependencies (pnpm)..."
pnpm install --frozen-lockfile

# In Docker, host-mounted apps/api/.env uses localhost — overwrite with service hostnames
if [ "${POSTGRES_HOST:-postgres}" != "localhost" ]; then
  cat > /app/apps/api/.env <<EOF
NODE_ENV=development
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_USER=${POSTGRES_USER:-hotel_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-hotel_secret}
POSTGRES_DB=${POSTGRES_DB:-hotel_db}
DATABASE_URL=${DATABASE_URL:-postgresql://${POSTGRES_USER:-hotel_user}:${POSTGRES_PASSWORD:-hotel_secret}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-hotel_db}}
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-redis_secret}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET:-change_me_access}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-change_me_refresh}
API_PUBLIC_URL=${API_PUBLIC_URL:-http://localhost:3000}
CLIENT_URL=${CLIENT_URL:-http://localhost:8080}
CLIENT_PAYMENT_PATH=${CLIENT_PAYMENT_PATH:-/my-stay}
VNP_TMNCODE=${VNP_TMNCODE:-R4923J2J}
VNP_HASHSECRET=${VNP_HASHSECRET:-P68JKLG8376RKRTBPWCKDD7XR3OYF4TZ}
VNP_PAYMENT_URL=${VNP_PAYMENT_URL:-https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}
CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:3001,http://localhost:8080,http://localhost:3000}
EOF
fi

echo "==> Ensuring schema prerequisites..."
PGPASSWORD="${POSTGRES_PASSWORD:-hotel_secret}" psql \
  -h "${POSTGRES_HOST:-postgres}" \
  -U "${POSTGRES_USER:-hotel_user}" \
  -d "${POSTGRES_DB:-hotel_db}" \
  -v ON_ERROR_STOP=0 \
  -f /app/docker/scripts/ensure-schema.sql

echo "==> Running database migrations..."
(cd apps/api && pnpm run migrate)

echo "==> Seeding database (skips if data already exists)..."
(cd apps/api && pnpm exec ts-node seed-runner.ts) || echo "    Seed skipped (may already exist)."

echo "==> Starting dev servers (API :3000, Admin :3001, Client :8080)..."
export TURBO_UI=stream
exec pnpm dev
