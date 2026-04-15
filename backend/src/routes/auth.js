import express from 'express';
import { googleLogin, getCurrentUser } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/google', authLimiter, asyncHandler(googleLogin));
router.get('/me', protect, asyncHandler(getCurrentUser));

export default router;
