import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://web-mind-be.vercel.app/api/v1";
export interface Memory {
  _id: string;
  title: string;
  type: string;
  link: string;
  originalLink?: string;
  timestamp?: string;
  extractedText?: string;
  fileMetadata?: { originalName?: string; size?: number };
}
export interface Conversation {
  _id: string;
  title: string;
  lastMessageAt: string;
}
export interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
}
export interface User {
  _id: string;
  username: string;
  email?: string;
  name?: string;
  credits: number;
}
export interface Plan {
  plan: string;
  credits: number;
  planExpiry?: string;
  recentTransactions?: {
    paymentId?: string;
    plan?: string;
    amount?: number;
    credits?: number;
    status: string;
  }[];
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public needsUpgrade = false,
  ) {
    super(message);
  }
}
let token: string | null = null;
let onExpired: (() => void) | undefined;
export function setExpiryHandler(handler: () => void) {
  onExpired = handler;
}
export const storage = {
  async get() {
    return Platform.OS === "web"
      ? sessionStorage.getItem("webmind-session")
      : SecureStore.getItemAsync("webmind-session");
  },
  async set(value: string | null) {
    token = value;
    if (Platform.OS === "web") {
      if (value) sessionStorage.setItem("webmind-session", value);
      else sessionStorage.removeItem("webmind-session");
    } else {
      if (value) await SecureStore.setItemAsync("webmind-session", value);
      else await SecureStore.deleteItemAsync("webmind-session");
    }
  },
};
export async function restoreSession() {
  token = await storage.get();
  return token;
}
export async function request<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    path === "/upload-document" ? 180000 : 45000,
  );
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  try {
    const form = body instanceof FormData;
    const response = await fetch(API_URL + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!form ? { "Content-Type": "application/json" } : {}),
      },
      body:
        body === undefined
          ? undefined
          : form
            ? (body as FormData)
            : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        "The server returned an unexpected response. Please try again.",
        response.status,
      );
    }
    if (!response.ok) {
      if (
        response.status === 403 &&
        /token|authorization/i.test(data.message || "")
      )
        onExpired?.();
      throw new ApiError(
        data.error || data.message || "Request failed. Please try again.",
        response.status,
        !!data.needsUpgrade,
      );
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted)
      throw new ApiError(
        "The request timed out. Check your connection and try again.",
      );
    throw new ApiError(
      "Unable to connect. Check your internet connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export interface ChatResult {
  answer: string;
  conversationId: string;
  remainingCredits: number;
}
// XMLHttpRequest exposes incremental responseText on Android, where fetch streams vary by runtime.
export function chat(
  body: unknown,
  onPhase: (phase: string) => void,
  signal: AbortSignal,
): Promise<ChatResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let consumed = 0;
    let buffer = "";
    let result: ChatResult | undefined;
    let streamError: ApiError | undefined;
    const consume = (final = false) => {
      buffer += xhr.responseText.slice(consumed);
      consumed = xhr.responseText.length;
      if (!(xhr.getResponseHeader("content-type") || "").includes("ndjson"))
        return;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      if (final && buffer.trim()) {
        lines.push(buffer);
        buffer = "";
      }
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === "phase") onPhase(event.phase);
          else if (event.type === "result") result = event;
          else if (event.type === "error")
            streamError = new ApiError(event.error, 0, !!event.needsUpgrade);
        } catch {
          streamError = new ApiError(
            "Could not read the answer. Please retry.",
          );
        }
      }
    };
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort);
    const cleanup = () => signal.removeEventListener("abort", abort);
    xhr.open("POST", API_URL + "/chat");
    xhr.timeout = 180000;
    xhr.setRequestHeader("Content-Type", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.onprogress = () => consume();
    xhr.onload = () => {
      cleanup();
      consume(true);
      if (xhr.status < 200 || xhr.status >= 300) {
        let data: any = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {}
        reject(
          new ApiError(
            data.error || data.message || "Unable to send message.",
            xhr.status,
            !!data.needsUpgrade,
          ),
        );
      } else if (streamError) reject(streamError);
      else if (result) resolve(result);
      else {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.answer) resolve(data);
          else reject(new ApiError("No answer was returned."));
        } catch {
          reject(new ApiError("No answer was returned."));
        }
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError("Connection interrupted. Please try again."));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new ApiError("The answer took too long. Please retry."));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new ApiError("Generation stopped."));
    };
    if (signal.aborted) {
      cleanup();
      reject(new ApiError("Generation stopped."));
      return;
    }
    xhr.send(JSON.stringify(body));
  });
}
