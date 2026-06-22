import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "@/src/context/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Department options ──
const DEPARTMENTS = [
  { label: "Select your department", value: "" },
  { label: "Software Engineering", value: "Software Engineering" },
  { label: "Information System", value: "Information System" },
  { label: "Data Science", value: "Data Science" },
];

const BATCHES = [
  { label: "Select your batch", value: "" },
  { label: "Batch 2019/2020", value: "2019/2020" },
  { label: "Batch 2020/2021", value: "2020/2021" },
  { label: "Batch 2021/2022", value: "2021/2022" },
  { label: "Batch 2022/2023", value: "2022/2023" },
  { label: "Batch 2023/2024", value: "2023/2024" },
  { label: "Batch 2024/2025", value: "2024/2025" },
  { label: "Batch 2025/2026", value: "2025/2026" },
];

const DESIGNATIONS = [
  { label: "Select designation", value: "" },
  { label: "Professor", value: "Professor" },
  { label: "Senior Lecturer", value: "Senior Lecturer" },
  { label: "Lecturer", value: "Lecturer" },
  { label: "Assistant Lecturer", value: "Assistant Lecturer" },
  { label: "Visiting Lecturer", value: "Visiting Lecturer" },
  { label: "Instructor", value: "Instructor" },
];

export default function RegisterScreen() {
  // ── Role Toggle ──
  const [role, setRole] = useState("student"); // 'student' | 'lecturer'
  const toggleAnim = useRef(new Animated.Value(0)).current;

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = role === "student" ? 3 : 2;

  // ── Form Data ──
  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    lecturerId: "",
    email: "",
    mobile: "",
    department: "",
    batch: "",
    designation: "",
    password: "",
    confirmPassword: "",
    imageBase64: null,
  });

  // ── UI State ──
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [showDesignationPicker, setShowDesignationPicker] = useState(false);

  // ── Camera State ──
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("front");
  const cameraRef = useRef(null);

  // ── Auth Context ──
  const { registerStudent } = useAuth();

    // ── Animations ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate step transitions
  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  const switchRole = (newRole) => {
    if (newRole === role) return;
    setRole(newRole);
    setCurrentStep(1);
    setError("");
    setCapturedImage(null);
    setFormData({
      name: "",
      studentId: "",
      lecturerId: "",
      email: "",
      mobile: "",
      department: "",
      batch: "",
      designation: "",
      password: "",
      confirmPassword: "",
      imageBase64: null,
    });

    Animated.timing(toggleAnim, {
      toValue: newRole === "lecturer" ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) 
      setError("");
  };

  const getBorderColor = (field) =>
    focusedField === field ? "#775a19" : "#c5c6d2";
  const getLabelColor = (field) =>
    focusedField === field ? "#775a19" : "#444650";

  // ══════════════════════════════════════
  // VALIDATION
  // ══════════════════════════════════════
  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError("Please enter your full name");
      return false;
    }

    if (role === "student") {
      if (!formData.studentId.trim()) {
        setError("Please enter your Student ID");
        return false;
      }
      if (!formData.batch) {
        setError("Please select your batch");
        return false;
      }
    } else {
      if (!formData.lecturerId.trim()) {
        setError("Please enter your Lecturer ID");
        return false;
      }
      if (!formData.designation) {
        setError("Please select your designation");
        return false;
      }
    }

    if (!formData.email.trim()) {
      setError("Please enter your email");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!formData.mobile.trim()) {
      setError("Please enter your mobile number");
      return false;
    }

    if (!formData.department) {
      setError("Please select your department");
      return false;
    }

    return true;
  };

  const validateStep2Face = () => {
    if (!capturedImage || !formData.imageBase64) {
      setError("Please capture your face photo");
      return false;
    }
    return true;
  };

  const validatePasswordStep = () => {
    if (!formData.password.trim()) {
      setError("Please enter a password");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  // ══════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════
  const handleNext = () => {
    setError("");

    if (currentStep === 1) {
      if (!validateStep1()) 
        return;
      setCurrentStep(2);
    } else if (currentStep === 2 && role === "student") {
      // Student step 2 = Face
      if (!validateStep2Face()) 
        return;
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    } else {
      router.back();
    }
  };

  // ══════════════════════════════════════
  // CAMERA
  // ══════════════════════════════════════
  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady) 
      return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        exif: false,
      });

      setCapturedImage(photo.uri);
      updateField("imageBase64", photo.base64);
    } catch (err) {
      console.log(err);
      setError("Failed to capture photo. Please try again.");
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    updateField("imageBase64", null);
  };

  // ══════════════════════════════════════
  // SUBMIT REGISTRATION
  // ══════════════════════════════════════
  const handleSubmit = async () => {
    setError("");
    if (!validatePasswordStep()) 
      return;

    setLoading(true);

    try {
      if (role === "student") {
        // ── Student Registration ──
        const result = await registerStudent({
          studentId: formData.studentId.trim(),
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          mobile: formData.mobile.trim(),
          batch: formData.batch,
          department: formData.department,
          imageBase64: formData.imageBase64,
        });

        if (result.success) {
          router.replace({
            pathname: "/(auth)/verify-email",
            params: { email: formData.email.trim() },
          });
        } else {
          console.log(result.message);
          setError(result.message || "Registration failed");
          // Go back to relevant step on face errors
          if (
            result.step === "face_detection" ||
            result.step === "face_encoding"
          ) {
            setCurrentStep(2);
          }
        }
      } else {
        // ── Lecturer Registration ──
        const { default: api } = await import("@/src/api/axiosInstance");
        const response = await api.post("/lecturer/register", {
          lecturerId: formData.lecturerId.trim(),
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          mobile: formData.mobile.trim(),
          department: formData.department,
          designation: formData.designation,
        });

        if (response.data.success) {
          router.replace({
            pathname: "/(auth)/verify-email",
            params: { email: formData.email.trim() },
          });
        } else {
          console.log(response.data.message);
          setError(response.data.message || "Registration failed");
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Registration failed",
      );
      console.log(err);
    } finally {
      setLoading(false);
    }
  };