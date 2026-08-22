import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "@/src/api/axiosInstance";

// ── Helpers ──
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
};

const formatMarkedAt = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d)
    ? "—"
    : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

// ══════════════════════════════════════════════════════════
export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams();

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("present");

  const fadeIn = useRef(new Animated.Value(0)).current;

  // ── Fetch session attendance ──
  const fetchSessionData = useCallback(async () => {
    try {
      const res = await api.get(`/attendance/session/${sessionId}`);
      if (res.data.success) {
        setSessionData(res.data.data);
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    } catch (err) {
      console.log("fetchSessionData:", err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // ── Auto-refresh every 15s if session is active ──
  useEffect(() => {
    if (!sessionData) return;
    const isLive =
      !sessionData.session?.isClosed && sessionData.session?.isActive;
    if (!isLive) return;

    const interval = setInterval(() => {
      fetchSessionData();
    }, 15000);

    return () => clearInterval(interval);
  }, [sessionData, fetchSessionData]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchSessionData();
    } finally {
      setRefreshing(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#775a19" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  if (!sessionData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={52}
            color="#c5c6d2"
          />
          <Text style={styles.errorTitle}>Session Not Found</Text>
          <TouchableOpacity
            style={styles.errorBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { session, summary, presentStudents, absentStudents, isSessionLive } =
    sessionData;

  const displayList =
    activeTab === "present" ? presentStudents : absentStudents;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color="#00113a"
          />
          <Text style={styles.backBtnText}>Sessions</Text>
        </TouchableOpacity>

        {isSessionLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#775a19"
          />
        }
      >
        <Animated.View style={{ opacity: fadeIn }}>
          {/* ── Session Info Card ── */}
          <View style={styles.sessionInfoCard}>
            <View style={styles.sessionInfoTop}>
              <View style={styles.courseCodeBadge}>
                <Text style={styles.courseCodeText}>
                  {session.courseCode || "N/A"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isSessionLive
                      ? "rgba(76,175,80,0.15)"
                      : "rgba(255,255,255,0.1)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: isSessionLive
                        ? "#4CAF50"
                        : "rgba(255,255,255,0.6)",
                    },
                  ]}
                >
                  {isSessionLive ? "ACTIVE" : "CLOSED"}
                </Text>
              </View>
            </View>

            <Text style={styles.courseName} numberOfLines={2}>
              {session.courseName || "—"}
            </Text>

            <View style={styles.sessionDivider} />

            <View style={styles.lectureRow}>
              <View style={styles.lectureNumBadge}>
                <Text style={styles.lectureNumText}>
                  LECTURE #{session.lectureNumber}
                </Text>
              </View>
            </View>
            <Text style={styles.sessionTitle}>
              {session.lectureTitle || "Untitled Lecture"}
            </Text>

            <View style={styles.sessionMetaList}>
              <SessionMetaRow
                icon="calendar-outline"
                text={formatDate(session.date)}
              />
              <SessionMetaRow
                icon="map-marker-outline"
                text={session.venue || "TBA"}
              />
              {isSessionLive && (
                <SessionMetaRow
                  icon="refresh"
                  text="Auto-refreshes every 15 seconds"
                  color="#e9c176"
                />
              )}
            </View>
          </View>

          {/* ── Summary Stats ── */}
          <View style={styles.summaryGrid}>
            <SummaryCard
              label="ENROLLED"
              value={summary.totalEnrolled}
              color="#00113a"
              borderColor="#00113a"
            />
            <SummaryCard
              label="PRESENT"
              value={summary.totalPresent}
              color="#4CAF50"
              borderColor="#4CAF50"
            />
            <SummaryCard
              label="LATE"
              value={summary.totalLate}
              color="#F59E0B"
              borderColor="#F59E0B"
            />
            <SummaryCard
              label={isSessionLive ? "PENDING" : "ABSENT"}
              value={
                isSessionLive
                  ? summary.totalEnrolled -
                    summary.totalPresent -
                    summary.totalLate
                  : summary.totalAbsent
              }
              color={isSessionLive ? "#757682" : "#ba1a1a"}
              borderColor={isSessionLive ? "#c5c6d2" : "#ba1a1a"}
            />
          </View>

          {isSessionLive && (
            <View style={styles.liveInfoBanner}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color="#775a19"
              />
              <Text style={styles.liveInfoText}>
                Session is in progress. Absent list will be available once the
                session is closed.
              </Text>
            </View>
          )}

          {/* ── Attendance Rate Bar ── */}
          <View style={styles.rateCard}>
            <View style={styles.rateCardHeader}>
              <View>
                <Text style={styles.rateLabel}>ATTENDANCE RATE</Text>
                <Text style={styles.rateCourseSub}>
                  {session.courseCode} · Lecture #{session.lectureNumber}
                </Text>
              </View>
              <Text
                style={[
                  styles.rateValue,
                  {
                    color:
                      parseFloat(summary.attendanceRate) >= 80
                        ? "#4CAF50"
                        : parseFloat(summary.attendanceRate) >= 60
                          ? "#F59E0B"
                          : "#ba1a1a",
                  },
                ]}
              >
                {Math.round(parseFloat(summary.attendanceRate))}%
              </Text>
            </View>
            <View style={styles.rateTrack}>
              <View
                style={[
                  styles.rateFill,
                  {
                    width: `${Math.min(
                      100,
                      parseFloat(summary.attendanceRate),
                    )}%`,
                    backgroundColor:
                      parseFloat(summary.attendanceRate) >= 80
                        ? "#4CAF50"
                        : parseFloat(summary.attendanceRate) >= 60
                          ? "#F59E0B"
                          : "#ba1a1a",
                  },
                ]}
              />
            </View>
            <Text style={styles.rateSub}>
              {summary.totalPresent + summary.totalLate} of{" "}
              {summary.totalEnrolled} students attended
            </Text>
          </View>

          {/* ── Tab Selector ── */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "present" && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab("present")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={15}
                color={activeTab === "present" ? "#ffffff" : "#757682"}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "present" && styles.tabBtnTextActive,
                ]}
              >
                PRESENT ({summary.totalPresent + summary.totalLate})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "absent" && styles.tabBtnAbsentActive,
                isSessionLive && styles.tabBtnDisabled,
              ]}
              onPress={() => {
                if (!isSessionLive) setActiveTab("absent");
              }}
              activeOpacity={isSessionLive ? 1 : 0.7}
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={15}
                color={
                  isSessionLive
                    ? "#c5c6d2"
                    : activeTab === "absent"
                      ? "#ffffff"
                      : "#757682"
                }
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === "absent" &&
                    !isSessionLive &&
                    styles.tabBtnTextActive,
                  isSessionLive && { color: "#c5c6d2" },
                ]}
              >
                {isSessionLive
                  ? "ABSENT (Session Active)"
                  : `ABSENT (${summary.totalAbsent})`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Student List ── */}
          {isSessionLive && activeTab === "absent" ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={48}
                color="#c5c6d2"
              />
              <Text style={styles.emptyTitle}>Session In Progress</Text>
              <Text style={styles.emptyText}>
                Absent students will be shown after the session is closed
              </Text>
            </View>
          ) : displayList.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name={
                  activeTab === "present"
                    ? "account-check-outline"
                    : "account-off-outline"
                }
                size={48}
                color="#c5c6d2"
              />
              <Text style={styles.emptyTitle}>
                {activeTab === "present"
                  ? "No students present yet"
                  : "All students present!"}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === "present" && isSessionLive
                  ? "Students will appear as they scan the QR code"
                  : ""}
              </Text>
            </View>
          ) : (
            <View style={styles.studentList}>
              <Text style={styles.listCount}>
                {displayList.length} STUDENT
                {displayList.length !== 1 ? "S" : ""}
              </Text>
              {displayList.map((item, idx) =>
                activeTab === "present" ? (
                  <PresentStudentRow key={item._id || idx} record={item} />
                ) : (
                  <AbsentStudentRow key={item._id || idx} student={item} />
                ),
              )}
            </View>
          )}

          <Text style={styles.footerText}>
            © SABARAGAMUWA UNIVERSITY OF SRI LANKA
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

