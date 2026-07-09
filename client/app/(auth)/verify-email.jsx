import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const { status, email } = useLocalSearchParams();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleIn, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeIn,
                transform: [{ scale: scaleIn }],
              },
            ]}
          >
            {/* Icon */}
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color="#775a19"
              />
            </View>

            {/* Badge */}
            <Text style={styles.badge}>VERIFICATION COMPLETE</Text>

            {/* Title */}
            <Text style={styles.title}>
              Email Verification Link has been sent Successfully
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              Check Your email{' '}
              {email && (
                <Text style={styles.email}>{email}</Text>
              )}
              {' '}to be verified. You can now login to your account.
            </Text>

            {/* Steps */}
            <View style={styles.stepsCard}>
              <View style={styles.step}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepNum}>✓</Text>
                </View>
                <Text style={styles.stepText}>
                  Account created
                </Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepNum}>✓</Text>
                </View>
                <Text style={styles.stepText}>
                  Sent verification email
                </Text>
              </View>
              <View style={styles.step}>
                <View style={[styles.stepDot, styles.stepDotActive]}>
                  <Text style={styles.stepNum}>3</Text>
                </View>
                <Text style={[styles.stepText, styles.stepTextActive]}>
                  Login to continue
                </Text>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>GO TO LOGIN</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={16}
                color="#ffffff"
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footer}>
            © SABARAGAMUWA UNIVERSITY OF SRI LANKA
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 36,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 40,
    elevation: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#775a19',
  },
  iconCircle: {
    marginBottom: 16,
  },
  badge: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 4,
    color: '#775a19',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 30,
    lineHeight: 38,
    color: '#00113a',
    textAlign: 'center',
    marginBottom: 14,
  },
  message: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: '#444650',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  email: {
    fontFamily: 'Manrope_700Bold',
    color: '#00113a',
  },
  stepsCard: {
    backgroundColor: '#f3f3f3',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    gap: 14,
    marginBottom: 28,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(119, 90, 25, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#775a19',
  },
  stepNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#775a19',
  },
  stepText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#757682',
    textDecorationLine: 'line-through',
  },
  stepTextActive: {
    fontFamily: 'Manrope_700Bold',
    color: '#00113a',
    textDecorationLine: 'none',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00113a',
    paddingVertical: 18,
    borderRadius: 4,
    width: '100%',
    shadowColor: '#00113a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  ctaText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 4,
    color: '#ffffff',
  },
  footer: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 8,
    letterSpacing: 3,
    color: '#757682',
    opacity: 0.4,
    marginTop: 32,
  },
});