import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  AppState,
  BackHandler,
  Keyboard,
  Platform,
  TextInput as NativeTextInput,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  PaperProvider,
  Snackbar,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
} from "react-native-paper";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Auth } from "./Auth";
import { Workspace, Library } from "./Workspace";
import { Account } from "./Account";
import { ChatScreen, ChatSession } from "./Chat";
import { createSession } from "./chat/session";
import { completeMobileOAuth } from "./auth/mobileOAuth";
import { MemorySheet } from "./MemorySheet";
import {
  request,
  storage,
  restoreSession,
  setExpiryHandler,
  User,
  Memory,
  Conversation,
  Model,
  Plan,
} from "./api";
import {
  useAppTheme,
  useThemedStyles,
  type Palette,
  AppearanceProvider,
} from "./theme";
import {
  Body,
  Heading,
  Label,
  Orb,
  Tap,
  Icon,
  Empty,
  useSharedStyles,
  IconName,
} from "./components";

WebBrowser.maybeCompleteAuthSession();
type Tab = "home" | "library" | "chat" | "account";
const defaultModel: Model = {
  id: "gemini-2.5-flash",
  name: "Gemini 2.5 Flash",
  provider: "google",
};
const emptyChat = createSession;
const SheetSearchInput =
  Platform.OS === "web" ? NativeTextInput : BottomSheetTextInput;
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppearanceProvider>
          <KeyboardProvider>
            <AppContent />
          </KeyboardProvider>
        </AppearanceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
