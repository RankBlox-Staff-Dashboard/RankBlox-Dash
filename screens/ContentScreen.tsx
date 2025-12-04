import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ScreenFlatList } from "@/components/ScreenFlatList";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useData, ContentItem } from "@/context/DataContext";
import { ContentStackParamList } from "@/navigation/ContentStackNavigator";
import { SegmentedControl } from "@/components/SegmentedControl";

export default function ContentScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ContentStackParamList>>();
  const { user } = useAuth();
  const { contentItems, deleteContentItem, publishContentItem } = useData();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState(0);

  const canEditContent = user?.permissions.editContent ?? false;
  const publishedItems = contentItems.filter((item) => item.isPublished);
  const draftItems = contentItems.filter((item) => !item.isPublished);
  const displayItems = selectedTab === 0 ? publishedItems : draftItems;

  const handleDelete = (item: ContentItem) => {
    Alert.alert(
      "Delete Content",
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteContentItem(item.id),
        },
      ]
    );
  };

  const handlePublish = (item: ContentItem) => {
    Alert.alert(
      "Publish Content",
      `Are you sure you want to publish "${item.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: () => publishContentItem(item.id),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ContentItem }) => (
    <Pressable
      style={({ pressed }) => [
        styles.contentCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={() => navigation.navigate("EditContent", { contentId: item.id })}
    >
      <View style={styles.contentHeader}>
        <View style={styles.contentInfo}>
          <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: isDark ? Colors.dark.primary + "20" : Colors.light.primary + "15" },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: isDark ? Colors.dark.primary : Colors.light.primary,
                fontWeight: "500",
                fontSize: 12,
              }}
            >
              {item.category}
            </ThemedText>
          </View>
        </View>
      </View>
      <ThemedText
        type="small"
        style={{ color: theme.textSecondary }}
        numberOfLines={2}
      >
        {item.description}
      </ThemedText>
      <View style={styles.contentFooter}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Updated {new Date(item.updatedAt).toLocaleDateString()}
        </ThemedText>
        <View style={styles.actionButtons}>
          {!item.isPublished && canEditContent && (
            <Pressable
              onPress={() => handlePublish(item)}
              style={({ pressed }) => [
                styles.actionButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather
                name="upload"
                size={18}
                color={isDark ? Colors.dark.success : Colors.light.success}
              />
            </Pressable>
          )}
          {canEditContent && (
            <Pressable
              onPress={() => navigation.navigate("EditContent", { contentId: item.id })}
              style={({ pressed }) => [
                styles.actionButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather name="edit-2" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
          {canEditContent && (
            <Pressable
              onPress={() => handleDelete(item)}
              style={({ pressed }) => [
                styles.actionButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather
                name="trash-2"
                size={18}
                color={isDark ? Colors.dark.destructive : Colors.light.destructive}
              />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="file-text" size={64} color={theme.textSecondary} />
      <ThemedText type="h4" style={styles.emptyTitle}>
        {selectedTab === 0 ? "No published content" : "No drafts"}
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
        {selectedTab === 0
          ? "Published content will appear here"
          : "Create new content to get started"}
      </ThemedText>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <SegmentedControl
        options={[`Published (${publishedItems.length})`, `Drafts (${draftItems.length})`]}
        selectedIndex={selectedTab}
        onSelect={setSelectedTab}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScreenFlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />
      {canEditContent && (
        <Pressable
          onPress={() => navigation.navigate("CreateContent")}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
              bottom: tabBarHeight + Spacing.xl,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  contentCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  contentInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  contentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
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
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
});
