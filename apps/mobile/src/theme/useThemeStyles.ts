import { useThemeColors } from "./themeContext";

export function useThemeStyles(darkMode: boolean) {
  const theme = useThemeColors();
  const palette = darkMode ? theme.dark : theme;

  if (darkMode) {
    return {
      theme: palette,
      section: { backgroundColor: palette.paper, borderColor: palette.border },
      card: { backgroundColor: palette.paper, borderColor: palette.border },
      soft: { backgroundColor: palette.soft, borderColor: palette.border },
      input: { backgroundColor: palette.background, borderColor: palette.border, color: palette.ink },
      active: { backgroundColor: palette.primary, borderColor: palette.primary },
      primary: { backgroundColor: palette.primary },
      borderActive: { borderColor: palette.primary },
      text: { color: palette.ink },
      muted: { color: palette.muted },
      buttonSurface: { backgroundColor: palette.paper, borderColor: palette.border },
    };
  }

  return {
    theme: palette,
    section: { backgroundColor: palette.paper, borderColor: palette.border },
    card: { backgroundColor: palette.paper, borderColor: palette.border },
    soft: { backgroundColor: palette.soft, borderColor: palette.border },
    input: { backgroundColor: palette.paper, borderColor: palette.border, color: palette.ink },
    active: { backgroundColor: palette.primary, borderColor: palette.primary },
    primary: { backgroundColor: palette.primary },
    borderActive: { borderColor: palette.primary },
    text: { color: palette.ink },
    muted: { color: palette.muted },
    buttonSurface: { backgroundColor: palette.paper, borderColor: palette.border },
  };
}
