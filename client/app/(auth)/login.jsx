import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../src/context/AuthContext';

const { width } = Dimensions.get('window');

const FloatingInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  showToggle,
  showPassword,
  onTogglePassword,
  keyboardType = 'default',
  autoCapitalize = 'none',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const isActive = isFocused || value?.length > 0;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isActive ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isActive]);

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, -8],
  });

  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 9],
  });

  const borderColor = isFocused ? '#775a19' : '#c5c6d2';
  const labelColor = isFocused ? '#775a19' : '#757682';

  return (
    <View style={floatingStyles.container}>
      {/* Animated Floating Label */}
      <Animated.Text
        style={[
          floatingStyles.label,
          {
            top: labelTop,
            fontSize: labelFontSize,
            color: labelColor,
          },
        ]}
      >
        {label}
      </Animated.Text>

      {/* Input Row */}
      <View style={floatingStyles.inputRow}>
        <TextInput
          style={[
            floatingStyles.input,
            { borderBottomColor: borderColor },
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder=""
          placeholderTextColor="transparent"
        />

        {/* Password Eye Toggle */}
        {showToggle && (
          <TouchableOpacity
            onPress={onTogglePassword}
            style={floatingStyles.eyeBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#757682"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const floatingStyles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingTop: 8,
    marginBottom: 4,
  },
  label: {
    position: 'absolute',
    left: 0,
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 2,
    zIndex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    color: '#00113a',
    borderBottomWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 0,
    paddingTop: 20,
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    bottom: 12,
    padding: 4,
  },
});

// ─────────────────────────────────────────
// Login Screen
// ─────────────────────────────────────────
export default function LoginScreen() {
  const { loginStudent, loginLecturer, loading } = useAuth();

  // ── Form State ──
  const [activeTab, setActiveTab] = useState('student');
  const [studentEmail, setStudentEmail] = useState('');
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // ── Animations ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(1)).current;

  // ── Entry Animation ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Tab Switch ──
  const switchTab = (tab) => {
    if (tab === activeTab) return;

    Animated.timing(formOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      setError('');
      setPassword('');

      Animated.timing(toggleAnim, {
        toValue: tab === 'lecturer' ? 1 : 0,
        duration: 280,
        useNativeDriver: false,
      }).start();

      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  // ── Login Handler ──
  const handleLogin = async () => {
    setError('');

    if (activeTab === 'student') {
      if (!studentEmail.trim() || !password.trim()) {
        setError('Please fill in all fields');
        return;
      }
      const result = await loginStudent(studentEmail.trim(), password);
      if (!result?.success) {
        setError(result?.message || 'Authentication failed');
      }
    } else {
      if (!lecturerEmail.trim() || !password.trim()) {
        setError('Please fill in all fields');
        return;
      }
      const result = await loginLecturer(lecturerEmail.trim(), password);
      if (!result?.success) {
        setError(result?.message || 'Authentication failed');
      }
    }
  };

  // ── Toggle Indicator Position ──
  const toggleIndicatorLeft = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, (width - 96) / 2],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Background Blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <SafeAreaView style={styles.safeArea}>
        <BlurView
          intensity={80}
          tint="light"
          style={styles.header}
        >
          {/* Left: Icon + Title */}
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="bank"
              size={26}
              color="#00113a"
            />
            <Text style={styles.headerTitle}>The Academic Curator</Text>
          </View>
        </BlurView>

        {/* ═══════════════════════════════════════
            SCROLLABLE CONTENT
        ═══════════════════════════════════════ */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.mainContent,
                {
                  opacity: fadeIn,
                  transform: [{ translateY: slideUp }],
                },
              ]}
            >

              {/* ═══════════════════════════════
                  Main Card
              ═══════════════════════════════ */}
              <View style={styles.card}>
                {/* Left Gold Accent Bar */}
                <View style={styles.leftAccent} />

                {/* ── Card Header ── */}
                <View style={styles.headerSection}>
                  <Text style={styles.cardLabel}>
                    GATEKEEPING EXCELLENCE
                  </Text>
                  <Text style={styles.cardTitle}>
                    Attendance{'\n'}Management{'\n'}System
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Please select your persona to begin the authentication
                    process.
                  </Text>
                </View>

                {/* ── Student / Lecturer Toggle ── */}
                <View style={styles.toggleContainer}>
                  <Animated.View
                    style={[
                      styles.toggleIndicator,
                      { left: toggleIndicatorLeft },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.toggleBtn}
                    onPress={() => switchTab('student')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        activeTab === 'student' && styles.toggleTextActive,
                      ]}
                    >
                      STUDENT
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toggleBtn}
                    onPress={() => switchTab('lecturer')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        activeTab === 'lecturer' &&
                          styles.toggleTextActive,
                      ]}
                    >
                      LECTURER
                    </Text>
                  </TouchableOpacity>
                </View>

                 {/* ── Error Banner ── */}
                {error ? (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={16}
                      color="#ba1a1a"
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* ── Form Fields ── */}
                <Animated.View
                  style={[
                    styles.formSection,
                    { opacity: formOpacity },
                  ]}
                >
                  {activeTab === 'student' ? (
                    <>
                      <FloatingInput
                        label="EMAIL ADDRESS"
                        value={studentEmail}
                        onChangeText={setStudentEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <FloatingInput
                        label="SECURITY CREDENTIALS"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        showToggle
                        showPassword={showPassword}
                        onTogglePassword={() =>
                          setShowPassword(!showPassword)
                        }
                      />
                    </>
                  ) : (
                    <>
                      <FloatingInput
                        label="STAFF UNIVERSITY EMAIL"
                        value={lecturerEmail}
                        onChangeText={setLecturerEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <FloatingInput
                        label="SECURITY KEY"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        showToggle
                        showPassword={showPassword}
                        onTogglePassword={() =>
                          setShowPassword(!showPassword)
                        }
                      />
                    </>
                  )}
                </Animated.View>

                {/* ── Utilities Row ── */}
                <View style={styles.utilitiesRow}>
                  <TouchableOpacity
                    style={styles.rememberRow}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        rememberMe && styles.checkboxActive,
                      ]}
                    >
                      {rememberMe && (
                        <MaterialCommunityIcons
                          name="check"
                          size={11}
                          color="#775a19"
                        />
                      )}
                    </View>
                    <Text style={styles.rememberText}>KEEP SESSION</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      router.push('/(auth)/forgot-password')
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotText}>
                      CREDENTIAL RECOVERY
                    </Text>
                  </TouchableOpacity>
                </View>