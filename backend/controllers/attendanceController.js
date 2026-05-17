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

    // ── Step 2: Face Verification (Backend does it) ──
    // Get student with stored face encoding
    const student = await studentModel
      .findById(req.user._id)
      .select("+faceEncoding +faceDataRegistered");

    // Check face registered
    if (!student.faceDataRegistered || !student.faceEncoding) {
      return res.status(400).json({
        success: false,
        message: "Face not registered. Please register your face first.",
      });
    }

    // Validate encoding has correct dimensions before sending to Python
    if (!Array.isArray(student.faceEncoding) || student.faceEncoding.length !== 128) {
      return res.status(400).json({
        success: false,
        message:
          "Stored face data is corrupted. Please re-register your face.",
        step: "face",
      });
    }

    // Call Python service to verify
    const faceResult = await verifyFace(liveImageBase64, student.faceEncoding);

    if (!faceResult.success) {
      return res.status(503).json({
        success: false,
        message: "Face verification service unavailable. Try again later.",
        step: "face",
      });
    }

    if (!faceResult.isMatch) {
      try {
        await notifyFaceVerificationFailed(req.user._id, courseCode);
      } catch (notifError) {
        console.log("Notification failed:", notifError.message);
      }

      console.log(
        `[markAttendance] Face rejected | ` +
          `isMatch=${faceResult.isMatch} ` +
          `confidence=${faceResult.confidence} ` +
          `distance=${faceResult.distance}`,
      );

      return res.status(400).json({
        success: false,
        message:
          "Face verification failed. Please try again in better lighting.",
        step: "face",
        confidence: faceResult.confidence,
      });
    }

    
      
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
    console.log(error);
  }
};
