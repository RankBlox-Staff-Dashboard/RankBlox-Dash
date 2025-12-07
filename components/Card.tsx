import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, View, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CardProps {
  children?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevation?: number;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ children, onPress, style, elevation = 1 }: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const getBackgroundColor = () => {
    switch (elevation) {
      case 0:
        return theme.backgroundRoot;
      case 2:
        return theme.backgroundSecondary;
      case 3:
        return theme.backgroundTertiary;
      default:
        return theme.backgroundDefault;
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  if (!onPress) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: theme.border,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        styles.pressableCard,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: theme.border,
        },
        style,
        animatedStyle,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    ...Platform.select({
      web: {
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      },
      default: {},
    }),
  },
  pressableCard: {
    ...Platform.select({
      web: {
        cursor: "pointer",
      },
      default: {},
    }),
  },
});
