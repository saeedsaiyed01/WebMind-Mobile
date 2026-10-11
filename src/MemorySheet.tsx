import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Linking,
  Platform,
  Share,
  TextInput as NativeTextInput,
} from "react-native";
import { Button, Chip, HelperText } from "react-native-paper";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Memory, request } from "./api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Heading, Label, Icon, Tap, useSharedStyles } from "./components";
import { useAppTheme, useThemedStyles, type Palette } from "./theme";

const SheetInput =
  Platform.OS === "web" ? NativeTextInput : BottomSheetTextInput;

export function MemorySheet({
  item,
  editing,
  onClose,
  onSaved,
  onChat,
  notify,
}: {
  item: Memory | null;
  visible: boolean;
  editing: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onChat: (item: Memory) => void;
  notify: (msg: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const s = useSharedStyles();
  const input = useThemedStyles(makeInput);

  const sheet = useRef<BottomSheet>(null);
  const points = useMemo(() => ["88%"], []);
  const [edit, setEdit] = useState(editing);
  const [title, setTitle] = useState(item?.title || "");
  const [type, setType] = useState(item?.type || "note");
  const [value, setValue] = useState(
    item?.type === "tweet" ? item.originalLink || item.link : item?.link || "",
  );
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const backdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={busy ? "none" : "close"}
        opacity={0.25}
      />
    ),
    [busy],
  );
  async function pick() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      const picked = result.assets[0];
      if ((picked.size || 0) > 20 * 1024 * 1024) {
        setError("Choose a PDF smaller than 20 MB.");
        return;
      }
      setFile(picked);
      if (!title) setTitle(picked.name);
    }
  }
  async function save() {
    if (!title.trim()) {
      setError("Give this memory a title.");
      return;
    }
    if (type === "document" && !item && !file) {
      setError("Choose a PDF to upload.");
      return;
    }
    if (type !== "document" && !value.trim()) {
      setError(
        type === "note" ? "Write something to remember." : "Add a link.",
      );
      return;
    }
    if (
      ["website", "tweet"].includes(type) &&
      !/^https?:\/\//i.test(value.trim())
    ) {
      setError("Use a complete link starting with https://.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (item) {
        await request("/" + item._id, "PUT", {
          contentId: item._id,
          newTitle: title.trim(),
          ...(type === "note"
            ? { content: value }
            : type !== "document"
              ? { link: value }
              : {}),
        });
      } else if (file && type === "document") {
        const form = new FormData();
        form.append("title", title.trim());
        if (Platform.OS === "web" && file.file) form.append("file", file.file);
        else form.append("file", new File(file.uri), file.name);
        await request("/upload-document", "POST", form);
      } else {
        await request("/memory", "POST", {
          title: title.trim(),
          type,
          ...(type === "note" ? { content: value } : { url: value.trim() }),
        });
      }
      await onSaved();
      onClose();
      notify(item ? "Memory updated." : "A new idea, safely tucked away.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!item) return;
    setBusy(true);
    setError("");
    try {
      await request("/" + item._id, "DELETE", { contentId: item._id });
      await onSaved();
      onClose();
      notify("Memory deleted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openLink() {
    const url = item?.originalLink || item?.link || "";
    if (!/^https?:\/\//i.test(url)) {
      notify("This memory has no external link.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      notify("Unable to open this link.");
    }
  }
  return (
    <BottomSheet
      ref={sheet}
      index={0}
      snapPoints={points}
      enableDynamicSizing={false}
      enablePanDownToClose={!busy}
      onClose={onClose}
      backdropComponent={backdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      topInset={insets.top}
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: c.bg, borderRadius: 30 }}
      handleIndicatorStyle={{ backgroundColor: c.line, width: 34 }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: 60, gap: 18 }}
      >
        <View style={s.between}>
          <Label>
            {edit
              ? item
                ? "REFINE YOUR MEMORY"
                : "CAPTURE SOMETHING GOOD"
              : "FROM YOUR LIBRARY"}
          </Label>
          <Tap label="Close memory" onPress={() => !busy && onClose()}>
            <Icon name="x" />
          </Tap>
        </View>
        <Heading>
          {edit
            ? item
              ? "A little refinement."
              : "Keep the spark."
            : title || "Untitled memory"}
        </Heading>
        {edit ? (
          <>
            {!item && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  ["note", "Note"],
                  ["website", "Link"],
                  ["document", "PDF"],
                  ["tweet", "Tweet"],
                ].map(([id, name]) => (
                  <Chip
                    key={id}
                    selected={type === id}
                    onPress={() => {
                      setType(id);
                      setError("");
                    }}
                    style={{
                      backgroundColor: type === id ? c.accentSoft : c.paper,
                    }}
                  >
                    {name}
                  </Chip>
                ))}
              </View>
            )}
            <Label>TITLE</Label>
            <SheetInput
              accessibilityLabel="Memory title"
              placeholder="A name you’ll remember"
              placeholderTextColor={c.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              style={input}
              editable={!busy}
            />
            {type === "document" ? (
              item ? (
                <Body>
                  The original PDF stays attached. You can rename it here.
                </Body>
              ) : (
                <Tap label="Choose PDF" onPress={pick}>
                  <View
                    style={[
                      s.card,
                      {
                        borderStyle: "dashed",
                        alignItems: "center",
                        gap: 12,
                        paddingVertical: 30,
                      },
                    ]}
                  >
                    <Icon name="upload-cloud" size={32} color={c.accent} />
                    <Body style={{ color: c.ink }}>
                      {file?.name || "Choose a PDF"}
                    </Body>
                    <Label>UP TO 20 MB · SECURELY INDEXED</Label>
                  </View>
                </Tap>
              )
            ) : (
              <>
                <Label>
                  {type === "note" ? "YOUR THOUGHTS" : "SOURCE LINK"}
                </Label>
                <SheetInput
                  accessibilityLabel={
                    type === "note" ? "Memory text" : "Source link"
                  }
                  placeholder={
                    type === "note"
                      ? "Let your thoughts land here…"
                      : "https://"
                  }
                  placeholderTextColor={c.muted}
                  value={value}
                  onChangeText={setValue}
                  multiline={type === "note"}
                  autoCapitalize={type === "note" ? "sentences" : "none"}
                  keyboardType={type === "note" ? "default" : "url"}
                  style={[
                    input,
                    type === "note" && {
                      minHeight: 180,
                      textAlignVertical: "top",
                    },
                  ]}
                  editable={!busy}
                />
              </>
            )}
            <Body style={{ fontSize: 12 }}>
              WebMind connects this memory to future conversations, so your
              ideas can find each other.
            </Body>
            {!!error && <HelperText type="error">{error}</HelperText>}
            <Button
              mode="contained"
              loading={busy}
              disabled={busy}
              onPress={save}
              contentStyle={{ height: 52 }}
              style={{ borderRadius: 16 }}
            >
              {busy ? "Saving your memory…" : "Save memory"}
            </Button>
          </>
        ) : (
          <>
            <View style={s.row}>
              <Chip style={{ backgroundColor: c.accentSoft }}>
                {type === "document" ? "PDF document" : type}
              </Chip>
              <Body style={{ fontSize: 12 }}>
                {item?.timestamp
                  ? new Date(item.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </Body>
            </View>
            <View style={s.card}>
              <Body style={{ color: c.ink, lineHeight: 26 }}>
                {type === "document"
                  ? item?.extractedText ||
                    item?.fileMetadata?.originalName ||
                    "Open the original document below."
                  : item?.link}
              </Body>
            </View>
            <Button
              mode="contained"
              icon="creation"
              onPress={() => {
                if (item) {
                  onClose();
                  onChat(item);
                }
              }}
              contentStyle={{ height: 50 }}
              style={{ borderRadius: 16 }}
            >
              Explore with AI
            </Button>
            {type !== "note" && (
              <Button mode="outlined" icon="open-in-new" onPress={openLink}>
                Open original
              </Button>
            )}
            <View style={s.row}>
              <Button
                mode="text"
                icon="pencil-outline"
                onPress={() => setEdit(true)}
              >
                Edit memory
              </Button>
              <Button
                mode="text"
                icon="share-variant-outline"
                onPress={() => {
                  Share.share({
                    title,
                    message: `${title}\n\n${item?.originalLink || item?.link || ""}`,
                  }).catch(() => notify("Sharing is unavailable."));
                }}
              >
                Share
              </Button>
            </View>
            {deleting ? (
              <View style={[s.card, { gap: 10 }]}>
                <Body style={{ color: c.danger }}>
                  Delete this memory and its search index? This cannot be
                  undone.
                </Body>
                <View style={s.row}>
                  <Button
                    textColor={c.danger}
                    mode="outlined"
                    loading={busy}
                    disabled={busy}
                    onPress={remove}
                  >
                    Delete permanently
                  </Button>
                  <Button disabled={busy} onPress={() => setDeleting(false)}>
                    Keep it
                  </Button>
                </View>
              </View>
            ) : (
              <Button textColor={c.danger} onPress={() => setDeleting(true)}>
                Delete memory
              </Button>
            )}
            {!!error && <HelperText type="error">{error}</HelperText>}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
const makeInput = (c: Palette) => ({
  backgroundColor: c.paper,
  borderWidth: 1,
  borderColor: c.line,
  borderRadius: 16,
  padding: 16,
  fontSize: 15,
  fontFamily: "DMSans_400Regular",
  color: c.ink,
});
