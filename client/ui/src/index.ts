/**
 * Leafx design tokens as TypeScript — usable by React Native (which has no CSS),
 * and by any web code that prefers JS values over CSS vars.
 */

export const green = {
  50: "#F0FDF4",
  100: "#DCFCE7",
  200: "#BBF7D0",
  300: "#86EFAC",
  400: "#4ADE80",
  500: "#22C55E",
  600: "#16A34A",
  700: "#15803D",
  800: "#166534",
  900: "#14532D",
} as const;

export const red = {
  50: "#FEF2F2",
  100: "#FEE2E2",
  200: "#FECACA",
  300: "#FCA5A5",
  400: "#F87171",
  500: "#EF4444",
  600: "#DC2626",
  700: "#B91C1C",
} as const;

/** Semantic tokens. Green dominates; red draws the eye to what's urgent. */
export const colors = {
  primary: green[600],
  primaryHover: green[700],
  primaryForeground: "#FFFFFF",
  secondary: red[500],
  secondaryHover: red[600],
  destructive: red[600],
  success: green[500],
  warning: "#F59E0B",
  info: "#3B82F6",
  receivable: green[600],
  payable: red[500],
} as const;

export const lightTheme = {
  bg: "#FFFFFF",
  surface: "#F9FAFB",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  ...colors,
} as const;

export const darkTheme = {
  bg: "#0B0F0D",
  surface: "#121A15",
  border: "#1F2A22",
  text: "#E5E7EB",
  muted: "#9CA3AF",
  ...colors,
  primary: green[500],
  primaryHover: green[400],
} as const;

export type Theme = typeof lightTheme;
