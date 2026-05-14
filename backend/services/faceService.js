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


// Detect face — quality pre-check only
export const detectFace = async (imageBase64) => {
  try {
    const response = await axios.post(
      `${FACE_SERVICE_URL}/detect-face`,
      { image: imageBase64 },
      { timeout: 40_000 },
    );

    return {
      success: true,
      faceDetected: response.data.face_detected,
      faceCount: response.data.face_count,
      quality: response.data.quality,
    };
  } catch (error) {
    const msg =
      error.response?.data?.message || "Face detection failed";
    console.error("[detectFace] Error:", msg);
    return {
      success: false,
      faceDetected: false,
      faceCount: 0,
      message: msg,
    };
  }
};


// Calculate distance between two GPS coordinates (Haversine formula)
export const calculateGPSDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};


// Verify GPS location
export const verifyLocation = (studentLat, studentLon, venueLat, venueLon, radiusInMeters) => {
  const distance = calculateGPSDistance(studentLat, studentLon, venueLat, venueLon);

  return {
    isWithinRange: distance <= radiusInMeters,
    distance: Math.round(distance),
    radiusAllowed: radiusInMeters,
  };
};