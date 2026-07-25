import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import api from "@/src/api/axiosInstance";

const TABS = ["Inbox", "Sent", "Send"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const RECIPIENT_TYPES = [
  {
    id: "my-students",
    label: "All My Students",
    sub: "Students in all your assigned courses",
    icon: "account-group-outline",
  },
  {
    id: "course-students",
    label: "Course Students",
    sub: "Students enrolled in one specific course",
    icon: "book-account-outline",
  },
  {
    id: "specific-student",
    label: "Specific Student",
    sub: "Send to one or more individual students",
    icon: "account-arrow-right-outline",
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const getPriorityColor = (p) => {
  switch (p?.toLowerCase()) {
    case "urgent":
      return "#ba1a1a";
    case "high":
      return "#F59E0B";
    case "medium":
      return "#4CAF50";
    case "low":
      return "#757682";
    default:
      return "#757682";
  }
};

const getPriorityBg = (p) => {
  switch (p?.toLowerCase()) {
    case "urgent":
      return "rgba(186,26,26,0.08)";
    case "high":
      return "rgba(245,158,11,0.08)";
    case "medium":
      return "rgba(76,175,80,0.08)";
    case "low":
      return "rgba(117,118,130,0.08)";
    default:
      return "rgba(117,118,130,0.08)";
  }
};

const getTypeIcon = (type) => {
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

const formatDate = (dateStr) => {
  if (!dateStr) 
    return "—";

  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) 
    return "Just now";
  if (mins < 60) 
    return `${mins}m ago`;
  if (hours < 24) 
    return `${hours}h ago`;
  if (days < 7) 
    return `${days}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatFullDate = (dateStr) => {
  if (!dateStr) 
    return "—";
  
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Inbox");

  // ── Inbox ──
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inboxPage, setInboxPage] = useState(1);
  const [inboxPagination, setInboxPagination] = useState({
    total: 0,
    pages: 1,
  });
  const [filterUnread, setFilterUnread] = useState(false);
  const [inboxSearch, setInboxSearch] = useState("");

  // ── Sent ──
  const [sentList, setSentList] = useState([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentRefreshing, setSentRefreshing] = useState(false);
  const [sentPage, setSentPage] = useState(1);
  const [sentPagination, setSentPagination] = useState({ total: 0, pages: 1 });
  const [sentSearch, setSentSearch] = useState("");
  const [expandedSent, setExpandedSent] = useState(null);

  // ── Send form ──
  const [sendTitle, setSendTitle] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendPriority, setSendPriority] = useState("medium");
  const [recipientType, setRecipientType] = useState("my-students");

  // Course picker
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // ── Specific student search ──
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]); // [{_id, name, studentId, department}]
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const studentSearchTimer = useRef(null);

  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setInboxLoading(true);
      const params = new URLSearchParams({ page: inboxPage, limit: 20 });

      if (filterUnread) 
        params.append("isRead", "false");

      const res = await api.get(`/notification/my-notifications?${params}`);

      if (res.data.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
        setInboxPagination(res.data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.log("fetchNotifications:", err.message);
    } finally {
      setInboxLoading(false);
    }
  }, [inboxPage, filterUnread]);

  useEffect(() => {
    if (activeTab === "Inbox") 
      fetchNotifications();
  }, [fetchNotifications, activeTab]);

  const fetchSentNotifications = useCallback(async () => {
    try {
      setSentLoading(true);
      const params = new URLSearchParams({ page: sentPage, limit: 20 });
      const res = await api.get(`/notification/sent?${params}`);
      if (res.data.success) {
        setSentList(res.data.data || []);
        setSentPagination(res.data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.log("fetchSentNotifications:", err.message);
      setSentList([]);
    } finally {
      setSentLoading(false);
    }
  }, [sentPage]);

  useEffect(() => {
    if (activeTab === "Sent") fetchSentNotifications();
  }, [fetchSentNotifications, activeTab]);

  const fetchCourses = async () => {
    try {
      setCoursesLoading(true);
      const res = await api.get("/course/my-courses");
      if (res.data.success) {
        const data = res.data.data || [];
        setCourses(data);
        if (data.length > 0) 
          setSelectedCourseId(data[0]._id);
      }
    } catch (err) {
      console.log("fetchCourses:", err.message);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Send") fetchCourses();
  }, [activeTab]);

  const searchStudents = async (query) => {
    if (!query.trim()) {
      setStudentResults([]);
      return;
    }
    try {
      setStudentSearchLoading(true);
      // Search students from lecturer's courses via /student/all?search=...
      // Backend already filters to ensure they are in lecturer's courses
      // via the specific-student recipientType validation
      const res = await api.get(
        `/student/all?search=${encodeURIComponent(query.trim())}&limit=20&page=1`,
      );
      if (res.data.success) {
        // Filter out already selected students
        const results = (res.data.data || []).filter(
          (s) => !selectedStudents.find((sel) => sel._id === s._id),
        );
        setStudentResults(results);
      }
    } catch (err) {
      console.log("searchStudents:", err.message);
      setStudentResults([]);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  // Debounced student search
  const handleStudentSearchChange = (text) => {
    setStudentSearch(text);
    if (studentSearchTimer.current) 
      clearTimeout(studentSearchTimer.current);

    studentSearchTimer.current = setTimeout(() => {
      searchStudents(text);
    }, 400);
  };

  const addStudent = (student) => {
    setSelectedStudents((prev) => {
      if (prev.find((s) => s._id === student._id)) return prev;
      return [
        ...prev,
        {
          _id: student._id,
          name: student.name,
          studentId: student.studentId,
          department: student.department,
          batch: student.batch,
        },
      ];
    });
    // Remove from results
    setStudentResults((prev) => prev.filter((s) => s._id !== student._id));
    setStudentSearch("");
  };

  const removeStudent = (studentId) => {
    setSelectedStudents((prev) => prev.filter((s) => s._id !== studentId));
  };

  // ═════════════════════════════════════
  // REFRESH
  // ═════════════════════════════════════
  const onRefreshInbox = async () => {
    setRefreshing(true);
    setInboxPage(1);
    await fetchNotifications();
    setRefreshing(false);
  };

  const onRefreshSent = async () => {
    setSentRefreshing(true);
    setSentPage(1);
    await fetchSentNotifications();
    setSentRefreshing(false);
  };

  // ═════════════════════════════════════
  // INBOX ACTIONS
  // ═════════════════════════════════════
  const markAsRead = async (id) => {
    try {
      await api.put(`/notification/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.log("markAsRead:", err.message);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/notification/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.log(err.message);

      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/notification/${id}`);
              setNotifications((prev) => prev.filter((n) => n._id !== id));
            } catch (err) {
              console.log(err.message);

              Alert.alert("Error", "Failed to delete notification");
            }
          },
        },
      ],
    );
  };

  // ═════════════════════════════════════
  // SEND NOTIFICATION
  // ═════════════════════════════════════
  const resetSendForm = () => {
    setSendTitle("");
    setSendMessage("");
    setSendPriority("medium");
    setRecipientType("my-students");
    setSelectedStudents([]);
    setStudentSearch("");
    setStudentResults([]);
    setShowStudentSearch(false);
  };

  const handleSend = async () => {
    if (!sendTitle.trim()) {
      Alert.alert("Validation", "Please enter a notification title");
      return;
    }
    if (!sendMessage.trim()) {
      Alert.alert("Validation", "Please enter the notification message");
      return;
    }
    if (recipientType === "course-students" && !selectedCourseId) {
      Alert.alert("Validation", "Please select a course");
      return;
    }
    if (recipientType === "specific-student" && selectedStudents.length === 0) {
      Alert.alert("Validation", "Please select at least one student");
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: sendTitle.trim(),
        message: sendMessage.trim(),
        type: "general",
        priority: sendPriority,
        recipientType,
      };

      if (recipientType === "course-students") {
        payload.courseId = selectedCourseId;
      }

      // For specific-student: pass array of student IDs
      if (recipientType === "specific-student") {
        payload.recipientIds = selectedStudents.map((s) => s._id);
      }

      const res = await api.post("/notification/send-bulk", payload);

      if (res.data.success) {
        const count = res.data.data?.recipientCount || 0;
        Alert.alert(
          "✅ Sent Successfully",
          `Notification delivered to ${count} student${count !== 1 ? "s" : ""}.`,
          [
            {
              text: "View in Sent",
              onPress: () => {
                resetSendForm();
                setActiveTab("Sent");
                setSentPage(1);
              },
            },
            { text: "OK", onPress: resetSendForm },
          ],
        );
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to send notification",
      );
    } finally {
      setSending(false);
    }
  };

  // ═════════════════════════════════════
  // FILTERED LISTS
  // ═════════════════════════════════════
  const filteredInbox = notifications.filter((n) => {
    if (!inboxSearch.trim()) return true;
    const q = inboxSearch.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q)
    );
  });

  const filteredSent = sentList.filter((n) => {
    if (!sentSearch.trim()) return true;
    const q = sentSearch.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q)
    );
  });

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);

  // ═════════════════════════════════════
  // RENDER INBOX
  // ═════════════════════════════════════
  const renderInbox = () => (
    <View style={styles.sectionContainer}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{inboxPagination.total}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: "rgba(245,158,11,0.06)" },
          ]}
        >
          <Text style={[styles.statValue, { color: "#F59E0B" }]}>
            {unreadCount}
          </Text>
          <Text style={styles.statLabel}>UNREAD</Text>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: "rgba(76,175,80,0.06)" }]}
        >
          <Text style={[styles.statValue, { color: "#4CAF50" }]}>
            {inboxPagination.total - unreadCount}
          </Text>
          <Text style={styles.statLabel}>READ</Text>
        </View>
      </View>
      {/* Search + filter */}
      <View style={styles.controlRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={16} color="#757682" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            placeholderTextColor="rgba(117,118,130,0.5)"
            value={inboxSearch}
            onChangeText={setInboxSearch}
          />
          {inboxSearch.length > 0 && (
            <TouchableOpacity onPress={() => setInboxSearch("")}>
              <MaterialCommunityIcons name="close" size={14} color="#757682" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, filterUnread && styles.filterBtnActive]}
          onPress={() => {
            setFilterUnread((v) => !v);
            setInboxPage(1);
          }}
        >
          <MaterialCommunityIcons
            name="email-outline"
            size={16}
            color={filterUnread ? "#775a19" : "#757682"}
          />
          {unreadCount > 0 && !filterUnread && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {/* Mark all read */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
          <MaterialCommunityIcons name="check-all" size={14} color="#775a19" />
          <Text style={styles.markAllBtnText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      {/* List */}
      {inboxLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#775a19" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredInbox.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="bell-off-outline"
            size={52}
            color="#c5c6d2"
          />
          <Text style={styles.emptyTitle}>
            {filterUnread ? "No Unread Notifications" : "No Notifications"}
          </Text>
          <Text style={styles.emptyText}>
            {filterUnread
              ? "You're all caught up!"
              : "Notifications will appear here"}
          </Text>
        </View>
      ) : (
        <>
          {filteredInbox.map((n) => (
            <TouchableOpacity
              key={n._id}
              style={[styles.notifCard, !n.isRead && styles.notifCardUnread]}
              onPress={() => !n.isRead && markAsRead(n._id)}
              activeOpacity={0.85}
            >
              {!n.isRead && <View style={styles.unreadDot} />}
              <View
                style={[
                  styles.notifIcon,
                  { backgroundColor: getPriorityBg(n.priority) },
                ]}
              >
                <MaterialCommunityIcons
                  name={getTypeIcon(n.type)}
                  size={20}
                  color={getPriorityColor(n.priority)}
                />
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifTopRow}>
                  <Text
                    style={[
                      styles.notifTitle,
                      !n.isRead && styles.notifTitleUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {n.title}
                  </Text>
                  <Text style={styles.notifTime}>
                    {formatDate(n.createdAt)}
                  </Text>
                </View>
                <Text style={styles.notifMessage} numberOfLines={2}>
                  {n.message}
                </Text>
                <View style={styles.notifFooter}>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityBg(n.priority) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityBadgeText,
                        { color: getPriorityColor(n.priority) },
                      ]}
                    >
                      {n.priority?.toUpperCase()}
                    </Text>
                  </View>
                  {n.isRead ? (
                    <View style={styles.readBadge}>
                      <MaterialCommunityIcons
                        name="check"
                        size={10}
                        color="#4CAF50"
                      />
                      <Text style={styles.readBadgeText}>READ</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.markReadBtn}
                      onPress={() => markAsRead(n._id)}
                    >
                      <Text style={styles.markReadBtnText}>MARK READ</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDelete(n._id)}
                    style={styles.deleteBtn}
                  >
                    <MaterialCommunityIcons
                      name="delete-outline"
                      size={16}
                      color="#c5c6d2"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {inboxPagination.pages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  inboxPage <= 1 && styles.pageBtnDisabled,
                ]}
                onPress={() => setInboxPage((p) => Math.max(1, p - 1))}
                disabled={inboxPage <= 1}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={20}
                  color={inboxPage <= 1 ? "#c5c6d2" : "#00113a"}
                />
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                {inboxPage} / {inboxPagination.pages}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  inboxPage >= inboxPagination.pages && styles.pageBtnDisabled,
                ]}
                onPress={() =>
                  setInboxPage((p) => Math.min(inboxPagination.pages, p + 1))
                }
                disabled={inboxPage >= inboxPagination.pages}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={
                    inboxPage >= inboxPagination.pages ? "#c5c6d2" : "#00113a"
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );

  // ═════════════════════════════════════
  // RENDER SENT
  // ═════════════════════════════════════
  const renderSent = () => (
    <View style={styles.sectionContainer}>
      {/* Banner */}
      <View style={styles.sentBanner}>
        <View style={styles.sentBannerIconWrap}>
          <MaterialCommunityIcons name="send-check" size={28} color="#ffffff" />
        </View>
        <View style={styles.sentBannerText}>
          <Text style={styles.sentBannerValue}>{sentPagination.total}</Text>
          <Text style={styles.sentBannerLabel}>
            Total notifications sent by you
          </Text>
        </View>
      </View>
      {/* Search */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={16} color="#757682" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sent notifications..."
          placeholderTextColor="rgba(117,118,130,0.5)"
          value={sentSearch}
          onChangeText={setSentSearch}
        />
        {sentSearch.length > 0 && (
          <TouchableOpacity onPress={() => setSentSearch("")}>
            <MaterialCommunityIcons name="close" size={14} color="#757682" />
          </TouchableOpacity>
        )}
      </View>
      {sentLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#775a19" />
          <Text style={styles.loadingText}>Loading sent history...</Text>
        </View>
      ) : filteredSent.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="send-outline"
            size={52}
            color="#c5c6d2"
          />
          <Text style={styles.emptyTitle}>No Sent Notifications</Text>
          <Text style={styles.emptyText}>
            Notifications you send will appear here with delivery stats
          </Text>
          <TouchableOpacity
            style={styles.goSendBtn}
            onPress={() => setActiveTab("Send")}
          >
            <MaterialCommunityIcons name="send" size={14} color="#ffffff" />
            <Text style={styles.goSendBtnText}>SEND NOTIFICATION</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {filteredSent.map((item, index) => {
            const readRate =
              item.recipientCount > 0
                ? Math.round((item.readCount / item.recipientCount) * 100)
                : 0;
            const isExpanded = expandedSent === item._id;

            return (
              <TouchableOpacity
                key={`${item._id}_${index}`}
                style={styles.sentCard}
                onPress={() => setExpandedSent(isExpanded ? null : item._id)}
                activeOpacity={0.85}
              >
                <View style={styles.sentCardTop}>
                  <View
                    style={[
                      styles.sentIcon,
                      { backgroundColor: getPriorityBg(item.priority) },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getTypeIcon(item.type)}
                      size={18}
                      color={getPriorityColor(item.priority)}
                    />
                  </View>
                  <View style={styles.sentCardMid}>
                    <Text
                      style={styles.sentTitle}
                      numberOfLines={isExpanded ? 5 : 1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.sentDate}>
                      {formatFullDate(item.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.sentCardRight}>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityBg(item.priority) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityBadgeText,
                          { color: getPriorityColor(item.priority) },
                        ]}
                      >
                        {item.priority?.toUpperCase()}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#c5c6d2"
                    />
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.sentExpandedBody}>
                    <Text style={styles.sentExpandedLabel}>MESSAGE</Text>
                    <Text style={styles.sentExpandedMessage}>
                      {item.message}
                    </Text>
                  </View>
                )}

                <View style={styles.sentStatsRow}>
                  <View style={styles.sentStat}>
                    <MaterialCommunityIcons
                      name="account-group-outline"
                      size={13}
                      color="#757682"
                    />
                    <Text style={styles.sentStatText}>
                      {item.recipientCount} sent
                    </Text>
                  </View>
                  <View style={styles.sentStat}>
                    <MaterialCommunityIcons
                      name="eye-outline"
                      size={13}
                      color="#4CAF50"
                    />
                    <Text style={[styles.sentStatText, { color: "#4CAF50" }]}>
                      {item.readCount} read
                    </Text>
                  </View>
                  <View style={styles.sentStat}>
                    <MaterialCommunityIcons
                      name="eye-off-outline"
                      size={13}
                      color="#F59E0B"
                    />
                    <Text style={[styles.sentStatText, { color: "#F59E0B" }]}>
                      {item.recipientCount - item.readCount} unread
                    </Text>
                  </View>
                  <Text style={styles.sentRateText}>{readRate}% read</Text>
                </View>

                <View style={styles.sentProgressTrack}>
                  <View
                    style={[
                      styles.sentProgressFill,
                      {
                        width: `${readRate}%`,
                        backgroundColor:
                          readRate >= 75
                            ? "#4CAF50"
                            : readRate >= 40
                              ? "#F59E0B"
                              : "#ba1a1a",
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}

          {sentPagination.pages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  sentPage <= 1 && styles.pageBtnDisabled,
                ]}
                onPress={() => setSentPage((p) => Math.max(1, p - 1))}
                disabled={sentPage <= 1}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={20}
                  color={sentPage <= 1 ? "#c5c6d2" : "#00113a"}
                />
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                {sentPage} / {sentPagination.pages}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  sentPage >= sentPagination.pages && styles.pageBtnDisabled,
                ]}
                onPress={() =>
                  setSentPage((p) => Math.min(sentPagination.pages, p + 1))
                }
                disabled={sentPage >= sentPagination.pages}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={
                    sentPage >= sentPagination.pages ? "#c5c6d2" : "#00113a"
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );

  // ═════════════════════════════════════
  // RENDER SEND FORM
  // ═════════════════════════════════════
  const renderSend = () => (
    <View style={styles.sendForm}>
      {/* ── Step 1: Recipients ── */}
      <View style={styles.formSection}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>1</Text>
          </View>
          <Text style={styles.formSectionLabel}>SELECT RECIPIENTS</Text>
        </View>

        {RECIPIENT_TYPES.map((rt) => (
          <TouchableOpacity
            key={rt.id}
            style={[
              styles.recipientOption,
              recipientType === rt.id && styles.recipientOptionActive,
            ]}
            onPress={() => {
              setRecipientType(rt.id);
              // Clear specific-student selections when switching away
              if (rt.id !== "specific-student") {
                setSelectedStudents([]);
                setStudentSearch("");
                setStudentResults([]);
                setShowStudentSearch(false);
              }
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.recipientOptionIconWrap,
                recipientType === rt.id && styles.recipientOptionIconWrapActive,
              ]}
            >
              <MaterialCommunityIcons
                name={rt.icon}
                size={20}
                color={recipientType === rt.id ? "#775a19" : "#757682"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.recipientOptionTitle,
                  recipientType === rt.id && { color: "#775a19" },
                ]}
              >
                {rt.label}
              </Text>
              <Text style={styles.recipientOptionSub}>{rt.sub}</Text>
            </View>
            <MaterialCommunityIcons
              name={
                recipientType === rt.id ? "radiobox-marked" : "radiobox-blank"
              }
              size={20}
              color={recipientType === rt.id ? "#775a19" : "#c5c6d2"}
            />
          </TouchableOpacity>
        ))}

        {/* ── Course picker (course-students) ── */}
        {recipientType === "course-students" && (
          <View style={styles.subPickerContainer}>
            <Text style={styles.subPickerLabel}>SELECT COURSE</Text>
            {coursesLoading ? (
              <ActivityIndicator size="small" color="#775a19" />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.coursePickerBtn}
                  onPress={() => setShowCoursePicker(!showCoursePicker)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="book-open-variant"
                    size={16}
                    color="#775a19"
                  />
                  <Text style={styles.coursePickerBtnText} numberOfLines={1}>
                    {selectedCourse
                      ? `${selectedCourse.courseCode} — ${selectedCourse.courseName}`
                      : "Select a course"}
                  </Text>
                  <MaterialCommunityIcons
                    name={showCoursePicker ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#757682"
                  />
                </TouchableOpacity>

                {showCoursePicker && (
                  <View style={styles.courseDropdown}>
                    {courses.length === 0 ? (
                      <Text style={styles.courseDropdownEmpty}>
                        No courses assigned
                      </Text>
                    ) : (
                      courses.map((c) => (
                        <TouchableOpacity
                          key={c._id}
                          style={[
                            styles.courseDropdownItem,
                            selectedCourseId === c._id &&
                              styles.courseDropdownItemActive,
                          ]}
                          onPress={() => {
                            setSelectedCourseId(c._id);
                            setShowCoursePicker(false);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.courseDropdownCode,
                                selectedCourseId === c._id && {
                                  color: "#775a19",
                                },
                              ]}
                            >
                              {c.courseCode}
                            </Text>
                            <Text
                              style={styles.courseDropdownName}
                              numberOfLines={1}
                            >
                              {c.courseName}
                            </Text>
                          </View>
                          <Text style={styles.courseDropdownEnrolled}>
                            {c.enrolledStudents?.length || 0} students
                          </Text>
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
              </>
            )}
          </View>
        )}

        {/* ── Specific student selector ── */}
        {recipientType === "specific-student" && (
          <View style={styles.subPickerContainer}>
            <Text style={styles.subPickerLabel}>
              SEARCH & SELECT STUDENTS
              {selectedStudents.length > 0 && (
                <Text style={styles.subPickerCount}>
                  {" "}
                  · {selectedStudents.length} selected
                </Text>
              )}
            </Text>

            {/* Selected students chips */}
            {selectedStudents.length > 0 && (
              <View style={styles.selectedStudentsWrap}>
                {selectedStudents.map((s) => (
                  <View key={s._id} style={styles.selectedStudentChip}>
                    <View style={styles.selectedStudentChipAvatar}>
                      <Text style={styles.selectedStudentChipAvatarText}>
                        {s.name?.charAt(0)?.toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={styles.selectedStudentChipInfo}>
                      <Text
                        style={styles.selectedStudentChipName}
                        numberOfLines={1}
                      >
                        {s.name}
                      </Text>
                      <Text style={styles.selectedStudentChipId}>
                        {s.studentId}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeStudent(s._id)}
                      style={styles.selectedStudentChipRemove}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={14}
                        color="#ba1a1a"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Search input */}
            <TouchableOpacity
              style={styles.studentSearchToggle}
              onPress={() => setShowStudentSearch((v) => !v)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="account-search-outline"
                size={18}
                color="#775a19"
              />
              <Text style={styles.studentSearchToggleText}>
                {showStudentSearch ? "Close search" : "Search for a student..."}
              </Text>
              <MaterialCommunityIcons
                name={showStudentSearch ? "chevron-up" : "chevron-down"}
                size={18}
                color="#757682"
              />
            </TouchableOpacity>

            {showStudentSearch && (
              <View style={styles.studentSearchPanel}>
                {/* Search bar */}
                <View style={styles.studentSearchBar}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={16}
                    color="#757682"
                  />
                  <TextInput
                    style={styles.studentSearchInput}
                    placeholder="Name, student ID or email..."
                    placeholderTextColor="rgba(117,118,130,0.5)"
                    value={studentSearch}
                    onChangeText={handleStudentSearchChange}
                    autoFocus
                  />
                  {studentSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setStudentSearch("");
                        setStudentResults([]);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={14}
                        color="#757682"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Results */}
                {studentSearchLoading ? (
                  <View style={styles.studentSearchLoading}>
                    <ActivityIndicator size="small" color="#775a19" />
                    <Text style={styles.studentSearchLoadingText}>
                      Searching...
                    </Text>
                  </View>
                ) : studentSearch.length > 0 && studentResults.length === 0 ? (
                  <View style={styles.studentSearchEmpty}>
                    <MaterialCommunityIcons
                      name="account-off-outline"
                      size={28}
                      color="#c5c6d2"
                    />
                    <Text style={styles.studentSearchEmptyText}>
                      No students found
                    </Text>
                  </View>
                ) : studentResults.length > 0 ? (
                  <View style={styles.studentResultsList}>
                    {studentResults.map((s) => (
                      <TouchableOpacity
                        key={s._id}
                        style={styles.studentResultItem}
                        onPress={() => addStudent(s)}
                        activeOpacity={0.75}
                      >
                        {/* Avatar */}
                        <View style={styles.studentResultAvatar}>
                          <Text style={styles.studentResultAvatarText}>
                            {s.name?.charAt(0)?.toUpperCase() || "?"}
                          </Text>
                        </View>

                        {/* Info */}
                        <View style={styles.studentResultInfo}>
                          <Text
                            style={styles.studentResultName}
                            numberOfLines={1}
                          >
                            {s.name}
                          </Text>
                          <Text style={styles.studentResultMeta}>
                            {s.studentId} · {s.department}
                          </Text>
                          <Text style={styles.studentResultBatch}>
                            Batch {s.batch}
                          </Text>
                        </View>

                        {/* Add button */}
                        <View style={styles.studentResultAddBtn}>
                          <MaterialCommunityIcons
                            name="plus-circle"
                            size={22}
                            color="#775a19"
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.studentSearchHint}>
                    <MaterialCommunityIcons
                      name="account-search-outline"
                      size={24}
                      color="#c5c6d2"
                    />
                    <Text style={styles.studentSearchHintText}>
                      Type to search students from your courses
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Info note */}
            <View style={styles.studentSearchInfoNote}>
              <MaterialCommunityIcons
                name="information-outline"
                size={12}
                color="#775a19"
              />
              <Text style={styles.studentSearchInfoNoteText}>
                Only students from your assigned courses can be selected. The
                server validates this automatically.
              </Text>
            </View>
          </View>
        )}
      </View>
      {/* ── Step 2: Title ── */}
      <View style={styles.formSection}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>2</Text>
          </View>
          <Text style={styles.formSectionLabel}>NOTIFICATION TITLE *</Text>
        </View>
        <TextInput
          style={styles.titleInput}
          placeholder="Enter a clear, concise title..."
          placeholderTextColor="rgba(197,198,210,0.7)"
          value={sendTitle}
          onChangeText={setSendTitle}
        />
      </View>
      {/* ── Step 3: Message ── */}
      <View style={styles.formSection}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>3</Text>
          </View>
          <Text style={styles.formSectionLabel}>MESSAGE *</Text>
        </View>
        <TextInput
          style={styles.messageInput}
          placeholder="Write your message here..."
          placeholderTextColor="rgba(197,198,210,0.7)"
          value={sendMessage}
          onChangeText={setSendMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{sendMessage.length} characters</Text>
      </View>
      {/* ── Step 4: Priority ── */}
      <View style={styles.formSection}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>4</Text>
          </View>
          <Text style={styles.formSectionLabel}>PRIORITY</Text>
        </View>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.priorityChip,
                sendPriority === p && {
                  backgroundColor: getPriorityBg(p),
                  borderColor: getPriorityColor(p),
                  borderWidth: 2,
                },
              ]}
              onPress={() => setSendPriority(p)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.priorityChipDot,
                  { backgroundColor: getPriorityColor(p) },
                ]}
              />
              <Text
                style={[
                  styles.priorityChipText,
                  sendPriority === p && { color: getPriorityColor(p) },
                ]}
              >
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* ── Preview ── */}
      {(sendTitle.length > 0 || sendMessage.length > 0) && (
        <View style={styles.formSection}>
          <View style={styles.stepHeader}>
            <View
              style={[
                styles.stepBadge,
                { backgroundColor: "rgba(76,175,80,0.12)" },
              ]}
            >
              <MaterialCommunityIcons
                name="eye-outline"
                size={12}
                color="#4CAF50"
              />
            </View>
            <Text style={styles.formSectionLabel}>PREVIEW</Text>
          </View>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIconWrap}>
                <MaterialCommunityIcons name="bell" size={20} color="#775a19" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewFrom}>
                  {user?.name || "Lecturer"}
                </Text>
                <Text style={styles.previewTime}>Just now</Text>
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityBg(sendPriority) },
                ]}
              >
                <Text
                  style={[
                    styles.priorityBadgeText,
                    { color: getPriorityColor(sendPriority) },
                  ]}
                >
                  {sendPriority.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.previewTitle}>
              {sendTitle || "Notification Title"}
            </Text>
            <Text style={styles.previewMessage} numberOfLines={3}>
              {sendMessage || "Message preview..."}
            </Text>
            {/* Recipients summary in preview */}
            <View style={styles.previewRecipientsRow}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={12}
                color="#757682"
              />
              <Text style={styles.previewRecipientsText}>
                {recipientType === "my-students"
                  ? "→ All your students"
                  : recipientType === "course-students"
                    ? `→ ${selectedCourse ? `${selectedCourse.courseCode} students` : "Course students"}`
                    : selectedStudents.length > 0
                      ? `→ ${selectedStudents.map((s) => s.name.split(" ")[0]).join(", ")}`
                      : "→ No students selected yet"}
              </Text>
            </View>
          </View>
        </View>
      )}
      {/* ── Info ── */}
      <View style={styles.infoNote}>
        <MaterialCommunityIcons
          name="information-outline"
          size={14}
          color="#775a19"
        />
        <Text style={styles.infoNoteText}>
          {recipientType === "my-students"
            ? "This will be sent to all students in your assigned courses."
            : recipientType === "course-students"
              ? "This will be sent to students enrolled in the selected course."
              : selectedStudents.length > 0
                ? `This will be sent to ${selectedStudents.length} selected student${selectedStudents.length > 1 ? "s" : ""}.`
                : "Please select at least one student to send this notification."}
        </Text>
      </View>
      {/* ── Send button ── */}
      <TouchableOpacity
        style={[
          styles.sendBtn,
          (sending ||
            (recipientType === "specific-student" &&
              selectedStudents.length === 0)) &&
            styles.sendBtnDisabled,
        ]}
        onPress={handleSend}
        disabled={
          sending ||
          (recipientType === "specific-student" &&
            selectedStudents.length === 0)
        }
        activeOpacity={0.85}
      >
        {sending ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="send" size={16} color="#ffffff" />
            <Text style={styles.sendBtnText}>
              {recipientType === "specific-student" &&
              selectedStudents.length > 0
                ? `SEND TO ${selectedStudents.length} STUDENT${selectedStudents.length > 1 ? "S" : ""}`
                : "SEND NOTIFICATION"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // ═════════════════════════════════════
  // MAIN RENDER
  // ═════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.archivalHeader}>
            <View style={styles.archivalAccent} />
            <View>
              <Text style={styles.archivalLabel}>DISPATCH CENTER</Text>
              <Text style={styles.archivalTitle}>
                {activeTab === "Inbox"
                  ? "Notifications"
                  : activeTab === "Sent"
                    ? "Sent History"
                    : "Send Notification"}
              </Text>
            </View>
          </View>
          {activeTab === "Inbox" && unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount} unread</Text>
            </View>
          )}
        </View>
        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.toUpperCase()}
              </Text>
              {tab === "Inbox" && unreadCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            activeTab === "Inbox" ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefreshInbox}
                tintColor="#775a19"
              />
            ) : activeTab === "Sent" ? (
              <RefreshControl
                refreshing={sentRefreshing}
                onRefresh={onRefreshSent}
                tintColor="#775a19"
              />
            ) : undefined
          }
        >
          {activeTab === "Inbox" && renderInbox()}
          {activeTab === "Sent" && renderSent()}
          {activeTab === "Send" && renderSend()}

          <Text style={styles.footerText}>
            © SABARAGAMUWA UNIVERSITY OF SRI LANKA
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  archivalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  archivalAccent: { width: 2, height: 44, backgroundColor: "#775a19" },
  archivalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#775a19",
    marginBottom: 3,
  },
  archivalTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
    color: "#00113a",
  },
  headerBadge: {
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  headerBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#F59E0B",
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.2)",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 4,
    gap: 6,
  },
  tabActive: { borderBottomColor: "#775a19" },
  tabText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#757682",
  },
  tabTextActive: { color: "#00113a" },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    color: "#ffffff",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Section container
  sectionContainer: { gap: 12 },

  // ── Inbox ──
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
    color: "#00113a",
  },
  statLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
  },

  controlRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 12,
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
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  filterBtnActive: {
    borderColor: "#775a19",
    backgroundColor: "rgba(119,90,25,0.06)",
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    color: "#ffffff",
  },

  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(119,90,25,0.07)",
  },
  markAllBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#775a19",
  },

  // Notification card
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    position: "relative",
  },
  notifCardUnread: {
    borderColor: "rgba(119,90,25,0.2)",
    backgroundColor: "rgba(119,90,25,0.02)",
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    left: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#775a19",
  },
  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  notifContent: { flex: 1, gap: 4 },
  notifTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  notifTitle: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#444650",
    flex: 1,
  },
  notifTitleUnread: {
    fontFamily: "Manrope_700Bold",
    color: "#00113a",
  },
  notifTime: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#a0a1ad",
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  notifMessage: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
    lineHeight: 18,
  },
  notifFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },
  readBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(76,175,80,0.08)",
  },
  readBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: "#4CAF50",
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(119,90,25,0.08)",
  },
  markReadBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: "#775a19",
  },
  deleteBtn: {
    marginLeft: "auto",
    padding: 2,
  },

  // ── Sent ──
  sentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#00113a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 4,
  },
  sentBannerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  sentBannerText: { gap: 2 },
  sentBannerValue: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 32,
    color: "#ffffff",
  },
  sentBannerLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },

  sentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sentCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sentIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  sentCardMid: { flex: 1, gap: 3 },
  sentTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#00113a",
  },
  sentDate: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#a0a1ad",
    letterSpacing: 0.3,
  },
  sentCardRight: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  sentExpandedBody: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  sentExpandedLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#757682",
  },
  sentExpandedMessage: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#444650",
    lineHeight: 20,
  },
  sentStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  sentStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sentStatText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: "#757682",
  },
  sentRateText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: "#00113a",
    marginLeft: "auto",
  },
  sentProgressTrack: {
    height: 4,
    backgroundColor: "rgba(197,198,210,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  sentProgressFill: {
    height: "100%",
    borderRadius: 2,
  },

  // ── Send Form ──
  sendForm: { gap: 16 },
  formSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(119,90,25,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: "#775a19",
  },
  formSectionLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#444650",
  },

  // Recipient options
  recipientOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
    backgroundColor: "#fafafa",
  },
  recipientOptionActive: {
    borderColor: "rgba(119,90,25,0.3)",
    backgroundColor: "rgba(119,90,25,0.04)",
  },
  recipientOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
  },
  recipientOptionIconWrapActive: {
    backgroundColor: "rgba(119,90,25,0.1)",
  },
  recipientOptionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#444650",
    marginBottom: 2,
  },
  recipientOptionSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },

  // Sub-picker (course / student)
  subPickerContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.15)",
    borderStyle: "dashed",
  },
  subPickerLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#775a19",
  },
  subPickerCount: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#002366",
  },

  // Course picker
  coursePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
  },
  coursePickerBtnText: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
  },
  courseDropdown: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  courseDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.1)",
  },
  courseDropdownItemActive: {
    backgroundColor: "rgba(119,90,25,0.05)",
  },
  courseDropdownCode: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    color: "#444650",
    marginBottom: 2,
  },
  courseDropdownName: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },
  courseDropdownEnrolled: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#a0a1ad",
    marginRight: 6,
  },
  courseDropdownEmpty: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    textAlign: "center",
    padding: 16,
  },

  // Selected students chips
  selectedStudentsWrap: {
    gap: 8,
  },
  selectedStudentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,35,102,0.15)",
  },
  selectedStudentChipAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#002366",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  selectedStudentChipAvatarText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#ffffff",
  },
  selectedStudentChipInfo: { flex: 1 },
  selectedStudentChipName: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#00113a",
    marginBottom: 1,
  },
  selectedStudentChipId: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
    letterSpacing: 0.5,
  },
  selectedStudentChipRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(186,26,26,0.08)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  // Student search toggle
  studentSearchToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.2)",
  },
  studentSearchToggleText: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#775a19",
  },

  // Student search panel
  studentSearchPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  studentSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.15)",
  },
  studentSearchInput: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#00113a",
  },

  // Student search states
  studentSearchLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  studentSearchLoadingText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
  },
  studentSearchEmpty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  studentSearchEmptyText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
  },
  studentSearchHint: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  studentSearchHintText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#a0a1ad",
    textAlign: "center",
  },

  // Student result items
  studentResultsList: {
    gap: 0,
  },
  studentResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.1)",
  },
  studentResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#002366",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  studentResultAvatarText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    color: "#ffffff",
  },
  studentResultInfo: { flex: 1 },
  studentResultName: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: "#00113a",
    marginBottom: 2,
  },
  studentResultMeta: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    marginBottom: 1,
  },
  studentResultBatch: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#775a19",
  },
  studentResultAddBtn: {
    padding: 4,
    flexShrink: 0,
  },

  // Student search info note
  studentSearchInfoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "rgba(119,90,25,0.05)",
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#775a19",
  },
  studentSearchInfoNoteText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#444650",
    flex: 1,
    lineHeight: 15,
  },

  // Title input
  titleInput: {
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    color: "#00113a",
    borderBottomWidth: 2,
    borderBottomColor: "#c5c6d2",
    paddingVertical: 10,
  },

  // Message input
  messageInput: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: "#00113a",
    backgroundColor: "#fafafa",
    borderRadius: 8,
    padding: 14,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
    lineHeight: 22,
  },
  charCount: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#a0a1ad",
    textAlign: "right",
    letterSpacing: 0.5,
  },

  // Priority row
  priorityRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  priorityChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f3f3f3",
    borderWidth: 1,
    borderColor: "transparent",
    minWidth: "20%",
  },
  priorityChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  priorityChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#757682",
  },

  // Preview card
  previewCard: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.15)",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(119,90,25,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewFrom: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    color: "#00113a",
  },
  previewTime: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#a0a1ad",
  },
  previewTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    color: "#00113a",
  },
  previewMessage: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
    lineHeight: 18,
  },
  previewRecipientsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(197,198,210,0.2)",
  },
  previewRecipientsText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    color: "#757682",
    flex: 1,
  },

  // Info note
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(119,90,25,0.05)",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#775a19",
  },
  infoNoteText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#444650",
    flex: 1,
    lineHeight: 17,
  },

  // Send button
  sendBtn: {
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
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#ffffff",
  },

  // Go send button (from Sent empty state)
  goSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#002366",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  goSendBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#ffffff",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
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
    maxWidth: 260,
  },

  // Loading
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 14,
  },
  loadingText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    letterSpacing: 1,
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageInfo: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 2,
    color: "#00113a",
  },

  // Footer
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