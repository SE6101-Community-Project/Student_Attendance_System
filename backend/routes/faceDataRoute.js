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

const router = express.Router();

router.post("/register", protect, studentOnly, registerFaceData);
router.post("/verify", protect, studentOnly, verifyFaceController);


export default router;