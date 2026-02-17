import express from 'express';
import { ContactController } from '../controllers/guest.controller';

const router = express.Router();

router.post('/contact-us', ContactController.contactUs);

export default router;
