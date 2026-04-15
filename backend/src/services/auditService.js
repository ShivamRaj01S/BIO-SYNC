import AuditLog from '../models/AuditLog.js';

export async function logAuditEvent({
  userId = null,
  action,
  resource,
  resourceId = null,
  details = {},
  severity = 'info',
  req = null,
}) {
  return AuditLog.create({
    user: userId,
    action,
    resource,
    resourceId: resourceId?.toString?.() || null,
    details,
    severity,
    ip: req?.requestContext?.ip || req?.ip || null,
    userAgent: req?.requestContext?.userAgent || req?.get?.('User-Agent') || null,
  });
}
