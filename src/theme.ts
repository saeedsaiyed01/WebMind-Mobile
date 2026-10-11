import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import * as SecureStore from "expo-secure-store";
import * as SystemUI from "expo-system-ui";
import {
  lightColors,
  darkColors,
  parseAppearance,
  resolveAppearance,
  type AppearancePreference,
  type Palette,
} from "./appearance";
export type { Palette } from "./appearance";
const key = "webmind-appearance";
function makeTheme(colors: Palette, isDark: boolean) {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: 5,
    colors: {
      ...base.colors,
      primary: colors.accent,
      onPrimary: colors.onAccent,
      background: colors.bg,
      surface: colors.paper,
      onSurface: colors.ink,
      outline: colors.line,
      onSurfaceVariant: colors.muted,
      surfaceVariant: colors.subtle,
      secondaryContainer: colors.accentSoft,
      onSecondaryContainer: colors.ink,
      error: colors.danger,
    },
    fonts: Object.fromEntries(
      Object.entries(base.fonts).map(([name, font]) => [
        name,
        { ...font, fontFamily: "DMSans_400Regular" },
      ]),
    ) as typeof base.fonts,
  };
}
type AppearanceContext = {
  colors: Palette;
  theme: ReturnType<typeof makeTheme>;
  isDark: boolean;
  preference: AppearancePreference;
  setPreference: (value: AppearancePreference) => Promise<void>;
};
const context = createContext<AppearanceContext | null>(null);
export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const [preference, setValue] = useState<AppearancePreference>("system");
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const saved =
          Platform.OS === "web"
            ? window.localStorage.getItem(key)
            : await SecureStore.getItemAsync(key);
        if (active && !changed.current) setValue(parseAppearance(saved));
      } catch {
        /* System appearance remains available if storage is unavailable. */
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);
  const setPreference = useCallback((value: AppearancePreference) => {
    changed.current = true;
    setValue(value);
    const write = writes.current
      .catch(() => {})
      .then(async () => {
        if (Platform.OS === "web") window.localStorage.setItem(key, value);
        else await SecureStore.setItemAsync(key, value);
      });
    writes.current = write;
    return write;
  }, []);
  const isDark = resolveAppearance(preference, system) === "dark";
  const colors = isDark ? darkColors : lightColors;
  useEffect(() => {
    if (Platform.OS !== "web")
      void SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors]);
  const value = useMemo(
    () => ({
      colors,
      isDark,
      preference,
      setPreference,
      theme: makeTheme(colors, isDark),
    }),
    [colors, isDark, preference, setPreference],
  );
  return React.createElement(context.Provider, { value }, children);
}
export function useAppTheme() {
  const value = useContext(context);
  if (!value) throw new Error("AppearanceProvider is required");
  return value;
}
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
