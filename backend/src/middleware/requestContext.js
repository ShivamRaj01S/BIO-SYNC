import { normalizePoint } from '../utils/geo.js';

export function attachRequestContext(req, res, next) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : req.ip || req.socket?.remoteAddress || null;

  const headerLatitude = req.get('x-client-latitude') || req.get('x-ip-latitude');
  const headerLongitude = req.get('x-client-longitude') || req.get('x-ip-longitude');

  req.requestContext = {
    ip,
    userAgent: req.get('User-Agent') || null,
    clientPoint:
      headerLatitude && headerLongitude
        ? normalizePoint([Number(headerLongitude), Number(headerLatitude)])
        : null,
  };

  next();
}
