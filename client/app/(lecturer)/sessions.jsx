import { useState, useEffect, useRef, useCallback, memo } from "react";
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
  Alert,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import api from "@/src/api/axiosInstance";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SESSION_FILTERS = [
  { id: "all", label: "All Sessions" },
  { id: "active", label: "Active" },
  { id: "closed", label: "Closed" },
];

// ─────────────────────────────────────────────────────────────
// Helpers (outside component — never recreated)
// ─────────────────────────────────────────────────────────────
const extractVenueCoords = (session) => {
  if (!session) return { latitude: null, longitude: null };
  const coords = session?.location?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    return { longitude: coords[0], latitude: coords[1] };
  }
  return { latitude: null, longitude: null };
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (s) => {
  if (s.isClosed) return "#757682";
  if (s.isActive) return "#4CAF50";
  return "#F59E0B";
};

const getStatusLabel = (s) => {
  if (s.isClosed) return "CLOSED";
  if (s.isActive) return "ACTIVE";
  return "PENDING";
};

const getStatusBg = (s) => {
  if (s.isClosed) return "rgba(117,118,130,0.08)";
  if (s.isActive) return "rgba(76,175,80,0.08)";
  return "rgba(245,158,11,0.08)";
};

// ─────────────────────────────────────────────────────────────
// Countdown hook (extracted — used inside SessionCard)
// ─────────────────────────────────────────────────────────────
const useCountdown = (endTime) => {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!endTime) return;

    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Closing...");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setRemaining(`${h}h ${m}m remaining`);
      else if (m > 0) setRemaining(`${m}m ${s}s remaining`);
      else setRemaining(`${s}s remaining`);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return remaining;
};

