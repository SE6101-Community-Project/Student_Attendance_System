import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'NOTIF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Recipient is required'],
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['Student', 'Lecturer', 'Admin']
  },
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: [
      'attendance_marked',
      'low_attendance_warning',
      'session_created',
      'session_starting',
      'session_closed',
      'face_verification_failed',
      'location_verification_failed',
      'mahapola_eligibility',
      'course_enrollment',
      'attendance_modified',
      'system_update',
      'password_reset',
      'account_locked',
      'general'
    ]
  },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  priority: { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  relatedModel: { type: String, enum: ['Attendance','QRSession','Course','Student','Lecturer','Admin', null], default: null },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  actionUrl: { type: String, trim: true, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
notificationSchema.index({ notificationId: 1 });
notificationSchema.index({ recipient: 1, recipientModel: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Mark notification as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = Date.now();
    return await this.save();
  }
  return this;
};

// Static helper methods
notificationSchema.statics.getUnreadNotifications = async function(userId, userModel) {
  return await this.find({ recipient: userId, recipientModel: userModel, isRead: false })
                   .sort({ createdAt: -1 });
};

notificationSchema.statics.getUserNotifications = async function(userId, userModel, limit = 50) {
  return await this.find({ recipient: userId, recipientModel: userModel })
                   .sort({ createdAt: -1 })
                   .limit(limit);
};

notificationSchema.statics.markAllAsRead = async function(userId, userModel) {
  return await this.updateMany(
    { recipient: userId, recipientModel: userModel, isRead: false },
    { isRead: true, readAt: Date.now() }
  );
};

notificationSchema.statics.getUnreadCount = async function(userId, userModel) {
  return await this.countDocuments({ recipient: userId, recipientModel: userModel, isRead: false });
};

notificationSchema.statics.deleteOldNotifications = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return await this.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
};

notificationSchema.statics.sendBulkNotifications = async function(recipients, notificationData) {
  const notifications = recipients.map(r => ({
    recipient: r.id,
    recipientModel: r.model,
    ...notificationData,
    notificationId: 'NOTIF_' + Date.now() + '_' + Math.random().toString(36).substr(2,9).toUpperCase()
  }));
  return await this.insertMany(notifications);
};

const notificationModel = mongoose.models.notification || mongoose.model('notification', notificationSchema);

module.exports = notificationModel;