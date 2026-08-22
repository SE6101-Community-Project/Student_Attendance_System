import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '@/src/api/axiosInstance';

// ── Filter categories ──
const FILTER_CHIPS = [
  { id: 'all', label: 'All Records', icon: 'database' },
  { id: 'active', label: 'Active', icon: 'broadcast' },
  { id: 'closed', label: 'Closed', icon: 'check-circle-outline' },
];

export default function LogsScreen() {
  // ── State ──
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [showCourseFilter, setShowCourseFilter] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Detail Modal ──
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // ── Animations ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    fetchCourses();
    fetchSessions();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [activeFilter, selectedCourseId, page]);

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [sessions]);

  // ── Fetch Courses ──
  const fetchCourses = async () => {
    try {
      const res = await api.get('/course/my-courses');
      if (res.data.success) setCourses(res.data.data || []);
    } catch (err) {
      console.log('Fetch courses error:', err);
    }
  };

  // ── Fetch Sessions ──
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 15 });
      if (activeFilter === 'active') params.append('isActive', 'true');
      if (activeFilter === 'closed') params.append('isActive', 'false');
      if (selectedCourseId) params.append('courseId', selectedCourseId);

      const res = await api.get(`/qrsession/my-sessions?${params}`);
      if (res.data.success) {
        setSessions(res.data.data || []);
        setPagination(res.data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.log('Fetch sessions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchSessions();
    setRefreshing(false);
  };

  // ── Open Session Detail ──
  const openSessionDetail = async (session) => {
    setSelectedSession(session);
    setShowDetail(true);
    setDetailLoading(true);

    modalSlide.setValue(300);
    Animated.spring(modalSlide, {
      toValue: 0,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();

    try {
      const endpoint =
        session.isActive && !session.isClosed
          ? `/attendance/realtime/${session.sessionId}`
          : `/attendance/session/${session.sessionId}`;

      const res = await api.get(endpoint);
      if (res.data.success) setSessionDetail(res.data.data);
    } catch (err) {
      console.log('Session detail error:', err);
      setSessionDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    Animated.timing(modalSlide, {
      toValue: 300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowDetail(false);
      setSelectedSession(null);
      setSessionDetail(null);
    });
  };

  // ── Close Session ──
  const handleCloseSession = async (sessionId) => {
    Alert.alert(
      'Close Session',
      'Are you sure you want to close this attendance session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Session',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.put(`/qrsession/close/${sessionId}`);
              if (res.data.success) {
                Alert.alert('Success', 'Session closed successfully');
                closeDetail();
                fetchSessions();
              }
            } catch (err) {
              Alert.alert(
                'Error',
                err.response?.data?.message || 'Failed to close session',
              );
            }
          },
        },
      ],
    );
  };

  // ──────────────────────────────────────────
  // PDF EXPORT
  // ──────────────────────────────────────────
  const handleExport = async () => {
    if (sessions.length === 0) {
      Alert.alert('No Data', 'There are no sessions to export.');
      return;
    }

    try {
      setExporting(true);

      const now = new Date();
      const generatedAt = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(
        (s) => s.isActive && !s.isClosed,
      ).length;
      const closedSessions = sessions.filter((s) => s.isClosed).length;

      // ── Generate table rows ──
      const tableRows = sessions
        .map((session, idx) => {
          const statusColor = session.isClosed
            ? '#757682'
            : session.isActive
              ? '#4CAF50'
              : '#F59E0B';

          const statusLabel = session.isClosed
            ? 'CLOSED'
            : session.isActive
              ? 'ACTIVE'
              : 'PENDING';

          const statusBg = session.isClosed
            ? '#f3f3f3'
            : session.isActive
              ? '#e8f5e9'
              : '#fff8e1';

          return `
            <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
              <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">
                <div style="font-weight: 700; font-size: 11px; color: #00113a;">
                  ${formatDateTime(session.startTime)}
                </div>
                <div style="font-size: 10px; color: #757682; margin-top: 2px;">
                  ${formatTime(session.startTime)} — ${formatTime(session.endTime)}
                </div>
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">
                <div style="font-weight: 700; font-size: 11px; color: #002366;">
                  ${session.course?.courseCode || '—'}
                </div>
                <div style="font-size: 10px; color: #757682; margin-top: 2px; max-width: 160px;">
                  ${session.course?.courseName || '—'}
                </div>
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #eee;">
                <div style="font-size: 11px; color: #00113a; font-weight: 600;">
                  ${session.lectureTitle || `Lecture ${session.lectureNumber}`}
                </div>
                <div style="font-size: 10px; color: #757682; margin-top: 2px;">
                  Lecture #${session.lectureNumber}
                </div>
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 11px; color: #444650;">
                ${session.venue || '—'}
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #eee; text-align: center;">
                <span style="
                  background: ${statusBg};
                  color: ${statusColor};
                  font-size: 9px;
                  font-weight: 700;
                  letter-spacing: 1px;
                  padding: 4px 8px;
                  border-radius: 10px;
                  display: inline-block;
                ">${statusLabel}</span>
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 9px; color: #a0a1ad; font-family: monospace; max-width: 100px; word-break: break-all;">
                ${session.sessionId || '—'}
              </td>
            </tr>
          `;
        })
        .join('');

      // ── Full HTML template ──
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Audit Registry — Session Logs</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background: #f9f9f9;
              color: #00113a;
              font-size: 13px;
            }

            /* ── Cover Header ── */
            .cover {
              background: #00113a;
              padding: 40px 48px 36px;
              position: relative;
              overflow: hidden;
            }
            .cover::before {
              content: '';
              position: absolute;
              top: -40px;
              right: -40px;
              width: 200px;
              height: 200px;
              background: rgba(255,255,255,0.03);
              border-radius: 50%;
            }
            .cover-label {
              font-size: 9px;
              letter-spacing: 4px;
              color: #775a19;
              text-transform: uppercase;
              margin-bottom: 10px;
              font-weight: 700;
            }
            .cover-title {
              font-size: 32px;
              color: #ffffff;
              font-weight: 300;
              letter-spacing: -0.5px;
              margin-bottom: 4px;
            }
            .cover-title span {
              color: #e9c176;
            }
            .cover-subtitle {
              font-size: 12px;
              color: rgba(255,255,255,0.5);
              margin-bottom: 28px;
            }
            .cover-meta {
              display: flex;
              gap: 40px;
              padding-top: 20px;
              border-top: 1px solid rgba(255,255,255,0.1);
            }
            .cover-meta-item label {
              font-size: 8px;
              letter-spacing: 2px;
              color: rgba(255,255,255,0.4);
              text-transform: uppercase;
              display: block;
              margin-bottom: 4px;
            }
            .cover-meta-item span {
              font-size: 13px;
              color: #ffffff;
              font-weight: 600;
            }

            /* ── Summary Cards ── */
            .summary-section {
              padding: 28px 48px 20px;
              background: #ffffff;
              border-bottom: 1px solid #eee;
            }
            .summary-label {
              font-size: 8px;
              letter-spacing: 3px;
              color: #775a19;
              text-transform: uppercase;
              font-weight: 700;
              margin-bottom: 16px;
            }
            .summary-cards {
              display: flex;
              gap: 16px;
            }
            .summary-card {
              flex: 1;
              background: #f9f9f9;
              border-radius: 10px;
              padding: 16px;
              border-top: 3px solid #ccc;
              text-align: center;
            }
            .summary-card-value {
              font-size: 32px;
              font-weight: 300;
              color: #00113a;
              line-height: 1;
              margin-bottom: 6px;
            }
            .summary-card-label {
              font-size: 8px;
              letter-spacing: 2px;
              color: #757682;
              text-transform: uppercase;
              font-weight: 700;
            }

            /* ── Table Section ── */
            .table-section {
              padding: 28px 48px;
            }
            .section-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 300;
              color: #00113a;
            }
            .section-badge {
              background: rgba(119,90,25,0.1);
              color: #775a19;
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 2px;
              padding: 4px 10px;
              border-radius: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,17,58,0.04);
            }
            thead {
              background: #00113a;
            }
            thead th {
              padding: 12px 12px;
              text-align: left;
              font-size: 8px;
              font-weight: 700;
              letter-spacing: 2px;
              color: rgba(255,255,255,0.7);
              text-transform: uppercase;
              border: none;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }

            /* ── Footer ── */
            .footer {
              background: #00113a;
              padding: 20px 48px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 32px;
            }
            .footer-left {
              font-size: 9px;
              color: rgba(255,255,255,0.4);
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            .footer-right {
              font-size: 9px;
              color: rgba(255,255,255,0.3);
              letter-spacing: 1px;
            }
            .gold-accent {
              color: #e9c176;
            }

            /* ── Watermark ── */
            .watermark {
              text-align: center;
              padding: 12px;
              font-size: 8px;
              letter-spacing: 3px;
              color: rgba(0,17,58,0.12);
              text-transform: uppercase;
              font-weight: 700;
            }
          </style>
        </head>
        <body>

          <!-- Cover Header -->
          <div class="cover">
            <div class="cover-label">Records & Governance · Academic Curator</div>
            <div class="cover-title">
              Audit <span>Registry</span>
            </div>
            <div class="cover-subtitle">Session Attendance Logs — Official Document</div>
            <div class="cover-meta">
              <div class="cover-meta-item">
                <label>Generated On</label>
                <span>${generatedAt}</span>
              </div>
              <div class="cover-meta-item">
                <label>Institution</label>
                <span>Sabaragamuwa University of Sri Lanka</span>
              </div>
              <div class="cover-meta-item">
                <label>Document Type</label>
                <span>Official Audit Log</span>
              </div>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="summary-section">
            <div class="summary-label">Summary Overview</div>
            <div class="summary-cards">
              <div class="summary-card" style="border-top-color: #00113a;">
                <div class="summary-card-value" style="color: #00113a;">
                  ${totalSessions}
                </div>
                <div class="summary-card-label">Total Sessions</div>
              </div>
              <div class="summary-card" style="border-top-color: #4CAF50;">
                <div class="summary-card-value" style="color: #4CAF50;">
                  ${activeSessions}
                </div>
                <div class="summary-card-label">Active Sessions</div>
              </div>
              <div class="summary-card" style="border-top-color: #757682;">
                <div class="summary-card-value" style="color: #757682;">
                  ${closedSessions}
                </div>
                <div class="summary-card-label">Closed Sessions</div>
              </div>
              <div class="summary-card" style="border-top-color: #775a19;">
                <div class="summary-card-value" style="color: #775a19;">
                  ${[...new Set(sessions.map((s) => s.course?.courseCode).filter(Boolean))].length}
                </div>
                <div class="summary-card-label">Courses Involved</div>
              </div>
            </div>
          </div>

          <!-- Table Section -->
          <div class="table-section">
            <div class="section-header">
              <div class="section-title">Session Records</div>
              <div class="section-badge">${totalSessions} ENTRIES</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Course</th>
                  <th>Lecture</th>
                  <th>Venue</th>
                  <th style="text-align: center;">Status</th>
                  <th>Session ID</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-left">
              © Sabaragamuwa University of Sri Lanka ·
              <span class="gold-accent"> Academic Curator</span>
            </div>
            <div class="footer-right">
              Exported: ${now.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })} · CONFIDENTIAL
            </div>
          </div>

          <!-- Watermark -->
          <div class="watermark">
            Official Document — Sabaragamuwa University of Sri Lanka — Academic Curator
          </div>

        </body>
        </html>
      `;

      // ── Generate PDF ──
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // ── Share PDF ──
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Audit Log PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'Exported',
          `PDF saved to:\n${uri}`,
          [{ text: 'OK' }],
        );
      }
    } catch (err) {
      console.log('Export error:', err);
      Alert.alert('Export Failed', 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Helpers ──
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionStatusColor = (session) => {
    if (session.isClosed) return '#757682';
    if (session.isActive) return '#4CAF50';
    return '#F59E0B';
  };

  const getSessionStatusLabel = (session) => {
    if (session.isClosed) return 'CLOSED';
    if (session.isActive) return 'ACTIVE';
    return 'PENDING';
  };

  const getSessionStatusBg = (session) => {
    if (session.isClosed) return 'rgba(117,118,130,0.08)';
    if (session.isActive) return 'rgba(76,175,80,0.08)';
    return 'rgba(245,158,11,0.08)';
  };

  const filteredSessions = sessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.sessionId?.toLowerCase().includes(q) ||
      s.venue?.toLowerCase().includes(q) ||
      s.course?.courseCode?.toLowerCase().includes(q) ||
      s.course?.courseName?.toLowerCase().includes(q) ||
      s.lectureTitle?.toLowerCase().includes(q)
    );
  });

  // ── Session Detail Modal ──
  const SessionDetailModal = () => (
    <Modal
      visible={showDetail}
      transparent
      animationType="none"
      onRequestClose={closeDetail}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={closeDetail}
        />
        <Animated.View
          style={[
            styles.modalSheet,
            { transform: [{ translateY: modalSlide }] },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeaderContent}>
              <View>
                <Text style={styles.modalLabel}>SESSION DETAIL</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedSession?.lectureTitle || 'Session Details'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeDetail}
                style={styles.modalCloseBtn}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#444650"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSessionMeta}>
              <View style={styles.sessionIdBadge}>
                <MaterialCommunityIcons
                  name="identifier"
                  size={12}
                  color="#757682"
                />
                <Text style={styles.sessionIdText} numberOfLines={1}>
                  {selectedSession?.sessionId}
                </Text>
              </View>
              {selectedSession && (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: getSessionStatusBg(selectedSession),
                      borderColor: getSessionStatusColor(selectedSession),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusPillDot,
                      {
                        backgroundColor:
                          getSessionStatusColor(selectedSession),
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: getSessionStatusColor(selectedSession) },
                    ]}
                  >
                    {getSessionStatusLabel(selectedSession)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            {selectedSession && (
              <View style={styles.modalInfoGrid}>
                <InfoItem
                  icon="book-open-variant"
                  label="COURSE"
                  value={`${selectedSession.course?.courseCode} · ${selectedSession.course?.courseName}`}
                />
                <InfoItem
                  icon="map-marker-outline"
                  label="VENUE"
                  value={selectedSession.venue}
                />
                <InfoItem
                  icon="calendar-outline"
                  label="DATE"
                  value={formatDateTime(selectedSession.startTime)}
                />
                <InfoItem
                  icon="clock-outline"
                  label="TIME"
                  value={`${formatTime(selectedSession.startTime)} — ${formatTime(selectedSession.endTime)}`}
                />
                <InfoItem
                  icon="counter"
                  label="LECTURE NO."
                  value={`Lecture ${selectedSession.lectureNumber}`}
                />
                <InfoItem
                  icon="radar"
                  label="GPS RADIUS"
                  value={`${selectedSession.radiusInMeters || 100}m`}
                />
              </View>
            )}

            {detailLoading ? (
              <View style={styles.modalLoadingWrap}>
                <ActivityIndicator size="large" color="#775a19" />
                <Text style={styles.modalLoadingText}>
                  Loading attendance data...
                </Text>
              </View>
            ) : sessionDetail ? (
              <>
                <View style={styles.attendanceStatsGrid}>
                  <AttendanceStat
                    label="ENROLLED"
                    value={
                      sessionDetail.totalEnrolled ??
                      sessionDetail.summary?.totalEnrolled ??
                      0
                    }
                    color="#002366"
                    icon="account-group-outline"
                  />
                  <AttendanceStat
                    label="PRESENT"
                    value={
                      sessionDetail.present ??
                      sessionDetail.summary?.totalPresent ??
                      0
                    }
                    color="#4CAF50"
                    icon="check-circle-outline"
                  />
                  <AttendanceStat
                    label="LATE"
                    value={
                      sessionDetail.late ??
                      sessionDetail.summary?.totalLate ??
                      0
                    }
                    color="#F59E0B"
                    icon="clock-alert-outline"
                  />
                  <AttendanceStat
                    label="ABSENT"
                    value={sessionDetail.summary?.totalAbsent ?? 0}
                    color="#ba1a1a"
                    icon="close-circle-outline"
                  />
                </View>

                {sessionDetail.summary?.attendanceRate !== undefined && (
                  <View style={styles.attendanceRateCard}>
                    <View style={styles.attendanceRateHeader}>
                      <Text style={styles.attendanceRateLabel}>
                        ATTENDANCE RATE
                      </Text>
                      <Text style={styles.attendanceRateValue}>
                        {parseFloat(
                          sessionDetail.summary.attendanceRate,
                        ).toFixed(1)}
                        %
                      </Text>
                    </View>
                    <View style={styles.attendanceRateBar}>
                      <View
                        style={[
                          styles.attendanceRateFill,
                          {
                            width: `${Math.min(100, parseFloat(sessionDetail.summary.attendanceRate))}%`,
                            backgroundColor:
                              parseFloat(
                                sessionDetail.summary.attendanceRate,
                              ) >= 75
                                ? '#4CAF50'
                                : '#ba1a1a',
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {(sessionDetail.students ||
                  sessionDetail.presentStudents) && (
                  <View style={styles.studentListSection}>
                    <Text style={styles.studentListTitle}>
                      {selectedSession?.isActive && !selectedSession?.isClosed
                        ? 'Live Attendance'
                        : 'Present Students'}
                    </Text>
                    {(
                      sessionDetail.students ||
                      sessionDetail.presentStudents ||
                      []
                    )
                      .slice(0, 10)
                      .map((student, idx) => {
                        const s = student.student || student;
                        const status =
                          student.status ||
                          (student.isLate ? 'late' : 'present');
                        return (
                          <View key={idx} style={styles.studentRow}>
                            <View style={styles.studentAvatar}>
                              <Text style={styles.studentAvatarText}>
                                {(s.name || s.studentId || '?')
                                  .charAt(0)
                                  .toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.studentInfo}>
                              <Text
                                style={styles.studentName}
                                numberOfLines={1}
                              >
                                {s.name || 'Unknown'}
                              </Text>
                              <Text style={styles.studentId}>
                                {s.studentId || '—'}
                              </Text>
                            </View>
                            <View style={styles.studentRight}>
                              <View
                                style={[
                                  styles.attendanceStatusBadge,
                                  {
                                    backgroundColor:
                                      status === 'present'
                                        ? 'rgba(76,175,80,0.1)'
                                        : status === 'late'
                                          ? 'rgba(245,158,11,0.1)'
                                          : 'rgba(186,26,26,0.1)',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.attendanceStatusText,
                                    {
                                      color:
                                        status === 'present'
                                          ? '#4CAF50'
                                          : status === 'late'
                                            ? '#F59E0B'
                                            : '#ba1a1a',
                                    },
                                  ]}
                                >
                                  {status?.toUpperCase()}
                                </Text>
                              </View>
                              {student.markedAt && (
                                <Text style={styles.markedAtText}>
                                  {formatTime(student.markedAt)}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}

                    {sessionDetail.absentStudents &&
                      sessionDetail.absentStudents.length > 0 && (
                        <>
                          <Text
                            style={[
                              styles.studentListTitle,
                              { marginTop: 16, color: '#ba1a1a' },
                            ]}
                          >
                            Absent Students
                          </Text>
                          {sessionDetail.absentStudents
                            .slice(0, 5)
                            .map((student, idx) => (
                              <View key={idx} style={styles.studentRow}>
                                <View
                                  style={[
                                    styles.studentAvatar,
                                    {
                                      backgroundColor:
                                        'rgba(186,26,26,0.1)',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.studentAvatarText,
                                      { color: '#ba1a1a' },
                                    ]}
                                  >
                                    {(student.name || '?')
                                      .charAt(0)
                                      .toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.studentInfo}>
                                  <Text
                                    style={styles.studentName}
                                    numberOfLines={1}
                                  >
                                    {student.name}
                                  </Text>
                                  <Text style={styles.studentId}>
                                    {student.studentId}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.attendanceStatusBadge,
                                    {
                                      backgroundColor:
                                        'rgba(186,26,26,0.1)',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.attendanceStatusText,
                                      { color: '#ba1a1a' },
                                    ]}
                                  >
                                    ABSENT
                                  </Text>
                                </View>
                              </View>
                            ))}
                        </>
                      )}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noDataWrap}>
                <MaterialCommunityIcons
                  name="database-off-outline"
                  size={40}
                  color="#c5c6d2"
                />
                <Text style={styles.noDataText}>
                  No attendance data available
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              {selectedSession?.isActive && !selectedSession?.isClosed && (
                <TouchableOpacity
                  style={styles.closeSessionBtn}
                  onPress={() =>
                    handleCloseSession(selectedSession.sessionId)
                  }
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="stop-circle-outline"
                    size={16}
                    color="#ba1a1a"
                  />
                  <Text style={styles.closeSessionBtnText}>
                    CLOSE SESSION
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.exportDetailBtn}
                onPress={handleExport}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="export-variant"
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.exportDetailBtnText}>EXPORT REPORT</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  // ── Render ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.archivalHeader}>
            <View style={styles.archivalAccent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.archivalLabel}>RECORDS & GOVERNANCE</Text>
              <Text style={styles.archivalTitle}>Audit Registry</Text>
            </View>
            {/* Export Button */}
            <TouchableOpacity
              style={[
                styles.exportHeaderBtn,
                exporting && styles.exportHeaderBtnDisabled,
              ]}
              onPress={handleExport}
              activeOpacity={0.8}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={16}
                  color="#ffffff"
                />
              )}
              <Text style={styles.exportHeaderBtnText}>
                {exporting ? 'GENERATING...' : 'EXPORT PDF'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color="#757682"
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by actor, course or venue..."
              placeholderTextColor="rgba(117,118,130,0.5)"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons
                  name="close"
                  size={16}
                  color="#757682"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Filter Chips & Course Filter ── */}
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScroll}
          >
            {FILTER_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.filterChip,
                  activeFilter === chip.id && styles.filterChipActive,
                ]}
                onPress={() => {
                  setActiveFilter(chip.id);
                  setPage(1);
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={chip.icon}
                  size={12}
                  color={activeFilter === chip.id ? '#5d4201' : '#757682'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === chip.id && styles.filterChipTextActive,
                  ]}
                >
                  {chip.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCourseId && styles.filterChipActive,
              ]}
              onPress={() => setShowCourseFilter(!showCourseFilter)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="book-open-outline"
                size={12}
                color={selectedCourseId ? '#5d4201' : '#757682'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedCourseId && styles.filterChipTextActive,
                ]}
              >
                {selectedCourseId
                  ? courses.find((c) => c._id === selectedCourseId)
                      ?.courseCode || 'COURSE'
                  : 'ALL COURSES'}
              </Text>
              <MaterialCommunityIcons
                name={showCourseFilter ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={selectedCourseId ? '#5d4201' : '#757682'}
              />
            </TouchableOpacity>
          </ScrollView>

          {showCourseFilter && courses.length > 0 && (
            <View style={styles.courseDropdown}>
              <TouchableOpacity
                style={[
                  styles.courseDropdownItem,
                  !selectedCourseId && styles.courseDropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedCourseId('');
                  setShowCourseFilter(false);
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    styles.courseDropdownText,
                    !selectedCourseId && styles.courseDropdownTextActive,
                  ]}
                >
                  All Courses
                </Text>
                {!selectedCourseId && (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color="#775a19"
                  />
                )}
              </TouchableOpacity>
              {courses.map((course) => (
                <TouchableOpacity
                  key={course._id}
                  style={[
                    styles.courseDropdownItem,
                    selectedCourseId === course._id &&
                      styles.courseDropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCourseId(course._id);
                    setShowCourseFilter(false);
                    setPage(1);
                  }}
                >
                  <View>
                    <Text
                      style={[
                        styles.courseDropdownText,
                        selectedCourseId === course._id &&
                          styles.courseDropdownTextActive,
                      ]}
                    >
                      {course.courseCode}
                    </Text>
                    <Text
                      style={styles.courseDropdownSubText}
                      numberOfLines={1}
                    >
                      {course.courseName}
                    </Text>
                  </View>
                  {selectedCourseId === course._id && (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color="#775a19"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.resultsInfo}>
            <View style={styles.archiveSyncBadge}>
              <MaterialCommunityIcons
                name="history"
                size={12}
                color="#775a19"
              />
              <Text style={styles.archiveSyncText}>
                ARCHIVE STATUS: SYNCHRONIZED
              </Text>
            </View>
            <Text style={styles.resultsCount}>
              {pagination.total} RECORDS
            </Text>
          </View>
        </View>

        {/* ── Log Feed ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#775a19" />
            <Text style={styles.loadingText}>Loading audit logs...</Text>
          </View>
        ) : (
          <Animated.ScrollView
            style={{ opacity: fadeIn }}
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
            {filteredSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="database-search-outline"
                  size={52}
                  color="#c5c6d2"
                />
                <Text style={styles.emptyTitle}>No records found</Text>
                <Text style={styles.emptySubText}>
                  {search
                    ? 'Try a different search term'
                    : 'Create sessions to see audit logs'}
                </Text>
              </View>
            ) : (
              <>
                {filteredSessions.map((session, idx) => (
                  <LogEntry
                    key={session._id || idx}
                    session={session}
                    formatDateTime={formatDateTime}
                    formatTime={formatTime}
                    getSessionStatusColor={getSessionStatusColor}
                    getSessionStatusLabel={getSessionStatusLabel}
                    getSessionStatusBg={getSessionStatusBg}
                    onPress={() => openSessionDetail(session)}
                    onCloseSession={() =>
                      handleCloseSession(session.sessionId)
                    }
                  />
                ))}

                {pagination.pages > 1 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[
                        styles.pageBtn,
                        page <= 1 && styles.pageBtnDisabled,
                      ]}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <MaterialCommunityIcons
                        name="chevron-left"
                        size={20}
                        color={page <= 1 ? '#c5c6d2' : '#00113a'}
                      />
                    </TouchableOpacity>
                    <Text style={styles.pageInfo}>
                      {page} / {pagination.pages}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.pageBtn,
                        page >= pagination.pages && styles.pageBtnDisabled,
                      ]}
                      onPress={() =>
                        setPage((p) => Math.min(pagination.pages, p + 1))
                      }
                      disabled={page >= pagination.pages}
                    >
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={
                          page >= pagination.pages ? '#c5c6d2' : '#00113a'
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={styles.showMoreBtn}>
                  <Text style={styles.showMoreText}>
                    SHOW HISTORICAL RECORDS
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.footerText}>
              © SABARAGAMUWA UNIVERSITY OF SRI LANKA
            </Text>
          </Animated.ScrollView>
        )}

        {/* ── Bottom Export Bar ── */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarLeft}>
            <MaterialCommunityIcons
              name="history"
              size={14}
              color="#775a19"
            />
            <Text style={styles.bottomBarText}>
              ARCHIVE STATUS: ONLINE & SYNCHRONIZED
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.bottomExportBtn,
              exporting && styles.exportHeaderBtnDisabled,
            ]}
            onPress={handleExport}
            activeOpacity={0.85}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#758dd5" />
            ) : (
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={16}
                color="#758dd5"
              />
            )}
            <Text style={styles.bottomExportBtnText}>
              {exporting ? 'GENERATING PDF...' : 'EXPORT AUDIT LOGS'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SessionDetailModal />
    </View>
  );
}

// ══════════════════════════════════════
// LOG ENTRY COMPONENT
// ══════════════════════════════════════
const LogEntry = ({
  session,
  formatDateTime,
  formatTime,
  getSessionStatusColor,
  getSessionStatusLabel,
  getSessionStatusBg,
  onPress,
  onCloseSession,
}) => {
  const isActive = session.isActive && !session.isClosed;
  const borderColor = isActive
    ? '#4CAF50'
    : session.isClosed
      ? '#c5c6d2'
      : '#F59E0B';

  return (
    <TouchableOpacity
      style={[styles.logEntry, { borderLeftColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.logEntryTop}>
        <View style={styles.logDateCol}>
          <Text style={styles.logDate}>
            {formatDateTime(session.startTime)}
          </Text>
          <Text style={styles.logTime}>{formatTime(session.startTime)}</Text>
          <Text style={styles.logTimezone}>GMT +5:30</Text>
        </View>
        <View
          style={[
            styles.logStatusBadge,
            { backgroundColor: getSessionStatusBg(session) },
          ]}
        >
          {isActive && <View style={styles.activePulse} />}
          <Text
            style={[
              styles.logStatusText,
              { color: getSessionStatusColor(session) },
            ]}
          >
            {getSessionStatusLabel(session)}
          </Text>
        </View>
      </View>

      <View style={styles.logEntryContent}>
        <View style={styles.logActor}>
          <View style={styles.logActorIcon}>
            <MaterialCommunityIcons
              name="human-male-board"
              size={18}
              color="#00113a"
            />
          </View>
          <View style={styles.logActorInfo}>
            <Text style={styles.logActorName}>Lecturer · You</Text>
            <Text style={styles.logActorMeta}>
              {session.course?.courseCode || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.logEventBadge}>
          <MaterialCommunityIcons
            name={
              session.isClosed
                ? 'check-circle-outline'
                : isActive
                  ? 'broadcast'
                  : 'clock-outline'
            }
            size={12}
            color={
              session.isClosed
                ? '#757682'
                : isActive
                  ? '#4CAF50'
                  : '#F59E0B'
            }
          />
          <Text
            style={[
              styles.logEventText,
              {
                color: session.isClosed
                  ? '#757682'
                  : isActive
                    ? '#4CAF50'
                    : '#F59E0B',
              },
            ]}
          >
            {session.isClosed
              ? 'Session Closed'
              : isActive
                ? 'Session Active'
                : 'Attendance Session'}
          </Text>
        </View>

        <Text style={styles.logDescription}>
          {session.lectureTitle || `Lecture ${session.lectureNumber}`} in{' '}
          <Text style={styles.logDescriptionHighlight}>{session.venue}</Text>.
          Course:{' '}
          <Text style={styles.logDescriptionCourse}>
            {session.course?.courseName || 'N/A'}
          </Text>
          .
        </Text>

        <View style={styles.logFooterMeta}>
          <View style={styles.logMetaItem}>
            <MaterialCommunityIcons
              name="identifier"
              size={10}
              color="#c5c6d2"
            />
            <Text style={styles.logMetaText} numberOfLines={1}>
              {session.sessionId?.slice(-12)}
            </Text>
          </View>
          <View style={styles.logMetaItem}>
            <MaterialCommunityIcons
              name="clock-end"
              size={10}
              color="#c5c6d2"
            />
            <Text style={styles.logMetaText}>
              Until {formatTime(session.endTime)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.logActions}>
        <TouchableOpacity
          style={styles.logActionBtn}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="eye-outline"
            size={18}
            color="#757682"
          />
        </TouchableOpacity>
        {isActive && (
          <TouchableOpacity
            style={[styles.logActionBtn, styles.logActionBtnDanger]}
            onPress={onCloseSession}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="stop-circle-outline"
              size={18}
              color="#ba1a1a"
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <MaterialCommunityIcons name={icon} size={14} color="#775a19" />
    <View style={styles.infoItemContent}>
      <Text style={styles.infoItemLabel}>{label}</Text>
      <Text style={styles.infoItemValue} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  </View>
);

const AttendanceStat = ({ label, value, color, icon }) => (
  <View style={[styles.attendanceStat, { borderTopColor: color }]}>
    <MaterialCommunityIcons name={icon} size={18} color={color} />
    <Text style={[styles.attendanceStatValue, { color }]}>{value}</Text>
    <Text style={styles.attendanceStatLabel}>{label}</Text>
  </View>
);

// ══════════════════════════════════════
// STYLES — identical to your original
// ══════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197,198,210,0.2)',
  },
  archivalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  archivalAccent: {
    width: 2,
    height: 44,
    backgroundColor: '#775a19',
    marginTop: 2,
  },
  archivalLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#775a19',
    marginBottom: 3,
  },
  archivalTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 28,
    color: '#00113a',
  },
  exportHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#002366',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  exportHeaderBtnDisabled: { opacity: 0.6 },
  exportHeaderBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.2)',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#00113a',
  },
  filtersSection: {
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197,198,210,0.15)',
  },
  filterChipsScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f3f3',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: 'rgba(233,193,118,0.3)',
    borderColor: 'rgba(119,90,25,0.3)',
  },
  filterChipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    color: '#757682',
  },
  filterChipTextActive: { color: '#5d4201' },
  courseDropdown: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  courseDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197,198,210,0.1)',
  },
  courseDropdownItemActive: { backgroundColor: 'rgba(119,90,25,0.06)' },
  courseDropdownText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#444650',
  },
  courseDropdownTextActive: { color: '#775a19' },
  courseDropdownSubText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#757682',
    marginTop: 1,
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  archiveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  archiveSyncText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 2,
    color: '#775a19',
  },
  resultsCount: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 2,
    color: '#757682',
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#757682',
    letterSpacing: 1,
  },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 22,
    color: '#00113a',
  },
  emptySubText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#757682',
    textAlign: 'center',
    maxWidth: 260,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },
  logEntry: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  logEntryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logDateCol: {},
  logDate: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#775a19',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  logTime: {
    fontFamily: 'Manrope_400Regular',
    fontStyle: 'italic',
    fontSize: 11,
    color: '#757682',
  },
  logTimezone: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    color: '#c5c6d2',
    letterSpacing: 0.5,
  },
  logStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  logStatusText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 1,
  },
  logEntryContent: { gap: 8 },
  logActor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logActorIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logActorInfo: {},
  logActorName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#00113a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logActorMeta: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#757682',
    letterSpacing: 1,
  },
  logEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f3f3',
    borderRadius: 4,
  },
  logEventText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  logDescription: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#444650',
    lineHeight: 20,
  },
  logDescriptionHighlight: { fontFamily: 'Manrope_700Bold', color: '#00113a' },
  logDescriptionCourse: {
    fontStyle: 'italic',
    color: '#775a19',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(119,90,25,0.3)',
  },
  logFooterMeta: { flexDirection: 'row', gap: 16, marginTop: 4 },
  logMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logMetaText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    color: '#c5c6d2',
    letterSpacing: 0.5,
  },
  logActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197,198,210,0.15)',
  },
  logActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logActionBtnDanger: { backgroundColor: 'rgba(186,26,26,0.06)' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    paddingVertical: 16,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.3)',
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageInfo: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    color: '#00113a',
  },
  showMoreBtn: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197,198,210,0.3)',
    marginTop: 8,
  },
  showMoreText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 3,
    color: '#757682',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197,198,210,0.2)',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bottomBarText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 2,
    color: '#757682',
  },
  bottomExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#002366',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomExportBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#758dd5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    backgroundColor: '#f9f9f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197,198,210,0.15)',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e2e2',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 3,
    color: '#775a19',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 22,
    color: '#00113a',
    maxWidth: 260,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  sessionIdText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    color: '#757682',
    letterSpacing: 1,
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
  },
  modalScroll: { flex: 1 },
  modalInfoGrid: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoItemContent: { flex: 1 },
  infoItemLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 2,
    color: '#757682',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoItemValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#00113a',
  },
  attendanceStatsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  attendanceStat: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 2,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  attendanceStatValue: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 24,
  },
  attendanceStatLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 7,
    letterSpacing: 1,
    color: '#757682',
    textTransform: 'uppercase',
  },
  attendanceRateCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  attendanceRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceRateLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#757682',
  },
  attendanceRateValue: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 22,
    color: '#00113a',
  },
  attendanceRateBar: {
    height: 6,
    backgroundColor: '#f3f3f3',
    borderRadius: 3,
    overflow: 'hidden',
  },
  attendanceRateFill: { height: '100%', borderRadius: 3 },
  studentListSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  studentListTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 18,
    color: '#00113a',
    marginBottom: 4,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197,198,210,0.1)',
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0,35,102,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#002366',
  },
  studentInfo: { flex: 1 },
  studentName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: '#00113a',
  },
  studentId: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    color: '#757682',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  studentRight: { alignItems: 'flex-end', gap: 2 },
  attendanceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  attendanceStatusText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8,
    letterSpacing: 1,
  },
  markedAtText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    color: '#c5c6d2',
  },
  modalLoadingWrap: { paddingVertical: 48, alignItems: 'center', gap: 16 },
  modalLoadingText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#757682',
  },
  noDataWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
  },
  noDataText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#757682',
  },
  modalActions: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  closeSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.3)',
    backgroundColor: 'rgba(186,26,26,0.05)',
  },
  closeSessionBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 3,
    color: '#ba1a1a',
  },
  exportDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 4,
    backgroundColor: '#002366',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  exportDetailBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 3,
    color: '#ffffff',
  },
  footerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 7,
    letterSpacing: 3,
    color: '#757682',
    textAlign: 'center',
    opacity: 0.3,
    marginTop: 16,
  },
});