// ─────────────────────────────────────────────────────────────
// MetaChip
// ─────────────────────────────────────────────────────────────
const MetaChip = memo(function MetaChip({ icon, text }) {
  return (
    <View style={styles.metaItem}>
      <MaterialCommunityIcons name={icon} size={13} color="#757682" />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// Pagination component
// ─────────────────────────────────────────────────────────────
const Pagination = memo(function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  onGoTo,
}) {
  if (totalPages <= 1) return null;

  // Smart windowing
  const buildPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const pages = buildPages();

  return (
    <View style={styles.paginationWrap}>
      {/* Prev button */}
      <TouchableOpacity
        style={[styles.pageNavBtn, page <= 1 && styles.pageNavBtnDisabled]}
        onPress={onPrev}
        disabled={page <= 1}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={18}
          color={page <= 1 ? "#c5c6d2" : "#00113a"}
        />
        <Text
          style={[styles.pageNavText, page <= 1 && styles.pageNavTextDisabled]}
        >
          PREV
        </Text>
      </TouchableOpacity>

      {/* Page numbers */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pageNumbersRow}
      >
        {pages.map((p, i) =>
          p === "..." ? (
            <View key={`dots-${i}`} style={styles.pageDots}>
              <Text style={styles.pageDotsText}>•••</Text>
            </View>
          ) : (
            <TouchableOpacity
              key={p}
              style={[styles.pageNum, page === p && styles.pageNumActive]}
              onPress={() => onGoTo(p)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pageNumText,
                  page === p && styles.pageNumTextActive,
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </ScrollView>

      {/* Next button */}
      <TouchableOpacity
        style={[
          styles.pageNavBtn,
          page >= totalPages && styles.pageNavBtnDisabled,
        ]}
        onPress={onNext}
        disabled={page >= totalPages}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pageNavText,
            page >= totalPages && styles.pageNavTextDisabled,
          ]}
        >
          NEXT
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={page >= totalPages ? "#c5c6d2" : "#00113a"}
        />
      </TouchableOpacity>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// SessionCard
// ─────────────────────────────────────────────────────────────
const SessionCard = memo(function SessionCard({
  session,
  onView,
  onQR,
  onClose,
}) {
  const isLive = session.isActive && !session.isClosed;
  const countdown = useCountdown(isLive ? session.endTime : null);
  const { latitude, longitude } = extractVenueCoords(session);
  const hasCoords = latitude !== null && longitude !== null;

  return (
    <TouchableOpacity
      style={[styles.sessionCard, { borderLeftColor: getStatusColor(session) }]}
      onPress={onView}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.sessionCardHeader}>
        <View>
          <Text style={styles.sessionDate}>
            {formatDateTime(session.startTime)}
          </Text>
          <Text style={styles.sessionTime}>
            {formatTime(session.startTime)} — {formatTime(session.endTime)}
          </Text>
        </View>
        <View
          style={[styles.statusPill, { backgroundColor: getStatusBg(session) }]}
        >
          {isLive && <View style={styles.activeDot} />}
          <Text
            style={[styles.statusPillText, { color: getStatusColor(session) }]}
          >
            {getStatusLabel(session)}
          </Text>
        </View>
      </View>

      {/* Countdown */}
      {isLive && countdown ? (
        <View style={styles.countdownRow}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={13}
            color="#F59E0B"
          />
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : null}

      {/* Course + Title */}
      <View style={styles.sessionCardBody}>
        <View style={styles.courseCodeBadge}>
          <Text style={styles.courseCodeText}>
            {session.course?.courseCode || "N/A"}
          </Text>
        </View>
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {session.lectureTitle || `Lecture ${session.lectureNumber}`}
        </Text>
      </View>

      {/* Meta */}
      <View style={styles.sessionCardMeta}>
        <MetaChip icon="map-marker-outline" text={session.venue} />
        <MetaChip icon="counter" text={`Lecture ${session.lectureNumber}`} />
        <MetaChip icon="radar" text={`${session.radiusInMeters || 100}m`} />
      </View>

      {hasCoords && (
        <View style={styles.coordsRow}>
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={11}
            color="#757682"
          />
          <Text style={styles.coordsText}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        </View>
      )}

      {/* Footer actions */}
      <View style={styles.sessionCardFooter}>
        <TouchableOpacity style={styles.sessionActionBtn} onPress={onView}>
          <MaterialCommunityIcons
            name="eye-outline"
            size={15}
            color="#00113a"
          />
          <Text style={styles.sessionActionText}>VIEW</Text>
        </TouchableOpacity>

        {isLive && (
          <>
            <TouchableOpacity style={styles.sessionActionBtn} onPress={onQR}>
              <MaterialCommunityIcons name="qrcode" size={15} color="#775a19" />
              <Text style={[styles.sessionActionText, { color: "#775a19" }]}>
                QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sessionActionBtn, styles.sessionActionBtnDanger]}
              onPress={onClose}
            >
              <MaterialCommunityIcons
                name="stop-circle-outline"
                size={15}
                color="#ba1a1a"
              />
              <Text style={[styles.sessionActionText, { color: "#ba1a1a" }]}>
                CLOSE
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ══════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════
export default function SessionsScreen() {
  const params = useLocalSearchParams();

  // ── List state ──
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // ── Create modal ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [lectureNumber, setLectureNumber] = useState("");
  const [lectureTitle, setLectureTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [radiusInMeters, setRadiusInMeters] = useState("100");
  const [qrValidDuration, setQrValidDuration] = useState("120");
  const [sessionDurationHours, setSessionDurationHours] = useState("2");
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [currentCoords, setCurrentCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // ── QR modal ──
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);

  // ── Animations ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;

  // ══════════════════════════════════════
  // FETCH
  // ══════════════════════════════════════
  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get("/course/my-courses");
      if (res.data.success) setCourses(res.data.data || []);
    } catch (err) {
      console.log("fetchCourses error:", err.message);
    }
  }, []);

  const fetchSessions = useCallback(
    async (currentPage = page, filter = activeFilter) => {
      try {
        setLoading(true);
        const p = new URLSearchParams({ page: currentPage, limit: 10 });
        if (filter === "active") p.append("isActive", "true");
        if (filter === "closed") p.append("isActive", "false");

        const res = await api.get(`/qrsession/my-sessions?${p}`);
        if (res.data.success) {
          setSessions(res.data.data || []);
          setPagination(res.data.pagination || { total: 0, pages: 1 });

          // Animate new data in
          fadeIn.setValue(0);
          Animated.timing(fadeIn, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        }
      } catch (err) {
        console.log("fetchSessions error:", err.message);
      } finally {
        setLoading(false);
      }
    },
    [page, activeFilter],
  );

  // Initial load
  useEffect(() => {
    fetchCourses();
    fetchSessions(1, "all");
  }, []);

  // Filter change
  useEffect(() => {
    fetchSessions(page, activeFilter);
  }, [activeFilter, page]);

  // Navigate from dashboard
  useEffect(() => {
    if (params.openCreate === "true") {
      if (params.courseId) setSelectedCourseId(params.courseId);
      const t = setTimeout(() => openCreateModal(), 300);
      return () => clearTimeout(t);
    }
  }, [params.openCreate, params.courseId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchSessions(1, activeFilter);
    setRefreshing(false);
  }, [activeFilter]);

  // ── Filter change handler ──
  const handleFilterChange = useCallback((filterId) => {
    setActiveFilter(filterId);
    setPage(1);
    setSearch("");
  }, []);

  // ── Pagination handlers ──
  const handlePrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setPage((p) => Math.min(pagination.pages, p + 1));
  }, [pagination.pages]);

  const handleGoTo = useCallback((p) => {
    setPage(p);
  }, []);

  // ══════════════════════════════════════
  // LOCATION
  // ══════════════════════════════════════
  const getCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        setUseCurrentLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (err) {
      Alert.alert("Error", "Failed to get current location");
      setUseCurrentLocation(false);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // ══════════════════════════════════════
  // CREATE SESSION
  // ══════════════════════════════════════
  const openCreateModal = useCallback(() => {
    setLectureNumber("");
    setLectureTitle("");
    setVenue("");
    setRadiusInMeters("100");
    setQrValidDuration("120");
    setSessionDurationHours("2");
    setUseCurrentLocation(true);
    setManualLat("");
    setManualLng("");
    setCurrentCoords(null);
    setShowCoursePicker(false);
    setShowCreateModal(true);

    modalSlide.setValue(500);
    Animated.spring(modalSlide, {
      toValue: 0,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();

    getCurrentLocation();
  }, [getCurrentLocation]);

  const closeCreateModal = useCallback(() => {
    Animated.timing(modalSlide, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowCreateModal(false));
  }, []);

  const handleCreateSession = useCallback(async () => {
    if (!selectedCourseId) {
      Alert.alert("Validation", "Please select a course");
      return;
    }
    if (!lectureNumber.trim()) {
      Alert.alert("Validation", "Please enter the lecture number");
      return;
    }
    if (!venue.trim()) {
      Alert.alert("Validation", "Please enter the venue");
      return;
    }

    let coordinates;
    if (useCurrentLocation) {
      if (!currentCoords) {
        Alert.alert(
          "Error",
          "Location not available. Please wait or enter manually.",
        );
        return;
      }
      coordinates = [currentCoords.longitude, currentCoords.latitude];
    } else {
      if (!manualLat.trim() || !manualLng.trim()) {
        Alert.alert("Validation", "Please enter latitude and longitude");
        return;
      }
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      if (isNaN(lat) || isNaN(lng)) {
        Alert.alert("Validation", "Invalid coordinates");
        return;
      }
      if (lat < -90 || lat > 90) {
        Alert.alert("Validation", "Latitude must be between -90 and 90");
        return;
      }
      if (lng < -180 || lng > 180) {
        Alert.alert("Validation", "Longitude must be between -180 and 180");
        return;
      }
      coordinates = [lng, lat];
    }

    const now = new Date();
    const durationMs = parseFloat(sessionDurationHours || 2) * 3600000;

    setCreating(true);
    try {
      const res = await api.post("/qrsession/create", {
        courseId: selectedCourseId,
        lectureNumber: parseInt(lectureNumber),
        lectureTitle: lectureTitle.trim() || `Lecture ${lectureNumber}`,
        venue: venue.trim(),
        locationCoordinates: coordinates,
        radiusInMeters: parseInt(radiusInMeters) || 100,
        startTime: now.toISOString(),
        endTime: new Date(now.getTime() + durationMs).toISOString(),
        qrValidDuration: parseInt(qrValidDuration) || 120,
      });

      if (res.data.success) {
        setQrData(res.data.data);
        closeCreateModal();
        setTimeout(() => setShowQRModal(true), 350);
        setPage(1);
        fetchSessions(1, activeFilter);
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to create session";
      if (err.response?.status === 400 && err.response?.data?.sessionId) {
        Alert.alert(
          "Active Session Exists",
          `${message}\n\nSession ID: ${err.response.data.sessionId}`,
          [
            { text: "OK" },
            {
              text: "View Session",
              onPress: () => {
                closeCreateModal();
                router.push({
                  pathname: "/(lecturer)/session-detail",
                  params: { sessionId: err.response.data.sessionId },
                });
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setCreating(false);
    }
  }, [
    selectedCourseId,
    lectureNumber,
    venue,
    useCurrentLocation,
    currentCoords,
    manualLat,
    manualLng,
    radiusInMeters,
    sessionDurationHours,
    qrValidDuration,
    lectureTitle,
    closeCreateModal,
    activeFilter,
  ]);

  // ══════════════════════════════════════
  // CLOSE SESSION
  // ══════════════════════════════════════
  const handleCloseSession = useCallback(
    (sessionId) => {
      Alert.alert(
        "Close Session",
        "Students will no longer be able to mark attendance. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Close Session",
            style: "destructive",
            onPress: async () => {
              try {
                const res = await api.put(`/qrsession/close/${sessionId}`);
                if (res.data.success) {
                  Alert.alert("Success", "Session closed successfully");
                  setShowQRModal(false);
                  fetchSessions(page, activeFilter);
                }
              } catch (err) {
                Alert.alert(
                  "Error",
                  err.response?.data?.message || "Failed to close session",
                );
              }
            },
          },
        ],
      );
    },
    [page, activeFilter],
  );

  // ══════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════
  const getBorderColor = useCallback(
    (field) => (focusedField === field ? "#775a19" : "#c5c6d2"),
    [focusedField],
  );

  const filteredSessions = search.trim()
    ? sessions.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.sessionId?.toLowerCase().includes(q) ||
          s.venue?.toLowerCase().includes(q) ||
          s.course?.courseCode?.toLowerCase().includes(q) ||
          s.course?.courseName?.toLowerCase().includes(q) ||
          s.lectureTitle?.toLowerCase().includes(q)
        );
      })
    : sessions;

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#00113a"
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerLabel}>QR ATTENDANCE</Text>
              <Text style={styles.headerTitle}>Session Manager</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={openCreateModal}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#ffffff" />
            <Text style={styles.createBtnText}>NEW</Text>
          </TouchableOpacity>
        </View>

        {/* ── Filter chips ── */}
        <View style={styles.filtersRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {SESSION_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  activeFilter === f.id && styles.filterChipActive,
                ]}
                onPress={() => handleFilterChange(f.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === f.id && styles.filterChipTextActive,
                  ]}
                >
                  {f.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color="#757682" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sessions..."
            placeholderTextColor="rgba(117,118,130,0.5)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialCommunityIcons name="close" size={16} color="#757682" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Results info ── */}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>
            {pagination.total} session{pagination.total !== 1 ? "s" : ""}
          </Text>
          <View style={styles.resultsPageInfo}>
            <MaterialCommunityIcons
              name="file-document-multiple-outline"
              size={11}
              color="#757682"
            />
            <Text style={styles.resultsPage}>
              Page {page} of {pagination.pages || 1}
            </Text>
          </View>
        </View>

        {/* ── List ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#775a19" />
            <Text style={styles.loadingText}>Loading sessions...</Text>
          </View>
        ) : (
          <Animated.ScrollView
            style={{ opacity: fadeIn, flex: 1 }}
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
            {filteredSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="broadcast-off"
                  size={56}
                  color="#c5c6d2"
                />
                <Text style={styles.emptyTitle}>No Sessions Found</Text>
                <Text style={styles.emptySubText}>
                  {search
                    ? "Try a different search term"
                    : "Create your first attendance session"}
                </Text>
                {!search && (
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={openCreateModal}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={16}
                      color="#ffffff"
                    />
                    <Text style={styles.emptyBtnText}>CREATE SESSION</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {filteredSessions.map((s) => (
                  <SessionCard
                    key={s._id}
                    session={s}
                    onView={() =>
                      router.push({
                        pathname: "/(lecturer)/session-detail",
                        params: { sessionId: s.sessionId },
                      })
                    }
                    onQR={async () => {
                      try {
                        const res = await api.get(`/qrsession/${s.sessionId}`);
                        if (res.data.success) {
                          setQrData(res.data.data);
                          setShowQRModal(true);
                        }
                      } catch {
                        Alert.alert("Error", "Failed to load QR code");
                      }
                    }}
                    onClose={() => handleCloseSession(s.sessionId)}
                  />
                ))}

                {/* ── Pagination ── */}
                <Pagination
                  page={page}
                  totalPages={pagination.pages}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onGoTo={handleGoTo}
                />
              </>
            )}

            <Text style={styles.footerText}>
              © SABARAGAMUWA UNIVERSITY OF SRI LANKA
            </Text>
          </Animated.ScrollView>
        )}
      </SafeAreaView>

      {/* ═══════════════════════════════════
           CREATE SESSION MODAL
         ═══════════════════════════════════ */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="none"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeCreateModal}
          />
          <Animated.View
            style={[
              styles.modalSheet,
              { transform: [{ translateY: modalSlide }] },
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalDragHandle} />
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalLabel}>NEW SESSION</Text>
                    <Text style={styles.modalTitle}>Create QR Session</Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeCreateModal}
                    style={styles.modalCloseBtn}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color="#444650"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalForm}>
                  {/* ── Course Selector ── */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>SELECT COURSE *</Text>
                    <TouchableOpacity
                      style={[
                        styles.formDropdown,
                        { borderBottomColor: getBorderColor("course") },
                      ]}
                      onPress={() => setShowCoursePicker(!showCoursePicker)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.formDropdownText,
                          !selectedCourseId && styles.formDropdownPlaceholder,
                        ]}
                      >
                        {selectedCourse
                          ? `${selectedCourse.courseCode} — ${selectedCourse.courseName}`
                          : "Select a course"}
                      </Text>
                      <MaterialCommunityIcons
                        name={showCoursePicker ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#757682"
                      />
                    </TouchableOpacity>

                    {showCoursePicker && (
                      <View style={styles.pickerDropdown}>
                        {courses.length === 0 ? (
                          <Text style={styles.pickerEmpty}>
                            No courses assigned
                          </Text>
                        ) : (
                          courses.map((c) => (
                            <TouchableOpacity
                              key={c._id}
                              style={[
                                styles.pickerItem,
                                selectedCourseId === c._id &&
                                  styles.pickerItemActive,
                              ]}
                              onPress={() => {
                                setSelectedCourseId(c._id);
                                setShowCoursePicker(false);
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.pickerItemText,
                                    selectedCourseId === c._id &&
                                      styles.pickerItemTextActive,
                                  ]}
                                >
                                  {c.courseCode}
                                </Text>
                                <Text
                                  style={styles.pickerItemSub}
                                  numberOfLines={1}
                                >
                                  {c.courseName}
                                </Text>
                              </View>
                              {selectedCourseId === c._id && (
                                <MaterialCommunityIcons
                                  name="check"
                                  size={16}
                                  color="#775a19"
                                />
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}
                  </View>

                  {/* ── Lecture No + Title ── */}
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>LECTURE NO. *</Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { borderBottomColor: getBorderColor("lectureNo") },
                        ]}
                        value={lectureNumber}
                        onChangeText={setLectureNumber}
                        onFocus={() => setFocusedField("lectureNo")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="1"
                        placeholderTextColor="rgba(197,198,210,0.7)"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 2 }]}>
                      <Text style={styles.formLabel}>LECTURE TITLE</Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { borderBottomColor: getBorderColor("lectureTitle") },
                        ]}
                        value={lectureTitle}
                        onChangeText={setLectureTitle}
                        onFocus={() => setFocusedField("lectureTitle")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Introduction to..."
                        placeholderTextColor="rgba(197,198,210,0.7)"
                      />
                    </View>
                  </View>

                  {/* ── Venue ── */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>VENUE *</Text>
                    <TextInput
                      style={[
                        styles.formInput,
                        { borderBottomColor: getBorderColor("venue") },
                      ]}
                      value={venue}
                      onChangeText={setVenue}
                      onFocus={() => setFocusedField("venue")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Hall 04, Block A"
                      placeholderTextColor="rgba(197,198,210,0.7)"
                    />
                  </View>

                  {/* ── Location ── */}
                  <View style={styles.formGroup}>
                    <View style={styles.locationHeader}>
                      <Text style={styles.formLabel}>LOCATION *</Text>
                      <View style={styles.locationToggle}>
                        <Text style={styles.locationToggleText}>
                          {useCurrentLocation ? "AUTO GPS" : "MANUAL"}
                        </Text>
                        <Switch
                          value={useCurrentLocation}
                          onValueChange={(v) => {
                            setUseCurrentLocation(v);
                            if (v) getCurrentLocation();
                          }}
                          trackColor={{ false: "#e2e2e2", true: "#775a19" }}
                          thumbColor="#ffffff"
                        />
                      </View>
                    </View>

                    {useCurrentLocation ? (
                      <View style={styles.locationCard}>
                        {locationLoading ? (
                          <View style={styles.locationLoadingRow}>
                            <ActivityIndicator size="small" color="#775a19" />
                            <Text style={styles.locationLoadingText}>
                              Getting location...
                            </Text>
                          </View>
                        ) : currentCoords ? (
                          <View style={styles.locationInfo}>
                            <MaterialCommunityIcons
                              name="map-marker-check"
                              size={18}
                              color="#4CAF50"
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.locationCoords}>
                                {currentCoords.latitude.toFixed(6)},{" "}
                                {currentCoords.longitude.toFixed(6)}
                              </Text>
                              <Text style={styles.locationHint}>
                                GPS location captured ✓
                              </Text>
                            </View>
                            <TouchableOpacity onPress={getCurrentLocation}>
                              <MaterialCommunityIcons
                                name="refresh"
                                size={18}
                                color="#775a19"
                              />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.locationRetryBtn}
                            onPress={getCurrentLocation}
                          >
                            <MaterialCommunityIcons
                              name="crosshairs-gps"
                              size={16}
                              color="#775a19"
                            />
                            <Text style={styles.locationRetryText}>
                              TAP TO GET LOCATION
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View>
                        <View style={styles.manualCoordsNote}>
                          <MaterialCommunityIcons
                            name="information-outline"
                            size={13}
                            color="#775a19"
                          />
                          <Text style={styles.manualCoordsNoteText}>
                            Enter the exact GPS coordinates of the lecture venue
                          </Text>
                        </View>
                        <View style={styles.formRow}>
                          <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.formLabelSmall}>LATITUDE</Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                { borderBottomColor: getBorderColor("lat") },
                              ]}
                              value={manualLat}
                              onChangeText={setManualLat}
                              onFocus={() => setFocusedField("lat")}
                              onBlur={() => setFocusedField(null)}
                              placeholder="6.123456"
                              placeholderTextColor="rgba(197,198,210,0.7)"
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.formLabelSmall}>LONGITUDE</Text>
                            <TextInput
                              style={[
                                styles.formInput,
                                { borderBottomColor: getBorderColor("lng") },
                              ]}
                              value={manualLng}
                              onChangeText={setManualLng}
                              onFocus={() => setFocusedField("lng")}
                              onBlur={() => setFocusedField(null)}
                              placeholder="80.567890"
                              placeholderTextColor="rgba(197,198,210,0.7)"
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* ── Settings Grid ── */}
                  <View style={styles.settingsGrid}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabelSmall}>GPS RADIUS (m)</Text>
                      <TextInput
                        style={[
                          styles.formInputSmall,
                          { borderBottomColor: getBorderColor("radius") },
                        ]}
                        value={radiusInMeters}
                        onChangeText={setRadiusInMeters}
                        onFocus={() => setFocusedField("radius")}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabelSmall}>QR VALID (min)</Text>
                      <TextInput
                        style={[
                          styles.formInputSmall,
                          { borderBottomColor: getBorderColor("qrDuration") },
                        ]}
                        value={qrValidDuration}
                        onChangeText={setQrValidDuration}
                        onFocus={() => setFocusedField("qrDuration")}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabelSmall}>DURATION (hrs)</Text>
                      <TextInput
                        style={[
                          styles.formInputSmall,
                          { borderBottomColor: getBorderColor("duration") },
                        ]}
                        value={sessionDurationHours}
                        onChangeText={setSessionDurationHours}
                        onFocus={() => setFocusedField("duration")}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {/* ── Info Note ── */}
                  <View style={styles.infoNote}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={14}
                      color="#775a19"
                    />
                    <Text style={styles.infoNoteText}>
                      Students must be within the GPS radius and scan the QR
                      code before it expires to mark attendance. The GPS radius
                      is enforced strictly by the server.
                    </Text>
                  </View>

                  {/* ── Create Button ── */}
                  <TouchableOpacity
                    style={[
                      styles.createSessionBtn,
                      creating && styles.btnDisabled,
                    ]}
                    onPress={handleCreateSession}
                    activeOpacity={0.85}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="broadcast"
                          size={18}
                          color="#ffffff"
                        />
                        <Text style={styles.createSessionBtnText}>
                          START SESSION
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════
           QR CODE MODAL
         ═══════════════════════════════════ */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            {/* Top bar */}
            <View style={styles.qrModalTopBar}>
              <View style={styles.qrModalTopLeft}>
                <View style={styles.qrLiveDot} />
                <Text style={styles.qrLiveText}>LIVE SESSION</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                style={styles.qrModalCloseBtn}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#444650"
                />
              </TouchableOpacity>
            </View>

            {/* Course info */}
            <View style={styles.qrCourseInfo}>
              <View style={styles.qrCourseBadge}>
                <Text style={styles.qrCourseBadgeText}>
                  {qrData?.course?.courseCode || "N/A"}
                </Text>
              </View>
              <Text style={styles.qrCourseTitle} numberOfLines={2}>
                {qrData?.course?.courseName || "—"}
              </Text>
              <View style={styles.qrVenueRow}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={13}
                  color="#757682"
                />
                <Text style={styles.qrVenueText}>{qrData?.venue || "—"}</Text>
              </View>
              <View style={styles.qrMetaRow}>
                <View style={styles.qrMetaItem}>
                  <MaterialCommunityIcons
                    name="counter"
                    size={12}
                    color="#757682"
                  />
                  <Text style={styles.qrMetaText}>
                    Lecture #{qrData?.lectureNumber}
                  </Text>
                </View>
                <View style={styles.qrMetaDivider} />
                <View style={styles.qrMetaItem}>
                  <MaterialCommunityIcons
                    name="radar"
                    size={12}
                    color="#757682"
                  />
                  <Text style={styles.qrMetaText}>
                    {qrData?.radiusInMeters || 100}m radius
                  </Text>
                </View>
              </View>

              {(() => {
                const { latitude, longitude } = extractVenueCoords(qrData);
                if (latitude !== null && longitude !== null) {
                  return (
                    <View style={styles.qrCoordsRow}>
                      <MaterialCommunityIcons
                        name="crosshairs-gps"
                        size={11}
                        color="#757682"
                      />
                      <Text style={styles.qrCoordsText}>
                        {latitude.toFixed(5)}, {longitude.toFixed(5)}
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}
            </View>

            {/* QR Code Image */}
            <View style={styles.qrImageSection}>
              {qrData?.qrCodeImage ? (
                <View style={styles.qrImageFrame}>
                  <Image
                    source={{ uri: qrData.qrCodeImage }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.qrImageFallback}>
                  <MaterialCommunityIcons
                    name="qrcode"
                    size={120}
                    color="#00113a"
                  />
                  <Text style={styles.qrFallbackText}>QR not available</Text>
                </View>
              )}
              <View style={styles.qrScanHint}>
                <MaterialCommunityIcons
                  name="cellphone-screenshot"
                  size={15}
                  color="#775a19"
                />
                <Text style={styles.qrScanHintText}>
                  Students scan this to mark attendance
                </Text>
              </View>
            </View>

            {/* Session ID */}
            <View style={styles.qrSessionIdBox}>
              <Text style={styles.qrSessionIdLabel}>SESSION ID</Text>
              <Text style={styles.qrSessionIdValue} numberOfLines={1}>
                {qrData?.sessionId}
              </Text>
            </View>

            {/* Valid Until */}
            {qrData?.qrValidUntil && (
              <View style={styles.qrValidRow}>
                <MaterialCommunityIcons
                  name="clock-alert-outline"
                  size={14}
                  color="#F59E0B"
                />
                <Text style={styles.qrValidLabel}>VALID UNTIL</Text>
                <Text style={styles.qrValidTime}>
                  {formatTime(qrData.qrValidUntil)}
                </Text>
              </View>
            )}

            {qrData?.startTime && qrData?.endTime && (
              <View style={styles.qrTimeRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={13}
                  color="#757682"
                />
                <Text style={styles.qrTimeText}>
                  {formatTime(qrData.startTime)} — {formatTime(qrData.endTime)}
                </Text>
              </View>
            )}

            <View style={styles.qrInfoNote}>
              <MaterialCommunityIcons
                name="information-outline"
                size={13}
                color="#775a19"
              />
              <Text style={styles.qrInfoNoteText}>
                Students must be within GPS radius and scan before QR expires.
                Location is strictly verified by the server.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.qrActionRow}>
              <TouchableOpacity
                style={styles.qrSecondaryBtn}
                onPress={() => setShowQRModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.qrSecondaryBtnText}>CLOSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.qrPrimaryBtn}
                onPress={() => {
                  setShowQRModal(false);
                  if (qrData?.sessionId) {
                    router.push({
                      pathname: "/(lecturer)/session-detail",
                      params: { sessionId: qrData.sessionId },
                    });
                  }
                }}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="eye-outline"
                  size={15}
                  color="#ffffff"
                />
                <Text style={styles.qrPrimaryBtnText}>VIEW DETAILS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  safeArea: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.3)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 3,
    color: "#775a19",
  },
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#002366",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#ffffff",
  },

  // ── Filters ──
  filtersRow: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.15)",
  },
  filterChips: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f3f3f3",
  },
  filterChipActive: {
    backgroundColor: "rgba(233,193,118,0.3)",
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.3)",
  },
  filterChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
  },
  filterChipTextActive: { color: "#5d4201" },

  // ── Search ──
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#00113a",
  },

  // ── Results Row ──
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  resultsText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
    textTransform: "uppercase",
  },
  resultsPageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resultsPage: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
  },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
  },

  // ── Scroll Content ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 14,
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
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#002366",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  emptyBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#ffffff",
  },

  // ── Session Card ──
  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 10,
  },
  sessionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sessionDate: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#775a19",
    textTransform: "uppercase",
  },
  sessionTime: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
  },
  statusPillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  countdownText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#F59E0B",
  },
  sessionCardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  courseCodeBadge: {
    backgroundColor: "rgba(0,35,102,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  courseCodeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#002366",
  },
  sessionTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 17,
    color: "#00113a",
    flex: 1,
  },
  sessionCardMeta: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  coordsText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#a0a1ad",
    letterSpacing: 0.3,
  },
  sessionCardFooter: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(197,198,210,0.15)",
  },
  sessionActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#f3f3f3",
  },
  sessionActionBtnDanger: {
    backgroundColor: "rgba(186,26,26,0.06)",
  },
  sessionActionText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#00113a",
  },

  // ── Pagination ──
  paginationWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  pageNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
  },
  pageNavBtnDisabled: {
    opacity: 0.35,
  },
  pageNavText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#00113a",
  },
  pageNavTextDisabled: {
    color: "#c5c6d2",
  },
  pageNumbersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  pageNum: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  pageNumActive: {
    backgroundColor: "#00113a",
    borderColor: "#00113a",
  },
  pageNumText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: "#757682",
  },
  pageNumTextActive: { color: "#ffffff" },
  pageDots: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  pageDotsText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#c5c6d2",
    letterSpacing: 2,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    backgroundColor: "#f9f9f9",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.15)",
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e2e2",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: "#775a19",
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScroll: { flex: 1 },
  modalForm: { padding: 20, gap: 24 },

  // ── Form Elements ──
  formGroup: { gap: 6 },
  formLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: "#444650",
  },
  formLabelSmall: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
  },
  formInput: {
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    color: "#00113a",
    borderBottomWidth: 2,
    borderBottomColor: "#c5c6d2",
    paddingVertical: 8,
  },
  formInputSmall: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: "#00113a",
    borderBottomWidth: 2,
    borderBottomColor: "#c5c6d2",
    paddingVertical: 6,
  },
  formRow: { flexDirection: "row", gap: 16 },
  formDropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#c5c6d2",
    paddingVertical: 10,
  },
  formDropdownText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: "#00113a",
    flex: 1,
  },
  formDropdownPlaceholder: { color: "rgba(197,198,210,0.7)" },

  // ── Course Picker ──
  pickerDropdown: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
    marginTop: 4,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.1)",
  },
  pickerItemActive: { backgroundColor: "rgba(119,90,25,0.06)" },
  pickerItemText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#444650",
  },
  pickerItemTextActive: { color: "#775a19" },
  pickerItemSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
    marginTop: 1,
  },
  pickerEmpty: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    padding: 16,
    textAlign: "center",
  },

  // ── Location ──
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationToggleText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#775a19",
  },
  locationCard: {
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
  },
  locationLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 8,
  },
  locationLoadingText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationCoords: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: "#00113a",
  },
  locationHint: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#4CAF50",
    marginTop: 1,
  },
  locationRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  locationRetryText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#775a19",
  },
  manualCoordsNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "rgba(119,90,25,0.05)",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    marginTop: 6,
  },
  manualCoordsNoteText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#444650",
    flex: 1,
    lineHeight: 16,
  },

  // ── Settings Grid ──
  settingsGrid: { flexDirection: "row", gap: 12 },

  // ── Info Note ──
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(119,90,25,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#775a19",
  },
  infoNoteText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#444650",
    lineHeight: 17,
    flex: 1,
  },

  // ── Create Session Button ──
  createSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#002366",
    paddingVertical: 18,
    borderRadius: 4,
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  createSessionBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#ffffff",
  },
  btnDisabled: { opacity: 0.7 },

  // ── QR Modal ──
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,17,58,0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  qrModalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.2)",
  },
  qrModalTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qrLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  qrLiveText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: "#4CAF50",
  },
  qrModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
  },
  qrCourseInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.15)",
  },
  qrCourseBadge: {
    backgroundColor: "rgba(0,35,102,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  qrCourseBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#002366",
  },
  qrCourseTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    color: "#00113a",
    lineHeight: 24,
  },
  qrVenueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  qrVenueText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
  },
  qrMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  qrMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  qrMetaText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },
  qrMetaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(197,198,210,0.5)",
  },
  qrCoordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  qrCoordsText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#a0a1ad",
    letterSpacing: 0.3,
  },
  qrImageSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fafafa",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.15)",
    gap: 12,
  },
  qrImageFrame: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  qrImage: {
    width: SCREEN_WIDTH * 0.52,
    height: SCREEN_WIDTH * 0.52,
    maxWidth: 220,
    maxHeight: 220,
  },
  qrImageFallback: {
    width: SCREEN_WIDTH * 0.52,
    height: SCREEN_WIDTH * 0.52,
    maxWidth: 220,
    maxHeight: 220,
    backgroundColor: "#f3f3f3",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  qrFallbackText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
  },
  qrScanHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qrScanHintText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: "#775a19",
    letterSpacing: 0.5,
  },
  qrSessionIdBox: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  qrSessionIdLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
  },
  qrSessionIdValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: "#00113a",
    letterSpacing: 0.5,
  },
  qrValidRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "rgba(245,158,11,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#F59E0B",
  },
  qrValidLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#F59E0B",
    flex: 1,
  },
  qrValidTime: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#F59E0B",
  },
  qrTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 20,
    marginTop: 6,
  },
  qrTimeText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },
  qrInfoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "rgba(119,90,25,0.06)",
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#775a19",
  },
  qrInfoNoteText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#444650",
    flex: 1,
    lineHeight: 15,
  },
  qrActionRow: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
  },
  qrSecondaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.4)",
    alignItems: "center",
  },
  qrSecondaryBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#757682",
  },
  qrPrimaryBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 4,
    backgroundColor: "#002366",
  },
  qrPrimaryBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#ffffff",
  },

  // ── Footer ──
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