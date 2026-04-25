import face_recognition
import numpy as np
import base64
import logging
import os
from PIL import Image
import io
import cv2

logger = logging.getLogger(__name__)


class FaceRecognitionService:

    def __init__(self, tolerance: float = 0.6):
        """
        tolerance: Maximum face distance accepted as a match.
                   Lower = stricter. Higher = more lenient.

        Confidence formula: confidence = 1.0 - distance
          distance=0.0 → confidence=1.0  (identical)
          distance=0.3 → confidence=0.7  (very good)
          distance=0.6 → confidence=0.4  (boundary — accepted)
          distance=0.7 → confidence=0.3  (rejected)
        """
        self.tolerance = tolerance
        logger.info(
            f"FaceRecognitionService initialised "
            f"| tolerance={self.tolerance}"
        )

    # ─────────────────────────────────────────
    # Decode base64 → numpy uint8 RGB array
    # ─────────────────────────────────────────
    def decode_image(self, image_base64: str) -> np.ndarray:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]

            image_bytes = base64.b64decode(image_base64)
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image_array = np.array(pil_image)

            if image_array.dtype != np.uint8:
                image_array = image_array.astype(np.uint8)

            # Resize large images — improves speed, preserves accuracy
            max_dimension = 640
            h, w = image_array.shape[:2]
            if max(h, w) > max_dimension:
                scale = max_dimension / max(h, w)
                new_w = int(w * scale)
                new_h = int(h * scale)
                image_array = cv2.resize(image_array, (new_w, new_h))
                logger.debug(
                    f"Image resized from {w}x{h} to {new_w}x{new_h}"
                )

            logger.debug(
                f"Image decoded | shape={image_array.shape} "
                f"dtype={image_array.dtype} "
                f"range=[{image_array.min()},{image_array.max()}]"
            )

            return image_array

        except Exception as e:
            logger.error(f"Image decode failed: {e}")
            raise ValueError(f"Invalid image data: {e}")

    # ─────────────────────────────────────────
    # Detect faces
    # ─────────────────────────────────────────
    def detect_faces(self, image_base64: str) -> dict:
        try:
            image = self.decode_image(image_base64)

            face_locations = face_recognition.face_locations(
                image, model="hog"
            )

            quality = self._assess_quality(image, face_locations)

            return {
                "success": True,
                "face_detected": len(face_locations) > 0,
                "face_count": len(face_locations),
                "face_locations": [list(loc) for loc in face_locations],
                "quality": quality,
            }

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Face detection error: {e}")
            raise Exception(f"Face detection failed: {e}")

    # ─────────────────────────────────────────
    # Register face — extract 128-D encoding
    # ─────────────────────────────────────────
    def register_face(self, image_base64: str, student_id: str) -> dict:
        try:
            image = self.decode_image(image_base64)

            # ✅ HOG for detection
            face_locations = face_recognition.face_locations(
                image, model="hog"
            )

            # ── Face count checks ──
            if len(face_locations) == 0:
                return {
                    "success": False,
                    "message": "No face detected. "
                            "Please ensure your face is clearly visible.",
                }

            if len(face_locations) > 1:
                return {
                    "success": False,
                    "message": "Multiple faces detected. "
                            "Please use an image with only one face.",
                }

            # ── Alignment check ──
            try:
                face_landmarks = face_recognition.face_landmarks(
                    image, face_locations
                )
                if face_landmarks:
                    landmark = face_landmarks[0]
                    if (
                        'left_eye' not in landmark
                        or 'right_eye' not in landmark
                    ):
                        return {
                            "success": False,
                            "message": "Face not properly aligned. "
                                    "Please face the camera directly.",
                        }
            except Exception as lm_err:
                logger.warning(f"Landmark check skipped: {lm_err}")

            # ── Quality gate ──
            quality = self._assess_quality(image, face_locations)
            if quality["score"] < 0.5:
                return {
                    "success": False,
                    "message": (
                        f"Image quality too low: "
                        f"{', '.join(quality['issues'])}. "
                        f"Please take a clearer photo."
                    ),
                    "quality": quality,
                }

            # ── Extract encoding ──
            # num_jitters=1 for speed — still accurate enough
            face_encodings = face_recognition.face_encodings(
                image, face_locations, num_jitters=1
            )

            if not face_encodings:
                return {
                    "success": False,
                    "message": "Could not extract face features. "
                            "Please try with a different image.",
                }

            encoding = face_encodings[0]

            logger.info(
                f"Face registered | student={student_id} "
                f"quality_score={quality['score']}"
            )

            return {
                "success": True,
                "encoding": encoding.tolist(),
                "quality": quality,
                "message": f"Face registered successfully for student {student_id}",
            }

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Face registration error: {e}")
            raise Exception(f"Face registration failed: {e}")


    # ─────────────────────────────────────────
    # Verify face against stored encoding
    # ─────────────────────────────────────────
    def verify_face(
        self, live_image_base64: str, stored_encoding: list
    ) -> dict:
        try:
            live_image = self.decode_image(live_image_base64)

            stored_array = np.array(stored_encoding, dtype=np.float64)
            if stored_array.shape != (128,):
                raise ValueError(
                    f"Invalid encoding shape: {stored_array.shape}. "
                    f"Expected (128,)."
                )

            # ✅ HOG for detection
            face_locations = face_recognition.face_locations(
                live_image, model="hog"
            )

            if len(face_locations) == 0:
                return {
                    "success": True,
                    "is_match": False,
                    "confidence": 0.0,
                    "distance": 1.0,
                    "message": "No face detected. "
                            "Please look directly at the camera.",
                }

            if len(face_locations) > 1:
                return {
                    "success": True,
                    "is_match": False,
                    "confidence": 0.0,
                    "distance": 1.0,
                    "message": "Multiple faces detected. "
                            "Please ensure only your face is visible.",
                }

            # num_jitters=1 for speed
            live_encodings = face_recognition.face_encodings(
                live_image, face_locations, num_jitters=1
            )

            if not live_encodings:
                return {
                    "success": True,
                    "is_match": False,
                    "confidence": 0.0,
                    "distance": 1.0,
                    "message": "Could not extract face features. "
                            "Please try again in better lighting.",
                }

            live_encoding = live_encodings[0]

            matches = face_recognition.compare_faces(
                [stored_array],
                live_encoding,
                tolerance=self.tolerance,
            )
            face_distances = face_recognition.face_distance(
                [stored_array], live_encoding
            )

            distance = float(face_distances[0])
            is_match = bool(matches[0])
            confidence = round(float(np.clip(1.0 - distance, 0.0, 1.0)), 4)

            logger.info(
                f"Face verification | is_match={is_match} "
                f"distance={distance:.4f} "
                f"confidence={confidence:.4f} "
                f"tolerance={self.tolerance}"
            )

            return {
                "success": True,
                "is_match": is_match,
                "confidence": confidence,
                "distance": round(distance, 4),
                "message": (
                    "Face matched successfully"
                    if is_match
                    else "Face did not match. Please try again."
                ),
            }

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Face verification error: {e}")
            raise Exception(f"Face verification failed: {e}")

    # ─────────────────────────────────────────
    # Assess image quality
    # ─────────────────────────────────────────
    def _assess_quality(
        self, image: np.ndarray, face_locations: list
    ) -> dict:
        issues = []
        score = 1.0

        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

        # ── Brightness ──
        brightness = float(np.mean(gray))
        if brightness < 50:
            issues.append("Image too dark")
            score -= 0.3
        elif brightness > 220:
            issues.append("Image too bright / overexposed")
            score -= 0.2

        # ── Sharpness ──
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if sharpness < 50:
            issues.append("Image is blurry")
            score -= 0.3

        # ── Face size ──
        if face_locations:
            top, right, bottom, left = face_locations[0]
            face_h = bottom - top
            face_w = right - left
            img_h, img_w = image.shape[:2]
            face_ratio = (face_h * face_w) / (img_h * img_w)

            if face_ratio < 0.05:
                issues.append("Face too small — move closer to the camera")
                score -= 0.2
            elif face_ratio > 0.85:
                issues.append("Face too close — move back slightly")
                score -= 0.1

        return {
            "score": round(float(np.clip(score, 0.0, 1.0)), 2),
            "brightness": round(brightness, 2),
            "sharpness": round(sharpness, 2),
            "issues": issues if issues else ["No issues detected"],
        }