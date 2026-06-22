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