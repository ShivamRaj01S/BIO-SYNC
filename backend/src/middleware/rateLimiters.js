import rateLimit from 'express-rate-limit';

function buildLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });
}

export const apiLimiter = buildLimiter(
  15 * 60 * 1000,
  Number(process.env.API_RATE_LIMIT_MAX) || 250,
  'Too many requests. Please try again shortly.'
);

export const authLimiter = buildLimiter(
  10 * 60 * 1000,
  Number(process.env.AUTH_RATE_LIMIT_MAX) || 25,
  'Too many authentication attempts. Please wait before trying again.'
);

export const requestCreationLimiter = buildLimiter(
  15 * 60 * 1000,
  Number(process.env.REQUEST_CREATION_RATE_LIMIT_MAX) || 10,
  'Too many emergency requests created from this account. Please slow down.'
);
