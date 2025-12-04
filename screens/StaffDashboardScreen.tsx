import React, { useState } from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { StaffTabParamList } from "@/navigation/StaffTabNavigator";

type QuickActionProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  onPress: () => void;
  color?: string;
};

function QuickAction({ icon, title, onPress, color }: QuickActionProps) {
  const { theme, isDark } = useTheme();
  const actionColor = color || (isDark ? Colors.dark.primary : Colors.light.primary);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: actionColor + "15" }]}>
        <Feather name={icon} size={22} color={actionColor} />
      </View>
      <ThemedText type="small" style={styles.quickActionTitle}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

export default function StaffDashboardScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { conversations, contentItems, refreshData } = useData();
  const navigation = useNavigation<BottomTabNavigationProp<StaffTabParamList>>();
  const [refreshing, setRefreshing] = useState(false);

  const unreadMessages = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const draftCount = contentItems.filter((item) => !item.isPublished).length;
  const publishedCount = contentItems.filter((item) => item.isPublished).length;

  const recentUpdates = [...contentItems]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.welcomeSection}>
        <ThemedText type="h3">
          Welcome back, {user?.name?.split(" ")[0]}
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Here's what's happening today
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText type="h2" style={{ color: isDark ? Colors.dark.primary : Colors.light.primary }}>
            {unreadMessages}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Unread Messages
          </ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText type="h2" style={{ color: isDark ? Colors.dark.success : Colors.light.success }}>
            {publishedCount}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Published
          </ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText type="h2" style={{ color: isDark ? Colors.dark.secondary : Colors.light.secondary }}>
            {draftCount}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Drafts
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Quick Actions
        </ThemedText>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="message-circle"
            title="New Message"
            onPress={() => navigation.navigate("MessagesTab")}
          />
          <QuickAction
            icon="file-plus"
            title="Create Content"
            onPress={() => navigation.navigate("ContentTab")}
            color={isDark ? Colors.dark.secondary : Colors.light.secondary}
          />
          <QuickAction
            icon="folder"
            title="View Content"
            onPress={() => navigation.navigate("ContentTab")}
            color={isDark ? Colors.dark.success : Colors.light.success}
          />
          <QuickAction
            icon="user"
            title="My Profile"
            onPress={() => navigation.navigate("ProfileTab")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Recent Updates
        </ThemedText>
        {recentUpdates.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              No recent updates
            </ThemedText>
          </View>
        ) : (
          recentUpdates.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.updateCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
              onPress={() => navigation.navigate("ContentTab")}
            >
              <View style={styles.updateContent}>
                <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "500" }}>
                  {item.title}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {item.category} - {new Date(item.updatedAt).toLocaleDateString()}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.isPublished
                      ? (isDark ? Colors.dark.success : Colors.light.success) + "20"
                      : (isDark ? Colors.dark.secondary : Colors.light.secondary) + "20",
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: item.isPublished
                      ? (isDark ? Colors.dark.success : Colors.light.success)
                      : (isDark ? Colors.dark.secondary : Colors.light.secondary),
                    fontWeight: "600",
                  }}
                >
                  {item.isPublished ? "Published" : "Draft"}
                </ThemedText>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  welcomeSection: {
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickAction: {
    width: "48%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionTitle: {
    fontWeight: "500",
    textAlign: "center",
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  updateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  updateContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
});
