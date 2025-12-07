import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Web-safe haptics hook that gracefully degrades on web platform
 */
export function useHaptics() {
  const isWeb = Platform.OS === "web";

  const impact = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (!isWeb) {
      await Haptics.impactAsync(style);
    }
  };

  const notification = async (type: Haptics.NotificationFeedbackType) => {
    if (!isWeb) {
      await Haptics.notificationAsync(type);
    }
  };

  const selection = async () => {
    if (!isWeb) {
      await Haptics.selectionAsync();
    }
  };

  return {
    impact,
    notification,
    selection,
    ImpactFeedbackStyle: Haptics.ImpactFeedbackStyle,
    NotificationFeedbackType: Haptics.NotificationFeedbackType,
  };
}
