import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface StaffAvatarProps {
  index: number;
  size?: number;
}

const AVATAR_COLORS = [
  { bg: "#2563EB20", fg: "#2563EB" },
  { bg: "#7C3AED20", fg: "#7C3AED" },
  { bg: "#10B98120", fg: "#10B981" },
  { bg: "#F59E0B20", fg: "#F59E0B" },
  { bg: "#EF444420", fg: "#EF4444" },
  { bg: "#06B6D420", fg: "#06B6D4" },
];

const AVATAR_ICONS: (keyof typeof Feather.glyphMap)[] = [
  "user",
  "star",
  "heart",
  "award",
  "zap",
  "coffee",
];

export function StaffAvatar({ index, size = 40 }: StaffAvatarProps) {
  const { isDark } = useTheme();
  const colorIndex = index % AVATAR_COLORS.length;
  const iconIndex = index % AVATAR_ICONS.length;
  const colors = AVATAR_COLORS[colorIndex];
  const icon = AVATAR_ICONS[iconIndex];

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <Feather
        name={icon}
        size={size * 0.5}
        color={colors.fg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
