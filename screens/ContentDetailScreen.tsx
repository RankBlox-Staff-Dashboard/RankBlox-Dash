import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useData } from "@/context/DataContext";
import { PublicStackParamList } from "@/navigation/PublicStackNavigator";

type RouteParams = RouteProp<PublicStackParamList, "ContentDetail">;

export default function ContentDetailScreen() {
  const { theme, isDark } = useTheme();
  const route = useRoute<RouteParams>();
  const { contentItems } = useData();
  const { contentId } = route.params;

  const content = contentItems.find((item) => item.id === contentId);

  if (!content) {
    return (
      <ScreenScrollView>
        <View style={styles.emptyState}>
          <Feather name="file-minus" size={64} color={theme.textSecondary} />
          <ThemedText type="h4" style={styles.emptyTitle}>
            Content not found
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View
        style={[
          styles.categoryBadge,
          { backgroundColor: isDark ? Colors.dark.primary + "20" : Colors.light.primary + "15" },
        ]}
      >
        <ThemedText
          type="small"
          style={{ color: isDark ? Colors.dark.primary : Colors.light.primary, fontWeight: "600" }}
        >
          {content.category}
        </ThemedText>
      </View>

      <ThemedText type="h1" style={styles.title}>
        {content.title}
      </ThemedText>

      <View style={styles.metaRow}>
        <Feather name="user" size={14} color={theme.textSecondary} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {content.authorName}
        </ThemedText>
        <View style={styles.metaDivider} />
        <Feather name="calendar" size={14} color={theme.textSecondary} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {new Date(content.updatedAt).toLocaleDateString()}
        </ThemedText>
      </View>

      <View style={[styles.contentBody, { borderColor: theme.border }]}>
        <ThemedText type="body" style={styles.description}>
          {content.description}
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.md,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: Spacing.xs,
  },
  contentBody: {
    borderTopWidth: 1,
    paddingTop: Spacing.xl,
  },
  description: {
    lineHeight: 26,
  },
});
