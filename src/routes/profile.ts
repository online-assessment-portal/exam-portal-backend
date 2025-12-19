import express from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { requireUser } from '../middleware/auth';

const router = express.Router();

// Profile routes
router.get('/', requireUser, ProfileController.getProfile);
router.patch('/', requireUser, ProfileController.updateProfile);

export default router;
