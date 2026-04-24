from flask import Flask, request, jsonify
from flask_cors import CORS
from face_recognition_service import FaceRecognitionService
from dotenv import load_dotenv
import os
import logging

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ── Config from .env ──
TOLERANCE = float(os.getenv("FACE_RECOGNITION_TOLERANCE", 0.6))
MIN_CONFIDENCE = float(os.getenv("MIN_FACE_CONFIDENCE", 0.4))
MAX_IMAGE_SIZE = int(os.getenv("MAX_IMAGE_SIZE", 20_971_520))

face_service = FaceRecognitionService(tolerance=TOLERANCE)

logger.info(
    f"Config | tolerance={TOLERANCE} "
    f"min_confidence={MIN_CONFIDENCE} "
    f"max_image_size={MAX_IMAGE_SIZE}"
)


# ─────────────────────────────────────────
# Health check
# ─────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Face Recognition Service",
        "version": "1.0.0",
        "config": {
            "tolerance": TOLERANCE,
            "min_confidence": MIN_CONFIDENCE,
        },
    }), 200


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────
def validate_image(data: dict, field: str = "image") -> tuple:
    if not data:
        return False, "No data provided"
    if field not in data or not data[field]:
        return False, f"'{field}' field is required and cannot be empty"
    if len(data[field].encode("utf-8")) > MAX_IMAGE_SIZE:
        return False, "Image size too large. Maximum 20 MB allowed"
    return True, None


# ─────────────────────────────────────────
# Detect face
# ─────────────────────────────────────────
@app.route("/detect-face", methods=["POST"])
def detect_face():
    try:
        data = request.get_json()
        is_valid, error = validate_image(data, "image")
        if not is_valid:
            return jsonify({"success": False, "message": error}), 400

        result = face_service.detect_faces(data["image"])
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        logger.error(f"/detect-face error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ─────────────────────────────────────────
# Register face
# ─────────────────────────────────────────
@app.route("/register-face", methods=["POST"])
def register_face():
    try:
        data = request.get_json()
        is_valid, error = validate_image(data, "image")
        if not is_valid:
            return jsonify({"success": False, "message": error}), 400

        if not data.get("student_id"):
            return jsonify({
                "success": False,
                "message": "student_id is required",
            }), 400

        result = face_service.register_face(
            data["image"], str(data["student_id"])
        )

        status_code = 200 if result["success"] else 400
        return jsonify(result), status_code

    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        logger.error(f"/register-face error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ─────────────────────────────────────────
# Verify face
# ─────────────────────────────────────────
@app.route("/verify-face", methods=["POST"])
def verify_face():
    try:
        data = request.get_json()

        # Validate live image
        is_valid, error = validate_image(data, "live_image")
        if not is_valid:
            return jsonify({"success": False, "message": error}), 400

        # Validate stored encoding
        stored_encoding = data.get("stored_encoding")
        if stored_encoding is None:
            return jsonify({
                "success": False,
                "message": "stored_encoding is required",
            }), 400
        if not isinstance(stored_encoding, list):
            return jsonify({
                "success": False,
                "message": "stored_encoding must be an array",
            }), 400
        if len(stored_encoding) != 128:
            return jsonify({
                "success": False,
                "message": "stored_encoding must have exactly 128 dimensions",
            }), 400

        result = face_service.verify_face(
            data["live_image"], stored_encoding
        )

        # ── Minimum confidence gate ──
        # Even if compare_faces says is_match=True (distance <= tolerance=0.6),
        # reject if confidence < MIN_CONFIDENCE (0.4).
        # Since confidence = 1 - distance, and tolerance = 0.6:
        #   boundary confidence = 1 - 0.6 = 0.4
        # So MIN_CONFIDENCE=0.4 accepts everything up to distance=0.6 exactly.
        if result.get("is_match") and result.get("confidence", 0) < MIN_CONFIDENCE:
            logger.info(
                f"Match overridden by min_confidence gate | "
                f"confidence={result['confidence']} < min={MIN_CONFIDENCE}"
            )
            result["is_match"] = False
            result["message"] = (
                f"Face similarity too low "
                f"(confidence={result['confidence']:.2f}, "
                f"required >= {MIN_CONFIDENCE:.2f}). "
                f"Please try again."
            )

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        logger.error(f"/verify-face error: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ─────────────────────────────────────────
# Run
# ─────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "False").lower() == "true"

    logger.info(f"Starting Face Recognition Service on {host}:{port}")
    app.run(host=host, port=port, debug=debug)