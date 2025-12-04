import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenFlatList } from "@/components/ScreenFlatList";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useData, Conversation } from "@/context/DataContext";
import { MessagesStackParamList } from "@/navigation/MessagesStackNavigator";
import { StaffAvatar } from "@/components/StaffAvatar";

export default function MessagesScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MessagesStackParamList>>();
  const { conversations, staffMembers } = useData();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const staff = staffMembers.find((s) => s.id === item.participantId);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.conversationCard,
          {
            backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
        onPress={() =>
          navigation.navigate("Conversation", {
            recipientId: item.participantId,
            recipientName: item.participantName,
          })
        }
      >
        <StaffAvatar index={staff?.avatarIndex ?? 0} size={48} />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
              {item.participantName}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatTime(item.lastMessageTime)}
            </ThemedText>
          </View>
          <View style={styles.messagePreview}>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, flex: 1 }}
              numberOfLines={1}
            >
              {item.lastMessage}
            </ThemedText>
            {item.unreadCount > 0 && (
              <View
                style={[
                  styles.unreadBadge,
                  { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary },
                ]}
              >
                <ThemedText type="small" style={styles.unreadText}>
                  {item.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="message-circle" size={64} color={theme.textSecondary} />
      <ThemedText type="h4" style={styles.emptyTitle}>
        No messages yet
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
        Start a conversation with a team member
      </ThemedText>
      <Pressable
        style={({ pressed }) => [
          styles.emptyButton,
          {
            backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => navigation.navigate("NewMessage")}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          New Message
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <ScreenFlatList
      data={conversations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmpty}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  conversationCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  conversationContent: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "center",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  messagePreview: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  unreadText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
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
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
});
