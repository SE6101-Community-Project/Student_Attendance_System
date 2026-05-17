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
    // ── Step 3: Location Verification ──
    const venueCoords = session.location.coordinates;

    const locationCheck = verifyLocation(
      studentLatitude,
      studentLongitude,
      venueCoords[1],
      venueCoords[0],
      session.radiusInMeters,
    );

    if (!locationCheck.isWithinRange) {
      try {
        await notifyLocationVerificationFailed(req.user._id, courseCode);
      } catch (notifError) {
        console.log("Notification failed:", notifError.message);
      }

      return res.status(400).json({
        success: false,
        message: `You are ${locationCheck.distance}m away. Must be within ${session.radiusInMeters}m.`,
        step: "location",
        distance: locationCheck.distance,
        allowedRadius: session.radiusInMeters,
      });
    }

    // ── All Verifications Passed ──
    const lateCheck = checkLateStatus(session.startTime, new Date());

    const attendanceId =
      "ATT_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substr(2, 9).toUpperCase();

    const attendance = await attendanceModel.create({
      attendanceId,
      student: req.user._id,
      session: session._id,
      course: populatedSession.course._id,
      lecturer: populatedSession.lecturer._id,
      date: new Date(),
      status: lateCheck.isLate ? "late" : "present",
      verificationSteps: {
        qrScanned: {
          status: true,
          timestamp: new Date(),
          qrData: session.sessionId,
        },
        faceVerified: {
          status: true,
          timestamp: new Date(),
          confidence: faceResult.confidence,
          matchDistance: faceResult.distance,
        },
        locationVerified: {
          status: true,
          timestamp: new Date(),
          studentLocation: {
            type: "Point",
            coordinates: [studentLongitude, studentLatitude],
          },
          distanceFromVenue: locationCheck.distance,
          isWithinRange: true,
        },
      },
      allVerificationsPassed: true,
      markedAt: new Date(),
      isLate: lateCheck.isLate,
      lateByMinutes: lateCheck.lateByMinutes,
    });

    // Notifications
    try {
      await notifyAttendanceMarked(req.user._id, courseCode, session._id);
    } catch (notifError) {
      console.log("Notification failed:", notifError.message);
    }

    const stats = await calculateAttendanceStats(
      req.user._id,
      populatedSession.course._id,
    );

    if (!stats.isEligible) {
      try {
        await notifyLowAttendance(req.user._id, courseCode, stats.percentage);
      } catch (notifError) {
        console.log("Low attendance notification failed:", notifError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: lateCheck.isLate
        ? `Marked as LATE (${lateCheck.lateByMinutes} mins late)`
        : "Attendance marked successfully",
      data: {
        attendanceId: attendance.attendanceId,
        status: attendance.status,
        course: courseCode,
        lectureNumber: session.lectureNumber,
        markedAt: attendance.markedAt,
        isLate: lateCheck.isLate,
        lateByMinutes: lateCheck.lateByMinutes,
        attendancePercentage: stats.percentage,
        faceConfidence: faceResult.confidence,
        verificationSteps: {
          qrScanned: true,
          faceVerified: true,
          locationVerified: true,
        },
      },
    });

          
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
    console.log(error);
  }
};

// ─────────────────────────────────────────
// @desc    Get attendance by session
// @route   GET /api/attendance/session/:sessionId
// @access  Private (Lecturer, Admin)
// ─────────────────────────────────────────
// pass
export const getAttendanceBySession = async (req, res) => {
  try {
    const session = await qrSessionModel.findOne({
      sessionId: req.params.sessionId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const attendance = await attendanceModel
      .find({ session: session._id })
      .populate("student", "studentId name profileImage email batch")
      .sort({ markedAt: 1 });

    const course = await courseModel
      .findById(session.course)
      .populate("enrolledStudents", "studentId name profileImage email batch");

    const isSessionLive = session.isActive && !session.isClosed;

    const presentIds = attendance.map((a) => a.student._id.toString());

    const absentStudents = isSessionLive
      ? []
      : course.enrolledStudents.filter(
          (s) => !presentIds.includes(s._id.toString()),
        );

    res.status(200).json({
      success: true,
      data: {
        session: {
          sessionId: session.sessionId,
          lectureNumber: session.lectureNumber,
          lectureTitle: session.lectureTitle,
          venue: session.venue,
          date: session.startTime,
          isActive: session.isActive,
          isClosed: session.isClosed,
          courseCode: course.courseCode,
          courseName: course.courseName,
          courseId: course._id,
        },
        summary: {
          totalEnrolled: course.enrolledStudents.length,
          totalPresent: attendance.filter((a) => a.status === "present").length,
          totalLate: attendance.filter((a) => a.status === "late").length,
          totalAbsent: isSessionLive ? 0 : absentStudents.length,
          attendanceRate:
            course.enrolledStudents.length > 0
              ? (
                  (attendance.length / course.enrolledStudents.length) *
                  100
                ).toFixed(2)
              : 0,
        },
        presentStudents: attendance,
        absentStudents,
        isSessionLive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
