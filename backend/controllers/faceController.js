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
  } catch (error) {
    // error handling
  }
};