import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useData } from "@/context/DataContext";
import { StaffPermissions, UserRole } from "@/context/AuthContext";

export default function AddStaffScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { addStaffMember } = useData();
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<StaffPermissions>({
    viewRestrictedData: true,
    editContent: true,
    sendMessages: true,
    manageStaff: false,
  });

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === "management") {
      setPermissions({
        viewRestrictedData: true,
        editContent: true,
        sendMessages: true,
        manageStaff: true,
      });
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }

    const pin = await addStaffMember(name.trim(), role as "staff" | "management", permissions);
    setGeneratedPin(pin);
  };

  const handleDone = () => {
    navigation.goBack();
  };

  if (generatedPin) {
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
            Staff Member Created
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Share this PIN code with {name} so they can login.
          </ThemedText>

          <View
            style={[
              styles.pinDisplay,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <ThemedText type="h1" style={styles.pinText}>
              {generatedPin}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              PIN Code
            </ThemedText>
          </View>

          <View
            style={[
              styles.warningCard,
              { backgroundColor: isDark ? Colors.dark.secondary + "15" : Colors.light.secondary + "10" },
            ]}
          >
            <Feather
              name="alert-circle"
              size={20}
              color={isDark ? Colors.dark.secondary : Colors.light.secondary}
            />
            <ThemedText type="small" style={{ flex: 1, color: theme.text }}>
              Make sure to save this PIN. It will not be shown again.
            </ThemedText>
          </View>

          <Pressable
            onPress={handleDone}
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
        onPress={handleCreate}
        style={({ pressed }) => [
          styles.createButton,
          {
            backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="user-plus" size={20} color="#FFFFFF" />
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          Create Staff Member
        </ThemedText>
      </Pressable>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
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
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
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
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xl,
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
