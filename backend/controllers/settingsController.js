import settingsModel from '../models/settingsModel.js';

// ─────────────────────────────────────────
// @desc    Get lecturer attendance settings
// @route   GET /api/settings/attendance
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const getAttendanceSettings = async (req, res) => {
  try {
    // ── Find or create settings for this lecturer ──
    let settings = await settingsModel.findOne({
      lecturer: req.user._id,
    });

    if (!settings) {
      // Create default settings on first access
      settings = await settingsModel.create({
        lecturer: req.user._id,
        gpsRangeMeters: 100,
        lateThresholdMinutes: 15,
        qrValidityMinutes: 120,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        gpsRangeMeters: settings.gpsRangeMeters,
        lateThresholdMinutes: settings.lateThresholdMinutes,
        qrValidityMinutes: settings.qrValidityMinutes,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

