import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Button, Chip } from "react-native-paper";
import { type Model } from "./api";
import {
  Body,
  Heading,
  Orb,
  Icon,
  Tap,
  RoundButton,
  useSharedStyles,
} from "./components";
import { useAppTheme, useThemedStyles, type Palette } from "./theme";
import { useChat } from "./chat/useChat";
import { ChatMessage } from "./chat/ChatMessage";
import type { ChatSession, Message } from "./chat/session";
export type { ChatSession } from "./chat/session";

const suggestions = [
  {
    icon: "layers" as const,
    title: "Connect my memories",
    prompt: "Find connections in my saved memories",
  },
  {
    icon: "compass" as const,
    title: "Build a plan",
    prompt: "Help me turn an idea into a plan",
  },
  {
    icon: "file-text" as const,
    title: "Summarize a document",
    prompt: "Summarize the key ideas in my documents",
  },
];

export function ChatScreen(props: {
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
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const s = useSharedStyles();

  const {
    session,
    setSession,
    model,
    onModels,
    onAttachments,
    onHistory,
    onNew,
    notify,
    onUpgrade,
  } = props;
  const {
    input,
    setInput,
    busy,
    phase,
    error,
    upgrade,
    loadingHistory,
    historyFailed,
    send,
    stop,
    retryHistory,
  } = useChat(props);
  const feed = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const nearBottom = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const [focused, setFocused] = useState(false);
  const jumpToLatest = () => {
    nearBottom.current = true;
    setShowLatest(false);
    feed.current?.scrollToEnd({ animated: true });
  };
  const guard = (action: () => void) =>
    busy ? notify("Stop the current response first.") : action();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior="padding"
      enabled={Platform.OS !== "web"}
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.header}>
        <RoundButton
          name="sidebar"
          label="Conversation history"
          onPress={() => guard(onHistory)}
        />
        <View style={styles.headerTitle}>
          <Text style={styles.title}>WebMind</Text>
          <Body style={styles.subtitle}>
            {session.id ? "Conversation" : "New conversation"}
          </Body>
        </View>
        <RoundButton
          name="edit"
          label="New conversation"
          onPress={() => guard(onNew)}
        />
      </View>
      <View style={styles.feedWrap}>
        <FlatList
          ref={feed}
          data={session.messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatMessage
              message={item}
              busy={busy}
              retry={() => send(item.text, item)}
              notify={notify}
            />
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.feed}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          onScroll={({
            nativeEvent: { layoutMeasurement, contentOffset, contentSize },
          }) => {
            nearBottom.current =
              contentSize.height - layoutMeasurement.height - contentOffset.y <
              100;
            setShowLatest(!nearBottom.current);
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (nearBottom.current)
              feed.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={
            loadingHistory ? (
              <ActivityIndicator style={{ margin: 32 }} />
            ) : session.id ? null : (
              <View style={styles.welcome}>
                <Orb size={56} active={false} />
                <Heading style={styles.welcomeTitle}>
                  What can we work on?
                </Heading>
                <Body style={styles.welcomeBody}>
                  Turn your saved knowledge into your next idea.
                </Body>
                <View style={styles.suggestions}>
                  {suggestions.map((item) => (
                    <Tap
                      key={item.title}
                      label={item.prompt}
                      onPress={() => {
                        setInput(item.prompt);
                        inputRef.current?.focus();
                      }}
                    >
                      <View style={styles.suggestion}>
                        <View style={styles.suggestionIcon}>
                          <Icon name={item.icon} size={20} color={c.accent} />
                        </View>
                        <Body style={{ flex: 1, color: c.ink }}>
                          {item.title}
                        </Body>
                        <Icon name="arrow-up-right" size={16} color={c.muted} />
                      </View>
                    </Tap>
                  ))}
                </View>
              </View>
            )
          }
          ListFooterComponent={
            <>
              {busy && (
                <View accessibilityLiveRegion="polite" style={styles.progress}>
                  <Orb size={28} />
                  <Body>
                    {phase === "searching"
                      ? "Searching your memories…"
                      : phase === "solving"
                        ? "Writing your response…"
                        : "Thinking…"}
                  </Body>
                </View>
              )}
              {!!error && (
                <View accessibilityLiveRegion="polite" style={styles.error}>
                  <Body style={{ color: c.danger }}>{error}</Body>
                  {upgrade && <Button onPress={onUpgrade}>View plans</Button>}
                  {historyFailed && (
                    <Button onPress={retryHistory}>Retry loading</Button>
                  )}
                </View>
              )}
            </>
          }
        />
        {showLatest && (
          <View style={styles.latest}>
            <RoundButton
              name="arrow-down"
              label="Jump to latest message"
              onPress={jumpToLatest}
            />
          </View>
        )}
      </View>
      <View style={[styles.composer, focused && styles.composerFocused]}>
        {!!session.attachments.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
          >
            {session.attachments.map((item) => (
              <Chip
                key={item._id}
                icon="file-document-outline"
                onClose={() =>
                  setSession((prev) => ({
                    ...prev,
                    attachments: prev.attachments.filter(
                      (m) => m._id !== item._id,
                    ),
                  }))
                }
                style={{ backgroundColor: c.accentSoft }}
                textStyle={{ maxWidth: 180 }}
              >
                {item.title || "Untitled"}
              </Chip>
            ))}
          </ScrollView>
        )}
        <TextInput
          ref={inputRef}
          accessibilityLabel="Message WebMind"
          placeholder="Ask anything, or @ a memory"
          placeholderTextColor={c.muted}
          value={input}
          onChangeText={(value) => {
            setInput(value);
            if (value.endsWith("@") && !busy) onAttachments();
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          maxLength={10000}
          style={styles.textarea}
          editable={!loadingHistory && !historyFailed}
        />
        <View style={s.between}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
            }}
          >
            <RoundButton
              name="plus"
              label="Attach saved memories"
              onPress={onAttachments}
            />
            <Tap
              label="Select AI model"
              onPress={() => guard(onModels)}
              style={{ flexShrink: 1 }}
            >
              <View style={styles.model}>
                <Body lines={1} style={styles.modelName}>
                  {model.name.replace(/ \(.*\)/, "")}
                </Body>
                <Icon name="chevron-down" size={14} color={c.muted} />
              </View>
            </Tap>
          </View>
          <Tap
            label={busy ? "Stop generating" : "Send message"}
            disabled={
              !busy && (!input.trim() || loadingHistory || historyFailed)
            }
            onPress={
              busy
                ? stop
                : () => {
                    nearBottom.current = true;
                    send(input);
                  }
            }
          >
            <View style={styles.send}>
              <Icon
                name={busy ? "square" : "arrow-up"}
                color={c.onAccent}
                size={20}
              />
            </View>
          </Tap>
        </View>
      </View>
      <Body style={styles.footnote}>
        AI can make mistakes. Check important details.
      </Body>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderColor: c.line,
    },
    headerTitle: { flex: 1 },
    title: { fontFamily: "Manrope_600SemiBold", fontSize: 18, color: c.ink },
    subtitle: { fontSize: 12, lineHeight: 20 },
    feedWrap: { flex: 1 },
    feed: { padding: 20, gap: 24, flexGrow: 1, paddingBottom: 24 },
    welcome: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      gap: 16,
    },
    welcomeTitle: {
      textAlign: "center",
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.6,
    },
    welcomeBody: { textAlign: "center", maxWidth: 280 },
    suggestions: { width: "100%", maxWidth: 440, gap: 8, marginTop: 16 },
    suggestion: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      backgroundColor: c.paper,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
    },
    suggestionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    progress: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    error: { padding: 16, backgroundColor: c.dangerSoft, borderRadius: 16 },
    latest: { position: "absolute", bottom: 12, alignSelf: "center" },
    composer: {
      marginHorizontal: 16,
      padding: 12,
      backgroundColor: c.paper,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.line,
    },
    composerFocused: { borderColor: c.accent },
    textarea: {
      fontSize: 16,
      fontFamily: "DMSans_400Regular",
      color: c.ink,
      minHeight: 52,
      maxHeight: 144,
      padding: 8,
      textAlignVertical: "top",
    },
    model: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 44,
      paddingHorizontal: 12,
      gap: 8,
      maxWidth: "100%",
    },
    modelName: { fontSize: 12, flexShrink: 1, color: c.ink },
    send: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },
    footnote: {
      textAlign: "center",
      fontSize: 12,
      lineHeight: 20,
      paddingVertical: 8,
    },
  });
