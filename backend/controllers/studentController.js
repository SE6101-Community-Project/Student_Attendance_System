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

// ── Helper: Generate Verification HTML ──
function getVerificationHTML(status, title, message, email) {
  const isSuccess = status === 'success';
  const accentColor = isSuccess ? '#775a19' : '#ba1a1a';
  const icon = isSuccess ? '✅' : status === 'expired' ? '⏰' : '❌';

  // Deep link to open the app's login screen
  const deepLink = 'frontend:///(auth)/login';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, 'Segoe UI', Arial, sans-serif; 
          background: #f9f9f9; 
          min-height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          padding: 20px;
        }
        .card { 
          background: white; 
          border-radius: 12px; 
          padding: 40px 32px; 
          max-width: 420px; 
          width: 100%; 
          text-align: center; 
          box-shadow: 0 10px 40px rgba(0,17,58,0.08);
          border-left: 3px solid ${accentColor};
        }
        .icon { font-size: 48px; margin-bottom: 16px; }
        .badge {
          display: inline-block;
          font-size: 9px;
          letter-spacing: 3px;
          color: ${accentColor};
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 12px;
        }
        h1 { 
          color: #00113a; 
          font-size: 24px; 
          margin-bottom: 12px; 
          font-weight: 400;
        }
        p { 
          color: #444650; 
          font-size: 14px; 
          line-height: 1.7; 
          margin-bottom: 12px; 
        }
        .email { font-weight: 700; color: #00113a; }
        .open-app-btn {
          display: inline-block;
          background: #00113a;
          color: white;
          padding: 16px 32px;
          border-radius: 4px;
          text-decoration: none;
          font-size: 12px;
          letter-spacing: 3px;
          text-transform: uppercase;
          font-weight: 700;
          margin-top: 20px;
          margin-bottom: 12px;
        }
        .open-app-btn:hover { background: #002366; }
        .hint {
          font-size: 12px;
          color: #757682;
          margin-top: 8px;
        }
        .divider {
          height: 1px;
          background: rgba(197,198,210,0.3);
          margin: 24px 0;
        }
        .footer { 
          font-size: 9px; 
          letter-spacing: 3px; 
          color: #757682; 
          text-transform: uppercase;
          opacity: 0.5;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${icon}</div>
        <span class="badge">${isSuccess ? 'Verification Complete' : 'Verification Issue'}</span>
        <h1>${title}</h1>
        <p>${message}</p>
        
        ${isSuccess ? `
          <a href="${deepLink}" class="open-app-btn">
            Open App & Login
          </a>
          <p class="hint">
            If the button doesn't work, open the Attendance App manually and login.
          </p>
        ` : `
          <a href="${deepLink}" class="open-app-btn" style="background: ${accentColor};">
            Open App
          </a>
        `}
        
        <div class="divider"></div>
        <p class="footer">Sabaragamuwa University of Sri Lanka</p>
      </div>

      ${isSuccess ? `
        <script>
          // Auto-attempt to open the app after 1 second
          setTimeout(function() {
            window.location.href = '${deepLink}';
          }, 1500);
        </script>
      ` : ''}
    </body>
    </html>
  `;
}

export const forgotStudentPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const student = await studentModel.findOne({ email });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    student.resetPasswordToken = hashedToken;
    student.resetPasswordExpire = new Date(
      Date.now() + 10 * 60 * 1000, // 10 minutes
    );
    await student.save();

    try {
      await sendPasswordResetEmail(email, student.name, resetToken);
    } catch (emailError) {
      student.resetPasswordToken = undefined;
      student.resetPasswordExpire = undefined;
      await student.save();

      return res.status(500).json({
        success: false,
        message: "Email could not be sent",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// ─────────────────────────────────────────
// @desc    Send OTP for password reset
// @route   POST /api/student/send-otp
// @access  Public
// ─────────────────────────────────────────
// pass 
export const sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const student = await studentModel.findOne({ email });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash and store OTP
    const hashedOTP = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    student.resetPasswordToken = hashedOTP;
    student.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await student.save();

    // Send OTP via email
    try {
      await sendOTPEmail(email, student.name, otp);
    } catch (emailError) {
      console.error("EMAIL ERROR:", emailError)
      student.resetPasswordExpire = null;
      await student.save();

      return res.status(500).json({
        success: false,
        message: "Email could not be sent",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Verify OTP
// @route   POST /api/student/verify-otp
// @access  Public
// ─────────────────────────────────────────
export const verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const hashedOTP = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const student = await studentModel.findOne({
      email,
      resetPasswordToken: hashedOTP,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Generate a temporary reset token for the password reset step
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    student.resetPasswordToken = hashedResetToken;
    student.resetPasswordExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await student.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken: resetToken, // Send to frontend for reset-password step
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const resetStudentPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const student = await studentModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash(newPassword, salt);
    student.resetPasswordToken = null;
    student.resetPasswordExpire = null;
    await student.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getStudentProfile = async (req, res) => {
  try {
    const student = await studentModel
      .findById(req.user._id)
      .populate("courses", "courseCode courseName credits semester");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const updateStudentProfile = async (req, res) => {
  try {
    const { name, mobile, profileImage } = req.body;

    const student = await studentModel.findById(req.user._id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (name) student.name = name;
    if (mobile) student.mobile = mobile;
    if (profileImage) student.profileImage = profileImage;

    const updated = await student.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: updated._id,
        studentId: updated.studentId,
        name: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        profileImage: updated.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const changeStudentPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    const student = await studentModel
      .findById(req.user._id)
      .select("+password");

    const isMatch = await bcrypt.compare(currentPassword, student.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash(newPassword, salt);
    await student.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId query parameter is required",
      });
    }

    const stats = await calculateAttendanceStats(req.user._id, courseId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// pass 
export const getAllStudents = async (req, res) => {
  try {
    const {
      batch,
      department,
      isActive,
      isVerified,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (batch) 
      filter.batch = batch;
    if (department) 
      filter.department = department;
    if (isActive !== undefined) 
      filter.isActive = isActive === "true";
    if (isVerified !== undefined) 
      filter.isVerified = isVerified === "true";

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
      studentModel
        .find(filter)
        .select(
          "-password -verificationToken -resetPasswordToken " +
          "-verificationTokenExpire -resetPasswordExpire " +
          "+faceDataRegistered"
        )
        .populate("courses", "courseCode courseName")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      studentModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
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
export const getStudentById = async (req, res) => {
  try {
    const student = await studentModel
      .findById(req.params.id)
      .select(
        "-password -verificationToken -resetPasswordToken " + 
        "-verificationTokenExpire -resetPasswordExpire " +
        "+faceDataRegistered"
      )
      .populate("courses", "courseCode courseName semester");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---- admin ----
export const deleteStudent = async (req, res) => {
  try {
    const student = await studentModel.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    await studentModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// @desc    Deactivate own student account
// @route   PUT /api/student/deactivate
// @access  Private (Student)
// ─────────────────────────────────────────────────────────────────────────────
export const deactivateStudentAccount = async (req, res) => {
  try {
    const student = await studentModel.findById(req.user._id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!student.isActive) {
      return res.status(400).json({
        success: false,
        message: "Account is already deactivated",
      });
    }

    student.isActive = false;
    await student.save();

    return res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("[deactivateStudentAccount] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};



