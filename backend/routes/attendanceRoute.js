import express from "express";
import {
  markAttendance,
  getAttendanceBySession,
  getStudentAttendanceByCourse,
  getCourseAttendanceReport,
  getRealTimeAttendance,
  modifyAttendance,
  getStudentAllCourseStats,
} from "../controllers/attendanceController.js";
import {
  protect,
  studentOnly,
  lecturerOnly,
  adminOnly,
  lecturerOrAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Student routes
router.post("/mark", protect, studentOnly, markAttendance);

router.get(
  "/student/all-course-stats",      
  protect,
  studentOnly,
  getStudentAllCourseStats,
);

router.get(
  "/student/course/:courseId",
  protect,
  studentOnly,
  getStudentAttendanceByCourse,
);

// Lecturer routes
router.get(
  "/realtime/:sessionId",
  protect,
  lecturerOnly,
  getRealTimeAttendance,
);

// Lecturer or Admin routes
router.get(
  "/session/:sessionId",
  protect,
  lecturerOrAdmin,
  getAttendanceBySession,
);
router.get(
  "/report/course/:courseId",
  protect,
  lecturerOrAdmin,
  getCourseAttendanceReport,
);

// Admin only
router.put("/:attendanceId", protect, adminOnly, modifyAttendance);

export default router;