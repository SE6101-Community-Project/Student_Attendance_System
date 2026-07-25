import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "@/src/api/axiosInstance";
import LoadingScreen from "../../../src/components/LoadingScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Helpers ──
const getAttendanceColor = (rate) => {
  const r = parseFloat(rate);
  if (r >= 80) return "#4CAF50";
  if (r >= 60) return "#F59E0B";
  return "#ba1a1a";
};

const getStanding = (rate) => {
  const r = parseFloat(rate);
  if (r >= 80) 
    return "Distinguished";
  if (r >= 60) 
    return "Satisfactory";
  return "At Risk";
};

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseReport, setCourseReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "students" | "atrisk"

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseReport(selectedCourse._id);
      setActiveTab("overview");
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/course/my-courses");
      if (res.data.success) {
        const data = res.data.data || [];
        setCourses(data);
        if (data.length > 0) setSelectedCourse(data[0]);
      }
    } catch (err) {
      console.log("fetchCourses:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseReport = useCallback(async (courseId) => {
    try {
      setReportLoading(true);
      setCourseReport(null);
      const res = await api.get(`/attendance/report/course/${courseId}`);
      if (res.data.success) {
        setCourseReport(res.data.data);
      }
    } catch (err) {
      console.log("fetchCourseReport:", err.message);
      setCourseReport(null);
    } finally {
      setReportLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedCourse) {
      await fetchCourseReport(selectedCourse._id);
    } else {
      await fetchCourses();
    }
    setRefreshing(false);
  };

  // ── Derived data ──
  const atRiskStudents =
    courseReport?.studentReports?.filter(
      (r) => !r.statistics?.isEligible,
    ) || [];

  const eligibleStudents = courseReport?.studentReports?.filter(
      (r) => r.statistics?.isEligible,
    ) || [];

  // ── Bar chart data - top 8 students ──
  const chartData = courseReport?.studentReports
    ? courseReport.studentReports.slice(0, 8).map((r) => ({
        label: r.student?.name?.split(" ")[0] || "N/A",
        value: parseFloat(r.attendancePercentage || 0),
      }))
    : [];

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LoadingScreen
          message="Loading analytics..."
          submessage="Fetching courses and reports"
          variant="full"
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.archivalRow}>
            <View style={styles.archivalAccent} />
            <View>
              <Text style={styles.archivalLabel}>INSTITUTIONAL INSIGHTS</Text>
              <Text style={styles.archivalTitle}>Academic Analytics</Text>
            </View>
          </View>

          {/* Course Selector */}
          {courses.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.courseChips}
            >
              {courses.map((course) => (
                <TouchableOpacity
                  key={course._id}
                  style={[
                    styles.courseChip,
                    selectedCourse?._id === course._id &&
                      styles.courseChipActive,
                  ]}
                  onPress={() => setSelectedCourse(course)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.courseChipText,
                      selectedCourse?._id === course._id &&
                        styles.courseChipTextActive,
                    ]}
                  >
                    {course.courseCode}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── No Courses ── */}
        {courses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="chart-bar-stacked"
              size={52}
              color="#c5c6d2"
            />
            <Text style={styles.emptyTitle}>No Courses Assigned</Text>
            <Text style={styles.emptySubText}>
              Analytics will appear once you are assigned to courses
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#775a19"
              />
            }
          >
            {reportLoading ? (
              <View style={styles.reportLoading}>
                <ActivityIndicator size="large" color="#775a19" />
                <Text style={styles.loadingText}>Loading report...</Text>
              </View>
            ) : !courseReport ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={52}
                  color="#c5c6d2"
                />
                <Text style={styles.emptyTitle}>No Data Available</Text>
                <Text style={styles.emptySubText}>
                  Create sessions and mark attendance to see analytics
                </Text>
              </View>
            ) : (
              <>
                {/* ── Course Info Card ── */}
                <View style={styles.courseInfoCard}>
                  <View style={styles.courseInfoTop}>
                    <View style={styles.courseCodeBadge}>
                      <Text style={styles.courseCodeText}>
                        {courseReport.course.courseCode}
                      </Text>
                    </View>
                    <Text style={styles.courseInfoSemester}>
                      Semester {courseReport.course.semester} ·{" "}
                      {courseReport.course.academicYear}
                    </Text>
                  </View>
                  <Text style={styles.courseInfoName}>
                    {courseReport.course.courseName}
                  </Text>
                  <View style={styles.courseInfoMeta}>
                    <View style={styles.courseInfoMetaItem}>
                      <MaterialCommunityIcons
                        name="shield-check-outline"
                        size={12}
                        color="rgba(255,255,255,0.5)"
                      />
                      <Text style={styles.courseInfoMetaText}>
                        {courseReport.course.attendanceThreshold}% threshold
                      </Text>
                    </View>
                    <View style={styles.courseInfoMetaItem}>
                      <MaterialCommunityIcons
                        name="school-outline"
                        size={12}
                        color="rgba(255,255,255,0.5)"
                      />
                      <Text style={styles.courseInfoMetaText}>
                        {courseReport.course.department}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── Summary Stats Grid ── */}
                <View style={styles.statsGrid}>
                  <StatCard
                    label="TOTAL SESSIONS"
                    value={courseReport.totalSessions}
                    sub="Conducted"
                    icon="broadcast"
                    color="#00113a"
                    borderColor="#00113a"
                  />
                  <StatCard
                    label="ENROLLED"
                    value={courseReport.totalStudents}
                    sub="Students"
                    icon="account-group-outline"
                    color="#775a19"
                    borderColor="#775a19"
                  />
                  <StatCard
                    label="AVG ATTENDANCE"
                    value={`${parseFloat(courseReport.averageAttendance || 0).toFixed(1)}%`}
                    sub={getStanding(courseReport.averageAttendance)}
                    icon="chart-line"
                    color={getAttendanceColor(courseReport.averageAttendance)}
                    borderColor={getAttendanceColor(
                      courseReport.averageAttendance,
                    )}
                  />
                  <StatCard
                    label="DEFAULTERS"
                    value={courseReport.defaultersCount}
                    sub={`${courseReport.eligibleCount} Eligible`}
                    icon="alert-circle-outline"
                    color={
                      courseReport.defaultersCount > 0 ? "#ba1a1a" : "#4CAF50"
                    }
                    borderColor={
                      courseReport.defaultersCount > 0 ? "#ba1a1a" : "#4CAF50"
                    }
                  />
                </View>

                {/* ── Overall Progress ── */}
                <View style={styles.overallCard}>
                  <View style={styles.overallCardHeader}>
                    <View>
                      <Text style={styles.overallLabel}>
                        OVERALL CLASS PERFORMANCE
                      </Text>
                      <Text style={styles.overallCourseName}>
                        {courseReport.course.courseName}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.overallPct,
                        {
                          color: getAttendanceColor(
                            courseReport.averageAttendance,
                          ),
                        },
                      ]}
                    >
                      {parseFloat(courseReport.averageAttendance || 0).toFixed(
                        1,
                      )}
                      %
                    </Text>
                  </View>

                  <View style={styles.overallTrack}>
                    <View
                      style={[
                        styles.overallFill,
                        {
                          width: `${Math.min(
                            100,
                            parseFloat(courseReport.averageAttendance || 0),
                          )}%`,
                          backgroundColor: getAttendanceColor(
                            courseReport.averageAttendance,
                          ),
                        },
                      ]}
                    />
                    {/* Threshold marker */}
                    <View
                      style={[
                        styles.thresholdMarker,
                        {
                          left: `${courseReport.course.attendanceThreshold}%`,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.overallFooter}>
                    <Text style={styles.overallFooterText}>
                      Min required: {courseReport.course.attendanceThreshold}%
                    </Text>
                    <Text
                      style={[
                        styles.overallStanding,
                        {
                          color: getAttendanceColor(
                            courseReport.averageAttendance,
                          ),
                        },
                      ]}
                    >
                      {getStanding(courseReport.averageAttendance)}
                    </Text>
                  </View>

                  {/* Eligible vs At Risk breakdown */}
                  <View style={styles.breakdownRow}>
                    <BreakdownChip
                      label="Eligible"
                      value={courseReport.eligibleCount}
                      total={courseReport.totalStudents}
                      color="#4CAF50"
                    />
                    <BreakdownChip
                      label="At Risk"
                      value={courseReport.defaultersCount}
                      total={courseReport.totalStudents}
                      color="#F59E0B"
                    />
                    <BreakdownChip
                      label="Defaulters"
                      value={atRiskStudents.filter(r => parseFloat(r.attendancePercentage) < 60).length}
                      total={courseReport.totalStudents}
                      color="#ba1a1a"
                    />
                  </View>
                </View>

                {/* ── Bar Chart ── */}
                {chartData.length > 0 && (
                  <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                      <Text style={styles.chartTitle}>
                        Student Attendance Overview
                      </Text>
                      <Text style={styles.chartSubtitle}>
                        First {chartData.length} students
                      </Text>
                    </View>
                    <BarChart data={chartData} threshold={courseReport.course.attendanceThreshold} />
                    <View style={styles.chartLegend}>
                      {[
                        { color: "#4CAF50", label: "≥80% Good" },
                        { color: "#F59E0B", label: "60-79% Watch" },
                        { color: "#ba1a1a", label: "<60% Critical" },
                      ].map((l) => (
                        <View key={l.label} style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: l.color },
                            ]}
                          />
                          <Text style={styles.legendText}>{l.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Tab Bar ── */}
                <View style={styles.tabBar}>
                  {[
                    {
                      id: "overview",
                      label: "All Students",
                      icon: "account-group-outline",
                      count: courseReport.totalStudents,
                    },
                    {
                      id: "atrisk",
                      label: "At Risk",
                      icon: "alert-circle-outline",
                      count: courseReport.defaultersCount,
                    },
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab.id}
                      style={[
                        styles.tabBtn,
                        activeTab === tab.id && styles.tabBtnActive,
                      ]}
                      onPress={() => setActiveTab(tab.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={tab.icon}
                        size={15}
                        color={activeTab === tab.id ? "#ffffff" : "#757682"}
                      />
                      <Text
                        style={[
                          styles.tabBtnText,
                          activeTab === tab.id && styles.tabBtnTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                      <View
                        style={[
                          styles.tabBtnBadge,
                          activeTab === tab.id &&
                            styles.tabBtnBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBtnBadgeText,
                            activeTab === tab.id &&
                              styles.tabBtnBadgeTextActive,
                          ]}
                        >
                          {tab.count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Student List based on tab ── */}
                {activeTab === "overview" && (
                  <View style={styles.studentListCard}>
                    <Text style={styles.studentListTitle}>
                      All Students · {courseReport.totalStudents} enrolled
                    </Text>
                    {courseReport.studentReports.map((r, idx) => (
                      <StudentRow
                        key={r.student._id || idx}
                        report={r}
                        threshold={
                          courseReport.course.attendanceThreshold
                        }
                      />
                    ))}
                  </View>
                )}

                {activeTab === "atrisk" && (
                  <View style={styles.studentListCard}>
                    {atRiskStudents.length === 0 ? (
                      <View style={styles.allGoodBanner}>
                        <MaterialCommunityIcons
                          name="check-circle-outline"
                          size={40}
                          color="#4CAF50"
                        />
                        <Text style={styles.allGoodTitle}>
                          All Students Eligible!
                        </Text>
                        <Text style={styles.allGoodSub}>
                          All students meet the{" "}
                          {courseReport.course.attendanceThreshold}% threshold
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.studentListTitle}>
                          At Risk · {atRiskStudents.length} students below threshold
                        </Text>
                        {atRiskStudents.map((r, idx) => (
                          <StudentRow
                            key={r.student._id || idx}
                            report={r}
                            threshold={
                              courseReport.course.attendanceThreshold
                            }
                            highlight
                          />
                        ))}
                      </>
                    )}
                  </View>
                )}

                {/* ── Session Summary ── */}
                <View style={styles.sessionSummaryCard}>
                  <Text style={styles.sessionSummaryTitle}>
                    Session Summary
                  </Text>
                  <View style={styles.sessionSummaryGrid}>
                    <SessionSummaryItem
                      label="Total Sessions"
                      value={courseReport.totalSessions}
                      icon="calendar-check-outline"
                    />
                    <SessionSummaryItem
                      label="Students Enrolled"
                      value={courseReport.totalStudents}
                      icon="account-group-outline"
                    />
                    <SessionSummaryItem
                      label="Avg Attendance"
                      value={`${parseFloat(courseReport.averageAttendance || 0).toFixed(1)}%`}
                      icon="chart-arc"
                    />
                    <SessionSummaryItem
                      label="Threshold"
                      value={`${courseReport.course.attendanceThreshold}%`}
                      icon="shield-check-outline"
                    />
                  </View>
                </View>
              </>
            )}

            <Text style={styles.footerText}>
              © SABARAGAMUWA UNIVERSITY OF SRI LANKA
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

// ── Bar chart ──
const BarChart = ({ data, threshold = 80 }) => {
  if (!data || data.length === 0) return null;
  const maxBarHeight = 120;
  const barWidth = Math.min(28, (SCREEN_WIDTH - 80) / data.length - 8);

  return (
    <View style={barStyles.container}>
      {/* Y-axis labels */}
      <View style={barStyles.yAxis}>
        {[100, 75, 50, 25, 0].map((val) => (
          <Text key={val} style={barStyles.yLabel}>
            {val}%
          </Text>
        ))}
      </View>

      {/* Chart area */}
      <View style={barStyles.chartArea}>
        {/* Threshold line */}
        <View
          style={[
            barStyles.thresholdLine,
            { bottom: (threshold / 100) * maxBarHeight },
          ]}
        />

        {/* Grid lines */}
        {[25, 50, 75, 100].map((val) => (
          <View
            key={val}
            style={[
              barStyles.gridLine,
              { bottom: (val / 100) * maxBarHeight },
            ]}
          />
        ))}

        {/* Bars */}
        <View style={barStyles.bars}>
          {data.map((item, idx) => {
            const height = Math.max(4, (item.value / 100) * maxBarHeight);
            const color = getAttendanceColor(item.value);
            return (
              <View key={idx} style={barStyles.barWrap}>
                <Text style={barStyles.barValue}>
                  {Math.round(item.value)}%
                </Text>
                <View style={barStyles.barBg}>
                  <View
                    style={[
                      barStyles.bar,
                      { height, width: barWidth, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text
                  style={barStyles.barLabel}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// ── Stat card ──
const StatCard = ({ label, value, sub, icon, color, borderColor }) => (
  <View style={[styles.statCard, { borderTopColor: borderColor }]}>
    <MaterialCommunityIcons name={icon} size={20} color={color} />
    <Text style={styles.statCardLabel}>{label}</Text>
    <Text style={[styles.statCardValue, { color }]}>{value}</Text>
    {sub && <Text style={styles.statCardSub}>{sub}</Text>}
  </View>
);

// ── Breakdown chip ──
const BreakdownChip = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={[styles.breakdownChip, { backgroundColor: `${color}10` }]}>
      <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
      <Text style={[styles.breakdownPct, { color: `${color}99` }]}>
        {pct}%
      </Text>
      <Text style={[styles.breakdownLabel, { color: `${color}80` }]}>
        {label}
      </Text>
    </View>
  );
};

// ── Student row ──
const StudentRow = ({ report, threshold, highlight }) => {
  const pct = parseFloat(report.attendancePercentage || 0);
  const color = getAttendanceColor(pct);
  const isEligible = report.statistics?.isEligible;

  return (
    <View
      style={[
        styles.studentRow,
        highlight && !isEligible && styles.studentRowAtRisk,
      ]}
    >
      {/* Avatar */}
      <View
        style={[
          styles.studentAvatar,
          { backgroundColor: `${color}15` },
        ]}
      >
        <Text style={[styles.studentAvatarText, { color }]}>
          {report.student?.name?.charAt(0)?.toUpperCase() || "?"}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.studentInfo}>
        <View style={styles.studentInfoTop}>
          <Text style={styles.studentName} numberOfLines={1}>
            {report.student?.name}
          </Text>
          {!isEligible && (
            <View style={styles.atRiskBadge}>
              <Text style={styles.atRiskBadgeText}>AT RISK</Text>
            </View>
          )}
        </View>
        <Text style={styles.studentId}>{report.student?.studentId}</Text>

        {/* Progress bar */}
        <View style={styles.studentProgressRow}>
          <View style={styles.studentProgressTrack}>
            <View
              style={[
                styles.studentProgressFill,
                {
                  width: `${Math.min(100, pct)}%`,
                  backgroundColor: color,
                },
              ]}
            />
            {/* Threshold marker */}
            <View
              style={[
                styles.studentThresholdMark,
                { left: `${threshold}%` },
              ]}
            />
          </View>
          <Text style={[styles.studentPct, { color }]}>
            {pct.toFixed(1)}%
          </Text>
        </View>

        {/* Mini stats */}
        <View style={styles.studentMiniStats}>
          <Text style={styles.studentMiniStat}>
            ✓ {report.statistics?.attended || 0} attended
          </Text>
          <Text style={styles.studentMiniStat}>
            ✗ {report.statistics?.absent || 0} absent
          </Text>
          <Text style={styles.studentMiniStat}>
            ◷ {report.statistics?.late || 0} late
          </Text>
        </View>
      </View>
    </View>
  );
};

// ── Session summary item ──
const SessionSummaryItem = ({ label, value, icon }) => (
  <View style={styles.sessionSummaryItem}>
    <MaterialCommunityIcons name={icon} size={20} color="#775a19" />
    <Text style={styles.sessionSummaryValue}>{value}</Text>
    <Text style={styles.sessionSummaryLabel}>{label}</Text>
  </View>
);

// ══════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════

const barStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  yAxis: {
    justifyContent: "space-between",
    paddingBottom: 24,
    paddingTop: 20,
    width: 30,
  },
  yLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 8,
    color: "#c5c6d2",
    textAlign: "right",
  },
  chartArea: {
    flex: 1,
    position: "relative",
    height: 170,
  },
  thresholdLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "#ba1a1a",
    opacity: 0.4,
    zIndex: 2,
    borderStyle: "dashed",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(197,198,210,0.3)",
    zIndex: 1,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
  },
  barWrap: {
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  barValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    color: "#444650",
    letterSpacing: 0.3,
  },
  barBg: {
    justifyContent: "flex-end",
    height: 120,
  },
  bar: {
    borderRadius: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    color: "#757682",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  safeArea: { flex: 1 },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.2)",
    gap: 16,
  },
  archivalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  archivalAccent: {
    width: 2,
    height: 44,
    backgroundColor: "#775a19",
    marginTop: 2,
  },
  archivalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#775a19",
    marginBottom: 3,
  },
  archivalTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 28,
    color: "#00113a",
  },

  // Course chips
  courseChips: { gap: 8, paddingBottom: 4 },
  courseChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
  },
  courseChipActive: {
    backgroundColor: "#00113a",
    borderColor: "#00113a",
  },
  courseChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    color: "#757682",
  },
  courseChipTextActive: { color: "#ffffff" },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 16,
  },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
  },
  emptySubText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    textAlign: "center",
  },

  reportLoading: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 16,
  },

  // Course info card
  courseInfoCard: {
    backgroundColor: "#00113a",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  courseInfoTop: {
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
  courseInfoSemester: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  courseInfoName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#ffffff",
    lineHeight: 28,
  },
  courseInfoMeta: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  courseInfoMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  courseInfoMetaText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statCardLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
    marginTop: 4,
  },
  statCardValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 28,
  },
  statCardSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },

  // Overall card
  overallCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  overallCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  overallLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
    marginBottom: 4,
  },
  overallCourseName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 16,
    color: "#00113a",
    maxWidth: 200,
  },
  overallPct: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 32,
  },
  overallTrack: {
    height: 10,
    backgroundColor: "#f3f3f3",
    borderRadius: 5,
    overflow: "hidden",
    position: "relative",
  },
  overallFill: { height: "100%", borderRadius: 5 },
  thresholdMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  overallFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overallFooterText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  overallStanding: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  breakdownRow: {
    flexDirection: "row",
    gap: 10,
  },
  breakdownChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 2,
  },
  breakdownValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
  },
  breakdownPct: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
  },
  breakdownLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 9,
    letterSpacing: 0.5,
  },

  // Chart
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  chartHeader: { marginBottom: 4 },
  chartTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
    color: "#00113a",
  },
  chartSubtitle: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
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
  tabBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
  },
  tabBtnTextActive: { color: "#ffffff" },
  tabBtnBadge: {
    backgroundColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBtnBadgeActive: { backgroundColor: "rgba(255,255,255,0.15)" },
  tabBtnBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    color: "#757682",
  },
  tabBtnBadgeTextActive: { color: "#ffffff" },

  // Student list
  studentListCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    gap: 12,
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  studentListTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    color: "#00113a",
    marginBottom: 4,
  },
  studentRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.12)",
  },
  studentRowAtRisk: {
    backgroundColor: "rgba(186,26,26,0.02)",
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  studentAvatarText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
  },
  studentInfo: { flex: 1, gap: 4 },
  studentInfoTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studentName: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
    flex: 1,
  },
  atRiskBadge: {
    backgroundColor: "rgba(186,26,26,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  atRiskBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    letterSpacing: 1,
    color: "#ba1a1a",
  },
  studentId: {
    fontFamily: "Manrope_400Regular",
    fontSize: 9,
    color: "#757682",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  studentProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studentProgressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: "#f3f3f3",
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  studentProgressFill: { height: "100%", borderRadius: 3 },
  studentThresholdMark: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  studentPct: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    width: 42,
    textAlign: "right",
  },
  studentMiniStats: {
    flexDirection: "row",
    gap: 10,
  },
  studentMiniStat: {
    fontFamily: "Manrope_400Regular",
    fontSize: 9,
    color: "#757682",
  },

  // All good banner
  allGoodBanner: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  allGoodTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
  },
  allGoodSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    textAlign: "center",
  },

  // Session summary
  sessionSummaryCard: {
    backgroundColor: "#00113a",
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  sessionSummaryTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
    color: "#ffffff",
  },
  sessionSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sessionSummaryItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 14,
  },
  sessionSummaryValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 24,
    color: "#ffffff",
  },
  sessionSummaryLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },

  footerText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 7,
    letterSpacing: 3,
    color: "#757682",
    textAlign: "center",
    opacity: 0.3,
    marginTop: 8,
  },
});