// Validated palette values (see dataviz skill reference palette) — status colors are
// fixed/never themed; "engagé" reuses categorical slot 1 (blue); "restant" is neutral.
export const CHART_COLORS = {
  good: { light: "#0ca30c", dark: "#0ca30c" },
  warning: { light: "#fab219", dark: "#fab219" },
  critical: { light: "#d03b3b", dark: "#d03b3b" },
  blue: { light: "#2a78d6", dark: "#3987e5" },
  neutralMuted: { light: "#898781", dark: "#898781" },
  neutralBaseline: { light: "#c3c2b7", dark: "#383835" },
  neutralSecondary: { light: "#52514e", dark: "#c3c2b7" },
} as const;
