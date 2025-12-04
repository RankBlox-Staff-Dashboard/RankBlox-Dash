import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenFlatList } from "@/components/ScreenFlatList";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useData } from "@/context/DataContext";
import { StaffMember } from "@/context/AuthContext";
import { ManagementStackParamList } from "@/navigation/ManagementStackNavigator";
import { StaffAvatar } from "@/components/StaffAvatar";

export default function StaffDirectoryScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ManagementStackParamList>>();
  const { staffMembers } = useData();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStaff = searchQuery
    ? staffMembers.filter((staff) =>
        staff.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : staffMembers;

  const formatLastActive = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Active today";
    if (days === 1) return "Active yesterday";
    if (days < 7) return `Active ${days} days ago`;
    return `Active ${date.toLocaleDateString()}`;
  };

  const renderItem = ({ item }: { item: StaffMember }) => (
    <Pressable
      onPress={() => navigation.navigate("EditStaff", { staffId: item.id })}
      style={({ pressed }) => [
        styles.staffCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <StaffAvatar index={item.avatarIndex} size={48} />
      <View style={styles.staffInfo}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {item.name}
        </ThemedText>
        <View style={styles.staffMeta}>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  item.role === "management"
                    ? (isDark ? Colors.dark.secondary : Colors.light.secondary) + "20"
                    : (isDark ? Colors.dark.primary : Colors.light.primary) + "20",
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color:
                  item.role === "management"
                    ? isDark
                      ? Colors.dark.secondary
                      : Colors.light.secondary
                    : isDark
                    ? Colors.dark.primary
                    : Colors.light.primary,
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              {item.role === "management" ? "Management" : "Staff"}
            </ThemedText>
          </View>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: item.isActive
                  ? isDark
                    ? Colors.dark.success
                    : Colors.light.success
                  : theme.textSecondary,
              },
            ]}
          />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {item.isActive ? "Active" : "Inactive"}
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {formatLastActive(item.lastActive)}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
      >
        <Feather name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search staff..."
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
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="users" size={64} color={theme.textSecondary} />
      <ThemedText type="h4" style={styles.emptyTitle}>
        {searchQuery ? "No staff found" : "No staff members"}
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
        {searchQuery
          ? "Try a different search term"
          : "Add your first staff member to get started"}
      </ThemedText>
    </View>
  );

  return (
    <ScreenFlatList
      data={filteredStaff}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
  },
  searchContainer: {
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
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  staffInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  staffMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
});
