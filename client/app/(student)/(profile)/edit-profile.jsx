import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/context/AuthContext";
import api from "@/src/api/axiosInstance";

// ── Validated Input ──────────────────────────────────────────────────────────
function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  error,
  editable = true,
  keyboardType = "default",
  autoCapitalize = "none",
  maxLength,
  hint,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.fieldInputWrap,
          focused && styles.fieldInputWrapFocused,
          error && styles.fieldInputWrapError,
          !editable && styles.fieldInputWrapDisabled,
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={
            error
              ? "#ba1a1a"
              : focused
                ? "#775a19"
                : !editable
                  ? "#c5c6d2"
                  : "#757682"
          }
        />
        <TextInput
          style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#c5c6d2"
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {!editable && (
          <MaterialCommunityIcons
            name="lock-outline"
            size={14}
            color="#c5c6d2"
          />
        )}
      </View>
      {error ? (
        <View style={styles.fieldErrorRow}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={12}
            color="#ba1a1a"
          />
          <Text style={styles.fieldErrorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [profileImage, setProfileImage] = useState(null);

  // Read-only fields (displayed but not editable)
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");

  // Errors
  const [errors, setErrors] = useState({});

  // Track changes
  const [original, setOriginal] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/student/profile");

      if (res.data.success) {
        const p = res.data.data;
        setName(p.name || "");
        setMobile(p.mobile || "");
        setProfileImage(p.profileImage || null);
        setEmail(p.email || "");
        setStudentId(p.studentId || "");
        setDepartment(p.department || "");
        setBatch(p.batch || "");

        setOriginal({
          name: p.name || "",
          mobile: p.mobile || "",
          profileImage: p.profileImage || null,
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load profile data");
      console.error("loadProfile:", err.message);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  };

  // ── Has changes? ────────────────────────────────────────────────────────────
  const hasChanges =
    name !== original.name ||
    mobile !== original.mobile ||
    profileImage !== original.profileImage;

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    const e = {};

    if (!name.trim()) {
      e.name = "Name is required";
    } else if (name.trim().length < 2) {
      e.name = "Name must be at least 2 characters";
    } else if (name.trim().length > 100) {
      e.name = "Name cannot exceed 100 characters";
    }

    if (!mobile.trim()) {
      e.mobile = "Mobile number is required";
    } else if (!/^\+94\d{9}$/.test(mobile.trim())) {
      e.mobile = "Format: +94XXXXXXXXX";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, mobile]);

  // ── Pick Image ──────────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Gallery access is needed to update your profile photo.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setProfileImage(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setProfileImage(asset.uri);
        }
      }
    } catch (err) {
      console.error("handlePickImage:", err.message);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove your profile photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => setProfileImage(null),
        },
      ],
    );
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    if (!hasChanges) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      const payload = {};
      if (name !== original.name) payload.name = name.trim();
      if (mobile !== original.mobile) payload.mobile = mobile.trim();
      if (profileImage !== original.profileImage)
        payload.profileImage = profileImage;

      const res = await api.put("/student/profile", payload);

      if (res.data.success) {
        // Sync auth context
        if (updateUser) {
          updateUser({
            ...user,
            ...res.data.data,
          });
        }

        Alert.alert("Profile Updated", "Your changes have been saved.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.data.message || "Failed to update profile");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Update failed";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#775a19" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerLabel}>SCHOLAR RECORDS</Text>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveHeaderBtn,
            (!hasChanges || saving) && styles.saveHeaderBtnDisabled,
          ]}
          disabled={!hasChanges || saving}
          activeOpacity={0.75}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveHeaderBtnText}>SAVE</Text>
          )}
        </TouchableOpacity>
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
          {/* ── Avatar Section ── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {name?.charAt(0)?.toUpperCase() || "S"}
                  </Text>
                </View>
              )}

              {/* Camera overlay button */}
              <TouchableOpacity
                style={styles.avatarCameraBtn}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="camera"
                  size={16}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>

            {/* Photo actions */}
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="image-edit-outline"
                  size={14}
                  color="#775a19"
                />
                <Text style={styles.photoActionText}>Change Photo</Text>
              </TouchableOpacity>

              {profileImage && (
                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={handleRemoveImage}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={14}
                    color="#ba1a1a"
                  />
                  <Text style={[styles.photoActionText, { color: "#ba1a1a" }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Editable Fields ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionCardLabel}>EDITABLE FIELDS</Text>
            </View>

            <FormField
              label="Full Name"
              icon="account-outline"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errors.name) setErrors((e) => ({ ...e, name: null }));
              }}
              placeholder="Enter your full name"
              error={errors.name}
              autoCapitalize="words"
              maxLength={100}
            />

            <FormField
              label="Mobile Number"
              icon="phone-outline"
              value={mobile}
              onChangeText={(t) => {
                setMobile(t);
                if (errors.mobile) setErrors((e) => ({ ...e, mobile: null }));
              }}
              placeholder="+94XXXXXXXXX"
              error={errors.mobile}
              keyboardType="phone-pad"
              maxLength={13}
              hint="Format: +94 followed by 9 digits"
            />
          </View>

          {/* ── Read-only Fields ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View
                style={[styles.sectionAccent, { backgroundColor: "#757682" }]}
              />
              <Text style={styles.sectionCardLabel}>READ-ONLY RECORDS</Text>
            </View>

            <View style={styles.readOnlyNotice}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={13}
                color="#757682"
              />
              <Text style={styles.readOnlyNoticeText}>
                These fields cannot be modified. Contact admin for changes.
              </Text>
            </View>

            <FormField
              label="Student ID"
              icon="identifier"
              value={studentId}
              editable={false}
            />

            <FormField
              label="Email Address"
              icon="email-outline"
              value={email}
              editable={false}
            />

            <FormField
              label="Department"
              icon="domain"
              value={department}
              editable={false}
            />

            <FormField
              label="Batch"
              icon="school-outline"
              value={batch}
              editable={false}
            />
          </View>

          {/* ── Unsaved changes indicator ── */}
          {hasChanges && (
            <View style={styles.unsavedBanner}>
              <MaterialCommunityIcons
                name="content-save-edit-outline"
                size={16}
                color="#775a19"
              />
              <Text style={styles.unsavedBannerText}>
                You have unsaved changes
              </Text>
            </View>
          )}

          {/* ── Save button (bottom) ── */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!hasChanges || saving) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.saveBtnText}>SAVING…</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.saveBtnText}>
                  {hasChanges ? "SAVE CHANGES" : "NO CHANGES"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Discard button ── */}
          {hasChanges && (
            <TouchableOpacity
              style={styles.discardBtn}
              onPress={() => {
                setName(original.name);
                setMobile(original.mobile);
                setProfileImage(original.profileImage);
                setErrors({});
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="undo-variant"
                size={15}
                color="#757682"
              />
              <Text style={styles.discardBtnText}>DISCARD CHANGES</Text>
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
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
  },

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
  saveHeaderBtn: {
    backgroundColor: "#002366",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: "center",
  },
  saveHeaderBtnDisabled: { opacity: 0.4 },
  saveHeaderBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    color: "#ffffff",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
    gap: 20,
  },

  // ── Avatar ──
  avatarSection: { alignItems: "center", gap: 14 },
  avatarContainer: { position: "relative" },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#002366",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  avatarFallbackText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 40,
    color: "#ffffff",
  },
  avatarCameraBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#775a19",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  photoActions: {
    flexDirection: "row",
    gap: 16,
  },
  photoActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(119,90,25,0.06)",
  },
  photoActionText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: "#775a19",
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

  // ── Read-only notice ──
  readOnlyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(117,118,130,0.06)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.15)",
  },
  readOnlyNoticeText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    flex: 1,
    lineHeight: 16,
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
  fieldInputWrapDisabled: {
    backgroundColor: "rgba(197,198,210,0.1)",
    borderColor: "rgba(197,198,210,0.15)",
  },
  fieldInput: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    color: "#00113a",
    padding: 0,
  },
  fieldInputDisabled: {
    color: "#a0a1ad",
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
  fieldHint: {
    fontFamily: "Manrope_400Regular",
    fontSize: 10,
    color: "#a0a1ad",
    marginLeft: 2,
  },

  // ── Unsaved banner ──
  unsavedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(119,90,25,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.15)",
  },
  unsavedBannerText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: "#775a19",
  },

  // ── Save / Discard ──
  saveBtn: {
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
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#ffffff",
  },
  discardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    backgroundColor: "rgba(117,118,130,0.06)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(197,198,210,0.2)",
  },
  discardBtnText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: "#757682",
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
