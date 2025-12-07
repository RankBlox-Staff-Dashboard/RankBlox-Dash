import React from "react";
import { FlatList, FlatListProps, StyleSheet, Platform, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing } from "@/constants/theme";

const MAX_CONTENT_WIDTH = 800;

export function ScreenFlatList<T>({
  contentContainerStyle,
  style,
  renderItem,
  ...flatListProps
}: FlatListProps<T>) {
  const { theme } = useTheme();
  const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();

  // Wrap renderItem for web to add max-width container
  const wrappedRenderItem = Platform.OS === "web" && renderItem
    ? (props: any) => (
        <View style={styles.webItemContainer}>
          {renderItem(props)}
        </View>
      )
    : renderItem;

  return (
    <FlatList
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
      renderItem={wrappedRenderItem}
      {...flatListProps}
    />
  );
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
  webItemContainer: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
  },
});
