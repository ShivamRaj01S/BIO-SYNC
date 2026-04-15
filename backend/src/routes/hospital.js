import express from 'express';
import {
  confirmDonationCompletion,
  createOrganRequest,
  getDashboard,
  getRequestById,
  updateProfile,
} from '../controllers/hospitalController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requestCreationLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();
router.use(protect);
router.use(requireRole('hospital'));

router.get('/dashboard', asyncHandler(getDashboard));
router.get('/profile', asyncHandler(getDashboard));
router.put('/profile', asyncHandler(updateProfile));
router.get('/requests/:id', asyncHandler(getRequestById));
router.get('/requests/:id/donors', asyncHandler(getRequestById));
router.get('/requests', asyncHandler(getDashboard));
router.post('/requests', requestCreationLimiter, asyncHandler(createOrganRequest));
router.patch('/requests/:id/complete', asyncHandler(confirmDonationCompletion));

export default router;
