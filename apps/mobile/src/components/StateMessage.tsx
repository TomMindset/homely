import React, { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/plannerStyles";
import { useThemeStyles } from "../theme/useThemeStyles";

type StateTone = "info" | "success" | "warning" | "error" | "loading";

type StateMessageProps = {
  title: string;
  message?: string;
  darkMode: boolean;
  tone?: StateTone;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

function toneStyle(tone: StateTone, darkMode: boolean) {
  if (tone === "error") {
    return darkMode
      ? { backgroundColor: "#2f1518", borderColor: "#ef4444", accent: "#fca5a5" }
      : { backgroundColor: "#fee2e2", borderColor: "#ef4444", accent: "#991b1b" };
  }
  if (tone === "warning") {
    return darkMode
      ? { backgroundColor: "#2c2111", borderColor: "#f59e0b", accent: "#fbbf24" }
      : { backgroundColor: "#fef3c7", borderColor: "#f59e0b", accent: "#92400e" };
  }
  if (tone === "success") {
    return darkMode
      ? { backgroundColor: "#102a27", borderColor: "#4FD1B8", accent: "#7dd3c7" }
      : { backgroundColor: "#E5F1ED", borderColor: "#256F63", accent: "#256F63" };
  }
  if (tone === "loading") {
    return darkMode
      ? { backgroundColor: "#172033", borderColor: "#60a5fa", accent: "#93c5fd" }
      : { backgroundColor: "#dbeafe", borderColor: "#3b82f6", accent: "#1d4ed8" };
  }
  return darkMode
    ? { backgroundColor: "#1e293b", borderColor: "#334155", accent: "#cbd5e1" }
    : { backgroundColor: "#f1eee8", borderColor: "#ded6ca", accent: "#6a6259" };
}

export function StateMessage({ title, message, darkMode, tone = "info", actionLabel, onAction, children }: StateMessageProps) {
  const themed = useThemeStyles(darkMode);
  const toneColors = toneStyle(tone, darkMode);

  return (
    <View style={[styles.stateMessage, { backgroundColor: toneColors.backgroundColor, borderColor: toneColors.borderColor }]}>
      <View style={[styles.stateAccent, { backgroundColor: toneColors.accent }]} />
      <View style={styles.taskTextBox}>
        <Text style={[styles.dayHeading, themed.text, darkMode && styles.textDark]}>{title}</Text>
        {!!message && <Text style={[styles.taskMeta, themed.muted, darkMode && styles.mutedDark]}>{message}</Text>}
        {!!children && <View style={styles.stateMessageBody}>{children}</View>}
        {!!actionLabel && !!onAction && (
          <TouchableOpacity
            style={[styles.secondaryActionFull, themed.card]}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
          >
            <Text style={[styles.secondaryActionText, themed.muted]}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function EmptyState(props: Omit<StateMessageProps, "tone">) {
  return <StateMessage {...props} tone="info" />;
}

export function ErrorBanner(props: Omit<StateMessageProps, "tone">) {
  return <StateMessage {...props} tone="error" />;
}

export function UndoToast(props: Omit<StateMessageProps, "tone">) {
  return <StateMessage {...props} tone="warning" />;
}
