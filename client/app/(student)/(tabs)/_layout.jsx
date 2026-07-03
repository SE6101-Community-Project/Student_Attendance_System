import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabIcon({ name, label, focused }) {
  return (
    <View style={styles.tabItem}>
      <MaterialCommunityIcons
        name={name}
        size={22}
        color={focused ? "#775a19" : "#757682"}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? "#775a19" : "#757682" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function StudentTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 66 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ],
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "view-dashboard" : "view-dashboard-outline"}
              label="Dashboard"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="attendance"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "calendar-check" : "calendar-check-outline"}
              label="Attendance"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "bell" : "bell-outline"}
              label="Alerts"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "cog" : "cog-outline"}
              label="Settings"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: "#00113a",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: 75,
  },
  tabLabel: {
    textAlign: "center",
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});