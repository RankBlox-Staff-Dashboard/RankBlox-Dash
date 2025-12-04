import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import ManagementScreen from "@/screens/ManagementScreen";
import StaffDirectoryScreen from "@/screens/StaffDirectoryScreen";
import AddStaffScreen from "@/screens/AddStaffScreen";
import EditStaffScreen from "@/screens/EditStaffScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Colors, Spacing } from "@/constants/theme";

export type ManagementStackParamList = {
  ManagementHome: undefined;
  StaffDirectory: undefined;
  AddStaff: undefined;
  EditStaff: { staffId: string };
};

const Stack = createNativeStackNavigator<ManagementStackParamList>();

function AddStaffButton() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ManagementStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate("AddStaff")}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        paddingHorizontal: Spacing.sm,
      })}
    >
      <Feather
        name="user-plus"
        size={22}
        color={isDark ? Colors.dark.secondary : Colors.light.secondary}
      />
    </Pressable>
  );
}

export default function ManagementStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="ManagementHome"
        component={ManagementScreen}
        options={{
          title: "Management",
        }}
      />
      <Stack.Screen
        name="StaffDirectory"
        component={StaffDirectoryScreen}
        options={{
          title: "Staff Directory",
          headerRight: () => <AddStaffButton />,
        }}
      />
      <Stack.Screen
        name="AddStaff"
        component={AddStaffScreen}
        options={{
          title: "Add Staff Member",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="EditStaff"
        component={EditStaffScreen}
        options={{
          title: "Edit Staff",
        }}
      />
    </Stack.Navigator>
  );
}
