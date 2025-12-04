import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import StaffDashboardScreen from "@/screens/StaffDashboardScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Spacing } from "@/constants/theme";

export type DashboardStackParamList = {
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

function NotificationButton() {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {}}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        paddingHorizontal: Spacing.sm,
      })}
    >
      <Feather name="bell" size={22} color={theme.text} />
    </Pressable>
  );
}

export default function DashboardStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={StaffDashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Staff Hub" />,
          headerRight: () => <NotificationButton />,
        }}
      />
    </Stack.Navigator>
  );
}
