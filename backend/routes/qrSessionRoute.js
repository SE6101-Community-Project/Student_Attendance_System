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
router.put("/close/:sessionId", protect, lecturerOnly, closeQRSession);

// Student routes
router.post("/verify-qr", protect, studentOnly, verifyQRCode);

// Shared routes
router.get("/active/:courseId", protect, getActiveSession);

export default router;