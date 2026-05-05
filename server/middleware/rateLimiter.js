const rateLimit = require('express-rate-limit');
const { rateLimitWindowMs, rateLimitMaxRequests } = require('../config');

module.exports = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error_code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Try again later.',
  },
});
