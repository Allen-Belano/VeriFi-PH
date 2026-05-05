const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env.local.dev');
dotenv.config({ path: envPath });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || '',
  CLOUDFLARE_AI_GATEWAY: process.env.CLOUDFLARE_AI_GATEWAY || '',
  GOOGLE_FACT_CHECK_API_KEY: process.env.GOOGLE_FACT_CHECK_API_KEY || '',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS, 10) || 86400,
};
