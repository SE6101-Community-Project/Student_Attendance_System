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
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/src/api/axiosInstance';

export default function ResetPasswordScreen() {
  // resetToken  → from student OTP verify step  OR  from lecturer email link
  // role        → 'student' | 'lecturer'
  const { resetToken, role } = useLocalSearchParams();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newFocused, setNewFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;

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

  const getBorderColor = (focused) => (focused ? '#775a19' : '#c5c6d2');
  const getLabelColor = (focused) => (focused ? '#775a19' : '#444650');

  const handleUpdate = async () => {
    setError('');

    if (!resetToken) {
      setError('Reset session expired. Please start the process again.');
      return;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        role === 'lecturer'
          ? '/lecturer/reset-password'
          : '/student/reset-password';

      const response = await api.post(endpoint, {
        token: resetToken,
        newPassword: newPassword,
      });

      if (response.data.success) {
        setSuccess(true);
        Animated.spring(successScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      } else {
        setError(response.data.message || 'Password reset failed');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Something went wrong';
      if (
        message.toLowerCase().includes('expired') ||
        message.toLowerCase().includes('invalid')
      ) {
        setError('Reset session expired. Please request a new OTP.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ──
  if (success) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.successScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.successCard,
                { transform: [{ scale: successScale }] },
              ]}
            >
              <View style={styles.successIconContainer}>
                <View style={styles.successIconCircle}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={40}
                    color="#775a19"
                  />
                </View>
              </View>

              <Text style={styles.successTitle}>
                Credentials{'\n'}Successfully Updated
              </Text>
              <Text style={styles.successText}>
                Your archival access has been restored. The cryptographic keys
                for your scholarly records have been refreshed to maintain the
                integrity of your research workspace.
              </Text>

              <View style={styles.successActions}>
                <TouchableOpacity
                  style={styles.successPrimaryBtn}
                  onPress={() => router.replace('/(auth)/login')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.successPrimaryBtnText}>
                    RETURN TO LOGIN
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.watermark}>
              <Text style={styles.watermarkTitle}>The Academic</Text>
              <Text style={styles.watermarkSub}>SABARAGAMUWA UNIVERSITY OF SRI LANKA</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Main Screen ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      <SafeAreaView style={styles.safeArea}>
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
              style={{
                opacity: fadeIn,
                transform: [{ translateY: slideUp }],
                width: '100%',
              }}
            >
              {/* ── Archival Header ── */}
              <View style={styles.archivalHeader}>
                <View style={styles.archivalAccent} />
                <View>
                  <Text style={styles.archivalLabel}>SECURITY PROTOCOL</Text>
                  <Text style={styles.archivalTitle}>
                    Create New{'\n'}Password
                  </Text>
                </View>
              </View>

              {/* Role Badge */}
              <View style={styles.roleBadge}>
                <MaterialCommunityIcons
                  name={
                    role === 'lecturer'
                      ? 'human-male-board'
                      : 'account-school-outline'
                  }
                  size={12}
                  color="#775a19"
                />
                <Text style={styles.roleBadgeText}>
                  {role === 'lecturer'
                    ? 'LECTURER ACCOUNT'
                    : 'STUDENT ACCOUNT'}
                </Text>
              </View>

              {/* ── Form ── */}
              <View style={styles.formSection}>
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

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: getLabelColor(newFocused) },
                    ]}
                  >
                    NEW PASSWORD
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        { borderBottomColor: getBorderColor(newFocused) },
                      ]}
                      placeholder="••••••••"
                      placeholderTextColor="#dadada"
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setError('');
                      }}
                      onFocus={() => setNewFocused(true)}
                      onBlur={() => setNewFocused(false)}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={
                          showNewPassword ? 'eye-off-outline' : 'eye-outline'
                        }
                        size={20}
                        color="#757682"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: getLabelColor(confirmFocused) },
                    ]}
                  >
                    CONFIRM PASSWORD
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderBottomColor: getBorderColor(confirmFocused),
                        },
                      ]}
                      placeholder="••••••••"
                      placeholderTextColor="#dadada"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        setError('');
                      }}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={
                          showConfirmPassword
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={20}
                        color="#757682"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Strength Hint */}
                {newPassword.length > 0 && (
                  <View style={styles.hintContainer}>
                    <MaterialCommunityIcons
                      name={
                        newPassword.length >= 6
                          ? 'check-circle-outline'
                          : 'circle-outline'
                      }
                      size={14}
                      color={
                        newPassword.length >= 6 ? '#775a19' : '#c5c6d2'
                      }
                    />
                    <Text
                      style={[
                        styles.hintText,
                        {
                          color:
                            newPassword.length >= 6
                              ? '#775a19'
                              : '#757682',
                        },
                      ]}
                    >
                      At least 6 characters
                    </Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    loading && styles.ctaButtonDisabled,
                  ]}
                  onPress={handleUpdate}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.ctaText}>UPDATE CREDENTIALS</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.returnRow}
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={14}
                  color="#00113a"
                />
                <Text style={styles.returnText}>RETURN TO LOGIN</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  archivalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  archivalAccent: {
    width: 2,
    height: 56,
    backgroundColor: '#775a19',
    marginTop: 4,
  },
  archivalLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 3,
    color: '#775a19',
    marginBottom: 6,
  },
  archivalTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 40,
    lineHeight: 48,
    color: '#00113a',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(119, 90, 25, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 32,
    marginLeft: 18,
  },
  roleBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#775a19',
  },
  formSection: { gap: 32 },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdad6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: '#93000a',
    flex: 1,
  },
  inputGroup: {},
  inputLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 3,
    color: '#444650',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'Newsreader_400Regular',
    fontSize: 24,
    color: '#00113a',
    borderBottomWidth: 2,
    borderBottomColor: '#c5c6d2',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  eyeButton: {
    paddingLeft: 12,
    paddingBottom: 8,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -16,
  },
  hintText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  ctaButton: {
    backgroundColor: '#00113a',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 2,
    alignItems: 'center',
    alignSelf: 'stretch',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  ctaButtonDisabled: { opacity: 0.7 },
  ctaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 3,
    color: '#ffffff',
  },
  divider: {
    width: 64,
    height: 1,
    backgroundColor: 'rgba(197, 198, 210, 0.3)',
    alignSelf: 'center',
    marginVertical: 40,
  },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  returnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 3,
    color: '#00113a',
  },
  successScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    paddingTop: 48,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.06,
    shadowRadius: 60,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  successIconContainer: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
  },
  successIconCircle: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  successTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 28,
    color: '#00113a',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  successText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#444650',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
    maxWidth: 320,
  },
  successActions: {
    alignItems: 'center',
    gap: 24,
    width: '100%',
  },
  successPrimaryBtn: {
    backgroundColor: '#775a19',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 2,
    width: '100%',
    alignItems: 'center',
  },
  successPrimaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 3,
    color: '#ffffff',
  },
  successSecondaryBtn: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#00113a',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(119, 90, 25, 0.2)',
    paddingBottom: 2,
  },
  watermark: {
    alignItems: 'center',
    marginTop: 64,
    opacity: 0.3,
  },
  watermarkTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontStyle: 'italic',
    fontSize: 36,
    color: '#00113a',
  },
  watermarkSub: {
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 3,
    color: '#00113a',
    marginTop: 4,
  },
});