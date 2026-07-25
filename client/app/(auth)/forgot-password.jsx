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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/src/api/axiosInstance';

export default function ForgotPasswordScreen() {
  const [role, setRole] = useState('student'); // 'student' | 'lecturer'
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

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

  const switchRole = (newRole) => {
    if (newRole === role) return;
    setRole(newRole);
    setError('');
    setEmail('');

    Animated.timing(toggleAnim, {
      toValue: newRole === 'lecturer' ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const handleSubmit = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        role === 'lecturer'
          ? '/lecturer/send-otp'
          : '/student/send-otp';

      const response = await api.post(endpoint, {
        email: email.trim(),
      });

      if (response.data.success) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            email: email.trim(),
            role: role, // 'student' | 'lecturer'
          },
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to process request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCFBF7" />

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
              style={[
                styles.mainContent,
                {
                  opacity: fadeIn,
                  transform: [{ translateY: slideUp }],
                },
              ]}
            >
              {/* ── Brand Header ── */}
              <View style={styles.brandSection}>
                <Text style={styles.brandName}>The Academic Institute</Text>
                <View style={styles.protocolRow}>
                  <View style={styles.protocolLine} />
                  <Text style={styles.protocolText}>
                    AUTHENTICATION PROTOCOL
                  </Text>
                  <View style={styles.protocolLine} />
                </View>
              </View>

              {/* ── Title ── */}
              <View style={styles.titleSection}>
                <Text style={styles.mainTitle}>
                  Recover Your{'\n'}Credentials
                </Text>
                <Text style={styles.subtitle}>
                  Enter your email to receive a 6-digit OTP verification code.
                </Text>
              </View>

              {/* ── Role Toggle ── */}
              <View style={styles.roleToggleContainer}>
                <Animated.View
                  style={[
                    styles.roleToggleIndicator,
                    {
                      left: toggleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['2%', '50%'],
                      }),
                    },
                  ]}
                />
                <TouchableOpacity
                  style={styles.roleToggleBtn}
                  onPress={() => switchRole('student')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="account-school-outline"
                    size={14}
                    color={role === 'student' ? '#00113a' : '#757682'}
                  />
                  <Text
                    style={[
                      styles.roleToggleText,
                      role === 'student' && styles.roleToggleTextActive,
                    ]}
                  >
                    STUDENT
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roleToggleBtn}
                  onPress={() => switchRole('lecturer')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="human-male-board"
                    size={14}
                    color={role === 'lecturer' ? '#00113a' : '#757682'}
                  />
                  <Text
                    style={[
                      styles.roleToggleText,
                      role === 'lecturer' && styles.roleToggleTextActive,
                    ]}
                  >
                    LECTURER
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Form ── */}
              <View style={styles.formSection}>
                {/* Error */}
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

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputRow}>
                    <MaterialCommunityIcons
                      name="account-circle-outline"
                      size={20}
                      color={focused ? '#775a19' : '#757682'}
                    />
                    <View style={styles.inputWrapper}>
                      <Text
                        style={[
                          styles.inputLabel,
                          { color: focused ? '#775a19' : '#444650' },
                        ]}
                      >
                        {role === 'student'
                          ? 'STUDENT EMAIL ADDRESS'
                          : 'STAFF EMAIL ADDRESS'}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            borderBottomColor: focused
                              ? '#775a19'
                              : 'rgba(197, 198, 210, 0.5)',
                          },
                        ]}
                        placeholder={
                          role === 'student'
                            ? 'Enter your student email'
                            : 'Enter your staff email'
                        }
                        placeholderTextColor="rgba(117, 118, 130, 0.5)"
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (error) setError('');
                        }}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                        editable={!loading}
                      />
                    </View>
                  </View>
                </View>

                {/* Info Note */}
                <View style={styles.infoNote}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={14}
                    color="#775a19"
                  />
                  <Text style={styles.infoNoteText}>
                    A 6-digit OTP will be sent to your email. The code expires
                    in 10 minutes.
                  </Text>
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    loading && styles.ctaButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>
                        SEND VERIFICATION CODE
                      </Text>
                      <MaterialCommunityIcons
                        name="arrow-right"
                        size={16}
                        color="#ffffff"
                      />
                    </>
                  )}
                </TouchableOpacity>

                {/* Return to Login */}
                <TouchableOpacity
                  style={styles.returnRow}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={14}
                    color="rgba(0, 17, 58, 0.7)"
                  />
                  <Text style={styles.returnText}>RETURN TO LOGIN</Text>
                </TouchableOpacity>
              </View>

              {/* ── Footer ── */}
              <View style={styles.footer}>
                <View style={styles.footerGrid}>
                  <View style={styles.footerCol}>
                    <Text style={styles.footerLabel}>INQUIRIES</Text>
                    <Text style={styles.footerValue}>IT Helpdesk: ext 405</Text>
                  </View>
                  <View style={[styles.footerCol, styles.footerColBorder]}>
                    <Text style={styles.footerLabel}>CODE EXPIRES</Text>
                    <Text style={styles.footerValue}>10 minutes</Text>
                  </View>
                </View>
                <Text style={styles.copyright}>
                  © SABARAGAMUWA UNIVERSITY OF SRI LANKA
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFBF7' },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontFamily: 'Newsreader_400Regular',
    fontStyle: 'italic',
    fontSize: 28,
    color: '#00113a',
    marginBottom: 12,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  protocolLine: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(119, 90, 25, 0.4)',
  },
  protocolText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 4,
    color: '#775a19',
    marginHorizontal: 12,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 40,
    lineHeight: 48,
    color: '#00113a',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: 'rgba(68, 70, 80, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#eeeeee',
    borderRadius: 8,
    padding: 4,
    marginBottom: 32,
    position: 'relative',
    height: 48,
    width: '100%',
  },
  roleToggleIndicator: {
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
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  roleToggleText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 3,
    color: '#757682',
  },
  roleToggleTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#00113a',
  },
  formSection: {
    width: '100%',
    gap: 24,
  },
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
  inputGroup: { width: '100%' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputWrapper: { flex: 1 },
  inputLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 3,
    color: '#444650',
    marginBottom: 4,
  },
  input: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    color: '#00113a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 198, 210, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(119, 90, 25, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#775a19',
  },
  infoNoteText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: '#444650',
    lineHeight: 18,
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00113a',
    paddingVertical: 20,
    borderRadius: 4,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 8,
  },
  ctaButtonDisabled: { opacity: 0.7 },
  ctaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 4,
    color: '#ffffff',
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
  footer: {
    marginTop: 64,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 198, 210, 0.2)',
    paddingTop: 32,
  },
  footerGrid: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  footerCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  footerColBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(197, 198, 210, 0.1)',
  },
  footerLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 7,
    letterSpacing: 4,
    color: 'rgba(117, 118, 130, 0.7)',
  },
  footerValue: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: 'rgba(68, 70, 80, 0.8)',
  },
  copyright: {
    marginTop: 24,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 7,
    letterSpacing: 3,
    color: '#757682',
    textAlign: 'center',
    opacity: 0.3,
  },
});