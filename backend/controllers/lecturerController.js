import lecturerModel from "../models/lecturerModel.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import generateToken from "../utils/generateToken.js";
import {
  sendVerificationEmailLec,
  sendPasswordResetEmail,
  sendOTPEmail,
} from "../services/emailService.js";


// ─────────────────────────────────────────
// @desc    Register lecturer
// @route   POST /api/lecturer/register
// @access  Public
// ─────────────────────────────────────────
export const registerLecturer = async (req, res) => {
  try {
    const {
      lecturerId,
      name,
      email,
      password,
      mobile,
      department,
      designation,
    } = req.body;

    if (
      !lecturerId ||
      !name ||
      !email ||
      !password ||
      !mobile ||
      !department ||
      !designation
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const existing = await lecturerModel.findOne({
      $or: [{ email }, { lecturerId }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          existing.email === email
            ? "Email already registered"
            : "Lecturer ID already registered",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const lecturer = await lecturerModel.create({
      lecturerId,
      name,
      email,
      password: hashedPassword,
      mobile,
      department,
      designation,
      verificationToken,
      verificationTokenExpire,
    });

    try {
      await sendVerificationEmailLec(email, name, verificationToken);
    } catch (emailError) {
      console.log("Email failed:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Lecturer registered. Please verify your email.",
      data: {
        _id: lecturer._id,
        lecturerId: lecturer.lecturerId,
        name: lecturer.name,
        email: lecturer.email,
        department: lecturer.department,
        designation: lecturer.designation,
        isVerified: lecturer.isVerified,
      },
      token: generateToken(lecturer._id, "lecturer"),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Login lecturer
// @route   POST /api/lecturer/login
// @access  Public
// ─────────────────────────────────────────
export const loginLecturer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const lecturer = await lecturerModel
      .findOne({ email })
      .select("+password")
      .populate("courses", "courseCode courseName");

    if (!lecturer) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!lecturer.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, lecturer.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    lecturer.lastLogin = new Date();
    await lecturer.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        _id: lecturer._id,
        lecturerId: lecturer.lecturerId,
        name: lecturer.name,
        email: lecturer.email,
        department: lecturer.department,
        designation: lecturer.designation,
        courses: lecturer.courses,
        isVerified: lecturer.isVerified,
        lastLogin: lecturer.lastLogin,
      },
      token: generateToken(lecturer._id, "lecturer"),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Verify lecturer email
// @route   POST /api/lecturer/verify-email
// @access  Public
// ─────────────────────────────────────────
export const verifyLecturerEmail = async (req, res) => {
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

    const lecturer = await lecturerModel.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!lecturer) {
      return res.status(400).send(getVerificationHTML(
        'expired',
        'Link Expired',
        'This verification link is invalid or has expired. Please request a new verification email from the app.',
        null
      ));
    }

    lecturer.isVerified = true;
    lecturer.verificationToken = undefined;
    lecturer.verificationTokenExpire = undefined;
    await lecturer.save();

    return res.status(200).send(getVerificationHTML(
      'success',
      'Email Verified Successfully',
      `Your email ${lecturer.email} has been verified. Your account is now active.`,
      lecturer.email
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


// ─────────────────────────────────────────
// @desc    Forgot password
// @route   POST /api/lecturer/forgot-password
// @access  Public
// ─────────────────────────────────────────
export const forgotLecturerPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const lecturer = await lecturerModel.findOne({ email });

    if (!lecturer) {
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

    lecturer.resetPasswordToken = hashedToken;
    lecturer.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
    await lecturer.save();

    try {
      await sendPasswordResetEmail(email, lecturer.name, resetToken);
    } catch (emailError) {
      console.log(emailError);      
      lecturer.resetPasswordToken = undefined;
      lecturer.resetPasswordExpire = undefined;
      await lecturer.save();

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


// ─────────────────────────────────────────
// @desc    Send OTP for password reset
// @route   POST /api/lecturer/send-otp
// @access  Public
// ─────────────────────────────────────────
export const sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const lecturer = await lecturerModel.findOne({ email });

    if (!lecturer) {
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

    lecturer.resetPasswordToken = hashedOTP;
    lecturer.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await lecturer.save();

    // Send OTP via email
    try {
      await sendOTPEmail(email, lecturer.name, otp);
    } catch (emailError) {
      console.error("EMAIL ERROR:", emailError)
      lecturer.resetPasswordExpire = null;
      await lecturer.save();

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

    const lecturer = await lecturerModel.findOne({
      email,
      resetPasswordToken: hashedOTP,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!lecturer) {
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

    lecturer.resetPasswordToken = hashedResetToken;
    lecturer.resetPasswordExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await lecturer.save();

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


// ─────────────────────────────────────────
// @desc    Reset password
// @route   POST /api/lecturer/reset-password
// @access  Public
// ─────────────────────────────────────────
export const resetLecturerPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const lecturer = await lecturerModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!lecturer) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const salt = await bcrypt.genSalt(10);
    lecturer.password = await bcrypt.hash(newPassword, salt);
    lecturer.resetPasswordToken = undefined;
    lecturer.resetPasswordExpire = undefined;
    await lecturer.save();

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


// ─────────────────────────────────────────
// @desc    Get lecturer profile
// @route   GET /api/lecturer/profile
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const getLecturerProfile = async (req, res) => {
  try {
    const lecturer = await lecturerModel
      .findById(req.user._id)
      .populate("courses", "courseCode courseName semester credits");

    if (!lecturer) {
      return res.status(404).json({
        success: false,
        message: "Lecturer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: lecturer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ─────────────────────────────────────────
// @desc    Update lecturer profile
// @route   PUT /api/lecturer/profile
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const updateLecturerProfile = async (req, res) => {
  try {
    const { name, mobile, profileImage, department, designation } = req.body;

    const lecturer = await lecturerModel.findById(req.user._id);

    if (!lecturer) {
      return res.status(404).json({
        success: false,
        message: "Lecturer not found",
      });
    }

    if (name) lecturer.name = name;
    if (mobile) lecturer.mobile = mobile;
    if (profileImage) lecturer.profileImage = profileImage;
    if (department) lecturer.department = department;
    if (designation) lecturer.designation = designation;

    const updated = await lecturer.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: updated._id,
        lecturerId: updated.lecturerId,
        name: updated.name,
        email: updated.email,
        mobile: updated.mobile,
        profileImage: updated.profileImage,
        department: updated.department,
        designation: updated.designation,
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
// @desc    Change password
// @route   PUT /api/lecturer/change-password
// @access  Private (Lecturer)
// ─────────────────────────────────────────
export const changeLecturerPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    const lecturer = await lecturerModel
      .findById(req.user._id)
      .select("+password");

    const isMatch = await bcrypt.compare(currentPassword, lecturer.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    lecturer.password = await bcrypt.hash(newPassword, salt);
    await lecturer.save();

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


// ─────────────────────────────────────────
// @desc    Get all lecturers
// @route   GET /api/lecturer/all
// @access  Private (Lecturer/Admin)
// ─────────────────────────────────────────
export const getAllLecturers = async (req, res) => {
  try {
    const {
      department,
      isActive,
      isVerified,
      search,
      page  = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (isActive  !== undefined) filter.isActive  = isActive  === 'true';
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    if (search) {
      filter.$or = [
        { name:       { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
        { lecturerId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [lecturers, total] = await Promise.all([
      lecturerModel
        .find(filter)
        .select('-password -verificationToken -resetPasswordToken -verificationTokenExpire -resetPasswordExpire')
        .populate('courses', 'courseCode courseName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      lecturerModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: lecturers,
      pagination: {
        total,
        page:  parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getLecturerById = async (req, res) => {
  try {
    const lecturer = await lecturerModel
      .findById(req.params.id)
      .select('-password -verificationToken -resetPasswordToken -verificationTokenExpire -resetPasswordExpire')
      .populate('courses', 'courseCode courseName');

    if (!lecturer) {
      return res.status(404).json({ success: false, message: 'Lecturer not found' });
    }

    res.status(200).json({ success: true, data: lecturer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

