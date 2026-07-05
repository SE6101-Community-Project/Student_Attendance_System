import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/src/api/axiosInstance';

export default function StudentDetail() {
  const { userId } = useLocalSearchParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentDetail();
  }, []);

  const fetchStudentDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/student/${userId}`);
      if (res.data.success) {
        setStudent(res.data.data);
      }
    } catch (err) {
      console.log('Student detail error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#775a19" />
        <Text style={styles.loadingText}>Loading Student...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="account-off-outline" size={48} color="#c5c6d2" />
        <Text style={styles.errorText}>Student not found</Text>
        <TouchableOpacity style={styles.backBtnCenter} onPress={() => router.back()}>
          <Text style={styles.backBtnCenterText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive   = student.isActive !== false;
  const isVerified = student.isVerified === true;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00113a" />
      <SafeAreaView style={styles.safeArea}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Profile</Text>
          <View style={[
            styles.headerBadge,
            { backgroundColor: isActive ? '#4CAF5030' : '#75768230' },
          ]}>
            <Text style={[
              styles.headerBadgeText,
              { color: isActive ? '#4CAF50' : '#757682' },
            ]}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile Card ── */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {student.profileImage ? (
                <Image
                  source={{ uri: student.profileImage }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <View style={[
                styles.statusDot,
                { backgroundColor: isActive ? '#4CAF50' : '#F59E0B' },
              ]} />
            </View>

            <Text style={styles.profileName}>{student.name}</Text>
            <Text style={styles.profileId}>{student.studentId}</Text>

            {/* Status chips */}
            <View style={styles.chipRow}>
              <View style={[
                styles.chip,
                { backgroundColor: isVerified ? '#E8F5E9' : '#FFF8E1' },
              ]}>
                <MaterialCommunityIcons
                  name={isVerified ? 'check-circle' : 'clock-outline'}
                  size={12}
                  color={isVerified ? '#2E7D32' : '#F57F17'}
                />
                <Text style={[
                  styles.chipText,
                  { color: isVerified ? '#2E7D32' : '#F57F17' },
                ]}>
                  {isVerified ? 'Verified' : 'Unverified'}
                </Text>
              </View>

              <View style={[
                styles.chip,
                {
                  backgroundColor: student.faceDataRegistered
                    ? '#E8F5E9'
                    : '#f3f3f3',
                },
              ]}>
                <MaterialCommunityIcons
                  name={student.faceDataRegistered ? 'face-recognition' : 'emoticon-sad-outline'}
                  size={12}
                  color={student.faceDataRegistered ? '#2E7D32' : '#757682'}
                />
                <Text style={[
                  styles.chipText,
                  { color: student.faceDataRegistered ? '#2E7D32' : '#757682' },
                ]}>
                  {student.faceDataRegistered ? 'Face Registered' : 'No Face Data'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Info Grid ── */}
          <View style={styles.infoGrid}>
            <InfoTile icon="school-outline"       label="Department"     value={student.department} />
            <InfoTile icon="account-group"        label="Batch"          value={student.batch} />
            <InfoTile icon="email-outline"         label="Email"          value={student.email} />
            <InfoTile icon="phone-outline"         label="Mobile"         value={student.mobile || '—'} />
          </View>

          {/* ── Enrolled Courses ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="book-open-variant" size={18} color="#775a19" />
              <Text style={styles.cardTitle}>Enrolled Courses</Text>
              <View style={styles.cardCount}>
                <Text style={styles.cardCountText}>
                  {student.courses?.length || 0}
                </Text>
              </View>
            </View>

            {student.courses?.length === 0 ? (
              <Text style={styles.emptyCardText}>No courses enrolled</Text>
            ) : (
              student.courses?.map((course, i) => (
                <View key={course._id || i} style={styles.courseRow}>
                  <View style={styles.courseRowBadge}>
                    <Text style={styles.courseRowCode}>
                      {course.courseCode || 'N/A'}
                    </Text>
                  </View>
                  <Text style={styles.courseRowName} numberOfLines={1}>
                    {course.courseName || '—'}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* ── Account Info ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="shield-account-outline" size={18} color="#775a19" />
              <Text style={styles.cardTitle}>Account Info</Text>
            </View>
            <InfoRow
              label="Registered"
              value={
                student.createdAt
                  ? new Date(student.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })
                  : '—'
              }
            />
            <InfoRow
              label="Last Updated"
              value={
                student.updatedAt
                  ? new Date(student.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })
                  : '—'
              }
            />
            <InfoRow label="Account Status"  value={isActive   ? 'Active'   : 'Deactivated'} />
            <InfoRow label="Email Verified"  value={isVerified ? 'Yes'      : 'Pending'}     />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Sub-components ──
const InfoTile = ({ icon, label, value }) => (
  <View style={styles.infoTile}>
    <MaterialCommunityIcons name={icon} size={16} color="#775a19" />
    <Text style={styles.infoTileLabel}>{label}</Text>
    <Text style={styles.infoTileValue} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoRowLabel}>{label}</Text>
    <Text style={styles.infoRowValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f9f9f9' },
  safeArea:         { flex: 1 },
  loadingContainer: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', backgroundColor: '#f9f9f9', gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope_400Regular', fontSize: 14,
    color: '#757682', letterSpacing: 1,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular', fontSize: 14, color: '#757682',
  },
  backBtnCenter: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, backgroundColor: '#00113a',
  },
  backBtnCenterText: {
    fontFamily: 'Manrope_700Bold', fontSize: 13, color: '#ffffff',
  },

  // Header
  header: {
    backgroundColor: '#00113a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn:     { padding: 4 },
  headerTitle: {
    flex: 1,
    fontFamily: 'Newsreader_400Regular',
    fontSize: 20,
    color: '#ffffff',
  },
  headerBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  headerBadgeText: {
    fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 1,
  },

  scrollContent: { padding: 20, gap: 16, paddingBottom: 40 },

  // Profile card
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
    gap: 8,
  },
  avatarWrap:    { position: 'relative', marginBottom: 4 },
  avatarImg: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: 'rgba(119,90,25,0.2)',
  },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#002366', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(119,90,25,0.2)',
  },
  avatarFallbackText: {
    fontFamily: 'Manrope_700Bold', fontSize: 32, color: '#ffffff',
  },
  statusDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 3, borderColor: '#ffffff',
  },
  profileName: {
    fontFamily: 'Newsreader_400Regular', fontSize: 26, color: '#00113a',
  },
  profileId: {
    fontFamily: 'Manrope_700Bold', fontSize: 10,
    letterSpacing: 2, color: '#757682', textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold', fontSize: 11,
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  infoTile: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#ffffff', borderRadius: 10, padding: 14, gap: 4,
    borderWidth: 1, borderColor: 'rgba(197,198,210,0.2)',
  },
  infoTileLabel: {
    fontFamily: 'Manrope_700Bold', fontSize: 9,
    letterSpacing: 1.5, color: '#757682', textTransform: 'uppercase',
  },
  infoTileValue: {
    fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#00113a',
  },

  // Card
  card: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: 'rgba(197,198,210,0.2)', gap: 10,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'Manrope_700Bold', fontSize: 12,
    letterSpacing: 1, color: '#00113a', textTransform: 'uppercase',
  },
  cardCount: {
    backgroundColor: 'rgba(0,17,58,0.08)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  cardCountText: {
    fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#00113a',
  },
  emptyCardText: {
    fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#c5c6d2',
  },

  // Course row
  courseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(197,198,210,0.15)',
  },
  courseRowBadge: {
    backgroundColor: 'rgba(0,35,102,0.08)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
  },
  courseRowCode: {
    fontFamily: 'Manrope_700Bold', fontSize: 10,
    letterSpacing: 1, color: '#002366',
  },
  courseRowName: {
    flex: 1,
    fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#00113a',
  },

  // Info row
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(197,198,210,0.15)',
  },
  infoRowLabel: {
    fontFamily: 'Manrope_400Regular', fontSize: 12, color: '#757682',
  },
  infoRowValue: {
    fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#00113a',
  },
});