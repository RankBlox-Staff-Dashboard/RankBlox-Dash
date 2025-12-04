import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useData } from "@/context/DataContext";
import { ContentStackParamList } from "@/navigation/ContentStackNavigator";

type RouteParams = RouteProp<ContentStackParamList, "EditContent">;

const CATEGORIES = [
  "Policies",
  "Procedures",
  "Announcements",
  "Training",
  "Resources",
  "Contacts",
];

export default function EditContentScreen() {
  const { theme, isDark } = useTheme();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { contentItems, updateContentItem, deleteContentItem, publishContentItem } = useData();
  const { contentId } = route.params;

  const content = contentItems.find((item) => item.id === contentId);

  const [title, setTitle] = useState(content?.title ?? "");
  const [description, setDescription] = useState(content?.description ?? "");
  const [category, setCategory] = useState(content?.category ?? "");

  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setDescription(content.description);
      setCategory(content.category);
    }
  }, [content]);

  if (!content) {
    return (
      <ScreenKeyboardAwareScrollView>
        <View style={styles.emptyState}>
          <Feather name="file-minus" size={64} color={theme.textSecondary} />
          <ThemedText type="h4">Content not found</ThemedText>
        </View>
      </ScreenKeyboardAwareScrollView>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    if (!category) {
      Alert.alert("Error", "Please select a category");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    await updateContentItem(contentId, {
      title: title.trim(),
      description: description.trim(),
      category,
    });
    navigation.goBack();
  };

  const handlePublish = () => {
    Alert.alert(
      "Publish Content",
      "Are you sure you want to publish this content?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: async () => {
            await updateContentItem(contentId, {
              title: title.trim(),
              description: description.trim(),
              category,
            });
            await publishContentItem(contentId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Content",
      "Are you sure you want to delete this content? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteContentItem(contentId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Title
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
          placeholder="Enter content title..."
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Category
        </ThemedText>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={({ pressed }) => [
                styles.categoryOption,
                {
                  backgroundColor:
                    category === cat
                      ? isDark
                        ? Colors.dark.primary
                        : Colors.light.primary
                      : theme.backgroundDefault,
                  borderColor:
                    category === cat
                      ? isDark
                        ? Colors.dark.primary
                        : Colors.light.primary
                      : theme.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText
                type="body"
                style={{
                  color: category === cat ? "#FFFFFF" : theme.text,
                  fontWeight: category === cat ? "600" : "400",
                }}
              >
                {cat}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Description
        </ThemedText>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Enter content description..."
          placeholderTextColor={theme.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />
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

      {!content.isPublished && (
        <Pressable
          onPress={handlePublish}
          style={({ pressed }) => [
            styles.publishButton,
            {
              backgroundColor: isDark ? Colors.dark.success : Colors.light.success,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="upload" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            Publish Now
          </ThemedText>
        </Pressable>
      )}

      <Pressable
        onPress={handleDelete}
        style={({ pressed }) => [
          styles.deleteButton,
          {
            borderColor: isDark ? Colors.dark.destructive : Colors.light.destructive,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather
          name="trash-2"
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
          Delete Content
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 16,
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
  publishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  deleteButton: {
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
});
