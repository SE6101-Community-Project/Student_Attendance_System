import studentModel from "../models/studentModel.js";
  import {
    registerFaceEncoding,
    verifyFace,
  } from "../services/faceService.js";

  export const registerFaceData = async (req, res) => {
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
    
    // Call Python face service
    const registration = await registerFaceEncoding(
      imageBase64,
      student.studentId,
    );

    if (!registration.success) {
      return res.status(400).json({
        success: false,
        message:
          registration.message ||
          "Face registration failed. Please take a clearer photo.",
      });
    }

    // Validate encoding dimensions
    if (
      !Array.isArray(registration.encoding) ||
      registration.encoding.length !== 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid face encoding received. Please try again.",
      });
    }

    // Single DB write — everything lives in studentModel
    const updated = await studentModel
      .findByIdAndUpdate(
        req.user._id,
        {
          faceEncoding: registration.encoding,
          faceDataRegistered: true,
        },
        { new: true },
      )
      .select("+faceDataRegistered");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Failed to update student record",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Face registered successfully",
      data: {
        faceDataRegistered: true,
        qualityScore: registration.qualityScore ?? null,
        lastUpdated: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("[registerFaceData] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};