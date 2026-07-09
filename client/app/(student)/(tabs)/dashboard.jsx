import { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Animated,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import api from "@/src/api/axiosInstance";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "../../../src/components/LoadingScreen";


const getAttendanceColor = (pct) => {
  if (pct >= 80) 
    return "#4CAF50";
  if (pct >= 60) 
    return "#F59E0B";
  return "#ba1a1a";
};

const getAttendanceStatus = (pct) => {
  if (pct >= 80) 
    return "Distinguished";
  if (pct >= 60) 
    return "Satisfactory";
  return "At Risk";
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "urgent":
      return "#ba1a1a";
    case "high":
      return "#F59E0B";
    case "medium":
      return "#4CAF50";
    default:
      return "#757682";
  }
};

const getNotifIcon = (type) => {
  switch (type) {
    case "session_created":
      return "broadcast";
    case "attendance_marked":
      return "check-circle-outline";
    case "low_attendance_warning":
      return "alert-circle-outline";
    case "face_verification_failed":
      return "face-recognition";
    case "location_verification_failed":
      return "map-marker-off";
    case "session_closing":
      return "clock-alert-outline";
    case "mahapola_eligibility":
      return "school-outline";
    default:
      return "bell-outline";
  }
};

const getTodaySchedule = (courses) => {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return courses.flatMap((c) =>
    (c.schedule || [])
      .filter((s) => s.day === today)
      .map((s) => ({ ...s, course: c })),
  );
};

const parseTimeToday = (timeStr) => {
  if (!timeStr) 
    return null;

  const [h, m] = timeStr.split(":").map(Number);

  if (isNaN(h) || isNaN(m)) 
    return null;

  const d = new Date();
  d.setHours(h, m, 0, 0);

  return d;
};


// ── Stat Card ──
const StatCard = memo(function StatCard({
  label,
  value,
  sub,
  color,
  icon,
  highlight,
}) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <View style={styles.statCardTop}>
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={highlight ? "rgba(255,255,255,0.7)" : color}
        />
        <Text
          style={[
            styles.statCardLabel,
            highlight && styles.statCardLabelHighlight,
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[styles.statCardValue, { color: highlight ? "#ffffff" : color }]}
      >
        {value}
      </Text>
      {sub && (
        <Text
          style={[styles.statCardSub, highlight && styles.statCardSubHighlight]}
        >
          {sub}
        </Text>
      )}
    </View>
  );
});

