import express from 'express';
import {
  getAuditLogs,
  getDashboard,
  getHospitalById,
  getSecurityOverview,
  getUsers,
  updateUserStatus,
  verifyHospital,
} from '../controllers/adminController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();
router.use(protect);
router.use(requireRole('admin'));

router.get('/dashboard', asyncHandler(getDashboard));
router.get('/users', asyncHandler(getUsers));
router.patch('/users/:id/status', asyncHandler(updateUserStatus));
router.patch('/hospitals/:id/verify', asyncHandler(verifyHospital));
router.get('/hospitals/:id', asyncHandler(getHospitalById));
router.get('/hospitals', asyncHandler(getDashboard));
router.get('/audit-logs', asyncHandler(getAuditLogs));
router.get('/security-overview', asyncHandler(getSecurityOverview));

export default router;
