import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.status !== 'active') return null;
    return user;
  } catch {
    return null;
  }
}
