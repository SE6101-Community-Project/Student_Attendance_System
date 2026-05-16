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

export const getSentNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = {
            "metadata.sentBy": req.user._id,
        };

        const [notifications, total] = await Promise.all([
            notificationModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            notificationModel.countDocuments(filter),
        ]);

        // to show summary instead of individual notifications
        const grouped = {};
        notifications.forEach((n) => {
            // Group key: title + minute-level timestamp
            const key = `${n.title}_${new Date(n.createdAt).toISOString().slice(0, 16)}`;
            if (!grouped[key]) {
                grouped[key] = {
                    _id: key,
                    title: n.title,
                    message: n.message,
                    type: n.type,
                    priority: n.priority,
                    createdAt: n.createdAt,
                    recipientCount: 0,
                    readCount: 0,
                    metadata: n.metadata,
                };
            }
            grouped[key].recipientCount += 1;
            if (n.isRead) grouped[key].readCount += 1;
        });

        const groupedList = Object.values(grouped).sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );

        res.status(200).json({
            success: true,
            data: groupedList,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const roleMap = {
      student: "Student",
      lecturer: "Lecturer",
      Admin: "Admin",
      SuperAdmin: "Admin",
      Moderator: "Admin",
    };

    await notificationModel.markAllAsRead(req.user._id, roleMap[req.role]);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const cleanupOldNotifications = async (req, res) => {
  try {
    const result = await notificationModel.deleteOldNotifications();

    res.status(200).json({
      success: true,
      message: "Old notifications cleaned up",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await notificationModel.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await notificationModel.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this notification",
      });
    }

    await notificationModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};