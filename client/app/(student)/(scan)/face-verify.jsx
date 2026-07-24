// app/(student)/(scan)/face-verify.jsx
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
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useScanStore from "../../../src/store/useScanStore";

export default function FaceVerifyScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { setImageBase64 } = useScanStore();

  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [verified, setVerified] = useState(false);

  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);
  const navigationTimerRef = useRef(null);

  // ── Pulse animation ──
  useEffect(() => {
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

    return () => {
      pulseLoopRef.current?.stop();
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  const handleCapture = async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
      });

      if (!photo.base64) {
        throw new Error("Failed to capture image. Please try again.");
      }

      // Reject if image is too large (over ~7.5MB raw)
      if (photo.base64.length > 10_000_000) {
        throw new Error("Image too large. Please try again.");
      }

      const imageBase64 = `data:image/jpeg;base64,${photo.base64}`;
      setImageBase64(imageBase64);
      setVerified(true);

      // Navigate after brief delay
      navigationTimerRef.current = setTimeout(() => {
        router.push({
          pathname: "/(student)/(scan)/location-verify",
          params: { ...params },
        });
      }, 800);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to capture image";

      console.error("[FaceVerify] Capture error:", msg);

      Alert.alert("Capture Failed", msg, [
        { text: "Try Again" },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = () => {
    // Cancel pending navigation
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }

    setCapturing(false);
    setVerified(false);
    setImageBase64(null);
  };

  // ─────────────────────────────────────────
  // Permission gate
  // ─────────────────────────────────────────
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
          Camera access is needed to verify your identity for attendance.
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

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="front"
      />

      <View style={styles.overlay} />

      <View
        style={[
          styles.uiLayer,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Top bar */}
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

        {/* Archival header */}
        <View style={styles.archivalHeader}>
          <View style={styles.archivalAccent} />
          <View>
            <Text style={styles.archivalLabel}>VERIFICATION PORTAL</Text>
            <Text style={styles.archivalTitle}>Biometric Attendance</Text>
            <Text style={styles.archivalSub}>
              Position your face within the oval
            </Text>
          </View>
        </View>

        {/* Oval face guide */}
        <View style={styles.ovalContainer}>
          <Animated.View
            style={[
              styles.ovalGuide,
              { transform: [{ scale: pulseAnim }] },
              capturing && styles.ovalGuideCapturing,
              verified && styles.ovalGuideVerified,
            ]}
          />
          {verified && (
            <View style={styles.verifiedOverlay}>
              <MaterialCommunityIcons
                name="check-circle"
                size={64}
                color="#4CAF50"
              />
            </View>
          )}
        </View>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardIcon}>
            <MaterialCommunityIcons
              name={verified ? "check-decagram" : "face-recognition"}
              size={20}
              color="#775a19"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusCardTitle}>
              {verified
                ? "Image Captured!"
                : capturing
                  ? "Capturing..."
                  : "Align your face with the oval guide"}
            </Text>
            <Text style={styles.statusCardSub}>
              {verified
                ? "Proceeding to location verification..."
                : capturing
                  ? "Please hold still"
                  : "Ensure good lighting and look directly at the camera"}
            </Text>
            {capturing && !verified && (
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
            )}
          </View>
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>COURSE</Text>
            <Text style={styles.infoCardValue} numberOfLines={1}>
              {params.courseCode || "—"}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>VENUE</Text>
            <Text style={styles.infoCardValue} numberOfLines={1}>
              {params.venue || "—"}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {!verified && (
            <TouchableOpacity
              style={[
                styles.captureBtn,
                capturing && styles.captureBtnDisabled,
              ]}
              onPress={handleCapture}
              disabled={capturing}
              activeOpacity={0.85}
            >
              {capturing ? (
                <>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.captureBtnText}>CAPTURING…</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="camera"
                    size={18}
                    color="#ffffff"
                  />
                  <Text style={styles.captureBtnText}>
                    CAPTURE IDENTITY
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}