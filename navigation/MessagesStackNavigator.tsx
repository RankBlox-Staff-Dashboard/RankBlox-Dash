import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import MessagesScreen from "@/screens/MessagesScreen";
import ConversationScreen from "@/screens/ConversationScreen";
import NewMessageScreen from "@/screens/NewMessageScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Colors, Spacing } from "@/constants/theme";

export type MessagesStackParamList = {
  Messages: undefined;
  Conversation: { recipientId: string; recipientName: string };
  NewMessage: undefined;
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

function NewMessageButton() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MessagesStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate("NewMessage")}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        paddingHorizontal: Spacing.sm,
      })}
    >
      <Feather
        name="plus"
        size={24}
        color={isDark ? Colors.dark.primary : Colors.light.primary}
      />
    </Pressable>
  );
}

export default function MessagesStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: "Staff Messages",
          headerRight: () => <NewMessageButton />,
        }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }) => ({
          title: route.params.recipientName,
          headerTransparent: false,
          headerStyle: {
            backgroundColor: theme.backgroundRoot,
          },
        })}
      />
      <Stack.Screen
        name="NewMessage"
        component={NewMessageScreen}
        options={{
          title: "New Message",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
