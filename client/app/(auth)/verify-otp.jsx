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
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '@/src/api/axiosInstance';

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const { email, role } = useLocalSearchParams();

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

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

    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (s) => {
    const min = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError('');

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');

    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint =
        role === 'lecturer'
          ? '/lecturer/verify-otp'
          : '/student/verify-otp';

      const response = await api.post(endpoint, {
        email: email,
        otp: code,
      });

      if (response.data.success) {
        router.push({
          pathname: '/(auth)/reset-password',
          params: {
            resetToken: response.data.resetToken,
            role: role || 'student',
          },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP');
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      const endpoint =
        role === 'lecturer'
          ? '/lecturer/send-otp'
          : '/student/send-otp';

      await api.post(endpoint, { email });
      setTimer(120);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fcfcfc" />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color="#00113a"
            />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>The Academic Institute</Text>
        </View>

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
                  <Text style={styles.archivalLabel}>
                    IDENTITY VERIFICATION
                  </Text>
                  <Text style={styles.archivalTitle}>Verify Identity</Text>
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
                  {role === 'lecturer' ? 'LECTURER ACCOUNT' : 'STUDENT ACCOUNT'}
                </Text>
              </View>

              {/* ── Content Card ── */}
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  We have sent a 6-digit code to{' '}
                  <Text style={{ fontFamily: 'Manrope_700Bold' }}>
                    {email || 'your registered email'}
                  </Text>
                  . Please enter the verification code below to proceed.
                </Text>

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

                {/* ── OTP Inputs ── */}
                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      style={[
                        styles.otpInput,
                        digit && styles.otpInputFilled,
                      ]}
                      value={digit}
                      onChangeText={(text) =>
                        handleOtpChange(text.replace(/[^0-9]/g, ''), index)
                      }
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                {/* ── Verify Button ── */}
                <TouchableOpacity
                  style={[styles.verifyBtn, loading && { opacity: 0.7 }]}
                  onPress={handleVerify}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.verifyBtnText}>VERIFY & CONTINUE</Text>
                  )}
                </TouchableOpacity>

                {/* ── Resend & Timer ── */}
                <View style={styles.resendRow}>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={!canResend}
                    style={styles.resendBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="refresh"
                      size={14}
                      color={canResend ? '#00113a' : '#c5c6d2'}
                    />
                    <Text
                      style={[
                        styles.resendText,
                        !canResend && styles.resendTextDisabled,
                      ]}
                    >
                      RESEND CODE
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.timerRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={14}
                      color="#444650"
                    />
                    <Text style={styles.timerText}>{formatTime(timer)}</Text>
                  </View>
                </View>
              </View>

              {/* ── Support ── */}
              <View style={styles.supportRow}>
                <Text style={styles.supportText}>Technical Issues? </Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.supportLink}>
                    Contact Archival Support
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 232, 232, 0.5)',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerBarTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontStyle: 'italic',
    fontSize: 18,
    color: '#00113a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
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
    fontSize: 10,
    letterSpacing: 3,
    color: '#775a19',
    marginBottom: 6,
  },
  archivalTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 40,
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
    marginBottom: 24,
    marginLeft: 18,
  },
  roleBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: '#775a19',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 28,
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 60,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(232, 232, 232, 0.3)',
    gap: 32,
  },
  cardText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: '#444650',
    lineHeight: 22,
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otpInput: {
    width: 44,
    height: 64,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(197, 198, 210, 0.3)',
    textAlign: 'center',
    fontFamily: 'Newsreader_400Regular',
    fontSize: 28,
    color: '#00113a',
  },
  otpInputFilled: { borderBottomColor: '#775a19' },
  verifyBtn: {
    backgroundColor: '#00113a',
    paddingVertical: 18,
    borderRadius: 6,
    alignItems: 'center',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 8,
  },
  verifyBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 4,
    color: '#ffffff',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 232, 232, 0.5)',
    paddingTop: 20,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 3,
    color: '#00113a',
  },
  resendTextDisabled: { color: '#c5c6d2' },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#444650',
  },
  supportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  supportText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#444650',
  },
  supportLink: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: '#775a19',
  },
});