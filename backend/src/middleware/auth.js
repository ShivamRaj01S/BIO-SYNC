import { getUserFromToken } from '../utils/jwt.js';
import { createHttpError } from '../utils/errors.js';
import { logAuditEvent } from '../services/auditService.js';

export async function protect(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await getUserFromToken(token);
    if (!user) {
      return next(createHttpError(401, 'Not authorized. Please log in.'));
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createHttpError(401, 'Not authorized.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(createHttpError(403, 'Access denied for this role.'));
    }
    next();
  };
}

export function requireVerifiedHospital(req, res, next) {
  if (!req.user) {
    return next(createHttpError(401, 'Not authorized.'));
  }

  if (req.user.role !== 'hospital') {
    return next(createHttpError(403, 'Only hospital accounts can access this resource.'));
  }

  if (!req.user.verified) {
    return next(createHttpError(403, 'Only verified hospital accounts can perform this action.'));
  }

  next();
}

export async function auditLog(action, resource, resourceId, details, req) {
  await logAuditEvent({
    userId: req?.user?.id,
    action,
    resource,
    resourceId,
    details,
    req,
  });
}
