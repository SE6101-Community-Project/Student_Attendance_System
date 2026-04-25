import express from "express";
import {
  createQRSession,
} from "../controllers/qrSessionController.js";

import {
  protect,
  lecturerOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Lecturer routes
router.post("/create", protect, lecturerOnly, createQRSession);

export default router;