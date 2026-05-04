import express from "express";
import {
  createQRSession,
  getLecturerSessions,
  closeQRSession,
  verifyQRCode,
  getActiveSession,
  getSessionById,
} from "../controllers/qrSessionController.js";
import {
  protect,
  lecturerOnly,
  studentOnly,
  lecturerOrAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Lecturer routes
router.post("/create", protect, lecturerOnly, createQRSession);
router.get("/my-sessions", protect, lecturerOnly, getLecturerSessions);

export default router;