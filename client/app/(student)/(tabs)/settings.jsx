import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import api from "@/src/api/axiosInstance";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingScreen from "../../../src/components/LoadingScreen";

const ToggleRow = ({ icon, label, subtitle, value, onChange }) => (
  <View style={styles.toggleRow}>
    <View style={styles.toggleRowLeft}>
      <View style={styles.toggleIcon}>
        <MaterialCommunityIcons name={icon} size={18} color="#00113a" />
      </View>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {subtitle && <Text style={styles.toggleSub}>{subtitle}</Text>}
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: "rgba(197,198,210,0.4)", true: "#00113a" }}
      thumbColor="#ffffff"
    />
  </View>
);

const ActionRow = ({
  icon,
  label,
  subtitle,
  onPress,
  rightLabel,
  rightLabelColor,
  danger,
  disabled,
}) => (
  <TouchableOpacity
    style={[styles.actionRow, disabled && { opacity: 0.5 }]}
    onPress={disabled ? null : onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={danger ? "#ba1a1a" : "#00113a"}
      />
    </View>
    <View style={styles.actionTextWrap}>
      <Text style={[styles.actionLabel, danger && { color: "#ba1a1a" }]}>
        {label}
      </Text>
      {subtitle && <Text style={styles.actionSub}>{subtitle}</Text>}
    </View>
    {rightLabel ? (
      <Text
        style={[
          styles.actionRightLabel,
          rightLabelColor && { color: rightLabelColor },
        ]}
      >
        {rightLabel}
      </Text>
    ) : onPress ? (
      <MaterialCommunityIcons
        name="chevron-right"
        size={18}
        color={danger ? "rgba(186,26,26,0.3)" : "#c5c6d2"}
      />
    ) : null}
  </TouchableOpacity>
);

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const CardDivider = () => <View style={styles.cardDivider} />;

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  // ── Notification toggles — local only (no backend field for preferences) ──
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(false);

  // ── Account deactivation ──
  const [deactivating, setDeactivating] = useState(false);

  // ── Session info from profile ──
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    loadSessionInfo();
  }, []);

  const loadSessionInfo = async () => {
    setSessionLoading(true);
    try {
      const res = await api.get("/student/profile");
      if (res.data.success) {
        const p = res.data.data;
        setSessionInfo({
          memberSince: p?.createdAt,
          lastActivity: p?.updatedAt,
        });
      }
    } catch (err) {
      console.log("loadSessionInfo:", err.message);
    } finally {
      setSessionLoading(false);
    }
  };


  const handleDeactivateAccount = useCallback(() => {
    Alert.alert(
      "Deactivate Account",
      "Your account will be deactivated and you will be logged out. You will not be able to login or mark attendance until an admin reactivates your account. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            setDeactivating(true);
            try {
              const res = await api.put("/student/deactivate");
              if (res.data.success) {
                Alert.alert(
                  "Account Deactivated",
                  "Your account has been deactivated. Contact your admin to reactivate.",
                  [{ text: "OK", onPress: logout }],
                );
              } else {
                Alert.alert(
                  "Error",
                  res.data.message || "Failed to deactivate",
                );
              }
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.message ||
                  "Failed to deactivate account",
              );
            } finally {
              setDeactivating(false);
            }
          },
        },
      ],
    );
  }, [logout]);


  const handleLogout = useCallback(() => {
    Alert.alert(
      "End Session",
      "Are you sure you want to logout from this device?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout },
      ],
    );
  }, [logout]);

  const formatDate = (dateStr, opts = { month: "long", day: "numeric", year: "numeric" }) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", opts);
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#00113a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>ACCOUNT</Text>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Summary ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || "S"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.archivalRow}>
              <View style={styles.archivalAccent} />
              <Text style={styles.profileRole}>STUDENT PROFILE</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name || "Student"}
            </Text>
            <Text style={styles.profileSub}>
              {user?.department} · {user?.studentId}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push("/(student)/(profile)/edit-profile")}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="account-edit-outline"
              size={16}
              color="#775a19"
            />
          </TouchableOpacity>
        </View>

        {/* ══ NOTIFICATION PREFERENCES ══ */}
        {/* Note: local-only — studentModel has no preferences field */}
        <SectionHeader title="Notification Preferences" />
        <View style={styles.card}>
          <ToggleRow
            icon="bell-outline"
            label="Push Notifications"
            subtitle="Attendance updates and alerts"
            value={pushEnabled}
            onChange={setPushEnabled}
          />
          <CardDivider />
          <ToggleRow
            icon="email-outline"
            label="Email Alerts"
            subtitle="Important account emails"
            value={emailEnabled}
            onChange={setEmailEnabled}
          />
          <CardDivider />
          <ToggleRow
            icon="account-clock-outline"
            label="Attendance Alerts"
            subtitle="Notified when attendance falls below 75%"
            value={attendanceAlerts}
            onChange={setAttendanceAlerts}
          />
          <CardDivider />
          <ToggleRow
            icon="clock-alert-outline"
            label="Session Reminders"
            subtitle="Reminded before class starts"
            value={sessionReminders}
            onChange={setSessionReminders}
          />
        </View>

        {/* ══ ACCOUNT & SECURITY ══ */}
        <SectionHeader title="Account & Security" />
        <View style={styles.card}>

          {/* Edit Profile → updateStudentProfile (name, mobile, profileImage) */}
          <ActionRow
            icon="account-edit-outline"
            label="Edit Profile"
            subtitle="Update name, mobile, photo"
            onPress={() => router.push("/(student)/(profile)/edit-profile")}
          />
          <CardDivider />

          {/* Change Password → changeStudentPassword */}
          <ActionRow
            icon="lock-reset"
            label="Change Password"
            subtitle="Update your login password"
            onPress={() =>
              router.push("/(student)/(profile)/change-password")
            }
          />
          <CardDivider />

          {/* Email verification status — resendVerificationEmail */}
          <ActionRow
            icon={
              user?.isVerified
                ? "email-check-outline"
                : "email-alert-outline"
            }
            label={user?.isVerified ? "Email Verified" : "Contact Support"}
            subtitle={
              user?.isVerified
                ? user?.email
                : "Contact support to verify your email"
            }
            rightLabel={
              user?.isVerified
                ? "✓" : "!"
            }
            rightLabelColor={user?.isVerified ? "#4CAF50" : "#775a19"}
          />
        </View>

        {/* ══ SESSION INFORMATION ══ */}
        <SectionHeader title="Session Information" />
        <View style={styles.card}>
          <ActionRow
            icon="devices"
            label="Current Device"
            subtitle="This device is currently active"
            rightLabel="Active"
            rightLabelColor="#4CAF50"
          />
          <CardDivider />
          <ActionRow
            icon="calendar-account-outline"
            label="Member Since"
            subtitle={
              sessionLoading
                ? "Loading…"
                : formatDate(sessionInfo?.memberSince)
            }
          />
          <CardDivider />
          <ActionRow
            icon="clock-check-outline"
            label="Last Activity"
            subtitle={
              sessionLoading
                ? <LoadingScreen
                    message="Loading account data..."
                    variant="overlay"
                  />
                : formatDate(sessionInfo?.lastActivity, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
            }
          />
        </View>

        {/* ══ SUPPORT & LEGAL ══ */}
        <SectionHeader title="Support & Legal" />
        <View style={styles.card}>
          <ActionRow
            icon="help-circle-outline"
            label="Help & Support"
            subtitle="Contact the support team"
            onPress={() =>
              Linking.openURL("mailto:support@foc.sab.ac.lk")
            }
          />
          <CardDivider />
          <ActionRow
            icon="web"
            label="University Portal"
            subtitle="Open SUSL official website"
            onPress={() => Linking.openURL("https://www.sab.ac.lk")}
          />
          <CardDivider />
          <ActionRow
            icon="shield-check-outline"
            label="Privacy Policy"
            subtitle="How we handle your data"
            onPress={() =>
              Linking.openURL("https://www.sab.ac.lk/privacy")
            }
          />
          <CardDivider />
          <ActionRow
            icon="file-document-outline"
            label="Terms of Service"
            subtitle="App usage terms and conditions"
            onPress={() =>
              Linking.openURL("https://www.sab.ac.lk/terms")
            }
          />
        </View>

        {/* ══ DANGER ZONE ══ */}
        <SectionHeader title="Danger Zone" />
        <View style={[styles.card, styles.dangerCard]}>

          {/* Deactivate → deactivateStudentAccount */}
          <ActionRow
            icon="account-off-outline"
            label="Deactivate Account"
            subtitle="Disable your account — admin required to reactivate"
            onPress={handleDeactivateAccount}
            disabled={deactivating}
            rightLabel={deactivating ? "Processing…" : null}
            danger
          />
        </View>

         {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <View style={styles.logoutBtnInner}>
            <View style={styles.logoutIconWrap}>
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color="#ba1a1a"
              />
            </View>
            <View style={styles.logoutTextWrap}>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.logoutSub}>
                End current session on this device
              </Text>
            </View>
          </View>
          <View style={styles.logoutArrow}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color="#ba1a1a"
            />
          </View>
        </TouchableOpacity>

        {/* ── App Info ── */}
        <View style={styles.appInfoCard}>
          <View style={styles.appInfoIcon}>
            <Text style={styles.appInfoIconText}>S</Text>
          </View>
          <Text style={styles.appInfoName}>SUSL Attendance</Text>
          <Text style={styles.appInfoVersion}>
            Version 2.4.0 · Build 2024.12
          </Text>
          <View style={styles.appInfoBadge}>
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={10}
              color="#775a19"
            />
            <Text style={styles.appInfoBadgeText}>SECURE ACADEMIC LINK</Text>
          </View>
        </View>

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

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(197,198,210,0.2)",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f3f3f3",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { alignItems: "center", gap: 2 },
  headerLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2.5,
    color: "#775a19",
  },
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
    color: "#00113a",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
    gap: 10,
  },

  // ── Profile Card ──
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#002366",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  profileAvatarText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 22,
    color: "#ffffff",
  },
  profileInfo: { flex: 1 },
  archivalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  archivalAccent: { width: 2, height: 12, backgroundColor: "#775a19" },
  profileRole: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#775a19",
  },
  profileName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
    color: "#00113a",
    marginBottom: 2,
  },
  profileSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(119,90,25,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.12)",
    flexShrink: 0,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  sectionAccent: {
    width: 2,
    height: 16,
    backgroundColor: "#775a19",
    borderRadius: 1,
  },
  sectionTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    color: "#00113a",
  },

  // ── Card ──
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 6,
  },
  dangerCard: {
    borderColor: "rgba(186,26,26,0.15)",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(197,198,210,0.1)",
    marginHorizontal: 16,
  },

  // ── Toggle Row ──
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "rgba(0,17,58,0.05)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  toggleTextWrap: { flex: 1 },
  toggleLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
    marginBottom: 1,
  },
  toggleSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    lineHeight: 15,
  },

  // ── Action Row ──
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "rgba(0,17,58,0.05)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  actionIconDanger: {
    backgroundColor: "rgba(186,26,26,0.06)",
  },
  actionTextWrap: { flex: 1 },
  actionLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#00113a",
    marginBottom: 1,
  },
  actionSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    lineHeight: 15,
  },
  actionRightLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: "#775a19",
    flexShrink: 0,
  },

  // ── Logout ──
  logoutBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(186,26,26,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#ba1a1a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 4,
    marginBottom: 4,
  },
  logoutBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  logoutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(186,26,26,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(186,26,26,0.12)",
  },
  logoutTextWrap: { flex: 1 },
  logoutTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 14,
    color: "#ba1a1a",
    marginBottom: 2,
  },
  logoutSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "rgba(186,26,26,0.6)",
  },
  logoutArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(186,26,26,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── App Info ──
  appInfoCard: {
    backgroundColor: "rgba(243,243,243,0.6)",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.1)",
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  appInfoIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#00113a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  appInfoIconText: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 24,
    color: "#ffffff",
  },
  appInfoName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    color: "#00113a",
  },
  appInfoVersion: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
  },
  appInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(119,90,25,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  appInfoBadgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#775a19",
  },

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

