import { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import api from "@/src/api/axiosInstance";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "../../../src/components/LoadingScreen";


const FILTER_CHIPS = ["All", "Alerts", "Schedule", "System"];

const TYPE_MAP = {
  low_attendance_warning: {
    chip: "Alerts",
    icon: "alert-circle",
    color: "#ba1a1a",
  },
  session_created: {
    chip: "Schedule",
    icon: "broadcast",
    color: "#002366",
  },
  attendance_marked: {
    chip: "System",
    icon: "check-circle-outline",
    color: "#4CAF50",
  },
  face_verification_failed: {
    chip: "Alerts",
    icon: "face-recognition",
    color: "#F59E0B",
  },
  location_verification_failed: {
    chip: "Alerts",
    icon: "map-marker-off",
    color: "#F59E0B",
  },
  session_closing: {
    chip: "Schedule",
    icon: "clock-alert-outline",
    color: "#775a19",
  },
  mahapola_eligibility: {
    chip: "System",
    icon: "school-outline",
    color: "#002366",
  },
  general: {
    chip: "System",
    icon: "bell-outline",
    color: "#757682",
  },
};

const PRIORITY_COLOR = {
  urgent: "#ba1a1a",
  high: "#F59E0B",
  medium: "#4CAF50",
  low: "#757682",
};

const PRIORITY_BG = {
  urgent: "rgba(186,26,26,0.08)",
  high: "rgba(245,158,11,0.08)",
  medium: "rgba(76,175,80,0.08)",
  low: "rgba(117,118,130,0.08)",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getTypeInfo = (type) => TYPE_MAP[type] || TYPE_MAP.general;


// ── Section Header ──
const SectionHeader = memo(function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionHeaderAccent} />
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
      </View>
      {count > 0 && (
        <View style={styles.sectionHeaderBadge}>
          <Text style={styles.sectionHeaderBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
});

// ── Notification Card ──
const NotifCard = memo(function NotifCard({ notification: n, onRead, onDelete }) {
  const isUnread = !n.isRead;
  const typeInfo = getTypeInfo(n.type);
  const priorityColor = PRIORITY_COLOR[n.priority] || PRIORITY_COLOR.low;
  const priorityBg = PRIORITY_BG[n.priority] || PRIORITY_BG.low;
  const isHighPriority = n.priority === "urgent" || n.priority === "high";

  return (
    <TouchableOpacity
      style={[
        styles.notifCard,
        isUnread && styles.notifCardUnread,
        isUnread && isHighPriority && styles.notifCardHighPriority,
        isUnread &&
          isHighPriority && { borderLeftColor: typeInfo.color },
      ]}
      onPress={() => isUnread && onRead()}
      activeOpacity={isUnread ? 0.85 : 1}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <View
          style={[
            styles.unreadDot,
            // Push dot right if high priority left border is shown
            isHighPriority && styles.unreadDotShifted,
          ]}
        />
      )}

      {/* Type icon */}
      <View style={[styles.notifIcon, { backgroundColor: `${typeInfo.color}12` }]}>
        <MaterialCommunityIcons
          name={typeInfo.icon}
          size={20}
          color={typeInfo.color}
        />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        {/* Title + time */}
        <View style={styles.notifTitleRow}>
          <Text
            style={[styles.notifTitle, isUnread && styles.notifTitleBold]}
            numberOfLines={2}
          >
            {n.title}
          </Text>
          <Text style={styles.notifTime}>{formatDate(n.createdAt)}</Text>
        </View>

        {/* Message body */}
        <Text style={styles.notifMessage} numberOfLines={isUnread ? 3 : 2}>
          {n.message}
        </Text>

        {/* Footer — priority badge + actions */}
        <View style={styles.notifFooterRow}>
          {/* Priority badge */}
          <View style={[styles.priorityBadge, { backgroundColor: priorityBg }]}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {n.priority?.toUpperCase()}
            </Text>
          </View>

          {/* Actions */}
          {isUnread ? (
            <View style={styles.notifActions}>
              <TouchableOpacity
                style={styles.notifActionBtn}
                onPress={onRead}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="check" size={12} color="#4CAF50" />
                <Text style={styles.notifActionRead}>Read</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.notifActionBtn, styles.notifActionBtnDismiss]}
                onPress={onDelete}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="close" size={12} color="#ba1a1a" />
                <Text style={styles.notifActionDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="delete-outline" size={16} color="#c5c6d2" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChip, setActiveChip] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // ── Fetch ──
  const fetchNotifications = useCallback(async (targetPage) => {
    try {
      setLoading(true);
      const p = targetPage || page;
      const params = new URLSearchParams({ page: p, limit: 20 });
      const res = await api.get(`/notification/my-notifications?${params}`);
      if (res.data.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
        setPagination(res.data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      console.log("fetchNotifications:", err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  // ── Refresh (always resets to page 1) ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 20 });
      const res = await api.get(`/notification/my-notifications?${params}`);
      if (res.data.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
        setPagination(res.data.pagination || { total: 0, pages: 1 });
        setPage(1);
      }
    } catch (err) {
      console.log("onRefresh:", err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ── Mark single as read ──
  const markAsRead = useCallback(async (id) => {
    try {
      await api.put(`/notification/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.log("markAsRead:", err.message);
    }
  }, []);

  // ── Mark all read ──
  const markAllRead = useCallback(async () => {
    try {
      await api.put("/notification/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      Alert.alert("Error", "Failed to mark all as read");
    }
  }, []);

  // ── Delete (fixed: single setNotifications call) ──
  const handleDelete = useCallback((id) => {
    Alert.alert(
      "Remove Notification",
      "Remove this notification from your archive?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // Check if it was unread BEFORE removing
              const target = notifications.find((n) => n._id === id);
              const wasUnread = target && !target.isRead;

              await api.delete(`/notification/${id}`);

              setNotifications((prev) => prev.filter((n) => n._id !== id));
              if (wasUnread) {
                setUnreadCount((c) => Math.max(0, c - 1));
              }
            } catch (err) {
              Alert.alert("Error", "Failed to remove notification");
            }
          },
        },
      ],
    );
  }, [notifications]);

  // ── Derived: filter by chip ──
  const filteredNotifications = notifications.filter((n) => {
    if (activeChip === "All") return true;
    return getTypeInfo(n.type).chip === activeChip;
  });

  // ── Chip counts ──
  const chipCounts = FILTER_CHIPS.reduce((acc, chip) => {
    acc[chip] =
      chip === "All"
        ? notifications.length
        : notifications.filter((n) => getTypeInfo(n.type).chip === chip).length;
    return acc;
  }, {});

  // ── Group by today / older ──
  const todayStr = new Date().toDateString();
  const todayList = filteredNotifications.filter(
    (n) => new Date(n.createdAt).toDateString() === todayStr,
  );
  const olderList = filteredNotifications.filter(
    (n) => new Date(n.createdAt).toDateString() !== todayStr,
  );

  // ── Unread in filtered list ──
  const filteredUnread = filteredNotifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllRead}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="check-all" size={14} color="#775a19" />
            <Text style={styles.markAllBtnText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter chips ── */}
      <View style={styles.filterChipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {FILTER_CHIPS.map((chip) => {
            const count = chipCounts[chip] || 0;
            const isActive = activeChip === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveChip(chip)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {chip.toUpperCase()}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.chipCount,
                      isActive ? styles.chipCountActive : styles.chipCountInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipCountText,
                        isActive && styles.chipCountTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Stats bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statsBarLeft}>
          <MaterialCommunityIcons name="archive-outline" size={13} color="#757682" />
          <Text style={styles.statsBarText}>
            {filteredNotifications.length} notification
            {filteredNotifications.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {filteredUnread > 0 && (
          <View style={styles.statsBarUnread}>
            <View style={styles.statsBarDot} />
            <Text style={styles.statsBarUnreadText}>{filteredUnread} unread</Text>
          </View>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <SafeAreaView style={{ flex: 1 }}>
        <LoadingScreen
          message="Loading notifications..."
          submessage="Syncing your latest updates"
          variant="full"
        />
      </SafeAreaView>
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
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={40}
                  color="#757682"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeChip === "All"
                  ? "The Archive is Quiet"
                  : `No ${activeChip} Notifications`}
              </Text>
              <Text style={styles.emptyText}>
                {activeChip === "All"
                  ? "You are all caught up with your notifications."
                  : `No ${activeChip.toLowerCase()} notifications at this time.`}
              </Text>
              {activeChip !== "All" && (
                <TouchableOpacity
                  style={styles.clearChipBtn}
                  onPress={() => setActiveChip("All")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearChipBtnText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {/* ── Today ── */}
              {todayList.length > 0 && (
                <View style={styles.sectionGroup}>
                  <SectionHeader title="Today" count={todayList.length} />
                  {todayList.map((n) => (
                    <NotifCard
                      key={n._id}
                      notification={n}
                      onRead={() => markAsRead(n._id)}
                      onDelete={() => handleDelete(n._id)}
                    />
                  ))}
                </View>
              )}

              {/* ── Divider ── */}
              {todayList.length > 0 && olderList.length > 0 && (
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Earlier</Text>
                  <View style={styles.dividerLine} />
                </View>
              )}

              {/* ── Older ── */}
              {olderList.length > 0 && (
                <View style={styles.sectionGroup}>
                  {todayList.length === 0 && (
                    <SectionHeader title="All Notifications" count={olderList.length} />
                  )}
                  {olderList.map((n) => (
                    <NotifCard
                      key={n._id}
                      notification={n}
                      onRead={() => markAsRead(n._id)}
                      onDelete={() => handleDelete(n._id)}
                    />
                  ))}
                </View>
              )}

              {/* ── Pagination ── */}
              {pagination.pages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={20}
                      color={page <= 1 ? "#c5c6d2" : "#00113a"}
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
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={page >= pagination.pages ? "#c5c6d2" : "#00113a"}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <Text style={styles.footerText}>
            © SABARAGAMUWA UNIVERSITY OF SRI LANKA
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.15)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 26,
    color: "#00113a",
  },
  unreadCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#775a19",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadCountText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    color: "#ffffff",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(119,90,25,0.08)",
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.15)",
  },
  markAllBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
    color: "#775a19",
  },

  // ── Filter Chips (fixed: no position:fixed, proper container) ──
  filterChipsContainer: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.1)",
  },
  filterChipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f3f3",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#002366",
    borderColor: "#002366",
    shadowColor: "#002366",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#757682",
  },
  filterChipTextActive: { color: "#ffffff" },
  chipCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  chipCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipCountInactive: { backgroundColor: "rgba(0,0,0,0.06)" },
  chipCountText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    color: "#757682",
  },
  chipCountTextActive: { color: "#ffffff" },

  // ── Stats bar ──
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statsBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statsBarText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#757682",
    textTransform: "uppercase",
  },
  statsBarUnread: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statsBarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#775a19",
  },
  statsBarUnreadText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#775a19",
  },

  // ── Scroll Content ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },

  // ── Section Group (wraps header + cards with consistent gap) ──
  sectionGroup: {
    gap: 10,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeaderAccent: {
    width: 3,
    height: 16,
    backgroundColor: "#775a19",
    borderRadius: 2,
  },
  sectionHeaderTitle: {
    fontFamily: "Newsreader_400Regular",
    fontStyle: "italic",
    fontSize: 18,
    color: "#00113a",
  },
  sectionHeaderBadge: {
    backgroundColor: "rgba(119,90,25,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionHeaderBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#775a19",
  },

  // ── Notification Card ──
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.15)",
    position: "relative",
    overflow: "hidden",
  },
  notifCardUnread: {
    borderColor: "rgba(119,90,25,0.12)",
    backgroundColor: "#ffffff",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  notifCardHighPriority: {
    borderLeftWidth: 4,
  },

  // Unread dot
  unreadDot: {
    position: "absolute",
    top: 18,
    left: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#775a19",
    zIndex: 1,
  },
  unreadDotShifted: {
    left: 10,
  },

  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: 6,
  },
  notifTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  notifTitle: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    color: "rgba(0,17,58,0.65)",
    flex: 1,
    lineHeight: 20,
  },
  notifTitleBold: {
    fontFamily: "Manrope_700Bold",
    color: "#00113a",
  },
  notifTime: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 0.5,
    color: "#c5c6d2",
    marginTop: 3,
    flexShrink: 0,
  },
  notifMessage: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#757682",
    lineHeight: 18,
  },
  notifFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  // Priority badge
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  priorityText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },

  // Actions
  notifActions: {
    flexDirection: "row",
    gap: 6,
  },
  notifActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "rgba(76,175,80,0.08)",
  },
  notifActionBtnDismiss: {
    backgroundColor: "rgba(186,26,26,0.06)",
  },
  notifActionRead: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
    color: "#4CAF50",
  },
  notifActionDismiss: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
    color: "#ba1a1a",
  },
  deleteBtn: {
    padding: 4,
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(197,198,210,0.2)",
  },
  dividerText: {
    fontFamily: "Newsreader_400Regular",
    fontStyle: "italic",
    fontSize: 13,
    color: "#c5c6d2",
  },

  // ── Empty state ──
  emptyState: {
    paddingVertical: 70,
    alignItems: "center",
    gap: 14,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
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
    lineHeight: 20,
  },
  clearChipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,35,102,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,35,102,0.1)",
    marginTop: 4,
  },
  clearChipBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#002366",
  },

  // ── Pagination ──
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
    marginBottom: 8,
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

  // ── Footer ──
  footerText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 7,
    letterSpacing: 3,
    color: "#757682",
    textAlign: "center",
    opacity: 0.3,
    marginTop: 20,
  },
});