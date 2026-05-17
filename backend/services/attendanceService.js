import attendanceModel from "../models/attendanceModel.js";
import courseModel from "../models/courseModel.js";
import qrSessionModel from "../models/qrSessionModel.js";

// Check if student can mark attendance
export const checkAttendanceEligibility = async (studentId, sessionId) => {
  try {
    const existing = await attendanceModel.findOne({
      student: studentId,
      session: sessionId,
    });

    if (existing) {
      return {
        eligible: false,
        reason: "Attendance already marked for this session",
        existingRecord: existing,
      };
    }

    const session = await qrSessionModel.findById(sessionId);

    if (!session) {
      return {
        eligible: false,
        reason: "Session not found",
      };
    }

    if (!session.isClosed && new Date() > new Date(session.endTime)) {
      session.isActive = false;
      session.isClosed = true;
      await session.save();
      console.log(
        `[EligibilityCheck] Auto-closed expired session ${session.sessionId}`,
      );
      return {
        eligible: false,
        reason: "Session has ended",
      };
    }

    if (!session.isActive || session.isClosed) {
      return {
        eligible: false,
        reason: "Session is closed or not found",
      };
    }

    const now = new Date();
    if (now > new Date(session.qrValidUntil)) {
      return {
        eligible: false,
        reason: "QR code has expired",
      };
    }

    return { eligible: true, session };
  } catch (error) {
    return { eligible: false, reason: error.message };
  }
};

// Calculate attendance statistics for a student in a course
export const calculateAttendanceStats = async (studentId, courseId) => {
  try {
    const records = await attendanceModel.find({
      student: studentId,
      course: courseId,
    });

    const totalSessions = await qrSessionModel.countDocuments({
      course: courseId,
      isClosed: true,
    });

    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const attended = present + late;
    
    const absent = Math.max(0, totalSessions - attended);
    
    const percentage = totalSessions > 0 
      ? parseFloat(((attended / totalSessions) * 100).toFixed(2)) 
      : 0;

    const course = await courseModel.findById(courseId);

    return {
      totalSessions,
      present,
      late,
      absent,       
      attended,
      percentage,   
      isEligible: percentage >= (course?.attendanceThreshold || 80),
      threshold: course?.attendanceThreshold || 80,
    };
  } catch (error) {
    throw new Error("Failed to calculate attendance stats: " + error.message);
  }
};

// Determine if student is late
export const checkLateStatus = (sessionStartTime, markedTime, thresholdMinutes = 15) => {
  const start = new Date(sessionStartTime);
  const marked = new Date(markedTime);
  const diffMinutes = (marked - start) / (1000 * 60);

  return {
    isLate: diffMinutes > thresholdMinutes,
    lateByMinutes: Math.max(0, Math.floor(diffMinutes - thresholdMinutes)),
    thresholdMinutes,
  };
};

// Get defaulter list (students below threshold)
export const getDefaultersList = async (courseId) => {
  try {
    const course = await courseModel
      .findById(courseId)
      .populate("enrolledStudents");

    const defaulters = [];

    for (const student of course.enrolledStudents) {
      const stats = await calculateAttendanceStats(student._id, courseId);
      if (!stats.isEligible) {
        defaulters.push({
          student: {
            _id: student._id,
            studentId: student.studentId,
            name: student.name,
            email: student.email,
          },
          attendancePercentage: stats.percentage,
          sessionsAttended: stats.attended,
          totalSessions: stats.totalSessions,
        });
      }
    }

    return defaulters;
  } catch (error) {
    throw new Error("Failed to get defaulters: " + error.message);
  }
};