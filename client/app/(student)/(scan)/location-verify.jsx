// app/(student)/scan/location-verify.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import api from "@/src/api/axiosInstance";
import useScanStore from "../../../src/store/useScanStore";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_READINGS = 8;
const MAX_WAIT_MS = 20_000;
const READING_INTERVAL = 1_500;
const POOR_GPS_THRESHOLD = 40;
const MAX_ACC_BUFFER = 50;

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const gpsQuality = (accuracy) => {
  if (!accuracy) return { label: "Unknown", color: "#757682" };
  if (accuracy <= 10) return { label: "Excellent", color: "#4CAF50" };
  if (accuracy <= 25) return { label: "Good", color: "#4CAF50" };
  if (accuracy <= 50) return { label: "Fair", color: "#F59E0B" };
  return { label: "Poor", color: "#ba1a1a" };
};

function RippleRing({ color = "rgba(0,35,102,0.12)", delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1_800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.2, 0],
  });

  return (
    <Animated.View
      style={[
        styles.ripple,
        { backgroundColor: color, transform: [{ scale }], opacity },
      ]}
    />
  );
}

function StatBox({ label, value, sub, valueColor = "#00113a" }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function ReadingRow({ reading, isBest, radius }) {
  const dist = Math.round(reading.distance);
  const acc = Math.round(reading.accuracy);
  const inRange = dist <= radius;
  return (
    <View style={[styles.readingRow, isBest && styles.readingRowBest]}>
      <View
        style={[
          styles.readingDot,
          { backgroundColor: inRange ? "#4CAF50" : "#ba1a1a" },
        ]}
      />
      <Text style={styles.readingDist}>{dist} m away</Text>
      <Text style={styles.readingAcc}>±{acc} m GPS</Text>
      {isBest && (
        <View style={styles.bestBadge}>
          <Text style={styles.bestBadgeText}>BEST</Text>
        </View>
      )}
    </View>
  );
}

function CoordRow({ icon, iconColor, label, value }) {
  return (
    <View style={styles.coordRow}>
      <View style={[styles.coordIcon, { backgroundColor: `${iconColor}15` }]}>
        <MaterialCommunityIcons name={icon} size={15} color={iconColor} />
      </View>
      <View style={styles.coordText}>
        <Text style={styles.coordLabel}>{label}</Text>
        <Text style={styles.coordValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function LocationVerifyScreen() {
  const params = useLocalSearchParams();
  const { imageBase64 } = useScanStore();

  const venueLat = parseFloat(params.latitude);
  const venueLon = parseFloat(params.longitude);
  const radiusInMeters = parseInt(params.radiusInMeters, 10) || 100;

  useEffect(() => {
    if (isNaN(venueLat) || isNaN(venueLon)) {
      Alert.alert(
        "Configuration Error",
        "Venue location data is missing or invalid. Please scan the QR code again.",
        [{ text: "Go Back", onPress: () => router.back() }],
      );
    }
  }, []);

  const [phase, setPhase] = useState("idle");
  const [readings, setReadings] = useState([]);
  const [best, setBest] = useState(null);
  const [count, setCount] = useState(0);
  const [serverErr, setServerErr] = useState(null);

  const watcherRef = useRef(null);
  const timerRef = useRef(null);
  // Keep a ref to collected array so timeout closure can read it
  const collectedRef = useRef([]);

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      watcherRef.current?.remove();
      clearTimeout(timerRef.current);
    };
  }, []);

  // ── Auto-start on mount ──
  useEffect(() => {
    if (!isNaN(venueLat) && !isNaN(venueLon)) {
      startCollecting();
    }
  }, []);

  const stopWatcher = useCallback(() => {
    watcherRef.current?.remove();
    watcherRef.current = null;
    clearTimeout(timerRef.current);
  }, []);

  const startCollecting = useCallback(async () => {
    stopWatcher();
    setPhase("requesting");
    setReadings([]);
    setBest(null);
    setCount(0);
    setServerErr(null);
    collectedRef.current = [];

    // ── 1. Check location services ──
    try {
      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        Alert.alert(
          "Location Services Off",
          Platform.OS === "ios"
            ? "Go to Settings → Privacy & Security → Location Services and turn it on."
            : "Go to Settings → Location and turn it on.",
          [
            {
              text: "Open Settings",
              onPress: () =>
                Platform.OS === "ios"
                  ? Linking.openURL("app-settings:")
                  : Linking.openSettings(),
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => router.back(),
            },
          ],
        );
        setPhase("idle");
        return;
      }

      // ── 2. Request permission ──
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is required to verify you are physically in class.",
          [
            {
              text: "Open Settings",
              onPress: () =>
                Platform.OS === "ios"
                  ? Linking.openURL("app-settings:")
                  : Linking.openSettings(),
            },
            {
              text: "Go Back",
              style: "cancel",
              onPress: () => router.back(),
            },
          ],
        );
        setPhase("idle");
        return;
      }
    } catch (permErr) {
      console.warn("[LocationVerify] Permission error:", permErr.message);
      setPhase("idle");
      Alert.alert("Error", "Could not request location permission.");
      return;
    }

    // ── 3. Start watching position ──
    setPhase("collecting");

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: READING_INTERVAL,
          distanceInterval: 0,
        },
        (loc) => {
          const {
            latitude: lat,
            longitude: lon,
            accuracy: acc = 999,
          } = loc.coords;

          const dist = haversineDistance(lat, lon, venueLat, venueLon);
          const reading = {
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            distance: dist,
          };

          collectedRef.current = [...collectedRef.current, reading];
          const collected = collectedRef.current;

          // Best = closest distance to venue
          const currentBest = collected.reduce((prev, curr) =>
            curr.distance < prev.distance ? curr : prev,
          );

          setReadings([...collected]);
          setBest(currentBest);
          setCount(collected.length);

          console.log(
            `[GPS #${collected.length}] dist=${Math.round(dist)}m` +
              ` acc=±${Math.round(acc)}m` +
              ` lat=${lat.toFixed(6)} lon=${lon.toFixed(6)}` +
              ` venue=(${venueLat.toFixed(6)}, ${venueLon.toFixed(6)})`,
          );

          if (collected.length >= MAX_READINGS) {
            subscription.remove();
            watcherRef.current = null;
            clearTimeout(timerRef.current);
            setPhase("done");
          }
        },
      );

      watcherRef.current = subscription;

      // ── Hard timeout fallback ──
      timerRef.current = setTimeout(() => {
        subscription.remove();
        watcherRef.current = null;
        const collected = collectedRef.current;
        setPhase(collected.length > 0 ? "done" : "idle");

        if (collected.length === 0) {
          Alert.alert(
            "GPS Timeout",
            "Could not get a GPS reading. Move near a window or outside and retry.",
            [
              { text: "Retry", onPress: startCollecting },
              { text: "Cancel", style: "cancel", onPress: () => router.back() },
            ],
          );
        }
      }, MAX_WAIT_MS);
    } catch (watchErr) {
      console.warn(
        "[LocationVerify] watchPositionAsync error:",
        watchErr.message,
      );
      setPhase("idle");
      Alert.alert("GPS Error", "Failed to start GPS. Please retry.");
    }
  }, [venueLat, venueLon, stopWatcher]);

  // ─────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────
  const bestDist = best ? Math.round(best.distance) : null;
  const bestAcc = best ? Math.round(best.accuracy) : null;
  const quality = gpsQuality(bestAcc);

  // Client-side buffer for UI feedback only
  // Backend always enforces strict radiusInMeters — no override allowed
  const clientBuffer = Math.min(bestAcc ?? 0, MAX_ACC_BUFFER);
  const clientEffective = radiusInMeters + clientBuffer;
  const clientInRange = bestDist !== null && bestDist <= clientEffective;
  const isPoorGPS = bestAcc !== null && bestAcc > POOR_GPS_THRESHOLD;

  const isCollecting = phase === "collecting" || phase === "requesting";
  const isDone = phase === "done";
  const isSubmitting = phase === "submitting";

  const progress = isCollecting ? count / MAX_READINGS : isDone ? 1 : 0;

  // ─────────────────────────────────────────
  // Status chip config
  // ─────────────────────────────────────────
  const statusInfo = (() => {
    if (phase === "requesting")
      return {
        label: "Requesting GPS…",
        color: "#775a19",
        icon: "crosshairs-gps",
      };
    if (phase === "collecting")
      return {
        label: `Collecting GPS… (${count}/${MAX_READINGS})`,
        color: "#775a19",
        icon: "crosshairs-gps",
      };
    if (!best)
      return {
        label: "No Signal",
        color: "#757682",
        icon: "wifi-off",
      };
    if (clientInRange)
      return {
        label: "Within Range ✓",
        color: "#4CAF50",
        icon: "map-marker-check",
      };
    if (isPoorGPS)
      return {
        label: "Poor GPS — Move Near Window",
        color: "#F59E0B",
        icon: "map-marker-alert",
      };
    return {
      label: "Out of Range ✗",
      color: "#ba1a1a",
      icon: "map-marker-remove",
    };
  })();

  // Orb color
  const orbColor = (() => {
    if (isCollecting) return "#002366";
    if (!best) return "#757682";
    if (clientInRange) return "#4CAF50";
    if (isPoorGPS) return "#F59E0B";
    return "#ba1a1a";
  })();

  // ─────────────────────────────────────────
  // Submit attendance — NO override option
  // ─────────────────────────────────────────
  const submitAttendance = useCallback(async () => {
    if (!best) {
      Alert.alert("Error", "No location data. Please retry GPS.");
      return;
    }
    if (!imageBase64) {
      Alert.alert(
        "Missing Face Data",
        "Face scan data is missing. Please go back and scan again.",
        [{ text: "Go Back", onPress: () => router.back() }],
      );
      return;
    }
    if (isNaN(venueLat) || isNaN(venueLon)) {
      Alert.alert(
        "Configuration Error",
        "Venue coordinates are invalid. Please scan the QR code again.",
        [{ text: "Go Back", onPress: () => router.back() }],
      );
      return;
    }

    setPhase("submitting");
    setServerErr(null);

    console.log("── Submitting Attendance ────────────────");
    console.log(
      `Student:  lat=${best.latitude.toFixed(6)}, lon=${best.longitude.toFixed(6)}`,
    );
    console.log(
      `Venue:    lat=${venueLat.toFixed(6)}, lon=${venueLon.toFixed(6)}`,
    );
    console.log(
      `Distance: ${Math.round(best.distance)} m  |  Accuracy: ±${Math.round(best.accuracy)} m`,
    );
    console.log(`Radius:   ${radiusInMeters} m`);
    console.log("─────────────────────────────────────────");

    try {
      const res = await api.post("/attendance/mark", {
        sessionDbId: params.sessionDbId,
        liveImageBase64: imageBase64,
        studentLatitude: best.latitude,
        studentLongitude: best.longitude,
      });

      if (res.data.success) {
        router.replace({
          pathname: "/(student)/(scan)/success",
          params: {
            ...params,
            status: res.data.data.status,
            attendanceId: res.data.data.attendanceId,
            markedAt: res.data.data.markedAt,
            attendancePct: res.data.data.attendancePercentage,
            isLate: String(res.data.data.isLate),
            lateByMinutes: String(res.data.data.lateByMinutes),
          },
        });
      }
    } catch (err) {
      const errData = err.response?.data ?? {};
      const step = errData.step;
      const msg =
        errData.message ?? "Failed to mark attendance. Please try again.";

      console.warn("[LocationVerify] Submit error:", JSON.stringify(errData));
      setServerErr(msg);
      setPhase("done");

      if (step === "face") {
        // ── Face verification failed ──
        Alert.alert(
          "Face Verification Failed",
          msg + "\n\nPlease go back and scan your face again.",
          [
            { text: "Go Back", onPress: () => router.back() },
            { text: "Dismiss", style: "cancel" },
          ],
        );
      } else if (step === "location") {
        // ── Location rejected by backend — no override ──
        const serverDist = errData.distance;
        const serverRadius = errData.allowedRadius;

        Alert.alert(
          "Location Out of Range",
          `Server confirmed you are ${serverDist} m from the venue.\n` +
            `Required: within ${serverRadius} m.\n\n` +
            `GPS accuracy: ±${bestAcc} m\n\n` +
            `Please move closer to the lecture hall and collect a new GPS reading.`,
          [
            { text: "Retry GPS", onPress: startCollecting },
            { text: "Cancel", style: "cancel" },
          ],
        );
      } else {
        // ── Generic / session errors ──
        Alert.alert("Attendance Error", msg, [{ text: "OK" }]);
      }
    }
  }, [
    best,
    imageBase64,
    params,
    venueLat,
    venueLon,
    bestAcc,
    radiusInMeters,
    startCollecting,
  ]);

  // ─────────────────────────────────────────
  // Primary CTA handler
  // ─────────────────────────────────────────
  const handleMarkAttendance = useCallback(async () => {
    if (isCollecting || isSubmitting) return;

    if (clientInRange) {
      // Client says within range → submit
      await submitAttendance();
      return;
    }

    // Client says out of range
    if (isPoorGPS) {
      // Poor GPS — advise to move, no override
      Alert.alert(
        "Poor GPS Signal",
        `Measured distance: ${bestDist} m (limit: ${radiusInMeters} m)\n` +
          `GPS accuracy: ±${bestAcc} m — signal is too poor to verify location.\n\n` +
          `Please move near a window or doorway and collect a new GPS reading.`,
        [
          { text: "Retry GPS", onPress: startCollecting },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } else {
      Alert.alert(
        "Out of Range",
        `You are ${bestDist} m from the venue.\n` +
          `Required: within ${radiusInMeters} m.\n` +
          `GPS accuracy: ±${bestAcc} m\n\n` +
          `Please move closer to the lecture hall.`,
        [
          { text: "Retry GPS", onPress: startCollecting },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  }, [
    isCollecting,
    isSubmitting,
    clientInRange,
    isPoorGPS,
    bestDist,
    bestAcc,
    radiusInMeters,
    submitAttendance,
    startCollecting,
  ]);

  // ─────────────────────────────────────────
  // Button config
  // ─────────────────────────────────────────
  const markBtnLabel = (() => {
    if (isSubmitting) return "SUBMITTING…";
    if (clientInRange) return "MARK ATTENDANCE";
    if (isPoorGPS) return "POOR GPS — RETRY FIRST";
    return "OUT OF RANGE — RETRY GPS";
  })();

  const markBtnIcon = (() => {
    if (clientInRange) return "check-circle-outline";
    if (isPoorGPS) return "signal-off";
    return "map-marker-remove";
  })();

  const markBtnColor = (() => {
    if (clientInRange) return "#002366";
    if (isPoorGPS) return "#F59E0B";
    return "#ba1a1a";
  })();

  const displayReadings = [...readings].reverse().slice(0, 5);

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#00113a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Location Verification</Text>
          <Text style={styles.headerSub}>
            {params.courseCode} - {params.venue}
          </Text>
        </View>
        <Text style={styles.headerBrand}>SUSL</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Geofence Visualiser ── */}
        <View style={styles.mapArea}>
          {isCollecting && (
            <>
              <RippleRing color="rgba(0,35,102,0.10)" delay={0} />
              <RippleRing color="rgba(0,35,102,0.07)" delay={600} />
            </>
          )}

          <View
            style={[
              styles.ringOuter,
              isDone && clientInRange && styles.ringOuterGreen,
              isDone && !clientInRange && isPoorGPS && styles.ringOuterAmber,
              isDone && !clientInRange && !isPoorGPS && styles.ringOuterRed,
            ]}
          />
          <View
            style={[
              styles.ringMid,
              isDone && clientInRange && styles.ringMidGreen,
            ]}
          />

          {/* Venue orb */}
          <View
            style={[
              styles.venueOrb,
              { backgroundColor: orbColor },
              isDone && { shadowColor: orbColor },
            ]}
          >
            {isCollecting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <MaterialCommunityIcons name="school" size={24} color="#ffffff" />
            )}
            <Text style={styles.venueOrbLabel}>VENUE</Text>
          </View>

          {/* Student dot */}
          {isDone && best && (
            <View
              style={[
                styles.userDot,
                {
                  backgroundColor: clientInRange
                    ? "#4CAF50"
                    : isPoorGPS
                      ? "#F59E0B"
                      : "#ba1a1a",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={13}
                color="#ffffff"
              />
            </View>
          )}

          {/* Status chip */}
          <View
            style={[
              styles.statusChip,
              { backgroundColor: `${statusInfo.color}18` },
            ]}
          >
            <MaterialCommunityIcons
              name={statusInfo.icon}
              size={13}
              color={statusInfo.color}
            />
            <Text style={[styles.statusChipText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          {/* GPS quality chip */}
          {bestAcc !== null && (
            <View style={styles.gpsChip}>
              <View
                style={[styles.gpsDot, { backgroundColor: quality.color }]}
              />
              <Text style={styles.gpsChipText}>
                GPS ±{bestAcc} m · {quality.label}
              </Text>
            </View>
          )}
        </View>

        {/* ── Stats Card ── */}
        <Animated.View
          style={[
            styles.card,
            styles.statsCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.statsRow}>
            <StatBox
              label="YOUR DISTANCE"
              value={bestDist !== null ? `${bestDist} m` : "—"}
              sub="from venue"
              valueColor={
                bestDist === null
                  ? "#757682"
                  : clientInRange
                    ? "#4CAF50"
                    : "#ba1a1a"
              }
            />
            <View style={styles.statDivider} />
            <StatBox
              label="ALLOWED RANGE"
              value={`${radiusInMeters} m`}
              sub={bestAcc !== null ? `+${clientBuffer} m buffer` : "radius"}
              valueColor="#775a19"
            />
            <View style={styles.statDivider} />
            <StatBox
              label="GPS ACCURACY"
              value={bestAcc !== null ? `±${bestAcc} m` : "—"}
              sub={quality.label}
              valueColor={quality.color}
            />
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(progress * 100, 100)}%`,
                  backgroundColor: statusInfo.color,
                },
              ]}
            />
          </View>

          <Text style={styles.progressLabel}>
            {phase === "requesting"
              ? "Requesting location permission…"
              : isCollecting
                ? `Collecting reading ${count} of ${MAX_READINGS}…`
                : isDone && clientInRange
                  ? "Location confirmed — ready to mark attendance."
                  : isDone && isPoorGPS
                    ? "Poor GPS signal — move near a window and retry."
                    : isDone
                      ? "Out of range — move closer to the venue and retry."
                      : "Starting GPS collection…"}
          </Text>

          {/* Server error */}
          {serverErr && (
            <View style={styles.serverErrBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={14}
                color="#ba1a1a"
              />
              <Text style={styles.serverErrText}>{serverErr}</Text>
            </View>
          )}
        </Animated.View>

        {/* ── GPS Readings Table ── */}
        {readings.length > 0 && (
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.cardTitle}>GPS Readings</Text>
            <Text style={styles.cardSub}>
              {readings.length} sample{readings.length !== 1 ? "s" : ""}{" "}
              collected
              {best ? `  -  Best: ${Math.round(best.distance)} m away` : ""}
            </Text>
            <View style={styles.readingList}>
              {displayReadings.map((r, i) => (
                <ReadingRow
                  key={i}
                  reading={r}
                  isBest={best && r.distance === best.distance}
                  radius={radiusInMeters}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Venue Coords Card ── */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <CoordRow
            icon="map-marker-outline"
            iconColor="#775a19"
            label="VENUE COORDINATES"
            value={
              !isNaN(venueLat) && !isNaN(venueLon)
                ? `${venueLat.toFixed(6)},  ${venueLon.toFixed(6)}`
                : "Not available"
            }
          />
          {best && (
            <>
              <View style={styles.coordDivider} />
              <CoordRow
                icon="crosshairs-gps"
                iconColor="#758dd5"
                label="YOUR BEST COORDINATES"
                value={`${best.latitude.toFixed(6)},  ${best.longitude.toFixed(6)}`}
              />
            </>
          )}
        </Animated.View>

        {/* ── Tips Card ── */}
        <Animated.View
          style={[
            styles.tipsCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.tipsHeader}>
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={14}
              color="#775a19"
            />
            <Text style={styles.tipsTitle}>Tips for Better GPS</Text>
          </View>
          <Text style={styles.tipsText}>
            {"• Move near a window or doorway\n"}
            {"• Keep your phone upright and still\n"}
            {"• Wait 10 seconds for GPS to warm up\n"}
            {"• Turn off Wi-Fi temporarily\n"}
            {"• If readings are poor, step outside briefly"}
          </Text>
        </Animated.View>

        {/* ── Action Buttons ── */}
        <Animated.View
          style={[
            styles.actionSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Collecting state */}
          {isCollecting && (
            <View style={styles.collectingBtn}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.collectingBtnText}>
                COLLECTING GPS… ({count}/{MAX_READINGS})
              </Text>
            </View>
          )}

          {/* Done / submitting state */}
          {!isCollecting && (
            <TouchableOpacity
              style={[
                styles.markBtn,
                { backgroundColor: markBtnColor },
                (isSubmitting || !best) && styles.btnDisabled,
              ]}
              onPress={handleMarkAttendance}
              disabled={isSubmitting || !best || isCollecting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.markBtnText}>SUBMITTING…</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={markBtnIcon}
                    size={17}
                    color="#ffffff"
                  />
                  <Text style={styles.markBtnText}>{markBtnLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Retry GPS */}
          <TouchableOpacity
            style={[
              styles.retryBtn,
              (isCollecting || isSubmitting) && styles.btnDisabled,
            ]}
            onPress={startCollecting}
            disabled={isCollecting || isSubmitting}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={16}
              color={isCollecting || isSubmitting ? "#c5c6d2" : "#002366"}
            />
            <Text
              style={[
                styles.retryBtnText,
                (isCollecting || isSubmitting) && { color: "#c5c6d2" },
              ]}
            >
              {isCollecting ? "COLLECTING…" : "COLLECT NEW GPS READINGS"}
            </Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel Verification</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9f9f9" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,17,58,0.06)",
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#00113a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,17,58,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 19,
    color: "#00113a",
  },
  headerSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
    letterSpacing: 0.4,
    marginTop: 1,
  },
  headerBrand: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 14,
    color: "rgba(0,17,58,0.25)",
    fontWeight: "700",
  },

  scroll: { paddingBottom: 48 },

  // ── Map area ──
  mapArea: {
    height: 230,
    backgroundColor: "#eef1f6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ripple: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  ringOuter: {
    position: "absolute",
    width: 186,
    height: 186,
    borderRadius: 93,
    borderWidth: 1.5,
    borderColor: "rgba(119,90,25,0.2)",
    backgroundColor: "rgba(119,90,25,0.04)",
  },
  ringOuterGreen: {
    borderColor: "rgba(76,175,80,0.35)",
    backgroundColor: "rgba(76,175,80,0.06)",
  },
  ringOuterAmber: {
    borderColor: "rgba(245,158,11,0.35)",
    backgroundColor: "rgba(245,158,11,0.06)",
  },
  ringOuterRed: {
    borderColor: "rgba(186,26,26,0.35)",
    backgroundColor: "rgba(186,26,26,0.06)",
  },
  ringMid: {
    position: "absolute",
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 2,
    borderColor: "rgba(119,90,25,0.3)",
    backgroundColor: "rgba(119,90,25,0.06)",
  },
  ringMidGreen: { borderColor: "rgba(76,175,80,0.5)" },

  venueOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#002366",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#002366",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
  venueOrbLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 6,
    letterSpacing: 1,
    color: "#ffffff",
  },

  userDot: {
    position: "absolute",
    top: "32%",
    left: "60%",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },

  statusChip: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
  },
  statusChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 0.8,
  },

  gpsChip: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  gpsDot: { width: 7, height: 7, borderRadius: 4 },
  gpsChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 0.4,
    color: "#444650",
  },

  // ── Cards ──
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.15)",
    ...Platform.select({
      ios: {
        shadowColor: "#00113a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  statsCard: { gap: 14 },

  statsRow: { flexDirection: "row", alignItems: "center" },
  statBox: { flex: 1, alignItems: "center", gap: 3 },
  statLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
    textAlign: "center",
  },
  statValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
    lineHeight: 30,
  },
  statSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#c5c6d2",
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(197,198,210,0.3)",
  },

  progressTrack: {
    height: 4,
    backgroundColor: "#f3f3f3",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    textAlign: "center",
    lineHeight: 17,
  },

  serverErrBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "rgba(186,26,26,0.06)",
    padding: 10,
    borderRadius: 8,
    marginTop: 2,
  },
  serverErrText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#ba1a1a",
    flex: 1,
    lineHeight: 16,
  },

  cardTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 17,
    color: "#00113a",
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    marginBottom: 10,
  },
  readingList: { gap: 6 },
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  readingRowBest: {
    backgroundColor: "rgba(119,90,25,0.06)",
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.18)",
  },
  readingDot: { width: 7, height: 7, borderRadius: 4 },
  readingDist: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    color: "#00113a",
    flex: 1,
  },
  readingAcc: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  bestBadge: {
    backgroundColor: "#775a19",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    letterSpacing: 1,
    color: "#ffffff",
  },

  coordRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  coordIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  coordText: { flex: 1 },
  coordLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
    marginBottom: 3,
  },
  coordValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: "#00113a",
  },
  coordDivider: {
    height: 1,
    backgroundColor: "rgba(197,198,210,0.2)",
    marginVertical: 12,
  },

  tipsCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "rgba(119,90,25,0.04)",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 2,
    borderLeftColor: "#775a19",
    gap: 8,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  tipsTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: "#775a19",
    letterSpacing: 0.4,
  },
  tipsText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    lineHeight: 19,
  },

  // ── Actions ──
  actionSection: { marginHorizontal: 16, marginTop: 20, gap: 10 },

  collectingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#775a19",
    borderRadius: 12,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#775a19",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },
  collectingBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    color: "#ffffff",
  },

  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#002366",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  markBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    color: "#ffffff",
  },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,35,102,0.18)",
  },
  retryBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    color: "#002366",
  },

  btnDisabled: { opacity: 0.45 },

  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelBtnText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
    textDecorationLine: "underline",
  },
});