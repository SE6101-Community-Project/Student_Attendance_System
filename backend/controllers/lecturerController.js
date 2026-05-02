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