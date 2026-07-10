import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/api/axiosInstance';
import LoadingScreen from '../../src/components/LoadingScreen';

// ── Schema enums (match backend) ──
const DEPARTMENTS = [
  'Software Engineering',
  'Information System',
  'Data Science',
  'General',
];

const DESIGNATIONS = [
  'Professor',
  'Senior Lecturer',
  'Lecturer',
  'Assistant Lecturer',
  'Visiting Lecturer',
  'Instructor',
];

const PROFILE_TABS = ['Profile', 'Security', 'Attendance Rules'];

export default function LecturerProfileScreen() {
  const { user, logout } = useAuth();

  // ── Active Tab ──
  const [activeTab, setActiveTab] = useState('Profile');

  // ── Profile data ──
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // ── Editable fields ──
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [profileImageBase64, setProfileImageBase64] = useState(null);

  // ── Dropdown pickers ──
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showDesigPicker, setShowDesigPicker] = useState(false);

  // ── Password change ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsResetting, setSettingsResetting] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsLastSaved, setSettingsLastSaved] = useState(null);
  const [settingsError, setSettingsError] = useState('');

  // ── Attendance Rule Settings ──
  const [gpsRange, setGpsRange] = useState('100');
  const [timeLimit, setTimeLimit] = useState('15');
  const [qrValidity, setQrValidity] = useState('120');

  // ── Focused field ──
  const [focusedField, setFocusedField] = useState(null);

  // ── Animations ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchProfile();
    fetchAttendanceSettings();
  }, []);

  // ══════════════════════════════════════
  // GET /api/lecturer/profile
  // ══════════════════════════════════════
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lecturer/profile');
      if (res.data.success) {
        const data = res.data.data;
        setProfile(data);
        // ── Populate editable fields ──
        setName(data.name || '');
        setMobile(data.mobile || '');
        setDepartment(data.department || '');
        setDesignation(data.designation || '');
        setProfileImageUri(data.profileImage || null);

        Animated.parallel([
          Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
      }
    } catch (err) {
      console.log('Profile fetch error:', err);
      // Fallback to context user
      setProfile(user);
      setName(user?.name || '');
      setMobile(user?.mobile || '');
      setDepartment(user?.department || '');
      setDesignation(user?.designation || '');
      setProfileImageUri(user?.profileImage || null);
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════
  // IMAGE PICKER — from phone gallery
  // ══════════════════════════════════════
  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to update your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],        // Square crop for profile photo
        quality: 0.7,           // Compress to 70%
        base64: true,           // Include base64 for API upload
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setProfileImageUri(asset.uri);
        setProfileImageBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // ══════════════════════════════════════
  // PUT /api/lecturer/profile
  // ══════════════════════════════════════
  const handleSaveProfile = async () => {
    // ── Validation ──
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (!mobile.trim()) {
      Alert.alert('Error', 'Mobile number cannot be empty');
      return;
    }
    if (!department) {
      Alert.alert('Error', 'Please select a department');
      return;
    }
    if (!designation) {
      Alert.alert('Error', 'Please select a designation');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        mobile: mobile.trim(),
        department,
        designation,
      };

       // Only include image if a new one was picked
      if (profileImageBase64) {
        payload.profileImage = profileImageBase64;
      }

      const res = await api.put('/lecturer/profile', payload);

      if (res.data.success) {
        // ── Update local profile state with response ──
        setProfile((prev) => ({
          ...prev,
          name: res.data.data.name,
          mobile: res.data.data.mobile,
          department: res.data.data.department,
          designation: res.data.data.designation,
          profileImage: res.data.data.profileImage,
        }));

        setProfileImageBase64(null); // Clear staged base64
        setEditing(false);
        setShowDeptPicker(false);
        setShowDesigPicker(false);

        Alert.alert('Success', 'Profile updated successfully ✓');
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════
  // PUT /api/lecturer/change-password
  // ══════════════════════════════════════
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all password fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.put('/lecturer/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        Alert.alert('Success', 'Password changed successfully ✓');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Password change failed'
      );
    } finally {
      setChangingPassword(false);
    }
  };


  const fetchAttendanceSettings = async () => {
    try {
      setSettingsLoading(true);
      setSettingsError('');
      const res = await api.get('/settings/attendance');
      if (res.data.success) {
        const d = res.data.data;
        setGpsRange(d.gpsRangeMeters.toString());
        setTimeLimit(d.lateThresholdMinutes.toString());
        setQrValidity(d.qrValidityMinutes.toString());
        setSettingsLastSaved(d.updatedAt);
      }
    } catch (err) {
      // Silently use defaults — settings may not exist yet
      console.log('Settings fetch:', err.response?.data?.message || err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

   // ── PUT /api/settings/attendance ──
  const handleSaveAttendanceSettings = async () => {
    setSettingsError('');

    // ── Client-side validation ──
    const gps = parseInt(gpsRange);
    const late = parseInt(timeLimit);
    const qr = parseInt(qrValidity);

    if (isNaN(gps) || gps < 10 || gps > 1000) {
      setSettingsError('GPS range must be between 10 and 1000 meters');
      return;
    }
    if (isNaN(late) || late < 1 || late > 60) {
      setSettingsError('Late threshold must be between 1 and 60 minutes');
      return;
    }
    if (isNaN(qr) || qr < 5 || qr > 480) {
      setSettingsError('QR validity must be between 5 and 480 minutes');
      return;
    }

    setSettingsSaving(true);
    try {
      const res = await api.put('/settings/attendance', {
        gpsRangeMeters: gps,
        lateThresholdMinutes: late,
        qrValidityMinutes: qr,
      });

      if (res.data.success) {
        setSettingsLastSaved(res.data.data.updatedAt);
        setSettingsSaved(true);
        // Auto-reset success state after 3s
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch (err) {
      setSettingsError(
        err.response?.data?.message || 'Failed to save settings'
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── DELETE /api/settings/attendance/reset ──
  const handleResetAttendanceSettings = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset GPS range to 100m, late threshold to 15 minutes, and QR validity to 120 minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSettingsResetting(true);
            setSettingsError('');
            try {
              const res = await api.delete('/settings/attendance/reset');
              if (res.data.success) {
                const d = res.data.data;
                setGpsRange(d.gpsRangeMeters.toString());
                setTimeLimit(d.lateThresholdMinutes.toString());
                setQrValidity(d.qrValidityMinutes.toString());
                setSettingsSaved(false);
                setSettingsLastSaved(null);
                Alert.alert('Reset', 'Attendance rules reset to defaults ✓');
              }
            } catch (err) {
              setSettingsError(
                err.response?.data?.message || 'Failed to reset settings'
              );
            } finally {
              setSettingsResetting(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleCancelEdit = () => {
    // ── Reset all editable fields back to profile values ──
    setName(profile?.name || '');
    setMobile(profile?.mobile || '');
    setDepartment(profile?.department || '');
    setDesignation(profile?.designation || '');
    setProfileImageUri(profile?.profileImage || null);
    setProfileImageBase64(null);
    setShowDeptPicker(false);
    setShowDesigPicker(false);
    setEditing(false);
  };

  const getBorderColor = (field) =>
    focusedField === field ? '#775a19' : '#c5c6d2';
  const getLabelColor = (field) =>
    focusedField === field ? '#775a19' : '#444650';

  const getInitials = () => {
    const n = profile?.name || name || 'L';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  // ── Dropdown Picker Component ──
  const DropdownPicker = ({ visible, options, selected, onSelect, onClose, label }) => {
    if (!visible) return null;
    return (
      <View style={styles.dropdownContainer}>
        <View style={styles.dropdownHeader}>
          <Text style={styles.dropdownHeaderText}>{label}</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={18} color="#444650" />
          </TouchableOpacity>
        </View>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.dropdownItem, selected === opt && styles.dropdownItemActive]}
            onPress={() => { onSelect(opt); onClose(); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownItemText, selected === opt && styles.dropdownItemTextActive]}>
              {opt}
            </Text>
            {selected === opt && (
              <MaterialCommunityIcons name="check" size={16} color="#775a19" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LoadingScreen
          message="Loading analytics..."
          submessage="Fetching Profile Info"
          variant="full"
        />
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════
  // RENDER: PROFILE TAB
  // ══════════════════════════════════════
  const renderProfileTab = () => (
    <>
      {/* ── Profile Hero Card ── */}
      <View style={styles.profileCard}>
        {/* Avatar with edit overlay */}
        <View style={styles.profileTop}>
          <TouchableOpacity
            onPress={editing ? handlePickImage : undefined}
            style={styles.avatarWrapper}
            activeOpacity={editing ? 0.7 : 1}
          >
            <View style={styles.avatarLarge}>
              {profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarLargeText}>{getInitials()}</Text>
              )}
              {/* Green online indicator (non-edit mode) */}
              {!editing && <View style={styles.activeIndicator} />}
            </View>

            {/* Edit overlay badge */}
            {editing && (
              <View style={styles.avatarEditOverlay}>
                <MaterialCommunityIcons name="camera" size={18} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileNameSection}>
            <Text style={styles.profileName}>{profile?.name || name || 'Lecturer'}</Text>
            <Text style={styles.profileDesignation}>{profile?.designation || designation || 'Lecturer'}</Text>
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons
                name={profile?.isVerified ? 'check-decagram' : 'clock-outline'}
                size={14}
                color={profile?.isVerified ? '#4CAF50' : '#F59E0B'}
              />
              <Text style={[styles.verifiedText, { color: profile?.isVerified ? '#4CAF50' : '#F59E0B' }]}>
                {profile?.isVerified ? 'VERIFIED' : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Pills */}
        <View style={styles.infoPills}>
          <View style={styles.infoPill}>
            <MaterialCommunityIcons name="identifier" size={12} color="#775a19" />
            <Text style={styles.infoPillText}>{profile?.lecturerId || '—'}</Text>
          </View>
          <View style={styles.infoPill}>
            <MaterialCommunityIcons name="domain" size={12} color="#775a19" />
            <Text style={styles.infoPillText}>{department || profile?.department || '—'}</Text>
          </View>
        </View>

        {/* Image note when editing */}
        {editing && (
          <TouchableOpacity style={styles.changePhotoRow} onPress={handlePickImage} activeOpacity={0.7}>
            <MaterialCommunityIcons name="image-plus" size={16} color="rgba(233,193,118,0.8)" />
            <Text style={styles.changePhotoText}>
              {profileImageBase64 ? 'Image selected — tap to change' : 'Tap avatar or here to upload photo'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Personal Details ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View>
            <Text style={styles.sectionCardTitle}>Personal Details</Text>
            <Text style={styles.sectionCardSubtitle}>
              {editing ? 'Edit your information below' : 'Your registered information'}
            </Text>
          </View>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editIconBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#775a19" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleCancelEdit} style={[styles.editIconBtn, { backgroundColor: 'rgba(186,26,26,0.06)' }]}>
              <MaterialCommunityIcons name="close" size={18} color="#ba1a1a" />
            </TouchableOpacity>
          )}
        </View>

 {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: getLabelColor('name') }]}>FULL NAME</Text>
          {editing ? (
            <TextInput
              style={[styles.fieldInput, { borderBottomColor: getBorderColor('name') }]}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              placeholder="Enter your full name"
              placeholderTextColor="rgba(197,198,210,0.7)"
              autoCapitalize="words"
            />
          ) : (
            <Text style={styles.fieldValue}>{profile?.name || '—'}</Text>
          )}
        </View>

        {/* Email — always read-only */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: '#444650' }]}>EMAIL ADDRESS</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.fieldValueReadOnly}>{profile?.email || '—'}</Text>
            <MaterialCommunityIcons name="lock-outline" size={14} color="#c5c6d2" />
          </View>
        </View>

        {/* Mobile */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: getLabelColor('mobile') }]}>MOBILE NUMBER</Text>
          {editing ? (
            <TextInput
              style={[styles.fieldInput, { borderBottomColor: getBorderColor('mobile') }]}
              value={mobile}
              onChangeText={setMobile}
              onFocus={() => setFocusedField('mobile')}
              onBlur={() => setFocusedField(null)}
              placeholder="+94XXXXXXXXX"
              placeholderTextColor="rgba(197,198,210,0.7)"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.fieldValue}>{profile?.mobile || '—'}</Text>
          )}
        </View>

        {/* Lecturer ID — always read-only */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: '#444650' }]}>LECTURER ID</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.fieldValueReadOnly}>{profile?.lecturerId || '—'}</Text>
            <MaterialCommunityIcons name="lock-outline" size={14} color="#c5c6d2" />
          </View>
        </View>

        {/* Department — dropdown when editing */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: getLabelColor('dept') }]}>DEPARTMENT</Text>
          {editing ? (
            <>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { borderBottomColor: getBorderColor('dept') }]}
                onPress={() => { setShowDeptPicker(!showDeptPicker); setShowDesigPicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownTriggerText, !department && styles.dropdownTriggerPlaceholder]}>
                  {department || 'Select department'}
                </Text>
                <MaterialCommunityIcons
                  name={showDeptPicker ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#757682"
                />
              </TouchableOpacity>
              <DropdownPicker
                visible={showDeptPicker}
                options={DEPARTMENTS}
                selected={department}
                onSelect={setDepartment}
                onClose={() => setShowDeptPicker(false)}
                label="SELECT DEPARTMENT"
              />
            </>
          ) : (
            <Text style={styles.fieldValue}>{profile?.department || '—'}</Text>
          )}
        </View>

        {/* Designation — dropdown when editing */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: getLabelColor('desig') }]}>DESIGNATION</Text>
          {editing ? (
            <>
              <TouchableOpacity
                style={[styles.dropdownTrigger, { borderBottomColor: getBorderColor('desig') }]}
                onPress={() => { setShowDesigPicker(!showDesigPicker); setShowDeptPicker(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownTriggerText, !designation && styles.dropdownTriggerPlaceholder]}>
                  {designation || 'Select designation'}
                </Text>
                <MaterialCommunityIcons
                  name={showDesigPicker ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#757682"
                />
              </TouchableOpacity>
              <DropdownPicker
                visible={showDesigPicker}
                options={DESIGNATIONS}
                selected={designation}
                onSelect={setDesignation}
                onClose={() => setShowDesigPicker(false)}
                label="SELECT DESIGNATION"
              />
            </>
          ) : (
            <Text style={styles.fieldValue}>{profile?.designation || '—'}</Text>
          )}
        </View>

        {/* Save Button */}
        {editing && (
          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
            onPress={handleSaveProfile}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={16} color="#ffffff" />
                <Text style={styles.primaryBtnText}>SAVE CHANGES</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── My Courses ── */}
      {profile?.courses && profile.courses.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <View>
              <Text style={styles.sectionCardTitle}>My Courses</Text>
              <Text style={styles.sectionCardSubtitle}>
                {profile.courses.length} course{profile.courses.length !== 1 ? 's' : ''} assigned
              </Text>
            </View>
            <MaterialCommunityIcons name="book-open-variant" size={22} color="rgba(119,90,25,0.3)" />
          </View>

          <View style={styles.coursesList}>
            {profile.courses.map((course, idx) => (
              <View key={course._id || idx} style={styles.courseItem}>
                <View style={styles.courseItemBadge}>
                  <Text style={styles.courseItemCode}>{course.courseCode}</Text>
                </View>
                <View style={styles.courseItemInfo}>
                  <Text style={styles.courseItemName} numberOfLines={1}>{course.courseName}</Text>
                  <Text style={styles.courseItemMeta}>
                    Semester {course.semester} · {course.credits} Credits
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

       {/* ── Account Info ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <Text style={styles.sectionCardTitle}>Account Info</Text>
          <MaterialCommunityIcons name="information-outline" size={22} color="rgba(119,90,25,0.3)" />
        </View>
        <View style={styles.accountStatsGrid}>
          <AccountStat
            icon="calendar-check-outline"
            label="JOINED"
            value={
              profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'
            }
          />
          <AccountStat
            icon="login"
            label="LAST LOGIN"
            value={
              profile?.lastLogin
                ? new Date(profile.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—'
            }
          />
          <AccountStat
            icon="shield-check-outline"
            label="STATUS"
            value={profile?.isActive ? 'Active' : 'Inactive'}
            valueColor={profile?.isActive ? '#4CAF50' : '#ba1a1a'}
          />
          <AccountStat
            icon="book-open-outline"
            label="COURSES"
            value={profile?.courses?.length || 0}
          />
        </View>
      </View>
    </>
  );

  // ══════════════════════════════════════
  // RENDER: SECURITY TAB
  // ══════════════════════════════════════
  const renderSecurityTab = () => (
    <>
      {/* ── Change Password ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View>
            <Text style={styles.sectionCardTitle}>Change Password</Text>
            <Text style={styles.sectionCardSubtitle}>Update your account credentials</Text>
          </View>
          <MaterialCommunityIcons name="shield-key-outline" size={22} color="rgba(119,90,25,0.3)" />
        </View>

        {/* Current Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: getLabelColor('currentPwd') }]}>CURRENT PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.fieldInput, { flex: 1, borderBottomColor: getBorderColor('currentPwd') }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              onFocus={() => setFocusedField('currentPwd')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showCurrentPwd}
              placeholder="••••••••"
              placeholderTextColor="rgba(197,198,210,0.7)"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowCurrentPwd(!showCurrentPwd)} style={styles.eyeBtn}>
              <MaterialCommunityIcons name={showCurrentPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="#757682" />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: getLabelColor('newPwd') }]}>NEW PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.fieldInput, { flex: 1, borderBottomColor: getBorderColor('newPwd') }]}
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => setFocusedField('newPwd')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showNewPwd}
              placeholder="••••••••"
              placeholderTextColor="rgba(197,198,210,0.7)"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNewPwd(!showNewPwd)} style={styles.eyeBtn}>
              <MaterialCommunityIcons name={showNewPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="#757682" />
            </TouchableOpacity>
          </View>
          {newPassword.length > 0 && (
            <>
              <View style={styles.strengthRow}>
                <MaterialCommunityIcons
                  name={newPassword.length >= 6 ? 'check-circle-outline' : 'circle-outline'}
                  size={12}
                  color={newPassword.length >= 6 ? '#4CAF50' : '#c5c6d2'}
                />
                <Text style={[styles.strengthText, { color: newPassword.length >= 6 ? '#4CAF50' : '#757682' }]}>
                  At least 6 characters
                </Text>
              </View>
              <View style={styles.strengthBarRow}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: newPassword.length >= i * 2 ? '#775a19' : '#e8e8e8' }]} />
                ))}
                <Text style={styles.strengthLabel}>
                  {newPassword.length >= 8 ? 'STRONG' : newPassword.length >= 6 ? 'MODERATE' : 'WEAK'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: getLabelColor('confirmPwd') }]}>CONFIRM NEW PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.fieldInput, { flex: 1, borderBottomColor: getBorderColor('confirmPwd') }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedField('confirmPwd')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showConfirmPwd}
              placeholder="••••••••"
              placeholderTextColor="rgba(197,198,210,0.7)"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPwd(!showConfirmPwd)} style={styles.eyeBtn}>
              <MaterialCommunityIcons name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="#757682" />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && (
            <View style={styles.matchRow}>
              <MaterialCommunityIcons
                name={newPassword === confirmPassword ? 'check-circle-outline' : 'close-circle-outline'}
                size={12}
                color={newPassword === confirmPassword ? '#4CAF50' : '#ba1a1a'}
              />
              <Text style={[styles.matchText, { color: newPassword === confirmPassword ? '#4CAF50' : '#ba1a1a' }]}>
                {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, changingPassword && styles.primaryBtnDisabled]}
          onPress={handleChangePassword}
          activeOpacity={0.85}
          disabled={changingPassword}
        >
          {changingPassword ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="shield-key-outline" size={16} color="#ffffff" />
              <Text style={styles.primaryBtnText}>UPDATE PASSWORD</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );


  const renderAttendanceRulesTab = () => (
    <View style={styles.sectionCard}>
      {/* ── Header ── */}
      <View style={styles.sectionCardHeader}>
        <View>
          <Text style={styles.sectionCardTitle}>Attendance Rules</Text>
          <Text style={styles.sectionCardSubtitle}>
            Default values for new QR sessions
          </Text>
        </View>
        <MaterialCommunityIcons
          name="ruler-square"
          size={22}
          color="rgba(119,90,25,0.3)"
        />
      </View>

      {/* ── Loading Skeleton ── */}
      {settingsLoading ? (
        <View style={styles.settingsLoadingWrap}>
          <ActivityIndicator size="small" color="#775a19" />
          <Text style={styles.settingsLoadingText}>
            Loading saved settings...
          </Text>
        </View>
      ) : (
        <>
          {/* ── Error Banner ── */}
          {settingsError ? (
            <View style={styles.settingsErrorBanner}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color="#ba1a1a"
              />
              <Text style={styles.settingsErrorText}>{settingsError}</Text>
              <TouchableOpacity
                onPress={() => setSettingsError('')}
                style={styles.settingsErrorClose}
              >
                <MaterialCommunityIcons name="close" size={14} color="#ba1a1a" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Last Saved Info ── */}
          {settingsLastSaved && (
            <View style={styles.lastSavedRow}>
              <MaterialCommunityIcons
                name="clock-check-outline"
                size={12}
                color="#4CAF50"
              />
              <Text style={styles.lastSavedText}>
                Last saved:{' '}
                {new Date(settingsLastSaved).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}

          {/* ── GPS Range ── */}
          <View style={styles.settingRow}>
            <View style={styles.settingRowHeader}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(76,175,80,0.1)' }]}>
                  <MaterialCommunityIcons
                    name="map-marker-radius"
                    size={18}
                    color="#4CAF50"
                  />
                </View>
                <View>
                  <Text style={styles.settingLabel}>GPS RANGE</Text>
                  <Text style={styles.settingDesc}>
                    Students must be within this radius
                  </Text>
                </View>
              </View>
              <View style={styles.settingValueBadge}>
                <Text style={styles.settingValueBadgeText}>
                  {gpsRange || '100'}m
                </Text>
              </View>
            </View>

            <View style={styles.settingInputRow}>
              <TextInput
                style={[
                  styles.settingInput,
                  {
                    borderBottomColor: getBorderColor('gps'),
                    color:
                      parseInt(gpsRange) < 10 || parseInt(gpsRange) > 1000
                        ? '#ba1a1a'
                        : '#00113a',
                  },
                ]}
                value={gpsRange}
                onChangeText={(v) => {
                  setGpsRange(v);
                  setSettingsError('');
                  setSettingsSaved(false);
                }}
                onFocus={() => setFocusedField('gps')}
                onBlur={() => setFocusedField(null)}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="rgba(197,198,210,0.7)"
              />
              <Text style={styles.settingUnit}>meters</Text>
            </View>
            <Text style={styles.settingHint}>Min: 10m · Max: 1000m</Text>
          </View>

          {/* ── Divider ── */}
          <View style={styles.settingDivider} />

          {/* ── Late Threshold ── */}
          <View style={styles.settingRow}>
            <View style={styles.settingRowHeader}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                  <MaterialCommunityIcons
                    name="clock-alert-outline"
                    size={18}
                    color="#F59E0B"
                  />
                </View>
                <View>
                  <Text style={styles.settingLabel}>LATE THRESHOLD</Text>
                  <Text style={styles.settingDesc}>
                    Minutes after start = marked late
                  </Text>
                </View>
              </View>
              <View style={[styles.settingValueBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                <Text style={[styles.settingValueBadgeText, { color: '#F59E0B' }]}>
                  {timeLimit || '15'} min
                </Text>
              </View>
            </View>

            <View style={styles.settingInputRow}>
              <TextInput
                style={[
                  styles.settingInput,
                  {
                    borderBottomColor: getBorderColor('time'),
                    color:
                      parseInt(timeLimit) < 1 || parseInt(timeLimit) > 60
                        ? '#ba1a1a'
                        : '#00113a',
                  },
                ]}
                value={timeLimit}
                onChangeText={(v) => {
                  setTimeLimit(v);
                  setSettingsError('');
                  setSettingsSaved(false);
                }}
                onFocus={() => setFocusedField('time')}
                onBlur={() => setFocusedField(null)}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor="rgba(197,198,210,0.7)"
              />
              <Text style={styles.settingUnit}>minutes</Text>
            </View>
            <Text style={styles.settingHint}>Min: 1 min · Max: 60 min</Text>
          </View>

          {/* ── Divider ── */}
          <View style={styles.settingDivider} />

          {/* ── QR Validity ── */}
          <View style={styles.settingRow}>
            <View style={styles.settingRowHeader}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(0,35,102,0.08)' }]}>
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={18}
                    color="#002366"
                  />
                </View>
                <View>
                  <Text style={styles.settingLabel}>QR CODE VALIDITY</Text>
                  <Text style={styles.settingDesc}>
                    How long the QR code stays active
                  </Text>
                </View>
              </View>
              <View style={[styles.settingValueBadge, { backgroundColor: 'rgba(0,35,102,0.08)' }]}>
                <Text style={[styles.settingValueBadgeText, { color: '#002366' }]}>
                  {qrValidity || '120'} min
                </Text>
              </View>
            </View>

            <View style={styles.settingInputRow}>
              <TextInput
                style={[
                  styles.settingInput,
                  {
                    borderBottomColor: getBorderColor('qr'),
                    color:
                      parseInt(qrValidity) < 5 || parseInt(qrValidity) > 480
                        ? '#ba1a1a'
                        : '#00113a',
                  },
                ]}
                value={qrValidity}
                onChangeText={(v) => {
                  setQrValidity(v);
                  setSettingsError('');
                  setSettingsSaved(false);
                }}
                onFocus={() => setFocusedField('qr')}
                onBlur={() => setFocusedField(null)}
                keyboardType="numeric"
                placeholder="120"
                placeholderTextColor="rgba(197,198,210,0.7)"
              />
              <Text style={styles.settingUnit}>minutes</Text>
            </View>
            <Text style={styles.settingHint}>Min: 5 min · Max: 480 min (8 hours)</Text>
          </View>

          {/* ── Info Note ── */}
          <View style={styles.infoNote}>
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color="#775a19"
            />
            <Text style={styles.infoNoteText}>
              These values are loaded automatically when you create a new QR
              session. You can still override them per session. Existing sessions
              are not affected.
            </Text>
          </View>

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (settingsSaving || settingsResetting) && styles.primaryBtnDisabled,
              settingsSaved && styles.primaryBtnSuccess,
            ]}
            onPress={handleSaveAttendanceSettings}
            activeOpacity={0.85}
            disabled={settingsSaving || settingsResetting}
          >
            {settingsSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : settingsSaved ? (
              <>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.primaryBtnText}>SAVED SUCCESSFULLY ✓</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="content-save-outline"
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.primaryBtnText}>SAVE RULES</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Reset Button ── */}
          <TouchableOpacity
            style={[
              styles.resetBtn,
              settingsResetting && { opacity: 0.5 },
            ]}
            onPress={handleResetAttendanceSettings}
            disabled={settingsResetting}
            activeOpacity={0.7}
          >
            {settingsResetting ? (
              <ActivityIndicator size="small" color="#775a19" />
            ) : (
              <Text style={styles.resetBtnText}>Reset to Defaults</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );


   // ══════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#00113a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutHeaderBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={18} color="#ba1a1a" />
          </TouchableOpacity>
        </View>

        {/* ── Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {PROFILE_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={
                  tab === 'Profile' ? 'account-circle-outline' :
                  tab === 'Security' ? 'shield-lock-outline' :
                  'ruler-square'
                }
                size={14}
                color={activeTab === tab ? '#00113a' : '#757682'}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            {/* ── Archival Header ── */}
            <View style={styles.archivalHeader}>
              <View style={styles.archivalAccent} />
              <View>
                <Text style={styles.archivalLabel}>
                  {activeTab === 'Profile' ? 'ACADEMIC RECORD' :
                   activeTab === 'Security' ? 'SECURITY PROTOCOL' :
                   'CONFIGURATION'}
                </Text>
                <Text style={styles.archivalTitle}>
                  {activeTab === 'Profile' ? 'Lecturer Profile' :
                   activeTab === 'Security' ? 'Account Security' :
                   'Attendance Rules'}
                </Text>
              </View>
            </View>

            {/* ── Tab Content ── */}
            {activeTab === 'Profile' && renderProfileTab()}
            {activeTab === 'Security' && renderSecurityTab()}
            {activeTab === 'Attendance Rules' && renderAttendanceRulesTab()}

            {/* ── Sign Out ── */}
            <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                <MaterialCommunityIcons name="logout" size={18} color="#ba1a1a" />
                <Text style={styles.logoutBtnText}>SIGN OUT</Text>
              </TouchableOpacity>
              <Text style={styles.logoutHint}>
                You will be redirected to the login screen
              </Text>
            </View>

            <Text style={styles.footerText}>
              © SABARAGAMUWA UNIVERSITY OF SRI LANKA
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}



