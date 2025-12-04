import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { MessagesStackParamList } from "@/navigation/MessagesStackNavigator";
import { StaffAvatar } from "@/components/StaffAvatar";

export default function NewMessageScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MessagesStackParamList>>();
  const { user } = useAuth();
  const { staffMembers, sendMessage } = useData();
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const availableRecipients = staffMembers.filter(
    (staff) => staff.id !== user?.id && staff.isActive
  );

  const handleSend = async () => {
    if (!selectedRecipient || !message.trim()) {
      Alert.alert("Error", "Please select a recipient and enter a message");
      return;
    }

    await sendMessage(selectedRecipient, message.trim());
    const recipient = staffMembers.find((s) => s.id === selectedRecipient);
    navigation.replace("Conversation", {
      recipientId: selectedRecipient,
      recipientName: recipient?.name ?? "Unknown",
    });
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Select Recipient
        </ThemedText>
        {availableRecipients.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <Feather name="users" size={32} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              No staff members available
            </ThemedText>
          </View>
        ) : (
          availableRecipients.map((staff) => (
            <Pressable
              key={staff.id}
              onPress={() => setSelectedRecipient(staff.id)}
              style={({ pressed }) => [
                styles.recipientCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor:
                    selectedRecipient === staff.id
                      ? isDark
                        ? Colors.dark.primary
                        : Colors.light.primary
                      : theme.border,
                  borderWidth: selectedRecipient === staff.id ? 2 : 1,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <StaffAvatar index={staff.avatarIndex} size={40} />
              <View style={styles.recipientInfo}>
                <ThemedText type="body" style={{ fontWeight: "500" }}>
                  {staff.name}
                </ThemedText>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        staff.role === "management"
                          ? (isDark ? Colors.dark.secondary : Colors.light.secondary) + "20"
                          : (isDark ? Colors.dark.primary : Colors.light.primary) + "20",
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color:
                        staff.role === "management"
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
                    {staff.role === "management" ? "Management" : "Staff"}
                  </ThemedText>
                </View>
              </View>
              {selectedRecipient === staff.id && (
                <Feather
                  name="check-circle"
                  size={24}
                  color={isDark ? Colors.dark.primary : Colors.light.primary}
                />
              )}
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Message
        </ThemedText>
        <TextInput
          style={[
            styles.messageInput,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Write your message..."
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      <Pressable
        onPress={handleSend}
        disabled={!selectedRecipient || !message.trim()}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor:
              selectedRecipient && message.trim()
                ? isDark
                  ? Colors.dark.primary
                  : Colors.light.primary
                : theme.backgroundSecondary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather
          name="send"
          size={20}
          color={selectedRecipient && message.trim() ? "#FFFFFF" : theme.textSecondary}
        />
        <ThemedText
          type="body"
          style={{
            color: selectedRecipient && message.trim() ? "#FFFFFF" : theme.textSecondary,
            fontWeight: "600",
          }}
        >
          Send Message
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
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  recipientInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    minHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
});
