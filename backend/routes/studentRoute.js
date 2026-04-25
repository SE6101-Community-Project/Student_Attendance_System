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