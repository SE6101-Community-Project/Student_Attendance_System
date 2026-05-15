import express from "express";
import {
    getMyNotifications,
    getSentNotifications,
    markAllNotificationsAsRead
} from "../controllers/notificationController.js";
import {
    protect,
    adminOnly,
    lecturerOrAdmin,
    lecturerOnly
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-notifications", protect, getMyNotifications);
router.get("/sent", protect, lecturerOnly, getSentNotifications);
router.put("/mark-all-read", protect, markAllNotificationsAsRead);
router.delete("/cleanup", protect, adminOnly, cleanupOldNotifications);
