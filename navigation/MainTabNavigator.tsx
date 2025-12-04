import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import PublicStackNavigator from "@/navigation/PublicStackNavigator";
import StaffTabNavigator from "@/navigation/StaffTabNavigator";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  PublicStack: undefined;
  StaffTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainTabNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="StaffTabs" component={StaffTabNavigator} />
      ) : (
        <Stack.Screen name="PublicStack" component={PublicStackNavigator} />
      )}
    </Stack.Navigator>
  );
}
