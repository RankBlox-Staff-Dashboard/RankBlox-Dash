import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";

import DashboardStackNavigator from "@/navigation/DashboardStackNavigator";
import MessagesStackNavigator from "@/navigation/MessagesStackNavigator";
import ContentStackNavigator from "@/navigation/ContentStackNavigator";
import ManagementStackNavigator from "@/navigation/ManagementStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Colors } from "@/constants/theme";

export type StaffTabParamList = {
  HomeTab: undefined;
  MessagesTab: undefined;
  ContentTab: undefined;
  ManagementTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<StaffTabParamList>();

export default function StaffTabNavigator() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { conversations } = useData();

  const isManagement = user?.role === "management";
  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: isDark ? Colors.dark.primary : Colors.light.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: Platform.OS === "web" ? "relative" : "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
            web: theme.backgroundDefault,
            default: theme.backgroundRoot,
          }),
          borderTopWidth: Platform.OS === "web" ? 1 : 0,
          borderTopColor: theme.border,
          elevation: 0,
          ...(Platform.OS === "web" && {
            boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
          }),
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
          },
        }}
      />
      <Tab.Screen
        name="ContentTab"
        component={ContentStackNavigator}
        options={{
          title: "Content",
          tabBarIcon: ({ color, size }) => (
            <Feather name="file-text" size={size} color={color} />
          ),
        }}
      />
      {isManagement && (
        <Tab.Screen
          name="ManagementTab"
          component={ManagementStackNavigator}
          options={{
            title: "Manage",
            tabBarIcon: ({ color, size }) => (
              <Feather name="shield" size={size} color={color} />
            ),
            tabBarActiveTintColor: isDark ? Colors.dark.secondary : Colors.light.secondary,
          }}
        />
      )}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
