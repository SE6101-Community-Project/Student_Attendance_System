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
