import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Alert,
  RefreshControl,
  InteractionManager,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import api from "@/src/api/axiosInstance";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "../../src/components/LoadingScreen";

const getAttendanceColor = (pct) => {
  if (pct >= 80) return "#4CAF50";
  if (pct >= 60) return "#F59E0B";
  return "#ba1a1a";
};

const getStanding = (pct) => {
  if (pct >= 80) return "Distinguished";
  if (pct >= 60) return "Satisfactory";
  return "At Risk";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};


const InfoRow = memo(function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowIcon}>
        <MaterialCommunityIcons name={icon} size={16} color="#757682" />
      </View>
      <View style={styles.infoRowContent}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text
          style={[
            styles.infoRowValue,
            valueColor ? { color: valueColor } : null,
          ]}
        >
          {value || "—"}
        </Text>
      </View>
    </View>
  );
});

const StatChip = memo(function StatChip({ label, value, color, icon }) {
  return (
    <View style={[styles.statChip, { borderTopColor: color }]}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[styles.statChipValue, { color }]}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
});

// ── Fixed: danger was being spread as a style — now a boolean ──
const MenuItem = memo(function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, danger && styles.menuItemDanger]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[styles.menuItemIcon, danger && styles.menuItemIconDanger]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={danger ? "#ba1a1a" : "#00113a"}
        />
      </View>
      <View style={styles.menuItemText}>
        <Text
          style={[
            styles.menuItemTitle,
            danger && styles.menuItemTitleDanger,
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.menuItemSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={18}
        color={danger ? "rgba(186,26,26,0.3)" : "#c5c6d2"}
      />
    </TouchableOpacity>
  );
});

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [faceDataRegistered, setFaceDataRegistered] = useState(
    user?.faceDataRegistered ?? false,
  );

  // Attendance stats — grouped into a single state object
  // to avoid 5 separate re-renders when stats arrive
  const [stats, setStats] = useState({
    overallPct: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalSessions: 0,
    coursesAtRisk: 0,
    totalCourses: 0,
  });

  // ── Refs to prevent stale closure / duplicate fetches ──
  const isMountedRef = useRef(true);
  const updateUserRef = useRef(updateUser);

  // Keep ref in sync without adding updateUser to dep arrays
  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Phase 2: Attendance stats — runs after interactions settle
  // ─────────────────────────────────────────────────────────
  const fetchAttendanceStats = useCallback(async (courses) => {
    if (!courses?.length) return;

    try {
      const results = await Promise.all(
        courses.map((c) =>
          api
            .get(`/attendance/student/course/${c._id}`)
            .then((r) => (r.data.success ? r.data.data.statistics : null))
            .catch(() => null),
        ),
      );

      if (!isMountedRef.current) return;

      const validStats = results.filter(Boolean);
      if (!validStats.length) return;

      const totalPresent = validStats.reduce(
        (s, v) => s + (v.attended || 0),
        0,
      );
      const totalAbsent = validStats.reduce(
        (s, v) => s + (v.absent || 0),
        0,
      );
      const totalSessions = validStats.reduce(
        (s, v) => s + (v.totalSessions || 0),
        0,
      );
      const overallPct = Math.round(
        validStats.reduce((s, v) => s + (v.percentage || 0), 0) /
          validStats.length,
      );
      const coursesAtRisk = validStats.filter(
        (v) => (v.percentage || 0) < 75,
      ).length;

      // Single state update — one re-render instead of five
      setStats((prev) => ({
        ...prev,
        totalPresent,
        totalAbsent,
        totalSessions,
        overallPct,
        coursesAtRisk,
      }));
    } catch (err) {
      console.warn("[Profile] fetchAttendanceStats:", err.message);
    }
  }, []); // no deps — uses only API calls and setStats

  // ─────────────────────────────────────────────────────────
  // Phase 1: Critical data — profile + face status
  // Attendance stats are deferred until after interactions
  // ─────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      // Run profile + face status in parallel
      const [profileRes, coursesRes, faceRes] = await Promise.all([
        api.get("/student/profile"),
        api.get("/course/my-enrolled"),
        api.get("/face/status").catch(() => ({ data: { success: false } })),
      ]);

      if (!isMountedRef.current) return;

      if (profileRes.data.success) {
        const p = profileRes.data.data;
        setProfile(p);
        // Use ref to avoid adding updateUser to dep array
        updateUserRef.current?.(p);
      }

      if (coursesRes.data.success) {
        const courses = coursesRes.data.data || [];

        setStats((prev) => ({
          ...prev,
          totalCourses: courses.length,
        }));

        // Defer heavy attendance fetching until after
        // the screen has finished rendering (interactions settled)
        InteractionManager.runAfterInteractions(() => {
          if (isMountedRef.current) {
            fetchAttendanceStats(courses);
          }
        });
      }

      const faceStatus = faceRes.data.success
        ? (faceRes.data.data?.faceDataRegistered ?? false)
        : (user?.faceDataRegistered ?? false);

      setFaceDataRegistered(faceStatus);
    } catch (err) {
      console.warn("[Profile] fetchProfile:", err.message);
    } finally {
      if (isMountedRef.current) 
        setLoading(false);
    }
  }, [fetchAttendanceStats, user?.faceDataRegistered]);
  // updateUser intentionally excluded — using ref instead

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "End Session",
      "Are you sure you want to logout from this device?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout },
      ],
    );
  }, [logout]);

  // ── Navigation handlers — stable references ──
  const goEditProfile = useCallback(
    () => router.push("/(student)/(profile)/edit-profile"),
    [],
  );
  const goChangePassword = useCallback(
    () => router.push("/(student)/(profile)/change-password"),
    [],
  );
  const goSettings = useCallback(
    () => router.push("/(student)/(tabs)/settings"),
    [],
  );
  const goFaceRegister = useCallback(
    () => router.push("/(student)/(profile)/face-register"),
    [],
  );

  // ── Derived values — only recomputed when stats change ──
  const attendanceColor = useMemo(
    () => getAttendanceColor(stats.overallPct),
    [stats.overallPct],
  );
  const standing = useMemo(
    () => getStanding(stats.overallPct),
    [stats.overallPct],
  );
  const isEligible = stats.overallPct >= 75;

  // ── Resolved profile — prefer fresh API data over cached auth ──
  const p = profile ?? user;

  // ── Loading ──
  if (loading) {
    return (
      <LoadingScreen message="Loading profile..." />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Academic Curator</Text>
        <TouchableOpacity
          onPress={goSettings}
          style={styles.headerSettingsBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={22}
            color="#757682"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#775a19"
          />
        }
      >
        {/* ── Profile Hero ── */}
        <View style={styles.profileHero}>
          <View style={styles.avatarWrap}>
            {p?.profileImage ? (
              <Image
                source={{ uri: p.profileImage }}
                style={styles.avatar}
                // Cache the image — avoids re-download on re-render
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {p?.name?.charAt(0)?.toUpperCase() || "S"}
                </Text>
              </View>
            )}
            {p?.isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons
                  name="check"
                  size={10}
                  color="#ffffff"
                />
              </View>
            )}
          </View>

          <View style={styles.profileNameBlock}>
            <View style={styles.archivalRow}>
              <View style={styles.archivalAccent} />
              <Text style={styles.archivalLabel}>SCHOLAR PROFILE</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={2}>
              {p?.name || "Student"}
            </Text>
            <Text style={styles.profileStudentId}>{p?.studentId}</Text>
            <View style={styles.profileBadgeRow}>
              <View style={styles.batchBadge}>
                <Text style={styles.batchBadgeText}>Batch {p?.batch}</Text>
              </View>
              {p?.isVerified ? (
                <View style={styles.verifiedPill}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={11}
                    color="#4CAF50"
                  />
                  <Text style={styles.verifiedPillText}>Verified</Text>
                </View>
              ) : (
                <View style={styles.unverifiedPill}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={11}
                    color="#F59E0B"
                  />
                  <Text style={styles.unverifiedPillText}>Unverified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Account Info Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <InfoRow icon="email-outline" label="Email" value={p?.email} />
          <InfoRow icon="phone-outline" label="Mobile" value={p?.mobile} />
          <InfoRow
            icon="domain"
            label="Department"
            value={p?.department}
          />
          <InfoRow
            icon="school-outline"
            label="Batch"
            value={p?.batch}
          />
          <InfoRow
            icon="shield-check-outline"
            label="Account Status"
            value={p?.isActive ? "Active" : "Inactive"}
            valueColor={p?.isActive ? "#4CAF50" : "#ba1a1a"}
          />
          <InfoRow
            icon="email-check-outline"
            label="Email Verified"
            value={
              p?.isVerified
                ? "Verified"
                : "Not verified — check your email"
            }
            valueColor={p?.isVerified ? "#4CAF50" : "#F59E0B"}
          />
        </View>

        {/* ── Attendance Overview Card ── */}
        <View
          style={[
            styles.card,
            { borderTopWidth: 3, borderTopColor: attendanceColor },
          ]}
        >
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Attendance Overview</Text>
            <View
              style={[
                styles.standingBadge,
                { backgroundColor: `${attendanceColor}12` },
              ]}
            >
              <Text
                style={[
                  styles.standingBadgeText,
                  { color: attendanceColor },
                ]}
              >
                {standing}
              </Text>
            </View>
          </View>

          <View style={styles.attendanceBigPct}>
            <Text
              style={[
                styles.attendancePctValue,
                { color: attendanceColor },
              ]}
            >
              {stats.overallPct}%
            </Text>
            <Text style={styles.attendancePctSub}>
              {stats.totalPresent} of {stats.totalSessions} sessions
              attended
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(stats.overallPct, 100)}%`,
                  backgroundColor: attendanceColor,
                },
              ]}
            />
            <View
              style={[styles.thresholdMarker, { left: "75%" }]}
            />
          </View>
          <Text style={styles.progressBarHint}>
            Minimum required: 75%
          </Text>

          <View style={styles.statChipsRow}>
            <StatChip
              label="Present"
              value={stats.totalPresent}
              color="#4CAF50"
              icon="check-circle-outline"
            />
            <StatChip
              label="Absent"
              value={stats.totalAbsent}
              color={stats.totalAbsent > 0 ? "#ba1a1a" : "#757682"}
              icon="close-circle-outline"
            />
            <StatChip
              label="Courses"
              value={stats.totalCourses}
              color="#002366"
              icon="book-open-variant"
            />
            <StatChip
              label="At Risk"
              value={stats.coursesAtRisk}
              color={
                stats.coursesAtRisk > 0 ? "#ba1a1a" : "#4CAF50"
              }
              icon={
                stats.coursesAtRisk > 0
                  ? "alert-circle-outline"
                  : "shield-check-outline"
              }
            />
          </View>
        </View>

        {/* ── Progress Note ── */}
        <View style={styles.progressNote}>
          <MaterialCommunityIcons
            name={
              isEligible ? "trophy-outline" : "alert-circle-outline"
            }
            size={22}
            color={isEligible ? "#e9c176" : "#ba1a1a"}
          />
          <View style={styles.progressNoteTextWrap}>
            <Text style={styles.progressNoteTitle}>
              {isEligible ? "On Track" : "Attention Required"}
            </Text>
            <Text style={styles.progressNoteText}>
              {isEligible
                ? `Your ${stats.overallPct}% attendance keeps you eligible. Maintain consistency for honours consideration.`
                : `Your attendance is below the 75% threshold. ${
                    stats.coursesAtRisk > 0
                      ? `${stats.coursesAtRisk} course${
                          stats.coursesAtRisk > 1 ? "s" : ""
                        } at risk.`
                      : ""
                  } Attend more sessions to remain eligible.`}
            </Text>
          </View>
        </View>

        {/* ── Face Data Card ── */}
        <View
          style={[
            styles.card,
            {
              borderLeftWidth: 3,
              borderLeftColor: faceDataRegistered
                ? "#4CAF50"
                : "#ba1a1a",
            },
          ]}
        >
          <View style={styles.faceDataRow}>
            <View
              style={[
                styles.faceDataIcon,
                {
                  backgroundColor: faceDataRegistered
                    ? "rgba(76,175,80,0.1)"
                    : "rgba(186,26,26,0.08)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="face-recognition"
                size={26}
                color={faceDataRegistered ? "#4CAF50" : "#ba1a1a"}
              />
            </View>
            <View style={styles.faceDataInfo}>
              <Text style={styles.faceDataTitle}>Face Recognition</Text>
              <Text
                style={[
                  styles.faceDataSub,
                  {
                    color: faceDataRegistered ? "#4CAF50" : "#ba1a1a",
                  },
                ]}
              >
                {faceDataRegistered
                  ? "Face data registered successfully"
                  : "Face data not registered — required for attendance"}
              </Text>
            </View>
            {faceDataRegistered ? (
              <MaterialCommunityIcons
                name="check-circle"
                size={22}
                color="#4CAF50"
              />
            ) : (
              <TouchableOpacity
                style={styles.registerFaceBtn}
                onPress={goFaceRegister}
                activeOpacity={0.8}
              >
                <Text style={styles.registerFaceBtnText}>REGISTER</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Section Divider ── */}
        <View style={styles.sectionDivider}>
          <View style={styles.sectionDividerLine} />
          <Text style={styles.sectionDividerText}>ACCOUNT OPTIONS</Text>
          <View style={styles.sectionDividerLine} />
        </View>

        {/* ── Menu ── */}
        <View style={styles.menuList}>
          <MenuItem
            icon="account-edit-outline"
            title="Edit Profile"
            subtitle="Update name, mobile, profile photo"
            onPress={goEditProfile}
          />
          <MenuItem
            icon="lock-outline"
            title="Change Password"
            subtitle="Update your account password"
            onPress={goChangePassword}
          />
          <MenuItem
            icon="tune"
            title="App Settings"
            subtitle="Notifications, biometric, session"
            onPress={goSettings}
          />
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <View style={styles.logoutBtnInner}>
            <View style={styles.logoutIconWrap}>
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color="#ba1a1a"
              />
            </View>
            <View style={styles.logoutTextWrap}>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.logoutSub}>
                End current session on this device
              </Text>
            </View>
          </View>
          <View style={styles.logoutArrow}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color="#ba1a1a"
            />
          </View>
        </TouchableOpacity>

        {/* ── Footer info ── */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerInfoText}>
            Student ID: {p?.studentId}
          </Text>
          <Text style={styles.footerInfoText}>
            Member since {formatDate(p?.createdAt)}
          </Text>
        </View>

        <Text style={styles.footerText}>
          © SABARAGAMUWA UNIVERSITY OF SRI LANKA
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════
// STYLES — defined once at module level, never recreated
// ══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.2)",
  },
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
    color: "#00113a",
  },
  headerSettingsBtn: { padding: 4 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
    gap: 16,
  },

  // ── Profile Hero ──
  profileHero: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 18,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#002366",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  avatarFallbackText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 32,
    color: "#ffffff",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#775a19",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  profileNameBlock: { flex: 1, gap: 4 },
  archivalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  archivalAccent: { width: 2, height: 14, backgroundColor: "#775a19" },
  archivalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2.5,
    color: "#775a19",
  },
  profileName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
    color: "#00113a",
    lineHeight: 30,
  },
  profileStudentId: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
    textTransform: "uppercase",
  },
  profileBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  batchBadge: {
    backgroundColor: "rgba(0,35,102,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  batchBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#002366",
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(76,175,80,0.1)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedPillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 0.5,
    color: "#4CAF50",
  },
  unverifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unverifiedPillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 0.5,
    color: "#F59E0B",
  },

  // ── Cards ──
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    color: "#00113a",
  },

  // ── Info Row ──
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.1)",
  },
  infoRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  infoRowContent: { flex: 1 },
  infoRowLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#757682",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  infoRowValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
  },

  // ── Attendance ──
  standingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  standingBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
  },
  attendanceBigPct: {
    alignItems: "center",
    paddingVertical: 8,
  },
  attendancePctValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 52,
    lineHeight: 56,
  },
  attendancePctSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
    marginTop: 4,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#f3f3f3",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  progressBarFill: { height: "100%", borderRadius: 4 },
  thresholdMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  progressBarHint: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
    textAlign: "right",
  },
  statChipsRow: { flexDirection: "row", gap: 8 },
  statChip: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    gap: 3,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.15)",
  },
  statChipValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
  },
  statChipLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    letterSpacing: 1,
    color: "#757682",
    textTransform: "uppercase",
  },

  // ── Progress Note ──
  progressNote: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    backgroundColor: "#00113a",
    borderRadius: 14,
    padding: 18,
  },
  progressNoteTextWrap: { flex: 1 },
  progressNoteTitle: {
    fontFamily: "Newsreader_400Regular",
    fontStyle: "italic",
    fontSize: 18,
    color: "#ffffff",
    marginBottom: 4,
  },
  progressNoteText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
  },

  // ── Face Data ──
  faceDataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  faceDataIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  faceDataInfo: { flex: 1 },
  faceDataTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#00113a",
    marginBottom: 3,
  },
  faceDataSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  registerFaceBtn: {
    backgroundColor: "#002366",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexShrink: 0,
  },
  registerFaceBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#ffffff",
  },

  // ── Section Divider ──
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(197,198,210,0.3)",
  },
  sectionDividerText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2.5,
    color: "#757682",
  },

  // ── Menu ──
  menuList: { gap: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItemDanger: {
    backgroundColor: "rgba(186,26,26,0.04)",
    borderColor: "rgba(186,26,26,0.15)",
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  menuItemIconDanger: {
    backgroundColor: "rgba(186,26,26,0.08)",
  },
  menuItemText: { flex: 1 },
  menuItemTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#00113a",
    marginBottom: 2,
  },
  menuItemTitleDanger: { color: "#ba1a1a" },
  menuItemSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },

  // ── Logout ──
  logoutBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(186,26,26,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#ba1a1a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  logoutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(186,26,26,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(186,26,26,0.12)",
  },
  logoutTextWrap: { flex: 1 },
  logoutTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    color: "#ba1a1a",
    marginBottom: 2,
  },
  logoutSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "rgba(186,26,26,0.6)",
  },
  logoutArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(186,26,26,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Footer ──
  footerInfo: {
    gap: 4,
    alignItems: "center",
    paddingTop: 4,
  },
  footerInfoText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#a0a1ad",
    letterSpacing: 0.5,
  },
  footerText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 7,
    letterSpacing: 3,
    color: "#757682",
    textAlign: "center",
    opacity: 0.3,
    position: "absolute",
    bottom: 18,
    left: 20,
    right: 20,
  },
});