import React, { createContext, useContext } from "react";
import { DesignSet, getDesignSet } from "../constants/planner";

export type ThemeColors = DesignSet;

const ThemeContext = createContext<ThemeColors>(getDesignSet("homely"));

export function ThemeProvider({ colors, children }: { colors: ThemeColors; children: React.ReactNode }) {
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useThemeColors() {
  return useContext(ThemeContext);
}
