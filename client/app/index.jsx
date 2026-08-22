// app/index.jsx
import { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

export default function SplashScreenPage() {
  // ── Guard refs ──
  const hasNavigated = useRef(false);
  const animationsStarted = useRef(false);

  // ── Animation values ──
  const fadeLogo = useRef(new Animated.Value(0)).current;
  const fadeOfficial = useRef(new Animated.Value(0)).current;
  const fadeTitle = useRef(new Animated.Value(0)).current;
  const fadeUni = useRef(new Animated.Value(0)).current;
  const fadeCard = useRef(new Animated.Value(0)).current;
  const fadeBottom = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0.3)).current;

  // ── Dot pulse loop ref — so we can stop it on unmount ──
  const dotLoopRef = useRef(null);

  // ─────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      dotLoopRef.current?.stop();
    };
  }, []);

  // ─────────────────────────────────────────
  // Start animations immediately — fonts are
  // already loaded by _layout.jsx before this
  // screen even renders
  // ─────────────────────────────────────────
  useEffect(() => {
    if (animationsStarted.current) return;
    animationsStarted.current = true;
    startAnimations();
  }, []);

  // ─────────────────────────────────────────
  // Navigate to login — called only once
  // ─────────────────────────────────────────
  const navigateToLogin = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace("/(auth)/login");
  }, []);

  // ─────────────────────────────────────────
  // Sequential fade-in animations
  // ─────────────────────────────────────────
  const startAnimations = useCallback(() => {
    Animated.sequence([
      // Logo fades in first
      Animated.timing(fadeLogo, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Then the rest cascade
      Animated.timing(fadeOfficial, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeTitle, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeUni, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeCard, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeBottom, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // All elements visible — start progress bar
      startProgress();
    });
  }, []);

  // ─────────────────────────────────────────
  // Progress bar + dot pulse
  // ─────────────────────────────────────────
  const startProgress = useCallback(() => {
    // Progress bar fills over 3 s then navigates
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 3_000,
      useNativeDriver: false, // width % cannot use native driver
    }).start(({ finished }) => {
      if (finished) navigateToLogin();
    });

    // Pulsing dot — independent loop
    dotLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    dotLoopRef.current.start();
  }, [navigateToLogin]);

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#e8ede8" />

      {/* ── Background layers ── */}
      <View style={styles.bgTop} />
      <View style={styles.bgBottom} />

      <SafeAreaView style={styles.safeArea}>

        {/* ── Main Content ── */}
        <View style={styles.content}>

          {/* Logo Card */}
          <Animated.View
            style={[styles.logoCard, { opacity: fadeLogo }]}
          >
            <View style={styles.logoBox}>
              <Image
                source={require("../assets/images/university-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Official Repository row */}
          <Animated.View
            style={[styles.officialRow, { opacity: fadeOfficial }]}
          >
            <View style={styles.line} />
            <Text style={styles.officialText}>
              OFFICIAL REPOSITORY
            </Text>
            <View style={styles.line} />
          </Animated.View>

          {/* Main title */}
          <Animated.View
            style={[styles.titleContainer, { opacity: fadeTitle }]}
          >
            <Text style={styles.title}>The Academic</Text>
            <Text style={styles.title}>Curator</Text>
          </Animated.View>

          {/* University name */}
          <Animated.Text
            style={[styles.universityText, { opacity: fadeUni }]}
          >
            SABARAGAMUWA UNIVERSITY OF SRI LANKA
          </Animated.Text>

          {/* Connection card */}
          <Animated.View
            style={[styles.connectionCard, { opacity: fadeCard }]}
          >
            <View style={styles.iconWrapper}>
              {/*
                MaterialCommunityIcons is rendered here so the
                icon font is warm in the cache before any other
                screen needs it.
              */}
              <MaterialCommunityIcons
                name="bank-outline"
                size={40}
                color="#001a4d"
              />
              <Animated.View
                style={[styles.dot, { opacity: dotOpacity }]}
              />
            </View>
            <Text style={styles.connectionText}>
              {"ESTABLISHING SECURE\nCONNECTION"}
            </Text>
          </Animated.View>

        </View>

        {/* ── Bottom Section ── */}
        <Animated.View
          style={[styles.bottom, { opacity: fadeBottom }]}
        >
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          {/* Version label */}
          <View style={styles.versionRow}>
            <View style={styles.versionDot} />
            <Text style={styles.versionText}>
              DIGITAL ARCHIVIST V2.4
            </Text>
            <View style={styles.versionDot} />
          </View>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8ede8",
  },

  // ── Backgrounds ──
  bgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.65,
    backgroundColor: "#e8ede8",
  },
  bgBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: "#dce3dc",
  },

  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },

  // ── Logo ──
  logoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },

  // ── Official row ──
  officialRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  line: {
    width: 40,
    height: 1,
    backgroundColor: "#c4a257",
  },
  officialText: {
    fontSize: 11,
    color: "#775a19",
    letterSpacing: 4,
    marginHorizontal: 16,
    fontFamily: "Manrope_600SemiBold",
  },

  // ── Title ──
  titleContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 48,
    lineHeight: 58,
    color: "#001a4d",
    textAlign: "center",
    fontFamily: "Newsreader_400Regular",
  },

  // ── University ──
  universityText: {
    fontSize: 11,
    letterSpacing: 3,
    color: "#5c420f",
    textAlign: "center",
    marginBottom: 40,
    fontFamily: "Manrope_600SemiBold",
  },

  // ── Connection card ──
  connectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrapper: {
    position: "relative",
    marginBottom: 20,
  },
  dot: {
    position: "absolute",
    top: 0,
    right: -10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c4a257",
  },
  connectionText: {
    fontSize: 13,
    letterSpacing: 3,
    color: "#001a4d",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Manrope_700Bold",
  },

  // ── Bottom ──
  bottom: {
    paddingHorizontal: 48,
    paddingBottom: 48,
    gap: 12,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "#dce3dc",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#c4a257",
    borderRadius: 1,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  versionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#c4a257",
    marginHorizontal: 8,
  },
  versionText: {
    fontSize: 10,
    letterSpacing: 3,
    color: "#775a19",
    fontFamily: "Manrope_600SemiBold",
  },
});