import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  attendanceId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'ATT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QRSession',
    required: [true, 'Session reference is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecturer',
    required: [true, 'Lecturer reference is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  status: {
    type: String,
    required: [true, 'Attendance status is required'],
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present'
  },
  verificationSteps: {
    qrScanned: {
      status: { type: Boolean, default: false },
      timestamp: { type: Date, default: null },
      qrData: { type: String, default: null }
    },
    faceVerified: {
      status: { type: Boolean, default: false },
      timestamp: { type: Date, default: null },
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      matchDistance: { type: Number, default: null }
    },
    locationVerified: {
      status: { type: Boolean, default: false },
      timestamp: { type: Date, default: null },
      studentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
      },
      distanceFromVenue: { type: Number, default: null },
      isWithinRange: { type: Boolean, default: false }
    }
  },
  allVerificationsPassed: {
    type: Boolean,
    default: false
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateByMinutes: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
attendanceSchema.index({ attendanceId: 1 });
attendanceSchema.index({ student: 1, session: 1 }, { unique: true });
attendanceSchema.index({ course: 1, date: 1 });

const attendanceModel = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

export default attendanceModel;