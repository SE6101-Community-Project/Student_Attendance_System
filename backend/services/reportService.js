import attendanceModel from "../models/attendanceModel.js";
import courseModel from "../models/courseModel.js";
import qrSessionModel from "../models/qrSessionModel.js";
import { calculateAttendanceStats } from "./attendanceService.js";

// Generate daily attendance report
export const generateDailyReport = async (date, courseId = null) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      date: { $gte: startOfDay, $lte: endOfDay },
    };

    if (courseId) {
      query.course = courseId;
    }

    const records = await attendanceModel
      .find(query)
      .populate("student", "studentId name")
      .populate("course", "courseCode courseName")
      .populate("session", "lectureNumber venue");

    const summary = {
      totalPresent: records.filter((r) => r.status === "present").length,
      totalLate: records.filter((r) => r.status === "late").length,
      totalAbsent: records.filter((r) => r.status === "absent").length,
      totalExcused: records.filter((r) => r.status === "excused").length,
    };

    return {
      date,
      summary,
      records,
      generatedAt: new Date(),
    };
  } catch (error) {
    throw new Error("Failed to generate daily report: " + error.message);
  }
};

// Generate course-wise final report
export const generateCourseFinalReport = async (courseId) => {
  try {
    const course = await courseModel
      .findById(courseId)
      .populate("enrolledStudents", "studentId name email batch");

    if (!course) throw new Error("Course not found");

    const totalSessions = await qrSessionModel.countDocuments({
      course: courseId,
      isClosed: true,
    });

    const studentReports = [];

    for (const student of course.enrolledStudents) {
      const stats = await calculateAttendanceStats(student._id, courseId);

      const records = await attendanceModel
        .find({ student: student._id, course: courseId })
        .populate("session", "lectureNumber startTime lectureTitle")
        .sort({ date: 1 });

      studentReports.push({
        student: {
          _id: student._id,
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          batch: student.batch,
        },
        attendancePercentage: stats.percentage,
        statistics: {
          totalSessions: stats.totalSessions,
          present: stats.present,
          late: stats.late,
          absent: stats.absent,
          attended: stats.attended,
          percentage: stats.percentage,
          isEligible: stats.isEligible,
          threshold: stats.threshold,
        },
        records: records.map((r) => ({
          lectureNumber: r.session?.lectureNumber,
          lectureTitle: r.session?.lectureTitle,
          date: r.date || r.session?.startTime,
          status: r.status,
          isLate: r.isLate,
          lateByMinutes: r.lateByMinutes,
        })),
      });
    }

    const avgAttendance =
      studentReports.length > 0
        ? parseFloat(
            (
              studentReports.reduce(
                (sum, r) => sum + (r.attendancePercentage || 0),
                0,
              ) / studentReports.length
            ).toFixed(2),
          )
        : 0;

    const defaultersCount = studentReports.filter(
      (r) => !r.statistics.isEligible,
    ).length;

    return {
      course: {
        _id: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        semester: course.semester,
        academicYear: course.academicYear,
        attendanceThreshold: course.attendanceThreshold || 80,
        credits: course.credits,
        department: course.department,
      },
      totalSessions,
      totalStudents: course.enrolledStudents.length,
      averageAttendance: avgAttendance,
      defaultersCount,
      eligibleCount: studentReports.length - defaultersCount,
      generatedAt: new Date(),
      studentReports,
    };
  } catch (error) {
    throw new Error("Failed to generate course report: " + error.message);
  }
};


// Generate Mahapola eligibility report
export const generateMahapolaReport = async (courseId) => {
  try {
    const course = await courseModel
      .findById(courseId)
      .populate("enrolledStudents");

    const eligible = [];
    const notEligible = [];

    for (const student of course.enrolledStudents) {
      const stats = await calculateAttendanceStats(student._id, courseId);

      const reportData = {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        batch: student.batch,
        percentage: stats.percentage,
        sessionsAttended: stats.attended,
        totalSessions: stats.totalSessions,
      };

      if (stats.isEligible) {
        eligible.push(reportData);
      } else {
        notEligible.push(reportData);
      }
    }

    return {
      course: {
        courseCode: course.courseCode,
        courseName: course.courseName,
      },
      threshold: course.attendanceThreshold,
      eligible: {
        count: eligible.length,
        students: eligible,
      },
      notEligible: {
        count: notEligible.length,
        students: notEligible,
      },
      generatedAt: new Date(),
    };
  } catch (error) {
    throw new Error("Failed to generate Mahapola report: " + error.message);
  }
};