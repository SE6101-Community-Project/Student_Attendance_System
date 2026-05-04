import express from "express";
import {
  registerLecturer,
  loginLecturer,
  verifyLecturerEmail,
  forgotLecturerPassword,
  resetLecturerPassword,
  getLecturerProfile,
  updateLecturerProfile,
  changeLecturerPassword,
  getAllLecturers,
  deleteLecturer,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  getLecturerById,
} from "../controllers/lecturerController.js";
import {
  protect,
  lecturerOnly,
  adminOnly,
  lecturerOrAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerLecturer);
router.post("/login", loginLecturer);
router.get("/verify-email", verifyLecturerEmail);
router.post("/forgot-password", forgotLecturerPassword);
router.post("/reset-password", resetLecturerPassword);

router.post("/send-otp", sendPasswordResetOTP);
router.post("/verify-otp", verifyPasswordResetOTP);

// Lecturer private routes
router.get("/profile", protect, lecturerOnly, getLecturerProfile);
router.put("/profile", protect, lecturerOnly, updateLecturerProfile);
router.put("/change-password", protect, lecturerOnly, changeLecturerPassword);

// Admin routes
router.get("/all", protect, lecturerOrAdmin, getAllLecturers);
router.get("/:id", protect, lecturerOrAdmin, getLecturerById);
router.delete("/:id", protect, adminOnly, deleteLecturer);

export default router;