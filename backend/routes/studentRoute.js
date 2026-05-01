import express from "express";
import {
  registerStudent,
  loginStudent,
  verifyStudentEmail,
  forgotStudentPassword,
  resetStudentPassword,
  getStudentProfile,
  updateStudentProfile,
  changeStudentPassword,
  getAttendanceSummary,
  getAllStudents,
  getStudentById,
  deleteStudent,
  registerFace,
  verifyStudentFace,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  deactivateStudentAccount,
} from "../controllers/studentController.js";
import {
  protect,
  studentOnly,
  lecturerOrAdmin,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerStudent); 
router.post("/login", loginStudent);
router.get("/verify-email", verifyStudentEmail);
router.post("/forgot-password", forgotStudentPassword);
router.post("/reset-password", resetStudentPassword);

// Student private routes
router.put("/deactivate", protect, deactivateStudentAccount);
router.get("/profile", protect, studentOnly, getStudentProfile);
router.put("/profile", protect, studentOnly, updateStudentProfile);
router.post("/register-face", protect, studentOnly, registerFace);
router.post("/send-otp", sendPasswordResetOTP);
router.post("/verify-otp", verifyPasswordResetOTP);
router.post("/verify-face", protect, studentOnly, verifyStudentFace);
router.put("/change-password", protect, studentOnly, changeStudentPassword);
router.get("/attendance-summary", protect, studentOnly, getAttendanceSummary);

// Admin/Lecturer routes
router.get("/all", protect, lecturerOrAdmin, getAllStudents);
router.get("/:id", protect, lecturerOrAdmin, getStudentById);
router.delete("/:id", protect, adminOnly, deleteStudent);

export default router;