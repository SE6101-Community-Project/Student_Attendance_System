import express from "express";
import {
  registerAdmin,
  loginAdmin,
  forgotAdminPassword,
  resetAdminPassword,
  getDashboardStats,
  toggleStudentStatus,
  toggleLecturerStatus,
  getMahopolaReport,
} from "../controllers/adminController.js";
import {
  protect,
  adminOnly,
  superAdminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotAdminPassword);
router.post("/reset-password", resetAdminPassword);

// Admin private routes
router.get("/dashboard", protect, adminOnly, getDashboardStats);
router.put(
  "/student/:id/toggle-status",
  protect,
  adminOnly,
  toggleStudentStatus,
);
router.put(
  "/lecturer/:id/toggle-status",
  protect,
  adminOnly,
  toggleLecturerStatus,
);
router.get("/mahapola-report/:courseId", protect, adminOnly, getMahopolaReport);

export default router;