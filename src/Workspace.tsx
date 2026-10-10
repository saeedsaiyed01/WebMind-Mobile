import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Button, Chip, Searchbar, ActivityIndicator } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
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
  s,
  IconName,
} from "./components";
import { colors as c } from "./theme";

const memoryIcons: Record<string, IconName> = {
  note: "edit-3",
  website: "link",
  document: "file-text",
  tweet: "twitter",
  video: "play-circle",
};
const memoryTints: Record<string, string> = {
  note: "#EFEAD8",
  website: "#E0EADD",
  document: "#E5E8F0",
  tweet: "#E8E3ED",
};
export function MemoryRow({
  item,
  onPress,
  compact = false,
}: {
  item: Memory;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Tap label={`Open ${item.title || "untitled memory"}`} onPress={onPress}>
      <View style={[styles.memory, compact && { padding: 16 }]}>
        <View style={s.row}>
          <View
            style={[
              styles.typeIcon,
              { backgroundColor: memoryTints[item.type] || c.sage },
            ]}
          >
            <Icon
              name={memoryIcons[item.type] || "bookmark"}
              size={18}
              color={c.green}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.memoryTitle}>
              {item.title || "Untitled memory"}
            </Text>
            <Body lines={1} style={{ fontSize: 11 }}>
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
            style={{ marginTop: 14, fontSize: 13, color: "#747B70" }}
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
          tintColor={c.green}
        />
      }
    >
      <Enter style={s.between}>
        <View style={s.row}>
          <Orb size={34} active={false} />
          <Text style={styles.wordmark}>
            webmind<Text style={{ color: c.orange }}>.</Text>
          </Text>
        </View>
        <Tap label="Open account" onPress={account}>
          <View style={styles.avatar}>
            <Text style={{ color: c.green, fontFamily: "Manrope_600SemiBold" }}>
              {name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        </Tap>
      </Enter>
      <Enter delay={60}>
        <Label>
          {greeting}, {name}
        </Label>
        <Heading style={{ fontSize: 34, lineHeight: 44, marginTop: 9 }}>
          {"A clearer mind.\nA brighter next step."}
        </Heading>
        <Body style={{ marginTop: 8 }}>
          Your ideas have a home. Let’s see where they lead.
        </Body>
      </Enter>
      <Enter delay={120}>
        <Tap label="Start a conversation" onPress={() => startChat()}>
          <LinearGradient colors={["#354B3B", "#253B2D"]} style={styles.hero}>
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
              <Label style={{ color: "#B9C8AE", fontSize: 9 }}>
                A THOUGHTFUL LITTLE ASSISTANT
              </Label>
              <Heading style={{ color: "#FFF", fontSize: 25, lineHeight: 33 }}>
                {"Big questions.\nFresh perspectives."}
              </Heading>
              <Body style={{ color: "#C1CCB9", fontSize: 12 }}>
                Ask, explore, and connect what you know.
              </Body>
              <View style={[s.row, { marginTop: 7 }]}>
                <View
                  style={{
                    backgroundColor: c.lime,
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: c.green,
                      fontSize: 12,
                      fontFamily: "DMSans_500Medium",
                    }}
                  >
                    Let’s think together ↗
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Tap>
      </Enter>
      <Enter delay={180} style={{ flexDirection: "row", gap: 12 }}>
        <View style={[styles.stat, { flex: 1 }]}>
          <Icon name="layers" size={18} color={c.green} />
          <Text style={styles.statValue}>
            {memories.length.toString().padStart(2, "0")}
          </Text>
          <Label style={{ fontSize: 9, letterSpacing: 1 }}>
            SAVED MEMORIES
          </Label>
        </View>
        <Tap
          label="View credits and plans"
          onPress={account}
          style={{ flex: 1 }}
        >
          <View style={styles.stat}>
            <Icon name="zap" size={18} color={c.orange} />
            <Text style={styles.statValue}>
              {plan?.credits ?? user.credits}
            </Text>
            <Label style={{ fontSize: 9, letterSpacing: 1 }}>
              IDEAS LEFT TO EXPLORE
            </Label>
          </View>
        </Tap>
      </Enter>
      {!!error && (
        <View style={[s.card, { backgroundColor: "#FAEEEA" }]}>
          <Body style={{ color: c.danger }}>{error}</Body>
          <Button onPress={refresh}>Retry</Button>
        </View>
      )}
      <Enter delay={220}>
        <View style={[s.between, { marginBottom: 16 }]}>
          <View>
            <Label>COLLECTED ALONG THE WAY</Label>
            <Heading style={{ fontSize: 23, lineHeight: 32, marginTop: 3 }}>
              Your recent memories
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
                style={{ color: c.green, textAlign: "center", padding: 12 }}
              >
                A little more to explore →
              </Body>
            </Tap>
          </View>
        ) : (
          <View
            style={[
              s.card,
              {
                borderStyle: "dashed",
                backgroundColor: "#F0F2E9",
                alignItems: "center",
                gap: 12,
              },
            ]}
          >
            <Icon name="bookmark" color={c.green} size={25} />
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
          <Label style={{ marginBottom: 14 }}>PICK UP A THOUGHT</Label>
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
                <Icon name="message-circle" size={18} color={c.green} />
                <Body lines={1} style={{ flex: 1, color: c.ink }}>
                  {conv.title}
                </Body>
                <Icon name="arrow-right" size={16} color={c.muted} />
              </View>
            </Tap>
          ))}
        </Enter>
      )}
      <Body style={{ textAlign: "center", fontSize: 10, paddingTop: 4 }}>
        A calm place for a curious mind.
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
            <Label>YOUR PERSONAL CONSTELLATION</Label>
            <Heading style={{ marginTop: 6 }}>The memory library.</Heading>
          </View>
          <RoundButton name="plus" label="Add memory" onPress={add} dark />
        </View>
        <Searchbar
          placeholder="Find a thought, link, or document"
          accessibilityLabel="Search memories"
          value={query}
          onChangeText={setQuery}
          style={{ backgroundColor: "#EEF0E8", borderRadius: 16 }}
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
              backgroundColor: filter === id ? c.sage : c.paper,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            {title}
          </Chip>
        ))}
      </ScrollView>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={c.green}
          />
        }
        contentContainerStyle={{ padding: 24, paddingTop: 0, gap: 12 }}
      >
        <Label style={{ marginBottom: 4 }}>
          {filtered.length} {filtered.length === 1 ? "MEMORY" : "MEMORIES"} ·
          ALWAYS WITH YOU
        </Label>
        {!!error && (
          <View style={s.card}>
            <Body style={{ color: c.danger }}>{error}</Body>
            <Button onPress={refresh}>Retry</Button>
          </View>
        )}
        {loading ? (
          <ActivityIndicator style={{ margin: 40 }} />
        ) : filtered.length ? (
          filtered.map((item) => (
            <MemoryRow
              key={item._id}
              item={item}
              onPress={() => openMemory(item)}
            />
          ))
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
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
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
    backgroundColor: c.sage,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  hero: { padding: 24, borderRadius: 26, overflow: "hidden", minHeight: 233 },
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