// ── Course Card ──
const CourseCard = memo(function CourseCard({ course, onPress }) {
  const pct = course.stats?.percentage ?? 0;
  const color = getAttendanceColor(pct);
  const attended = course.stats?.attended ?? 0;
  const totalSessions = course.stats?.totalSessions ?? 0;
  const absent = course.stats?.absent ?? 0;

  return (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top strip — colour reflects attendance health */}
      <View style={[styles.courseCardStrip, { backgroundColor: color }]} />

      <View style={styles.courseCardInner}>
        <View style={styles.courseCardBadgeRow}>
          <View style={styles.courseCodeBadge}>
            <Text style={styles.courseCodeText}>{course.courseCode}</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={14}
            color="#c5c6d2"
          />
        </View>

        <Text style={styles.courseCardName} numberOfLines={2}>
          {course.courseName}
        </Text>

        <Text style={styles.courseCardMeta}>
          Sem {course.semester} - {course.credits} Cr
        </Text>

        {course.lecturers?.length > 0 && (
          <Text style={styles.courseCardLecturer} numberOfLines={1}>
            {course.lecturers[0].name}
          </Text>
        )}

        {/* Attendance progress bar */}
        <View style={styles.courseAttendanceRow}>
          <Text style={[styles.courseAttendancePct, { color }]}>{pct}%</Text>
          <View style={styles.courseAttendanceTrack}>
            <View
              style={[
                styles.courseAttendanceFill,
                { width: `${Math.min(pct, 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
        </View>

        <View style={styles.courseAttendanceFooter}>
          <Text style={styles.courseAttendanceLabel}>
            {attended}/{totalSessions} attended
          </Text>
          {absent > 0 && (
            <View style={styles.courseAbsentBadge}>
              <Text style={styles.courseAbsentText}>{absent} absent</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ── Notification Row ──
const NotifRow = memo(function NotifRow({ notification, onPress }) {
  const isUnread = !notification.isRead;
  const color = getPriorityColor(notification.priority);

  return (
    <TouchableOpacity
      style={[styles.notifRow, isUnread && styles.notifRowUnread]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {isUnread && <View style={styles.notifUnreadDot} />}
      <View style={[styles.notifIcon, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons
          name={getNotifIcon(notification.type)}
          size={18}
          color={color}
        />
      </View>
      <View style={styles.notifContent}>
        <Text
          style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        <Text style={styles.notifMessage} numberOfLines={1}>
          {notification.message}
        </Text>
      </View>
      <View style={[styles.priorityBadge, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.priorityBadgeText, { color }]}>
          {notification.priority?.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const ScheduleRow = memo(function ScheduleRow({
  item,
  attendanceRecord,
  onScanPress,
}) {
  const now = new Date();
  const start = parseTimeToday(item.startTime);
  const end = parseTimeToday(item.endTime);

  const isOngoing = start && end && now >= start && now <= end;
  const isExpired = end && now > end;
  const alreadyMarked = attendanceRecord?.markedToday === true;

  return (
    <View
      style={[
        styles.scheduleRow,
        isOngoing && !alreadyMarked && styles.scheduleRowOngoing,
        isOngoing && alreadyMarked && styles.scheduleRowMarked,
        isExpired && styles.scheduleRowExpired,
      ]}
    >
      {isOngoing && !alreadyMarked && (
        <View style={styles.scheduleOngoingStrip} />
      )}
      {isOngoing && alreadyMarked && (
        <View style={styles.scheduleMarkedStrip} />
      )}

      <View style={styles.scheduleTime}>
        <Text style={[styles.scheduleTimeText, isExpired && styles.textMuted]}>
          {item.startTime}
        </Text>
        <Text style={styles.scheduleTimeSub}>{item.endTime}</Text>
      </View>

      <View
        style={[
          styles.scheduleAccent,
          {
            backgroundColor: isExpired
              ? "#c5c6d2"
              : alreadyMarked
                ? "#4CAF50"
                : isOngoing
                  ? "#775a19"
                  : "#775a19",
          },
        ]}
      />

      <View style={styles.scheduleInfo}>
        <Text
          style={[styles.scheduleCourseName, isExpired && styles.textMuted]}
          numberOfLines={1}
        >
          {item.course.courseName}
        </Text>
        <Text style={styles.scheduleCourseCode}>{item.course.courseCode}</Text>
        <Text style={styles.scheduleVenue}>{item.course.venue || "TBA"}</Text>
      </View>

      {isExpired ? (
        <View style={styles.scheduleExpiredBadge}>
          <Text style={styles.scheduleExpiredText}>DONE</Text>
        </View>
      ) : isOngoing && alreadyMarked ? (
        <View style={styles.scheduleMarkedBadge}>
          <MaterialCommunityIcons
            name="check-circle"
            size={14}
            color="#4CAF50"
          />
          <Text style={styles.scheduleMarkedText}>MARKED</Text>
        </View>
      ) : isOngoing && !alreadyMarked ? (
        <View style={styles.scheduleOngoingActions}>
          <View style={styles.scheduleNowBadge}>
            <View style={styles.scheduleOngoingDot} />
            <Text style={styles.scheduleOngoingText}>NOW</Text>
          </View>
          <TouchableOpacity
            style={styles.scheduleScanBtn}
            onPress={onScanPress}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={14}
              color="#775a19"
            />
            <Text style={styles.scheduleScanText}>SCAN</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.scheduleScanBtn}
          onPress={onScanPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="qrcode-scan"
            size={14}
            color="#775a19"
          />
          <Text style={styles.scheduleScanText}>SCAN</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const AtRiskAlert = memo(function AtRiskAlert({ courses }) {
  const atRiskCourses = courses.filter((c) => (c.stats?.percentage ?? 0) < 75);
  if (atRiskCourses.length === 0) return null;

  return (
    <View style={styles.atRiskAlert}>
      <View style={styles.atRiskAlertLeft}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={20}
          color="#ba1a1a"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.atRiskAlertTitle}>ATTENDANCE WARNING</Text>
          <Text style={styles.atRiskAlertSub}>
            {atRiskCourses.length} course{atRiskCourses.length > 1 ? "s" : ""}{" "}
            below 75% threshold
            {atRiskCourses.length <= 2
              ? `: ${atRiskCourses.map((c) => c.courseCode).join(", ")}`
              : ""}
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color="#ba1a1a" />
    </View>
  );
});


export default function StudentDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Key: courseId → { markedToday: boolean }
  const [attendanceRecords, setAttendanceRecords] = useState({});

  const [overallStats, setOverallStats] = useState({
    totalCourses: 0,
    avgAttendance: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalSessions: 0,
    coursesAtRisk: 0,
  });

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  // ── Phase 2: Attendance stats + today's records (background) ──
  const fetchAttendanceStats = useCallback(async (enrolledCourses) => {
    try {
      const results = await Promise.all(
        enrolledCourses.map((c) =>
          api
            .get(`/attendance/student/course/${c._id}`)
            .then((r) => (r.data.success ? r.data.data : null))
            .catch(() => null),
        ),
      );

      const today = new Date().toDateString();

      // Build markedToday map
      const recordsMap = {};
      enrolledCourses.forEach((c, i) => {
        const data = results[i];
        if (data) {
          const todayRecord = (data.records || []).find((r) => {
            const recordDate = r.date
              ? new Date(r.date).toDateString()
              : r.session?.startTime
                ? new Date(r.session.startTime).toDateString()
                : null;
            return recordDate === today;
          });
          recordsMap[c._id] = {
            markedToday: !!todayRecord,
            sessionId: todayRecord?.session?._id || null,
          };
        } else {
          recordsMap[c._id] = { markedToday: false, sessionId: null };
        }
      });

      setAttendanceRecords(recordsMap);

      // Compute overall stats
      const validResults = results.filter((r) => r?.statistics);

      if (validResults.length > 0) {
        const totalPresent = validResults.reduce(
          (sum, r) => sum + (r.statistics?.attended || 0),
          0,
        );
        const totalAbsent = validResults.reduce(
          (sum, r) => sum + (r.statistics?.absent || 0),
          0,
        );
        const totalSessions = validResults.reduce(
          (sum, r) => sum + (r.statistics?.totalSessions || 0),
          0,
        );
        const avgAttendance = Math.round(
          validResults.reduce(
            (sum, r) => sum + (r.statistics?.percentage || 0),
            0,
          ) / validResults.length,
        );
        const coursesAtRisk = validResults.filter(
          (r) => (r.statistics?.percentage || 0) < 75,
        ).length;

        setOverallStats((prev) => ({
          ...prev,
          totalPresent,
          totalAbsent,
          totalSessions,
          avgAttendance,
          coursesAtRisk,
        }));

        // Attach stats to courses
        setCourses(
          enrolledCourses.map((c, i) => ({
            ...c,
            stats: results[i]?.statistics || null,
          })),
        );
      }
    } catch (err) {
      console.log("Stats fetch error:", err.message);
    }
  }, []);

  // ── Phase 1: Critical fetch ──
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [coursesRes, notifRes] = await Promise.all([
        api.get("/course/my-enrolled"),
        api.get("/notification/my-notifications?limit=3&page=1"),
      ]);

      if (coursesRes.data.success) {
        const enrolledCourses = coursesRes.data.data || [];

        setCourses(enrolledCourses);
        setOverallStats((prev) => ({
          ...prev,
          totalCourses: coursesRes.data.total || enrolledCourses.length,
        }));

        // Animate immediately after critical data
        Animated.parallel([
          Animated.timing(fadeIn, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideUp, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();

        // Fetch attendance + records in background
        if (enrolledCourses.length > 0) {
          fetchAttendanceStats(enrolledCourses);
        }
      }

      if (notifRes.data.success) {
        setNotifications(notifRes.data.data || []);
        setUnreadCount(notifRes.data.unreadCount || 0);
      }
    } catch (err) {
      console.log("Dashboard fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchAttendanceStats]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    fadeIn.setValue(0);
    slideUp.setValue(40);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  // ── Navigation handlers ──
  const handleCoursePress = useCallback((course) => {
    router.push({
      pathname: "/(student)/(tabs)/attendance",
      params: {
        courseId: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        t: Date.now().toString(),
      },
    });
  }, []);

  const handleViewAllCourses = useCallback(() => {
    router.push("/(student)/(tabs)/attendance");
  }, []);

  const handleNotifPress = useCallback(() => {
    router.push("/(student)/(tabs)/notifications");
  }, []);

  const handleScanPress = useCallback(() => {
    router.push("/(student)/(scan)/scan-qr");
  }, []);

  const handleAtRiskPress = useCallback(() => {
    router.push("/(student)/(tabs)/attendance");
  }, []);

  // ── Derived values ──
  const todaySchedule = getTodaySchedule(courses);
  const attendanceColor = getAttendanceColor(overallStats.avgAttendance);
  const attendanceStatus = getAttendanceStatus(overallStats.avgAttendance);

  // ── Loading ──
  if (loading) {
    return (
      <LoadingScreen
        message="Loading your dashboard..."
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ACADEMIC CURATOR</Text>
          <Text style={styles.headerLabel}>Sabaragamuwa University</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.bellBtn} onPress={handleNotifPress}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color="#00113a"
            />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(student)/profile")}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {user?.name?.charAt(0)?.toUpperCase() || "S"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#775a19"
          />
        }
      >
        <Animated.View
          style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
        >
          {/* ── Archival Header ── */}
          <View style={styles.archivalHeader}>
            <View style={styles.archivalAccent} />
            <View>
              <Text style={styles.archivalLabel}>CURRENT SEMESTER</Text>
              <Text style={styles.archivalTitle}>Dashboard</Text>
            </View>
          </View>

          {/* ── Welcome Card ── */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeCardInner}>
              <Text style={styles.welcomeGreeting}>WELCOME BACK</Text>
              <Text style={styles.welcomeName}>{user?.name || "Student"}</Text>
              <Text style={styles.welcomeSub}>
                {user?.studentId} - {user?.department}
              </Text>
              <Text style={styles.welcomeBatch}>Batch {user?.batch}</Text>
            </View>
            <MaterialCommunityIcons
              name="school-outline"
              size={48}
              color="rgba(255,255,255,0.15)"
            />
          </View>

          {/* ── Face Data Warning ── */}
          {!user?.faceDataRegistered && (
            <TouchableOpacity
              style={styles.faceWarning}
              onPress={() => router.push("/(student)/profile")}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="face-recognition"
                size={18}
                color="#ba1a1a"
              />
              <Text style={styles.faceWarningText}>
                Face data not registered — you cannot mark attendance. Tap to
                register.
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color="#ba1a1a"
              />
            </TouchableOpacity>
          )}

          {/* ── At Risk Alert ── */}
          {overallStats.coursesAtRisk > 0 && (
            <TouchableOpacity activeOpacity={0.85} onPress={handleAtRiskPress}>
              <AtRiskAlert courses={courses} />
            </TouchableOpacity>
          )}

          {/* ── Stats Grid ── */}
          <View style={styles.statsGrid}>
            {/* Wide: Overall Attendance */}
            <View
              style={[styles.statCardWide, { borderTopColor: attendanceColor }]}
            >
              <View style={styles.statCardWideLeft}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={22}
                  color={attendanceColor}
                />
                <View>
                  <Text style={styles.statLabel}>OVERALL ATTENDANCE</Text>
                  <Text
                    style={[styles.statValueLarge, { color: attendanceColor }]}
                  >
                    {overallStats.avgAttendance}%
                  </Text>
                  <Text style={styles.statSub}>{attendanceStatus}</Text>
                </View>
              </View>
              <View style={styles.statProgressWrap}>
                <View style={styles.statProgressTrack}>
                  <View
                    style={[
                      styles.statProgressFill,
                      {
                        width: `${Math.min(overallStats.avgAttendance, 100)}%`,
                        backgroundColor: attendanceColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.statProgressLabel, { color: attendanceColor }]}
                >
                  {overallStats.totalPresent}/{overallStats.totalSessions}{" "}
                  sessions
                </Text>
              </View>
            </View>

            {/* Present */}
            <StatCard
              label="PRESENT"
              value={`${overallStats.totalPresent}`}
              sub="Sessions attended"
              color="#4CAF50"
              icon="check-circle-outline"
            />

            {/* Absent */}
            <StatCard
              label="ABSENT"
              value={`${overallStats.totalAbsent}`}
              sub="Sessions missed"
              color={overallStats.totalAbsent > 0 ? "#ba1a1a" : "#757682"}
              icon="close-circle-outline"
            />

            {/* At Risk */}
            <StatCard
              label="AT RISK"
              value={`${overallStats.coursesAtRisk}`}
              sub={
                overallStats.coursesAtRisk > 0
                  ? "Courses below 75%"
                  : "All courses safe"
              }
              color={overallStats.coursesAtRisk > 0 ? "#ba1a1a" : "#4CAF50"}
              icon={
                overallStats.coursesAtRisk > 0
                  ? "alert-circle-outline"
                  : "shield-check-outline"
              }
              highlight={overallStats.coursesAtRisk > 0}
            />

            {/* Enrolled */}
            <StatCard
              label="ENROLLED"
              value={`${overallStats.totalCourses}`}
              sub="Courses this semester"
              color="#002366"
              icon="book-open-variant"
            />
          </View>

          {/* ── Scan QR CTA ── */}
          <TouchableOpacity
            style={styles.scanQRBtn}
            onPress={handleScanPress}
            activeOpacity={0.85}
          >
            <View style={styles.scanQRBtnLeft}>
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={32}
                color="#ffffff"
              />
              <View>
                <Text style={styles.scanQRBtnLabel}>MARK ATTENDANCE</Text>
                <Text style={styles.scanQRBtnSub}>
                  Scan QR - Verify Face - Confirm Location
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="rgba(255,255,255,0.6)"
            />
          </TouchableOpacity>

          {/* ── My Courses ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Courses</Text>
            <TouchableOpacity onPress={handleViewAllCourses}>
              <Text style={styles.sectionLink}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {courses.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons
                name="book-open-outline"
                size={40}
                color="#c5c6d2"
              />
              <Text style={styles.emptyText}>No courses enrolled yet</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coursesScroll}
              nestedScrollEnabled={false}
            >
              {courses.map((course) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  onPress={() => handleCoursePress(course)}
                />
              ))}
            </ScrollView>
          )}

          {/* ── Today's Schedule ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
            <Text style={styles.sectionBadge}>
              {new Date().toLocaleDateString("en-US", { weekday: "long" })}
            </Text>
          </View>

          {todaySchedule.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={40}
                color="#c5c6d2"
              />
              <Text style={styles.emptyText}>
                No classes scheduled for today
              </Text>
            </View>
          ) : (
            <View style={styles.scheduleList}>
              {todaySchedule.map((item, idx) => (
                <ScheduleRow
                  key={`sched-${idx}`}
                  item={item}
                  attendanceRecord={attendanceRecords[item.course._id]}
                  onScanPress={handleScanPress}
                />
              ))}
            </View>
          )}

          {/* ── Recent Notifications ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <TouchableOpacity onPress={handleNotifPress}>
              <Text style={styles.sectionLink}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons
                name="bell-off-outline"
                size={40}
                color="#c5c6d2"
              />
              <Text style={styles.emptyText}>No recent notifications</Text>
            </View>
          ) : (
            <View style={styles.notifList}>
              {notifications.map((n) => (
                <NotifRow
                  key={n._id}
                  notification={n}
                  onPress={handleNotifPress}
                />
              ))}
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
// STYLES
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
    borderBottomColor: "rgba(197,198,210,0.3)",
  },
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    color: "#00113a",
  },
  headerLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#775a19",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  bellBtn: { position: "relative", padding: 4 },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ba1a1a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    color: "#ffffff",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(119,90,25,0.3)",
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#002366",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    color: "#ffffff",
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },

  // ── Archival Header ──
  archivalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 20,
  },
  archivalAccent: {
    width: 2,
    height: 52,
    backgroundColor: "#775a19",
    marginTop: 2,
  },
  archivalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: "#775a19",
    marginBottom: 4,
  },
  archivalTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 36,
    color: "#00113a",
  },

  // ── Welcome Card ──
  welcomeCard: {
    backgroundColor: "#00113a",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeCardInner: { flex: 1, gap: 4 },
  welcomeGreeting: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.5)",
  },
  welcomeName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
    color: "#ffffff",
  },
  welcomeSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  welcomeBatch: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#e9c176",
    marginTop: 2,
  },

  // ── Face Warning ──
  faceWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(186,26,26,0.07)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#ba1a1a",
  },
  faceWarningText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#ba1a1a",
    flex: 1,
  },

  // ── At Risk Alert ──
  atRiskAlert: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(186,26,26,0.06)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(186,26,26,0.15)",
    borderLeftWidth: 3,
    borderLeftColor: "#ba1a1a",
  },
  atRiskAlertLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  atRiskAlertTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    color: "#ba1a1a",
  },
  atRiskAlertSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    marginTop: 2,
    flex: 1,
  },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCardWide: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  statCardWideLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
    marginBottom: 4,
  },
  statValueLarge: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 36,
  },
  statSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },
  statProgressWrap: { gap: 6 },
  statProgressTrack: {
    height: 6,
    backgroundColor: "#f3f3f3",
    borderRadius: 3,
    overflow: "hidden",
  },
  statProgressFill: { height: "100%", borderRadius: 3 },
  statProgressLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statCardHighlight: {
    backgroundColor: "#ba1a1a",
    borderColor: "#ba1a1a",
  },
  statCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  statCardLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
    textTransform: "uppercase",
  },
  statCardLabelHighlight: { color: "rgba(255,255,255,0.7)" },
  statCardValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
  },
  statCardSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  statCardSubHighlight: { color: "rgba(255,255,255,0.7)" },

  // ── Scan QR Button ──
  scanQRBtn: {
    backgroundColor: "#775a19",
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    shadowColor: "#775a19",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  scanQRBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  scanQRBtnLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2,
    color: "#ffffff",
    marginBottom: 3,
  },
  scanQRBtnSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },

  // ── Section Headers ──
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
  },
  sectionLink: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#775a19",
  },
  sectionBadge: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
  },

  // ── Empty Card ──
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  emptyText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
  },

  // ── Courses Scroll ──
  coursesScroll: { gap: 12, marginBottom: 20, paddingRight: 20 },
  courseCard: {
    width: 200,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  courseCardStrip: { height: 4, width: "100%" },
  courseCardInner: { padding: 14, gap: 5 },
  courseCardBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseCodeBadge: {
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
    fontSize: 16,
    color: "#00113a",
    lineHeight: 22,
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
  courseAttendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  courseAttendancePct: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    minWidth: 36,
  },
  courseAttendanceTrack: {
    flex: 1,
    height: 5,
    backgroundColor: "#f3f3f3",
    borderRadius: 3,
    overflow: "hidden",
  },
  courseAttendanceFill: { height: "100%", borderRadius: 3 },
  courseAttendanceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  courseAttendanceLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 9,
    color: "#c5c6d2",
    letterSpacing: 0.5,
  },
  courseAbsentBadge: {
    backgroundColor: "rgba(186,26,26,0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  courseAbsentText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    color: "#ba1a1a",
    letterSpacing: 0.5,
  },

  // ── Schedule ──
  scheduleList: { gap: 10, marginBottom: 20 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    overflow: "hidden",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  scheduleRowOngoing: {
    borderColor: "rgba(119,90,25,0.25)",
    backgroundColor: "rgba(119,90,25,0.02)",
  },
  scheduleRowMarked: {
    borderColor: "rgba(76,175,80,0.25)",
    backgroundColor: "rgba(76,175,80,0.02)",
  },
  scheduleRowExpired: {
    opacity: 0.6,
    backgroundColor: "#f7f7f7",
  },

  // Top strips
  scheduleOngoingStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#775a19",
  },
  scheduleMarkedStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#4CAF50",
  },

  scheduleTime: { alignItems: "center", minWidth: 50 },
  scheduleTimeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    color: "#00113a",
  },
  scheduleTimeSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  scheduleAccent: { width: 2, height: 40, borderRadius: 1 },
  scheduleInfo: { flex: 1, gap: 2 },
  scheduleCourseName: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
  },
  scheduleCourseCode: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#002366",
  },
  scheduleVenue: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },

  // Right-side badges/buttons
  scheduleOngoingActions: {
    alignItems: "right",
    gap: 6,
  },
  scheduleNowBadge: {
    flexDirection: "row",
    alignSelf: "flex-end",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(119,90,25,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scheduleOngoingDot: {
    width: 4,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#775a19",
  },
  scheduleOngoingText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    letterSpacing: 1,
    color: "#775a19",
  },
  scheduleMarkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(76,175,80,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.2)",
  },
  scheduleMarkedText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#4CAF50",
  },
  scheduleExpiredBadge: {
    backgroundColor: "rgba(197,198,210,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  scheduleExpiredText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#a0a1ad",
  },
  scheduleScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(119,90,25,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  scheduleScanText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#775a19",
  },

  // ── Notifications ──
  notifList: { gap: 8, marginBottom: 20 },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    position: "relative",
  },
  notifRowUnread: {
    borderColor: "rgba(119,90,25,0.2)",
    backgroundColor: "rgba(119,90,25,0.02)",
  },
  notifUnreadDot: {
    position: "absolute",
    top: 14,
    left: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#775a19",
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  notifContent: { flex: 1 },
  notifTitle: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: "#757682",
    marginBottom: 2,
  },
  notifTitleUnread: {
    fontFamily: "Manrope_700Bold",
    color: "#00113a",
  },
  notifMessage: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#c5c6d2",
  },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },

  textMuted: { color: "#a0a1ad" },

  // ── Footer ──
  footerText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 7,
    letterSpacing: 3,
    color: "#757682",
    textAlign: "center",
    opacity: 0.3,
    marginTop: 12,
  },
});
