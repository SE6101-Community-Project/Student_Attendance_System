// app/(student)/(profile)/face-register.jsx
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/context/AuthContext";


const STEP = {
  IDLE: "idle",
  CAPTURING: "capturing",
  PREVIEW: "preview",
  UPLOADING: "uploading",
  SUCCESS: "success",
};

export default function FaceRegisterScreen() {
  const insets = useSafeAreaInsets();
  const { registerFace, user } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState(STEP.IDLE);
  const [capturedBase64, setCapturedBase64] = useState(null);
  const [qualityScore, setQualityScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);
  const navigationTimerRef = useRef(null);

  useEffect(() => {
    if (step === STEP.IDLE) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1_000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1_000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
    }

    return () => pulseLoopRef.current?.stop();
  }, [step]);

  useEffect(() => {
    return () => {
      pulseLoopRef.current?.stop();
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    };
  }, []);


  const handleCapture = async () => {
    if (step !== STEP.IDLE || !cameraRef.current) return;
    setErrorMsg(null);
    setStep(STEP.CAPTURING);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });

      if (!photo.base64) {
        throw new Error("Failed to capture image. Please try again.");
      }

      if (photo.base64.length > 10_000_000) {
        throw new Error("Image too large. Please move closer and try again.");
      }

      setCapturedBase64(`data:image/jpeg;base64,${photo.base64}`);
      setStep(STEP.PREVIEW);
    } catch (err) {
      const msg = err.message || "Failed to capture image";
      console.error("[FaceRegister] Capture error:", msg);
      setErrorMsg(msg);
      setStep(STEP.IDLE);
    }
  };

  const handleRetake = () => {
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }
    setCapturedBase64(null);
    setQualityScore(null);
    setErrorMsg(null);
    setStep(STEP.IDLE);
  };

  const handleRegister = async () => {
    if (!capturedBase64 || step === STEP.UPLOADING) return;
    setErrorMsg(null);
    setStep(STEP.UPLOADING);

    try {
      // registerFace already handles: API call, state update, SecureStore sync
      const result = await registerFace(capturedBase64);

      if (!result.success) {
        throw new Error(result.message || "Face registration failed");
      }

      setQualityScore(result.data?.qualityScore ?? null);
      setStep(STEP.SUCCESS);

      // Auto-navigate back after showing success
      navigationTimerRef.current = setTimeout(() => {
        router.back();
      }, 2_500);
    } catch (err) {
      const msg = err.message || "Face registration failed";
      console.error("[FaceRegister] Upload error:", msg);
      setErrorMsg(msg);
      setStep(STEP.PREVIEW); // fall back so user can retake or retry

      Alert.alert("Registration Failed", msg, [
        { text: "Retake", onPress: handleRetake },
        { text: "Try Again", onPress: handleRegister },
      ]);
    }
  };


  if (!permission) {
    return (
      <View style={styles.permContainer}>
        <ActivityIndicator color="#ffffff" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <MaterialCommunityIcons
          name="camera-off"
          size={48}
          color="rgba(255,255,255,0.4)"
        />
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permSub}>
          Camera access is needed to register your face for attendance.
        </Text>
        <TouchableOpacity
          style={styles.permBtn}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text style={styles.permBtnText}>GRANT PERMISSION</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permCancelBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.permCancelText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }


  const isIdle = step === STEP.IDLE;
  const isCapturing = step === STEP.CAPTURING;
  const isPreview = step === STEP.PREVIEW;
  const isUploading = step === STEP.UPLOADING;
  const isSuccess = step === STEP.SUCCESS;

  // ── Oval ring colour per step ──
  const ovalStyle = [
    styles.ovalGuide,
    isCapturing && styles.ovalGuideCapturing,
    isPreview && styles.ovalGuidePreview,
    isUploading && styles.ovalGuideUploading,
    isSuccess && styles.ovalGuideSuccess,
  ];

  // ── Status card text ──
  const statusTitle = isSuccess
    ? "Face Registered!"
    : isUploading
      ? "Registering Face…"
      : isPreview
        ? "Image Captured — Look Good?"
        : isCapturing
          ? "Capturing…"
          : "Register Your Face";

  const statusSub = isSuccess
    ? qualityScore != null
      ? `Quality score: ${qualityScore}% · Your face is now linked to your account.`
      : "Your face has been linked to your account successfully."
    : isUploading
      ? "Sending image to server — please wait"
      : isPreview
        ? "Review the capture, then confirm or retake"
        : isCapturing
          ? "Please hold still"
          : "Position your face within the oval. Ensure good lighting.";

  // ── Step index for the progress indicator ──
  const stepIndex = isIdle || isCapturing ? 0 : isPreview ? 1 : 2;


  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Live camera — always mounted */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="front"
      />

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* All UI on top */}
      <View
        style={[
          styles.uiLayer,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color="#ffffff"
            />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Sabaragamuwa University</Text>
          <View style={styles.systemBadge}>
            <View style={styles.systemDot} />
            <Text style={styles.systemText}>SYSTEM ONLINE</Text>
          </View>
        </View>

        {/* ── Archival header ── */}
        <View style={styles.archivalHeader}>
          <View style={styles.archivalAccent} />
          <View>
            <Text style={styles.archivalLabel}>BIOMETRIC SETUP</Text>
            <Text style={styles.archivalTitle}>Face Registration</Text>
            <Text style={styles.archivalSub}>
              One-time setup · Required for attendance
            </Text>
          </View>
        </View>

        {/* ── Tips banner — idle only ── */}
        {isIdle && (
          <View style={styles.tipsBanner}>
            <MaterialCommunityIcons
              name="information-outline"
              size={13}
              color="#c4a257"
            />
            <Text style={styles.tipsText}>
              Face camera directly · Good lighting · No glasses or mask
            </Text>
          </View>
        )}

        {/* ── Already registered banner ── */}
        {isIdle && user?.faceDataRegistered && (
          <View style={styles.alreadyBanner}>
            <MaterialCommunityIcons
              name="shield-check"
              size={13}
              color="#4CAF50"
            />
            <Text style={styles.alreadyText}>
              Face already registered — you can update it below
            </Text>
          </View>
        )}

        {/* ── Oval face guide ── */}
        <View style={styles.ovalContainer}>
          <Animated.View
            style={[
              ...ovalStyle,
              isIdle && { transform: [{ scale: pulseAnim }] },
            ]}
          />

          {/* Uploading spinner */}
          {isUploading && (
            <View style={styles.centeredOverlay}>
              <ActivityIndicator color="#c4a257" size="large" />
            </View>
          )}

          {/* Success tick */}
          {isSuccess && (
            <View style={styles.centeredOverlay}>
              <MaterialCommunityIcons
                name="check-circle"
                size={72}
                color="#4CAF50"
              />
            </View>
          )}

          {/* Corner brackets */}
          <View style={[styles.bracket, styles.bracketTL]} />
          <View style={[styles.bracket, styles.bracketTR]} />
          <View style={[styles.bracket, styles.bracketBL]} />
          <View style={[styles.bracket, styles.bracketBR]} />
        </View>

        {/* ── Status card ── */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardIcon}>
            <MaterialCommunityIcons
              name={
                isSuccess
                  ? "check-decagram"
                  : isPreview || isUploading
                    ? "image-check-outline"
                    : "face-recognition"
              }
              size={20}
              color="#775a19"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusCardTitle}>{statusTitle}</Text>
            <Text style={styles.statusCardSub}>{statusSub}</Text>

            {/* Progress bar while busy */}
            {(isCapturing || isUploading) && (
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
            )}

            {/* Quality score badge */}
            {isSuccess && qualityScore != null && (
              <View style={styles.qualityBadge}>
                <MaterialCommunityIcons
                  name="star-circle"
                  size={12}
                  color="#775a19"
                />
                <Text style={styles.qualityBadgeText}>
                  Quality: {qualityScore}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Error banner ── */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={13}
              color="#ff6b6b"
            />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>

          {/* IDLE — capture */}
          {isIdle && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCapture}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="camera"
                size={18}
                color="#ffffff"
              />
              <Text style={styles.primaryBtnText}>CAPTURE FACE</Text>
            </TouchableOpacity>
          )}

          {/* CAPTURING — disabled spinner */}
          {isCapturing && (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnDisabled]}
              disabled
            >
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.primaryBtnText}>CAPTURING…</Text>
            </TouchableOpacity>
          )}

          {/* PREVIEW — confirm + retake */}
          {isPreview && (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRegister}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.primaryBtnText}>
                  CONFIRM & REGISTER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleRetake}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="camera-retake-outline"
                  size={15}
                  color="#ffffff"
                />
                <Text style={styles.secondaryBtnText}>RETAKE</Text>
              </TouchableOpacity>
            </>
          )}

          {/* UPLOADING — disabled spinner */}
          {isUploading && (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnDisabled]}
              disabled
            >
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.primaryBtnText}>REGISTERING…</Text>
            </TouchableOpacity>
          )}

          {/* SUCCESS — back to profile */}
          {isSuccess && (
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={16}
                color="#ffffff"
              />
              <Text style={styles.primaryBtnText}>BACK TO PROFILE</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Step progress indicator ── */}
        <View style={styles.stepsRow}>
          {/* Connector lines drawn first (behind dots) */}
          <View style={[styles.stepLine, { left: "33%" }]} />
          <View style={[styles.stepLine, { left: "66%" }]} />

          {["Capture", "Confirm", "Register"].map((label, i) => {
            const active = i <= stepIndex;
            const done = isSuccess && i === 2;
            return (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    active && styles.stepDotActive,
                    done && styles.stepDotSuccess,
                  ]}
                >
                  {done && (
                    <MaterialCommunityIcons
                      name="check"
                      size={7}
                      color="#ffffff"
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    active && styles.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}


const GOLD = "#775a19";
const GOLD_LIGHT = "#c4a257";
const NAVY = "#00113a";
const GREEN = "#4CAF50";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,17,58,0.52)",
  },

  uiLayer: {
    flex: 1,
  },

  // ── Permission screen ──────────────────────────────────────────────────────
  permContainer: {
    flex: 1,
    backgroundColor: NAVY,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 40,
  },
  permTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#ffffff",
    textAlign: "center",
  },
  permSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  permBtn: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 4,
    marginTop: 8,
  },
  permBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#ffffff",
  },
  permCancelBtn: {
    paddingVertical: 10,
  },
  permCancelText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    textDecorationLine: "underline",
  },
