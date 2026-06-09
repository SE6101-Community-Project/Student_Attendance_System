import adminModel from "../models/adminModel.js";
import studentModel from "../models/studentModel.js";
import lecturerModel from "../models/lecturerModel.js";
import attendanceModel from "../models/attendanceModel.js";
import courseModel from "../models/courseModel.js";
import qrSessionModel from "../models/qrSessionModel.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import generateToken from "../utils/generateToken.js";
import { generateMahapolaReport } from "../services/reportService.js";
import { sendPasswordResetEmail } from "../services/emailService.js";


export const registerAdmin = async (req, res) => {
  try {
    const { adminId, name, email, password, mobile, role, department } = req.body;

    if (!adminId || !name || !email || !password || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const existing = await adminModel.findOne({
      $or: [{ email }, { adminId }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists with this email or ID",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await adminModel.create({
      adminId,
      name,
      email,
      password: hashedPassword,
      mobile,
      role: role || "Admin",
      department: department || "All",
    });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        _id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      token: generateToken(admin._id, admin.role),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const admin = await adminModel.findOne({ email }).select("+password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check account lock
    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        message: `Account locked until ${new Date(
          admin.lockUntil,
        ).toLocaleString()}`,
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Contact SuperAdmin.",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      admin.loginAttempts += 1;
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await admin.save();

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        attemptsLeft: Math.max(0, 5 - admin.loginAttempts),
      });
    }

    // Reset on success
    admin.loginAttempts = 0;
    admin.lockUntil = null;
    admin.lastLogin = new Date();
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        _id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        department: admin.department,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin,
      },
      token: generateToken(admin._id, admin.role),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const forgotAdminPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    admin.resetPasswordToken = hashedToken;
    admin.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    try {
      await sendPasswordResetEmail(email, admin.name, resetToken);
    } catch (emailError) {
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpire = undefined;
      await admin.save();

      return res.status(500).json({
        success: false,
        message: "Email could not be sent",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const resetAdminPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await adminModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getDashboardStats = async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

    const [
      totalStudents,
      activeStudents,
      totalLecturers,
      activeLecturers,
      totalCourses,
      activeCourses,
      totalAttendance,
      todayAttendance,
      activeSessions,
    ] = await Promise.all([
      studentModel.countDocuments(),
      studentModel.countDocuments({ isActive: true }),
      lecturerModel.countDocuments(),
      lecturerModel.countDocuments({ isActive: true }),
      courseModel.countDocuments(),
      courseModel.countDocuments({ isActive: true }),
      attendanceModel.countDocuments(),
      attendanceModel.countDocuments({
        date: { $gte: todayStart, $lte: todayEnd },
      }),
      qrSessionModel.countDocuments({ isActive: true, isClosed: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        students: { total: totalStudents, active: activeStudents },
        lecturers: { total: totalLecturers, active: activeLecturers },
        courses: { total: totalCourses, active: activeCourses },
        attendance: { total: totalAttendance, today: todayAttendance },
        activeSessions,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const toggleStudentStatus = async (req, res) => {
  try {
    const student = await studentModel.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    student.isActive = !student.isActive;
    await student.save();

    res.status(200).json({
      success: true,
      message: `Student ${
        student.isActive ? "activated" : "deactivated"
      } successfully`,
      data: {
        studentId: student.studentId,
        name: student.name,
        isActive: student.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const toggleLecturerStatus = async (req, res) => {
  try {
    const lecturer = await lecturerModel.findById(req.params.id);

    if (!lecturer) {
      return res.status(404).json({
        success: false,
        message: "Lecturer not found",
      });
    }

    lecturer.isActive = !lecturer.isActive;
    await lecturer.save();

    res.status(200).json({
      success: true,
      message: `Lecturer ${
        lecturer.isActive ? "activated" : "deactivated"
      } successfully`,
      data: {
        lecturerId: lecturer.lecturerId,
        name: lecturer.name,
        isActive: lecturer.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getMahopolaReport = async (req, res) => {
  try {
    const report = await generateMahapolaReport(req.params.courseId);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};