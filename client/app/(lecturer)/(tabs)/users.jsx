import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Image,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import api from "@/src/api/axiosInstance";
import LoadingScreen from "../../../src/components/LoadingScreen";

// ── Constants ────────────────────────────────────────────────────
const TABS = ["Students", "Lecturers"];

const BATCHES = [
  "All Batches",
  "2019/2020",
  "2020/2021",
  "2021/2022",
  "2022/2023",
  "2023/2024",
  "2024/2025",
  "2025/2026",
];

const DEPARTMENTS = [
  "All",
  "Software Engineering",
  "Information System",
  "Data Science",
  "General",
];

const STATUS_OPTIONS = ["All", "Active", "Inactive"];

const BATCH_COLORS = {
  "2019/2020": { bg: "rgba(186,26,26,0.08)", text: "#ba1a1a", border: "rgba(186,26,26,0.2)" },
  "2020/2021": { bg: "rgba(119,90,25,0.08)", text: "#775a19", border: "rgba(119,90,25,0.2)" },
  "2021/2022": { bg: "rgba(0,35,102,0.08)", text: "#002366", border: "rgba(0,35,102,0.2)" },
  "2022/2023": { bg: "rgba(0,100,80,0.08)", text: "#006450", border: "rgba(0,100,80,0.2)" },
  "2023/2024": { bg: "rgba(100,0,120,0.08)", text: "#640078", border: "rgba(100,0,120,0.2)" },
  "2024/2025": { bg: "rgba(0,17,58,0.08)", text: "#00113a", border: "rgba(0,17,58,0.2)" },
  "2025/2026": { bg: "rgba(30,100,30,0.08)", text: "#1e641e", border: "rgba(30,100,30,0.2)" },
};

