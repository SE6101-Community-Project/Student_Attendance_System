import axios from "axios";

// Python face recognition service URL
const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://localhost:5001";


// Register face encoding with Python service
export const registerFaceEncoding = async (imageBase64, studentId) => {
  try {
    const response = await axios.post(
      `${FACE_SERVICE_URL}/register-face`,
      {
        image: imageBase64,
        student_id: studentId,
      },
      {
        timeout: 40_000,
      },
    );

    const data = response.data;

    // Validate encoding came back correctly
    if (!data.encoding || !Array.isArray(data.encoding)) {
      return {
        success: false,
        message: "Face service returned invalid encoding data.",
      };
    }

    if (data.encoding.length !== 128) {
      return {
        success: false,
        message: `Face encoding has wrong dimensions: ${data.encoding.length}. Expected 128.`,
      };
    }

    return {
      success: true,
      encoding: data.encoding, // 128-number array
      qualityScore: data.quality?.score, // from quality object — NOT data.confidence
      quality: data.quality,
      message: data.message,
    };
  } catch (error) {
    const msg = error.response?.data?.message || "Face registration failed";
    console.error("[registerFaceEncoding] Error:", msg);
    return {
      success: false,
      message: msg,
    };
  }
};


// Verify face against stored encoding
export const verifyFace = async (liveImageBase64, storedEncoding) => {
  try {
    const response = await axios.post(
      `${FACE_SERVICE_URL}/verify-face`,
      {
        live_image: liveImageBase64,
        stored_encoding: storedEncoding,
      },
      {
        timeout: 40_000, // 40 s — CNN model can be slow
      },
    );

    const { is_match, confidence, distance, message } = response.data;

    console.log("[verifyFace] Python response:", {
      is_match,
      confidence,
      distance,
      message,
    });

    return {
      success: true,
      isMatch: is_match,
      confidence,
      distance,
      message,
    };
  } catch (error) {
    const msg =
      error.response?.data?.message ??
      error.message ??
      "Face verification failed";

    console.error("[verifyFace] Error:", msg);

    return {
      success: false,
      isMatch: false,
      confidence: 0,
      distance: 1,
      message: msg,
    };
  }
};