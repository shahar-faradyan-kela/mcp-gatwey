export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    name: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    adminApiKey: process.env.ADMIN_API_KEY,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  gateway: {
    reloadIntervalMs: parseInt(process.env.RELOAD_INTERVAL_MS ?? '60000', 10),
    healthCheckIntervalMs: parseInt(
      process.env.HEALTH_CHECK_INTERVAL_MS ?? '30000',
      10,
    ),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
});
