import face_recognition
import numpy as np
import base64
import logging
from PIL import Image
import io
import cv2

logger = logging.getLogger(__name__)


class FaceRecognitionService:

    def __init__(self, tolerance=0.6):
        """
        tolerance: Lower = stricter matching (0.4-0.6 recommended)
        """
        self.tolerance = tolerance


    # ─────────────────────────────────────────
    # Decode base64 image to numpy array
    # ─────────────────────────────────────────
    def decode_image(self, image_base64: str) -> np.ndarray:
        try:
            
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]

            image_bytes = base64.b64decode(image_base64)

            pil_image = Image.open(io.BytesIO(image_bytes))

            pil_image = pil_image.convert("RGB")

            image_array = np.array(pil_image)
            
            print(f"DEBUG - Numpy min/max: {image_array.min()}/{image_array.max()}")

            if image_array.dtype != np.uint8:
                image_array = image_array.astype(np.uint8)
                print(f"DEBUG - Converted to uint8")

            return image_array

        except Exception as e:
            logger.error(f"Image decode failed: {str(e)}")
            raise ValueError(f"Invalid image data: {str(e)}")


    # ─────────────────────────────────────────
    # Detect faces in image
    # ─────────────────────────────────────────
    def detect_faces(self, image_base64: str) -> dict:
        try:
            image = self.decode_image(image_base64)
            
            face_locations = face_recognition.face_locations(
                image,
                model="hog"
            )

            face_count = len(face_locations)
            face_detected = face_count > 0
            quality = self._assess_quality(image, face_locations)

            return {
                "face_detected": face_detected,
                "face_count": face_count,
                "face_locations": face_locations,
                "quality": quality,
            }

        except ValueError as e:
            raise e
        except Exception as e:
            logger.error(f"Face detection error: {str(e)}")
            raise Exception(f"Face detection failed: {str(e)}")


    # ─────────────────────────────────────────
    # Register face - extract encoding
    # ─────────────────────────────────────────
    def register_face(self, image_base64: str, student_id: str) -> dict:
        try:
            image = self.decode_image(image_base64)

            # Get face locations
            face_locations = face_recognition.face_locations(image)

            if len(face_locations) == 0:
                return {
                    "success": False,
                    "message": "No face detected in the image",
                }

            if len(face_locations) > 1:
                return {
                    "success": False,
                    "message": "Multiple faces detected. Please use an image with only one face",
                }

            # Extract face encoding (128-dimension vector)
            face_encodings = face_recognition.face_encodings(
                image,
                face_locations
            )

            if not face_encodings:
                return {
                    "success": False,
                    "message": "Could not extract face features",
                }

            encoding = face_encodings[0]

            # Assess quality
            quality = self._assess_quality(image, face_locations)

            if quality["score"] < 0.5:
                return {
                    "success": False,
                    "message": f"Image quality too low: {quality['issues']}",
                }

            return {
                "success": True,
                "encoding": encoding.tolist(),  # Convert numpy to list for JSON
                "confidence": quality["score"],
                "message": f"Face registered successfully for student {student_id}",
            }

        except ValueError as e:
            raise e
        except Exception as e:
            logger.error(f"Face registration error: {str(e)}")
            raise Exception(f"Face registration failed: {str(e)}")


    # ─────────────────────────────────────────
    # Verify face against stored encoding
    # ─────────────────────────────────────────
    def verify_face(self, live_image_base64: str, stored_encoding: list) -> dict:
        try:
            # Decode live image
            live_image = self.decode_image(live_image_base64)

            # Validate and convert stored encoding
            stored_encoding_array = np.array(stored_encoding)
            if stored_encoding_array.shape != (128,):
                raise ValueError(
                    f"Invalid encoding shape: {stored_encoding_array.shape}"
                )

            # Get face locations in live image
            face_locations = face_recognition.face_locations(live_image)

            # No face found
            if len(face_locations) == 0:
                return {
                    "success": True,
                    "is_match": False,
                    "confidence": 0.0,
                    "distance": 1.0,
                    "message": "No face detected in live image",
                }

            # Multiple faces found
            if len(face_locations) > 1:
                return {
                    "success": True,
                    "is_match": False,
                    "confidence": 0.0,
                    "distance": 1.0,
                    "message": "Multiple faces detected. Please ensure only your face is visible.",
                }

            # Extract encoding from live image
            live_encodings = face_recognition.face_encodings(
                live_image,
                face_locations
            )

            if not live_encodings:
                return {
                    "success": True,
                    "is_match": False,
                    "confidence": 0.0,
                    "distance": 1.0,
                    "message": "Could not extract face features from live image",
                }

            live_encoding = live_encodings[0]

            # Compare faces
            matches = face_recognition.compare_faces(
                [stored_encoding_array],
                live_encoding,
                tolerance=self.tolerance
            )

            # Get face distance (lower = more similar)
            face_distances = face_recognition.face_distance(
                [stored_encoding_array],
                live_encoding
            )

            distance = float(face_distances[0])
            is_match = bool(matches[0])

            # Convert distance to confidence (0.0 - 1.0)
            confidence = max(0.0, (1 - distance / self.tolerance))

            return {
                "success": True,
                "is_match": is_match,
                "confidence": round(confidence, 4),
                "distance": round(distance, 4),
                "message": "Face matched successfully" if is_match else "Face did not match",
            }

        except ValueError as e:
            raise e
        except Exception as e:
            logger.error(f"Face verification error: {str(e)}")
            raise Exception(f"Face verification failed: {str(e)}")

    # ─────────────────────────────────────────
    # Assess image quality
    # ─────────────────────────────────────────
    def _assess_quality(self, image: np.ndarray, face_locations: list) -> dict:
        issues = []
        score = 1.0

        # Check image brightness
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        brightness = np.mean(gray)

        if brightness < 50:
            issues.append("Image too dark")
            score -= 0.3
        elif brightness > 220:
            issues.append("Image too bright")
            score -= 0.2

        # Check image sharpness (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 50:
            issues.append("Image is blurry")
            score -= 0.3

        # Check face size relative to image
        if face_locations:
            top, right, bottom, left = face_locations[0]
            face_height = bottom - top
            face_width = right - left
            image_height, image_width = image.shape[:2]

            face_ratio = (face_height * face_width) / (image_height * image_width)

            if face_ratio < 0.05:
                issues.append("Face too small in image")
                score -= 0.2

        return {
            "score": round(max(0.0, score), 2),
            "brightness": round(float(brightness), 2),
            "sharpness": round(float(laplacian_var), 2),
            "issues": issues if issues else ["No issues detected"],
        }