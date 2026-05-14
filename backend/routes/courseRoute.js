import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  assignLecturerToCourse,
  enrollStudentInCourse,
  bulkEnrollStudents,
  getMyCourses,
  getMyEnrolledCourses,
} from "../controllers/courseController.js";
import {
  protect,
  adminOnly,
  lecturerOrAdmin,
  lecturerOnly,
  studentOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Must be BEFORE /:id route
router.get("/my-courses", protect, lecturerOnly, getMyCourses);
router.get("/my-enrolled", protect, studentOnly, getMyEnrolledCourses);

// Admin routes
router.post("/create", protect, adminOnly, createCourse);
router.get("/all", protect, lecturerOrAdmin, getAllCourses);
router.put("/:id", protect, adminOnly, updateCourse);
router.delete("/:id", protect, adminOnly, deleteCourse);
router.put("/:id/assign-lecturer", protect, adminOnly, assignLecturerToCourse);
router.put("/:id/enroll-student", protect, adminOnly, enrollStudentInCourse);
router.put("/:id/bulk-enroll", protect, adminOnly, bulkEnrollStudents);

// Shared
router.get("/:id", protect, getCourseById);

export default router;