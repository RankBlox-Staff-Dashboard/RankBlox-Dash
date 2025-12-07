import React from "react";
import { View, StyleSheet, Platform, useWindowDimensions } from "react-native";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: any;
}

/**
 * A container that constrains content width on larger screens (web/tablet)
 * and centers it horizontally for better readability
 */
export function ResponsiveContainer({
  children,
  maxWidth = 800,
  style,
}: ResponsiveContainerProps) {
  const { width } = useWindowDimensions();

  // Only apply max-width constraints on web or larger screens
  const shouldConstrain = Platform.OS === "web" || width > 768;

  if (!shouldConstrain) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  return (
    <View style={[styles.outerContainer, style]}>
      <View style={[styles.innerContainer, { maxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
    alignItems: "center",
  },
  innerContainer: {
    flex: 1,
    width: "100%",
  },
});
