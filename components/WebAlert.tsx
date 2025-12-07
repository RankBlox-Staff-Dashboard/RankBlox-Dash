import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Platform,
  Alert as RNAlert,
  AlertButton,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface WebAlertButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface WebAlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: WebAlertButton[];
}

let alertState: WebAlertState = {
  visible: false,
  title: "",
  message: "",
  buttons: [],
};

let setAlertState: React.Dispatch<React.SetStateAction<WebAlertState>> | null = null;

/**
 * Cross-platform alert that works on web
 */
export function alert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
) {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons);
    return;
  }

  if (setAlertState) {
    setAlertState({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: "OK" }],
    });
  } else {
    // Fallback to browser alert if provider not mounted
    window.alert(message ? `${title}\n\n${message}` : title);
  }
}

export function WebAlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<WebAlertState>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });
  const { theme, isDark } = useTheme();

  React.useEffect(() => {
    setAlertState = setState;
    return () => {
      setAlertState = null;
    };
  }, []);

  const handleButtonPress = (button: WebAlertButton) => {
    setState((prev) => ({ ...prev, visible: false }));
    button.onPress?.();
  };

  const handleDismiss = () => {
    setState((prev) => ({ ...prev, visible: false }));
  };

  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <Pressable style={styles.overlay} onPress={handleDismiss}>
          <Pressable
            style={[
              styles.alertContainer,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="h4" style={styles.title}>
              {state.title}
            </ThemedText>
            {state.message && (
              <ThemedText
                type="body"
                style={[styles.message, { color: theme.textSecondary }]}
              >
                {state.message}
              </ThemedText>
            )}
            <View style={styles.buttonContainer}>
              {state.buttons.map((button, index) => {
                const isDestructive = button.style === "destructive";
                const isCancel = button.style === "cancel";
                const buttonColor = isDestructive
                  ? isDark
                    ? Colors.dark.destructive
                    : Colors.light.destructive
                  : isDark
                    ? Colors.dark.primary
                    : Colors.light.primary;

                return (
                  <Pressable
                    key={index}
                    onPress={() => handleButtonPress(button)}
                    style={({ pressed }) => [
                      styles.button,
                      isCancel && {
                        backgroundColor: theme.backgroundSecondary,
                      },
                      !isCancel && { backgroundColor: buttonColor },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <ThemedText
                      type="body"
                      style={[
                        styles.buttonText,
                        { color: isCancel ? theme.text : "#FFFFFF" },
                      ]}
                    >
                      {button.text}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: "90%",
    maxWidth: 400,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
        transition: "opacity 0.2s ease",
      },
      default: {},
    }),
  },
  buttonText: {
    fontWeight: "600",
  },
});
