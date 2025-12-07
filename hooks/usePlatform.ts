import { Platform, Dimensions } from "react-native";

export function usePlatform() {
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const isMobile = isIOS || isAndroid;

  const { width } = Dimensions.get("window");
  const isSmallScreen = width < 768;
  const isMediumScreen = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;

  return {
    isWeb,
    isIOS,
    isAndroid,
    isMobile,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    screenWidth: width,
  };
}

// Web-specific style helpers
export const webStyles = {
  cursor: (type: "pointer" | "default" | "text" = "pointer") =>
    Platform.OS === "web" ? { cursor: type } : {},
  userSelect: (value: "none" | "text" | "auto" = "none") =>
    Platform.OS === "web" ? { userSelect: value } : {},
  outline: (value: string = "none") =>
    Platform.OS === "web" ? { outlineStyle: value } : {},
  transition: (value: string = "all 0.2s ease") =>
    Platform.OS === "web" ? { transition: value } : {},
};
