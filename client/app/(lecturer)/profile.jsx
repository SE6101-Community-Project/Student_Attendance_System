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