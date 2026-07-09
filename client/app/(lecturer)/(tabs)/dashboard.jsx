import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/api/axiosInstance';
import LoadingScreen from '../../../src/components/LoadingScreen';

// ══════════════════════════════════════════════════════════
// STATIC DATA (outside component — never recreated)
// ══════════════════════════════════════════════════════════
const QUICK_ACTIONS = [
  { icon: 'qrcode-plus',     label: 'New Session', color: '#002366', path: '/(lecturer)/sessions' },
  { icon: 'chart-bar',       label: 'Analytics',   color: '#775a19', path: '/(lecturer)/(tabs)/analytics' },
  { icon: 'history',         label: 'Audit Logs',  color: '#444650', path: '/(lecturer)/(tabs)/logs' },
  { icon: 'bell-plus-outline', label: 'Notify',    color: '#00113a', path: '/(lecturer)/(tabs)/notifications' },
];

// ── Formatters (outside component — never recreated) ──
const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// ══════════════════════════════════════════════════════════
// MEMOIZED SUB-COMPONENTS
// ══════════════════════════════════════════════════════════

// ── Schedule Card ──
const ScheduleCard = memo(function ScheduleCard({ item, onPress }) {
  const parseTimeToday = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const now = new Date();
  const startTime = parseTimeToday(item.startTime);
  const endTime = parseTimeToday(item.endTime);
  const isExpired = endTime && now > endTime;
  const isOngoing = startTime && endTime && now >= startTime && now <= endTime;

  return (
    <TouchableOpacity
      style={[
        styles.scheduleCard,
        isExpired && styles.scheduleCardExpired,
        isOngoing && styles.scheduleCardOngoing,
      ]}
      onPress={isExpired ? null : onPress}
      activeOpacity={isExpired ? 1 : 0.8}
    >
      {/* Top status strip */}
      {isExpired && <View style={styles.scheduleExpiredTopStrip} />}
      {isOngoing && <View style={styles.scheduleOngoingTopStrip} />}

      {/* Time column */}
      <View style={styles.scheduleTimeCol}>
        <Text style={[styles.scheduleStart, isExpired && styles.textMuted]}>
          {item.startTime}
        </Text>
        <Text style={[styles.scheduleEnd, isExpired && styles.textMuted]}>
          {item.endTime}
        </Text>
      </View>

      {/* Vertical accent bar */}
      <View
        style={[
          styles.scheduleAccent,
          {
            backgroundColor: isExpired
              ? '#c5c6d2'
              : isOngoing
                ? '#4CAF50'
                : '#775a19',
          },
        ]}
      />

      {/* Course info */}
      <View style={styles.scheduleInfo}>
        <View
          style={[
            styles.scheduleCodeBadge,
            isExpired && styles.scheduleCodeBadgeExpired,
            isOngoing && styles.scheduleCodeBadgeOngoing,
          ]}
        >
          <Text
            style={[
              styles.scheduleCodeText,
              isExpired && styles.scheduleCodeTextExpired,
              isOngoing && styles.scheduleCodeTextOngoing,
            ]}
          >
            {item.course.courseCode}
          </Text>
        </View>
        <Text
          style={[styles.scheduleCourseName, isExpired && styles.textMuted]}
          numberOfLines={1}
        >
          {item.course.courseName}
        </Text>
        <Text style={styles.scheduleVenue}>
          {item.course.venue || 'Venue TBA'}
        </Text>
      </View>

      {/* Right action area */}
      {isExpired ? (
        <View style={styles.scheduleExpiredBadge}>
          <MaterialCommunityIcons name="clock-remove-outline" size={18} color="#c5c6d2" />
          <Text style={styles.scheduleExpiredText}>EXPIRED</Text>
        </View>
      ) : isOngoing ? (
        <TouchableOpacity
          style={styles.scheduleQrBtnOngoing}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={styles.ongoingPulseDot} />
          <MaterialCommunityIcons name="qrcode-plus" size={18} color="#4CAF50" />
          <Text style={styles.scheduleQrBtnTextOngoing}>LIVE</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.scheduleQrBtn}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="qrcode-plus" size={18} color="#002366" />
          <Text style={styles.scheduleQrBtnText}>START</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

// ── Course Card ──
const CourseCard = memo(function CourseCard({ course, onPress }) {
  return (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.courseCardHeader}>
        <View style={styles.courseCardBadge}>
          <Text style={styles.courseCardCode}>{course.courseCode}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#c5c6d2" />
      </View>
      <Text style={styles.courseCardName} numberOfLines={2}>
        {course.courseName}
      </Text>
      <Text style={styles.courseCardMeta}>
        {course.enrolledStudents?.length || 0} students · Sem {course.semester}
      </Text>
      <View style={styles.courseCardDivider} />
      <View style={styles.courseCardFooter}>
        <View
          style={[
            styles.courseStatusDot,
            { backgroundColor: course.isActive ? '#4CAF50' : '#c5c6d2' },
          ]}
        />
        <Text style={styles.courseStatusText}>
          {course.isActive ? 'Active' : 'Inactive'}
        </Text>
        <Text style={styles.courseCardType}>{course.courseType || 'Theory'}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Session Row ──
const SessionRow = memo(function SessionRow({ session, onPress }) {
  const isLive = session.isActive && !session.isClosed;
  return (
    <TouchableOpacity
      style={[styles.sessionRow, isLive && styles.sessionRowLive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.sessionStatusDot,
          { backgroundColor: isLive ? '#4CAF50' : '#c5c6d2' },
        ]}
      />
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {session.course?.courseCode} ·{' '}
          {session.lectureTitle || `Lecture ${session.lectureNumber}`}
        </Text>
        <Text style={styles.sessionMeta}>
          {formatDate(session.startTime)} · {session.venue}
        </Text>
        <Text style={styles.sessionLectureNum}>
          Lecture #{session.lectureNumber}
        </Text>
      </View>
      <View style={styles.sessionRowRight}>
        <View
          style={[
            styles.sessionBadge,
            { backgroundColor: isLive ? 'rgba(76,175,80,0.1)' : '#f3f3f3' },
          ]}
        >
          <Text
            style={[
              styles.sessionBadgeText,
              { color: isLive ? '#4CAF50' : '#757682' },
            ]}
          >
            {isLive ? 'LIVE' : 'CLOSED'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#c5c6d2" />
      </View>
    </TouchableOpacity>
  );
});

// ── Quick Action ──
const QuickAction = memo(function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}12` }]}>
        <MaterialCommunityIcons name={icon} size={26} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
});

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function LecturerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalCourses: 0,
    activeSessions: 0,
    totalSessionsConducted: 0,
    studentsAtRisk: 0,
    avgAttendance: 0,
    totalEnrolled: 0,
  });

  const [myCourses, setMyCourses] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  // ── Stable navigation callbacks ──
  const handleSchedulePress = useCallback((item) => {
    router.push({
      pathname: '/(lecturer)/sessions',
      params: {
        openCreate: 'true',
        courseId: item.course._id,
        courseCode: item.course.courseCode,
        courseName: item.course.courseName,
      },
    });
  }, []);

  const handleCoursePress = useCallback((course) => {
    router.push({
      pathname: '/(lecturer)/course-detail',
      params: {
        courseId: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
      },
    });
  }, []);

  const handleSessionPress = useCallback((session) => {
    router.push({
      pathname: '/(lecturer)/session-detail',
      params: { sessionId: session.sessionId },
    });
  }, []);

  // ── Phase 2: Background fetch (non-blocking) ──
  const fetchSecondaryData = useCallback(async (coursesData) => {
    try {
      const promises = [
        api.get('/qrsession/my-sessions?limit=5&page=1'),
        ...coursesData.map((c) =>
          api
            .get(`/attendance/report/course/${c._id}`)
            .then((r) => (r.data.success ? r.data.data : null))
            .catch(() => null),
        ),
      ];

      const [sessionsRes, ...analyticsResults] = await Promise.all(promises);

      // Update recent sessions
      if (sessionsRes.data.success) {
        setRecentSessions(sessionsRes.data.data || []);
      }

      // Process analytics
      const validReports = analyticsResults.filter(Boolean);
      if (validReports.length > 0) {
        const avgAttendance = parseFloat(
          (
            validReports.reduce(
              (sum, r) => sum + parseFloat(r.averageAttendance || 0),
              0,
            ) / validReports.length
          ).toFixed(1),
        );
        const studentsAtRisk = validReports.reduce(
          (sum, r) => sum + (r.defaultersCount || 0),
          0,
        );
        setStats((prev) => ({ ...prev, avgAttendance, studentsAtRisk }));
      }
    } catch (err) {
      console.log('fetchSecondaryData error:', err.message);
    }
  }, []);

  // ── Phase 1: Critical data fetch ──
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [coursesRes, activeSessionsRes, allSessionsRes] = await Promise.all([
        api.get('/course/my-courses'),
        api.get('/qrsession/my-sessions?isActive=true&isClosed=false&limit=1&page=1'),
        api.get('/qrsession/my-sessions?limit=1&page=1'),
      ]);

      if (coursesRes.data.success) {
        const coursesData = coursesRes.data.data || [];
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        const todaySched = coursesData.flatMap((c) =>
          (c.schedule || [])
            .filter((s) => s.day === today)
            .map((s) => ({ ...s, course: c })),
        );

        // Batch all critical state updates together
        setMyCourses(coursesData);
        setTodaySchedule(todaySched);
        setStats((prev) => ({
          ...prev,
          totalCourses: coursesRes.data.total || coursesData.length,
          totalEnrolled: coursesRes.data.uniqueStudentCount || 0,
          activeSessions: activeSessionsRes.data.success
            ? activeSessionsRes.data.pagination?.total || 0
            : prev.activeSessions,
          totalSessionsConducted: allSessionsRes.data.success
            ? allSessionsRes.data.pagination?.total || 0
            : prev.totalSessionsConducted,
        }));

        // Animate UI as soon as critical data is ready
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

        // Fetch secondary data in background (does NOT block UI)
        fetchSecondaryData(coursesData);
      }
    } catch (err) {
      console.log('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchSecondaryData]);

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

  // ── Derived value (computed once per render, not on every child render) ──
  const attendanceColor =
    stats.avgAttendance >= 80
      ? '#4CAF50'
      : stats.avgAttendance >= 60
        ? '#F59E0B'
        : '#ba1a1a';

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LoadingScreen
          message="Loading dashboard..."
          submessage="Fetching courses, sessions, and analytics"
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
          <View>
            <Text style={styles.headerTitle}>Academic Curator</Text>
            <Text style={styles.headerSubtitle}>SABARAGAMUWA UNIVERSITY</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(lecturer)/profile')}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'L'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
                <Text style={styles.archivalLabel}>INSTITUTIONAL OVERVIEW</Text>
                <Text style={styles.archivalTitle}>Dashboard</Text>
              </View>
            </View>

            {/* ── Welcome Card ── */}
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeCardInner}>
                <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
                <Text style={styles.welcomeName}>{user?.name || 'Lecturer'}</Text>
                <Text style={styles.welcomeRole}>
                  {user?.designation || 'Lecturer'} · {user?.department || 'Department'}
                </Text>
                <Text style={styles.welcomeLecturerId}>{user?.lecturerId}</Text>
              </View>
              <MaterialCommunityIcons
                name="human-male-board"
                size={44}
                color="rgba(255,255,255,0.15)"
              />
            </View>

            {/* ── Active Session Alert ── */}
            {stats.activeSessions > 0 && (
              <TouchableOpacity
                style={styles.activeSessionAlert}
                onPress={() => router.push('/(lecturer)/sessions')}
                activeOpacity={0.85}
              >
                <View style={styles.activeSessionAlertLeft}>
                  <View style={styles.liveIndicator} />
                  <View>
                    <Text style={styles.activeSessionAlertTitle}>
                      LIVE SESSION ACTIVE
                    </Text>
                    <Text style={styles.activeSessionAlertSub}>
                      {stats.activeSessions} session
                      {stats.activeSessions > 1 ? 's' : ''} currently running
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#4CAF50"
                />
              </TouchableOpacity>
            )}

            {/* ── Stats Grid ── */}
            <View style={styles.statsGrid}>

              {/* My Courses */}
              <View style={[styles.statCard, { borderTopColor: '#00113a' }]}>
                <MaterialCommunityIcons name="book-open-variant" size={20} color="#00113a" />
                <Text style={styles.statLabel}>MY COURSES</Text>
                <Text style={[styles.statValue, { color: '#00113a' }]}>
                  {stats.totalCourses}
                </Text>
                <Text style={styles.statSub}>Assigned this semester</Text>
              </View>

              {/* My Students */}
              <View style={[styles.statCard, { borderTopColor: '#775a19' }]}>
                <MaterialCommunityIcons name="account-group-outline" size={20} color="#775a19" />
                <Text style={styles.statLabel}>MY STUDENTS</Text>
                <Text style={[styles.statValue, { color: '#775a19' }]}>
                  {stats.totalEnrolled}
                </Text>
                <Text style={styles.statSub}>Unique students across all courses</Text>
              </View>

              {/* Avg Attendance */}
              <View style={[styles.statCard, { borderTopColor: attendanceColor }]}>
                <MaterialCommunityIcons name="chart-line" size={20} color={attendanceColor} />
                <Text style={styles.statLabel}>AVG ATTENDANCE</Text>
                <Text style={[styles.statValue, { color: attendanceColor }]}>
                  {stats.avgAttendance}%
                </Text>
                <Text style={styles.statSub}>
                  {stats.avgAttendance >= 80
                    ? 'Distinguished'
                    : stats.avgAttendance >= 60
                      ? 'Satisfactory'
                      : 'Needs Attention'}
                </Text>
              </View>

              {/* At Risk */}
              <View
                style={[
                  styles.statCard,
                  { borderTopColor: stats.studentsAtRisk > 0 ? '#ba1a1a' : '#4CAF50' },
                ]}
              >
                <MaterialCommunityIcons
                  name={stats.studentsAtRisk > 0 ? 'alert-circle-outline' : 'check-circle-outline'}
                  size={20}
                  color={stats.studentsAtRisk > 0 ? '#ba1a1a' : '#4CAF50'}
                />
                <Text style={styles.statLabel}>AT RISK</Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: stats.studentsAtRisk > 0 ? '#ba1a1a' : '#4CAF50' },
                  ]}
                >
                  {stats.studentsAtRisk}
                </Text>
                <Text style={styles.statSub}>
                  {stats.studentsAtRisk > 0
                    ? 'Students below threshold'
                    : 'All students on track'}
                </Text>
              </View>

              {/* Sessions Conducted */}
              <View style={[styles.statCardWide, { borderTopColor: '#002366' }]}>
                <View style={styles.statCardWideLeft}>
                  <MaterialCommunityIcons name="broadcast" size={20} color="#002366" />
                  <View>
                    <Text style={styles.statLabel}>SESSIONS CONDUCTED</Text>
                    <Text style={[styles.statValue, { color: '#002366' }]}>
                      {stats.totalSessionsConducted}
                    </Text>
                    <Text style={styles.statSub}>Total sessions this semester</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.statCardWideBtn}
                  onPress={() => router.push('/(lecturer)/sessions')}
                >
                  <Text style={styles.statCardWideBtnText}>NEW +</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Today's Schedule ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
              <Text style={styles.sectionBadge}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </Text>
            </View>

            {todaySchedule.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons
                  name="calendar-blank-outline"
                  size={36}
                  color="#c5c6d2"
                />
                <Text style={styles.emptyText}>No classes scheduled for today</Text>
              </View>
            ) : (
              <View style={styles.scheduleList}>
                {todaySchedule.map((item, idx) => (
                  <ScheduleCard
                    key={`sched-${idx}`}
                    item={item}
                    onPress={() => handleSchedulePress(item)}
                  />
                ))}
              </View>
            )}

            {/* ── My Courses ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Courses</Text>
              <TouchableOpacity
                onPress={() => router.push('/(lecturer)/(tabs)/analytics')}
              >
                <Text style={styles.sectionLink}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>

            {myCourses.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons
                  name="book-open-outline"
                  size={36}
                  color="#c5c6d2"
                />
                <Text style={styles.emptyText}>No courses assigned yet</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.coursesScroll}
                nestedScrollEnabled={false}
              >
                {myCourses.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    onPress={() => handleCoursePress(course)}
                  />
                ))}
              </ScrollView>
            )}

            {/* ── Recent Sessions ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              <TouchableOpacity onPress={() => router.push('/(lecturer)/sessions')}>
                <Text style={styles.sectionLink}>VIEW ALL</Text>
              </TouchableOpacity>
            </View>

            {recentSessions.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons
                  name="broadcast-off"
                  size={36}
                  color="#c5c6d2"
                />
                <Text style={styles.emptyText}>No sessions created yet</Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => router.push('/(lecturer)/sessions')}
                >
                  <MaterialCommunityIcons name="plus" size={14} color="#ffffff" />
                  <Text style={styles.emptyActionBtnText}>CREATE SESSION</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.sessionsList}>
                {recentSessions.map((session) => (
                  <SessionRow
                    key={session._id}
                    session={session}
                    onPress={() => handleSessionPress(session)}
                  />
                ))}
              </View>
            )}

            {/* ── Quick Actions ── */}
            <Text style={styles.sectionTitleFull}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <QuickAction
                  key={action.label}
                  icon={action.icon}
                  label={action.label}
                  color={action.color}
                  onPress={() => router.push(action.path)}
                />
              ))}
            </View>

            <Text style={styles.footerText}>
              © SABARAGAMUWA UNIVERSITY OF SRI LANKA
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  safeArea: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197,198,210,0.3)',
  },
  headerTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 20,
    color: '#00113a',
  },
  headerSubtitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 3,
    color: '#775a19',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(119,90,25,0.3)',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#002366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#ffffff',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // ── Archival Header ──
  archivalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  archivalAccent: {
    width: 2,
    height: 48,
    backgroundColor: '#775a19',
    marginTop: 2,
  },
  archivalLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#775a19',
    marginBottom: 4,
  },
  archivalTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 36,
    color: '#00113a',
  },

  // ── Welcome Card ──
  welcomeCard: {
    backgroundColor: '#00113a',
    borderRadius: 14,
    padding: 24,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeCardInner: { flex: 1, gap: 4 },
  welcomeLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.5)',
  },
  welcomeName: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 26,
    color: '#ffffff',
  },
  welcomeRole: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  welcomeLecturerId: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    color: '#e9c176',
    marginTop: 2,
  },

  // ── Active Session Alert ──
  activeSessionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  activeSessionAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  activeSessionAlertTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#4CAF50',
  },
  activeSessionAlertSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#757682',
    marginTop: 1,
  },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  statCardWide: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardWideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 2,
    color: '#757682',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  statValue: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 28,
  },
  statSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#757682',
  },
  statCardWideBtn: {
    backgroundColor: '#002366',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  statCardWideBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#ffffff',
  },

  // ── Section Headers ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 22,
    color: '#00113a',
  },
  sectionTitleFull: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 22,
    color: '#00113a',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionLink: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#775a19',
  },
  sectionBadge: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    color: '#757682',
  },

  // ── Empty Card ──
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
  },
  emptyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#757682',
    textAlign: 'center',
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#002366',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  emptyActionBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#ffffff',
  },

  // ── Schedule ──
  scheduleList: { gap: 10, marginBottom: 20 },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
    overflow: 'hidden',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  scheduleCardExpired: {
    backgroundColor: '#f7f7f7',
    borderColor: 'rgba(197,198,210,0.15)',
    opacity: 0.65,
  },
  scheduleCardOngoing: {
    borderColor: 'rgba(76,175,80,0.3)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(76,175,80,0.02)',
  },
  scheduleExpiredTopStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c5c6d2',
  },
  scheduleOngoingTopStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4CAF50',
  },
  scheduleTimeCol: {
    alignItems: 'center',
    minWidth: 48,
  },
  scheduleStart: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: '#00113a',
  },
  scheduleEnd: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#757682',
  },
  scheduleAccent: {
    width: 2,
    height: 40,
    borderRadius: 1,
  },
  scheduleInfo: { flex: 1, gap: 3 },
  scheduleCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,35,102,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scheduleCodeBadgeExpired: {
    backgroundColor: 'rgba(197,198,210,0.2)',
  },
  scheduleCodeBadgeOngoing: {
    backgroundColor: 'rgba(76,175,80,0.12)',
  },
  scheduleCodeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    color: '#002366',
  },
  scheduleCodeTextExpired: { color: '#a0a1ad' },
  scheduleCodeTextOngoing: { color: '#2e7d32' },
  scheduleCourseName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#00113a',
  },
  scheduleVenue: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#757682',
  },
  scheduleQrBtn: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,35,102,0.06)',
    borderRadius: 8,
  },
  scheduleQrBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 1,
    color: '#002366',
  },
  scheduleQrBtnOngoing: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
  },
  scheduleQrBtnTextOngoing: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 1,
    color: '#4CAF50',
  },
  ongoingPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  scheduleExpiredBadge: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(197,198,210,0.12)',
    borderRadius: 8,
  },
  scheduleExpiredText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 1,
    color: '#a0a1ad',
  },
  textMuted: { color: '#a0a1ad' },

  // ── Courses ──
  coursesScroll: { gap: 12, marginBottom: 20, paddingRight: 4 },
  courseCard: {
    width: 190,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
  },
  courseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  courseCardBadge: {
    backgroundColor: 'rgba(0,35,102,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  courseCardCode: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: '#002366',
  },
  courseCardName: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 16,
    color: '#00113a',
    lineHeight: 22,
    marginBottom: 6,
  },
  courseCardMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#757682',
    marginBottom: 12,
  },
  courseCardDivider: {
    height: 1,
    backgroundColor: 'rgba(197,198,210,0.3)',
    marginBottom: 10,
  },
  courseCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courseStatusDot: { width: 6, height: 6, borderRadius: 3 },
  courseStatusText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    color: '#757682',
    textTransform: 'uppercase',
    flex: 1,
  },
  courseCardType: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    color: '#c5c6d2',
    letterSpacing: 0.5,
  },

  // ── Sessions ──
  sessionsList: { gap: 10, marginBottom: 20 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
  },
  sessionRowLive: {
    borderColor: 'rgba(76,175,80,0.2)',
    backgroundColor: 'rgba(76,175,80,0.02)',
  },
  sessionStatusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  sessionInfo: { flex: 1 },
  sessionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#00113a',
    marginBottom: 3,
  },
  sessionMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#757682',
    marginBottom: 2,
  },
  sessionLectureNum: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#c5c6d2',
    letterSpacing: 0.5,
  },
  sessionRowRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  sessionBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 1,
  },

  // ── Quick Actions ──
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  footerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 7,
    letterSpacing: 3,
    color: '#757682',
    textAlign: 'center',
    opacity: 0.3,
    marginTop: 8,
  },
});