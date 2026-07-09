import { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import api from "@/src/api/axiosInstance";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "../../../src/components/LoadingScreen";

const STATUS_FILTERS = ["All", "Present", "Late", "Absent"];

const getAttendanceColor = (pct) => {
  if (pct >= 80) return "#4CAF50";
  if (pct >= 60) return "#F59E0B";
  return "#ba1a1a";
};

const getStatusColor = (s) => {
  switch (s?.toLowerCase()) {
    case "present":
      return "#4CAF50";
    case "late":
      return "#F59E0B";
    default:
      return "#ba1a1a";
  }
};

const getStatusBg = (s) => {
  switch (s?.toLowerCase()) {
    case "present":
      return "rgba(76,175,80,0.1)";
    case "late":
      return "rgba(245,158,11,0.1)";
    default:
      return "rgba(186,26,26,0.1)";
  }
};

const getStanding = (pct) => {
  if (pct >= 80) return "Distinguished";
  if (pct >= 60) return "Satisfactory";
  return "At Risk";
};

const formatTime = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);

  return isNaN(d)
    ? "—"
    : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
};

// ── Course Card (Screen 1) ──
const CourseCard = memo(function CourseCard({ course, onPress }) {
  const pct = course.percentage || 0;
  const color = getAttendanceColor(pct);

  return (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.courseCardStrip, { backgroundColor: color }]} />
      <View style={styles.courseCardBody}>
        <View style={styles.courseCardTop}>
          <View style={styles.courseCardInfo}>
            <View style={styles.courseCodeBadge}>
              <Text style={styles.courseCodeText}>{course.courseCode}</Text>
            </View>
            <Text style={styles.courseCardName} numberOfLines={2}>
              {course.courseName}
            </Text>
            <Text style={styles.courseCardMeta}>
              Sem {course.semester} - {course.credits} Cr ·{" "}
              {course.courseType || "Theory"}
            </Text>
            {course.lecturers?.length > 0 && (
              <Text style={styles.courseCardLecturer} numberOfLines={1}>
                {course.lecturers[0].name}
              </Text>
            )}
          </View>
          <View style={[styles.pctCircle, { borderColor: color }]}>
            <Text style={[styles.pctValue, { color }]}>{Math.round(pct)}%</Text>
            <Text style={styles.pctSub}>attend.</Text>
          </View>
        </View>

        <View style={styles.courseProgressTrack}>
          <View
            style={[
              styles.courseProgressFill,
              { width: `${Math.min(100, pct)}%`, backgroundColor: color },
            ]}
          />
        </View>

        <View style={styles.courseCardBottom}>
          <Text style={styles.courseCardBottomText}>
            {course.attended || 0}/{course.totalSessions || 0} sessions attended
          </Text>
          <View
            style={[
              styles.eligibilityBadge,
              {
                backgroundColor: course.isEligible
                  ? "rgba(76,175,80,0.1)"
                  : "rgba(186,26,26,0.1)",
              },
            ]}
          >
            <Text
              style={[
                styles.eligibilityText,
                { color: course.isEligible ? "#4CAF50" : "#ba1a1a" },
              ]}
            >
              {course.isEligible ? "ELIGIBLE" : "AT RISK"}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color="#c5c6d2"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ── Stat Card (Screen 2) ──
const StatCard = memo(function StatCard({
  label,
  value,
  sub,
  color,
  borderColor,
}) {
  return (
    <View
      style={[
        styles.statCard,
        borderColor && { borderLeftWidth: 3, borderLeftColor: borderColor },
      ]}
    >
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      {sub && <Text style={styles.statCardSub}>{sub}</Text>}
    </View>
  );
});

// ── Breakdown Chip (Screen 2) ──
const BreakdownChip = memo(function BreakdownChip({ label, value, color }) {
  return (
    <View style={[styles.breakdownChip, { backgroundColor: `${color}12` }]}>
      <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
      <Text style={[styles.breakdownLabel, { color: `${color}99` }]}>
        {label}
      </Text>
    </View>
  );
});

// ── Record Card (Screen 2) ──
const RecordCard = memo(function RecordCard({ record }) {
  const dateObj =
    formatFullDate(record.date) ||
    formatFullDate(record.markedAt) ||
    formatFullDate(record.session?.startTime);

  const month = dateObj
    ? dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
    : "—";
  const day = dateObj ? dateObj.getDate() : "—";

  const lectureTitle =
    record.session?.lectureTitle ||
    `Lecture ${record.session?.lectureNumber || "—"}`;

  return (
    <View style={styles.recordCard}>
      <View
        style={[
          styles.recordStatusStrip,
          { backgroundColor: getStatusColor(record.status) },
        ]}
      />
      <View style={styles.recordDate}>
        <Text style={styles.recordMonth}>{month}</Text>
        <Text style={styles.recordDay}>{day}</Text>
      </View>
      <View style={styles.recordInfo}>
        <Text style={styles.recordTitle} numberOfLines={1}>
          {lectureTitle}
        </Text>
        <View style={styles.recordMetaRow}>
          <View style={styles.recordMetaItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={11}
              color="#757682"
            />
            <Text style={styles.recordMetaText}>
              {formatTime(record.markedAt)}
            </Text>
          </View>
          {record.session?.venue && (
            <View style={styles.recordMetaItem}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={11}
                color="#757682"
              />
              <Text style={styles.recordMetaText} numberOfLines={1}>
                {record.session.venue}
              </Text>
            </View>
          )}
          {record.isLate && (
            <View style={styles.recordMetaItem}>
              <MaterialCommunityIcons
                name="clock-alert-outline"
                size={11}
                color="#F59E0B"
              />
              <Text style={[styles.recordMetaText, { color: "#F59E0B" }]}>
                {record.lateByMinutes}m late
              </Text>
            </View>
          )}
        </View>
        {record.session?.lectureNumber && (
          <Text style={styles.recordLectureNum}>
            Lecture #{record.session.lectureNumber}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: getStatusBg(record.status) },
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            { color: getStatusColor(record.status) },
          ]}
        >
          {record.status?.toUpperCase()}
        </Text>
      </View>
    </View>
  );
});

export default function AttendanceScreen() {
  const params = useLocalSearchParams();

  // ── State ──
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [records, setRecords] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  // ── Refs ──
  const detailFade = useRef(new Animated.Value(0)).current;
  const coursesRef = useRef([]);
  const handledFingerprintRef = useRef(null);

  const animateDetailIn = useCallback(() => {
    detailFade.setValue(0);
    Animated.timing(detailFade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const selectCourse = useCallback(
    (course) => {
      setSelectedCourse(course);
      setStatusFilter("All");
      setSearch("");
      animateDetailIn();
    },
    [animateDetailIn],
  );

  const goBack = useCallback(() => {
    setSelectedCourse(null);
    setRecords([]);
    setStatistics(null);
    setStatusFilter("All");
    setSearch("");
  }, []);

  const fetchCourses = useCallback(
    async (autoSelectId = null) => {
      try {
        setLoading(true);
        const res = await api.get("/course/my-enrolled");

        if (!res.data.success) {
          setCourses([]);
          coursesRef.current = [];
          return;
        }

        const enrolledCourses = res.data.data || [];
        if (enrolledCourses.length === 0) {
          setCourses([]);
          coursesRef.current = [];
          return;
        }

        // Fetch stats for all courses in parallel
        const statsResults = await Promise.all(
          enrolledCourses.map((c) =>
            api
              .get(`/attendance/student/course/${c._id}`)
              .then((r) => (r.data.success ? r.data.data.statistics : null))
              .catch(() => null),
          ),
        );

        const coursesWithStats = enrolledCourses.map((c, i) => ({
          ...c,
          totalSessions: statsResults[i]?.totalSessions || 0,
          attended: statsResults[i]?.attended || 0,
          present: statsResults[i]?.present || 0,
          late: statsResults[i]?.late || 0,
          absent: statsResults[i]?.absent || 0,
          percentage: statsResults[i]?.percentage || 0,
          threshold: statsResults[i]?.threshold || 80,
          isEligible: statsResults[i]?.isEligible || false,
        }));

        setCourses(coursesWithStats);
        coursesRef.current = coursesWithStats;

        // Auto-select if a courseId was requested
        if (autoSelectId) {
          const target = coursesWithStats.find((c) => c._id === autoSelectId);
          if (target) selectCourse(target);
        }
      } catch (err) {
        console.log("fetchCourses:", err.message);
        setCourses([]);
        coursesRef.current = [];
      } finally {
        setLoading(false);
      }
    },
    [selectCourse],
  );

  const fetchRecords = useCallback(async (course) => {
    if (!course) return;
    try {
      setRecordsLoading(true);
      const res = await api.get(`/attendance/student/course/${course._id}`);
      if (res.data.success) {
        const sorted = (res.data.data.records || []).sort((a, b) => {
          const dA = new Date(
            a.date || a.markedAt || a.session?.startTime || 0,
          );
          const dB = new Date(
            b.date || b.markedAt || b.session?.startTime || 0,
          );
          return dB - dA;
        });
        setRecords(sorted);
        setStatistics(res.data.data.statistics || null);
      }
    } catch (err) {
      console.log("fetchRecords:", err.message);
      setRecords([]);
      setStatistics(null);
    } finally {
      setRecordsLoading(false);
    }
  }, []);


  // Effect 1: Mount — run once
  useEffect(() => {
    const initialCourseId = params?.courseId || null;
    const initialTimestamp = params?.t || "";

    if (initialCourseId) {
      handledFingerprintRef.current = `${initialCourseId}_${initialTimestamp}`;
    }

    fetchCourses(initialCourseId);
  }, []); 

  // Effect 2: Navigation changes after mount
  useEffect(() => {
    const incomingId = params?.courseId;
    const incomingTimestamp = params?.t || "";

    if (!incomingId) {
      if (selectedCourse) 
        goBack();

      handledFingerprintRef.current = null;
      return;
    }

    const fingerprint = `${incomingId}_${incomingTimestamp}`;
    if (fingerprint === handledFingerprintRef.current) 
      return;

    handledFingerprintRef.current = fingerprint;

    if (coursesRef.current.length > 0) {
      const target = coursesRef.current.find((c) => c._id === incomingId);
      if (target) 
        selectCourse(target);
    }
  }, [params?.courseId, params?.t]);

  // Effect 3: Fetch records when selected course changes
  useEffect(() => {
    if (selectedCourse) 
      fetchRecords(selectedCourse);
  }, [selectedCourse, fetchRecords]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (selectedCourse) {
        await fetchRecords(selectedCourse);
      } else {
        await fetchCourses();
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedCourse, fetchRecords, fetchCourses]);


  const filteredRecords = records.filter((r) => {
    const matchStatus = statusFilter === "All" || r.status?.toLowerCase() === statusFilter.toLowerCase();

    const matchSearch =
      !search.trim() ||
      r.session?.lectureTitle?.toLowerCase().includes(search.toLowerCase()) ||
      r.session?.venue?.toLowerCase().includes(search.toLowerCase()) ||
      String(r.session?.lectureNumber || "").includes(search);

    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <LoadingScreen
        message="Loading attendance..."
        submessage="Fetching your enrolled courses"
      />
    );
  }

  if (selectedCourse) {
    const pct = statistics?.percentage || 0;
    const attendanceColor = getAttendanceColor(pct);

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

        {/* ── Detail Header ── */}
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={goBack}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color="#00113a"
            />
            <Text style={styles.backBtnText}>My Courses</Text>
          </TouchableOpacity>
          <View style={styles.courseCodeBadge}>
            <Text style={styles.courseCodeText}>
              {selectedCourse.courseCode}
            </Text>
          </View>
        </View>

        {/* ── Course Info Banner ── */}
        <View
          style={[
            styles.courseInfoBanner,
            { borderLeftColor: attendanceColor },
          ]}
        >
          <Text style={styles.courseInfoName} numberOfLines={2}>
            {selectedCourse.courseName}
          </Text>
          <Text style={styles.courseInfoMeta}>
            Semester {selectedCourse.semester} - {selectedCourse.credits}{" "}
            Credits - {selectedCourse.courseType || "Theory"}
          </Text>
          {selectedCourse.lecturers?.length > 0 && (
            <Text style={styles.courseInfoLecturer}>
              {selectedCourse.lecturers[0].name}
            </Text>
          )}
        </View>

        <Animated.ScrollView
          style={{ opacity: detailFade, flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#775a19"
            />
          }
        >
          {/* ── Stats Grid ── */}
          {statistics && (
            <View style={styles.statsGrid}>
              <StatCard
                label="ATTENDED"
                value={statistics.attended || 0}
                sub="Sessions"
                color="#00113a"
                borderColor="#00113a"
              />
              <StatCard
                label="ABSENT"
                value={statistics.absent || 0}
                sub="Sessions"
                color="#ba1a1a"
                borderColor="#ba1a1a"
              />
              <StatCard
                label="COMPLIANCE"
                value={`${Math.round(statistics.percentage || 0)}%`}
                sub="Attendance rate"
                color={attendanceColor}
                borderColor={attendanceColor}
              />
              <View style={styles.statCardDark}>
                <Text style={styles.statCardDarkLabel}>STANDING</Text>
                <Text style={styles.statCardDarkValue}>
                  {getStanding(statistics.percentage || 0)}
                </Text>
                <View
                  style={[
                    styles.eligibilityPill,
                    {
                      backgroundColor: statistics.isEligible
                        ? "rgba(76,175,80,0.2)"
                        : "rgba(186,26,26,0.2)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.eligibilityPillText,
                      { color: statistics.isEligible ? "#4CAF50" : "#ba1a1a" },
                    ]}
                  >
                    {statistics.isEligible ? "ELIGIBLE" : "AT RISK"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Attendance Progress ── */}
          {statistics && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>ATTENDANCE RATE</Text>
                <Text
                  style={[styles.progressValue, { color: attendanceColor }]}
                >
                  {Math.round(statistics.percentage || 0)}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, statistics.percentage || 0)}%`,
                      backgroundColor: attendanceColor,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.thresholdMarker,
                    { left: `${statistics.threshold || 80}%` },
                  ]}
                />
              </View>

              <View style={styles.progressFooter}>
                <Text style={styles.progressThreshold}>
                  Min. required: {statistics.threshold || 80}%
                </Text>
                {!statistics.isEligible && (
                  <Text style={styles.progressWarning}>⚠ Below threshold</Text>
                )}
              </View>

              {/* Breakdown chips */}
              <View style={styles.breakdownRow}>
                <BreakdownChip
                  label="Present"
                  value={statistics.present || 0}
                  color="#4CAF50"
                />
                <BreakdownChip
                  label="Late"
                  value={statistics.late || 0}
                  color="#F59E0B"
                />
                <BreakdownChip
                  label="Absent"
                  value={statistics.absent || 0}
                  color="#ba1a1a"
                />
                <BreakdownChip
                  label="Total"
                  value={statistics.totalSessions || 0}
                  color="#00113a"
                />
              </View>
            </View>
          )}

          {/* ── Search + Filters ── */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons
                name="magnify"
                size={18}
                color="#757682"
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by lecture or venue..."
                placeholderTextColor="rgba(117,118,130,0.5)"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <MaterialCommunityIcons
                    name="close"
                    size={16}
                    color="#757682"
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    statusFilter === f && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(f)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === f && styles.filterChipTextActive,
                    ]}
                  >
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Records List ── */}
          {recordsLoading ? (
            <LoadingScreen
              variant="minimal"
              message="Loading records..."
            />
          ) : filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={52}
                color="#c5c6d2"
              />
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptyText}>
                {search || statusFilter !== "All"
                  ? "Try adjusting your filters"
                  : "No attendance recorded yet for this course"}
              </Text>
              {(search || statusFilter !== "All") && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    setSearch("");
                    setStatusFilter("All");
                  }}
                >
                  <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.recordsList}>
              <Text style={styles.recordsCount}>
                {filteredRecords.length} RECORD
                {filteredRecords.length !== 1 ? "S" : ""}
              </Text>
              {filteredRecords.map((record, idx) => (
                <RecordCard key={record._id || idx} record={record} />
              ))}
            </View>
          )}

          <Text style={styles.footerText}>
            © SABARAGAMUWA UNIVERSITY OF SRI LANKA
          </Text>
        </Animated.ScrollView>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════
  // SCREEN 1: Course List
  // ════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* ── List Header ── */}
      <View style={styles.listHeader}>
        <View style={styles.archivalRow}>
          <View style={styles.archivalAccent} />
          <View>
            <Text style={styles.headerLabel}>ATTENDANCE REGISTER</Text>
            <Text style={styles.headerTitle}>My Courses</Text>
          </View>
        </View>
        {courses.length > 0 && (
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>
              {courses.length} course{courses.length > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#775a19"
          />
        }
      >
        {courses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="book-open-outline"
              size={52}
              color="#c5c6d2"
            />
            <Text style={styles.emptyTitle}>No Courses</Text>
            <Text style={styles.emptyText}>
              You are not enrolled in any courses yet
            </Text>
          </View>
        ) : (
          <View style={styles.courseList}>
            {courses.map((course) => (
              <CourseCard
                key={course._id}
                course={course}
                onPress={() => selectCourse(course)}
              />
            ))}
          </View>
        )}

        <Text style={styles.footerText}>
          © SABARAGAMUWA UNIVERSITY OF SRI LANKA
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },

  // ═══════════════════════════════════
  // SCREEN 1 — Course List
  // ═══════════════════════════════════
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
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
    marginTop: 4,
  },
  headerLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: "#775a19",
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 28,
    color: "#00113a",
  },
  summaryPill: {
    backgroundColor: "rgba(119,90,25,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.15)",
  },
  summaryPillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#775a19",
  },

  listScroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  courseList: { gap: 12 },

  // ── Course Card ──
  courseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  courseCardStrip: { 
    height: "100%", 
    width: 4,
    position: "absolute",
    left: -0.5, 
  },
  courseCardBody: { padding: 16, gap: 12 },
  courseCardTop: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  courseCardInfo: { flex: 1, gap: 4 },
  courseCodeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,35,102,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  courseCodeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#002366",
  },
  courseCardName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    color: "#00113a",
    lineHeight: 24,
  },
  courseCardMeta: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  courseCardLecturer: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    color: "#444650",
  },
  pctCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pctValue: { fontFamily: "Manrope_700Bold", fontSize: 14 },
  pctSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 8,
    color: "#757682",
    letterSpacing: 0.3,
  },
  courseProgressTrack: {
    height: 5,
    backgroundColor: "#f3f3f3",
    borderRadius: 3,
    overflow: "hidden",
  },
  courseProgressFill: { height: "100%", borderRadius: 3 },
  courseCardBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  courseCardBottomText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    flex: 1,
  },
  eligibilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  eligibilityText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },

  // ═══════════════════════════════════
  // SCREEN 2 — Course Detail
  // ═══════════════════════════════════
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.2)",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backBtnText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
  },
  courseInfoBanner: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.1)",
    borderLeftWidth: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
    gap: 3,
  },
  courseInfoName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
    lineHeight: 28,
  },
  courseInfoMeta: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },
  courseInfoLecturer: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: "#444650",
  },

  detailScroll: { paddingBottom: 100 },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
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
    gap: 4,
  },
  statCardLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
  },
  statCardValue: { fontFamily: "Newsreader_400Regular", fontSize: 28 },
  statCardSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  statCardDark: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#00113a",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  statCardDarkLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.5)",
  },
  statCardDarkValue: {
    fontFamily: "Newsreader_400Regular",
    fontStyle: "italic",
    fontSize: 18,
    color: "#ffffff",
  },
  eligibilityPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 2,
  },
  eligibilityPillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },

  // ── Progress ──
  progressSection: {
    marginHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    gap: 10,
    marginBottom: 16,
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
  },
  progressValue: { fontFamily: "Newsreader_400Regular", fontSize: 28 },
  progressTrack: {
    height: 8,
    backgroundColor: "#f3f3f3",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  thresholdMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressThreshold: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  progressWarning: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    color: "#ba1a1a",
  },
  breakdownRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  breakdownChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  breakdownValue: { fontFamily: "Manrope_700Bold", fontSize: 16 },
  breakdownLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // ── Search + Filters ──
  searchSection: { paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: "#00113a",
  },
  filterChips: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
  },
  filterChipActive: { backgroundColor: "#00113a", borderColor: "#00113a" },
  filterChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
  },
  filterChipTextActive: { color: "#ffffff" },

  // ── Records ──
  recordsList: { paddingHorizontal: 20, gap: 8 },
  recordsCount: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
    marginBottom: 4,
  },
  recordCard: {
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
    overflow: "hidden",
  },
  recordStatusStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  recordDate: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  recordMonth: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: "#757682",
  },
  recordDay: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
    color: "#00113a",
    lineHeight: 22,
  },
  recordInfo: { flex: 1, gap: 3 },
  recordTitle: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
  },
  recordMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  recordMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  recordMetaText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  recordLectureNum: {
    fontFamily: "Manrope_400Regular",
    fontSize: 9,
    color: "#c5c6d2",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },

  // ── Empty State ──
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
  },
  emptyText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    textAlign: "center",
  },
  clearFiltersBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "rgba(119,90,25,0.1)",
    marginTop: 4,
  },
  clearFiltersBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: "#775a19",
    letterSpacing: 1,
  },

  // ── Footer ──
  footerText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 7,
    letterSpacing: 3,
    color: "#757682",
    textAlign: "center",
    opacity: 0.3,
    marginTop: 20,
    marginBottom: 20,
  },
});
