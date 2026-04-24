import qrSessionModel from "../models/qrSessionModel.js";
import courseModel from "../models/courseModel.js";
import {
  generateQRToken,
  generateQRCodeImage,
  isSessionValid,
  verifyQRToken,
} from "../services/qrService.js";
import { notifySessionCreated } from "../services/notificationService.js";


// ─────────────────────────────────────────
// @desc    Create QR Session
// @route   POST /api/qrsession/create
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const createQRSession = async (req, res) => {
  try {
    const {
      courseId,
      lectureNumber,
      lectureTitle,
      venue,
      locationCoordinates,
      radiusInMeters,
      startTime,
      endTime,
      qrValidDuration,
    } = req.body;

    if (
      !courseId ||
      !lectureNumber ||
      !venue ||
      !locationCoordinates ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const course = await courseModel
      .findById(courseId)
      .populate("enrolledStudents", "_id");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Fix: convert ObjectIds to strings for comparison
    const isAssigned = course.lecturers
      .map((l) => l.toString())
      .includes(req.user._id.toString());

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this course",
      });
    }

    // Check existing active session
    const existingActive = await qrSessionModel.findOne({
      course: courseId,
      isActive: true,
      isClosed: false,
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message:
          "An active session already exists for this course. Please close it first.",
        sessionId: existingActive.sessionId,
      });
    }

    // Calculate times
    const validDuration = qrValidDuration || 120;
    const qrValidFrom = new Date();
    const qrValidUntil = new Date(
      qrValidFrom.getTime() + validDuration * 60 * 1000,
    );

    const sessionId = `SESSION_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Generate QR token
    const qrToken = generateQRToken({
      sessionId,
      courseId: courseId.toString(),
      lecturerId: req.user._id.toString(),
      venue,
      qrValidUntil,
      duration: `${validDuration}m`,
    });

    // Generate QR image
    const qrCodeImage = await generateQRCodeImage(qrToken);

    // Create session
    const session = await qrSessionModel.create({
      sessionId,
      qrCode: qrToken,
      qrCodeImage,
      lecturer: req.user._id,
      course: courseId,
      lectureNumber,
      lectureTitle: lectureTitle || `Lecture ${lectureNumber}`,
      venue,
      location: {
        type: "Point",
        coordinates: locationCoordinates, // [longitude, latitude]
        address: venue,
      },
      radiusInMeters: radiusInMeters || 100,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      qrValidFrom,
      qrValidUntil,
    });

    // Update course lectures completed
    course.lecturesCompleted += 1;
    await course.save();

    // Notify enrolled students
    if (course.enrolledStudents && course.enrolledStudents.length > 0) {
      try {
        const studentIds = course.enrolledStudents.map((s) => s._id);
        await notifySessionCreated(
          studentIds,
          course.courseCode,
          venue,
          startTime,
        );
      } catch (notifError) {
        console.log("Notification failed:", notifError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "QR Session created successfully",
      data: {
        sessionId: session.sessionId,
        qrCode: session.qrCode,
        qrCodeImage: session.qrCodeImage,
        qrValidUntil: session.qrValidUntil,
        course: {
          courseCode: course.courseCode,
          courseName: course.courseName,
        },
        lectureNumber: session.lectureNumber,
        lectureTitle: session.lectureTitle,
        venue: session.venue,
        radiusInMeters: session.radiusInMeters,
        startTime: session.startTime,
        endTime: session.endTime,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


