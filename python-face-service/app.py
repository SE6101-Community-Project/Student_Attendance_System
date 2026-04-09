from flask import Flask, request, jsonify
from flask_cors import CORS
from face_recognition_service import FaceRecognitionService
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow requests from Node.js backend

# Initialize face recognition service
tolerance = float(os.getenv("FACE_RECOGNITION_TOLERANCE", 0.6))
face_service = FaceRecognitionService(tolerance=tolerance)

MAX_IMAGE_SIZE = int(os.getenv("MAX_IMAGE_SIZE", 20971520))  # 20MB


# ─────────────────────────────────────────
# Health check
# @route GET /health
# ─────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Face Recognition Service",
        "version": "1.0.0",
    }), 200


# ─────────────────────────────────────────
# Validate request has image
# ─────────────────────────────────────────
def validate_image(data: dict, field: str = "image") -> tuple:
    if not data:
        return False, "No data provided"

    if field not in data:
        return False, f"'{field}' field is required"

    if not data[field]:
        return False, f"'{field}' cannot be empty"

    # Check image size
    image_size = len(data[field].encode("utf-8"))
    if image_size > MAX_IMAGE_SIZE:
        return False, "Image size too large. Maximum 10MB allowed"

    return True, None


# ─────────────────────────────────────────
# Detect face
# @route POST /detect-face
# ─────────────────────────────────────────
@app.route("/detect-face", methods=["POST"])
def detect_face():
    try:
        data = request.get_json()

        # Validate
        is_valid, error = validate_image(data, "image")
        if not is_valid:
            return jsonify({
                "success": False,
                "message": error
            }), 400

        # Detect
        result = face_service.detect_faces(data["image"])

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logger.error(f"Detect face endpoint error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# ─────────────────────────────────────────
# Register face
# @route POST /register-face
# ─────────────────────────────────────────
@app.route("/register-face", methods=["POST"])
def register_face():
    try:
        data = request.get_json()

        # Validate image
        is_valid, error = validate_image(data, "image")
        if not is_valid:
            return jsonify({
                "success": False,
                "message": error
            }), 400

        # Validate student_id
        if "student_id" not in data or not data["student_id"]:
            return jsonify({
                "success": False,
                "message": "student_id is required"
            }), 400

        # Register
        result = face_service.register_face(
            data["image"],
            str(data["student_id"])
        )

        status_code = 200 if result["success"] else 400
        return jsonify(result), status_code

    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logger.error(f"Register face endpoint error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# ─────────────────────────────────────────
# Verify face
# @route POST /verify-face
# ─────────────────────────────────────────
@app.route("/verify-face", methods=["POST"])
def verify_face():
    try:
        data = request.get_json()

        # Validate live image
        is_valid, error = validate_image(data, "live_image")
        if not is_valid:
            return jsonify({
                "success": False,
                "message": error
            }), 400

        # Validate stored encoding
        if "stored_encoding" not in data:
            return jsonify({
                "success": False,
                "message": "stored_encoding is required"
            }), 400

        if not isinstance(data["stored_encoding"], list):
            return jsonify({
                "success": False,
                "message": "stored_encoding must be an array"
            }), 400

        if len(data["stored_encoding"]) != 128:
            return jsonify({
                "success": False,
                "message": "stored_encoding must have 128 dimensions"
            }), 400

        # Verify
        result = face_service.verify_face(
            data["live_image"],
            data["stored_encoding"]
        )

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logger.error(f"Verify face endpoint error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# ─────────────────────────────────────────
# Run server
# ─────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "False").lower() == "true"

    logger.info(f"Starting Face Recognition Service on {host}:{port}")

    app.run(
        host=host,
        port=port,
        debug=debug
    )