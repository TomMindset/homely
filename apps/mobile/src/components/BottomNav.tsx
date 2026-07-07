import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { navItems, type ViewId } from "../constants/planner";
import { styles } from "../styles/plannerStyles";
import { useThemeColors } from "../theme/themeContext";

export function BottomNav({
  view,
  setView,
  darkMode,
}: {
  view: ViewId;
  setView: (view: ViewId) => void;
  darkMode: boolean;
}) {
  const theme = useThemeColors();
  const palette = darkMode ? theme.dark : theme;
  const navThemeStyle = { backgroundColor: palette.paper, borderColor: palette.border };

  return (
    <View style={[styles.nav, darkMode && styles.navDark, navThemeStyle]}>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.navButton, view === item.id && { backgroundColor: palette.primary }]}
          accessibilityRole="tab"
          accessibilityLabel={`${item.label} anzeigen`}
          accessibilityState={{ selected: view === item.id }}
          onPress={() => setView(item.id)}
        >
          <Text style={[styles.navText, { color: palette.muted }, view === item.id && styles.navTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
