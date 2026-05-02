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
    // TODO: call face service next
  } catch (error) {
    // error handling
  }
};