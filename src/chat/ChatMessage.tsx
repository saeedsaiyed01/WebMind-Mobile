import React, { memo } from "react";
import {
  View,
  Text,
  Share,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Button } from "react-native-paper";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import { Body, Orb, Icon, Tap } from "../components";
import { useAppTheme, useThemedStyles, type Palette } from "../theme";
import type { Message } from "./session";

export const ChatMessage = memo(function ChatMessage({
  message,
  busy,
  retry,
  notify,
}: {
  message: Message;
  busy: boolean;
  retry: () => void;
  notify: (message: string) => void;
}) {
  const { colors: c } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const markdown = useThemedStyles(makeMarkdown);

  const assistant = message.role === "assistant";
  return (
    <View style={assistant ? styles.assistant : styles.user}>
      {assistant && (
        <View style={styles.identity}>
          <Orb size={24} active={false} />
          <Text style={styles.name}>WebMind</Text>
        </View>
      )}
      {assistant ? (
        <Markdown
          style={markdown}
          rules={{
            fence: (node) => (
              <View key={node.key} style={styles.code}>
                <View style={styles.codeHeader}>
                  <Body style={{ fontSize: 12 }}>Code</Body>
                  <Tap
                    label="Copy code"
                    onPress={() => {
                      Clipboard.setStringAsync(node.content)
                        .then(() => notify("Code copied."))
                        .catch(() => notify("Could not copy code."));
                    }}
                  >
                    <View style={styles.copyCode}>
                      <Icon name="copy" size={16} color={c.muted} />
                      <Body style={{ fontSize: 12 }}>Copy</Body>
                    </View>
                  </Tap>
                </View>
                <ScrollView horizontal>
                  <Text selectable style={styles.codeText}>
                    {node.content.replace(/\n$/, "")}
                  </Text>
                </ScrollView>
              </View>
            ),
          }}
        >
          {message.text}
        </Markdown>
      ) : (
        <Text selectable style={styles.userText}>
          {message.text}
        </Text>
      )}
      {!!message.attachments?.length && (
        <View style={{ marginTop: 8, gap: 4 }}>
          {message.attachments.map((item) => (
            <Body key={item._id} lines={1} style={{ fontSize: 12 }}>
              <Icon name="paperclip" size={12} color={c.muted} /> {item.title}
            </Body>
          ))}
        </View>
      )}
      {message.failed && (
        <Button compact disabled={busy} textColor={c.danger} onPress={retry}>
          Retry message
        </Button>
      )}
      {assistant && (
        <View style={styles.actions}>
          <Tap
            label="Copy answer"
            onPress={() => {
              Clipboard.setStringAsync(message.text)
                .then(() => notify("Answer copied."))
                .catch(() => notify("Could not copy answer."));
            }}
          >
            <View style={styles.action}>
              <Icon name="copy" size={18} color={c.muted} />
            </View>
          </Tap>
          <Tap
            label="Share answer"
            onPress={() => {
              Share.share({ message: message.text }).catch(() =>
                notify("Sharing is unavailable."),
              );
            }}
          >
            <View style={styles.action}>
              <Icon name="share-2" size={18} color={c.muted} />
            </View>
          </Tap>
        </View>
      )}
    </View>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    assistant: { width: "100%" },
    identity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    name: { fontFamily: "DMSans_500Medium", fontSize: 14, color: c.ink },
    user: {
      alignSelf: "flex-end",
      maxWidth: "90%",
      backgroundColor: c.subtle,
      borderRadius: 20,
      borderBottomRightRadius: 8,
      padding: 16,
    },
    userText: {
      color: c.ink,
      fontFamily: "DMSans_400Regular",
      fontSize: 16,
      lineHeight: 24,
    },
    actions: { flexDirection: "row", gap: 4, marginTop: 4 },
    action: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    code: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.subtle,
      overflow: "hidden",
      marginVertical: 8,
    },
    codeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 16,
      paddingRight: 4,
      borderBottomWidth: 1,
      borderColor: c.line,
    },
    copyCode: {
      minHeight: 44,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    codeText: {
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      fontSize: 14,
      lineHeight: 24,
      color: c.ink,
      padding: 16,
    },
  });

const makeMarkdown = (c: Palette) =>
  StyleSheet.create({
    body: {
      fontFamily: "DMSans_400Regular",
      color: c.ink,
      fontSize: 16,
      lineHeight: 26,
    },
    heading1: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 24,
      lineHeight: 32,
      marginVertical: 12,
    },
    heading2: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 20,
      lineHeight: 28,
      marginVertical: 12,
    },
    heading3: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 18,
      lineHeight: 26,
      marginVertical: 8,
    },
    code_inline: { backgroundColor: c.subtle, color: c.accent },
    link: { color: c.accent },
    blockquote: {
      backgroundColor: c.accentSoft,
      borderColor: c.accent,
      borderLeftWidth: 3,
      paddingHorizontal: 12,
    },
    table: { borderColor: c.line, borderRadius: 8 },
    th: { padding: 8, backgroundColor: c.subtle },
    td: { padding: 8 },
  });
