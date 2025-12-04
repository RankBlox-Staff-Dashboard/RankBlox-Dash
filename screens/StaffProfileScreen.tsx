import React from "react";
import { View, StyleSheet, Pressable, Alert, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { StaffAvatar } from "@/components/StaffAvatar";

type SettingItemProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
};

function SettingItem({ icon, title, subtitle, onPress, rightElement, destructive }: SettingItemProps) {
  const { theme, isDark } = useTheme();
  const iconColor = destructive
    ? isDark
      ? Colors.dark.destructive
      : Colors.light.destructive
    : theme.textSecondary;
  const textColor = destructive
    ? isDark
      ? Colors.dark.destructive
      : Colors.light.destructive
    : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingItem,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: pressed && onPress ? 0.6 : 1,
        },
      ]}
    >
      <Feather name={icon} size={20} color={iconColor} />
      <View style={styles.settingContent}>
        <ThemedText type="body" style={{ color: textColor }}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export default function StaffProfileScreen() {
  const { theme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "PublicStack" }],
              })
            );
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = () => {
    if (user?.role === "management") {
      return isDark ? Colors.dark.secondary : Colors.light.secondary;
    }
    return isDark ? Colors.dark.primary : Colors.light.primary;
  };

  return (
    <ScreenScrollView>
      <View style={styles.profileHeader}>
        <StaffAvatar index={user?.avatarIndex ?? 0} size={80} />
        <ThemedText type="h3" style={styles.profileName}>
          {user?.name}
        </ThemedText>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: getRoleBadgeColor() + "20" },
          ]}
        >
          <ThemedText
            type="small"
            style={{
              color: getRoleBadgeColor(),
              fontWeight: "600",
            }}
          >
            {user?.role === "management" ? "Management" : "Staff"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Permissions
        </ThemedText>
        <View style={[styles.permissionsCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <View style={styles.permissionRow}>
            <ThemedText type="body">View Restricted Data</ThemedText>
            <Feather
              name={user?.permissions.viewRestrictedData ? "check-circle" : "x-circle"}
              size={20}
              color={
                user?.permissions.viewRestrictedData
                  ? isDark
                    ? Colors.dark.success
                    : Colors.light.success
                  : theme.textSecondary
              }
            />
          </View>
          <View style={styles.permissionRow}>
            <ThemedText type="body">Edit Content</ThemedText>
            <Feather
              name={user?.permissions.editContent ? "check-circle" : "x-circle"}
              size={20}
              color={
                user?.permissions.editContent
                  ? isDark
                    ? Colors.dark.success
                    : Colors.light.success
                  : theme.textSecondary
              }
            />
          </View>
          <View style={styles.permissionRow}>
            <ThemedText type="body">Send Messages</ThemedText>
            <Feather
              name={user?.permissions.sendMessages ? "check-circle" : "x-circle"}
              size={20}
              color={
                user?.permissions.sendMessages
                  ? isDark
                    ? Colors.dark.success
                    : Colors.light.success
                  : theme.textSecondary
              }
            />
          </View>
          <View style={[styles.permissionRow, { borderBottomWidth: 0 }]}>
            <ThemedText type="body">Manage Staff</ThemedText>
            <Feather
              name={user?.permissions.manageStaff ? "check-circle" : "x-circle"}
              size={20}
              color={
                user?.permissions.manageStaff
                  ? isDark
                    ? Colors.dark.success
                    : Colors.light.success
                  : theme.textSecondary
              }
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Account
        </ThemedText>
        <SettingItem
          icon="lock"
          title="Change PIN"
          subtitle="Contact management to reset your PIN"
        />
        <SettingItem
          icon="bell"
          title="Notifications"
          subtitle="Manage notification preferences"
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Actions
        </ThemedText>
        <SettingItem
          icon="log-out"
          title="Logout"
          onPress={handleLogout}
          destructive
        />
      </View>

      <View style={styles.footer}>
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
          Staff Hub v1.0.0
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  profileName: {
    marginTop: Spacing.md,
  },
  roleBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  permissionsCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  footer: {
    paddingVertical: Spacing.xl,
  },
});
