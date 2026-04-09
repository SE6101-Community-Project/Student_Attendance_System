import mongoose from 'mongoose';

const faceDataSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required'],
    unique: true
  },
  faceEncoding: {
    type: [Number],
    required: [true, 'Face encoding is required'],
    validate: {
      validator: function(v) {
        return v && v.length === 128;
      },
      message: 'Face encoding must contain exactly 128 features'
    }
  },
  encodingVersion: {
    type: String,
    default: 'v1.0',
    enum: ['v1.0', 'v1.1', 'v2.0']
  },
  capturedImages: [{
    imageUrl: {
      type: String,
      required: true
    },
    capturedAt: {
      type: Date,
      default: Date.now
    },
    imageQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    faceConfidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 95
    }
  }],
  registrationComplete: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationAttempts: {
    total: {
      type: Number,
      default: 0
    },
    successful: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    lastAttempt: {
      type: Date,
      default: null
    }
  },
  metadata: {
    registrationDevice: {
      type: String,
      default: 'Unknown'
    },
    registrationOS: {
      type: String,
      enum: ['Android', 'iOS', 'Web', 'Unknown'],
      default: 'Unknown'
    },
    cameraResolution: {
      type: String,
      default: 'Unknown'
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

const faceDataModel = mongoose.models.faceData || mongoose.model('faceData', faceDataSchema);

module.exports = faceDataModel;