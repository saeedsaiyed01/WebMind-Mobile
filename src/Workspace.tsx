import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  FlatList,
} from "react-native";
import { Button, Chip, Searchbar, ActivityIndicator } from "react-native-paper";
import { Memory, Conversation, User, Plan } from "./api";
import {
  Body,
  Heading,
  Label,
  Orb,
  Icon,
  Tap,
  RoundButton,
  Enter,
  Empty,
  useSharedStyles,
  IconName,
} from "./components";
import { useAppTheme, useThemedStyles, type Palette } from "./theme";

const memoryIcons: Record<string, IconName> = {
  note: "edit-3",
  website: "link",
  document: "file-text",
  tweet: "twitter",
  video: "play-circle",
};
const memoryTints = (c: Palette): Record<string, string> => ({
  note: c.highlight,
  website: c.subtle,
  document: c.accentSoft,
  tweet: c.subtle,
});
export function MemoryRow({
  item,
  onPress,
  compact = false,
}: {
  item: Memory;
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors: c } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const s = useSharedStyles();

  return (
    <Tap label={`Open ${item.title || "untitled memory"}`} onPress={onPress}>
      <View style={[styles.memory, compact && { padding: 16 }]}>
        <View style={s.row}>
          <View
            style={[
              styles.typeIcon,
              { backgroundColor: memoryTints(c)[item.type] || c.accentSoft },
            ]}
          >
            <Icon
              name={memoryIcons[item.type] || "bookmark"}
              size={18}
              color={c.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.memoryTitle}>
              {item.title || "Untitled memory"}
            </Text>
            <Body lines={1} style={{ fontSize: 12 }}>
              {item.type === "document"
                ? "PDF document"
                : item.type === "website"
                  ? "Saved link"
                  : item.type === "tweet"
                    ? "Saved tweet"
                    : "Personal note"}{" "}
              ·{" "}
              {item.timestamp
                ? new Date(item.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "Saved"}
            </Body>
          </View>
          <Icon name="arrow-up-right" size={17} color={c.muted} />
        </View>
        {!compact && (
          <Body
            lines={3}
            style={{ marginTop: 14, fontSize: 13, color: c.muted }}
          >
            {item.type === "document"
              ? item.extractedText?.slice(0, 200) ||
                item.fileMetadata?.originalName ||
                "Ready to explore with AI."
              : item.link}
          </Body>
        )}
      </View>
    </Tap>
  );
}
export function Workspace({
  user,
  plan,
  memories,
  conversations,
  loading,
  refreshing,
  error,
  refresh,
  add,
  openMemory,
  startChat,
  openConversation,
  library,
  account,
}: {
  user: User;
  plan: Plan | null;
  memories: Memory[];
  conversations: Conversation[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => void;
  add: () => void;
  openMemory: (m: Memory) => void;
  startChat: (prompt?: string) => void;
  openConversation: (id: string) => void;
  library: () => void;
  account: () => void;
}) {
  const { colors: c } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const s = useSharedStyles();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name =
    user.name?.split(" ")[0] ||
    user.username.split("@")[0].split(/[._-]/)[0].slice(0, 20);
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={c.accent}
        />
      }
    >
      <Enter style={s.between}>
        <View style={s.row}>
          <Orb size={34} active={false} />
          <Text style={styles.wordmark}>
            webmind<Text style={{ color: c.secondary }}>.</Text>
          </Text>
        </View>
        <Tap label="Open account" onPress={account}>
          <View style={styles.avatar}>
            <Text
              style={{ color: c.accent, fontFamily: "Manrope_600SemiBold" }}
            >
              {name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        </Tap>
      </Enter>
      <Enter delay={60}>
        <Label>
          {greeting}, {name}
        </Label>
        <Heading style={{ fontSize: 28, lineHeight: 36, marginTop: 8 }}>
          Your workspace
        </Heading>
        <Body style={{ marginTop: 8 }}>
          Everything you saved. Ready to put to work.
        </Body>
      </Enter>
      <Enter delay={120}>
        <Tap label="Start a conversation" onPress={() => startChat()}>
          <View style={styles.hero}>
            <View
              style={{
                position: "absolute",
                right: -15,
                top: 20,
                opacity: 0.5,
              }}
            >
              <Orb size={135} />
            </View>
            <View style={{ maxWidth: "73%", gap: 14 }}>
              <Label style={{ color: c.onAccent, fontSize: 12 }}>
                BUILT AROUND YOUR KNOWLEDGE
              </Label>
              <Heading
                style={{ color: c.onAccent, fontSize: 25, lineHeight: 33 }}
              >
                {"Your next idea\nstarts here."}
              </Heading>
              <Body style={{ color: c.onAccent, fontSize: 14 }}>
                Ask, explore, and connect what you know.
              </Body>
              <View style={[s.row, { marginTop: 7 }]}>
                <View
                  style={{
                    backgroundColor: c.highlight,
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: c.accent,
                      fontSize: 12,
                      fontFamily: "DMSans_500Medium",
                    }}
                  >
                    Start a chat ↗
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Tap>
      </Enter>
      <Enter delay={180} style={{ flexDirection: "row", gap: 12 }}>
        <View style={[styles.stat, { flex: 1 }]}>
          <Icon name="layers" size={18} color={c.accent} />
          <Text style={styles.statValue}>
            {memories.length.toString().padStart(2, "0")}
          </Text>
          <Label style={{ fontSize: 12, letterSpacing: 1 }}>
            SAVED MEMORIES
          </Label>
        </View>
        <Tap
          label="View credits and plans"
          onPress={account}
          style={{ flex: 1 }}
        >
          <View style={styles.stat}>
            <Icon name="zap" size={18} color={c.secondary} />
            <Text style={styles.statValue}>
              {plan?.credits ?? user.credits}
            </Text>
            <Label style={{ fontSize: 12, letterSpacing: 1 }}>
              AVAILABLE CREDITS
            </Label>
          </View>
        </Tap>
      </Enter>
      {!!error && (
        <View style={[s.card, { backgroundColor: c.dangerSoft }]}>
          <Body style={{ color: c.danger }}>{error}</Body>
          <Button onPress={refresh}>Retry</Button>
        </View>
      )}
      <Enter delay={220}>
        <View style={[s.between, { marginBottom: 16 }]}>
          <View>
            <Label>RECENTLY SAVED</Label>
            <Heading style={{ fontSize: 23, lineHeight: 32, marginTop: 3 }}>
              Recent memories
            </Heading>
          </View>
          <RoundButton name="plus" label="Add a memory" onPress={add} dark />
        </View>
        {loading ? (
          <ActivityIndicator style={{ margin: 28 }} />
        ) : memories.length ? (
          <View style={{ gap: 10 }}>
            {memories.slice(0, 3).map((m) => (
              <MemoryRow
                key={m._id}
                item={m}
                onPress={() => openMemory(m)}
                compact
              />
            ))}
            <Tap label="View all memories" onPress={library}>
              <Body
                style={{ color: c.accent, textAlign: "center", padding: 12 }}
              >
                View all memories →
              </Body>
            </Tap>
          </View>
        ) : (
          <View
            style={[
              s.card,
              {
                borderStyle: "dashed",
                backgroundColor: c.subtle,
                alignItems: "center",
                gap: 12,
              },
            ]}
          >
            <Icon name="bookmark" color={c.accent} size={25} />
            <Heading style={{ fontSize: 20, lineHeight: 27 }}>
              Every idea starts somewhere.
            </Heading>
            <Body style={{ textAlign: "center", fontSize: 12 }}>
              A note, a link, a document. Save your first spark.
            </Body>
            <Button mode="text" onPress={add}>
              Add your first memory +
            </Button>
          </View>
        )}
      </Enter>
      {!!conversations.length && (
        <Enter delay={260}>
          <Label style={{ marginBottom: 14 }}>RECENT CONVERSATIONS</Label>
          {conversations.slice(0, 2).map((conv) => (
            <Tap
              key={conv._id}
              label={`Continue ${conv.title}`}
              onPress={() => openConversation(conv._id)}
            >
              <View
                style={{
                  paddingVertical: 13,
                  borderBottomWidth: 1,
                  borderColor: c.line,
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <Icon name="message-circle" size={18} color={c.accent} />
                <Body lines={1} style={{ flex: 1, color: c.ink }}>
                  {conv.title}
                </Body>
                <Icon name="arrow-right" size={16} color={c.muted} />
              </View>
            </Tap>
          ))}
        </Enter>
      )}
      <Body style={{ textAlign: "center", fontSize: 12, paddingTop: 4 }}>
        Your knowledge. Always within reach.
      </Body>
    </ScrollView>
  );
}
export function Library({
  memories,
  loading,
  refreshing,
  error,
  refresh,
  openMemory,
  add,
}: {
  memories: Memory[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => void;
  openMemory: (m: Memory) => void;
  add: () => void;
}) {
  const { colors: c } = useAppTheme();
  const s = useSharedStyles();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = memories.filter(
    (m) =>
      (filter === "all" || m.type === filter) &&
      `${m.title} ${m.link} ${m.type}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 24, paddingBottom: 14, gap: 16 }}>
        <View style={s.between}>
          <View>
            <Label>YOUR KNOWLEDGE</Label>
            <Heading style={{ marginTop: 6 }}>Library</Heading>
          </View>
          <RoundButton name="plus" label="Add memory" onPress={add} dark />
        </View>
        <Searchbar
          placeholder="Search notes, links, and documents"
          accessibilityLabel="Search memories"
          value={query}
          onChangeText={setQuery}
          style={{ backgroundColor: c.subtle, borderRadius: 16 }}
          inputStyle={{
            fontSize: 13,
            fontFamily: "DMSans_400Regular",
            minHeight: 44,
          }}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: 14 }}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
      >
        {[
          ["all", "Everything"],
          ["note", "Notes"],
          ["website", "Links"],
          ["document", "PDFs"],
          ["tweet", "Tweets"],
        ].map(([id, title]) => (
          <Chip
            key={id}
            selected={filter === id}
            onPress={() => setFilter(id)}
            style={{
              backgroundColor: filter === id ? c.accentSoft : c.paper,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            {title}
          </Chip>
        ))}
      </ScrollView>
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <MemoryRow item={item} onPress={() => openMemory(item)} />
        )}
        refreshing={refreshing}
        onRefresh={refresh}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        windowSize={7}
        contentContainerStyle={{ padding: 24, paddingTop: 0, gap: 12 }}
        ListHeaderComponent={
          <>
            <Label style={{ marginBottom: 4 }}>
              {filtered.length} {filtered.length === 1 ? "MEMORY" : "MEMORIES"}{" "}
              · ALWAYS WITH YOU
            </Label>
            {!!error && (
              <View style={s.card}>
                <Body style={{ color: c.danger }}>{error}</Body>
                <Button onPress={refresh}>Retry</Button>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ margin: 40 }} />
          ) : (
            <Empty
              icon="bookmark"
              title={
                query || filter !== "all"
                  ? "No memories found."
                  : "A blank page. A fresh start."
              }
              detail={
                query
                  ? "Try another word, or explore a different collection."
                  : "Collect the things that move you. WebMind will help you connect them."
              }
              action={<Button onPress={add}>Save a memory</Button>}
            />
          )
        }
      />
    </View>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    page: { padding: 24, gap: 26, paddingBottom: 30 },
    wordmark: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 22,
      letterSpacing: -1,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: c.paper,
    },
    hero: {
      padding: 24,
      borderRadius: 24,
      overflow: "hidden",
      minHeight: 232,
      backgroundColor: c.ink,
    },
    stat: {
      borderRadius: 22,
      borderColor: c.line,
      borderWidth: 1,
      backgroundColor: c.paper,
      padding: 18,
      gap: 8,
    },
    statValue: {
      fontFamily: "Manrope_600SemiBold",
      fontSize: 29,
      color: c.ink,
      letterSpacing: -1,
    },
    memory: {
      padding: 20,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 22,
    },
    typeIcon: {
      height: 42,
      width: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    memoryTitle: {
      fontFamily: "Manrope_600SemiBold",
      color: c.ink,
      fontSize: 14,
      marginBottom: 3,
    },
  });
