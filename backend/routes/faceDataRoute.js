import express from "express";
import {
  registerFaceData,
  verifyFaceController,
  getFaceDataStatus,
  deleteFaceData,
} from "../controllers/faceDataController.js";
import {
  protect,
  studentOnly,
  adminOnly,
} from "../middleware/authMiddleware.js";

// ADMIN ROUTES — Face Data Management
const router = express.Router();

router.post("/register", protect, studentOnly, registerFaceData);
router.post("/verify", protect, studentOnly, verifyFaceController);
router.get("/status", protect, studentOnly, getFaceDataStatus);
router.delete("/:studentId", protect, adminOnly, deleteFaceData);

export default router;