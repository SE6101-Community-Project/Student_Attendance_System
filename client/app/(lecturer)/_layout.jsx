import { Stack } from 'expo-router';

export default function LecturerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="profile"
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="sessions"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="course-detail"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="session-detail"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="student-details"  
        options={{ 
          animation: 'slide_from_right' 
        }} 
      />
      <Stack.Screen 
        name="lecturer-details" 
        options={{ 
          animation: 'slide_from_right' 
        }} 
      />
    </Stack>
  );
}