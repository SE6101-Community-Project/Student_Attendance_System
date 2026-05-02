# Face Recognition Service

Python Flask microservice for face detection, registration and verification.
Used by the SUSL Attendance System for student face verification.

---

## Prerequisites

- Python 3.11 (recommended)
- Visual Studio (Windows) - required for dlib
- cmake

---

## Setup

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate
venv\Scripts\activate           # Windows
source venv/bin/activate        # Mac/Linux

# 3. Install cmake and dlib first (Windows)
pip install cmake
pip install dlib==19.24.1

# 4. Install face_recognition_models
pip install git+https://github.com/ageitgey/face_recognition_models

# 5. Install remaining dependencies
pip install -r requirements.txt

# 6. Run service
python app.py
```

---

## Environment Variables

Create `.env` file in `python-face-service/` folder:

```env
PORT=5001
HOST=0.0.0.0
DEBUG=False
MAX_IMAGE_SIZE=20971520
FACE_RECOGNITION_TOLERANCE=0.6
```

---

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | /health | Health check |
| POST | /detect-face | Detect face in image |
| POST | /register-face | Register face encoding |
| POST | /verify-face | Verify face against encoding |

---

## Request & Response Format

### GET `/health`

**Response**
```json
{
    "status": "healthy",
    "service": "Face Recognition Service",
    "version": "1.0.0"
}
```

---

### POST `/detect-face`

**Request**
```json
{
    "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response - Face Detected**
```json
{
    "face_detected": true,
    "face_count": 1,
    "face_locations": [[98, 304, 253, 150]],
    "quality": {
        "score": 1.0,
        "brightness": 170.56,
        "sharpness": 216.99,
        "issues": ["No issues detected"]
    }
}
```

**Response - No Face**
```json
{
    "face_detected": false,
    "face_count": 0,
    "face_locations": [],
    "quality": {...}
}
```

---

### POST `/register-face`

**Request**
```json
{
    "image": "data:image/jpeg;base64,/9j/4AAQ...",
    "student_id": "21CSE0001"
}
```

**Response - Success**
```json
{
    "success": true,
    "encoding": [-0.152, 0.081, 0.163, "...128 numbers total"],
    "confidence": 0.85,
    "message": "Face registered successfully for student 21CSE0001"
}
```

**Response - Failed**
```json
{
    "success": false,
    "message": "No face detected in the image"
}
```

---

### POST `/verify-face`

**Request**
```json
{
    "live_image": "data:image/jpeg;base64,/9j/4AAQ...",
    "stored_encoding": [-0.152, 0.081, 0.163, "...128 numbers"]
}
```

**Response - Match**
```json
{
    "success": true,
    "is_match": true,
    "confidence": 0.85,
    "distance": 0.35,
    "message": "Face matched successfully"
}
```

**Response - No Match**
```json
{
    "success": true,
    "is_match": false,
    "confidence": 0.0,
    "distance": 0.75,
    "message": "Face did not match"
}
```

---

## Image Requirements

| Property | Requirement |
|----------|-------------|
| Format | JPEG / JPG |
| Mode | RGB |
| Max Size | 20MB |
| Faces | Single face only |
| Quality | Clear, well-lit |

---

## Important Notes

```
⚠️  numpy must be < 2.0.0
    numpy 2.x causes "Unsupported image type" error

⚠️  Use JPEG images only
    PNG may cause RGBA channel issues

⚠️  dlib requires Visual C++ Build Tools on Windows
    Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/

✅  Service runs on port 5001
✅  Node.js backend connects via FACE_SERVICE_URL in .env
```

---

## Connection with Node.js Backend

```
React Native App
      │
      ▼
Node.js Backend (:4000)
      │
      │  faceService.js
      │  axios.post("http://localhost:5001/...")
      ▼
Python Flask Service (:5001)
      │
      ▼
face_recognition_service.py
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Unsupported image type` | numpy >= 2.0.0 | `pip install "numpy<2.0.0"` |
| `No module 'pkg_resources'` | setuptools too new | `pip install "setuptools<72.0.0"` |
| `dlib build failed` | No Visual C++ | Install Visual C++ Build Tools |
| `Connection refused` | Service not running | `python app.py` |
| `Face not detected` | Poor image quality | Use clear JPEG photo |

---

## Tested Versions

```
Python          3.11.9
Flask           3.1.3
flask-cors      6.0.2
numpy           1.26.4
Pillow          12.2.0
opencv-python   4.13.0.92
dlib            19.24.1
face-recognition 1.3.0
setuptools      71.1.0
```