import React, { useState } from "react";
import { View, Text, ScrollView, Platform, StyleSheet } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Button, TextInput, HelperText } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { request } from "./api";
import { Body, Heading, Orb, Tap, Icon } from "./components";
import { useAppTheme, useThemedStyles, type Palette } from "./theme";
import {
  beginMobileOAuth,
  completeMobileOAuth,
  mobileReturnUrl,
} from "./auth/mobileOAuth";

export function Auth({
  onSession,
  notify,
}: {
  onSession: (token: string) => Promise<void>;
  notify: (message: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const styles = useThemedStyles(makeStyles);

  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (busy) return;
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (
      (mode !== "reset" || step === 2) &&
      password.length < (mode === "signin" ? 1 : 6)
    ) {
      setError(
        mode === "signin"
          ? "Enter your password."
          : "Use a password with at least 6 characters.",
      );
      return;
    }
    if (mode === "reset" && step === 1 && !/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit verification code.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        if (step === 0) {
          await request("/auth/send-otp", "POST", { email: email.trim() });
          setStep(1);
          notify("Check your email for a verification code.");
        } else if (step === 1) {
          const data = await request<{ resetToken: string }>(
            "/auth/verify-otp",
            "POST",
            { email: email.trim(), otp },
          );
          setResetToken(data.resetToken);
          setStep(2);
        } else {
          await request("/auth/reset-password", "POST", {
            email: email.trim(),
            resetToken,
            newPassword: password,
          });
          changeMode("signin");
          notify("Password updated. You can now sign in.");
        }
      } else {
        const data = await request<{ token: string }>(`/auth/${mode}`, "POST", {
          username: email.trim(),
          password,
        });
        await onSession(data.token);
      }
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function changeMode(next: typeof mode) {
    setMode(next);
    setError("");
    setStep(0);
    setPassword("");
    setOtp("");
    setResetToken("");
    setVisible(false);
  }
  async function google() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const url = await beginMobileOAuth();
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        mobileReturnUrl,
      );
      if (result.type === "success")
        await completeMobileOAuth(result.url, onSession);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        enabled={Platform.OS !== "web"}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.page}
        >
          <View style={styles.brand}>
            <Orb size={40} active={false} />
            <Text style={styles.wordmark}>WebMind</Text>
          </View>
          <View style={styles.intro}>
            <View style={styles.badge}>
              <Icon name="zap" size={16} color={c.accent} />
              <Body style={{ color: c.accent, fontSize: 12 }}>
                Your knowledge, connected
              </Body>
            </View>
            <Heading style={styles.heading}>
              {mode === "signup"
                ? "Create your account"
                : mode === "reset"
                  ? "Reset your password"
                  : "Welcome back"}
            </Heading>
            <Body>
              {mode === "reset"
                ? [
                    "We’ll send a code to your email.",
                    "Enter the six-digit code from your email.",
                    "Choose a new password for your account.",
                  ][step]
                : mode === "signup"
                  ? "Save ideas. Ask better questions. Make something great."
                  : "Pick up your ideas, right where you left them."}
            </Body>
          </View>
          <View style={styles.form}>
            <TextInput
              label="Email address"
              accessibilityLabel="Email address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              disabled={busy || (mode === "reset" && step > 0)}
              style={styles.input}
              outlineStyle={styles.outline}
            />
            {(mode !== "reset" || step === 2) && (
              <TextInput
                label={mode === "reset" ? "New password" : "Password"}
                accessibilityLabel="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                autoCapitalize="none"
                secureTextEntry={!visible}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                disabled={busy}
                right={
                  <TextInput.Icon
                    icon={visible ? "eye-off-outline" : "eye-outline"}
                    accessibilityLabel={
                      visible ? "Hide password" : "Show password"
                    }
                    onPress={() => setVisible(!visible)}
                  />
                }
                style={styles.input}
                outlineStyle={styles.outline}
              />
            )}
            {mode === "signup" && (
              <Body style={{ fontSize: 12 }}>Use at least 6 characters.</Body>
            )}
            {mode === "reset" && step === 1 && (
              <TextInput
                label="Verification code"
                accessibilityLabel="Verification code"
                value={otp}
                onChangeText={setOtp}
                mode="outlined"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                disabled={busy}
                style={styles.input}
                outlineStyle={styles.outline}
              />
            )}
            {!!error && (
              <HelperText
                type="error"
                accessibilityLiveRegion="polite"
                style={{ fontSize: 14 }}
              >
                {error}
              </HelperText>
            )}
            {mode === "signin" && (
              <Tap
                label="Forgot password"
                disabled={busy}
                onPress={() => changeMode("reset")}
              >
                <Body style={{ textAlign: "right", color: c.accent }}>
                  Forgot password?
                </Body>
              </Tap>
            )}
            <Button
              mode="contained"
              loading={busy}
              disabled={busy}
              onPress={submit}
              contentStyle={{ height: 52 }}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              {mode === "reset"
                ? ["Send verification code", "Verify code", "Reset password"][
                    step
                  ]
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </Button>
            {mode !== "reset" && (
              <>
                <View style={styles.divider}>
                  <View style={styles.rule} />
                  <Body style={{ fontSize: 12 }}>or</Body>
                  <View style={styles.rule} />
                </View>
                <Button
                  mode="outlined"
                  icon="google"
                  onPress={google}
                  disabled={busy}
                  contentStyle={{ height: 52 }}
                  style={[styles.button, { borderColor: c.line }]}
                  labelStyle={styles.buttonLabel}
                >
                  Continue with Google
                </Button>
              </>
            )}
            <Tap
              label={mode === "signin" ? "Create account" : "Back to sign in"}
              disabled={busy}
              onPress={() =>
                changeMode(mode === "signin" ? "signup" : "signin")
              }
            >
              <Body style={{ textAlign: "center" }}>
                {mode === "signin"
                  ? "New to WebMind? "
                  : "Already have an account? "}
                <Text
                  style={{ color: c.accent, fontFamily: "DMSans_500Medium" }}
                >
                  {mode === "signin" ? "Create account" : "Sign in"}
                </Text>
              </Body>
            </Tap>
          </View>
          <View style={styles.privacy}>
            <Icon name="lock" size={14} color={c.muted} />
            <Body style={{ fontSize: 12 }}>
              A private space for your ideas.
            </Body>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    page: {
      flexGrow: 1,
      padding: 24,
      paddingTop: 32,
      gap: 32,
      maxWidth: 480,
      width: "100%",
      alignSelf: "center",
      paddingBottom: 32,
    },
    brand: { flexDirection: "row", alignItems: "center", gap: 12 },
    wordmark: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 24,
      color: c.ink,
      letterSpacing: -0.8,
    },
    intro: { gap: 12, marginTop: 24 },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      backgroundColor: c.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    heading: { fontSize: 28, lineHeight: 36, letterSpacing: -0.8 },
    form: { gap: 12 },
    input: { backgroundColor: c.paper },
    outline: { borderRadius: 12 },
    button: { borderRadius: 12 },
    buttonLabel: { fontFamily: "DMSans_500Medium", fontSize: 16 },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 8,
    },
    rule: { flex: 1, height: 1, backgroundColor: c.line },
    privacy: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
    },
  });
