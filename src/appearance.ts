export type AppearancePreference = "system" | "light" | "dark";
export const lightColors = {
  bg: "#F8F7F5",
  paper: "#FFFFFF",
  ink: "#222222",
  muted: "#66635F",
  line: "#E5E2DE",
  accent: "#2C2C2C",
  accentSoft: "#F0EEEB",
  highlight: "#F4D7B9",
  secondary: "#995321",
  subtle: "#F0EEEB",
  danger: "#B4233A",
  dangerSoft: "#FFF0F2",
  onAccent: "#FFFFFF",
};
export type Palette = typeof lightColors;
export const darkColors: Palette = {
  bg: "#161616",
  paper: "#202020",
  ink: "#ECEAE6",
  muted: "#B0ADA7",
  line: "#343331",
  accent: "#ECEAE6",
  accentSoft: "#2A2926",
  highlight: "#5B432C",
  secondary: "#E3AF78",
  subtle: "#2A2926",
  danger: "#FFADB5",
  dangerSoft: "#40262C",
  onAccent: "#202020",
};
export function parseAppearance(value: unknown): AppearancePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveAppearance(
  preference: AppearancePreference,
  system: string | null | undefined,
) {
  return preference === "system"
    ? system === "dark"
      ? "dark"
      : "light"
    : preference;
}
