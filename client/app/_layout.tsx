// app/_layout.jsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/src/context/AuthContext";
import { useCustomFonts } from "@/src/constants/fonts";
import "../global.css";

// Keep native splash visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsLoaded = useCustomFonts();

  useEffect(() => {
    if (fontsLoaded) {
      // Hide native splash — our custom splash in index.jsx
      // takes over from here with its own animation
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Render nothing until fonts are ready
  // Native splash stays visible during this time
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(lecturer)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}