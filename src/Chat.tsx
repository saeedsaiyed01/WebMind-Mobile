import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Share,
} from "react-native";
import { Button, Chip, ActivityIndicator } from "react-native-paper";
import Markdown from "react-native-markdown-display";
import { Memory, Model, chat, request, ApiError } from "./api";
import {
  Body,
  Heading,
  Label,
  Orb,
  Icon,
  Tap,
  RoundButton,
  Enter,
  s,
} from "./components";
import { colors as c } from "./theme";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  failed?: boolean;
}
export interface ChatSession {
  id?: string;
  historyRequest?: number;
  messages: Message[];
  attachments: Memory[];
}
function createMessageId() {
  return Date.now().toString();
}
export function ChatScreen({
  session,
  setSession,
  model,
  onModels,
  onAttachments,
  onHistory,
  onNew,
  notify,
  onComplete,
  onUpgrade,
  onBusy,
}: {
  session: ChatSession;
  setSession: React.Dispatch<React.SetStateAction<ChatSession>>;
  model: Model;
  onModels: () => void;
  onAttachments: () => void;
  onHistory: () => void;
  onNew: () => void;
  notify: (msg: string) => void;
  onComplete: (credits: number) => void;
  onUpgrade: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("working");
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    let alive = true;
    if (!session.id || session.messages.length) {
      Promise.resolve().then(() => {
        if (alive) setLoadingHistory(false);
      });
      return () => {
        alive = false;
      };
    }
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (alive) {
        setLoadingHistory(true);
        setError("");
      }
    });
    request<any[]>(
      "/conversation/" + session.id,
      "GET",
      undefined,
      controller.signal,
    )
      .then((rows) => {
        if (alive) {
          setLoadingHistory(false);
          setSession((prev) => ({
            ...prev,
            messages: rows.flatMap((row) => [
              { id: row._id + "-u", role: "user" as const, text: row.message },
              {
                id: row._id + "-a",
                role: "assistant" as const,
                text: row.response,
              },
            ]),
          }));
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoadingHistory(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [session.id, session.historyRequest, session.messages.length, setSession]);
  async function send(text = input.trim(), retryId?: string) {
    if (!text || busy || loadingHistory) return;
    const id = retryId || createMessageId();
    const attachments = session.attachments;
    setError("");
    setUpgrade(false);
    setInput("");
    setBusy(true);
    onBusy(true);
    setPhase("working");
    setSession((prev) => ({
      ...prev,
      messages: retryId
        ? prev.messages.map((m) => (m.id === id ? { ...m, failed: false } : m))
        : [...prev.messages, { id, role: "user", text }],
      attachments: [],
    }));
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await chat(
        {
          message: text,
          conversationId: session.id,
          model: model.id,
          attachedDocumentIds: attachments.map((item) => item._id),
        },
        setPhase,
        controller.signal,
      );
      setSession((prev) => ({
        ...prev,
        id: result.conversationId,
        messages: [
          ...prev.messages,
          { id: id + "-answer", role: "assistant", text: result.answer },
        ],
      }));
      onComplete(result.remainingCredits);
    } catch (e) {
      setError((e as Error).message);
      setUpgrade(e instanceof ApiError && e.needsUpgrade);
      setSession((prev) => ({
        ...prev,
        attachments,
        messages: prev.messages.map((m) =>
          m.id === id ? { ...m, failed: true } : m,
        ),
      }));
    } finally {
      setBusy(false);
      onBusy(false);
      abort.current = null;
    }
  }
  function fresh() {
    if (busy) {
      notify("Finish or stop the current answer first.");
      return;
    }
    setError("");
    setInput("");
    onNew();
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <View>
          <Label>YOUR THINKING PARTNER</Label>
          <Heading style={{ fontSize: 25, lineHeight: 34 }}>
            A little clarity.
          </Heading>
        </View>
        <View style={s.row}>
          <RoundButton
            name="clock"
            label="Conversation history"
            onPress={() =>
              busy
                ? notify("Finish or stop the current answer first.")
                : onHistory()
            }
          />
          <RoundButton name="plus" label="New conversation" onPress={fresh} />
        </View>
      </View>
      <Tap
        label="Select AI model"
        onPress={onModels}
        style={{ alignSelf: "flex-start", marginLeft: 24, marginBottom: 10 }}
      >
        <View style={styles.model}>
          <View style={styles.online} />
          <Body style={{ fontSize: 12, color: c.green }}>
            {model.name.replace(/ \(.*\)/, "")}
          </Body>
          <Icon name="chevron-down" size={14} color={c.green} />
        </View>
      </Tap>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.feed}
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: true })
        }
      >
        {loadingHistory ? (
          <ActivityIndicator style={{ margin: 30 }} />
        ) : !session.messages.length ? (
          <Enter style={styles.welcome}>
            <Orb size={90} />
            <Label style={{ marginTop: 14 }}>CONNECT THE DOTS</Label>
            <Heading style={{ textAlign: "center", fontSize: 28 }}>
              What’s on your mind?
            </Heading>
            <Body style={{ textAlign: "center", maxWidth: 270 }}>
              {
                "An idea, a question, a half-formed thought.\nLet’s make something of it."
              }
            </Body>
            <View style={{ width: "100%", gap: 10, marginTop: 24 }}>
              {[
                "Find connections in my saved memories",
                "Help me turn an idea into a plan",
                "Summarize the key ideas in my documents",
              ].map((prompt, i) => (
                <Tap
                  key={prompt}
                  label={prompt}
                  onPress={() => setInput(prompt)}
                >
                  <View style={styles.prompt}>
                    <Icon
                      name={
                        (["git-branch", "compass", "file-text"] as const)[i]
                      }
                      color={c.green}
                      size={18}
                    />
                    <Body style={{ flex: 1, color: c.ink, fontSize: 13 }}>
                      {prompt}
                    </Body>
                    <Icon name="arrow-up-right" size={16} color={c.muted} />
                  </View>
                </Tap>
              ))}
            </View>
          </Enter>
        ) : (
          session.messages.map((m) => (
            <Enter
              key={m.id}
              style={[
                styles.message,
                m.role === "user" ? styles.userMessage : styles.aiMessage,
              ]}
            >
              {m.role === "assistant" && (
                <View style={[s.row, { marginBottom: 10 }]}>
                  <Orb size={25} active={false} />
                  <Label style={{ color: c.green, letterSpacing: 1 }}>
                    WEBMIND
                  </Label>
                </View>
              )}
              {m.role === "assistant" ? (
                <Markdown style={markdown}>{m.text}</Markdown>
              ) : (
                <Text selectable style={styles.userText}>
                  {m.text}
                </Text>
              )}
              {m.failed && (
                <Button
                  compact
                  textColor={c.danger}
                  disabled={busy}
                  onPress={() => send(m.text, m.id)}
                >
                  Retry message
                </Button>
              )}
              {m.role === "assistant" && (
                <Tap
                  label="Share answer"
                  onPress={() => {
                    Share.share({ message: m.text }).catch(() =>
                      notify("Sharing is unavailable."),
                    );
                  }}
                >
                  <View style={{ paddingTop: 10, alignSelf: "flex-end" }}>
                    <Icon name="share-2" size={15} color={c.muted} />
                  </View>
                </Tap>
              )}
            </Enter>
          ))
        )}
        {busy && (
          <Enter
            style={[
              styles.aiMessage,
              { flexDirection: "row", alignItems: "center", gap: 14 },
            ]}
          >
            <Orb size={38} />
            <View style={{ flex: 1 }}>
              <Body style={{ color: c.green, fontFamily: "DMSans_500Medium" }}>
                {phase === "searching"
                  ? "Connecting your memories…"
                  : phase === "solving"
                    ? "Making sense of it all…"
                    : "Taking in your thought…"}
              </Body>
              <Body style={{ fontSize: 11 }}>
                A little space for a thoughtful answer.
              </Body>
            </View>
          </Enter>
        )}
        {!!error && (
          <View
            accessibilityLiveRegion="polite"
            style={{
              padding: 14,
              backgroundColor: "#F8EDE9",
              borderRadius: 16,
            }}
          >
            <Body style={{ color: c.danger }}>{error}</Body>
            {upgrade && <Button onPress={onUpgrade}>Explore plans</Button>}
            {!session.messages.length && session.id && (
              <Button
                onPress={() => {
                  setSession((prev) => ({
                    ...prev,
                    historyRequest: (prev.historyRequest || 0) + 1,
                  }));
                }}
              >
                Retry loading
              </Button>
            )}
          </View>
        )}
      </ScrollView>
      <View style={styles.composer}>
        {!!session.attachments.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
          >
            {session.attachments.map((item) => (
              <Chip
                key={item._id}
                compact
                onClose={() =>
                  setSession((prev) => ({
                    ...prev,
                    attachments: prev.attachments.filter(
                      (m) => m._id !== item._id,
                    ),
                  }))
                }
                style={{ backgroundColor: c.sage }}
              >
                {item.title || "Untitled"}
              </Chip>
            ))}
          </ScrollView>
        )}
        <TextInput
          accessibilityLabel="Message WebMind"
          placeholder="Let a thought land here…"
          placeholderTextColor={c.muted}
          value={input}
          onChangeText={(value) => {
            setInput(value);
            if (value.endsWith("@")) onAttachments();
          }}
          multiline
          maxLength={10000}
          style={styles.textarea}
          editable={!loadingHistory}
        />
        <View style={s.between}>
          <Tap label="Attach saved memories" onPress={onAttachments}>
            <View style={[s.row, { padding: 8 }]}>
              <Icon name="paperclip" size={19} color={c.green} />
              <Body style={{ fontSize: 11 }}>Your memories</Body>
            </View>
          </Tap>
          {busy ? (
            <RoundButton
              name="square"
              label="Stop generating"
              onPress={() => abort.current?.abort()}
            />
          ) : (
            <Tap
              label="Send message"
              disabled={!input.trim() || loadingHistory}
              onPress={() => send()}
            >
              <View style={styles.send}>
                <Icon name="arrow-up" color="#FFF" size={22} />
              </View>
            </Tap>
          )}
        </View>
      </View>
      <Body
        style={{
          textAlign: "center",
          fontSize: 9,
          lineHeight: 17,
          marginBottom: 4,
        }}
      >
        A thoughtful assistant. Always give important answers a second look.
      </Body>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  model: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#E9EEE4",
  },
  online: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.green },
  feed: { padding: 24, paddingTop: 12, gap: 18, flexGrow: 1 },
  welcome: { alignItems: "center", gap: 10, paddingTop: 25, paddingBottom: 18 },
  prompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: c.paper,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.line,
  },
  message: { maxWidth: "100%" },
  userMessage: {
    padding: 16,
    backgroundColor: c.green,
    borderRadius: 22,
    borderBottomRightRadius: 5,
    alignSelf: "flex-end",
    maxWidth: "88%",
  },
  aiMessage: {
    padding: 20,
    backgroundColor: c.paper,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.line,
  },
  userText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#FFF",
    lineHeight: 23,
  },
  composer: {
    marginHorizontal: 18,
    marginBottom: 4,
    padding: 14,
    backgroundColor: c.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D8DED2",
  },
  textarea: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: c.ink,
    minHeight: 42,
    maxHeight: 110,
    padding: 4,
    paddingBottom: 10,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: c.green,
    alignItems: "center",
    justifyContent: "center",
  },
});
const markdown = StyleSheet.create({
  body: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: c.ink,
    lineHeight: 24,
  },
  heading1: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 23,
    lineHeight: 30,
    marginVertical: 12,
  },
  heading2: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 20,
    marginVertical: 10,
  },
  heading3: { fontFamily: "Manrope_600SemiBold", fontSize: 17 },
  code_inline: { backgroundColor: c.bg, color: c.green },
  fence: {
    backgroundColor: c.bg,
    borderColor: c.line,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
  },
  link: { color: c.green },
  blockquote: {
    backgroundColor: c.bg,
    borderColor: c.sage,
    borderLeftWidth: 3,
  },
});
