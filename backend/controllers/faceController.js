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


export const verifyFaceController = async (req, res) => {
  try {
    const { liveImageBase64 } = req.body;

    if (!liveImageBase64) {
      return res.status(400).json({
        success: false,
        message: "Live image is required",
      });
    }

    // ── Fetch stored encoding from studentModel ──────────────────────────────
    // faceEncoding and faceDataRegistered are both select:false
    const student = await studentModel
      .findById(req.user._id)
      .select("+faceEncoding +faceDataRegistered");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Guard: face must be registered and encoding must be valid
    if (!student.faceDataRegistered) {
      return res.status(400).json({
        success: false,
        message: "Face not registered. Please register your face first.",
        step: "face",
      });
    }

    if (
      !Array.isArray(student.faceEncoding) ||
      student.faceEncoding.length !== 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Face data is corrupted. Please re-register your face.",
        step: "face",
      });
    }

    // ── Call Python face service ─────────────────────────────────────────────
    const verification = await verifyFace(
      liveImageBase64,
      student.faceEncoding,
    );

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message,
        step: "face",
      });
    }

    // ── Face does not match ──────────────────────────────────────────────────
    if (!verification.isMatch) {
      return res.status(400).json({
        success: false,
        message: "Face does not match. Please try again.",
        step: "face",
        data: {
          verified: false,
          confidence: verification.confidence ?? null,
          distance: verification.distance ?? null,
        },
      });
    }

    // ── Face matched ─────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Face verified successfully",
      data: {
        verified: true,
        confidence: verification.confidence,
        distance: verification.distance,
      },
    });
  } catch (error) {
    console.error("[verifyFaceController] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};


export const getFaceDataStatus = async (req, res) => {
  try {
    const student = await studentModel
      .findById(req.user._id)
      .select("+faceDataRegistered +faceEncoding");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const hasEncoding =
      Array.isArray(student.faceEncoding) &&
      student.faceEncoding.length === 128;

    // Both flags must be true for a valid registration
    const registered = student.faceDataRegistered && hasEncoding;

    return res.status(200).json({
      success: true,
      data: {
        // ── primary field read by profile screen ──
        faceDataRegistered: registered,
        // ── extra detail for debugging ──
        hasEncoding,
        lastUpdated: registered ? student.updatedAt : null,
      },
    });
  } catch (error) {
    console.error("[getFaceDataStatus] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get face data status",
    });
  }
};



// @desc    Delete student face data
// @route   DELETE /api/face/:studentId
// @access  Private (Admin)
export const deleteFaceData = async (req, res) => {
  try {
    // studentId here is MongoDB _id from route param
    const student = await studentModel.findById(req.params.studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Clear face fields directly in studentModel — no separate model needed
    await studentModel.findByIdAndUpdate(req.params.studentId, {
      faceEncoding: null,
      faceDataRegistered: false,
    });

    return res.status(200).json({
      success: true,
      message: "Face data deleted successfully",
    });
  } catch (error) {
    console.error("[deleteFaceData] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};