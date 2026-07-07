import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { homelyLogoColor, nextWeek, previousWeek } from "../constants/planner";
import { seedData } from "../data/seedData";
import { styles } from "../styles/plannerStyles";
import { useThemeColors } from "../theme/themeContext";

const homelyLogo = require("../../assets/icon.png");

export function Header({
  selectedWeek,
  setSelectedWeek,
  darkMode,
  jumpToday,
}: {
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  darkMode: boolean;
  jumpToday: () => void;
}) {
  const theme = useThemeColors();
  const palette = darkMode ? theme.dark : theme;
  const surfaceStyle = { backgroundColor: palette.background };
  const controlStyle = { backgroundColor: palette.paper, borderColor: palette.border };
  const accentTextStyle = { color: palette.primary };

  return (
    <View style={[styles.header, darkMode && styles.headerDark, surfaceStyle]}>
      <View style={styles.headerTop}>
        <View style={[styles.brandMark, { backgroundColor: homelyLogoColor }]}>
          <Image source={homelyLogo} style={styles.brandMarkImage} resizeMode="cover" accessibilityIgnoresInvertColors accessibilityLabel="Homely Logo" />
        </View>
        <View style={styles.headerTitle}>
          <Text style={[styles.eyebrow, { color: palette.muted }]}>Haushalts Manager</Text>
          <Text style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
            Homely
          </Text>
        </View>
      </View>
      <View style={styles.headerControls}>
        <View style={styles.weekStepper}>
          <TouchableOpacity
            style={[styles.stepButton, controlStyle]}
            accessibilityRole="button"
            accessibilityLabel="Vorherige Woche anzeigen"
            onPress={() => setSelectedWeek(previousWeek(seedData.family.availableWeeks, selectedWeek))}
          >
            <Text style={[styles.stepButtonText, accentTextStyle]}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.weekChip, controlStyle]}
            accessibilityRole="button"
            accessibilityLabel={`Aktuelle Woche KW ${selectedWeek}. Naechste Woche anzeigen`}
            onPress={() => setSelectedWeek(nextWeek(seedData.family.availableWeeks, selectedWeek))}
          >
            <Text style={[styles.weekChipText, { color: palette.muted }]}>KW {selectedWeek}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepButton, controlStyle]}
            accessibilityRole="button"
            accessibilityLabel="Naechste Woche anzeigen"
            onPress={() => setSelectedWeek(nextWeek(seedData.family.availableWeeks, selectedWeek))}
          >
            <Text style={[styles.stepButtonText, accentTextStyle]}>›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.todayButton, { backgroundColor: palette.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Zur aktuellen Woche springen"
          onPress={jumpToday}
        >
          <Text style={styles.todayButtonText}>Heute</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
