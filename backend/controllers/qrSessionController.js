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

    const qrToken = generateQRToken({
      sessionId,
      courseId: courseId.toString(),
      lecturerId: req.user._id.toString(),
      venue,
      qrValidUntil,
      duration: `${validDuration}m`,
    });

    const qrCodeImage = await generateQRCodeImage(qrToken);

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
        coordinates: locationCoordinates,
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
    if (course.enrolledStudents?.length > 0) {
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

    // ── Auto-close after endTime ──
    const msUntilEnd = new Date(endTime).getTime() - Date.now();
    if (msUntilEnd > 0) {
      setTimeout(async () => {
        try {
          const stillOpen = await qrSessionModel.findOne({
            sessionId: session.sessionId,
            isClosed: false,
          });
          if (stillOpen) {
            stillOpen.isActive = false;
            stillOpen.isClosed = true;
            await stillOpen.save();
            console.log(
              `[AutoClose] Session ${session.sessionId} auto-closed`,
            );
          }
        } catch (err) {
          console.log("[AutoClose] Error:", err.message);
        }
      }, msUntilEnd);
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

// ─────────────────────────────────────────
// @desc    Get lecturer's sessions
// @route   GET /api/qrsession/my-sessions
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const getLecturerSessions = async (req, res) => {
  try {

    const { courseId, isActive, isClosed, page = 1, limit = 10 } = req.query;

    const filter = { lecturer: req.user._id };
    if (courseId) filter.course = courseId;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (isClosed !== undefined) filter.isClosed = isClosed === "true";

    const allSessions = await qrSessionModel.find({});

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      qrSessionModel
        .find(filter)
        .populate("course", "courseCode courseName")
        .select("-qrCode -qrCodeImage")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      qrSessionModel.countDocuments(filter),
    ]);


    res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.log('getLecturerSessions ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// ─────────────────────────────────────────
// @desc    Close QR Session
// @route   PUT /api/qrsession/close/:sessionId
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const closeQRSession = async (req, res) => {
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

    // Already closed
    if (session.isClosed) {
      return res.status(400).json({
        success: false,
        message: "Session is already closed",
      });
    }

    // Check lecturer owns this session
    if (session.lecturer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to close this session",
      });
    }

    session.isActive = false;
    session.isClosed = true;
    await session.save();

    res.status(200).json({
      success: true,
      message: "Session closed successfully",
      data: {
        sessionId: session.sessionId,
        isClosed: session.isClosed,
        closedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
