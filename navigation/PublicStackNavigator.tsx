import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";

import PublicHomeScreen from "@/screens/PublicHomeScreen";
import CategoryDetailScreen from "@/screens/CategoryDetailScreen";
import ContentDetailScreen from "@/screens/ContentDetailScreen";
import PinLoginScreen from "@/screens/PinLoginScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Colors, Spacing } from "@/constants/theme";

export type PublicStackParamList = {
  PublicHome: undefined;
  CategoryDetail: { categoryName: string };
  ContentDetail: { contentId: string };
  PinLogin: undefined;
};

const Stack = createNativeStackNavigator<PublicStackParamList>();

function LoginButton() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => navigation.dispatch(CommonActions.navigate("PinLogin"))}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        paddingHorizontal: Spacing.sm,
      })}
    >
      <Feather
        name="log-in"
        size={22}
        color={isDark ? Colors.dark.primary : Colors.light.primary}
      />
    </Pressable>
  );
}

export default function PublicStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="PublicHome"
        component={PublicHomeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Staff Hub" />,
          headerRight: () => <LoginButton />,
        }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={({ route }) => ({
          title: route.params.categoryName,
        })}
      />
      <Stack.Screen
        name="ContentDetail"
        component={ContentDetailScreen}
        options={{
          title: "Details",
        }}
      />
      <Stack.Screen
        name="PinLogin"
        component={PinLoginScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
    </Stack.Navigator>
  );
}
