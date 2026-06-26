import { useState, useEffect, useRef } from "react";
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
import api from "@/src/api/axiosInstance";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ScanQRScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // ── Animate scan line ──
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  // ── Handle QR scan ──
  const handleBarcodeScanned = async ({ data }) => {
    if (scanned || verifying)
      return;

    setScanned(true);
    setVerifying(true);

    try {
      // POST /api/qrsession/verify-qr
      const res = await api.post("/qrsession/verify-qr", { qrToken: data });

      if (res.data.success) {
        setVerifying(false);
        setScanned(false);

        const sessionInfo = res.data.data;
        // Navigate to face verification with session info
        router.push({
          pathname: "/(student)/(scan)/face-verify",
          params: {
            sessionDbId: sessionInfo.sessionDbId,
            sessionId: sessionInfo.sessionId,
            courseCode: sessionInfo.course.courseCode,
            courseName: sessionInfo.course.courseName,
            venue: sessionInfo.venue,
            lectureNumber: sessionInfo.lectureNumber,
            lectureTitle: sessionInfo.lectureTitle,
            latitude: sessionInfo.location?.coordinates?.[1],
            longitude: sessionInfo.location?.coordinates?.[0],
            radiusInMeters: sessionInfo.radiusInMeters,
          },
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Network error. Please try again.";
      console.log(msg);
      Alert.alert("QR Verification Failed", msg, [
        {
          text: "Try Again",
          onPress: () => {
            setScanned(false);
            setVerifying(false);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => router.back(),
        },
      ]);
      setVerifying(false);
    }
  };

  // ── Permission not granted ──
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#775a19" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#00113a" />
        <MaterialCommunityIcons name="camera-off" size={64} color="#c5c6d2" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Camera permission is required to scan attendance QR codes.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>GRANT PERMISSION</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay}>
        {/* Top dark area */}
        <View style={styles.overlayTop} />

        {/* Middle row */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          {/* Scan frame */}
          <View style={styles.scanFrame}>
            {/* Corner decorations */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Scan line animation */}
            {!verifying && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineTranslate }] },
                ]}
              />
            )}

            {/* Verifying overlay */}
            {verifying && (
              <View style={styles.verifyingOverlay}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.verifyingText}>Verifying QR...</Text>
              </View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>

        {/* Bottom dark area */}
        <View style={styles.overlayBottom}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxLabel}>VERIFICATION PORTAL</Text>
            <Text style={styles.infoBoxTitle}>Biometric Attendance</Text>
            <Text style={styles.infoBoxSub}>
              Position your QR code within the frame
            </Text>
          </View>

          {/* Bottom actions */}
          <View style={styles.bottomActions}>
            {/* Back */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.actionBtnText}>BACK</Text>
            </TouchableOpacity>

            {/* Torch */}
            <TouchableOpacity
              style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
              onPress={() => setTorchOn(!torchOn)}
            >
              <MaterialCommunityIcons
                name={torchOn ? "flashlight" : "flashlight-off"}
                size={24}
                color={torchOn ? "#e9c176" : "#ffffff"}
              />
            </TouchableOpacity>

            {/* Retry */}
            {scanned && !verifying && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setScanned(false)}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.actionBtnText}>RETRY</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Top bar */}
      <View style={styles.topBarInner}>
        <View style={styles.systemOnline}>
          <View style={styles.systemDot} />
          <Text style={styles.systemText}>SYSTEM ONLINE</Text>
        </View>
        <Text style={styles.topBarTitle}>Sabaragamuwa University</Text>
      </View>
    </SafeAreaView>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#00113a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 24,
    color: "#ffffff",
    textAlign: "center",
  },
  permissionText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 20,
  },
  permissionBtn: {
    backgroundColor: "#775a19",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 4,
  },
  permissionBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#ffffff",
  },
  cancelBtn: { marginTop: 4 },
  cancelBtnText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,17,58,0.7)" },
  overlayMiddle: { flexDirection: "row", height: FRAME_SIZE },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,17,58,0.7)" },
  overlayBottom: { flex: 1.2, backgroundColor: "rgba(0,17,58,0.7)" },

  // Scan frame
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },

  // Corners
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#4CAF50",
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

  // Scan line
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  // Verifying overlay
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  verifyingText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2,
    color: "#ffffff",
    textTransform: "uppercase",
  },

  // Info box
  infoBox: { paddingHorizontal: 28, paddingTop: 24, gap: 6 },
  infoBoxLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: "#775a19",
  },
  infoBoxTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 28,
    color: "#ffffff",
    lineHeight: 34,
  },
  infoBoxSub: {
    fontFamily: "Newsreader_400Regular",
    fontStyle: "italic",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },

  // Bottom actions
  bottomActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingTop: 28,
    paddingHorizontal: 28,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  actionBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#ffffff",
  },
  torchBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  torchBtnActive: {
    backgroundColor: "rgba(233,193,118,0.2)",
    borderColor: "#e9c176",
  },

  // Top bar
  topBar: { position: "absolute", top: 0, left: 0, right: 0 },
  topBarInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  systemOnline: { flexDirection: "row", alignItems: "center", gap: 6 },
  systemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
  },
  systemText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 3,
    color: "#ffffff",
  },
  topBarTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "700",
  },
});
