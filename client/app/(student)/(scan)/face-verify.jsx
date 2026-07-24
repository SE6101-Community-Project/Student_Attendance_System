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

          {/* Retake — only after capture */}
          {!capturing && verified && (
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={handleRetake}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="camera-retake-outline"
                size={15}
                color="#ffffff"
              />
              <Text style={styles.retakeBtnText}>RETAKE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // ── Dark overlay on top of camera ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,17,58,0.50)",
  },

  // ── All UI sits on top of camera + overlay ──
  uiLayer: {
    flex: 1,
    // No absolute — flex layout stacks content naturally
  },

  // ── Permission screen ──
  permContainer: {
    flex: 1,
    backgroundColor: "#00113a",
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
    backgroundColor: "#775a19",
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

  // ── Top bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 16,
    color: "#ffffff", // fixed: was #00113a (invisible on dark overlay)
    fontWeight: "700",
  },
  systemBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(76,175,80,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  systemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
  },
  systemText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#4CAF50",
  },

  // ── Archival header ──
  archivalHeader: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 4,
  },
  archivalAccent: {
    width: 2,
    height: 56,
    backgroundColor: "#775a19",
  },
  archivalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: "#c4a257",
  },
  archivalTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
    color: "#ffffff",
    lineHeight: 32,
  },
  archivalSub: {
    fontFamily: "Newsreader_400Regular",
    fontStyle: "italic",
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
  },

  // ── Oval guide ──
  ovalContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    flex: 1, // takes remaining space between header and bottom
  },
  ovalGuide: {
    width: 200,
    height: 240,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: "rgba(76,175,80,0.8)",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  ovalGuideCapturing: {
    borderColor: "#F59E0B",
    shadowColor: "#F59E0B",
  },
  ovalGuideVerified: {
    borderColor: "#4CAF50",
    shadowOpacity: 1,
  },
  verifiedOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Status card ──
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#775a19",
  },
  statusCardIcon: {
    backgroundColor: "rgba(233,193,118,0.2)",
    padding: 8,
    borderRadius: 8,
  },
  statusCardTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 17,
    color: "#ffffff",
    marginBottom: 3,
  },
  statusCardSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 16,
  },
  progressBar: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 1,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "60%",
    backgroundColor: "#775a19",
    borderRadius: 1,
  },

  // ── Info grid ──
  infoGrid: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  infoCardLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "rgba(196,162,87,0.9)",
    marginBottom: 4,
  },
  infoCardValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 15,
    color: "#ffffff",
  },

  // ── Action buttons ──
  actionRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#002366",
    paddingVertical: 16,
    borderRadius: 4,
    shadowColor: "#002366",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  captureBtnDisabled: {
    opacity: 0.6,
  },
  captureBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#ffffff",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  retakeBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#ffffff",
  },
});