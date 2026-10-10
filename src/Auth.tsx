import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Button, TextInput, HelperText } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { API_URL, request } from "./api";
import { Body, Heading, Label, Orb, Enter, Tap, Icon } from "./components";
import { colors as c } from "./theme";

export function Auth({
  onSession,
  notify,
}: {
  onSession: (token: string) => Promise<void>;
  notify: (message: string) => void;
}) {
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
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode !== "reset" || step === 2) {
      if (password.length < (mode === "signin" ? 1 : 6)) {
        setError("Use a password with at least 6 characters.");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        if (step === 0) {
          await request("/auth/send-otp", "POST", { email: email.trim() });
          setStep(1);
          notify("A verification code has been sent to your email.");
        } else if (step === 1) {
          const data = await request("/auth/verify-otp", "POST", {
            email: email.trim(),
            otp,
          });
          setResetToken(data.resetToken);
          setStep(2);
        } else {
          await request("/auth/reset-password", "POST", {
            email: email.trim(),
            resetToken,
            newPassword: password,
          });
          setMode("signin");
          setPassword("");
          setStep(0);
          notify("Password updated. You can now sign in.");
        }
      } else {
        const data = await request(`/auth/${mode}`, "POST", {
          username: email.trim(),
          password,
        });
        await onSession(data.token);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function changeMode(next: typeof mode) {
    setMode(next);
    setError("");
    setStep(0);
    setPassword("");
  }
  async function google() {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        API_URL + "/auth/google",
        "https://webmind.space",
      );
      if (result.type === "success") {
        const value = new URL(result.url).searchParams.get("token");
        if (value) await onSession(value);
        else notify("Google did not return a session. Please try again.");
      }
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.page}
        >
          <Enter>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Orb size={34} active={false} />
              <Text style={styles.wordmark}>
                webmind<Text style={{ color: c.orange }}>.</Text>
              </Text>
            </View>
          </Enter>
          <Enter delay={70}>
            <LinearGradient colors={["#E4EBDC", "#F0F1E8"]} style={styles.art}>
              <Label style={{ position: "absolute", left: 22, top: 20 }}>
                A LITTLE SPACE FOR BIG IDEAS
              </Label>
              <View style={styles.orbitOne} />
              <View style={styles.orbitTwo} />
              <Orb size={112} />
              <View style={styles.artCaption}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: c.green,
                  }}
                />
                <Label style={{ letterSpacing: 1.2, color: c.green }}>
                  Your thinking, connected
                </Label>
              </View>
            </LinearGradient>
          </Enter>
          <Enter delay={140}>
            <Label>YOUR SECOND BRAIN, REIMAGINED</Label>
            <Heading style={{ marginTop: 10, fontSize: 35, lineHeight: 44 }}>
              {mode === "signup"
                ? "Make room for\nyour next idea."
                : mode === "reset"
                  ? "A fresh start."
                  : "Good ideas deserve\na place to grow."}
            </Heading>
            <Body style={{ marginTop: 10 }}>
              {mode === "reset"
                ? step === 0
                  ? "We’ll email you a code to reset your password."
                  : step === 1
                    ? "Enter the six-digit code from your email."
                    : "Choose your new password."
                : "Save what inspires you. Connect the dots with AI.\nBring a little clarity to every day."}
            </Body>
          </Enter>
          <Enter delay={200} style={{ gap: 12 }}>
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
                right={
                  <TextInput.Icon
                    icon={visible ? "eye-off-outline" : "eye-outline"}
                    onPress={() => setVisible(!visible)}
                  />
                }
                style={styles.input}
              />
            )}
            {mode === "reset" && step === 1 && (
              <TextInput
                label="Verification code"
                value={otp}
                onChangeText={setOtp}
                mode="outlined"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
            )}
            {!!error && (
              <HelperText
                type="error"
                style={{ fontSize: 13 }}
                accessibilityLiveRegion="polite"
              >
                {error}
              </HelperText>
            )}
            {mode === "signin" && (
              <Tap label="Forgot password" onPress={() => changeMode("reset")}>
                <Body
                  style={{ textAlign: "right", color: c.green, fontSize: 12 }}
                >
                  Forgot password?
                </Body>
              </Tap>
            )}
            <Button
              mode="contained"
              loading={busy}
              disabled={busy}
              onPress={submit}
              contentStyle={{ height: 54 }}
              style={{ borderRadius: 16 }}
              labelStyle={{ fontFamily: "DMSans_500Medium", fontSize: 15 }}
            >
              {mode === "reset"
                ? ["Send verification code", "Verify code", "Reset password"][
                    step
                  ]
                : mode === "signup"
                  ? "Create your workspace"
                  : "Enter your workspace"}{" "}
              →
            </Button>
            {mode !== "reset" && (
              <Button
                mode="outlined"
                icon="google"
                onPress={google}
                disabled={busy}
                contentStyle={{ height: 50 }}
                style={{ borderColor: c.line, borderRadius: 16 }}
              >
                Continue with Google
              </Button>
            )}
            <Tap
              label={mode === "signin" ? "Create account" : "Back to sign in"}
              onPress={() =>
                changeMode(mode === "signin" ? "signup" : "signin")
              }
            >
              <Body style={{ textAlign: "center", marginTop: 6 }}>
                {mode === "signin"
                  ? "New here? "
                  : "Already have a workspace? "}
                <Text
                  style={{ color: c.green, fontFamily: "DMSans_500Medium" }}
                >
                  {mode === "signin" ? "Make yourself at home" : "Sign in"}
                </Text>
              </Body>
            </Tap>
          </Enter>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 16,
            }}
          >
            <Icon name="lock" size={12} color={c.muted} />
            <Body style={{ fontSize: 11 }}>
              Your memories stay in your private workspace.
            </Body>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: {
    padding: 26,
    paddingTop: 18,
    gap: 24,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 36,
  },
  wordmark: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 24,
    letterSpacing: -1,
  },
  art: {
    height: 210,
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8E1D3",
  },
  orbitOne: {
    position: "absolute",
    width: 250,
    height: 140,
    borderWidth: 1,
    borderColor: "#CDD7C8",
    borderRadius: 140,
    transform: [{ rotate: "30deg" }],
  },
  orbitTwo: {
    position: "absolute",
    width: 250,
    height: 140,
    borderWidth: 1,
    borderColor: "#CDD7C8",
    borderRadius: 140,
    transform: [{ rotate: "-30deg" }],
  },
  artCaption: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: { backgroundColor: c.paper },
});
