import { useContext } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

import { Spacing } from "@/constants/theme";

// Default heights when not in proper navigator context
const DEFAULT_TAB_BAR_HEIGHT = 49;
const DEFAULT_HEADER_HEIGHT = 44;

/**
 * Safe hook to get bottom tab bar height that doesn't throw when outside tab navigator
 */
function useSafeBottomTabBarHeight(): number {
  const height = useContext(BottomTabBarHeightContext);
  // Returns undefined if not in tab navigator context
  return height ?? 0;
}

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useSafeBottomTabBarHeight();

  // Determine if we're inside a tab navigator
  const isInTabNavigator = tabBarHeight > 0;

  // Calculate effective heights with sensible fallbacks
  const effectiveHeaderHeight = headerHeight || (Platform.OS === "web" ? DEFAULT_HEADER_HEIGHT : insets.top + DEFAULT_HEADER_HEIGHT);
  
  // If not in tab navigator, just use safe area bottom inset
  const effectiveTabBarHeight = isInTabNavigator 
    ? tabBarHeight 
    : (Platform.OS === "web" ? Spacing.xl : insets.bottom + Spacing.xl);

  return {
    paddingTop: effectiveHeaderHeight + Spacing.xl,
    paddingBottom: effectiveTabBarHeight + Spacing.xl,
    scrollInsetBottom: insets.bottom + 16,
  };
}
