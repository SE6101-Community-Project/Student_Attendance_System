import express from "express";
import {
    getMyNotifications,
    getSentNotifications,
    markAllNotificationsAsRead,
    cleanupOldNotifications,
    markNotificationAsRead,
    deleteNotification,
    sendBulkNotification
} from "../controllers/notificationController.js";
import {
    protect,
    adminOnly,
    lecturerOrAdmin,
    lecturerOnly,

} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-notifications", protect, getMyNotifications);
router.get("/sent", protect, lecturerOnly, getSentNotifications);
router.put("/mark-all-read", protect, markAllNotificationsAsRead);
router.delete("/cleanup", protect, adminOnly, cleanupOldNotifications);
router.put("/:id/read", protect, markNotificationAsRead);
router.delete("/:id", protect, deleteNotification);
router.post("/send-bulk", protect, lecturerOrAdmin, sendBulkNotification);

export default router;