// ── Main Component ────────────────────────────────────────────────
export default function UsersScreen() {
  const [activeTab, setActiveTab] = useState("Students");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // ── Filters ──
  const [filterBatch, setFilterBatch] = useState(""); // Students only
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── View mode: "grid" | "batch" (Students only) ──
  const [viewMode, setViewMode] = useState("grid");

  // ── Batch grouped data ──
  const [batchGroups, setBatchGroups] = useState({});
  const [expandedBatches, setExpandedBatches] = useState({});

  // ── Animation ──
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ─────────────────────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      if (activeTab === "Students") {
        if (viewMode === "batch") {
          // Fetch all students grouped by batch
          await fetchAllBatches();
        } else {
          const params = new URLSearchParams({ page, limit: 12 });
          if (filterBatch && filterBatch !== "All Batches")
            params.append("batch", filterBatch);
          if (filterDept && filterDept !== "All")
            params.append("department", filterDept);
          if (filterStatus && filterStatus !== "All")
            params.append("isActive", filterStatus === "Active" ? "true" : "false");
          if (search.trim())
            params.append("search", search.trim());

          const res = await api.get(`/student/all?${params}`);
          if (res.data.success) {
            setStudents(res.data.data || []);
            setPagination(res.data.pagination || { total: 0, pages: 1 });
          }
        }
      } else {
        const params = new URLSearchParams({ page, limit: 12 });
        if (filterDept && filterDept !== "All")
          params.append("department", filterDept);
        if (filterStatus && filterStatus !== "All")
          params.append("isActive", filterStatus === "Active" ? "true" : "false");
        if (search.trim())
          params.append("search", search.trim());

        const res = await api.get(`/lecturer/all?${params}`);
        if (res.data.success) {
          setLecturers(res.data.data || []);
          setPagination(res.data.pagination || { total: 0, pages: 1 });
        }
      }
    } catch (err) {
      console.log("Fetch users error:", err.message);
      Alert.alert("Error", "Failed to load users. Please try again.");
    } finally {
      setLoading(false);
      // Animate in
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab, page, filterBatch, filterDept, filterStatus, search, viewMode]);

  // Fetch all students batch by batch in parallel
  const fetchAllBatches = async () => {
    try {
      const batches = BATCHES.filter((b) => b !== "All Batches");

      const batchPromises = batches.map((batch) =>
        api
          .get(`/student/all?batch=${encodeURIComponent(batch)}&limit=200&page=1`)
          .then((r) => ({ batch, data: r.data.success ? r.data.data || [] : [] }))
          .catch(() => ({ batch, data: [] })),
      );

      const results = await Promise.all(batchPromises);

      const grouped = {};
      results.forEach(({ batch, data }) => {
        if (data.length > 0) grouped[batch] = data;
      });

      setBatchGroups(grouped);

      // Auto-expand all batches that have data
      const expanded = {};
      Object.keys(grouped).forEach((b) => {
        expanded[b] = true;
      });
      setExpandedBatches(expanded);
    } catch (err) {
      console.log("fetchAllBatches error:", err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setFilterBatch("");
    setFilterDept("");
    setFilterStatus("");
    setViewMode("grid");
    setBatchGroups({});
  };

  const handleViewMode = (mode) => {
    setViewMode(mode);
    setPage(1);
    setSearch("");
  };

  const toggleBatch = (batch) => {
    setExpandedBatches((prev) => ({ ...prev, [batch]: !prev[batch] }));
  };

  const handleDeptFilter = (dept) => {
    setFilterDept(dept === "All" ? "" : dept);
    setPage(1);
  };

  const handleStatusFilter = (status) => {
    setFilterStatus(status === "All" ? "" : status);
    setPage(1);
  };

  const handleBatchFilter = (batch) => {
    setFilterBatch(batch === "All Batches" ? "" : batch);
    setPage(1);
  };

  const clearFilters = () => {
    setFilterBatch("");
    setFilterDept("");
    setFilterStatus("");
    setSearch("");
    setPage(1);
  };

  const handleImport = () => {
    Alert.alert("Import Users", "Import functionality will be available soon.", [
      { text: "OK" },
    ]);
  };

  const handleExport = () => {
    Alert.alert("Export Users", `Exporting ${activeTab} data...`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Export CSV",
        onPress: () =>
          Alert.alert("Success", `${activeTab} data exported successfully.`),
      },
    ]);
  };

  const handleUserPress = (user) => {
    if (activeTab === "Students") {
      router.push({
        pathname: "/(lecturer)/student-details",
        params: { userId: user._id, userName: user.name },
      });
    } else {
      router.push({
        pathname: "/(lecturer)/lecturer-details",
        params: { userId: user._id, userName: user.name },
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────────────────────────
  const currentData = activeTab === "Students" ? students : lecturers;

  const activeFiltersCount = [
    filterBatch,
    filterDept,
    filterStatus,
  ].filter(Boolean).length;

  // Total students in batch view
  const batchTotalStudents = Object.values(batchGroups).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      <SafeAreaView style={styles.safeArea}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.archivalHeader}>
            <View style={styles.archivalAccent} />
            <View>
              <Text style={styles.archivalLabel}>SABARAGAMUWA UNIVERSITY</Text>
              <Text style={styles.archivalTitle}>User Management</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleImport}>
              <MaterialCommunityIcons name="upload" size={16} color="#00113a" />
              <Text style={styles.headerBtnText}>IMPORT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={handleExport}>
              <MaterialCommunityIcons name="download" size={16} color="#00113a" />
              <Text style={styles.headerBtnText}>EXPORT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
              >
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── View Mode Toggle (Students only) ── */}
        {activeTab === "Students" && (
          <View style={styles.viewModeRow}>
            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === "grid" && styles.viewModeBtnActive,
              ]}
              onPress={() => handleViewMode("grid")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="view-grid-outline"
                size={16}
                color={viewMode === "grid" ? "#ffffff" : "#757682"}
              />
              <Text
                style={[
                  styles.viewModeBtnText,
                  viewMode === "grid" && styles.viewModeBtnTextActive,
                ]}
              >
                GRID
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === "batch" && styles.viewModeBtnActive,
              ]}
              onPress={() => handleViewMode("batch")}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="layers-outline"
                size={16}
                color={viewMode === "batch" ? "#ffffff" : "#757682"}
              />
              <Text
                style={[
                  styles.viewModeBtnText,
                  viewMode === "batch" && styles.viewModeBtnTextActive,
                ]}
              >
                BY BATCH
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Search + Filter Row (grid mode only) ── */}
        {viewMode === "grid" && (
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={20} color="#757682" />
              <TextInput
                style={styles.searchInput}
                placeholder={
                  activeTab === "Students"
                    ? "Search by name, ID, batch or email..."
                    : "Search by name, ID or email..."
                }
                placeholderTextColor="rgba(117,118,130,0.5)"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#757682" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.filterBtn,
                activeFiltersCount > 0 && styles.filterBtnActive,
              ]}
              onPress={() => setShowFilters((v) => !v)}
            >
              <MaterialCommunityIcons
                name="tune-variant"
                size={18}
                color={activeFiltersCount > 0 ? "#775a19" : "#757682"}
              />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Filter Panel ── */}
        {showFilters && viewMode === "grid" && (
          <View style={styles.filterPanel}>

            {/* Batch filter (Students only) */}
            {activeTab === "Students" && (
              <>
                <Text style={styles.filterGroupLabel}>BATCH</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChips}
                >
                  {BATCHES.map((batch) => {
                    const isSelected =
                      batch === "All Batches"
                        ? !filterBatch
                        : filterBatch === batch;
                    const color = BATCH_COLORS[batch];
                    return (
                      <TouchableOpacity
                        key={batch}
                        style={[
                          styles.chip,
                          isSelected && styles.chipActive,
                          isSelected && color && {
                            backgroundColor: color.bg,
                            borderColor: color.border,
                          },
                        ]}
                        onPress={() => handleBatchFilter(batch)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive,
                            isSelected && color && { color: color.text },
                          ]}
                        >
                          {batch}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Department filter */}
            <Text style={styles.filterGroupLabel}>DEPARTMENT</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              {DEPARTMENTS.map((dept) => {
                const isSelected =
                  dept === "All" ? !filterDept : filterDept === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => handleDeptFilter(dept)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {dept}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Status filter */}
            <Text style={styles.filterGroupLabel}>STATUS</Text>
            <View style={styles.filterChips}>
              {STATUS_OPTIONS.map((status) => {
                const isSelected =
                  status === "All" ? !filterStatus : filterStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => handleStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeFiltersCount > 0 && (
              <TouchableOpacity
                style={styles.clearFiltersBtn}
                onPress={clearFilters}
              >
                <MaterialCommunityIcons name="close-circle" size={14} color="#e53935" />
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Results Info ── */}
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {viewMode === "batch"
              ? `${batchTotalStudents} students across ${Object.keys(batchGroups).length} batches`
              : `${pagination.total} ${activeTab.toLowerCase()} found`}
          </Text>
          {viewMode === "grid" && (
            <Text style={styles.resultsPage}>
              Page {page} / {pagination.pages}
            </Text>
          )}
        </View>

        {/* ── Content ── */}
        {loading ? (
          <SafeAreaView style={{ flex: 1 }}>
          <LoadingScreen
            message={
              viewMode === "batch"
                ? "Loading all batches..."
                : `Loading ${activeTab.toLowerCase()}...`
            }
            submessage="Fetching user data and filters"
            variant="full"
          />
        </SafeAreaView>
        ) : (
          <Animated.ScrollView
            style={{ opacity: fadeAnim, flex: 1 }}
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
            {/* ══ BATCH VIEW ══ */}
            {viewMode === "batch" && activeTab === "Students" ? (
              Object.keys(batchGroups).length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="account-group-outline"
                    size={56}
                    color="#c5c6d2"
                  />
                  <Text style={styles.emptyTitle}>No Students Found</Text>
                  <Text style={styles.emptySubText}>
                    No students are registered in any batch yet
                  </Text>
                </View>
              ) : (
                // Render each batch as a collapsible section
                BATCHES.filter(
                  (b) => b !== "All Batches" && batchGroups[b]?.length > 0,
                ).map((batch) => {
                  const batchStudents = batchGroups[batch] || [];
                  const isExpanded = expandedBatches[batch];
                  const color = BATCH_COLORS[batch] || {
                    bg: "rgba(0,17,58,0.06)",
                    text: "#00113a",
                    border: "rgba(0,17,58,0.15)",
                  };

                  // Department breakdown within this batch
                  const deptCounts = batchStudents.reduce((acc, s) => {
                    acc[s.department] = (acc[s.department] || 0) + 1;
                    return acc;
                  }, {});

                  const activeCount = batchStudents.filter(
                    (s) => s.isActive !== false,
                  ).length;

                  const faceCount = batchStudents.filter(
                    (s) => s.faceDataRegistered,
                  ).length;

                  return (
                    <View key={batch} style={styles.batchSection}>
                      {/* Batch header — tap to expand/collapse */}
                      <TouchableOpacity
                        style={[
                          styles.batchHeader,
                          { borderLeftColor: color.text },
                        ]}
                        onPress={() => toggleBatch(batch)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.batchHeaderLeft}>
                          {/* Colour dot */}
                          <View
                            style={[
                              styles.batchDot,
                              { backgroundColor: color.text },
                            ]}
                          />
                          <View>
                            <Text style={styles.batchHeaderLabel}>
                              BATCH
                            </Text>
                            <Text
                              style={[
                                styles.batchHeaderTitle,
                                { color: color.text },
                              ]}
                            >
                              {batch}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.batchHeaderRight}>
                          {/* Student count pill */}
                          <View
                            style={[
                              styles.batchCountPill,
                              { backgroundColor: color.bg, borderColor: color.border },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="account-multiple"
                              size={12}
                              color={color.text}
                            />
                            <Text
                              style={[
                                styles.batchCountText,
                                { color: color.text },
                              ]}
                            >
                              {batchStudents.length}
                            </Text>
                          </View>

                          <MaterialCommunityIcons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={22}
                            color="#757682"
                          />
                        </View>
                      </TouchableOpacity>

                      {/* Batch stats bar (always visible) */}
                      <View style={styles.batchStatsBar}>
                        <BatchStat
                          icon="account-check-outline"
                          label="Active"
                          value={activeCount}
                          color="#4CAF50"
                        />
                        <View style={styles.batchStatDivider} />
                        <BatchStat
                          icon="account-cancel-outline"
                          label="Inactive"
                          value={batchStudents.length - activeCount}
                          color="#F59E0B"
                        />
                        <View style={styles.batchStatDivider} />
                        <BatchStat
                          icon="face-recognition"
                          label="Face Reg."
                          value={faceCount}
                          color="#002366"
                        />
                        <View style={styles.batchStatDivider} />
                        {/* Department mini badges */}
                        <View style={styles.batchDeptRow}>
                          {Object.entries(deptCounts).map(([dept, count]) => (
                            <View key={dept} style={styles.batchDeptBadge}>
                              <Text style={styles.batchDeptBadgeText}>
                                {dept === "Software Engineering"
                                  ? "SE"
                                  : dept === "Information System"
                                    ? "IS"
                                    : dept === "Data Science"
                                      ? "DS"
                                      : dept.substring(0, 2).toUpperCase()}
                                {" "}
                                {count}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Student cards */}
                      {isExpanded && (
                        <View style={styles.batchCardsGrid}>
                          {batchStudents.map((student) => (
                            <UserCard
                              key={student._id}
                              user={student}
                              type="student"
                              batchColor={color}
                              onPress={() => handleUserPress(student)}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )
            ) : (
              /* ══ GRID VIEW ══ */
              <>
                {currentData.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="account-search-outline"
                      size={56}
                      color="#c5c6d2"
                    />
                    <Text style={styles.emptyTitle}>
                      No {activeTab} Found
                    </Text>
                    <Text style={styles.emptySubText}>
                      {search || activeFiltersCount > 0
                        ? "Try adjusting your search or filters"
                        : `No ${activeTab.toLowerCase()} registered yet`}
                    </Text>
                    {(search || activeFiltersCount > 0) && (
                      <TouchableOpacity
                        onPress={clearFilters}
                        style={styles.clearBtn}
                      >
                        <Text style={styles.clearBtnText}>Clear Filters</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.cardsGrid}>
                    {currentData.map((user) => (
                      <UserCard
                        key={user._id}
                        user={user}
                        type={activeTab === "Students" ? "student" : "lecturer"}
                        onPress={() => handleUserPress(user)}
                      />
                    ))}
                  </View>
                )}

                {/* Pagination */}
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
                        color={page <= 1 ? "#c5c6d2" : "#00113a"}
                      />
                    </TouchableOpacity>

                    {(() => {
                      const totalPages = pagination.pages;
                      let pages = [];
                      if (totalPages <= 5) {
                        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                      } else if (page <= 3) {
                        pages = [1, 2, 3, 4, "...", totalPages];
                      } else if (page >= totalPages - 2) {
                        pages = [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                      } else {
                        pages = [1, "...", page - 1, page, page + 1, "...", totalPages];
                      }

                      return pages.map((p, i) =>
                        p === "..." ? (
                          <Text key={`dots-${i}`} style={styles.pageDots}>…</Text>
                        ) : (
                          <TouchableOpacity
                            key={p}
                            style={[styles.pageNum, page === p && styles.pageNumActive]}
                            onPress={() => setPage(p)}
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
                      );
                    })()}

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
          </Animated.ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

// ── Batch Stat ──
const BatchStat = ({ icon, label, value, color }) => (
  <View style={styles.batchStatItem}>
    <MaterialCommunityIcons name={icon} size={13} color={color} />
    <Text style={[styles.batchStatValue, { color }]}>{value}</Text>
    <Text style={styles.batchStatLabel}>{label}</Text>
  </View>
);

// ── User Card ──
const UserCard = ({ user, type, batchColor, onPress }) => {
  const isActive = user.isActive !== false;
  const id = type === "student" ? user.studentId : user.lecturerId;
  const roleLabel =
    type === "student"
      ? user.batch || "—"
      : user.designation || "Lecturer";

  const batchColor_ =
    type === "student"
      ? batchColor || BATCH_COLORS[user.batch] || {
          bg: "rgba(0,17,58,0.06)",
          text: "#00113a",
          border: "rgba(0,17,58,0.15)",
        }
      : null;

  return (
    <TouchableOpacity
      style={styles.userCard}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Batch colour top strip for students */}
      {type === "student" && batchColor_ && (
        <View
          style={[
            styles.userCardBatchStrip,
            { backgroundColor: batchColor_.text },
          ]}
        />
      )}

      {/* Top row */}
      <View style={styles.userCardTop}>
        <View style={styles.avatarWrap}>
          {user.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              style={styles.avatarImg}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {user.name?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: isActive ? "#4CAF50" : "#F59E0B" },
            ]}
          />
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isActive ? "#E8F5E9" : "#FFF8E1" },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: isActive ? "#2E7D32" : "#F57F17" },
            ]}
          >
            {isActive ? "ACTIVE" : "INACTIVE"}
          </Text>
        </View>
      </View>

      {/* Name & ID */}
      <Text style={styles.userName} numberOfLines={1}>
        {user.name}
      </Text>

      {/* Batch pill for students */}
      {type === "student" && batchColor_ && (
        <View
          style={[
            styles.batchPill,
            {
              backgroundColor: batchColor_.bg,
              borderColor: batchColor_.border,
            },
          ]}
        >
          <Text style={[styles.batchPillText, { color: batchColor_.text }]}>
            BATCH {user.batch}
          </Text>
        </View>
      )}

      <Text style={styles.userId}>
        {id} · {type === "student" ? user.department?.substring(0, 2).toUpperCase() || "—" : roleLabel}
      </Text>

      {/* Meta */}
      <View style={styles.userMeta}>
        <MetaRow label="Dept" value={user.department} />
        <MetaRow label="Email" value={user.email} />
        <MetaRow
          label="Verified"
          value={user.isVerified ? "Yes" : "Pending"}
          valueColor={user.isVerified ? "#4CAF50" : "#F59E0B"}
        />
      </View>

      {/* Footer */}
      <View style={styles.userCardFooter}>
        <View style={styles.userCardFooterBadge}>
          <View
            style={[
              styles.faceDataDot,
              {
                backgroundColor:
                  type === "student" && user.faceDataRegistered
                    ? "#4CAF50"
                    : "#c5c6d2",
              },
            ]}
          />
          <Text style={styles.faceDataText}>
            {type === "student"
              ? user.faceDataRegistered
                ? "Face ✓"
                : "No Face"
              : user.courses?.length
                ? `${user.courses.length} Course${user.courses.length > 1 ? "s" : ""}`
                : "No Courses"}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={14} color="#c5c6d2" />
      </View>
    </TouchableOpacity>
  );
};

// ── Meta Row ──
const MetaRow = ({ label, value, valueColor }) => (
  <View style={styles.userMetaRow}>
    <Text style={styles.userMetaLabel}>{label}:</Text>
    <Text
      style={[
        styles.userMetaValue,
        valueColor ? { color: valueColor } : null,
      ]}
      numberOfLines={1}
    >
      {value || "—"}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  safeArea: { flex: 1 },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  archivalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 16,
  },
  archivalAccent: { width: 2, height: 44, backgroundColor: "#775a19" },
  archivalLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: "#775a19",
    marginBottom: 4,
  },
  archivalTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 30,
    color: "#00113a",
  },
  headerActions: { flexDirection: "row", gap: 10 },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
    backgroundColor: "#ffffff",
  },
  headerBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#00113a",
  },

  // ── Tabs ──
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.2)",
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 8,
  },
  tabActive: { borderBottomColor: "#775a19" },
  tabText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#757682",
  },
  tabTextActive: { color: "#00113a" },

  // ── View Mode Toggle ──
  viewModeRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewModeBtnActive: {
    backgroundColor: "#002366",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  viewModeBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#757682",
  },
  viewModeBtnTextActive: { color: "#ffffff" },

  // ── Search ──
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: "#00113a",
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
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
    backgroundColor: "#775a19",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    color: "#ffffff",
  },

  // ── Filter Panel ──
  filterPanel: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    gap: 8,
  },
  filterGroupLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
    marginTop: 4,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f3f3",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "rgba(119,90,25,0.1)",
    borderColor: "#775a19",
  },
  chipText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: "#757682",
  },
  chipTextActive: { color: "#775a19" },
  clearFiltersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#fff0f0",
  },
  clearFiltersText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    color: "#e53935",
    letterSpacing: 0.5,
  },

  // ── Results ──
  resultsInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  resultsText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#757682",
    textTransform: "uppercase",
    flex: 1,
  },
  resultsPage: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: "#757682",
    textTransform: "uppercase",
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },

  // ── Empty ──
  emptyState: {
    alignItems: "center",
    paddingVertical: 70,
    gap: 12,
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
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "rgba(119,90,25,0.1)",
  },
  clearBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: "#775a19",
    letterSpacing: 1,
  },

  // ── Cards Grid ──
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  // ── User Card ──
  userCard: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  userCardBatchStrip: {
    height: 3,
    width: "100%",
  },
  userCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    padding: 14,
    paddingBottom: 0,
  },
  avatarWrap: { position: "relative" },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(119,90,25,0.2)",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#002366",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(119,90,25,0.2)",
  },
  avatarFallbackText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 18,
    color: "#ffffff",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    letterSpacing: 1,
  },
  userName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 16,
    color: "#00113a",
    marginBottom: 4,
    paddingHorizontal: 14,
  },

  // Batch pill inside card
  batchPill: {
    alignSelf: "flex-start",
    marginHorizontal: 14,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  batchPillText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
  },

  userId: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: "#757682",
    textTransform: "uppercase",
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  userMeta: {
    gap: 4,
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  userMetaRow: { flexDirection: "row", gap: 4 },
  userMetaLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  userMetaValue: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 10,
    color: "#00113a",
    flex: 1,
  },
  userCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(197,198,210,0.2)",
  },
  userCardFooterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  faceDataDot: { width: 6, height: 6, borderRadius: 3 },
  faceDataText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 1,
    color: "#757682",
    textTransform: "uppercase",
  },

  // ── Batch Section ──
  batchSection: {
    marginBottom: 20,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },

  // Batch collapsible header
  batchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderLeftWidth: 4,
    backgroundColor: "#ffffff",
  },
  batchHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  batchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  batchHeaderLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 3,
    color: "#757682",
    marginBottom: 2,
  },
  batchHeaderTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
  },
  batchHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  batchCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  batchCountText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Batch stats bar
  batchStatsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
    borderTopWidth: 1,
    borderTopColor: "rgba(197,198,210,0.15)",
    gap: 12,
    flexWrap: "wrap",
  },
  batchStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  batchStatValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
  },
  batchStatLabel: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#757682",
  },
  batchStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(197,198,210,0.4)",
  },
  batchDeptRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  batchDeptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(0,35,102,0.07)",
  },
  batchDeptBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#002366",
  },

  // Students grid inside batch
  batchCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "rgba(197,198,210,0.1)",
  },

  // ── Pagination ──
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    marginBottom: 16,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.3)",
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageNum: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  pageNumActive: { backgroundColor: "#00113a" },
  pageNumText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    color: "#757682",
  },
  pageNumTextActive: { color: "#ffffff" },
  pageDots: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: "#757682",
    paddingHorizontal: 4,
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
    marginBottom: 8,
  },
});
