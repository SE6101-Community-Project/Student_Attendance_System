import studentModel from "../models/studentModel.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import generateToken from "../utils/generateToken.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
} from "../services/emailService.js";
import { calculateAttendanceStats } from "../services/attendanceService.js";
import {
  registerFaceEncoding,
  verifyFace as verifyFaceService,
  detectFace,
} from "../services/faceService.js";


// pass
export const registerStudent = async (req, res) => {
  try {
    const {
      studentId,
      name,
      email,
      password,
      mobile,
      batch,
      department,
      imageBase64,
    } = req.body;

    // ── Validate required fields ──
    if (!studentId || !name || !email || !password || !mobile || !batch) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Please provide a face photo for registration",
      });
    }

    // ── Check for existing student ──
    const existing = await studentModel.findOne({
      $or: [{ email }, { studentId }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          existing.email === email
            ? "Email already registered"
            : "Student ID already registered",
      });
    }

    // ── Step 1: Register face → get encoding from Python ──
    const faceResult = await registerFaceEncoding(imageBase64, studentId);

    if (!faceResult.success) {
      return res.status(400).json({
        success: false,
        message: faceResult.message || "Face registration failed. Please take a clearer photo.",
        step: "face_encoding",
      });
    }

    // Extra safety — validate encoding dimensions
    if (
      !Array.isArray(faceResult.encoding) ||
      faceResult.encoding.length !== 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Face data is invalid. Please try again.",
        step: "face_encoding",
      });
    }

    // ── Step 2: Hash password ──
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ── Step 3: Generate email verification token ──
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpire = new Date(
      Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    );

    // ── Step 4: Create student ──
    const student = await studentModel.create({
      studentId,
      name,
      email,
      password: hashedPassword,
      mobile,
      batch,
      department: department || "Software Engineering",
      verificationToken,
      verificationTokenExpire,
      faceEncoding: faceResult.encoding,
      faceDataRegistered: true,
    });

    // ── Step 5: Send verification email ──
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (emailError) {
      // Non-fatal — student is created, they can request resend
      console.warn("[registerStudent] Email send failed:", emailError.message);
    }

    // ── Step 6: Respond ──
    // Note: faceDataRegistered has select:false so we set it manually
    return res.status(201).json({
      success: true,
      message:
        "Registered successfully. Please check your email to verify your account.",
      data: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        mobile: student.mobile,
        batch: student.batch,
        department: student.department,
        isVerified: student.isVerified,
        isActive: student.isActive,
        faceDataRegistered: true,
        faceQualityScore: faceResult.qualityScore ?? null,
        createdAt: student.createdAt,
      },
      token: generateToken(student._id, "student"),
    });
  } catch (error) {
    console.error("[registerStudent] Error:", error);

    // Handle Mongoose duplicate key errors gracefully
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message:
          field === "email"
            ? "Email already registered"
            : field === "studentId"
              ? "Student ID already registered"
              : "Duplicate entry detected",
      });
    }

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0], // return first validation error
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};


// pass
export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const student = await studentModel.findOne({ email }).select("+password +faceDataRegistered");

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        batch: student.batch,
        department: student.department,
        isVerified: student.isVerified,
        faceDataRegistered: student.faceDataRegistered,
        profileImage: student.profileImage,
      },
      token: generateToken(student._id, "student"),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Register student face
// @route   POST /api/student/register-face
// @access  Private (Student) 
// ─────────────────────────────────────────
// pass
export const registerFace = async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const student = await studentModel.findById(req.user._id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // registerFaceEncoding handles all checks internally
    const result = await registerFaceEncoding(imageBase64, student.studentId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    // Save encoding to student model
    student.faceEncoding = result.encoding;
    student.faceDataRegistered = true;
    await student.save();

    res.status(200).json({
      success: true,
      message: "Face registered successfully",
      data: {
        faceDataRegistered: true,
        qualityScore: result.qualityScore ?? null,  
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
// @desc    Verify student face for attendance
// @route   POST /api/student/verify-face
// @access  Private (Student)
// ─────────────────────────────────────────
// pass
export const verifyStudentFace = async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Live image is required",
      });
    }

    // Get student with faceEncoding
    const student = await studentModel
      .findById(req.user._id)
      .select("+faceEncoding +faceDataRegistered");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check face registered
    if (!student.faceDataRegistered || !student.faceEncoding) {
      return res.status(400).json({
        success: false,
        message: "Face not registered. Please register face first.",
      });
    }

    // Verify face against stored encoding
    const result = await verifyFaceService(
      imageBase64,
      student.faceEncoding, // stored 128 numbers from MongoDB
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        isMatch: result.isMatch,
        confidence: result.confidence, // percentage
        distance: result.distance,
        message: result.message,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// pass 
export const verifyStudentEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      // Show error page in browser with link to open app
      return res.status(400).send(getVerificationHTML(
        'error',
        'Verification Failed',
        'Verification token is missing. Please check your email and click the correct link.',
        null
      ));
    }

    const student = await studentModel.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!student) {
      return res.status(400).send(getVerificationHTML(
        'expired',
        'Link Expired',
        'This verification link is invalid or has expired. Please request a new verification email from the app.',
        null
      ));
    }

    // Verify the student
    student.isVerified = true;
    student.verificationToken = undefined;
    student.verificationTokenExpire = undefined;
    await student.save();

    // Return success page with deep link to open app
    return res.status(200).send(getVerificationHTML(
      'success',
      'Email Verified Successfully',
      `Your email ${student.email} has been verified. Your account is now active.`,
      student.email
    ));
  } catch (error) {
    return res.status(500).send(getVerificationHTML(
      'error',
      'Something Went Wrong',
      'An error occurred during verification. Please try again later.',
      null
    ));
  }
};

