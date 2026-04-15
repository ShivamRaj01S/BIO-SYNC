import express from 'express';
import {
  getDashboard,
  markNotificationRead,
  respondToMatch,
  updateAvailability,
  updateProfile,
} from '../controllers/donorController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();
router.use(protect);
router.use(requireRole('donor'));

router.get('/dashboard', asyncHandler(getDashboard));
router.get('/profile', asyncHandler(getDashboard));
router.put('/profile', asyncHandler(updateProfile));
router.patch('/availability', asyncHandler(updateAvailability));
router.post('/matches/:matchId/respond', asyncHandler(respondToMatch));
router.post('/requests/:matchId/respond', asyncHandler(respondToMatch));
router.patch('/notifications/:id/read', asyncHandler(markNotificationRead));

export default router;
