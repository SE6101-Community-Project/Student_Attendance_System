import express from "express";
import {
  registerStudent,
  loginStudent,
  verifyStudentEmail,
  registerFace,
  verifyStudentFace,
} from "../controllers/studentController.js";

import {
  protect,
  studentOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

//Public routes
router.post("/register", registerStudent);
router.post("/login", loginStudent);
router.get("/verify-email", verifyStudentEmail);

//Student private routes

router.post("/register-face", protect, studentOnly, registerFace);
router.post("/verify-face", protect, studentOnly, verifyStudentFace);

export default router;

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
  registerFace,
  verifyStudentFace,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
} from "../controllers/studentController.js";

import {
  protect,
  studentOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/register", registerStudent);
router.post("/login", loginStudent);
router.get("/verify-email", verifyStudentEmail);
router.post("/forgot-password", forgotStudentPassword);
router.post("/reset-password", resetStudentPassword);


// Student Protected Routes
router.post("/send-otp", sendPasswordResetOTP);
router.post("/verify-otp", verifyPasswordResetOTP);
router.get("/profile", protect, studentOnly, getStudentProfile);
router.put("/profile", protect, studentOnly, updateStudentProfile);
router.put("/change-password", protect, studentOnly, changeStudentPassword);
router.post("/register-face", protect, studentOnly, registerFace);
router.post("/verify-face", protect, studentOnly, verifyStudentFace);

export default router;