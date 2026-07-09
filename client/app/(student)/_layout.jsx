import { Stack } from "expo-router";

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="profile"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="(scan)/scan-qr"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="(scan)/face-verify"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="(scan)/location-verify"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen name="(scan)/success" options={{ animation: "fade" }} />
      <Stack.Screen
        name="(profile)/face-register"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="(profile)/edit-profile"
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="(profile)/change-password"
        options={{ animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
