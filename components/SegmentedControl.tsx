import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SegmentedControl({
  options,
  selectedIndex,
  onSelect,
}: SegmentedControlProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
    >
      {options.map((option, index) => (
        <Pressable
          key={index}
          onPress={() => onSelect(index)}
          style={({ pressed }) => [
            styles.option,
            {
              backgroundColor:
                selectedIndex === index
                  ? isDark
                    ? Colors.dark.primary
                    : Colors.light.primary
                  : "transparent",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText
            type="body"
            style={{
              color: selectedIndex === index ? "#FFFFFF" : theme.text,
              fontWeight: selectedIndex === index ? "600" : "400",
              textAlign: "center",
            }}
          >
            {option}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs - 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
