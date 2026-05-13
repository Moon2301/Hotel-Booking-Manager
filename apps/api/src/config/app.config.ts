export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'hotel_user',
    password: process.env.POSTGRES_PASSWORD || 'hotel_secret',
    database: process.env.POSTGRES_DB || 'hotel_db',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change_me_access',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change_me_refresh',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  booking: {
    holdTtlSeconds: parseInt(process.env.HOLD_TTL_SECONDS || '600', 10),
  },

  payment: {
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'change_me_webhook',
  },

  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN || '',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(','),
  },
});