const SessionMetaRow = ({ icon, text, color = "rgba(255,255,255,0.6)" }) => (
  <View style={styles.sessionMetaRow}>
    <MaterialCommunityIcons name={icon} size={14} color={color} />
    <Text style={[styles.sessionMetaText, { color }]}>{text}</Text>
  </View>
);

const SummaryCard = ({ label, value, color, borderColor }) => (
  <View style={[styles.summaryCard, { borderTopColor: borderColor }]}>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const PresentStudentRow = ({ record }) => {
  const student = record.student || record;
  const isLate = record.isLate;
  const status = record.status || (isLate ? "late" : "present");

  return (
    <View style={styles.studentRow}>
      {student.profileImage ? (
        <Image
          source={{ uri: student.profileImage }}
          style={styles.studentAvatar}
        />
      ) : (
        <View style={styles.studentAvatarFallback}>
          <Text style={styles.studentAvatarText}>
            {student.name?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
      )}

      <View style={styles.studentInfo}>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name || "—"}
        </Text>
        <Text style={styles.studentId}>{student.studentId || "—"}</Text>
        {student.batch && (
          <Text style={styles.studentBatch}>Batch {student.batch}</Text>
        )}
      </View>

      <View style={styles.studentRight}>
        <View
          style={[
            styles.studentStatusBadge,
            {
              backgroundColor:
                status === "late"
                  ? "rgba(245,158,11,0.1)"
                  : "rgba(76,175,80,0.1)",
            },
          ]}
        >
          <Text
            style={[
              styles.studentStatusText,
              { color: status === "late" ? "#F59E0B" : "#4CAF50" },
            ]}
          >
            {status === "late" ? "LATE" : "PRESENT"}
          </Text>
        </View>
        <Text style={styles.markedAtText}>
          {formatMarkedAt(record.markedAt)}
        </Text>
        {isLate && record.lateByMinutes > 0 && (
          <Text style={styles.lateMinText}>+{record.lateByMinutes}m late</Text>
        )}
      </View>
    </View>
  );
};

const AbsentStudentRow = ({ student }) => (
  <View style={[styles.studentRow, styles.studentRowAbsent]}>
    <View style={[styles.studentAvatarFallback, styles.studentAvatarAbsent]}>
      <Text style={[styles.studentAvatarText, { color: "#ba1a1a" }]}>
        {student.name?.charAt(0)?.toUpperCase() || "?"}
      </Text>
    </View>

    <View style={styles.studentInfo}>
      <Text style={styles.studentName} numberOfLines={1}>
        {student.name || "—"}
      </Text>
      <Text style={styles.studentId}>{student.studentId || "—"}</Text>
      {student.email && (
        <Text style={styles.studentBatch}>{student.email}</Text>
      )}
    </View>

    <View style={styles.absentBadge}>
      <Text style={styles.absentBadgeText}>ABSENT</Text>
    </View>
  </View>
);

// ══════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 40,
  },
  errorTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
  },
  errorBtn: {
    backgroundColor: "#00113a",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    color: "#ffffff",
    letterSpacing: 1,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.2)",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtnText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(76,175,80,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
  },
  liveText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#4CAF50",
  },

  scrollContent: { paddingBottom: 100 },

  // ── Session info card ──
  sessionInfoCard: {
    backgroundColor: "#00113a",
    margin: 20,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  sessionInfoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseCodeBadge: {
    backgroundColor: "rgba(119,90,25,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  courseCodeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#e9c176",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
  },
  courseName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#ffffff",
    lineHeight: 28,
  },
  sessionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
  },
  lectureRow: { flexDirection: "row", alignItems: "center" },
  lectureNumBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lectureNumText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.6)",
  },
  sessionTitle: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 22,
  },
  sessionMetaList: { gap: 6, marginTop: 4 },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionMetaText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
  },

  // ── Summary grid ──
  summaryGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
  },
  summaryLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    letterSpacing: 1.5,
    color: "#757682",
    marginTop: 2,
  },

  // ✅ Live info banner
  liveInfoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: "rgba(119,90,25,0.06)",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#775a19",
  },
  liveInfoText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#444650",
    flex: 1,
    lineHeight: 18,
  },

  // ── Rate card ──
  rateCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  rateCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rateLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
  },
  rateCourseSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#775a19",
    marginTop: 2,
  },
  rateValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 28,
  },
  rateTrack: {
    height: 8,
    backgroundColor: "#f3f3f3",
    borderRadius: 4,
    overflow: "hidden",
  },
  rateFill: { height: "100%", borderRadius: 4 },
  rateSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },

  // ── Tab row ──
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: "#00113a" },
  tabBtnAbsentActive: { backgroundColor: "#ba1a1a" },
  // ✅ Disabled style for absent tab while live
  tabBtnDisabled: { opacity: 0.4 },
  tabBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
  },
  tabBtnTextActive: { color: "#ffffff" },

  // ── Student list ──
  studentList: { paddingHorizontal: 20, gap: 8 },
  listCount: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
    marginBottom: 4,
  },

  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  studentRowAbsent: {
    backgroundColor: "rgba(186,26,26,0.02)",
    borderColor: "rgba(186,26,26,0.1)",
  },

  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(0,35,102,0.1)",
  },
  studentAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,17,58,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  studentAvatarAbsent: { backgroundColor: "rgba(186,26,26,0.08)" },
  studentAvatarText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    color: "#00113a",
  },

  studentInfo: { flex: 1 },
  studentName: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    color: "#00113a",
    marginBottom: 2,
  },
  studentId: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#775a19",
    marginBottom: 1,
  },
  studentBatch: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },

  studentRight: { alignItems: "flex-end", gap: 3 },
  studentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  studentStatusText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },
  markedAtText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  lateMinText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 9,
    color: "#F59E0B",
  },

  absentBadge: {
    backgroundColor: "rgba(186,26,26,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  absentBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: "#ba1a1a",
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
    color: "#00113a",
  },
  emptyText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  footerText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 7,
    letterSpacing: 3,
    color: "#757682",
    textAlign: "center",
    opacity: 0.3,
    marginTop: 24,
  },
});