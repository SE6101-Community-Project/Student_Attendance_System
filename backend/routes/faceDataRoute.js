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

// Routes will be added next...

export default router;