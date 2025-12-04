import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useData } from "@/context/DataContext";
import { PublicStackParamList } from "@/navigation/PublicStackNavigator";

type RouteParams = RouteProp<PublicStackParamList, "CategoryDetail">;

export default function CategoryDetailScreen() {
  const { theme } = useTheme();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NativeStackNavigationProp<PublicStackParamList>>();
  const { contentItems } = useData();
  const { categoryName } = route.params;

  const categoryItems = contentItems.filter(
    (item) => item.category === categoryName && item.isPublished
  );

  return (
    <ScreenScrollView>
      {categoryItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="folder" size={64} color={theme.textSecondary} />
          <ThemedText type="h4" style={styles.emptyTitle}>
            No content yet
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            There are no published items in this category.
          </ThemedText>
        </View>
      ) : (
        categoryItems.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.contentCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            onPress={() => navigation.navigate("ContentDetail", { contentId: item.id })}
          >
            <View style={styles.contentHeader}>
              <ThemedText type="h4">{item.title}</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary }}
              numberOfLines={2}
            >
              {item.description}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Updated {new Date(item.updatedAt).toLocaleDateString()}
            </ThemedText>
          </Pressable>
        ))
      )}
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
  contentCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
});
