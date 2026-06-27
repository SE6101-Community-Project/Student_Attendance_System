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

   // ══════════════════════════════════════
  // STEP HEADERS
  // ══════════════════════════════════════
  const getStepInfo = () => {
    if (role === "student") {
      switch (currentStep) {
        case 1:
          return {
            label: "IDENTITY & ENROLLMENT",
            title: "Personal\nDetails",
            progress: 33,
          };
        case 2:
          return {
            label: "IDENTIFICATION",
            title: "Biometric\nVerification",
            progress: 66,
          };
        case 3:
          return {
            label: "SECURITY PHASE",
            title: "Secure Your\nArchive",
            progress: 100,
          };
      }
    } else {
      switch (currentStep) {
        case 1:
          return {
            label: "IDENTITY & ENROLLMENT",
            title: "Personal\nDetails",
            progress: 50,
          };
        case 2:
          return {
            label: "SECURITY PHASE",
            title: "Secure Your\nArchive",
            progress: 100,
          };
      }
    }
  };

  const stepInfo = getStepInfo();

  // ══════════════════════════════════════
  // CUSTOM DROPDOWN
  // ══════════════════════════════════════
  const DropdownPicker = ({
    visible,
    options,
    selectedValue,
    onSelect,
    onClose,
  }) => {
    if (!visible) 
      return null;
    return (
      <View style={styles.dropdownOverlay}>
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>SELECT OPTION</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color="#444650" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.dropdownScroll} bounces={false}>
            {options
              .filter((o) => o.value !== "")
              .map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    selectedValue === option.value && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedValue === option.value &&
                        styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedValue === option.value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color="#775a19"
                    />
                  )}
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </View>
    );
  };

   // ══════════════════════════════════════
  // RENDER: STEP 1 — PERSONAL DETAILS
  // ══════════════════════════════════════
  const renderStep1 = () => (
    <View style={styles.formCard}>
      {/* Name */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: getLabelColor("name") }]}>
          FULL NAME
        </Text>
        <TextInput
          style={[styles.input, { borderBottomColor: getBorderColor("name") }]}
          placeholder="As it appears on your ID"
          placeholderTextColor="rgba(197,198,210,0.7)"
          value={formData.name}
          onChangeText={(t) => updateField("name", t)}
          onFocus={() => setFocusedField("name")}
          onBlur={() => setFocusedField(null)}
          autoCapitalize="words"
        />
      </View>

      {/* Student ID or Lecturer ID */}
      {role === "student" ? (
        <View style={styles.inputGroup}>
          <Text
            style={[styles.inputLabel, { color: getLabelColor("studentId") }]}
          >
            STUDENT ID
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderBottomColor: getBorderColor("studentId") },
            ]}
            placeholder="21CSEXXXX"
            placeholderTextColor="rgba(197,198,210,0.7)"
            value={formData.studentId}
            onChangeText={(t) => updateField("studentId", t)}
            onFocus={() => setFocusedField("studentId")}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="characters"
          />
        </View>
      ) : (
        <View style={styles.inputGroup}>
          <Text
            style={[styles.inputLabel, { color: getLabelColor("lecturerId") }]}
          >
            LECTURER ID
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderBottomColor: getBorderColor("lecturerId") },
            ]}
            placeholder="LEC-XXXX"
            placeholderTextColor="rgba(197,198,210,0.7)"
            value={formData.lecturerId}
            onChangeText={(t) => updateField("lecturerId", t)}
            onFocus={() => setFocusedField("lecturerId")}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="characters"
          />
        </View>
      )}

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: getLabelColor("email") }]}>
          EMAIL ADDRESS
        </Text>
        <TextInput
          style={[styles.input, { borderBottomColor: getBorderColor("email") }]}
          placeholder="youremail_pre@std.foc.sab.ac.lk"
          placeholderTextColor="rgba(197,198,210,0.7)"
          value={formData.email}
          onChangeText={(t) => updateField("email", t)}
          onFocus={() => setFocusedField("email")}
          onBlur={() => setFocusedField(null)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Mobile */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: getLabelColor("mobile") }]}>
          MOBILE NUMBER
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderBottomColor: getBorderColor("mobile") },
          ]}
          placeholder="+94 7X XXX XXXX"
          placeholderTextColor="rgba(197,198,210,0.7)"
          value={formData.mobile}
          onChangeText={(t) => updateField("mobile", t)}
          onFocus={() => setFocusedField("mobile")}
          onBlur={() => setFocusedField(null)}
          keyboardType="phone-pad"
        />
      </View>

      {/* Department Dropdown */}
      <View style={styles.inputGroup}>
        <Text
          style={[styles.inputLabel, { color: getLabelColor("department") }]}
        >
          DEPARTMENT
        </Text>
        <TouchableOpacity
          style={[
            styles.dropdownTrigger,
            { borderBottomColor: getBorderColor("department") },
          ]}
          onPress={() => setShowDeptPicker(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dropdownTriggerText,
              !formData.department && styles.dropdownPlaceholder,
            ]}
          >
            {formData.department || "Select your department"}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={20}
            color="#757682"
          />
        </TouchableOpacity>
      </View>

      {/* Batch (Student) or Designation (Lecturer) */}
      {role === "student" ? (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: getLabelColor("batch") }]}>
            BATCH / INTAKE YEAR
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              { borderBottomColor: getBorderColor("batch") },
            ]}
            onPress={() => setShowBatchPicker(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dropdownTriggerText,
                !formData.batch && styles.dropdownPlaceholder,
              ]}
            >
              {formData.batch ? `Batch ${formData.batch}` : "Select your batch"}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color="#757682"
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputGroup}>
          <Text
            style={[styles.inputLabel, { color: getLabelColor("designation") }]}
          >
            DESIGNATION
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              { borderBottomColor: getBorderColor("designation") },
            ]}
            onPress={() => setShowDesignationPicker(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dropdownTriggerText,
                !formData.designation && styles.dropdownPlaceholder,
              ]}
            >
              {formData.designation || "Select designation"}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color="#757682"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

   // ══════════════════════════════════════
  // RENDER: STEP 2 — FACE CAPTURE (Student only)
  // ══════════════════════════════════════
  const renderStep2Face = () => {
    if (!cameraPermission) 
      return <ActivityIndicator color="#775a19" />;

    if (!cameraPermission.granted) {
      return (
        <View style={styles.formCard}>
          <View style={styles.cameraPermissionCard}>
            <MaterialCommunityIcons
              name="camera-off-outline"
              size={48}
              color="#775a19"
            />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to capture your face photo for biometric
              verification.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestCameraPermission}
              activeOpacity={0.85}
            >
              <Text style={styles.permissionBtnText}>GRANT PERMISSION</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.faceStepContainer}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Instructions</Text>
          <Text style={styles.instructionsText}>
            Ensure you are in a well-lit environment. Remove glasses or hats.
          </Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons
                name="white-balance-sunny"
                size={16}
                color="#775a19"
              />
              <Text style={styles.instructionItemText}>Avoid backlighting</Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons
                name="face-recognition"
                size={16}
                color="#775a19"
              />
              <Text style={styles.instructionItemText}>
                Remove glasses or hats
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={16}
                color="#775a19"
              />
              <Text style={styles.instructionItemText}>
                Align face with guide
              </Text>
            </View>
          </View>
        </View>
