import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useData, Category } from "@/context/DataContext";
import { PublicStackParamList } from "@/navigation/PublicStackNavigator";

type CategoryCardProps = {
  category: Category;
  onPress: () => void;
};

function CategoryCard({ category, onPress }: CategoryCardProps) {
  const { theme, isDark } = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={[styles.categoryIcon, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary + "15" }]}>
        <Feather
          name={category.icon as any}
          size={24}
          color={isDark ? Colors.dark.primary : Colors.light.primary}
        />
      </View>
      <View style={styles.categoryContent}>
        <ThemedText type="h4">{category.name}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function PublicHomeScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<PublicStackParamList>>();
  const { categories, contentItems, isLoading, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const publishedContent = contentItems.filter((item) => item.isPublished);
  const featuredContent = publishedContent.slice(0, 3);

  const filteredCategories = searchQuery
    ? categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate("CategoryDetail", { categoryName: category.name });
  };

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search information..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {featuredContent.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Featured
          </ThemedText>
          {featuredContent.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.featuredCard,
                {
                  backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => navigation.navigate("ContentDetail", { contentId: item.id })}
            >
              <ThemedText type="body" style={styles.featuredTitle}>
                {item.title}
              </ThemedText>
              <ThemedText type="small" style={styles.featuredCategory}>
                {item.category}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Categories
        </ThemedText>
        {filteredCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onPress={() => handleCategoryPress(category)}
          />
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: Spacing.xl,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    height: Spacing.inputHeight,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  categoryContent: {
    flex: 1,
  },
  featuredCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  featuredCategory: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: Spacing.xs,
  },
});
