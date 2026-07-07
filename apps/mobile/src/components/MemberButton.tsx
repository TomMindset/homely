import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles/plannerStyles";
import { useThemeColors } from "../theme/themeContext";

export function MemberButton({
  active,
  label,
  color,
  onPress,
  darkMode = false,
  disabled = false,
}: {
  active: boolean;
  label: string;
  color?: string;
  onPress: () => void;
  darkMode?: boolean;
  disabled?: boolean;
}) {
  const theme = useThemeColors();
  const palette = darkMode ? theme.dark : theme;

  return (
    <TouchableOpacity
      style={[
        styles.memberButton,
        { backgroundColor: palette.paper, borderColor: palette.border },
        active && { backgroundColor: palette.primary, borderColor: palette.primary },
        disabled && styles.disabledButton,
      ]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} als aktuelle Ansicht waehlen`}
      accessibilityState={{ selected: active, disabled }}
      onPress={onPress}
    >
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.memberButtonText, { color: palette.muted }, active && styles.memberButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
