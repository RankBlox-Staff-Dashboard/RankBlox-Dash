import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useData } from "@/context/DataContext";
import { StaffPermissions, UserRole } from "@/context/AuthContext";
import { ManagementStackParamList } from "@/navigation/ManagementStackNavigator";
import { StaffAvatar } from "@/components/StaffAvatar";

type RouteParams = RouteProp<ManagementStackParamList, "EditStaff">;

export default function EditStaffScreen() {
  const { theme, isDark } = useTheme();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { staffMembers, updateStaffMember, removeStaffMember, resetStaffPin } = useData();
  const { staffId } = route.params;

  const staff = staffMembers.find((s) => s.id === staffId);

  const [name, setName] = useState(staff?.name ?? "");
  const [role, setRole] = useState<UserRole>(staff?.role ?? "staff");
  const [permissions, setPermissions] = useState<StaffPermissions>(
    staff?.permissions ?? {
      viewRestrictedData: true,
      editContent: true,
      sendMessages: true,
      manageStaff: false,
    }
  );
  const [newPin, setNewPin] = useState<string | null>(null);

  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setRole(staff.role);
      setPermissions(staff.permissions);
    }
  }, [staff]);

  if (!staff) {
    return (
      <ScreenKeyboardAwareScrollView>
        <View style={styles.emptyState}>
          <Feather name="user-x" size={64} color={theme.textSecondary} />
          <ThemedText type="h4">Staff member not found</ThemedText>
        </View>
      </ScreenKeyboardAwareScrollView>
    );
  }

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === "management") {
      setPermissions({
        ...permissions,
        manageStaff: true,
      });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }

    await updateStaffMember(staffId, {
      name: name.trim(),
      role: role as "staff" | "management",
      permissions,
    });
    navigation.goBack();
  };

  const handleResetPin = () => {
    Alert.alert(
      "Reset PIN",
      `Are you sure you want to reset the PIN for ${staff.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            const pin = await resetStaffPin(staffId);
            setNewPin(pin);
          },
        },
      ]
    );
  };

  const handleRemove = () => {
    Alert.alert(
      "Remove Staff Member",
      `Are you sure you want to remove ${staff.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Removal",
              "This is your final confirmation. Are you absolutely sure?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Remove",
                  style: "destructive",
                  onPress: async () => {
                    await removeStaffMember(staffId);
                    navigation.goBack();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (newPin) {
    return (
      <ScreenKeyboardAwareScrollView>
        <View style={styles.successContainer}>
          <View
            style={[
              styles.successIcon,
              { backgroundColor: isDark ? Colors.dark.success + "20" : Colors.light.success + "15" },
            ]}
          >
            <Feather
              name="check-circle"
              size={64}
              color={isDark ? Colors.dark.success : Colors.light.success}
            />
          </View>
          <ThemedText type="h3" style={styles.successTitle}>
            PIN Reset
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Share this new PIN code with {name}.
          </ThemedText>

          <View
            style={[
              styles.pinDisplay,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <ThemedText type="h1" style={styles.pinText}>
              {newPin}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              New PIN Code
            </ThemedText>
          </View>

          <Pressable
            onPress={() => setNewPin(null)}
            style={({ pressed }) => [
              styles.doneButton,
              {
                backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Done
            </ThemedText>
          </Pressable>
        </View>
      </ScreenKeyboardAwareScrollView>
    );
  }

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.profileHeader}>
        <StaffAvatar index={staff.avatarIndex} size={80} />
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Name
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Enter staff member name..."
          placeholderTextColor={theme.textSecondary}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Role
        </ThemedText>
        <View style={styles.roleOptions}>
          <Pressable
            onPress={() => handleRoleChange("staff")}
            style={({ pressed }) => [
              styles.roleOption,
              {
                backgroundColor:
                  role === "staff"
                    ? isDark
                      ? Colors.dark.primary
                      : Colors.light.primary
                    : theme.backgroundDefault,
                borderColor:
                  role === "staff"
                    ? isDark
                      ? Colors.dark.primary
                      : Colors.light.primary
                    : theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather
              name="user"
              size={20}
              color={role === "staff" ? "#FFFFFF" : theme.text}
            />
            <ThemedText
              type="body"
              style={{
                color: role === "staff" ? "#FFFFFF" : theme.text,
                fontWeight: role === "staff" ? "600" : "400",
              }}
            >
              Staff
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleRoleChange("management")}
            style={({ pressed }) => [
              styles.roleOption,
              {
                backgroundColor:
                  role === "management"
                    ? isDark
                      ? Colors.dark.secondary
                      : Colors.light.secondary
                    : theme.backgroundDefault,
                borderColor:
                  role === "management"
                    ? isDark
                      ? Colors.dark.secondary
                      : Colors.light.secondary
                    : theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather
              name="shield"
              size={20}
              color={role === "management" ? "#FFFFFF" : theme.text}
            />
            <ThemedText
              type="body"
              style={{
                color: role === "management" ? "#FFFFFF" : theme.text,
                fontWeight: role === "management" ? "600" : "400",
              }}
            >
              Management
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Permissions
        </ThemedText>
        <View
          style={[
            styles.permissionsCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <View style={styles.permissionRow}>
            <ThemedText type="body">View Restricted Data</ThemedText>
            <Switch
              value={permissions.viewRestrictedData}
              onValueChange={(value) =>
                setPermissions({ ...permissions, viewRestrictedData: value })
              }
              trackColor={{
                false: theme.backgroundSecondary,
                true: isDark ? Colors.dark.primary : Colors.light.primary,
              }}
            />
          </View>
          <View style={styles.permissionRow}>
            <ThemedText type="body">Edit Content</ThemedText>
            <Switch
              value={permissions.editContent}
              onValueChange={(value) =>
                setPermissions({ ...permissions, editContent: value })
              }
              trackColor={{
                false: theme.backgroundSecondary,
                true: isDark ? Colors.dark.primary : Colors.light.primary,
              }}
            />
          </View>
          <View style={styles.permissionRow}>
            <ThemedText type="body">Send Messages</ThemedText>
            <Switch
              value={permissions.sendMessages}
              onValueChange={(value) =>
                setPermissions({ ...permissions, sendMessages: value })
              }
              trackColor={{
                false: theme.backgroundSecondary,
                true: isDark ? Colors.dark.primary : Colors.light.primary,
              }}
            />
          </View>
          <View style={[styles.permissionRow, { borderBottomWidth: 0 }]}>
            <ThemedText type="body">Manage Staff</ThemedText>
            <Switch
              value={permissions.manageStaff}
              onValueChange={(value) =>
                setPermissions({ ...permissions, manageStaff: value })
              }
              trackColor={{
                false: theme.backgroundSecondary,
                true: isDark ? Colors.dark.secondary : Colors.light.secondary,
              }}
            />
          </View>
        </View>
      </View>

      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="save" size={20} color="#FFFFFF" />
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          Save Changes
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={handleResetPin}
        style={({ pressed }) => [
          styles.resetButton,
          {
            borderColor: isDark ? Colors.dark.secondary : Colors.light.secondary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather
          name="refresh-cw"
          size={20}
          color={isDark ? Colors.dark.secondary : Colors.light.secondary}
        />
        <ThemedText
          type="body"
          style={{
            color: isDark ? Colors.dark.secondary : Colors.light.secondary,
            fontWeight: "600",
          }}
        >
          Reset PIN
        </ThemedText>
      </Pressable>

      <Pressable
        onPress={handleRemove}
        style={({ pressed }) => [
          styles.removeButton,
          {
            borderColor: isDark ? Colors.dark.destructive : Colors.light.destructive,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather
          name="user-x"
          size={20}
          color={isDark ? Colors.dark.destructive : Colors.light.destructive}
        />
        <ThemedText
          type="body"
          style={{
            color: isDark ? Colors.dark.destructive : Colors.light.destructive,
            fontWeight: "600",
          }}
        >
          Remove Staff Member
        </ThemedText>
      </Pressable>
    </ScreenKeyboardAwareScrollView>
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
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  roleOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
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
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  successTitle: {
    marginBottom: Spacing.sm,
  },
  pinDisplay: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xl,
    minWidth: 200,
  },
  pinText: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: 8,
  },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing["4xl"],
  },
});
