import { ScrollView, ScrollViewProps, StyleSheet, Platform, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing } from "@/constants/theme";

const MAX_CONTENT_WIDTH = 800;

export function ScreenScrollView({
  children,
  contentContainerStyle,
  style,
  ...scrollViewProps
}: ScrollViewProps) {
  const { theme } = useTheme();
  const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();

  const content = (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot },
        style,
      ]}
      contentContainerStyle={[
        {
          paddingTop,
          paddingBottom,
        },
        styles.contentContainer,
        Platform.OS === "web" && styles.webContentContainer,
        contentContainerStyle,
      ]}
      scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
      {...scrollViewProps}
    >
      {Platform.OS === "web" ? (
        <View style={styles.webInnerContainer}>{children}</View>
      ) : (
        children
      )}
    </ScrollView>
  );

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
  },
  webContentContainer: {
    alignItems: "center",
  },
  webInnerContainer: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
  },
});
