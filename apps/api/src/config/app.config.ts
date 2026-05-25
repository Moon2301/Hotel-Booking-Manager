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

  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
  },

  vnpay: {
    tmnCode: process.env.VNP_TMNCODE || 'R4923J2J',
    hashSecret: process.env.VNP_HASHSECRET || 'P68JKLG8376RKRTBPWCKDD7XR3OYF4TZ',
    paymentUrl:
      process.env.VNP_PAYMENT_URL ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    /** Public API base — VNPay gọi callback về đây (không có /api/v1 suffix) */
    apiPublicUrl:
      process.env.API_PUBLIC_URL ||
      process.env.API_URL ||
      'http://localhost:3000',
    /** Web client — redirect khách sau thanh toán */
    clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',
    /** Đường dẫn trên web client sau thanh toán */
    clientPaymentPath:
      process.env.CLIENT_PAYMENT_PATH || '/my-stay',
  },
});
