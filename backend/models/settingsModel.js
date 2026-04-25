// models/settingsModel.js
import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      required: true,
      unique: true, // one settings doc per lecturer
    },
    // ── Attendance Rules ──
    gpsRangeMeters: {
      type: Number,
      default: 100,
      min: [10, "GPS range must be at least 10 meters"],
      max: [1000, "GPS range cannot exceed 1000 meters"],
    },
    lateThresholdMinutes: {
      type: Number,
      default: 15,
      min: [1, "Late threshold must be at least 1 minute"],
      max: [60, "Late threshold cannot exceed 60 minutes"],
    },
    qrValidityMinutes: {
      type: Number,
      default: 120,
      min: [5, "QR validity must be at least 5 minutes"],
      max: [480, "QR validity cannot exceed 480 minutes"],
    },
  },
  { timestamps: true },
);

const settingsModel = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

export default settingsModel;
