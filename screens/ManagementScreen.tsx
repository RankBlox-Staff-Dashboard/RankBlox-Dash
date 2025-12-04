import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useData } from "@/context/DataContext";
import { ManagementStackParamList } from "@/navigation/ManagementStackNavigator";

type MenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: number;
};

function MenuItem({ icon, title, subtitle, onPress, badge }: MenuItemProps) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: isDark ? Colors.dark.secondary + "20" : Colors.light.secondary + "15" },
        ]}
      >
        <Feather
          name={icon}
          size={22}
          color={isDark ? Colors.dark.secondary : Colors.light.secondary}
        />
      </View>
      <View style={styles.menuContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {subtitle}
        </ThemedText>
      </View>
      <View style={styles.menuRight}>
        {badge !== undefined && badge > 0 ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: isDark ? Colors.dark.secondary : Colors.light.secondary },
            ]}
          >
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 12 }}>
              {badge}
            </ThemedText>
          </View>
        ) : null}
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

export default function ManagementScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ManagementStackParamList>>();
  const { staffMembers } = useData();

  const activeStaffCount = staffMembers.filter((s) => s.isActive).length;

  return (
    <ScreenScrollView>
      <View style={styles.header}>
        <ThemedText type="h3">Management Tools</ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          Manage staff members and permissions
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText
            type="h2"
            style={{ color: isDark ? Colors.dark.secondary : Colors.light.secondary }}
          >
            {activeStaffCount}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Active Staff
          </ThemedText>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText
            type="h2"
            style={{ color: isDark ? Colors.dark.success : Colors.light.success }}
          >
            {staffMembers.filter((s) => s.role === "management").length}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Managers
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Staff Management
        </ThemedText>
        <MenuItem
          icon="users"
          title="Staff Directory"
          subtitle="View and manage all staff members"
          onPress={() => navigation.navigate("StaffDirectory")}
          badge={activeStaffCount}
        />
        <MenuItem
          icon="user-plus"
          title="Add Staff Member"
          subtitle="Create a new staff account"
          onPress={() => navigation.navigate("AddStaff")}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Settings
        </ThemedText>
        <MenuItem
          icon="shield"
          title="Permissions"
          subtitle="Manage staff access levels"
          onPress={() => navigation.navigate("StaffDirectory")}
        />
        <MenuItem
          icon="activity"
          title="Activity Log"
          subtitle="View recent staff activity"
          onPress={() => {}}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
});
