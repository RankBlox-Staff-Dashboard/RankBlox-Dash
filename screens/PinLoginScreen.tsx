import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

const PIN_LENGTH = 4;

export default function PinLoginScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { login } = useAuth();
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const shakeX = useSharedValue(0);

  const handleDigitPress = useCallback(async (digit: string) => {
    if (pin.length >= PIN_LENGTH || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setIsLoading(true);
      const result = await login(newPin);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "StaffTabs" }],
          })
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shakeX.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
        setPin("");
        setIsLoading(false);
      }
    }
  }, [pin, isLoading, login, navigation, shakeX]);

  const handleDelete = useCallback(() => {
    if (pin.length > 0 && !isLoading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin(pin.slice(0, -1));
    }
  }, [pin, isLoading]);

  const handleForgotCode = () => {
    Alert.alert(
      "Forgot PIN?",
      "Please contact your manager to reset your PIN code.",
      [{ text: "OK" }]
    );
  };

  const animatedDotsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const renderDots = () => (
    <Animated.View style={[styles.dotsContainer, animatedDotsStyle]}>
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index < pin.length
                  ? isDark
                    ? Colors.dark.primary
                    : Colors.light.primary
                  : theme.border,
            },
          ]}
        />
      ))}
    </Animated.View>
  );

  const renderKeypad = () => {
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", "delete"],
    ];

    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === "") {
                return <View key={keyIndex} style={styles.keyPlaceholder} />;
              }

              if (key === "delete") {
                return (
                  <Pressable
                    key={keyIndex}
                    onPress={handleDelete}
                    style={({ pressed }) => [
                      styles.key,
                      {
                        backgroundColor: "transparent",
                        opacity: pressed ? 0.6 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                  >
                    <Feather name="delete" size={28} color={theme.text} />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={keyIndex}
                  onPress={() => handleDigitPress(key)}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: pressed
                        ? theme.backgroundSecondary
                        : theme.backgroundDefault,
                      borderColor: theme.border,
                      opacity: isLoading ? 0.5 : 1,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <ThemedText type="h2" style={styles.keyText}>
                    {key}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [
          styles.closeButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="x" size={24} color={theme.text} />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.header}>
          <View
            style={[
              styles.lockIcon,
              { backgroundColor: isDark ? Colors.dark.primary + "20" : Colors.light.primary + "15" },
            ]}
          >
            <Feather
              name="lock"
              size={32}
              color={isDark ? Colors.dark.primary : Colors.light.primary}
            />
          </View>
          <ThemedText type="h3" style={styles.title}>
            Staff Login
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Enter your 4-digit PIN code
          </ThemedText>
        </View>

        {renderDots()}
        {renderKeypad()}

        <Pressable
          onPress={handleForgotCode}
          style={({ pressed }) => [styles.forgotButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <ThemedText type="body" style={{ color: isDark ? Colors.dark.primary : Colors.light.primary }}>
            Forgot Code?
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
          Default PINs: 1234 (Admin) or 5678 (Staff)
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 60,
    left: Spacing.lg,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  keypad: {
    gap: Spacing.md,
  },
  keypadRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  keyPlaceholder: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 28,
  },
  forgotButton: {
    marginTop: Spacing["2xl"],
    paddingVertical: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
  },
});
