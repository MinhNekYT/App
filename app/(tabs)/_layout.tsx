import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#43C6E8",
        tabBarInactiveTintColor: "#A7B4CC",
        tabBarStyle: {
          backgroundColor: "#0E1A30",
          borderTopColor: "#233758",
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "VM Instances",
          tabBarIcon: ({ color }) => (
            <Feather color={color} name="server" size={21} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Feather color={color} name="settings" size={21} />
          ),
        }}
      />
    </Tabs>
  );
}
