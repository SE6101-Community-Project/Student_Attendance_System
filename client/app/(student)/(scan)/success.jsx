import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  ScrollView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import useScanStore from "../../../src/store/useScanStore";

export default function SuccessScreen() {
  const params = useLocalSearchParams();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { clearScanData } = useScanStore();

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    setTimeout(() => {
      clearScanData();
    }, 500);
  }, [clearScanData]);

  const isLate = params.isLate === "true" || params.isLate === true;

  const formatTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(student)/(tabs)/dashboard")}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#00113a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Verified</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ── Success Icon ── */}
        <Animated.View
          style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={[styles.ring, styles.ring2, isLate && styles.ringLate]} />
          <View style={[styles.ring, styles.ring1, isLate && styles.ringLate]} />
          <View style={[styles.iconOuter, isLate && styles.iconOuterLate]}>
            <View style={[styles.iconInner, isLate && styles.iconInnerLate]}>
              <MaterialCommunityIcons
                name={isLate ? "clock-check" : "check"}
                size={48}
                color="#ffffff"
              />
            </View>
          </View>
        </Animated.View>

        {/* ── Title ── */}
        <Text style={styles.successTitle}>
          {isLate ? "Marked as Late" : "Attendance Marked!"}
        </Text>
        <Text style={styles.successSub}>
          Your presence has been digitally recorded and encrypted in the
          university&apos;s archival system.
        </Text>

        {/* ── Archival label ── */}
        <Animated.View
          style={[
            styles.archivalRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.archivalAccent} />
          <Text style={styles.archivalLabel}>CLASS REGISTRY ENTRY</Text>
        </Animated.View>

        {/* ── Details card ── */}
        <Animated.View
          style={[
            styles.detailCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Subject header */}
          <View style={styles.detailHeader}>
            <Text style={styles.detailSubjectLabel}>SUBJECT</Text>
            <Text style={styles.detailSubjectName}>{params.courseName}</Text>
          </View>

          <View style={styles.divider} />

          {/* Meta details */}
          <View style={styles.detailMetaList}>
            <View style={styles.detailMetaItem}>
              <View style={styles.detailMetaIcon}>
                <MaterialCommunityIcons
                  name="calendar-today"
                  size={16}
                  color="#758dd5"
                />
              </View>
              <View style={styles.detailMetaTextWrap}>
                <Text style={styles.detailMetaLabel}>DATE & TIME</Text>
                <Text style={styles.detailMetaValue}>
                  {formatTime(params.markedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.detailMetaItem}>
              <View style={styles.detailMetaIcon}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={16}
                  color="#758dd5"
                />
              </View>
              <View style={styles.detailMetaTextWrap}>
                <Text style={styles.detailMetaLabel}>LOCATION</Text>
                <Text style={styles.detailMetaValue}>{params.venue}</Text>
              </View>
            </View>

            {isLate && (
              <View style={styles.detailMetaItem}>
                <View style={[styles.detailMetaIcon, styles.detailMetaIconLate]}>
                  <MaterialCommunityIcons
                    name="clock-alert-outline"
                    size={16}
                    color="#F59E0B"
                  />
                </View>
                <View style={styles.detailMetaTextWrap}>
                  <Text style={styles.detailMetaLabel}>LATE BY</Text>
                  <Text style={[styles.detailMetaValue, styles.lateText]}>
                    {params.lateByMinutes} minutes
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Verification summary */}
          <View style={styles.verificationSection}>
            <Text style={styles.verificationTitle}>Verification Summary</Text>
            <View style={styles.verifyList}>
              <VerifyItem label="QR Code Verified" badge="SECURE" />
              <VerifyItem label="Face Identity Confirmed" badge="MATCHED" />
              <VerifyItem label="GPS Location Match" badge="VALID" />
            </View>
          </View>
        </Animated.View>

        {/* ── Attendance percentage ── */}
        {params.attendancePct !== undefined && (
          <Animated.View
            style={[
              styles.pctCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.pctIconWrap}>
              <MaterialCommunityIcons
                name="shield-check"
                size={28}
                color="#758dd5"
              />
            </View>
            <View style={styles.pctTextWrap}>
              <Text style={styles.pctLabel}>ATTENDANCE RATE</Text>
              <Text style={styles.pctValue}>
                {parseFloat(params.attendancePct).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.pctBarWrap}>
              <View style={styles.pctBarBg}>
                <View
                  style={[
                    styles.pctBarFill,
                    { width: `${Math.min(parseFloat(params.attendancePct), 100)}%` },
                  ]}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Action buttons ── */}
        <Animated.View
          style={[
            styles.actionRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/(student)/(tabs)/attendance")}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={16}
              color="#ffffff"
              style={styles.btnIcon}
            />
            <Text style={styles.primaryBtnText}>VIEW ATTENDANCE RECORDS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace("/(student)/(tabs)/dashboard")}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="view-dashboard-outline"
              size={16}
              color="#00113a"
              style={styles.btnIcon}
            />
            <Text style={styles.secondaryBtnText}>BACK TO DASHBOARD</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Verify item component ──
const VerifyItem = ({ label, badge }) => (
  <View style={styles.verifyItem}>
    <View style={styles.verifyCheck}>
      <MaterialCommunityIcons name="check" size={11} color="#4CAF50" />
    </View>
    <Text style={styles.verifyLabel}>{label}</Text>
    <View style={styles.verifyBadge}>
      <Text style={styles.verifyBadgeText}>{badge}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,17,58,0.06)",
    ...Platform.select({
      ios: {
        shadowColor: "#00113a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
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
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
    color: "#00113a",
  },
  headerSpacer: {
    width: 36,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },

  // ── Icon ──
  iconWrap: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  iconOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(76,175,80,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconOuterLate: {
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#4CAF50",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconInnerLate: {
    backgroundColor: "#F59E0B",
    ...Platform.select({
      ios: {
        shadowColor: "#F59E0B",
      },
    }),
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(76,175,80,0.15)",
  },
  ringLate: {
    borderColor: "rgba(245,158,11,0.15)",
  },
  ring1: {
    width: 132,
    height: 132,
  },
  ring2: {
    width: 160,
    height: 160,
    borderWidth: 1,
    opacity: 0.5,
  },

  // ── Title ──
  successTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 28,
    color: "#00113a",
    textAlign: "center",
    marginBottom: 8,
  },
  successSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 20,
    marginBottom: 28,
  },

  // ── Archival ──
  archivalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  archivalAccent: {
    width: 2,
    height: 20,
    backgroundColor: "#775a19",
    borderRadius: 1,
  },
  archivalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
  },

  // ── Detail card ──
  detailCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#00113a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.12)",
  },
  detailHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  detailSubjectLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#775a19",
    marginBottom: 6,
  },
  detailSubjectName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
    lineHeight: 28,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(197,198,210,0.15)",
    marginHorizontal: 20,
  },
  detailMetaList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  detailMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailMetaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,35,102,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailMetaIconLate: {
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  detailMetaTextWrap: {
    flex: 1,
  },
  detailMetaLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
    marginBottom: 3,
  },
  detailMetaValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
    lineHeight: 18,
  },
  lateText: {
    color: "#D97706",
  },

  // ── Verification ──
  verificationSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(0,35,102,0.02)",
  },
  verificationTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 16,
    fontWeight: 'bold',
    color: "#00113a",
    marginBottom: 14,
  },
  verifyList: {
    gap: 10,
  },
  verifyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verifyCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(76,175,80,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  verifyLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#555666",
    flex: 1,
  },
  verifyBadge: {
    backgroundColor: "rgba(76,175,80,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  verifyBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: "#4CAF50",
  },

  // ── Percentage card ──
  pctCard: {
    width: "100%",
    backgroundColor: "#002366",
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#002366",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pctIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  pctTextWrap: {
    flex: 1,
    minWidth: 120,
  },
  pctLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 4,
  },
  pctValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 28,
    color: "#ffffff",
    lineHeight: 32,
  },
  pctBarWrap: {
    width: "100%",
  },
  pctBarBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  pctBarFill: {
    height: "100%",
    backgroundColor: "#758dd5",
    borderRadius: 2,
  },

  // ── Actions ──
  actionRow: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#002366",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#002366",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    color: "#ffffff",
  },
  secondaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.35)",
  },
  secondaryBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    color: "#00113a",
  },
  btnIcon: {
    marginRight: 8,
  },
});