import express from "express";
import {
  getMyNotifications,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-notifications", protect, getMyNotifications);
