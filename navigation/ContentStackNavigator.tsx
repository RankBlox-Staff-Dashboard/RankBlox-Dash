import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ContentScreen from "@/screens/ContentScreen";
import CreateContentScreen from "@/screens/CreateContentScreen";
import EditContentScreen from "@/screens/EditContentScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ContentStackParamList = {
  ContentList: undefined;
  CreateContent: undefined;
  EditContent: { contentId: string };
};

const Stack = createNativeStackNavigator<ContentStackParamList>();

export default function ContentStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="ContentList"
        component={ContentScreen}
        options={{
          title: "Manage Content",
        }}
      />
      <Stack.Screen
        name="CreateContent"
        component={CreateContentScreen}
        options={{
          title: "Create Content",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="EditContent"
        component={EditContentScreen}
        options={{
          title: "Edit Content",
        }}
      />
    </Stack.Navigator>
  );
}