function AppContent() {
  const { theme, isDark } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const [fonts, fontError] = useFonts({
    Manrope_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
  });
  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {!fonts && !fontError ? (
        <View style={styles.splash}>
          <Orb />
          <Body>Making a little room for your ideas…</Body>
        </View>
      ) : (
        <MobileApp />
      )}
    </PaperProvider>
  );
}
function MobileApp() {
  const { colors: c } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const s = useSharedStyles();

  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [snack, setSnack] = useState("");
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: Tab = ["home", "library", "chat", "account"].includes(
    params.tab || "",
  )
    ? (params.tab as Tab)
    : "chat";
  const setTab = useCallback(
    (next: Tab) => router.navigate({ pathname: "/", params: { tab: next } }),
    [router],
  );
  const [memories, setMemories] = useState<Memory[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [models, setModels] = useState<Model[]>([defaultModel]);
  const [model, setModel] = useState(defaultModel);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<ChatSession>(emptyChat());
  const [chatBusy, setChatBusy] = useState(false);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const [memoryEditing, setMemoryEditing] = useState(false);
  const [chooser, setChooser] = useState<
    "models" | "attach" | "history" | null
  >(null);
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const sheet = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const points = useMemo(() => ["78%"], []);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const queuedRefresh = useRef(false);
  const accountEpoch = useRef(0);
  const notify = useCallback((msg: string) => setSnack(msg), []);
  const logout = useCallback(async () => {
    accountEpoch.current++;
    await storage.set(null);
    setUser(null);
    setMemories([]);
    setConversations([]);
    setPlan(null);
    setSession(emptyChat());
    setChatBusy(false);
    queuedRefresh.current = false;
    setTab("home");
    setChooser(null);
    setMemoryVisible(false);
  }, [setTab]);
  const refresh = useCallback(async () => {
    if (inFlight.current) {
      queuedRefresh.current = true;
      return;
    }
    inFlight.current = true;
    setRefreshing(true);
    try {
      do {
        queuedRefresh.current = false;
        const epoch = accountEpoch.current;
        const results = await Promise.allSettled([
          request<{ content: Memory[] }>("/content"),
          request<Conversation[]>("/conversations"),
          request<Plan>("/plan"),
          request<{ models: Model[] }>("/models"),
        ]);
        if (!mounted.current || epoch !== accountEpoch.current) continue;
        if (results[0].status === "fulfilled")
          setMemories(
            [...results[0].value.content].sort(
              (a, b) =>
                new Date(b.timestamp || 0).getTime() -
                new Date(a.timestamp || 0).getTime(),
            ),
          );
        if (results[1].status === "fulfilled")
          setConversations(results[1].value);
        if (results[2].status === "fulfilled") setPlan(results[2].value);
        if (results[3].status === "fulfilled" && results[3].value.models.length)
          setModels(results[3].value.models);
        const failures = results
          .slice(0, 3)
          .filter((r) => r.status === "rejected");
        setError(
          failures.length
            ? "Some of your workspace could not load. Pull down to try again."
            : "",
        );
      } while (queuedRefresh.current && mounted.current);
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  const onSession = useCallback(async (value: string) => {
    if (!value) throw new Error("The server did not return a session.");
    accountEpoch.current++;
    await storage.set(value);
    try {
      const me = await request<User>("/auth/me");
      setUser(me);
      setSessionError("");
      setReady(true);
      setLoading(true);
    } catch (e) {
      await storage.set(null);
      throw e;
    }
  }, []);
  const restore = useCallback(async () => {
    setSessionError("");
    setReady(false);
    try {
      const value = await restoreSession();
      if (value) setUser(await request<User>("/auth/me"));
    } catch (e) {
      setSessionError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    Promise.resolve().then(restore);
    setExpiryHandler(() => {
      logout();
      notify("Your session expired. Please sign in again.");
    });
    return () => {
      mounted.current = false;
    };
  }, [restore, logout, notify]);
  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);
  useEffect(() => {
    function handle(url: string) {
      completeMobileOAuth(url, onSession)
        .then((completed) => {
          if (completed)
            router.replace({ pathname: "/", params: { tab: "chat" } });
        })
        .catch((e: Error) => notify(e.message));
    }
    Linking.getInitialURL().then((url) => {
      if (url) handle(url);
    });
    const event = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => event.remove();
  }, [onSession, notify, router]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && user) refresh();
    });
    return () => sub.remove();
  }, [user, refresh]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (memoryVisible) {
        setMemoryVisible(false);
        return true;
      }
      if (chooser) {
        setChooser(null);
        return true;
      }
      if (tab !== "home") {
        setTab("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [tab, chooser, memoryVisible, setTab]);
  function openChooser(next: "models" | "attach" | "history") {
    setQuery("");
    setChooser(next);
  }
  function startChat(_prompt?: string, item?: Memory) {
    if (chatBusy) {
      setTab("chat");
      notify("Finish or stop the current answer first.");
      return;
    }
    setSession(createSession(item ? [item] : []));
    setTab("chat");
  }
  function openConversation(id: string) {
    if (chatBusy) {
      setTab("chat");
      notify("Finish or stop the current answer first.");
      return;
    }
    setSession((prev) => ({
      ...emptyChat(),
      id,
      historyRequest: (prev.historyRequest || 0) + 1,
      messages: [],
      attachments: [],
    }));
    setChooser(null);
    setTab("chat");
  }
  function openMemory(item: Memory) {
    setMemory(item);
    setMemoryEditing(false);
    setMemoryVisible(true);
  }
  function add() {
    setMemory(null);
    setMemoryEditing(true);
    setMemoryVisible(true);
  }
  async function removeConversation() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await request("/conversation/" + deleteId, "DELETE");
      if (session.id === deleteId) setSession(emptyChat());
      setConversations((prev) => prev.filter((conv) => conv._id !== deleteId));
      setDeleteId(null);
      notify("Conversation deleted.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }
  const backdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.25}
      />
    ),
    [],
  );
  if (!ready)
    return (
      <View style={styles.splash}>
        <Orb />
        <ActivityIndicator color={c.accent} />
        <Body>Finding your workspace…</Body>
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {!user ? (
        sessionError ? (
          <SafeAreaView style={styles.splash}>
            <Orb />
            <Heading style={{ fontSize: 25 }}>Let’s reconnect.</Heading>
            <Body style={{ textAlign: "center", paddingHorizontal: 30 }}>
              {sessionError}
            </Body>
            <Button onPress={restore}>Retry connection</Button>
            <Button
              onPress={async () => {
                await logout();
                setSessionError("");
              }}
            >
              Return to sign in
            </Button>
          </SafeAreaView>
        ) : (
          <Auth onSession={onSession} notify={notify} />
        )
      ) : (
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              width: "100%",
              maxWidth: 600,
              alignSelf: "center",
            }}
          >
            {tab === "home" && (
              <Workspace
                user={user}
                plan={plan}
                memories={memories}
                conversations={conversations}
                loading={loading}
                refreshing={refreshing}
                error={error}
                refresh={refresh}
                add={add}
                openMemory={openMemory}
                startChat={startChat}
                openConversation={openConversation}
                library={() => setTab("library")}
                account={() => setTab("account")}
              />
            )}
            {tab === "library" && (
              <Library
                memories={memories}
                loading={loading}
                refreshing={refreshing}
                error={error}
                refresh={refresh}
                openMemory={openMemory}
                add={add}
              />
            )}
            <View
              style={{
                flex: tab === "chat" ? 1 : 0,
                display: tab === "chat" ? "flex" : "none",
              }}
            >
              <ChatScreen
                onBusy={setChatBusy}
                session={session}
                setSession={setSession}
                model={model}
                onModels={() => openChooser("models")}
                onAttachments={() => openChooser("attach")}
                onHistory={() => openChooser("history")}
                onNew={() => setSession(emptyChat())}
                notify={notify}
                onComplete={(credits) => {
                  setPlan((prev) => (prev ? { ...prev, credits } : prev));
                  refresh();
                }}
                onUpgrade={() => setTab("account")}
              />
            </View>
            {tab === "account" && (
              <Account
                user={user}
                plan={plan}
                refresh={refresh}
                logout={logout}
                notify={notify}
              />
            )}
          </View>
          <Navigation tab={tab} select={setTab} />
        </SafeAreaView>
      )}
      {!!user && (
        <>
          {memoryVisible && (
            <MemorySheet
              item={memory}
              visible={memoryVisible}
              editing={memoryEditing}
              onClose={() => setMemoryVisible(false)}
              onSaved={refresh}
              onChat={(item) => startChat(undefined, item)}
              notify={notify}
            />
          )}
          {!!chooser && (
            <BottomSheet
              ref={sheet}
              index={0}
              snapPoints={points}
              enableDynamicSizing={false}
              enablePanDownToClose
              topInset={insets.top}
              keyboardBehavior="interactive"
              keyboardBlurBehavior="restore"
              enableBlurKeyboardOnGesture
              android_keyboardInputMode="adjustResize"
              onClose={() => setChooser(null)}
              backdropComponent={backdrop}
              backgroundStyle={{ backgroundColor: c.bg, borderRadius: 30 }}
              handleIndicatorStyle={{ backgroundColor: c.line, width: 34 }}
            >
              <BottomSheetScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  padding: 24,
                  gap: 14,
                  paddingBottom: 48,
                }}
              >
                <View style={s.between}>
                  <Label>
                    {chooser === "models"
                      ? "AI MODELS"
                      : chooser === "attach"
                        ? "SAVED MEMORIES"
                        : "CHAT HISTORY"}
                  </Label>
                  <Tap label="Close sheet" onPress={() => setChooser(null)}>
                    <Icon name="x" />
                  </Tap>
                </View>
                <Heading style={{ fontSize: 28 }}>
                  {chooser === "models"
                    ? "Choose a model"
                    : chooser === "attach"
                      ? "Add context"
                      : "Conversations"}
                </Heading>
                {chooser === "models" ? (
                  models.map((item) => (
                    <Tap
                      key={item.id}
                      label={`Select ${item.name}`}
                      onPress={() => {
                        setModel(item);
                        setChooser(null);
                      }}
                    >
                      <View
                        style={[
                          s.card,
                          s.row,
                          model.id === item.id && {
                            borderColor: c.accent,
                            backgroundColor: c.accentSoft,
                          },
                        ]}
                      >
                        <Icon name="cpu" color={c.accent} />
                        <View style={{ flex: 1 }}>
                          <Body
                            style={{
                              color: c.ink,
                              fontFamily: "DMSans_500Medium",
                            }}
                          >
                            {item.name.replace(/ \(.*\)/, "")}
                          </Body>
                          <Body style={{ fontSize: 12 }}>
                            {item.description || item.provider}
                          </Body>
                        </View>
                        {model.id === item.id && (
                          <Icon name="check" color={c.accent} />
                        )}
                      </View>
                    </Tap>
                  ))
                ) : (
                  <>
                    <SheetSearchInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder={
                        chooser === "attach"
                          ? "Search saved memories"
                          : "Search conversations"
                      }
                      accessibilityLabel={
                        chooser === "attach"
                          ? "Search saved memories"
                          : "Search conversations"
                      }
                      placeholderTextColor={c.muted}
                      style={{
                        backgroundColor: c.subtle,
                        color: c.ink,
                        fontSize: 16,
                        padding: 16,
                        borderRadius: 16,
                        minHeight: 52,
                      }}
                    />
                    {chooser === "attach" ? (
                      <>
                        <Body style={{ fontSize: 12 }}>
                          Select memories to focus your next answer.{" "}
                          {session.attachments.length} selected.
                        </Body>
                        {memories
                          .filter((item) =>
                            `${item.title} ${item.type}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .map((item) => {
                            const selected = session.attachments.some(
                              (m) => m._id === item._id,
                            );
                            return (
                              <Tap
                                key={item._id}
                                label={`${selected ? "Detach" : "Attach"} ${item.title}`}
                                onPress={() =>
                                  setSession((prev) => ({
                                    ...prev,
                                    attachments: selected
                                      ? prev.attachments.filter(
                                          (m) => m._id !== item._id,
                                        )
                                      : [...prev.attachments, item],
                                  }))
                                }
                              >
                                <View
                                  style={[
                                    s.card,
                                    s.row,
                                    selected && {
                                      borderColor: c.accent,
                                      backgroundColor: c.accentSoft,
                                    },
                                  ]}
                                >
                                  <Icon
                                    name={
                                      item.type === "document"
                                        ? "file-text"
                                        : "bookmark"
                                    }
                                    color={c.accent}
                                  />
                                  <Body
                                    lines={1}
                                    style={{ flex: 1, color: c.ink }}
                                  >
                                    {item.title || "Untitled memory"}
                                  </Body>
                                  <Icon
                                    name={selected ? "check-circle" : "circle"}
                                    size={18}
                                    color={c.accent}
                                  />
                                </View>
                              </Tap>
                            );
                          })}
                        {!memories.length && (
                          <Empty
                            title="Your context starts here."
                            detail="Save a memory to attach it to your next question."
                            action={
                              <Button
                                onPress={() => {
                                  setChooser(null);
                                  add();
                                }}
                              >
                                Save a memory
                              </Button>
                            }
                          />
                        )}
                        <Button
                          mode="contained"
                          onPress={() => {
                            if (session.attachments.length && tab !== "chat")
                              setTab("chat");
                            setChooser(null);
                          }}
                        >
                          Done · {session.attachments.length} selected
                        </Button>
                      </>
                    ) : (
                      <>
                        {conversations
                          .filter((item) =>
                            item.title
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .map((item) => (
                            <View key={item._id} style={[s.card, s.row]}>
                              <Tap
                                label={`Open ${item.title}`}
                                onPress={() => openConversation(item._id)}
                                style={{ flex: 1 }}
                              >
                                <View style={s.row}>
                                  <Icon
                                    name="message-circle"
                                    color={c.accent}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Body lines={2} style={{ color: c.ink }}>
                                      {item.title}
                                    </Body>
                                    <Body style={{ fontSize: 12 }}>
                                      {new Date(
                                        item.lastMessageAt,
                                      ).toLocaleDateString()}
                                    </Body>
                                  </View>
                                </View>
                              </Tap>
                              <Tap
                                label={`Delete ${item.title}`}
                                onPress={() => setDeleteId(item._id)}
                              >
                                <View style={{ padding: 8 }}>
                                  <Icon
                                    name="trash-2"
                                    size={17}
                                    color={c.muted}
                                  />
                                </View>
                              </Tap>
                            </View>
                          ))}
                        {!conversations.length && (
                          <Empty
                            icon="message-circle"
                            title="Room for a new thought."
                            detail="Start a conversation and it will be here when you return."
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </BottomSheetScrollView>
            </BottomSheet>
          )}
        </>
      )}
      <Portal>
        <Dialog
          visible={!!deleteId}
          onDismiss={() => !deleting && setDeleteId(null)}
        >
          <Dialog.Title>Delete this conversation?</Dialog.Title>
          <Dialog.Content>
            <Body>
              This permanently removes its messages from your workspace.
            </Body>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setDeleteId(null)}>
              Keep it
            </Button>
            <Button
              loading={deleting}
              disabled={deleting}
              textColor={c.danger}
              onPress={removeConversation}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack("")}
        duration={4500}
        style={{ marginBottom: user ? 90 : 20, backgroundColor: c.accent }}
        action={{ label: "Dismiss", onPress: () => setSnack("") }}
      >
        {snack}
      </Snackbar>
    </View>
  );
}
function Navigation({ tab, select }: { tab: Tab; select: (tab: Tab) => void }) {
  const { colors: c } = useAppTheme();
  const styles = useThemedStyles(makeStyles);

  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const tabs: { id: Tab; icon: IconName; label: string }[] = [
    { id: "home", icon: "grid", label: "Home" },
    { id: "library", icon: "layers", label: "Library" },
    { id: "chat", icon: "message-circle", label: "Chat" },
    { id: "account", icon: "user", label: "Account" },
  ];
  if (keyboardVisible) return null;
  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {tabs.map((item) => (
        <Tap
          key={item.id}
          label={item.label}
          onPress={() => select(item.id)}
          style={{ flex: 1 }}
        >
          <View style={{ alignItems: "center", gap: 5 }}>
            <View
              style={[
                styles.navIcon,
                tab === item.id && { backgroundColor: c.accentSoft },
              ]}
            >
              <Icon
                name={item.icon}
                size={20}
                color={tab === item.id ? c.accent : c.muted}
              />
            </View>
            <Text
              style={{
                fontFamily:
                  tab === item.id ? "DMSans_500Medium" : "DMSans_400Regular",
                fontSize: 12,
                color: tab === item.id ? c.accent : c.muted,
              }}
            >
              {item.label}
            </Text>
          </View>
        </Tap>
      ))}
    </View>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    splash: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    },
    nav: {
      flexDirection: "row",
      paddingTop: 8,
      backgroundColor: c.paper,
      borderTopWidth: 1,
      borderColor: c.line,
      paddingHorizontal: 14,
    },
    navIcon: {
      width: 52,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
    },
  });
