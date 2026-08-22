import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "@/src/api/axiosInstance";

const REQUIREMENTS = [
  { key: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /\d/.test(v) },
];

function PasswordField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  error,
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.fieldInputWrap,
          focused && styles.fieldInputWrapFocused,
          error && styles.fieldInputWrapError,
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={error ? "#ba1a1a" : focused ? "#775a19" : "#757682"}
        />
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#c5c6d2"
          secureTextEntry={!visible}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <TouchableOpacity
          onPress={() => setVisible(!visible)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="#a0a1ad"
          />
        </TouchableOpacity>
      </View>
      {error && (
        <View style={styles.fieldErrorRow}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={12}
            color="#ba1a1a"
          />
          <Text style={styles.fieldErrorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate in on mount
  useState(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  });

  // ── Strength meter ──────────────────────────────────────────────────────────
  const passedCount = REQUIREMENTS.filter((r) => r.test(newPassword)).length;

  const strengthPct = (passedCount / REQUIREMENTS.length) * 100;
  const strengthColor =
    strengthPct >= 100
      ? "#4CAF50"
      : strengthPct >= 75
        ? "#8BC34A"
        : strengthPct >= 50
          ? "#F59E0B"
          : "#ba1a1a";
  const strengthLabel =
    strengthPct >= 100
      ? "Strong"
      : strengthPct >= 75
        ? "Good"
        : strengthPct >= 50
          ? "Fair"
          : newPassword.length > 0
            ? "Weak"
            : "";

  // ── Validate ────────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    const e = {};

    if (!currentPassword.trim()) {
      e.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      e.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      e.newPassword = "Must be at least 8 characters";
    } else if (newPassword === currentPassword) {
      e.newPassword = "New password must differ from current";
    }

    if (!confirmPassword) {
      e.confirmPassword = "Please confirm your new password";
    } else if (confirmPassword !== newPassword) {
      e.confirmPassword = "Passwords do not match";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [currentPassword, newPassword, confirmPassword]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await api.put("/student/change-password", {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword,
      });

      if (res.data.success) {
        setSuccess(true);

        // Show success then navigate back
        setTimeout(() => {
          Alert.alert(
            "Password Changed",
            "Your password has been updated successfully.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        }, 600);
      } else {
        Alert.alert("Error", res.data.message || "Failed to change password");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Password change failed";

      if (msg.toLowerCase().includes("current password")) {
        setErrors((e) => ({
          ...e,
          currentPassword: "Current password is incorrect",
        }));
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Can submit? ─────────────────────────────────────────────────────────────
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword.length > 0 &&
    !saving &&
    !success;

  // ── Render ──────────────────────────────────────────────────────────────────
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
          <Text style={styles.headerLabel}>SECURITY</Text>
          <Text style={styles.headerTitle}>Change Password</Text>
        </View>

        {/* Spacer to balance header */}
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          {/* ── Shield icon block ── */}
          <View style={styles.shieldBlock}>
            <View style={styles.shieldIconWrap}>
              <MaterialCommunityIcons
                name={success ? "shield-check" : "shield-lock-outline"}
                size={36}
                color={success ? "#4CAF50" : "#775a19"}
              />
            </View>
            <Text style={styles.shieldTitle}>
              {success ? "Password Updated!" : "Update Your Password"}
            </Text>
            <Text style={styles.shieldSub}>
              {success
                ? "Your account is now secured with the new password."
                : "Choose a strong password to keep your account secure."}
            </Text>
          </View>

          {/* ── Form ── */}
          {!success && (
            <>
              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionCardLabel}>CURRENT PASSWORD</Text>
                </View>

                <PasswordField
                  label="Current Password"
                  icon="lock-outline"
                  value={currentPassword}
                  onChangeText={(t) => {
                    setCurrentPassword(t);
                    if (errors.currentPassword)
                      setErrors((e) => ({ ...e, currentPassword: null }));
                  }}
                  placeholder="Enter current password"
                  error={errors.currentPassword}
                />
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionCardLabel}>NEW PASSWORD</Text>
                </View>

                <PasswordField
                  label="New Password"
                  icon="lock-plus-outline"
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    if (errors.newPassword)
                      setErrors((e) => ({ ...e, newPassword: null }));
                  }}
                  placeholder="Enter new password"
                  error={errors.newPassword}
                />

                {/* ── Strength meter ── */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthWrap}>
                    <View style={styles.strengthHeader}>
                      <Text style={styles.strengthLabel}>
                        Password Strength
                      </Text>
                      <Text
                        style={[styles.strengthValue, { color: strengthColor }]}
                      >
                        {strengthLabel}
                      </Text>
                    </View>
                    <View style={styles.strengthTrack}>
                      <View
                        style={[
                          styles.strengthFill,
                          {
                            width: `${strengthPct}%`,
                            backgroundColor: strengthColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* ── Requirements ── */}
                {newPassword.length > 0 && (
                  <View style={styles.reqList}>
                    {REQUIREMENTS.map((r) => {
                      const passed = r.test(newPassword);
                      return (
                        <View key={r.key} style={styles.reqItem}>
                          <MaterialCommunityIcons
                            name={
                              passed
                                ? "check-circle"
                                : "checkbox-blank-circle-outline"
                            }
                            size={14}
                            color={passed ? "#4CAF50" : "#c5c6d2"}
                          />
                          <Text
                            style={[
                              styles.reqText,
                              passed && styles.reqTextPassed,
                            ]}
                          >
                            {r.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <PasswordField
                  label="Confirm New Password"
                  icon="lock-check-outline"
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (errors.confirmPassword)
                      setErrors((e) => ({ ...e, confirmPassword: null }));
                  }}
                  placeholder="Re-enter new password"
                  error={errors.confirmPassword}
                />

                {/* ── Match indicator ── */}
                {confirmPassword.length > 0 && newPassword.length > 0 && (
                  <View style={styles.matchRow}>
                    <MaterialCommunityIcons
                      name={
                        confirmPassword === newPassword
                          ? "check-circle"
                          : "close-circle"
                      }
                      size={14}
                      color={
                        confirmPassword === newPassword ? "#4CAF50" : "#ba1a1a"
                      }
                    />
                    <Text
                      style={[
                        styles.matchText,
                        {
                          color:
                            confirmPassword === newPassword
                              ? "#4CAF50"
                              : "#ba1a1a",
                        },
                      ]}
                    >
                      {confirmPassword === newPassword
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Security note ── */}
              <View style={styles.securityNote}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={14}
                  color="#c4a257"
                />
                <Text style={styles.securityNoteText}>
                  After changing your password, you will remain logged in on
                  this device. Other sessions will be terminated.
                </Text>
              </View>

              {/* ── Submit ── */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !canSubmit && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                {saving ? (
                  <>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.submitBtnText}>UPDATING…</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="lock-reset"
                      size={18}
                      color="#ffffff"
                    />
                    <Text style={styles.submitBtnText}>UPDATE PASSWORD</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* ── Cancel ── */}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Success state ── */}
          {success && (
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={16}
                color="#ffffff"
              />
              <Text style={styles.submitBtnText}>BACK TO PROFILE</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.footerText}>
            © SABARAGAMUWA UNIVERSITY OF SRI LANKA
          </Text>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
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
    gap: 20,
  },

  // ── Shield block ──
  shieldBlock: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  shieldIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(119,90,25,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(119,90,25,0.12)",
  },
  shieldTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: "#00113a",
    textAlign: "center",
  },
  shieldSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },

  // ── Section card ──
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 14,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionAccent: {
    width: 2,
    height: 14,
    backgroundColor: "#775a19",
    borderRadius: 1,
  },
  sectionCardLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 2.5,
    color: "#775a19",
  },

  // ── Form Field ──
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#757682",
    textTransform: "uppercase",
  },
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "rgba(197,198,210,0.25)",
  },
  fieldInputWrapFocused: {
    borderColor: "#775a19",
    backgroundColor: "rgba(119,90,25,0.03)",
  },
  fieldInputWrapError: {
    borderColor: "#ba1a1a",
    backgroundColor: "rgba(186,26,26,0.02)",
  },
  fieldInput: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    color: "#00113a",
    padding: 0,
  },
  fieldErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fieldErrorText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#ba1a1a",
  },

  // ── Strength meter ──
  strengthWrap: { gap: 6 },
  strengthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  strengthLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#757682",
    textTransform: "uppercase",
  },
  strengthValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  strengthTrack: {
    height: 4,
    backgroundColor: "#f3f3f3",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },

  // ── Requirements ──
  reqList: { gap: 6 },
  reqItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reqText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#a0a1ad",
  },
  reqTextPassed: {
    color: "#4CAF50",
  },

  // ── Match indicator ──
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
  },

  // ── Security note ──
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(196,162,87,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(196,162,87,0.15)",
  },
  securityNoteText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    flex: 1,
    lineHeight: 17,
  },

  // ── Buttons ──
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#002366",
    paddingVertical: 16,
    borderRadius: 4,
    shadowColor: "#002366",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#ffffff",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    backgroundColor: "rgba(117,118,130,0.06)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  cancelBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#757682",
  },
  successBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 4,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

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