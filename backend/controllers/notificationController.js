import courseModel from "../models/courseModel.js";
import notificationModel from "../models/notificationModel.js";

export const getMyNotifications = async (req, res) => {
    try {
        const normalizedRole = req.role?.toLowerCase();
        const roleMap = {
            student: "Student",
            lecturer: "Lecturer",
            admin: "Admin",
            superadmin: "Admin",
            moderator: "Admin",
        };
        const recipientModel = roleMap[normalizedRole];

        if (!recipientModel) {
            return res.status(400).json({
                success: false,
                message: "Invalid role",
            });
        }

        const { page = 1, limit = 20, isRead } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {
            recipient: req.user._id,
            recipientModel,
        };

        if (isRead !== undefined) filter.isRead = isRead === "true";

        const notifications = await notificationModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const unreadCount = await notificationModel.getUnreadCount(
            req.user._id,
            recipientModel,
        );

        const total = await notificationModel.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};