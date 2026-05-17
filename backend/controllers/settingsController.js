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

// ─────────────────────────────────────────
// @desc    Update lecturer attendance settings
// @route   PUT /api/settings/attendance
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const updateAttendanceSettings = async (req, res) => {
  try {
    const { gpsRangeMeters, lateThresholdMinutes, qrValidityMinutes } =
      req.body;

    // ── Validate ──
    if (
      gpsRangeMeters === undefined &&
      lateThresholdMinutes === undefined &&
      qrValidityMinutes === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one setting to update',
      });
    }

    if (gpsRangeMeters !== undefined) {
      if (gpsRangeMeters < 10 || gpsRangeMeters > 1000) {
        return res.status(400).json({
          success: false,
          message: 'GPS range must be between 10 and 1000 meters',
        });
      }
    }

    if (lateThresholdMinutes !== undefined) {
      if (lateThresholdMinutes < 1 || lateThresholdMinutes > 60) {
        return res.status(400).json({
          success: false,
          message: 'Late threshold must be between 1 and 60 minutes',
        });
      }
    }

    if (qrValidityMinutes !== undefined) {
      if (qrValidityMinutes < 5 || qrValidityMinutes > 480) {
        return res.status(400).json({
          success: false,
          message: 'QR validity must be between 5 and 480 minutes',
        });
      }
    }

     // ── Upsert ──
    const updateData = {};
    if (gpsRangeMeters !== undefined)
      updateData.gpsRangeMeters = gpsRangeMeters;
    if (lateThresholdMinutes !== undefined)
      updateData.lateThresholdMinutes = lateThresholdMinutes;
    if (qrValidityMinutes !== undefined)
      updateData.qrValidityMinutes = qrValidityMinutes;

    const settings = await settingsModel.findOneAndUpdate(
      { lecturer: req.user._id },
      { $set: updateData },
      {
        new: true,        // return updated doc
        upsert: true,     // create if not exists
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Attendance settings updated successfully',
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

// ─────────────────────────────────────────
// @desc    Reset to defaults
// @route   DELETE /api/settings/attendance/reset
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const resetAttendanceSettings = async (req, res) => {
  try {
    const settings = await settingsModel.findOneAndUpdate(
      { lecturer: req.user._id },
      {
        $set: {
          gpsRangeMeters: 100,
          lateThresholdMinutes: 15,
          qrValidityMinutes: 120,
        },
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Settings reset to defaults',
      data: {
        gpsRangeMeters: settings.gpsRangeMeters,
        lateThresholdMinutes: settings.lateThresholdMinutes,
        qrValidityMinutes: settings.qrValidityMinutes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};