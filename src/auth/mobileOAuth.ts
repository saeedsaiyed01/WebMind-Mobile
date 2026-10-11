import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_URL, request } from "../api";
import { mobileReturnUrl, parseMobileCallback } from "./callback";
export { mobileReturnUrl };

const key = "webmind-oauth-nonce";
let completing = false;
const pending = {
  get: () =>
    Platform.OS === "web"
      ? Promise.resolve(sessionStorage.getItem(key))
      : SecureStore.getItemAsync(key),
  set: (value: string) =>
    Platform.OS === "web"
      ? Promise.resolve(sessionStorage.setItem(key, value))
      : SecureStore.setItemAsync(key, value),
  clear: () =>
    Platform.OS === "web"
      ? Promise.resolve(sessionStorage.removeItem(key))
      : SecureStore.deleteItemAsync(key),
};

export async function beginMobileOAuth(): Promise<string> {
  if (Platform.OS === "web")
    throw new Error(
      "Use email to sign in to this preview. Google sign-in is available in the mobile app.",
    );
  const data = await request<{
    authorizationUrl: string;
    verifier: string;
    state: string;
  }>("/auth/google/mobile-start", "POST");
  const url = new URL(data.authorizationUrl);
  if (
    url.origin !== new URL(API_URL).origin ||
    url.pathname !== new URL(API_URL).pathname + "/auth/google" ||
    !data.verifier ||
    !data.state
  )
    throw new Error(
      "Google sign-in is unavailable. Please sign in with email.",
    );
  await pending.set(
    JSON.stringify({
      verifier: data.verifier,
      state: data.state,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  );
  return url.toString();
}

export async function completeMobileOAuth(
  url: string,
  onSession: (token: string) => Promise<void>,
): Promise<boolean> {
  if (completing) return false;
  completing = true;
  try {
    const saved = await pending.get();
    if (!saved) return false;
    const credentials = JSON.parse(saved) as {
      verifier: string;
      state: string;
      expiresAt: number;
    };
    if (credentials.expiresAt < Date.now()) {
      await pending.clear();
      return false;
    }
    const result = parseMobileCallback(url, credentials.state);
    if (!result) return false;
    if (result.error) {
      await pending.clear();
      throw new Error("Google sign-in could not complete. Please try again.");
    }
    const data = await request<{ token: string }>(
      "/auth/google/mobile-exchange",
      "POST",
      { code: result.code, verifier: credentials.verifier },
    );
    await pending.clear();
    await onSession(data.token);
    return true;
  } finally {
    completing = false;
  }
}
