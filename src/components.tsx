import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  useReducedMotion,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAppTheme, useThemedStyles, type Palette } from "./theme";

export type IconName = React.ComponentProps<typeof Feather>["name"];
export const Icon = ({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => {
  const { colors } = useAppTheme();
  return <Feather name={name} size={size} color={color ?? colors.ink} />;
};
export function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const s = useSharedStyles();

  return <Text style={[s.label, style]}>{children}</Text>;
}
export function Heading({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const s = useSharedStyles();

  return <Text style={[s.heading, style]}>{children}</Text>;
}
export function Body({
  children,
  style,
  lines,
}: {
  children: React.ReactNode;
  style?: any;
  lines?: number;
}) {
  const s = useSharedStyles();

  return (
    <Text numberOfLines={lines} style={[s.body, style]}>
      {children}
    </Text>
  );
}
export function Enter({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.duration(380).delay(delay).springify().damping(24)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}
export function Tap({
  children,
  onPress,
  style,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  label: string;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const animation = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[animation, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={() => {
          if (!reduced)
            scale.set(withSpring(0.975, { damping: 20, stiffness: 400 }));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, { damping: 20, stiffness: 400 }));
        }}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        style={{
          opacity: disabled ? 0.45 : 1,
          minHeight: 44,
          minWidth: 44,
          justifyContent: "center",
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
export function RoundButton({
  name,
  onPress,
  label,
  dark = false,
}: {
  name: IconName;
  onPress: () => void;
  label: string;
  dark?: boolean;
}) {
  const { colors: c } = useAppTheme();
  const s = useSharedStyles();

  return (
    <Tap label={label} onPress={onPress}>
      <View
        style={[
          s.round,
          dark && { backgroundColor: c.accent, borderColor: c.accent },
        ]}
      >
        <Icon name={name} color={dark ? c.onAccent : c.ink} />
      </View>
    </Tap>
  );
}
export function Empty({
  icon = "inbox",
  title,
  detail,
  action,
}: {
  icon?: IconName;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  const { colors: c } = useAppTheme();
  const s = useSharedStyles();

  return (
    <Enter style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={28} color={c.accent} />
      </View>
      <Heading style={{ fontSize: 22, textAlign: "center" }}>{title}</Heading>
      <Body style={{ textAlign: "center", maxWidth: 280 }}>{detail}</Body>
      {action}
    </Enter>
  );
}
export function Orb({
  size = 80,
  active = true,
}: {
  size?: number;
  active?: boolean;
}) {
  const { colors: c } = useAppTheme();

  const pulse = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    pulse.set(
      active && !reduced
        ? withRepeat(withTiming(1, { duration: 2300 }), -1, true)
        : 0,
    );
    return () => cancelAnimation(pulse);
  }, [active, reduced, pulse]);
  const animated = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + pulse.value * 0.04 },
      { rotate: `${pulse.value * 9}deg` },
    ],
  }));
  return (
    <Animated.View
      accessibilityLabel="WebMind"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        },
        animated,
      ]}
    >
      <View
        style={{
          position: "absolute",
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: size,
          borderColor: c.highlight,
          borderWidth: 1,
          transform: [{ rotate: "30deg" }, { scaleX: 0.5 }],
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: size,
          borderColor: c.accent,
          borderWidth: 1,
          transform: [{ rotate: "-30deg" }, { scaleX: 0.5 }],
        }}
      />
      <Icon name="star" size={size * 0.25} color={c.accent} />
    </Animated.View>
  );
}
const makeSharedStyles = (c: Palette) =>
  StyleSheet.create({
    label: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      letterSpacing: 0.8,
      color: c.muted,
      textTransform: "uppercase",
    },
    heading: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 30,
      letterSpacing: -1.2,
      color: c.ink,
      lineHeight: 39,
    },
    body: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: c.muted,
      lineHeight: 22,
    },
    round: {
      height: 44,
      width: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: { paddingVertical: 44, gap: 12, alignItems: "center" },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    between: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    card: {
      borderRadius: 24,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
      padding: 20,
    },
  });

export const useSharedStyles = () => useThemedStyles(makeSharedStyles);
