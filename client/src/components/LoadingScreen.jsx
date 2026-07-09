import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");


export default function LoadingScreen({
  message = "Loading...",
  submessage,
  variant = "full", // "full" | "minimal" | "overlay"
}) {
  // ── Animations ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse — logo breathing
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // Rotate — outer ring
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotate.start();

    // Shimmer — gold accent line
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    shimmer.start();

    // Dots — sequential bounce
    const dotBounce = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -8,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(600),
        ]),
      );

    const d1 = dotBounce(dot1, 0);
    const d2 = dotBounce(dot2, 150);
    const d3 = dotBounce(dot3, 300);
    d1.start();
    d2.start();
    d3.start();

    // Progress bar — indeterminate
    const progress = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    progress.start();

    return () => {
      pulse.stop();
      rotate.stop();
      shimmer.stop();
      d1.stop();
      d2.stop();
      d3.stop();
      progress.stop();
    };
  }, []);

  // ── Interpolations ──
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const progressTranslate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.6, width * 0.6],
  });

  // ═══════════════════════════════════════════════════════
  // MINIMAL VARIANT — compact inline loader
  // ═══════════════════════════════════════════════════════
  if (variant === "minimal") {
    return (
      <Animated.View
        style={[
          styles.minimalContainer,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        {/* Spinner */}
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <View style={styles.minimalSpinner}>
            <View style={styles.minimalSpinnerTrack} />
          </View>
        </Animated.View>

        <View style={styles.minimalTextWrap}>
          <Text style={styles.minimalMessage}>{message}</Text>

          {/* Bouncing dots */}
          <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.minimalDot,
                  { transform: [{ translateY: dot }] },
                ]}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    );
  }

  if (variant === "overlay") {
    return (
      <Animated.View style={[styles.overlayBg, { opacity: fadeIn }]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <Animated.View
          style={[
            styles.overlayCard,
            { transform: [{ translateY: slideUp }, { scale: pulseAnim }] },
          ]}
        >
          {/* Rotating ring */}
          <Animated.View
            style={[
              styles.overlayRing,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <View style={styles.overlayRingArc} />
          </Animated.View>

          {/* Center icon */}
          <View style={styles.overlayIconWrap}>
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={24}
              color="#775a19"
            />
          </View>

          <Text style={styles.overlayMessage}>{message}</Text>
          {submessage && (
            <Text style={styles.overlaySubmessage}>{submessage}</Text>
          )}

          {/* Dots */}
          <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.overlayDot,
                  { transform: [{ translateY: dot }] },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />

      {/* Decorative background circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View
        style={[
          styles.fullContent,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        {/* ── Branding header ── */}
        <View style={styles.brandRow}>
          <View style={styles.brandAccent} />
          <Text style={styles.brandLabel}>SABARAGAMUWA UNIVERSITY</Text>
        </View>

        {/* ── Spinner Assembly ── */}
        <View style={styles.spinnerAssembly}>
          {/* Outer rotating ring */}
          <Animated.View
            style={[
              styles.outerRing,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <View style={styles.outerRingArc} />
            <View style={styles.outerRingDot} />
          </Animated.View>

          {/* Inner pulsing circle */}
          <Animated.View
            style={[
              styles.innerCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <MaterialCommunityIcons
              name="bank"
              size={32}
              color="#775a19"
            />
          </Animated.View>
        </View>

        {/* ── Shimmer bar ── */}
        <View style={styles.shimmerTrack}>
          <Animated.View
            style={[
              styles.shimmerBar,
              { transform: [{ translateX: shimmerTranslate }] },
            ]}
          />
        </View>

        {/* ── Message ── */}
        <Text style={styles.fullTitle}>Academic Curator</Text>

        <View style={styles.messageRow}>
          <Text style={styles.fullMessage}>{message}</Text>
          <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.fullDot,
                  { transform: [{ translateY: dot }] },
                ]}
              />
            ))}
          </View>
        </View>

        {submessage && (
          <Text style={styles.fullSubmessage}>{submessage}</Text>
        )}


        {/* ── Security badge ── */}
        <View style={styles.securityBadge}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={11}
            color="#a0a1ad"
          />
          <Text style={styles.securityText}>SECURE ACADEMIC LINK</Text>
        </View>
      </Animated.View>

      {/* ── Footer ── */}
      <Text style={styles.fullFooter}>
        © SABARAGAMUWA UNIVERSITY OF SRI LANKA
      </Text>
    </View>
  );
}

const GOLD = "#775a19";
const GOLD_LIGHT = "#c4a257";
const NAVY = "#00113a";

const styles = StyleSheet.create({
  // ─── FULL VARIANT ────────────────────────────────────────
  fullContainer: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
  },
  fullContent: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 40,
  },

  // Background decor
  bgCircle1: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(119,90,25,0.03)",
  },
  bgCircle2: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0,17,58,0.02)",
  },

  // Brand
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  brandAccent: {
    width: 2,
    height: 14,
    backgroundColor: GOLD,
    borderRadius: 1,
  },
  brandLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 3,
    color: GOLD,
  },

  // Spinner assembly
  spinnerAssembly: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  outerRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(197,198,210,0.15)",
  },
  outerRingArc: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "transparent",
    borderTopColor: GOLD,
    borderRightColor: GOLD_LIGHT,
  },
  outerRingDot: {
    position: "absolute",
    top: -3,
    left: "50%",
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  innerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(119,90,25,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(119,90,25,0.1)",
  },

  // Shimmer
  shimmerTrack: {
    width: 80,
    height: 2,
    backgroundColor: "rgba(197,198,210,0.2)",
    borderRadius: 1,
    overflow: "hidden",
  },
  shimmerBar: {
    width: 40,
    height: "100%",
    backgroundColor: GOLD_LIGHT,
    borderRadius: 1,
  },

  // Text
  fullTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 22,
    color: NAVY,
    letterSpacing: -0.3,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fullMessage: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "#757682",
    letterSpacing: 0.5,
  },
  fullSubmessage: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#a0a1ad",
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 260,
  },

  // Dots
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "flex-end",
  },
  fullDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD_LIGHT,
  },

  // Progress
  progressTrack: {
    width: width * 0.5,
    height: 3,
    backgroundColor: "rgba(197,198,210,0.15)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    width: "40%",
    height: "100%",
    backgroundColor: GOLD,
    borderRadius: 2,
  },

  // Security
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    backgroundColor: "rgba(197,198,210,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  securityText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 7,
    letterSpacing: 2,
    color: "#a0a1ad",
  },

  // Footer
  fullFooter: {
    position: "absolute",
    bottom: 40,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 7,
    letterSpacing: 3,
    color: "#757682",
    opacity: 0.3,
  },

  // ─── MINIMAL VARIANT ─────────────────────────────────────
  minimalContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  minimalSpinner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(197,198,210,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  minimalSpinnerTrack: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    borderTopColor: GOLD,
  },
  minimalTextWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  minimalMessage: {
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    color: "#757682",
  },
  minimalDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: GOLD_LIGHT,
  },

  // ─── OVERLAY VARIANT ─────────────────────────────────────
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,17,58,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  overlayCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 16,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  overlayRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(197,198,210,0.15)",
  },
  overlayRingArc: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "transparent",
    borderTopColor: GOLD,
  },
  overlayIconWrap: {
    position: "absolute",
    top: 0,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayMessage: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 14,
    color: NAVY,
    textAlign: "center",
  },
  overlaySubmessage: {
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: "#757682",
    textAlign: "center",
    lineHeight: 16,
  },
  overlayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
});