import attendanceModel from "../models/attendanceModel.js";
import qrSessionModel from "../models/qrSessionModel.js";
import { verifyLocation, verifyFace } from "../services/faceService.js";
import studentModel from "../models/studentModel.js";
import courseModel from "../models/courseModel.js";
import {
  notifyAttendanceMarked,
  notifyLowAttendance,
  notifyFaceVerificationFailed,
  notifyLocationVerificationFailed,
} from "../services/notificationService.js";
import {
  checkAttendanceEligibility,
  checkLateStatus,
  calculateAttendanceStats,
} from "../services/attendanceService.js";
import { generateCourseFinalReport } from "../services/reportService.js";

export const markAttendance = async (req, res) => {
  try {
    const { sessionDbId, liveImageBase64, studentLatitude, studentLongitude } =
      req.body;

    // Validate required fields
    if (
      !sessionDbId ||
      !liveImageBase64 ||
      studentLatitude === undefined ||
      studentLongitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide sessionDbId, image, latitude and longitude",
      });
    }

    // ── Step 1: Check eligibility ──
    const eligibility = await checkAttendanceEligibility(
      req.user._id,
      sessionDbId,
    );

    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason,
      });
    }

    const session = eligibility.session;

    // Populate session
    const populatedSession = await qrSessionModel
      .findById(sessionDbId)
      .populate(
        "course",
        "courseCode courseName attendanceThreshold enrolledStudents",
      )
      .populate("lecturer", "_id");

    if (!populatedSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const courseCode = populatedSession.course.courseCode;

    
      
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
    console.log(error);
  }
};
