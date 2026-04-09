import mongoose from 'mongoose';
import crypto from 'crypto';

const qrSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'SESSION_' + crypto.randomBytes(8).toString('hex').toUpperCase();
    }
  },
  qrCode: {
    type: String,
    required: true,
    unique: true
  },
  qrCodeImage: {
    type: String,
    default: null
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecturer',
    required: [true, 'Lecturer reference is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  lectureNumber: {
    type: Number,
    required: [true, 'Lecture number is required'],
    min: [1, 'Lecture number must be at least 1']
  },
  lectureTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Lecture title cannot exceed 200 characters']
  },
  venue: {
    type: String,
    required: [true, 'Venue is required'],
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Location coordinates are required']
    },
    address: {
      type: String,
      trim: true
    }
  },
  radiusInMeters: {
    type: Number,
    default: 100,
    min: [10, 'Radius must be at least 10 meters'],
    max: [500, 'Radius cannot exceed 500 meters']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  qrValidFrom: {
    type: Date,
    default: Date.now
  },
  qrValidUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isClosed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});


const qrSessionModel = mongoose.models.qrSession || mongoose.model('qrSession', qrSessionSchema);

module.exports = qrSessionModel;