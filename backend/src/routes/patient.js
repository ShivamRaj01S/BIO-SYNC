import express from 'express';
import {
  createBloodRequest,
  getDashboard,
  getRequestById,
} from '../controllers/patientController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requestCreationLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();
router.use(protect);
router.use(requireRole('patient'));

router.get('/dashboard', asyncHandler(getDashboard));
router.get('/requests/:id', asyncHandler(getRequestById));
router.get('/requests', asyncHandler(getDashboard));
router.get('/hospitals', asyncHandler(getDashboard));
router.post('/requests', requestCreationLimiter, asyncHandler(createBloodRequest));

export default router;
