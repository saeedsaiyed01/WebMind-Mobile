import { MD3LightTheme } from "react-native-paper";
export const colors = {
  bg: "#F8F7F3",
  paper: "#FFFFFF",
  ink: "#202923",
  muted: "#788078",
  line: "#E6E8E0",
  green: "#364D3D",
  sage: "#DDE6D7",
  lime: "#D6EEA9",
  orange: "#C68B5F",
  danger: "#B7463E",
};
export const theme = {
  ...MD3LightTheme,
  roundness: 5,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.green,
    background: colors.bg,
    surface: colors.paper,
    onSurface: colors.ink,
    outline: colors.line,
    secondaryContainer: colors.sage,
  },
  fonts: Object.fromEntries(
    Object.entries(MD3LightTheme.fonts).map(([key, value]) => [
      key,
      { ...value, fontFamily: "DMSans_400Regular" },
    ]),
  ) as typeof MD3LightTheme.fonts,
};
