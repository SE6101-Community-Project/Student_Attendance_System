import { useLocalSearchParams, router } from 'expo-router';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import api from '@/src/api/axiosInstance';

export default function CourseDetail() {
  const { courseId, courseCode, courseName } = useLocalSearchParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetail();
  }, []);

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/course/${courseId}`);
      if (res.data.success) {
        setCourse(res.data.data);
      }
    } catch (err) {
      console.log('Course detail error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#775a19" />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Course not found</Text>
      </View>
    );
  }

  const attendancePercent = course.totalLectures > 0
    ? Math.round((course.lecturesCompleted / course.totalLectures) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00113a" />
      <SafeAreaView style={styles.safeArea}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerCode}>{course.courseCode}</Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {course.courseName}
            </Text>
          </View>
          <View style={[
            styles.headerBadge,
            { backgroundColor: course.isActive ? '#4CAF5030' : '#75768230' }
          ]}>
            <Text style={[
              styles.headerBadgeText,
              { color: course.isActive ? '#4CAF50' : '#757682' }
            ]}>
              {course.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Info Cards ── */}
          <View style={styles.infoGrid}>
            <InfoTile icon="school-outline" label="Department" value={course.department} />
            <InfoTile icon="layers-outline" label="Semester" value={`Semester ${course.semester}`} />
            <InfoTile icon="calendar-range" label="Academic Year" value={course.academicYear} />
            <InfoTile icon="account-group" label="Batch" value={course.batch} />
            <InfoTile icon="star-circle-outline" label="Credits" value={`${course.credits} Credits`} />
            <InfoTile icon="book-variant" label="Type" value={course.courseType || 'Theory'} />
          </View>

          {/* ── Venue ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color="#775a19" />
              <Text style={styles.cardTitle}>Venue</Text>
            </View>
            <Text style={styles.cardValue}>{course.venue || 'TBA'}</Text>
          </View>

          {/* ── Schedule ── */}
          {course.schedule?.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#775a19" />
                <Text style={styles.cardTitle}>Schedule</Text>
              </View>
              {course.schedule.map((s, i) => (
                <View key={i} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDay}>{s.day}</Text>
                  <Text style={styles.scheduleTime}>{s.startTime} – {s.endTime}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Progress ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="chart-line" size={18} color="#775a19" />
              <Text style={styles.cardTitle}>Lecture Progress</Text>
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {course.lecturesCompleted} / {course.totalLectures} lectures completed
              </Text>
              <Text style={styles.progressPercent}>{attendancePercent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${attendancePercent}%` }]} />
            </View>
            <Text style={styles.progressThreshold}>
              Attendance threshold: {course.attendanceThreshold}%
            </Text>
          </View>

          {/* ── Enrolled Students ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account-group-outline" size={18} color="#775a19" />
              <Text style={styles.cardTitle}>Enrolled Students</Text>
            </View>
            <Text style={styles.enrolledCount}>
              {course.enrolledStudents?.length || 0} students enrolled
            </Text>
          </View>

          {/* ── Description ── */}
          {course.description ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="text-box-outline" size={18} color="#775a19" />
                <Text style={styles.cardTitle}>Description</Text>
              </View>
              <Text style={styles.descriptionText}>{course.description}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const InfoTile = ({ icon, label, value }) => (
  <View style={styles.infoTile}>
    <MaterialCommunityIcons name={icon} size={16} color="#775a19" />
    <Text style={styles.infoTileLabel}>{label}</Text>
    <Text style={styles.infoTileValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  safeArea: { flex: 1 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9',
  },
  errorText: { fontFamily: 'Manrope_400Regular', color: '#757682' },

  // Header
  header: {
    backgroundColor: '#00113a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerCode: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  headerName: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 18,
    color: '#ffffff',
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
  },

  scrollContent: { padding: 20, gap: 16, paddingBottom: 40 },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
  },
  infoTileLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#757682',
    textTransform: 'uppercase',
  },
  infoTileValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#00113a',
  },

  // Cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 1,
    color: '#00113a',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: '#00113a',
  },

  // Schedule
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197,198,210,0.2)',
  },
  scheduleDay: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#00113a',
  },
  scheduleTime: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#757682',
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#757682',
  },
  progressPercent: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#00113a',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e8e8e8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#775a19',
    borderRadius: 3,
  },
  progressThreshold: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#c5c6d2',
    letterSpacing: 0.5,
  },
  enrolledCount: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 20,
    color: '#00113a',
  },
  descriptionText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#757682',
    lineHeight: 20,
  },
});