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

                 {/* ── Authenticate CTA ── */}
                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    activeTab === 'lecturer' && styles.ctaButtonLecturer,
                    loading && styles.ctaButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.ctaContent}>
                      <Text style={styles.ctaText}>AUTHENTICATE</Text>
                      <MaterialCommunityIcons
                        name="arrow-right"
                        size={16}
                        color="#ffffff"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* ═══════════════════════════════
                  Register Section
              ═══════════════════════════════ */}
              <View style={styles.registerSection}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>
                    NEW TO THE ARCHIVE?
                  </Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.registerBtn}
                  onPress={() => router.push('/(auth)/register')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.registerBtnText}>
                    REGISTER ACCOUNT
                  </Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={14}
                    color="#775a19"
                  />
                </TouchableOpacity>
              </View>

              {/* ── Footer ── */}
              <View style={styles.footer}>
                <View style={styles.footerDivider} />
                <View style={styles.footerContent}>
                  <View style={styles.footerLeft}>
                    <Text style={styles.footerBrand}>
                      University Archive
                    </Text>
                    <Text style={styles.footerCopy}>
                      © 2026 University Archive. All rights reserved.
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 38,
    paddingBottom: 10,
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
  },

  // ── Background Blobs ──
  blobTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(119, 90, 25, 0.04)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 17, 58, 0.04)',
  },

  // ══════════════════════════════════
  // HEADER
  // ══════════════════════════════════
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 17, 58, 0.06)',
    // BlurView handles the background
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 20,
    color: '#00113a',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  headerNavItem: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#757682',
    textTransform: 'uppercase',
  },
  headerNavActive: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#775a19',
    textTransform: 'uppercase',
  },

  // ══════════════════════════════════
  // CARD
  // ══════════════════════════════════
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 32,
    paddingLeft: 36,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 40,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  leftAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '200%',
    backgroundColor: '#775a19',
  },

  // ── Card Header ──
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cardLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 4,
    color: '#444650',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 34,
    lineHeight: 42,
    color: '#775a19',
    textAlign: 'center',
    marginBottom: 14,
  },
  cardSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#444650',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // ── Toggle ──
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#eeeeee',
    borderRadius: 8,
    padding: 4,
    marginBottom: 32,
    position: 'relative',
    height: 46,
  },
  toggleIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  toggleText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 3,
    color: '#757682',
  },
  toggleTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#00113a',
  },

  // ── Error ──
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdad6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#93000a',
    flex: 1,
    lineHeight: 18,
  },

  // ── Form ──
  formSection: {
    gap: 24,
    marginBottom: 28,
  },

  // ── Utilities ──
  utilitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#c5c6d2',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: '#775a19',
    backgroundColor: 'rgba(119, 90, 25, 0.08)',
  },
  rememberText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#444650',
  },
  forgotText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#775a19',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(119, 90, 25, 0.3)',
  },

  // ── CTA ──
  ctaButton: {
    backgroundColor: '#002366',
    paddingVertical: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  ctaButtonLecturer: {
    backgroundColor: '#00113a',
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 4,
    color: '#ffffff',
  },

  // ══════════════════════════════════
  // REGISTER SECTION
  // ══════════════════════════════════
  registerSection: {
    marginTop: 32,
    alignItems: 'center',
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(197, 198, 210, 0.5)',
  },
  dividerText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#757682',
    marginHorizontal: 16,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(119, 90, 25, 0.25)',
    borderRadius: 4,
  },
  registerBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 3,
    color: '#775a19',
  },
