// routes/settingsRoutes.js
import express from 'express';
import {
  getAttendanceSettings,
  updateAttendanceSettings,
  resetAttendanceSettings,
} from '../controllers/settingsController.js';
import { protect, lecturerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get(
  '/attendance',
  protect,
  lecturerOnly,
  getAttendanceSettings
);

router.put(
  '/attendance',
  protect,
  lecturerOnly,
  updateAttendanceSettings
);

router.delete(
  '/attendance/reset',
  protect,
  lecturerOnly,
  resetAttendanceSettings
);

export default router;